import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  username: text("username").notNull().unique(),
  password: text("password"),
  name: text("name"),
  avatar: text("avatar"),
  gender: text("gender"),
  weight: integer("weight"),
  location: text("location"),
  bio: text("bio"),
  googleId: text("google_id").unique(),
  appleId: text("apple_id").unique(),
  onboardingComplete: boolean("onboarding_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communities = pgTable("communities", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  memberCount: integer("member_count").default(0),
  banner: text("banner"),
  category: text("category"),
  location: text("location"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userCommunities = pgTable("user_communities", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  communityId: varchar("community_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const rucks = pgTable("rucks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  distance: integer("distance"),
  durationSeconds: integer("duration_seconds"),
  weight: integer("weight"),
  notes: text("notes"),
  routeCoordinates: text("route_coordinates"),
  routeImageUrl: text("route_image_url"),
  communityId: varchar("community_id"),
  challengeId: varchar("challenge_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const challenges = pgTable("challenges", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  communityId: varchar("community_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  challengeType: text("challenge_type").notNull(),
  goalValue: integer("goal_value").notNull(),
  goalUnit: text("goal_unit").notNull(),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date").notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const challengeParticipants = pgTable("challenge_participants", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").notNull(),
  userId: varchar("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const communityPosts = pgTable("community_posts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  communityId: varchar("community_id").notNull(),
  postType: text("post_type").notNull(),
  referenceId: varchar("reference_id"),
  userId: varchar("user_id").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ruckLikes = pgTable("ruck_likes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ruckId: varchar("ruck_id").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("ruck_likes_ruck_user_idx").on(table.ruckId, table.userId),
]);

export const ruckComments = pgTable("ruck_comments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ruckId: varchar("ruck_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  referenceId: varchar("reference_id"),
  fromUserId: varchar("from_user_id"),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const friendships = pgTable("friendships", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull(),
  addresseeId: varchar("addressee_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Friendship = typeof friendships.$inferSelect;

export const insertRuckSchema = z.object({
  distance: z.number().positive(),
  durationSeconds: z.number().int().nonnegative().optional(),
  weight: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  routeCoordinates: z.string().optional(),
  routeImageUrl: z.string().optional(),
});

export type Ruck = typeof rucks.$inferSelect;
export type InsertRuck = z.infer<typeof insertRuckSchema>;

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  password: true,
  name: true,
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const onboardingSchema = z.object({
  gender: z.string().min(1),
  weight: z.number().positive(),
  location: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores").optional(),
  bio: z.string().max(200).optional(),
  location: z.string().optional(),
  weight: z.number().positive().optional(),
  gender: z.string().optional(),
});

export const createCommunitySchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name must be under 50 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be under 500 characters"),
  category: z.enum(["General", "Events", "Local", "Training", "Military", "Challenges", "Gear", "Social"]),
  location: z.string().min(1, "Location is required").max(100),
});

export const createChallengeSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title must be under 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be under 500 characters"),
  challengeType: z.enum(["distance", "weight", "rucks"]),
  goalValue: z.number().int().positive("Goal must be a positive number"),
  goalUnit: z.string().min(1),
  endDate: z.string().min(1, "End date is required"),
});

export const updateCommunitySchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name must be under 50 characters").optional(),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be under 500 characters").optional(),
  category: z.enum(["General", "Events", "Local", "Training", "Military", "Challenges", "Gear", "Social"]).optional(),
  location: z.string().min(1, "Location is required").max(100).optional(),
  banner: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Community = typeof communities.$inferSelect;
export type UserCommunity = typeof userCommunities.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;
export type CommunityPost = typeof communityPosts.$inferSelect;
export type RuckLike = typeof ruckLikes.$inferSelect;
export type RuckComment = typeof ruckComments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
