import type { User, InsertUser, Community, UserCommunity } from "@shared/schema";
import { randomUUID } from "crypto";

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
  getCommunities(): Promise<Community[]>;
  searchCommunities(query: string): Promise<Community[]>;
  getUserCommunities(userId: string): Promise<Community[]>;
  joinCommunity(userId: string, communityId: string): Promise<void>;
  leaveCommunity(userId: string, communityId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, string>;
  private communities: Map<string, Community>;
  private userCommunities: Map<string, UserCommunity>;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.communities = new Map();
    this.userCommunities = new Map();
    this.seedCommunities();
  }

  private seedCommunities() {
    const communities: Community[] = [
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

    for (const c of communities) {
      this.communities.set(c.id, c);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId,
    );
  }

  async getUserByAppleId(appleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.appleId === appleId,
    );
  }

  async createUser(insertUser: Partial<User> & { username: string }): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
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
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }

  async getSessionUser(token: string): Promise<User | undefined> {
    const userId = this.sessions.get(token);
    if (!userId) return undefined;
    return this.users.get(userId);
  }

  async createSession(userId: string): Promise<string> {
    const token = randomUUID();
    this.sessions.set(token, userId);
    return token;
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async getCommunities(): Promise<Community[]> {
    return Array.from(this.communities.values());
  }

  async searchCommunities(query: string): Promise<Community[]> {
    const q = query.toLowerCase();
    return Array.from(this.communities.values()).filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q)) ||
        (c.location && c.location.toLowerCase().includes(q)),
    );
  }

  async getUserCommunities(userId: string): Promise<Community[]> {
    const joined = Array.from(this.userCommunities.values()).filter(
      (uc) => uc.userId === userId,
    );
    return joined
      .map((uc) => this.communities.get(uc.communityId))
      .filter((c): c is Community => c !== undefined);
  }

  async joinCommunity(userId: string, communityId: string): Promise<void> {
    const existing = Array.from(this.userCommunities.values()).find(
      (uc) => uc.userId === userId && uc.communityId === communityId,
    );
    if (existing) return;
    const id = randomUUID();
    this.userCommunities.set(id, {
      id,
      userId,
      communityId,
      joinedAt: new Date(),
    });
    const community = this.communities.get(communityId);
    if (community) {
      this.communities.set(communityId, {
        ...community,
        memberCount: (community.memberCount || 0) + 1,
      });
    }
  }

  async leaveCommunity(userId: string, communityId: string): Promise<void> {
    const entry = Array.from(this.userCommunities.entries()).find(
      ([, uc]) => uc.userId === userId && uc.communityId === communityId,
    );
    if (entry) {
      this.userCommunities.delete(entry[0]);
      const community = this.communities.get(communityId);
      if (community) {
        this.communities.set(communityId, {
          ...community,
          memberCount: Math.max(0, (community.memberCount || 0) - 1),
        });
      }
    }
  }
}

export const storage = new MemStorage();
