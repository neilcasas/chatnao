import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const buildPrompt = (senderRole: string, text: string) => {
  if (senderRole === "doctor") {
    return `You are a medical communication assistant. Rewrite the doctor's message so it is easy for a patient to understand.

Rules:
- Use plain language.
- Keep empathetic tone.
- Preserve all facts and instructions.
- Do not add new medical advice.

Message: ${text}`;
  }

  return `You are a medical communication assistant. Rewrite the patient's message into a concise clinical summary for a doctor.

Rules:
- Keep symptoms, duration, severity, and context.
- Avoid diagnosis.
- Use clear clinical phrasing.
- Do not add new information.

Message: ${text}`;
};

const generateGeminiText = async (systemPrompt: string, message: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });

  const chat = model.startChat({ history: [] });
  const result = await chat.sendMessage(message);
  return result.response.text().trim();
};

export const createUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = internalMutation({
  args: {
    chatId: v.id("chats"),
    senderId: v.id("users"),
    originalText: v.string(),
    translatedText: v.string(),
    searchText: v.string(),
    audioStorageId: v.optional(v.id("_storage")),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      chatId: args.chatId,
      senderId: args.senderId,
      originalText: args.originalText,
      translatedText: args.translatedText,
      searchText: args.searchText,
      audioStorageId: args.audioStorageId,
      timestamp: args.timestamp,
    });
  },
});

export const listByChat = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();

    return await Promise.all(
      messages.map(async (message) => {
        const audioUrl = message.audioStorageId
          ? await ctx.storage.getUrl(message.audioStorageId)
          : null;

        return {
          messageId: message._id,
          chatId: message.chatId,
          senderId: message.senderId,
          originalText: message.originalText,
          translatedText: message.translatedText,
          audioUrl,
          timestamp: message.timestamp,
        };
      })
    );
  },
});

export const search = query({
  args: { chatId: v.id("chats"), query: v.string() },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("messages")
      .withSearchIndex("search_body", (q) =>
        q.search("searchText", args.query).eq("chatId", args.chatId)
      )
      .take(8);

    return results.map((message) => {
      const preview = message.translatedText || message.originalText;
      return {
        messageId: message._id,
        preview: preview.slice(0, 180),
      };
    });
  },
});

export const sendMessage = action({
  args: {
    chatId: v.id("chats"),
    senderId: v.id("users"),
    originalText: v.string(),
    audioStorageId: v.optional(v.id("_storage")),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ messageId: Id<"messages">; processedText: string }> => {
    const chat = await ctx.runQuery(internal.chats.getById, {
      chatId: args.chatId,
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    const sender = await ctx.runQuery(internal.users.getById, {
      userId: args.senderId,
    });

    if (!sender) {
      throw new Error("Sender not found");
    }

    const recipientId =
      sender._id === chat.doctorId ? chat.patientId : chat.doctorId;
    const recipient = await ctx.runQuery(internal.users.getById, {
      userId: recipientId,
    });

    if (!recipient) {
      throw new Error("Recipient not found");
    }

    const trimmed = args.originalText.trim();
    let processedText = "";

    if (trimmed) {
      const prompt = buildPrompt(sender.role, trimmed);
      processedText = await generateGeminiText(prompt, trimmed);
    }

    const searchText = [trimmed, processedText].filter(Boolean).join("\n");

    const messageId: Id<"messages"> = await ctx.runMutation(
      internal.messages.create,
      {
      chatId: args.chatId,
      senderId: args.senderId,
      originalText: trimmed,
      translatedText: processedText,
      searchText,
      audioStorageId: args.audioStorageId,
      timestamp: Date.now(),
      }
    );

    return {
      messageId,
      processedText,
    };
  },
});
