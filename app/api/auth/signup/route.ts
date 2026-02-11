import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

const convex = new ConvexHttpClient(convexUrl);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      password,
      role,
      age,
      gender,
      specialty,
    } = body ?? {};

    if (
      !name ||
      !email ||
      !password ||
      !role ||
      typeof age !== "number" ||
      !gender
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await convex.action(api.auth.signup, {
      name,
      email,
      password,
      role,
      age,
      gender,
      specialty: specialty ?? undefined,
    });

    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
