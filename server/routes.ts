import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import bcrypt from "bcryptjs";
import { registerSchema, loginSchema, onboardingSchema, insertRuckSchema, updateProfileSchema, createCommunitySchema, createChallengeSchema, updateCommunitySchema, type User } from "@shared/schema";
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

  app.get("/api/user/communities-with-challenges", authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).authUser;
      const userComms = await storage.getUserCommunities(user.id);
      const now = new Date();
      const result = await Promise.all(userComms.map(async (comm) => {
        const allChallenges = await storage.getCommunityChall(comm.id);
        const activeChallenges = allChallenges.filter((c) => new Date(c.endDate) > now);
        const challengeIds = activeChallenges.map((c) => c.id);
        const joinedSet = await storage.getUserChallengeIds(user.id, challengeIds);
        return {
          id: comm.id,
          name: comm.name,
          banner: comm.banner,
          challenges: activeChallenges.map((c) => ({
            id: c.id,
            title: c.title,
            challengeType: c.challengeType,
            goalValue: c.goalValue,
            goalUnit: c.goalUnit,
            endDate: c.endDate,
            joined: joinedSet.has(c.id),
          })),
        };
      }));
      return res.json(result);
    } catch (error) {
      console.error("Get communities with challenges error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/challenges/:id", async (req: Request<{ id: string }>, res: Response) => {
    try {
      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      const community = await storage.getCommunity(challenge.communityId);
      const participantCount = await storage.getChallengeParticipantCount(challenge.id);
      const authHeader = req.headers.authorization;
      let isJoined = false;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const authToken = authHeader.slice(7);
        const authUser = await storage.getSessionUser(authToken);
        if (authUser) {
          const joinedSet = await storage.getUserChallengeIds(authUser.id, [challenge.id]);
          isJoined = joinedSet.has(challenge.id);
        }
      }
      return res.json({
        ...challenge,
        communityName: community?.name || 'Unknown',
        communityBanner: community?.banner || null,
        participantCount,
        isJoined,
      });
    } catch (error) {
      console.error("Get challenge detail error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/notifications", authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).authUser;
      const [notifs, unreadCount] = await Promise.all([
        storage.getNotifications(user.id),
        storage.getUnreadNotificationCount(user.id),
      ]);
      return res.json({ notifications: notifs, unreadCount });
    } catch (error) {
      console.error("Get notifications error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/notifications/read", authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).authUser;
      await storage.markNotificationsRead(user.id);
      return res.json({ message: "Notifications marked as read" });
    } catch (error) {
      console.error("Mark notifications read error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/notifications/unread-count", authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).authUser;
      const count = await storage.getUnreadNotificationCount(user.id);
      return res.json({ count });
    } catch (error) {
      console.error("Unread count error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/user/achievements", authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).authUser;
      const achievements = await storage.getUserAchievements(user.id);
      return res.json(achievements);
    } catch (error) {
      console.error("Get achievements error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/rucks/:id/share", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).authUser;
      const ruck = await storage.getRuck(req.params.id);
      if (!ruck) return res.status(404).json({ message: "Ruck not found" });
      if (ruck.userId !== user.id) return res.status(403).json({ message: "Not your ruck" });

      const { communityId, challengeId } = req.body;
      if (!communityId) return res.status(400).json({ message: "Community ID is required" });

      const userComms = await storage.getUserCommunities(user.id);
      if (!userComms.some((c) => c.id === communityId)) {
        return res.status(403).json({ message: "You must be a member of this community to share" });
      }

      const distMiles = ((ruck.distance || 0) / 100).toFixed(1);
      let content = `${user.name || user.username} completed a ${distMiles} mile ruck!`;
      if (challengeId) {
        const challenge = await storage.getChallenge(challengeId);
        if (!challenge || challenge.communityId !== communityId) {
          return res.status(400).json({ message: "Invalid challenge for this community" });
        }
        content = `${user.name || user.username} completed a ${distMiles} mile ruck for "${challenge.title}"!`;
      }

      await storage.shareRuckToCommunity(ruck.id, communityId, challengeId || null, user.id, content);
      return res.json({ success: true });
    } catch (error) {
      console.error("Share ruck error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/rucks/:id/like", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
    try {
      const user = (req as unknown as AuthenticatedRequest).authUser;
      const ruck = await storage.getRuck(req.params.id);
      if (!ruck) return res.status(404).json({ message: "Ruck not found" });
      const result = await storage.toggleRuckLike(req.params.id, user.id);
      if (result.liked) {
        storage.createNotification({
          userId: ruck.userId,
          type: 'like',
          referenceId: ruck.id,
          fromUserId: user.id,
          message: `${user.name || user.username} liked your ruck`,
        }).catch(() => {});
      }
      return res.json(result);
    } catch (error) {
      console.error("Toggle like error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/rucks/:id/comments", async (req: Request<{ id: string }>, res: Response) => {
    try {
      const ruck = await storage.getRuck(req.params.id);
      if (!ruck) return res.status(404).json({ message: "Ruck not found" });
      const comments = await storage.getRuckComments(req.params.id);
      return res.json(comments);
    } catch (error) {
      console.error("Get comments error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/rucks/:id/comments", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
    try {
      const user = (req as unknown as AuthenticatedRequest).authUser;
      const ruck = await storage.getRuck(req.params.id);
      if (!ruck) return res.status(404).json({ message: "Ruck not found" });
      const { content } = req.body;
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ message: "Comment content is required" });
      }
      if (content.length > 500) {
        return res.status(400).json({ message: "Comment must be under 500 characters" });
      }
      const comment = await storage.addRuckComment(req.params.id, user.id, content.trim());
      storage.createNotification({
        userId: ruck.userId,
        type: 'comment',
        referenceId: ruck.id,
        fromUserId: user.id,
        message: `${user.name || user.username} commented on your ruck`,
      }).catch(() => {});
      return res.status(201).json(comment);
    } catch (error) {
      console.error("Add comment error:", error);
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
      let feedRucks;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const authToken = authHeader.slice(7);
        const authUser = await storage.getSessionUser(authToken);
        if (authUser) {
          const friendIds = await storage.getFriendIds(authUser.id);
          if (friendIds.length > 0) {
            const friendFeed = await storage.getFriendsFeed(authUser.id, 50);
            if (friendFeed.length > 0) {
              feedRucks = friendFeed;
            }
          }
        }
      }
      if (!feedRucks) {
        feedRucks = await storage.getRecentRucks(50);
      }
      const ruckIds = feedRucks.map(r => r.id);
      const socialCounts = await storage.getRuckLikeAndCommentCounts(ruckIds);
      const enriched = feedRucks.map(r => {
        const counts = socialCounts.get(r.id) || { likeCount: 0, commentCount: 0 };
        return { ...r, likeCount: counts.likeCount, commentCount: counts.commentCount };
      });
      return res.json(enriched);
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

  app.get("/api/rucks/:id", async (req: Request<{ id: string }>, res: Response) => {
    try {
      let userId: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const authToken = authHeader.slice(7);
        const authUser = await storage.getSessionUser(authToken);
        if (authUser) userId = authUser.id;
      }
      const detail = await storage.getRuckDetail(req.params.id, userId);
      if (!detail) return res.status(404).json({ message: "Ruck not found" });
      return res.json(detail);
    } catch (error) {
      console.error("Get ruck detail error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/communities/:id/detail", async (req: Request<{ id: string }>, res: Response) => {
    try {
      let userId: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const authToken = authHeader.slice(7);
        const authUser = await storage.getSessionUser(authToken);
        if (authUser) userId = authUser.id;
      }
      const detail = await storage.getCommunityDetail(req.params.id, userId);
      if (!detail.community) {
        return res.status(404).json({ message: "Community not found" });
      }
      return res.json(detail);
    } catch (error) {
      console.error("Community detail error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/communities/:id", async (req: Request<{ id: string }>, res: Response) => {
    try {
      const community = await storage.getCommunity(req.params.id);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      let creatorName: string | null = null;
      if (community.createdBy) {
        const creator = await storage.getUser(community.createdBy);
        creatorName = creator?.name || creator?.username || null;
      }
      return res.json({ ...community, creatorName });
    } catch (error) {
      console.error("Get community error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/communities/:id", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
    try {
      const result = updateCommunitySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
      }

      const authUser = (req as unknown as AuthenticatedRequest).authUser;
      const community = await storage.getCommunity(req.params.id);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      if (community.createdBy !== authUser.id) {
        return res.status(403).json({ message: "Only the community creator can edit the community" });
      }

      if (result.data.name) {
        const nameCheck = moderateText(result.data.name);
        if (!nameCheck.ok) {
          return res.status(400).json({ message: nameCheck.message });
        }
      }
      if (result.data.description) {
        const descCheck = moderateText(result.data.description);
        if (!descCheck.ok) {
          return res.status(400).json({ message: descCheck.message });
        }
      }

      const updated = await storage.updateCommunity(req.params.id, result.data);
      return res.json(updated);
    } catch (error) {
      console.error("Update community error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/communities/:id/members", async (req: Request<{ id: string }>, res: Response) => {
    try {
      const members = await storage.getCommunityMembers(req.params.id);
      return res.json(members);
    } catch (error) {
      console.error("Get community members error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/communities/:id/members/:userId", authMiddleware, async (req: Request<{ id: string; userId: string }>, res: Response) => {
    try {
      const authUser = (req as unknown as AuthenticatedRequest).authUser;
      const community = await storage.getCommunity(req.params.id);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      if (community.createdBy !== authUser.id) {
        return res.status(403).json({ message: "Only the community creator can remove members" });
      }
      if (req.params.userId === authUser.id) {
        return res.status(400).json({ message: "Cannot remove yourself" });
      }
      await storage.kickMember(req.params.id, req.params.userId);
      return res.json({ message: "Member removed" });
    } catch (error) {
      console.error("Kick member error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/communities/:id/feed", async (req: Request<{ id: string }>, res: Response) => {
    try {
      const feed = await storage.getCommunityFeed(req.params.id);
      return res.json(feed);
    } catch (error) {
      console.error("Community feed error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/communities/:id/leaderboard", async (req: Request<{ id: string }>, res: Response) => {
    try {
      const leaderboard = await storage.getCommunityLeaderboard(req.params.id);
      return res.json(leaderboard);
    } catch (error) {
      console.error("Community leaderboard error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/communities/:id/challenges", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
    try {
      const result = createChallengeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
      }

      const authUser = (req as unknown as AuthenticatedRequest).authUser;
      const community = await storage.getCommunity(req.params.id);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      if (community.createdBy !== authUser.id) {
        return res.status(403).json({ message: "Only the community creator can create challenges" });
      }

      const titleCheck = moderateText(result.data.title);
      if (!titleCheck.ok) {
        return res.status(400).json({ message: titleCheck.message });
      }
      const descCheck = moderateText(result.data.description);
      if (!descCheck.ok) {
        return res.status(400).json({ message: descCheck.message });
      }

      const challenge = await storage.createChallengeWithAnnouncement({
        communityId: req.params.id,
        title: result.data.title,
        description: result.data.description,
        challengeType: result.data.challengeType,
        goalValue: result.data.goalValue,
        goalUnit: result.data.goalUnit,
        endDate: result.data.endDate,
        createdBy: authUser.id,
      });

      return res.status(201).json(challenge);
    } catch (error) {
      console.error("Create challenge error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/communities/:id/challenges", async (req: Request<{ id: string }>, res: Response) => {
    try {
      const challengeList = await storage.getCommunityChall(req.params.id);

      let userJoinedIds = new Set<string>();
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const authToken = authHeader.slice(7);
        const authUser = await storage.getSessionUser(authToken);
        if (authUser) {
          userJoinedIds = await storage.getUserChallengeIds(
            authUser.id,
            challengeList.map(ch => ch.id),
          );
        }
      }

      const enriched = await Promise.all(challengeList.map(async (ch) => {
        const participantCount = await storage.getChallengeParticipantCount(ch.id);
        return { ...ch, participantCount, isJoined: userJoinedIds.has(ch.id) };
      }));
      return res.json(enriched);
    } catch (error) {
      console.error("Get challenges error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/challenges/:id/join", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
    try {
      const authUser = (req as unknown as AuthenticatedRequest).authUser;
      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      const userComms = await storage.getUserCommunities(authUser.id);
      if (!userComms.some(c => c.id === challenge.communityId)) {
        return res.status(403).json({ message: "You must be a community member to join this challenge" });
      }
      await storage.joinChallenge(authUser.id, req.params.id);
      return res.json({ message: "Joined challenge" });
    } catch (error) {
      console.error("Join challenge error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/challenges/:id/leave", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
    try {
      const authUser = (req as unknown as AuthenticatedRequest).authUser;
      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      await storage.leaveChallenge(authUser.id, req.params.id);
      return res.json({ message: "Left challenge" });
    } catch (error) {
      console.error("Leave challenge error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/friends/request", authMiddleware, async (req: Request, res: Response) => {
    try {
      const authUser = (req as AuthenticatedRequest).authUser;
      const { addresseeId } = req.body;
      if (!addresseeId || typeof addresseeId !== 'string') {
        return res.status(400).json({ message: "addresseeId is required" });
      }
      if (addresseeId === authUser.id) {
        return res.status(400).json({ message: "Cannot send friend request to yourself" });
      }
      const addressee = await storage.getUser(addresseeId);
      if (!addressee) {
        return res.status(404).json({ message: "User not found" });
      }
      const friendship = await storage.sendFriendRequest(authUser.id, addresseeId);
      storage.createNotification({
        userId: addresseeId,
        type: 'friend_request',
        referenceId: friendship.id,
        fromUserId: authUser.id,
        message: `${authUser.name || authUser.username} sent you a friend request`,
      }).catch(() => {});
      return res.status(201).json(friendship);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      if (message === 'Already friends' || message === 'Friend request already pending') {
        return res.status(409).json({ message });
      }
      console.error("Friend request error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/friends/:id/accept", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
    try {
      const authUser = (req as unknown as AuthenticatedRequest).authUser;
      const friendship = await storage.acceptFriendRequest(req.params.id, authUser.id);
      storage.createNotification({
        userId: friendship.requesterId,
        type: 'friend_accepted',
        referenceId: friendship.id,
        fromUserId: authUser.id,
        message: `${authUser.name || authUser.username} accepted your friend request`,
      }).catch(() => {});
      return res.json(friendship);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      if (message === 'Not authorized' || message === 'Request is not pending') {
        return res.status(400).json({ message });
      }
      if (message === 'Friend request not found') {
        return res.status(404).json({ message });
      }
      console.error("Accept friend error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/friends/:id/decline", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
    try {
      const authUser = (req as unknown as AuthenticatedRequest).authUser;
      await storage.declineFriendRequest(req.params.id, authUser.id);
      return res.json({ message: "Friend request declined" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      if (message === 'Not authorized') {
        return res.status(400).json({ message });
      }
      if (message === 'Friend request not found') {
        return res.status(404).json({ message });
      }
      console.error("Decline friend error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/friends/:userId", authMiddleware, async (req: Request<{ userId: string }>, res: Response) => {
    try {
      const authUser = (req as unknown as AuthenticatedRequest).authUser;
      await storage.unfriend(authUser.id, req.params.userId);
      return res.json({ message: "Unfriended" });
    } catch (error) {
      console.error("Unfriend error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/friends", authMiddleware, async (req: Request, res: Response) => {
    try {
      const authUser = (req as AuthenticatedRequest).authUser;
      const friends = await storage.getFriends(authUser.id);
      return res.json(friends);
    } catch (error) {
      console.error("Get friends error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/friends/pending", authMiddleware, async (req: Request, res: Response) => {
    try {
      const authUser = (req as AuthenticatedRequest).authUser;
      const pending = await storage.getPendingFriendRequests(authUser.id);
      return res.json(pending);
    } catch (error) {
      console.error("Get pending friends error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/friends/status/:userId", authMiddleware, async (req: Request<{ userId: string }>, res: Response) => {
    try {
      const authUser = (req as unknown as AuthenticatedRequest).authUser;
      const status = await storage.getFriendshipStatus(authUser.id, req.params.userId);
      return res.json(status || { status: 'none' });
    } catch (error) {
      console.error("Friendship status error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id/profile", async (req: Request<{ id: string }>, res: Response) => {
    try {
      const userProfile = await storage.getUser(req.params.id);
      if (!userProfile) {
        return res.status(404).json({ message: "User not found" });
      }
      const friendCount = await storage.getFriendCount(req.params.id);
      const ruckStats = await storage.getUserRuckStats(req.params.id);
      return res.json({
        id: userProfile.id,
        username: userProfile.username,
        name: userProfile.name,
        avatar: userProfile.avatar,
        bio: userProfile.bio,
        location: userProfile.location,
        createdAt: userProfile.createdAt,
        friendCount,
        ruckStats,
      });
    } catch (error) {
      console.error("Get user profile error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
