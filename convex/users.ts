import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { specialties } from "./schema";

export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const getById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const listDoctors = query({
  args: {},
  handler: async (ctx) => {
    const doctors = await ctx.db
      .query("users")
      .withIndex("by_role_specialty", (q) => q.eq("role", "doctor"))
      .collect();

    return doctors.map((doctor) => ({
      userId: doctor._id,
      name: doctor.name,
      specialty: doctor.specialty ?? null,
    }));
  },
});

export const create = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    role: v.union(v.literal("doctor"), v.literal("patient")),
    age: v.number(),
    gender: v.union(
      v.literal("male"),
      v.literal("female"),
      v.literal("other"),
      v.literal("prefer_not_to_say")
    ),
    specialty: v.optional(specialties),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", args);
  },
});
