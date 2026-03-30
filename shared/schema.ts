import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow(),
});

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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Community = typeof communities.$inferSelect;
export type UserCommunity = typeof userCommunities.$inferSelect;
