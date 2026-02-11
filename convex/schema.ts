import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Doctor specialties enum
export const specialties = v.union(
  v.literal("General Practice"),
  v.literal("Cardiology"),
  v.literal("Pediatrics"),
  v.literal("Neurology"),
  v.literal("Orthopedics"),
  v.literal("Dermatology"),
  v.literal("Psychiatry"),
  v.literal("Oncology"),
  v.literal("Endocrinology"),
  v.literal("Gastroenterology")
);

export default defineSchema({
  // User profiles with role and specialty
  users: defineTable({
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
    specialty: v.optional(specialties), // Only for doctors
  })
    .index("by_email", ["email"])
    .index("by_role_specialty", ["role", "specialty"]),

  // Chat sessions (Conversations)
  chats: defineTable({
    doctorId: v.id("users"),
    patientId: v.id("users"),
    specialtyContext: v.optional(specialties), // Snapshot of specialty at time of chat
    status: v.union(v.literal("active"), v.literal("archived")),
    summary: v.optional(v.string()), // AI-generated summary
  })
    .index("by_doctor", ["doctorId"])
    .index("by_patient", ["patientId"]),

  // Messages with translation and audio support
  messages: defineTable({
    chatId: v.id("chats"),
    senderId: v.id("users"),

    // Content handling
    originalText: v.string(), // Text as typed/spoken
    translatedText: v.string(), // Processed text for the recipient
    searchText: v.string(), // Combined text for search

    // Audio handling
    audioStorageId: v.optional(v.id("_storage")), // Convex built-in storage

    // Metadata
    timestamp: v.number(), // Use Date.now()
  })
    .index("by_chat", ["chatId"])
    // Search functionality
    .searchIndex("search_body", {
      searchField: "searchText",
      filterFields: ["chatId"],
    }),
});
