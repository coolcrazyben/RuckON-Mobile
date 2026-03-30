import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import bcrypt from "bcryptjs";
import { registerSchema, loginSchema, onboardingSchema, type User } from "@shared/schema";
import { storage } from "./storage";
import { verifyGoogleIdToken, verifyAppleIdentityToken } from "./oauth";

interface AuthenticatedRequest extends Request {
  authUser: User;
  authToken: string;
}

function sanitizeUser(user: User) {
  const { password, ...rest } = user;
  return rest;
}

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const token = authHeader.slice(7);
  const user = await storage.getSessionUser(token);
  if (!user) {
    return res.status(401).json({ message: "Invalid session" });
  }
  (req as AuthenticatedRequest).authUser = user;
  (req as AuthenticatedRequest).authToken = token;
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
      }

      const { email, password, name } = result.data;

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const username = email.split("@")[0] + "_" + Math.random().toString(36).slice(2, 6);

      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        username,
      });

      const token = await storage.createSession(user.id);

      return res.status(201).json({
        user: sanitizeUser(user),
        token,
      });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
      }

      const { email, password } = result.data;

      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = await storage.createSession(user.id);

      return res.json({
        user: sanitizeUser(user),
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ message: "Missing Google ID token" });
      }

      const googlePayload = await verifyGoogleIdToken(idToken);
      if (!googlePayload.email_verified) {
        return res.status(400).json({ message: "Google email not verified" });
      }

      const googleId = googlePayload.sub;
      let user: User | undefined = await storage.getUserByGoogleId(googleId);

      if (!user) {
        user = await storage.getUserByEmail(googlePayload.email);
        if (user) {
          if (user.googleId && user.googleId !== googleId) {
            return res.status(409).json({ message: "Account already linked to a different Google account" });
          }
          user = await storage.updateUser(user.id, { googleId });
        } else {
          const username = googlePayload.email.split("@")[0] + "_" + Math.random().toString(36).slice(2, 6);
          user = await storage.createUser({
            email: googlePayload.email,
            name: googlePayload.name || googlePayload.email.split("@")[0],
            username,
            googleId,
            avatar: googlePayload.picture,
          });
        }
      }

      if (!user) {
        return res.status(500).json({ message: "Failed to create user" });
      }

      const token = await storage.createSession(user.id);
      return res.json({ user: sanitizeUser(user), token });
    } catch (error) {
      console.error("Google auth error:", error);
      const message = error instanceof Error ? error.message : "Internal server error";
      return res.status(401).json({ message });
    }
  });

  app.post("/api/auth/apple", async (req: Request, res: Response) => {
    try {
      const { identityToken, fullName } = req.body;
      if (!identityToken) {
        return res.status(400).json({ message: "Missing Apple identity token" });
      }

      const applePayload = await verifyAppleIdentityToken(identityToken);
      const appleId = applePayload.sub;

      let user: User | undefined = await storage.getUserByAppleId(appleId);

      if (!user) {
        if (applePayload.email) {
          user = await storage.getUserByEmail(applePayload.email);
          if (user) {
            if (user.appleId && user.appleId !== appleId) {
              return res.status(409).json({ message: "Account already linked to a different Apple account" });
            }
            user = await storage.updateUser(user.id, { appleId });
          }
        }
        if (!user) {
          const emailPrefix = applePayload.email?.split("@")[0] || "user";
          const username = emailPrefix + "_" + Math.random().toString(36).slice(2, 6);
          user = await storage.createUser({
            email: applePayload.email || undefined,
            name: fullName || "Apple User",
            username,
            appleId,
          });
        }
      }

      if (!user) {
        return res.status(500).json({ message: "Failed to create user" });
      }

      const token = await storage.createSession(user.id);
      return res.json({ user: sanitizeUser(user), token });
    } catch (error) {
      console.error("Apple auth error:", error);
      const message = error instanceof Error ? error.message : "Internal server error";
      return res.status(401).json({ message });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: Request, res: Response) => {
    return res.json(sanitizeUser((req as AuthenticatedRequest).authUser));
  });

  app.post("/api/auth/logout", authMiddleware, async (req: Request, res: Response) => {
    await storage.deleteSession((req as AuthenticatedRequest).authToken);
    return res.json({ message: "Logged out" });
  });

  app.patch("/api/user/onboarding", authMiddleware, async (req: Request, res: Response) => {
    try {
      const result = onboardingSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
      }

      const user = (req as AuthenticatedRequest).authUser;
      const updated = await storage.updateUser(user.id, {
        gender: result.data.gender,
        weight: result.data.weight,
        location: result.data.location,
        onboardingComplete: true,
      });

      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json(sanitizeUser(updated));
    } catch (error) {
      console.error("Onboarding error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/communities", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string | undefined;
      const userLocation = req.query.location as string | undefined;
      let communities;
      if (query) {
        communities = await storage.searchCommunities(query);
      } else if (userLocation) {
        communities = await storage.getCommunitiesByLocation(userLocation);
      } else {
        communities = await storage.getCommunities();
      }
      return res.json(communities);
    } catch (error) {
      console.error("Communities error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/communities/nearby", authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).authUser;
      const userLocation = user.location || "";
      const communities = await storage.getCommunitiesByLocation(userLocation);
      return res.json(communities);
    } catch (error) {
      console.error("Nearby communities error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/user/communities", authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).authUser;
      const communities = await storage.getUserCommunities(user.id);
      return res.json(communities);
    } catch (error) {
      console.error("User communities error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/communities/:id/join", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
    try {
      const user = (req as unknown as AuthenticatedRequest).authUser;
      const communityId = req.params.id;
      await storage.joinCommunity(user.id, communityId);
      return res.json({ message: "Joined community" });
    } catch (error) {
      console.error("Join community error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/communities/:id/leave", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
    try {
      const user = (req as unknown as AuthenticatedRequest).authUser;
      const communityId = req.params.id;
      await storage.leaveCommunity(user.id, communityId);
      return res.json({ message: "Left community" });
    } catch (error) {
      console.error("Leave community error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
