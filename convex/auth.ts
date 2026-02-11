"use node";

import bcrypt from "bcryptjs";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { specialties } from "./schema";

export const signup = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
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
    const existing = await ctx.runQuery(internal.users.getByEmail, {
      email: args.email,
    });

    if (existing) {
      throw new Error("Email is already in use");
    }

    const passwordHash = await bcrypt.hash(args.password, 10);

    const userId = await ctx.runMutation(internal.users.create, {
      name: args.name,
      email: args.email,
      passwordHash,
      role: args.role,
      age: args.age,
      gender: args.gender,
      specialty: args.specialty,
      tokenIdentifier: args.email,
    });

    return {
      userId,
      name: args.name,
      email: args.email,
      role: args.role,
      age: args.age,
      gender: args.gender,
      specialty: args.specialty ?? null,
    };
  },
});

export const login = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.users.getByEmail, {
      email: args.email,
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isValid = await bcrypt.compare(args.password, user.passwordHash);

    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      age: user.age,
      gender: user.gender,
      specialty: user.specialty ?? null,
    };
  },
});
