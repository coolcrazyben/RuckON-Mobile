import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import bcrypt from "bcryptjs";
import { registerSchema, loginSchema, onboardingSchema, insertRuckSchema, updateProfileSchema, createCommunitySchema, type User } from "@shared/schema";
import { storage } from "./storage";
import { verifyGoogleIdToken, verifyAppleIdentityToken } from "./oauth";
import { moderateText } from "./moderation";

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

  app.post("/api/communities", authMiddleware, async (req: Request, res: Response) => {
    try {
      const result = createCommunitySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
      }

      const nameCheck = moderateText(result.data.name);
      if (!nameCheck.ok) {
        return res.status(400).json({ message: nameCheck.message });
      }
      const descCheck = moderateText(result.data.description);
      if (!descCheck.ok) {
        return res.status(400).json({ message: descCheck.message });
      }

      const user = (req as AuthenticatedRequest).authUser;
      const community = await storage.createCommunity({
        name: result.data.name,
        description: result.data.description,
        category: result.data.category,
        location: result.data.location,
        createdBy: user.id,
      });

      return res.status(201).json(community);
    } catch (error) {
      console.error("Create community error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/communities", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string | undefined;
      const userLocation = req.query.location as string | undefined;
      const category = req.query.category as string | undefined;
      let results;
      if (query) {
        results = await storage.searchCommunities(query);
      } else if (userLocation) {
        results = await storage.getCommunitiesByLocation(userLocation);
      } else {
        results = await storage.getCommunities();
      }
      if (category) {
        results = results.filter(c => c.category?.toLowerCase() === category.toLowerCase());
      }
      return res.json(results);
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

  app.post("/api/rucks", authMiddleware, async (req: Request, res: Response) => {
    try {
      const result = insertRuckSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
      }
      const user = (req as AuthenticatedRequest).authUser;
      const ruck = await storage.createRuck(user.id, result.data);
      return res.status(201).json(ruck);
    } catch (error) {
      console.error("Create ruck error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/rucks", authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).authUser;
      const userRucks = await storage.getUserRucks(user.id);
      return res.json(userRucks);
    } catch (error) {
      console.error("Get rucks error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/user/profile", authMiddleware, async (req: Request, res: Response) => {
    try {
      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
      }

      const user = (req as AuthenticatedRequest).authUser;
      const updateData: Record<string, unknown> = {};

      if (result.data.username && result.data.username !== user.username) {
        const existing = await storage.getUserByUsername(result.data.username);
        if (existing && existing.id !== user.id) {
          return res.status(409).json({ message: "Username already taken" });
        }
        updateData.username = result.data.username;
      }
      if (result.data.name !== undefined) updateData.name = result.data.name;
      if (result.data.bio !== undefined) updateData.bio = result.data.bio;
      if (result.data.location !== undefined) updateData.location = result.data.location;
      if (result.data.weight !== undefined) updateData.weight = result.data.weight;
      if (result.data.gender !== undefined) updateData.gender = result.data.gender;

      const updated = await storage.updateUser(user.id, updateData);
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json(sanitizeUser(updated));
    } catch (error) {
      console.error("Update profile error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/avatar", authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).authUser;
      const { avatar } = req.body;
      if (!avatar || typeof avatar !== "string") {
        return res.status(400).json({ message: "Avatar data required" });
      }
      const updated = await storage.updateUser(user.id, { avatar });
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.json(sanitizeUser(updated));
    } catch (error) {
      console.error("Avatar upload error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/leaderboard", async (req: Request, res: Response) => {
    try {
      const period = (req.query.period as string) === 'monthly' ? 'monthly' : 'weekly';
      const metric = (req.query.metric as string) === 'weight' ? 'weight' : 'distance';
      const entries = await storage.getLeaderboard(period, metric);
      return res.json(entries);
    } catch (error) {
      console.error("Leaderboard error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/rucks/feed", async (req: Request, res: Response) => {
    try {
      const feedRucks = await storage.getRecentRucks(50);
      return res.json(feedRucks);
    } catch (error) {
      console.error("Get rucks feed error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/rucks/stats", authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).authUser;
      const stats = await storage.getUserRuckStats(user.id);
      return res.json(stats);
    } catch (error) {
      console.error("Get ruck stats error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
