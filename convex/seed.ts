import bcrypt from "bcryptjs";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { specialties } from "./schema";

/** Internal mutation that seeds all data using ctx.db.insert directly */
export const seedDatabase = internalMutation({
  args: { passwordHash: v.string(), now: v.number() },
  handler: async (ctx, { passwordHash, now }): Promise<{
    users: Id<"users">[];
    chats: Id<"chats">[];
  }> => {
    // Helper to find or create user
    const ensureUser = async (input: {
      name: string;
      email: string;
      role: "doctor" | "patient";
      age: number;
      gender: "male" | "female" | "other" | "prefer_not_to_say";
      specialty?: string;
    }): Promise<Id<"users">> => {
      const existing = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), input.email))
        .first();
      if (existing) return existing._id;

      return await ctx.db.insert("users", {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        age: input.age,
        gender: input.gender,
        specialty: input.specialty as
          | "General Practice"
          | "Cardiology"
          | "Pediatrics"
          | "Neurology"
          | "Orthopedics"
          | "Dermatology"
          | "Psychiatry"
          | "Oncology"
          | "Endocrinology"
          | "Gastroenterology"
          | undefined,
      });
    };

    // Create users
    const drPatelId = await ensureUser({
      name: "Dr. Maya Patel",
      email: "maya.patel@chatnao.test",
      role: "doctor",
      age: 42,
      gender: "female",
      specialty: "Cardiology",
    });

    const drChenId = await ensureUser({
      name: "Dr. Lucas Chen",
      email: "lucas.chen@chatnao.test",
      role: "doctor",
      age: 38,
      gender: "male",
      specialty: "Pediatrics",
    });

    const patientBelloId = await ensureUser({
      name: "Aisha Bello",
      email: "aisha.bello@chatnao.test",
      role: "patient",
      age: 29,
      gender: "female",
    });

    const patientRuizId = await ensureUser({
      name: "Marco Ruiz",
      email: "marco.ruiz@chatnao.test",
      role: "patient",
      age: 34,
      gender: "male",
    });

    // Create chats
    const chatOneId = await ctx.db.insert("chats", {
      doctorId: drPatelId,
      patientId: patientBelloId,
      specialtyContext: "Cardiology",
      status: "active",
      summary:
        "Patient reports intermittent chest tightness and fatigue. Follow-up planned with lab work and activity adjustments.",
    });

    const chatTwoId = await ctx.db.insert("chats", {
      doctorId: drChenId,
      patientId: patientRuizId,
      specialtyContext: "Pediatrics",
      status: "active",
      summary:
        "Patient reports knee pain after activity and requests guidance on next steps.",
    });

    // Create messages
    await ctx.db.insert("messages", {
      chatId: chatOneId,
      senderId: patientBelloId,
      originalText: "I have a tight feeling in my chest after climbing stairs.",
      translatedText: "I feel tightness in my chest when I climb stairs.",
      searchText:
        "I have a tight feeling in my chest after climbing stairs.\nI feel tightness in my chest when I climb stairs.",
      timestamp: now - 1000 * 60 * 45,
    });

    await ctx.db.insert("messages", {
      chatId: chatOneId,
      senderId: drPatelId,
      originalText:
        "Please note any shortness of breath and we will schedule an ECG and blood tests.",
      translatedText:
        "Please watch for any shortness of breath. We will schedule heart tests and blood work.",
      searchText:
        "Please note any shortness of breath and we will schedule an ECG and blood tests.\nPlease watch for any shortness of breath. We will schedule heart tests and blood work.",
      timestamp: now - 1000 * 60 * 40,
    });

    await ctx.db.insert("messages", {
      chatId: chatTwoId,
      senderId: patientRuizId,
      originalText: "My knee aches after soccer practice, mostly on the right.",
      translatedText: "My right knee hurts after soccer practice.",
      searchText:
        "My knee aches after soccer practice, mostly on the right.\nMy right knee hurts after soccer practice.",
      timestamp: now - 1000 * 60 * 30,
    });

    await ctx.db.insert("messages", {
      chatId: chatTwoId,
      senderId: drChenId,
      originalText:
        "Try resting the knee for 48 hours and apply ice. Let me know if swelling appears.",
      translatedText:
        "Rest your knee for two days and use ice. Tell me if swelling shows up.",
      searchText:
        "Try resting the knee for 48 hours and apply ice. Let me know if swelling appears.\nRest your knee for two days and use ice. Tell me if swelling shows up.",
      timestamp: now - 1000 * 60 * 25,
    });

    return {
      users: [drPatelId, drChenId, patientBelloId, patientRuizId],
      chats: [chatOneId, chatTwoId],
    };
  },
});

export const seed = action({
  args: {},
  handler: async (ctx): Promise<{ users: Id<"users">[]; chats: Id<"chats">[] }> => {
    const passwordHash = await bcrypt.hash("Test1234!", 10);
    const now = Date.now();
    return await ctx.runMutation(internal.seed.seedDatabase, { passwordHash, now });
  },
});
