import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";

export const getById = internalQuery({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chatId);
  },
});

export const listForUser = query({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("doctor"), v.literal("patient")),
  },
  handler: async (ctx, args) => {
    const chats =
      args.role === "doctor"
        ? await ctx.db
            .query("chats")
            .withIndex("by_doctor", (q) => q.eq("doctorId", args.userId))
            .collect()
        : await ctx.db
            .query("chats")
            .withIndex("by_patient", (q) => q.eq("patientId", args.userId))
            .collect();

    const enriched = await Promise.all(
      chats.map(async (chat) => {
        const otherId =
          args.role === "doctor" ? chat.patientId : chat.doctorId;
        const otherUser = await ctx.db.get(otherId);

        return {
          chatId: chat._id,
          status: chat.status,
          summary: chat.summary ?? null,
          otherUser: otherUser
            ? {
                userId: otherUser._id,
                name: otherUser.name,
                role: otherUser.role,
                specialty: otherUser.specialty ?? null,
              }
            : {
                userId: otherId,
                name: "Unknown",
                role: args.role === "doctor" ? "patient" : "doctor",
                specialty: null,
              },
        };
      })
    );

    return enriched;
  },
});

export const createChat = mutation({
  args: { doctorId: v.id("users"), patientId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chats")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .filter((q) => q.eq(q.field("patientId"), args.patientId))
      .first();

    if (existing) {
      return existing._id;
    }

    const doctor = await ctx.db.get(args.doctorId);

    return await ctx.db.insert("chats", {
      doctorId: args.doctorId,
      patientId: args.patientId,
      specialtyContext: doctor?.specialty ?? undefined,
      status: "active",
      summary: undefined,
    });
  },
});
