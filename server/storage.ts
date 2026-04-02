import type { User, InsertUser, Community, UserCommunity, Ruck, Challenge, ChallengeParticipant, CommunityPost, Friendship, RuckLike, RuckComment, Notification } from "@shared/schema";
import { users, communities, userCommunities, rucks, challenges, challengeParticipants, communityPosts, friendships, ruckLikes, ruckComments, notifications, sessions } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, sql, desc, and, inArray, gt, lt } from "drizzle-orm";
import { randomUUID } from "crypto";

interface RuckFeedItem {
  type: 'ruck';
  id: string;
  userId: string;
  userName: string | null;
  userAvatar: string | null;
  createdAt: Date | null;
  distance: number | null;
  durationSeconds: number | null;
  weight: number | null;
  notes: string | null;
}

interface PostFeedItem {
  type: 'post';
  id: string;
  userId: string;
  userName: string | null;
  userAvatar: string | null;
  createdAt: Date | null;
  postType: string;
  content: string | null;
  referenceId: string | null;
}

export type FeedItem = RuckFeedItem | PostFeedItem;

export interface EnrichedChallenge extends Challenge {
  participantCount: number;
  isJoined: boolean;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByAppleId(appleId: string): Promise<User | undefined>;
  createUser(user: Partial<User> & { username: string }): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getSessionUser(token: string): Promise<User | undefined>;
  createSession(userId: string): Promise<string>;
  deleteSession(token: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;
  getCommunities(): Promise<Community[]>;
  searchCommunities(query: string): Promise<Community[]>;
  getCommunitiesByLocation(location: string): Promise<Community[]>;
  getUserCommunities(userId: string): Promise<Community[]>;
  joinCommunity(userId: string, communityId: string): Promise<void>;
  leaveCommunity(userId: string, communityId: string): Promise<void>;
  seedCommunities(): Promise<void>;
  createRuck(userId: string, data: { distance: number; durationSeconds?: number; weight?: number; notes?: string; routeCoordinates?: string; routeImageUrl?: string }): Promise<Ruck>;
  getUserRucks(userId: string): Promise<Ruck[]>;
  getUserRuckStats(userId: string): Promise<{ totalMiles: number; totalRucks: number; weightMoved: number }>;
  getRecentRucks(limit: number): Promise<Array<Ruck & { userName: string | null; userAvatar: string | null }>>;
  getLeaderboard(period: 'weekly' | 'monthly', metric: 'distance' | 'weight'): Promise<Array<{ userId: string; name: string | null; username: string; avatar: string | null; totalDistance: number; totalWeight: number }>>;
  createCommunity(data: { name: string; description: string; category: string; location: string; createdBy: string }): Promise<Community>;
  getCommunity(id: string): Promise<Community | undefined>;
  getRuckDetail(ruckId: string, requestingUserId?: string): Promise<{
    ruck: Ruck & { userName: string | null; userAvatar: string | null };
    likeCount: number;
    commentCount: number;
    liked: boolean;
  } | null>;
  toggleRuckLike(ruckId: string, userId: string): Promise<{ liked: boolean; likeCount: number }>;
  getRuckComments(ruckId: string): Promise<Array<{ id: string; userId: string; content: string; createdAt: Date | null; userName: string | null; userAvatar: string | null }>>;
  addRuckComment(ruckId: string, userId: string, content: string): Promise<{ id: string; userId: string; content: string; createdAt: Date | null; userName: string | null; userAvatar: string | null }>;
  getRuckLikeAndCommentCounts(ruckIds: string[]): Promise<Map<string, { likeCount: number; commentCount: number }>>;
  createNotification(data: { userId: string; type: string; referenceId?: string; fromUserId?: string; message: string }): Promise<void>;
  getNotifications(userId: string): Promise<Array<Notification & { fromUserName: string | null; fromUserAvatar: string | null }>>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationsRead(userId: string): Promise<void>;
  getUserAchievements(userId: string): Promise<Array<{ id: string; title: string; icon: string; earned: boolean; description: string }>>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async getUserByAppleId(appleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.appleId, appleId));
    return user;
  }

  async createUser(insertUser: Partial<User> & { username: string }): Promise<User> {
    const [user] = await db.insert(users).values({
      email: insertUser.email || null,
      username: insertUser.username,
      password: insertUser.password || null,
      name: insertUser.name || null,
      avatar: insertUser.avatar || null,
      gender: insertUser.gender || null,
      weight: insertUser.weight || null,
      location: insertUser.location || null,
      bio: insertUser.bio || null,
      googleId: insertUser.googleId || null,
      appleId: insertUser.appleId || null,
      onboardingComplete: false,
    }).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const updateData: Record<string, unknown> = {};
    if (data.username !== undefined) updateData.username = data.username;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.onboardingComplete !== undefined) updateData.onboardingComplete = data.onboardingComplete;
    if (data.googleId !== undefined) updateData.googleId = data.googleId;
    if (data.appleId !== undefined) updateData.appleId = data.appleId;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.bio !== undefined) updateData.bio = data.bio;

    if (Object.keys(updateData).length === 0) {
      return this.getUser(id);
    }
    const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return updated;
  }

  async getSessionUser(token: string): Promise<User | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));
    if (!session) return undefined;
    return this.getUser(session.userId);
  }

  async createSession(userId: string): Promise<string> {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days per D-10
    await db.insert(sessions).values({ token, userId, expiresAt });
    return token;
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  async deleteExpiredSessions(): Promise<void> {
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  }

  async getCommunities(): Promise<Community[]> {
    return db.select().from(communities);
  }

  async searchCommunities(query: string): Promise<Community[]> {
    const pattern = `%${query}%`;
    return db.select().from(communities).where(
      or(
        ilike(communities.name, pattern),
        ilike(communities.description, pattern),
        ilike(communities.category, pattern),
        ilike(communities.location, pattern),
      ),
    );
  }

  async getCommunitiesByLocation(location: string): Promise<Community[]> {
    if (!location) return this.getCommunities();
    const allCommunities = await this.getCommunities();
    const loc = location.toLowerCase();
    const locationParts = loc.split(",").map((p) => p.trim()).filter(Boolean);
    const nearby: Community[] = [];
    const nationwide: Community[] = [];
    const other: Community[] = [];

    for (const c of allCommunities) {
      const cLoc = (c.location || "").toLowerCase();
      if (cLoc === "nationwide") {
        nationwide.push(c);
      } else if (
        locationParts.some((part) => cLoc.includes(part)) ||
        cLoc.includes(loc)
      ) {
        nearby.push(c);
      } else {
        other.push(c);
      }
    }

    return [...nearby, ...nationwide, ...other];
  }

  async getUserCommunities(userId: string): Promise<Community[]> {
    const joined = await db.select().from(userCommunities).where(eq(userCommunities.userId, userId));
    if (joined.length === 0) return [];
    const communityIds = joined.map((uc) => uc.communityId);
    const result = await db.select().from(communities).where(
      or(...communityIds.map((id) => eq(communities.id, id))),
    );
    return result;
  }

  async joinCommunity(userId: string, communityId: string): Promise<void> {
    const existing = await db.select().from(userCommunities).where(
      sql`${userCommunities.userId} = ${userId} AND ${userCommunities.communityId} = ${communityId}`,
    );
    if (existing.length > 0) return;
    await db.insert(userCommunities).values({ userId, communityId });
    await db.update(communities)
      .set({ memberCount: sql`COALESCE(${communities.memberCount}, 0) + 1` })
      .where(eq(communities.id, communityId));
  }

  async leaveCommunity(userId: string, communityId: string): Promise<void> {
    const deleted = await db.delete(userCommunities).where(
      sql`${userCommunities.userId} = ${userId} AND ${userCommunities.communityId} = ${communityId}`,
    ).returning();
    if (deleted.length > 0) {
      await db.update(communities)
        .set({ memberCount: sql`GREATEST(COALESCE(${communities.memberCount}, 0) - 1, 0)` })
        .where(eq(communities.id, communityId));
    }
  }

  async seedCommunities(): Promise<void> {
    const existing = await db.select().from(communities);
    if (existing.length > 0) return;

    const seedData = [
      {
        id: "c1",
        name: "GORUCK Nation",
        description: "The premier community for GORUCK event participants and enthusiasts.",
        memberCount: 14280,
        banner: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600",
        category: "Events",
        location: "Nationwide",
      },
      {
        id: "c2",
        name: "Heavy Packers Club",
        description: "For those who ruck with 50lbs or more. We believe in carrying the load.",
        memberCount: 3840,
        banner: "https://images.unsplash.com/photo-1463044304029-b857fcddcaff?w=600",
        category: "Training",
        location: "Nationwide",
      },
      {
        id: "c3",
        name: "Trail Ruckers",
        description: "Off-road, backcountry, and trail rucking. Nature is the gym.",
        memberCount: 8650,
        banner: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600",
        category: "Outdoors",
        location: "Denver, CO",
      },
      {
        id: "c4",
        name: "Urban Rucking Co.",
        description: "City streets are our trails. Urban ruckers unite.",
        memberCount: 5120,
        banner: "https://images.unsplash.com/photo-1476900543704-4312b429f6ee?w=600",
        category: "Urban",
        location: "New York, NY",
      },
      {
        id: "c5",
        name: "Military Fitness",
        description: "Veterans, active duty, and military-style fitness enthusiasts.",
        memberCount: 21460,
        banner: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600",
        category: "Military",
        location: "Nationwide",
      },
      {
        id: "c6",
        name: "First Ruck Club",
        description: "New to rucking? This is your community. No judgment, just progress.",
        memberCount: 6730,
        banner: "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=600",
        category: "Beginner",
        location: "Nationwide",
      },
      {
        id: "c7",
        name: "Chicago Ruckers",
        description: "Chicago's local rucking crew. Lake shore, parks, and city streets.",
        memberCount: 1240,
        banner: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600",
        category: "Local",
        location: "Chicago, IL",
      },
      {
        id: "c8",
        name: "Austin Ruck Squad",
        description: "Keep Austin rucking. Hill country trails and urban routes.",
        memberCount: 890,
        banner: "https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=600",
        category: "Local",
        location: "Austin, TX",
      },
    ];

    await db.insert(communities).values(seedData);
  }

  async createRuck(userId: string, data: { distance: number; durationSeconds?: number; weight?: number; notes?: string; routeCoordinates?: string; routeImageUrl?: string }): Promise<Ruck> {
    const [ruck] = await db.insert(rucks).values({
      userId,
      distance: Math.round(data.distance * 100),
      durationSeconds: data.durationSeconds ?? null,
      weight: data.weight ?? null,
      notes: data.notes ?? null,
      routeCoordinates: data.routeCoordinates ?? null,
      routeImageUrl: data.routeImageUrl ?? null,
    }).returning();
    return ruck;
  }

  async getUserRucks(userId: string): Promise<Ruck[]> {
    return db.select().from(rucks).where(eq(rucks.userId, userId)).orderBy(desc(rucks.createdAt));
  }

  async getRuck(id: string): Promise<Ruck | undefined> {
    const [ruck] = await db.select().from(rucks).where(eq(rucks.id, id));
    return ruck;
  }

  async shareRuckToCommunity(ruckId: string, communityId: string, challengeId: string | null, userId: string, content: string): Promise<void> {
    await db.update(rucks).set({ communityId, challengeId }).where(eq(rucks.id, ruckId));
    await db.insert(communityPosts).values({
      communityId,
      postType: 'ruck_share',
      referenceId: ruckId,
      userId,
      content,
    });
  }

  async getRuckDetail(ruckId: string, requestingUserId?: string): Promise<{
    ruck: Ruck & { userName: string | null; userAvatar: string | null };
    likeCount: number;
    commentCount: number;
    liked: boolean;
  } | null> {
    const [result] = await db
      .select({
        id: rucks.id,
        userId: rucks.userId,
        distance: rucks.distance,
        durationSeconds: rucks.durationSeconds,
        weight: rucks.weight,
        notes: rucks.notes,
        routeCoordinates: rucks.routeCoordinates,
        routeImageUrl: rucks.routeImageUrl,
        communityId: rucks.communityId,
        challengeId: rucks.challengeId,
        createdAt: rucks.createdAt,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(rucks)
      .leftJoin(users, eq(rucks.userId, users.id))
      .where(eq(rucks.id, ruckId));

    if (!result) return null;

    const [likeRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(ruckLikes)
      .where(eq(ruckLikes.ruckId, ruckId));
    const likeCount = Number(likeRow?.count || 0);

    const [commentRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(ruckComments)
      .where(eq(ruckComments.ruckId, ruckId));
    const commentCount = Number(commentRow?.count || 0);

    let liked = false;
    if (requestingUserId) {
      const [existingLike] = await db.select().from(ruckLikes).where(
        and(eq(ruckLikes.ruckId, ruckId), eq(ruckLikes.userId, requestingUserId)),
      );
      liked = !!existingLike;
    }

    return { ruck: result as Ruck & { userName: string | null; userAvatar: string | null }, likeCount, commentCount, liked };
  }

  async toggleRuckLike(ruckId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const [existing] = await db.select().from(ruckLikes).where(
      and(eq(ruckLikes.ruckId, ruckId), eq(ruckLikes.userId, userId)),
    );

    if (existing) {
      await db.delete(ruckLikes).where(eq(ruckLikes.id, existing.id));
    } else {
      await db.insert(ruckLikes).values({ ruckId, userId });
    }

    const [countRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(ruckLikes)
      .where(eq(ruckLikes.ruckId, ruckId));

    return { liked: !existing, likeCount: Number(countRow?.count || 0) };
  }

  async getRuckComments(ruckId: string): Promise<Array<{
    id: string;
    userId: string;
    content: string;
    createdAt: Date | null;
    userName: string | null;
    userAvatar: string | null;
  }>> {
    return db
      .select({
        id: ruckComments.id,
        userId: ruckComments.userId,
        content: ruckComments.content,
        createdAt: ruckComments.createdAt,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(ruckComments)
      .leftJoin(users, eq(ruckComments.userId, users.id))
      .where(eq(ruckComments.ruckId, ruckId))
      .orderBy(desc(ruckComments.createdAt));
  }

  async addRuckComment(ruckId: string, userId: string, content: string): Promise<{
    id: string;
    userId: string;
    content: string;
    createdAt: Date | null;
    userName: string | null;
    userAvatar: string | null;
  }> {
    const [comment] = await db.insert(ruckComments).values({ ruckId, userId, content }).returning();
    const user = await this.getUser(userId);
    return {
      id: comment.id,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt,
      userName: user?.name || null,
      userAvatar: user?.avatar || null,
    };
  }

  async getRuckLikeAndCommentCounts(ruckIds: string[]): Promise<Map<string, { likeCount: number; commentCount: number }>> {
    const result = new Map<string, { likeCount: number; commentCount: number }>();
    if (ruckIds.length === 0) return result;

    const likeCounts = await db
      .select({
        ruckId: ruckLikes.ruckId,
        count: sql<number>`COUNT(*)`,
      })
      .from(ruckLikes)
      .where(inArray(ruckLikes.ruckId, ruckIds))
      .groupBy(ruckLikes.ruckId);

    const commentCounts = await db
      .select({
        ruckId: ruckComments.ruckId,
        count: sql<number>`COUNT(*)`,
      })
      .from(ruckComments)
      .where(inArray(ruckComments.ruckId, ruckIds))
      .groupBy(ruckComments.ruckId);

    for (const id of ruckIds) {
      result.set(id, { likeCount: 0, commentCount: 0 });
    }
    for (const lc of likeCounts) {
      const entry = result.get(lc.ruckId);
      if (entry) entry.likeCount = Number(lc.count);
    }
    for (const cc of commentCounts) {
      const entry = result.get(cc.ruckId);
      if (entry) entry.commentCount = Number(cc.count);
    }
    return result;
  }

  async getUserRuckStats(userId: string): Promise<{ totalMiles: number; totalRucks: number; weightMoved: number }> {
    const userRucks = await this.getUserRucks(userId);
    const totalRucks = userRucks.length;
    let totalDistanceCents = 0;
    let weightMoved = 0;
    for (const r of userRucks) {
      const dist = r.distance || 0;
      totalDistanceCents += dist;
      weightMoved += (dist / 100) * (r.weight || 0);
    }
    return {
      totalMiles: totalDistanceCents / 100,
      totalRucks,
      weightMoved: Math.round(weightMoved),
    };
  }

  async getRecentRucks(limit: number): Promise<Array<Ruck & { userName: string | null; userAvatar: string | null }>> {
    const results = await db
      .select({
        id: rucks.id,
        userId: rucks.userId,
        distance: rucks.distance,
        durationSeconds: rucks.durationSeconds,
        weight: rucks.weight,
        notes: rucks.notes,
        routeCoordinates: rucks.routeCoordinates,
        routeImageUrl: rucks.routeImageUrl,
        communityId: rucks.communityId,
        challengeId: rucks.challengeId,
        createdAt: rucks.createdAt,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(rucks)
      .leftJoin(users, eq(rucks.userId, users.id))
      .orderBy(desc(rucks.createdAt))
      .limit(limit);
    return results;
  }

  async getCommunity(id: string): Promise<Community | undefined> {
    const [community] = await db.select().from(communities).where(eq(communities.id, id));
    return community;
  }

  async createCommunity(data: { name: string; description: string; category: string; location: string; createdBy: string }): Promise<Community> {
    return await db.transaction(async (tx) => {
      const [community] = await tx.insert(communities).values({
        name: data.name,
        description: data.description,
        category: data.category,
        location: data.location,
        createdBy: data.createdBy,
        memberCount: 1,
      }).returning();
      await tx.insert(userCommunities).values({
        userId: data.createdBy,
        communityId: community.id,
      });
      return community;
    });
  }

  async getLeaderboard(period: 'weekly' | 'monthly', metric: 'distance' | 'weight'): Promise<Array<{ userId: string; name: string | null; username: string; avatar: string | null; totalDistance: number; totalWeight: number }>> {
    const now = new Date();
    const cutoff = new Date();
    if (period === 'weekly') {
      cutoff.setDate(now.getDate() - 7);
    } else {
      cutoff.setDate(now.getDate() - 30);
    }

    const orderCol = metric === 'distance'
      ? sql<number>`COALESCE(SUM(${rucks.distance}), 0)`
      : sql<number>`COALESCE(SUM(COALESCE(${rucks.weight}, 0) * COALESCE(${rucks.distance}, 0) / 100), 0)`;

    const results = await db
      .select({
        userId: users.id,
        name: users.name,
        username: users.username,
        avatar: users.avatar,
        totalDistance: sql<number>`COALESCE(SUM(${rucks.distance}), 0)`.as('total_distance'),
        totalWeight: sql<number>`COALESCE(SUM(COALESCE(${rucks.weight}, 0) * COALESCE(${rucks.distance}, 0) / 100), 0)`.as('total_weight'),
      })
      .from(users)
      .leftJoin(rucks, sql`${rucks.userId} = ${users.id} AND ${rucks.createdAt} >= ${cutoff}`)
      .groupBy(users.id, users.name, users.username, users.avatar)
      .orderBy(desc(orderCol))
      .limit(50);

    return results.map(r => ({
      ...r,
      totalDistance: Number(r.totalDistance),
      totalWeight: Number(r.totalWeight),
    }));
  }

  async getCommunityMembers(communityId: string): Promise<Array<{ id: string; name: string | null; username: string; avatar: string | null; location: string | null; joinedAt: Date | null; role: string }>> {
    const community = await this.getCommunity(communityId);
    if (!community) return [];

    const memberships = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        avatar: users.avatar,
        location: users.location,
        joinedAt: userCommunities.joinedAt,
      })
      .from(userCommunities)
      .innerJoin(users, eq(userCommunities.userId, users.id))
      .where(eq(userCommunities.communityId, communityId));

    return memberships.map(m => ({
      ...m,
      role: m.id === community.createdBy ? 'creator' : 'member',
    }));
  }

  async kickMember(communityId: string, userId: string): Promise<void> {
    const deleted = await db.delete(userCommunities).where(
      and(
        eq(userCommunities.userId, userId),
        eq(userCommunities.communityId, communityId),
      ),
    ).returning();
    if (deleted.length > 0) {
      await db.update(communities)
        .set({ memberCount: sql`GREATEST(COALESCE(${communities.memberCount}, 0) - 1, 0)` })
        .where(eq(communities.id, communityId));
    }
  }

  async getCommunityFeed(communityId: string): Promise<Array<Ruck & { userName: string | null; userAvatar: string | null }>> {
    const memberIds = await db
      .select({ userId: userCommunities.userId })
      .from(userCommunities)
      .where(eq(userCommunities.communityId, communityId));

    if (memberIds.length === 0) return [];

    const ids = memberIds.map(m => m.userId);
    return db
      .select({
        id: rucks.id,
        userId: rucks.userId,
        distance: rucks.distance,
        durationSeconds: rucks.durationSeconds,
        weight: rucks.weight,
        notes: rucks.notes,
        routeCoordinates: rucks.routeCoordinates,
        routeImageUrl: rucks.routeImageUrl,
        communityId: rucks.communityId,
        challengeId: rucks.challengeId,
        createdAt: rucks.createdAt,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(rucks)
      .leftJoin(users, eq(rucks.userId, users.id))
      .where(inArray(rucks.userId, ids))
      .orderBy(desc(rucks.createdAt))
      .limit(50);
  }

  async getCommunityLeaderboard(communityId: string): Promise<Array<{ userId: string; name: string | null; username: string; avatar: string | null; totalDistance: number; totalWeight: number }>> {
    const memberIds = await db
      .select({ userId: userCommunities.userId })
      .from(userCommunities)
      .where(eq(userCommunities.communityId, communityId));

    if (memberIds.length === 0) return [];

    const ids = memberIds.map(m => m.userId);
    const results = await db
      .select({
        userId: users.id,
        name: users.name,
        username: users.username,
        avatar: users.avatar,
        totalDistance: sql<number>`COALESCE(SUM(${rucks.distance}), 0)`.as('total_distance'),
        totalWeight: sql<number>`COALESCE(SUM(COALESCE(${rucks.weight}, 0) * COALESCE(${rucks.distance}, 0) / 100), 0)`.as('total_weight'),
      })
      .from(users)
      .leftJoin(rucks, eq(rucks.userId, users.id))
      .where(inArray(users.id, ids))
      .groupBy(users.id, users.name, users.username, users.avatar)
      .orderBy(desc(sql`COALESCE(SUM(${rucks.distance}), 0)`))
      .limit(50);

    return results.map(r => ({
      ...r,
      totalDistance: Number(r.totalDistance),
      totalWeight: Number(r.totalWeight),
    }));
  }

  async createChallenge(data: { communityId: string; title: string; description: string; challengeType: string; goalValue: number; goalUnit: string; endDate: string; createdBy: string }): Promise<Challenge> {
    const [challenge] = await db.insert(challenges).values({
      communityId: data.communityId,
      title: data.title,
      description: data.description,
      challengeType: data.challengeType,
      goalValue: data.goalValue,
      goalUnit: data.goalUnit,
      endDate: new Date(data.endDate),
      createdBy: data.createdBy,
    }).returning();
    return challenge;
  }

  async createChallengeWithAnnouncement(data: { communityId: string; title: string; description: string; challengeType: string; goalValue: number; goalUnit: string; endDate: string; createdBy: string }): Promise<Challenge> {
    return await db.transaction(async (tx) => {
      const [challenge] = await tx.insert(challenges).values({
        communityId: data.communityId,
        title: data.title,
        description: data.description,
        challengeType: data.challengeType,
        goalValue: data.goalValue,
        goalUnit: data.goalUnit,
        endDate: new Date(data.endDate),
        createdBy: data.createdBy,
      }).returning();

      await tx.insert(communityPosts).values({
        communityId: data.communityId,
        postType: 'challenge_announcement',
        referenceId: challenge.id,
        userId: data.createdBy,
        content: `New challenge: "${challenge.title}" — ${challenge.goalValue} ${challenge.goalUnit}. Join now!`,
      });

      return challenge;
    });
  }

  async getCommunityChall(communityId: string): Promise<Challenge[]> {
    return db.select().from(challenges)
      .where(eq(challenges.communityId, communityId))
      .orderBy(desc(challenges.createdAt));
  }

  async joinChallenge(userId: string, challengeId: string): Promise<void> {
    const existing = await db.select().from(challengeParticipants).where(
      and(
        eq(challengeParticipants.userId, userId),
        eq(challengeParticipants.challengeId, challengeId),
      ),
    );
    if (existing.length > 0) return;
    await db.insert(challengeParticipants).values({ userId, challengeId });
  }

  async leaveChallenge(userId: string, challengeId: string): Promise<void> {
    await db.delete(challengeParticipants).where(
      and(
        eq(challengeParticipants.userId, userId),
        eq(challengeParticipants.challengeId, challengeId),
      ),
    );
  }

  async getChallengeParticipantCount(challengeId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(challengeParticipants)
      .where(eq(challengeParticipants.challengeId, challengeId));
    return Number(result[0]?.count || 0);
  }

  async getUserChallengeIds(userId: string, challengeIds: string[]): Promise<Set<string>> {
    if (challengeIds.length === 0) return new Set();
    const joined = await db.select({ challengeId: challengeParticipants.challengeId })
      .from(challengeParticipants)
      .where(and(
        eq(challengeParticipants.userId, userId),
        inArray(challengeParticipants.challengeId, challengeIds),
      ));
    return new Set(joined.map(j => j.challengeId));
  }

  async getChallenge(id: string): Promise<Challenge | undefined> {
    const [challenge] = await db.select().from(challenges).where(eq(challenges.id, id));
    return challenge;
  }

  async updateCommunity(id: string, data: Partial<Community>): Promise<Community | undefined> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.banner !== undefined) updateData.banner = data.banner;
    if (Object.keys(updateData).length === 0) return this.getCommunity(id);
    const [updated] = await db.update(communities).set(updateData).where(eq(communities.id, id)).returning();
    return updated;
  }

  async createCommunityPost(data: { communityId: string; postType: string; referenceId?: string; userId: string; content?: string }): Promise<CommunityPost> {
    const [post] = await db.insert(communityPosts).values({
      communityId: data.communityId,
      postType: data.postType,
      referenceId: data.referenceId || null,
      userId: data.userId,
      content: data.content || null,
    }).returning();
    return post;
  }

  async getCommunityFeedWithPosts(communityId: string): Promise<FeedItem[]> {
    const memberIds = await db
      .select({ userId: userCommunities.userId })
      .from(userCommunities)
      .where(eq(userCommunities.communityId, communityId));

    const ids = memberIds.map(m => m.userId);

    const ruckResults = ids.length > 0
      ? await db
          .select({
            id: rucks.id,
            userId: rucks.userId,
            distance: rucks.distance,
            durationSeconds: rucks.durationSeconds,
            weight: rucks.weight,
            notes: rucks.notes,
            createdAt: rucks.createdAt,
            userName: users.name,
            userAvatar: users.avatar,
          })
          .from(rucks)
          .leftJoin(users, eq(rucks.userId, users.id))
          .where(inArray(rucks.userId, ids))
          .orderBy(desc(rucks.createdAt))
          .limit(50)
      : [];

    const postResults = await db
      .select({
        id: communityPosts.id,
        userId: communityPosts.userId,
        postType: communityPosts.postType,
        content: communityPosts.content,
        referenceId: communityPosts.referenceId,
        createdAt: communityPosts.createdAt,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(communityPosts)
      .leftJoin(users, eq(communityPosts.userId, users.id))
      .where(eq(communityPosts.communityId, communityId))
      .orderBy(desc(communityPosts.createdAt))
      .limit(50);

    const combined: FeedItem[] = [
      ...ruckResults.map(r => ({
        type: 'ruck' as const,
        id: r.id,
        userId: r.userId,
        userName: r.userName,
        userAvatar: r.userAvatar,
        createdAt: r.createdAt,
        distance: r.distance,
        durationSeconds: r.durationSeconds,
        weight: r.weight,
        notes: r.notes,
      })),
      ...postResults.map(p => ({
        type: 'post' as const,
        id: p.id,
        userId: p.userId,
        userName: p.userName,
        userAvatar: p.userAvatar,
        createdAt: p.createdAt,
        postType: p.postType,
        content: p.content,
        referenceId: p.referenceId,
      })),
    ];

    combined.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return combined.slice(0, 50);
  }

  async sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
    const existing = await db.select().from(friendships).where(
      or(
        and(eq(friendships.requesterId, requesterId), eq(friendships.addresseeId, addresseeId)),
        and(eq(friendships.requesterId, addresseeId), eq(friendships.addresseeId, requesterId)),
      ),
    );
    if (existing.length > 0) {
      const f = existing[0];
      if (f.status === 'accepted') throw new Error('Already friends');
      if (f.status === 'pending') throw new Error('Friend request already pending');
      if (f.status === 'declined') {
        const [updated] = await db.update(friendships).set({
          requesterId,
          addresseeId,
          status: 'pending',
          updatedAt: new Date(),
        }).where(eq(friendships.id, f.id)).returning();
        return updated;
      }
    }
    const [friendship] = await db.insert(friendships).values({
      requesterId,
      addresseeId,
      status: 'pending',
    }).returning();
    return friendship;
  }

  async acceptFriendRequest(friendshipId: string, userId: string): Promise<Friendship> {
    const [f] = await db.select().from(friendships).where(eq(friendships.id, friendshipId));
    if (!f) throw new Error('Friend request not found');
    if (f.addresseeId !== userId) throw new Error('Not authorized');
    if (f.status !== 'pending') throw new Error('Request is not pending');
    const [updated] = await db.update(friendships).set({
      status: 'accepted',
      updatedAt: new Date(),
    }).where(eq(friendships.id, friendshipId)).returning();
    return updated;
  }

  async declineFriendRequest(friendshipId: string, userId: string): Promise<void> {
    const [f] = await db.select().from(friendships).where(eq(friendships.id, friendshipId));
    if (!f) throw new Error('Friend request not found');
    if (f.addresseeId !== userId) throw new Error('Not authorized');
    await db.update(friendships).set({
      status: 'declined',
      updatedAt: new Date(),
    }).where(eq(friendships.id, friendshipId));
  }

  async unfriend(userId: string, friendId: string): Promise<void> {
    await db.delete(friendships).where(
      and(
        or(
          and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, friendId)),
          and(eq(friendships.requesterId, friendId), eq(friendships.addresseeId, userId)),
        ),
        eq(friendships.status, 'accepted'),
      ),
    );
  }

  async getFriends(userId: string): Promise<Array<{ id: string; name: string | null; username: string; avatar: string | null; location: string | null; friendshipId: string }>> {
    const sent = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        avatar: users.avatar,
        location: users.location,
        friendshipId: friendships.id,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.addresseeId, users.id))
      .where(and(eq(friendships.requesterId, userId), eq(friendships.status, 'accepted')));

    const received = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        avatar: users.avatar,
        location: users.location,
        friendshipId: friendships.id,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.requesterId, users.id))
      .where(and(eq(friendships.addresseeId, userId), eq(friendships.status, 'accepted')));

    return [...sent, ...received];
  }

  async getFriendIds(userId: string): Promise<string[]> {
    const friends = await this.getFriends(userId);
    return friends.map(f => f.id);
  }

  async getPendingFriendRequests(userId: string): Promise<Array<{ id: string; requesterId: string; requesterName: string | null; requesterUsername: string; requesterAvatar: string | null; createdAt: Date | null }>> {
    return db
      .select({
        id: friendships.id,
        requesterId: friendships.requesterId,
        requesterName: users.name,
        requesterUsername: users.username,
        requesterAvatar: users.avatar,
        createdAt: friendships.createdAt,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.requesterId, users.id))
      .where(and(eq(friendships.addresseeId, userId), eq(friendships.status, 'pending')));
  }

  async getFriendshipStatus(userId: string, otherUserId: string): Promise<{ status: string; friendshipId: string; direction: 'sent' | 'received' } | null> {
    const [f] = await db.select().from(friendships).where(
      or(
        and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, otherUserId)),
        and(eq(friendships.requesterId, otherUserId), eq(friendships.addresseeId, userId)),
      ),
    );
    if (!f || f.status === 'declined') return null;
    const direction = f.requesterId === userId ? 'sent' : 'received';
    return { status: f.status, friendshipId: f.id, direction };
  }

  async getFriendCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(friendships)
      .where(
        and(
          or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)),
          eq(friendships.status, 'accepted'),
        ),
      );
    return Number(result[0]?.count || 0);
  }

  async getFriendsFeed(userId: string, limit: number): Promise<Array<Ruck & { userName: string | null; userAvatar: string | null }>> {
    const friendIds = await this.getFriendIds(userId);
    const allIds = [userId, ...friendIds];
    if (allIds.length === 0) return [];
    return db
      .select({
        id: rucks.id,
        userId: rucks.userId,
        distance: rucks.distance,
        durationSeconds: rucks.durationSeconds,
        weight: rucks.weight,
        notes: rucks.notes,
        routeCoordinates: rucks.routeCoordinates,
        routeImageUrl: rucks.routeImageUrl,
        communityId: rucks.communityId,
        challengeId: rucks.challengeId,
        createdAt: rucks.createdAt,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(rucks)
      .leftJoin(users, eq(rucks.userId, users.id))
      .where(inArray(rucks.userId, allIds))
      .orderBy(desc(rucks.createdAt))
      .limit(limit);
  }

  async getCommunityDetail(communityId: string, userId?: string): Promise<{
    community: (Community & { creatorName: string | null }) | null;
    joined: boolean;
    feed: FeedItem[];
    challenges: EnrichedChallenge[];
  }> {
    const community = await this.getCommunity(communityId);
    if (!community) return { community: null, joined: false, feed: [], challenges: [] };

    let creatorName: string | null = null;
    if (community.createdBy) {
      const creator = await this.getUser(community.createdBy);
      creatorName = creator?.name || creator?.username || null;
    }

    let joined = false;
    if (userId) {
      const membership = await db.select().from(userCommunities).where(
        and(eq(userCommunities.userId, userId), eq(userCommunities.communityId, communityId))
      );
      joined = membership.length > 0;
    }

    const [feed, challengeList] = await Promise.all([
      this.getCommunityFeedWithPosts(communityId),
      this.getCommunityChall(communityId),
    ]);

    let userJoinedChallengeIds = new Set<string>();
    if (userId && challengeList.length > 0) {
      userJoinedChallengeIds = await this.getUserChallengeIds(userId, challengeList.map(ch => ch.id));
    }

    const enrichedChallenges = await Promise.all(challengeList.map(async (ch) => {
      const participantCount = await this.getChallengeParticipantCount(ch.id);
      return { ...ch, participantCount, isJoined: userJoinedChallengeIds.has(ch.id) };
    }));

    return {
      community: { ...community, creatorName },
      joined,
      feed,
      challenges: enrichedChallenges,
    };
  }

  async createNotification(data: { userId: string; type: string; referenceId?: string; fromUserId?: string; message: string }): Promise<void> {
    if (data.userId === data.fromUserId) return;
    await db.insert(notifications).values({
      userId: data.userId,
      type: data.type,
      referenceId: data.referenceId || null,
      fromUserId: data.fromUserId || null,
      message: data.message,
    });
  }

  async getNotifications(userId: string, limit = 50): Promise<Array<Notification & { fromUserName: string | null; fromUserAvatar: string | null }>> {
    return db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        type: notifications.type,
        referenceId: notifications.referenceId,
        fromUserId: notifications.fromUserId,
        message: notifications.message,
        read: notifications.read,
        createdAt: notifications.createdAt,
        fromUserName: users.name,
        fromUserAvatar: users.avatar,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.fromUserId, users.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return Number(row?.count || 0);
  }

  async markNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  }

  async getUserAchievements(userId: string): Promise<Array<{ id: string; title: string; icon: string; description: string; earned: boolean }>> {
    const stats = await this.getUserRuckStats(userId);
    const userRucksData = await this.getUserRucks(userId);

    const maxWeight = userRucksData.reduce((max, r) => Math.max(max, r.weight || 0), 0);
    const hasHeavyLongRuck = userRucksData.some(r => (r.weight || 0) >= 50 && ((r.distance || 0) / 100) >= 5);
    const communityCount = (await this.getUserCommunities(userId)).length;

    const allAchievements = [
      { id: 'a1', title: 'First Ruck', icon: 'footsteps', description: 'Complete your first ruck', check: () => stats.totalRucks >= 1 },
      { id: 'a2', title: '10 Rucks', icon: 'medal', description: 'Complete 10 rucks', check: () => stats.totalRucks >= 10 },
      { id: 'a3', title: '25 Rucks', icon: 'ribbon', description: 'Complete 25 rucks', check: () => stats.totalRucks >= 25 },
      { id: 'a4', title: '10 Miles', icon: 'map', description: 'Log 10 total miles', check: () => stats.totalMiles >= 10 },
      { id: 'a5', title: '50 Miles', icon: 'navigate', description: 'Log 50 total miles', check: () => stats.totalMiles >= 50 },
      { id: 'a6', title: '100 Miles', icon: 'trophy', description: 'Log 100 total miles', check: () => stats.totalMiles >= 100 },
      { id: 'a7', title: '500 Miles', icon: 'star', description: 'Log 500 total miles', check: () => stats.totalMiles >= 500 },
      { id: 'a8', title: 'Heavy Hauler', icon: 'fitness', description: 'Carry 50+ lbs for 5+ miles', check: () => hasHeavyLongRuck },
      { id: 'a9', title: 'Iron Back', icon: 'barbell', description: 'Ruck with 75+ lbs', check: () => maxWeight >= 75 },
      { id: 'a10', title: 'Pack Leader', icon: 'people', description: 'Join 3 communities', check: () => communityCount >= 3 },
      { id: 'a11', title: 'Ton Hauler', icon: 'cube', description: 'Move 2,000+ total lbs', check: () => stats.weightMoved >= 2000 },
      { id: 'a12', title: 'Beast Mode', icon: 'flame', description: 'Move 10,000+ total lbs', check: () => stats.weightMoved >= 10000 },
    ];

    return allAchievements.map(a => ({
      id: a.id,
      title: a.title,
      icon: a.icon,
      description: a.description,
      earned: a.check(),
    }));
  }
}

export const storage = new DatabaseStorage();
