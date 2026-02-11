import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

const buildSummaryPrompt = (transcript: string) =>
  `You are a medical summarization assistant. Summarize the conversation in a concise, structured format.

Requirements:
- Keep it under 200 words.
- Use plain language for the summary.
- Highlight: symptoms, diagnoses (if mentioned), medications, and follow-up actions.
- Do not add new information or advice.

Conversation:
${transcript}`;

const generateSummary = async (prompt: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: "You write concise medical conversation summaries.",
  });
  const chat = model.startChat({ history: [] });
  const result = await chat.sendMessage(prompt);
  return result.response.text().trim();
};

export const getById = internalQuery({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chatId);
  },
});

export const updateSummary = internalMutation({
  args: { chatId: v.id("chats"), summary: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, { summary: args.summary });
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

export const summarizeChat = action({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const messages = await ctx.runQuery(internal.messages.listForSummary, {
      chatId: args.chatId,
      limit: 40,
    });

    if (!messages.length) {
      throw new Error("No messages to summarize");
    }

    const transcript = messages
      .map((message) => {
        const content = message.translatedText || message.originalText;
        return `${message.senderRole}: ${content}`.trim();
      })
      .join("\n");

    const summary = await generateSummary(buildSummaryPrompt(transcript));

    await ctx.runMutation(internal.chats.updateSummary, {
      chatId: args.chatId,
      summary,
    });

    return { summary };
  },
});
