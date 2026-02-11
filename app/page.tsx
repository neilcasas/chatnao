"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const specialties = [
  "General Practice",
  "Cardiology",
  "Pediatrics",
  "Neurology",
  "Orthopedics",
  "Dermatology",
  "Psychiatry",
  "Oncology",
  "Endocrinology",
  "Gastroenterology",
];

type Role = "doctor" | "patient";

type Gender = "male" | "female" | "other" | "prefer_not_to_say";

type SessionUser = {
  userId: Id<"users">;
  name: string;
  email: string;
  role: Role;
  age: number;
  gender: Gender;
  specialty: string | null;
};

type DoctorSummary = {
  userId: Id<"users">;
  name: string;
  specialty: string | null;
};

type ChatSummary = {
  chatId: Id<"chats">;
  status: "active" | "archived";
  summary: string | null;
  otherUser: {
    userId: Id<"users">;
    name: string;
    role: Role;
    specialty: string | null;
  };
};

type MessageSummary = {
  messageId: Id<"messages">;
  chatId: Id<"chats">;
  senderId: Id<"users">;
  originalText: string;
  translatedText: string;
  audioUrl: string | null;
  timestamp: number;
};

type SearchSummary = {
  messageId: Id<"messages">;
  preview: string;
};

type UploadState = "idle" | "recording" | "uploading";

const emptyForm = {
  email: "",
  password: "",
  name: "",
  role: "patient" as Role,
  age: "",
  gender: "prefer_not_to_say" as Gender,
  specialty: "",
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function Home() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState({ loading: false, error: "" });
  const [session, setSession] = useState<SessionUser | null>(null);
  const [activeChatId, setActiveChatId] = useState<Id<"chats"> | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const listChats = useQuery(
    api.chats.listForUser,
    session ? { userId: session.userId, role: session.role } : "skip"
  ) as ChatSummary[] | undefined;
  const doctors = useQuery(
    api.users.listDoctors,
    session?.role === "patient" ? {} : "skip"
  ) as DoctorSummary[] | undefined;
  const messages = useQuery(
    api.messages.listByChat,
    activeChatId ? { chatId: activeChatId } : "skip"
  ) as MessageSummary[] | undefined;
  const searchResults = useQuery(
    api.messages.search,
    searchTerm && activeChatId
      ? { chatId: activeChatId, query: searchTerm }
      : "skip"
  ) as SearchSummary[] | undefined;

  const createChat = useMutation(api.chats.createChat);
  const createUploadUrl = useMutation(api.messages.createUploadUrl);
  const sendMessage = useAction(api.messages.sendMessage);

  useEffect(() => {
    const stored = localStorage.getItem("chatnao-session");
    if (stored) {
      setSession(JSON.parse(stored) as SessionUser);
    }
  }, []);

  useEffect(() => {
    if (session) {
      localStorage.setItem("chatnao-session", JSON.stringify(session));
    } else {
      localStorage.removeItem("chatnao-session");
    }
  }, [session]);

  useEffect(() => {
    if (!activeChatId && listChats && listChats.length > 0) {
      setActiveChatId(listChats[0].chatId);
    }
  }, [activeChatId, listChats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isDoctor = form.role === "doctor";
  const stepOneReady = form.email && form.password;
  const stepTwoReady =
    form.name &&
    form.age &&
    !Number.isNaN(Number(form.age)) &&
    form.role &&
    (isDoctor ? form.specialty : true);

  const headline = useMemo(() => {
    if (mode === "login") {
      return "Welcome back to Chatnao";
    }
    return step === 1
      ? "Create your account"
      : "Tell us about your care style";
  }, [mode, step]);

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus({ loading: true, error: "" });

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          age: Number(form.age),
          gender: form.gender,
          specialty: isDoctor ? form.specialty : undefined,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Signup failed");
      }

      setSession(payload.user);
      setForm(emptyForm);
      setStep(1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed";
      setStatus({ loading: false, error: message });
      return;
    }

    setStatus({ loading: false, error: "" });
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus({ loading: true, error: "" });

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Login failed");
      }

      setSession(payload.user);
      setForm(emptyForm);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      setStatus({ loading: false, error: message });
      return;
    }

    setStatus({ loading: false, error: "" });
  };

  const handleLogout = () => {
    setSession(null);
    setActiveChatId(null);
    setMessageText("");
    setSearchTerm("");
  };

  const switchMode = (nextMode: "login" | "signup") => {
    setMode(nextMode);
    setForm(emptyForm);
    setStep(1);
    setStatus({ loading: false, error: "" });
  };

  const handleStartChat = async (doctorId: Id<"users">) => {
    if (!session) return;
    try {
      const chatId = await createChat({
        doctorId,
        patientId: session.userId,
      });
      setActiveChatId(chatId as Id<"chats">);
    } catch (error) {
      setStatus({
        loading: false,
        error: "Unable to start chat right now.",
      });
    }
  };

  const handleSelectChat = (chatId: Id<"chats">) => {
    setActiveChatId(chatId);
    setSearchTerm("");
  };

  const handleSendMessage = async () => {
    if (!session || !activeChatId || !messageText.trim()) return;
    const text = messageText.trim();
    setMessageText("");
    try {
      await sendMessage({
        chatId: activeChatId,
        senderId: session.userId,
        originalText: text,
      });
    } catch (error) {
      setStatus({
        loading: false,
        error: "Unable to send message right now.",
      });
    }
  };

  const handleStartRecording = async () => {
    if (uploadState !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0 || !session || !activeChatId) {
          setUploadState("idle");
          return;
        }
        setUploadState("uploading");
        try {
          const uploadUrl = await createUploadUrl();
          const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": blob.type },
            body: blob,
          });
          const payload = await uploadResponse.json();
          await sendMessage({
            chatId: activeChatId,
            senderId: session.userId,
            originalText: "",
            audioStorageId: payload.storageId,
          });
        } catch (error) {
          setStatus({
            loading: false,
            error: "Audio upload failed. Try again.",
          });
        }
        setUploadState("idle");
      };
      recorder.start();
      setUploadState("recording");
    } catch (error) {
      setStatus({
        loading: false,
        error: "Microphone access was denied.",
      });
    }
  };

  const handleStopRecording = () => {
    if (uploadState !== "recording") return;
    recorderRef.current?.stop();
  };

  const renderHighlighted = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
    return text.split(regex).map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={`${part}-${index}`}
          className="rounded bg-amber-200/70 px-1"
        >
          {part}
        </mark>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      )
    );
  };

  if (!session) {
    return (
      <div className="relative min-h-screen overflow-hidden px-6 py-12 sm:px-10">
        <div className="pointer-events-none absolute -left-28 top-10 h-64 w-64 rounded-full bg-teal-200/40 blur-3xl" />
        <div className="pointer-events-none absolute right-10 top-20 h-72 w-72 rounded-full bg-orange-200/50 blur-3xl" />
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="flex flex-col justify-between gap-10">
            <div className="space-y-6">
              <Badge className="w-fit" variant="secondary">
                Care without language barriers
              </Badge>
              <h1 className="font-display text-4xl leading-tight text-emerald-950 sm:text-5xl">
                Cross-language care conversations that feel human.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-stone-700">
                Chatnao pairs patients and doctors in near real time. Messages
                are rewritten for clarity so each role gets the right level of
                detail without losing context.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <Card className="glass-panel rounded-3xl border-0 p-0">
                <CardContent className="p-6 text-sm text-stone-700">
                  <p className="font-semibold text-emerald-900">Doctor-ready</p>
                  <p className="mt-2">
                    Specialty-aware chats help clinicians stay in their zone
                    while care context is always preserved.
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-panel rounded-3xl border-0 p-0">
                <CardContent className="p-6 text-sm text-stone-700">
                  <p className="font-semibold text-emerald-900">Patient-first</p>
                  <p className="mt-2">
                    Patients speak freely and receive clear next steps with
                    jargon removed.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <Card className="glass-panel animate-float-in border-0 shadow-xl">
            <CardHeader className="pb-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.32em] text-emerald-700">
                  {mode === "login" ? "Sign in" : "Onboarding"}
                </p>
                <CardTitle className="text-3xl text-emerald-950">
                  {headline}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={mode === "login" ? handleLogin : handleSignup}
                className="space-y-6"
              >
                {status.error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {status.error}
                  </div>
                ) : null}

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-emerald-900">
                    Email
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        handleChange("email", event.target.value)
                      }
                      placeholder="name@clinic.com"
                      required
                    />
                  </label>

                  <label className="block text-sm font-semibold text-emerald-900">
                    Password
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(event) =>
                        handleChange("password", event.target.value)
                      }
                      placeholder="At least 8 characters"
                      required
                    />
                  </label>
                </div>

                {mode === "signup" ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                      <Badge
                        className="px-3 py-1"
                        variant={step === 1 ? "default" : "secondary"}
                      >
                        Step 1
                      </Badge>
                      <Badge
                        className="px-3 py-1"
                        variant={step === 2 ? "default" : "secondary"}
                      >
                        Step 2
                      </Badge>
                    </div>

                    {step === 2 ? (
                      <div className="space-y-4">
                        <label className="block text-sm font-semibold text-emerald-900">
                          Full name
                          <Input
                            type="text"
                            value={form.name}
                            onChange={(event) =>
                              handleChange("name", event.target.value)
                            }
                            placeholder="Dr. Jordan Lee"
                            required
                          />
                        </label>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block text-sm font-semibold text-emerald-900">
                            Role
                            <Select
                              value={form.role}
                              onValueChange={(value) =>
                                handleChange("role", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="patient">Patient</SelectItem>
                                <SelectItem value="doctor">Doctor</SelectItem>
                              </SelectContent>
                            </Select>
                          </label>

                          <label className="block text-sm font-semibold text-emerald-900">
                            Age
                            <Input
                              type="number"
                              min={0}
                              value={form.age}
                              onChange={(event) =>
                                handleChange("age", event.target.value)
                              }
                              placeholder="32"
                            />
                          </label>
                        </div>

                        <label className="block text-sm font-semibold text-emerald-900">
                          Gender
                          <Select
                            value={form.gender}
                            onValueChange={(value) =>
                              handleChange("gender", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="prefer_not_to_say">
                                Prefer not to say
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </label>

                        {isDoctor ? (
                          <label className="block text-sm font-semibold text-emerald-900">
                            Specialty
                            <Select
                              value={form.specialty || undefined}
                              onValueChange={(value) =>
                                handleChange("specialty", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a specialty" />
                              </SelectTrigger>
                              <SelectContent>
                                {specialties.map((specialty) => (
                                  <SelectItem key={specialty} value={specialty}>
                                    {specialty}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </label>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-stone-600">
                        Start with your account details, then complete a quick
                        onboarding to personalize your care experience.
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {mode === "signup" && step === 2 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </Button>
                  ) : null}

                  {mode === "signup" && step === 1 ? (
                    <Button
                      type="button"
                      disabled={!stepOneReady}
                      onClick={() => setStep(2)}
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={
                        status.loading || (mode === "signup" && !stepTwoReady)
                      }
                    >
                      {status.loading
                        ? "Working..."
                        : mode === "login"
                        ? "Sign in"
                        : "Create account"}
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      switchMode(mode === "login" ? "signup" : "login")
                    }
                  >
                    {mode === "login"
                      ? "Need an account?"
                      : "Already have an account?"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-emerald-700">
            Chat workspace
          </p>
          <h2 className="font-display text-3xl text-emerald-950">
            Welcome, {session.name}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Log out
        </Button>
      </div>

      <div className="mx-auto mt-8 grid max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="glass-panel border-0">
          <CardHeader>
            <CardTitle className="text-xl text-emerald-950">People</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {session.role === "patient" ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.28em] text-emerald-700">
                  Find doctors
                </p>
                {doctors?.length ? (
                  <div className="space-y-2">
                    {doctors.map((doctor) => (
                      <button
                        key={doctor.userId}
                        type="button"
                        onClick={() => handleStartChat(doctor.userId)}
                        className="flex w-full flex-col rounded-2xl border border-emerald-900/10 bg-white/80 px-4 py-3 text-left transition hover:border-emerald-900/30"
                      >
                        <span className="text-sm font-semibold text-emerald-950">
                          {doctor.name}
                        </span>
                        <span className="text-xs text-stone-600">
                          {doctor.specialty || "General care"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-600">
                    No doctors available yet.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.28em] text-emerald-700">
                  Your clients
                </p>
                {listChats?.length ? (
                  <div className="space-y-2">
                    {listChats.map((chat) => (
                      <button
                        key={chat.chatId}
                        type="button"
                        onClick={() => handleSelectChat(chat.chatId)}
                        className={`flex w-full flex-col rounded-2xl border px-4 py-3 text-left transition ${
                          chat.chatId === activeChatId
                            ? "border-emerald-800 bg-emerald-50"
                            : "border-emerald-900/10 bg-white/80 hover:border-emerald-900/30"
                        }`}
                      >
                        <span className="text-sm font-semibold text-emerald-950">
                          {chat.otherUser.name}
                        </span>
                        <span className="text-xs text-stone-600">
                          {chat.otherUser.specialty
                            ? `Focus: ${chat.otherUser.specialty}`
                            : "Patient"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-600">
                    No clients yet. Start a chat to connect.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-700">
                Active chats
              </p>
              {listChats?.length ? (
                <div className="space-y-2">
                  {listChats.map((chat) => (
                    <button
                      key={chat.chatId}
                      type="button"
                      onClick={() => handleSelectChat(chat.chatId)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                        chat.chatId === activeChatId
                          ? "border-emerald-800 bg-emerald-50"
                          : "border-emerald-900/10 bg-white/80 hover:border-emerald-900/30"
                      }`}
                    >
                      <span className="text-emerald-950">
                        {chat.otherUser.name}
                      </span>
                      <span className="text-xs text-stone-600">
                        {chat.otherUser.role}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-600">
                  Start a chat to see it here.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-emerald-950">
              {listChats?.find((chat) => chat.chatId === activeChatId)
                ?.otherUser.name || "Select a chat"}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
              <span>
                {activeChatId
                  ? "Conversation clarity enabled"
                  : "Choose a conversation to begin"}
              </span>
              {activeChatId ? (
                <Badge variant="secondary">LLM assisted</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {status.error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {status.error}
              </div>
            ) : null}
            <div className="flex items-center gap-3">
              <Input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search messages"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setSearchTerm("")}
                disabled={!searchTerm}
              >
                Clear
              </Button>
            </div>

            {searchTerm && searchResults ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-stone-700">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-700">
                  Search results
                </p>
                <div className="mt-3 space-y-2">
                  {searchResults.length === 0 ? (
                    <p>No matches yet.</p>
                  ) : (
                    searchResults.map((result) => (
                      <div
                        key={result.messageId}
                        className="rounded-xl bg-white/80 px-3 py-2"
                      >
                        {renderHighlighted(result.preview, searchTerm)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
              {messages?.length ? (
                messages.map((message) => {
                  const isSender = message.senderId === session.userId;
                  const mainText = isSender
                    ? message.originalText
                    : message.translatedText;
                  const secondaryText = isSender
                    ? message.translatedText
                    : message.originalText;
                  return (
                    <div
                      key={message.messageId}
                      className={`flex ${
                        isSender ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          isSender
                            ? "bg-emerald-700 text-white"
                            : "bg-white/90 text-emerald-950"
                        }`}
                      >
                        {mainText ? <p>{mainText}</p> : null}
                        {secondaryText && secondaryText !== mainText ? (
                          <p
                            className={`mt-2 text-xs ${
                              isSender ? "text-emerald-100" : "text-stone-500"
                            }`}
                          >
                            {secondaryText}
                          </p>
                        ) : null}
                        {message.audioUrl ? (
                          <audio
                            className="mt-3 w-full"
                            controls
                            src={message.audioUrl}
                          />
                        ) : null}
                        <p
                          className={`mt-2 text-[0.65rem] uppercase tracking-[0.2em] ${
                            isSender ? "text-emerald-100" : "text-stone-400"
                          }`}
                        >
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-stone-600">
                  No messages yet. Start the conversation below.
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="rounded-2xl border border-emerald-900/10 bg-white/80 p-4">
              <textarea
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Write a message"
                rows={3}
                className="w-full resize-none rounded-2xl border border-emerald-900/10 bg-white/90 px-4 py-3 text-sm text-emerald-950 outline-none transition focus:border-emerald-900/30 focus:ring-2 focus:ring-[var(--ring)]"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!activeChatId || !messageText.trim()}
                >
                  Send message
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    uploadState === "recording"
                      ? handleStopRecording
                      : handleStartRecording
                  }
                  disabled={!activeChatId || uploadState === "uploading"}
                >
                  {uploadState === "recording"
                    ? "Stop recording"
                    : uploadState === "uploading"
                    ? "Uploading..."
                    : "Record audio"}
                </Button>
                <span className="text-xs text-stone-500">
                  Messages are rewritten for clarity before delivery.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
