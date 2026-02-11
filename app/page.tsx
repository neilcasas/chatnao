"use client";

import { useEffect, useMemo, useState } from "react";
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

const languageOptions = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "tl", label: "Tagalog" },
  { code: "fr", label: "French" },
  { code: "hi", label: "Hindi" },
];

type Role = "doctor" | "patient";
type Gender = "male" | "female" | "other" | "prefer_not_to_say";

type SessionUser = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  age: number;
  gender: Gender;
  specialty: string | null;
  preferredLanguage: string;
};

const emptyForm = {
  email: "",
  password: "",
  name: "",
  role: "patient" as Role,
  age: "",
  gender: "prefer_not_to_say" as Gender,
  specialty: "",
  preferredLanguage: "en",
};

export default function Home() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState({ loading: false, error: "" });
  const [session, setSession] = useState<SessionUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("chatnao-session");
    if (stored) {
      setSession(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (session) {
      localStorage.setItem("chatnao-session", JSON.stringify(session));
    } else {
      localStorage.removeItem("chatnao-session");
    }
  }, [session]);

  const isDoctor = form.role === "doctor";
  const stepOneReady = form.email && form.password;
  const stepTwoReady =
    form.name &&
    form.age &&
    !Number.isNaN(Number(form.age)) &&
    form.preferredLanguage &&
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
          preferredLanguage: form.preferredLanguage,
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
  };

  const switchMode = (nextMode: "login" | "signup") => {
    setMode(nextMode);
    setForm(emptyForm);
    setStep(1);
    setStatus({ loading: false, error: "" });
  };

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
              Chatnao pairs patients and doctors in their preferred language,
              translating every message with context kept intact. Start with a
              quick onboarding to tune the experience for each role.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="glass-panel rounded-3xl border-0 p-0">
              <CardContent className="p-6 text-sm text-stone-700">
              <p className="font-semibold text-emerald-900">Doctor-ready</p>
              <p className="mt-2">
                Specialty-aware chats help clinicians stay in their zone while
                care context is always preserved.
              </p>
              </CardContent>
            </Card>
            <Card className="glass-panel rounded-3xl border-0 p-0">
              <CardContent className="p-6 text-sm text-stone-700">
              <p className="font-semibold text-emerald-900">Patient-first</p>
              <p className="mt-2">
                Patients speak freely in their own language and get translated
                care plans in seconds.
              </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Card className="glass-panel animate-float-in border-0 shadow-xl">
          {session ? (
            <>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-emerald-700">
                      Signed in
                    </p>
                    <CardTitle className="text-3xl text-emerald-950">
                      Welcome, {session.name}
                    </CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Log out
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-2xl border border-emerald-900/10 bg-white/80 p-5 text-sm text-stone-700">
                  <p>
                    Role: <span className="font-semibold">{session.role}</span>
                  </p>
                  <p>
                    Preferred language:{" "}
                    <span className="font-semibold">
                      {session.preferredLanguage}
                    </span>
                  </p>
                  {session.specialty ? (
                    <p>
                      Specialty:{" "}
                      <span className="font-semibold">{session.specialty}</span>
                    </p>
                  ) : null}
                </div>
                <Button className="w-full">Enter care chat</Button>
              </CardContent>
            </>
          ) : (
            <>
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

                          <div className="grid gap-4 sm:grid-cols-2">
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

                            <label className="block text-sm font-semibold text-emerald-900">
                              Preferred language
                              <Select
                                value={form.preferredLanguage}
                                onValueChange={(value) =>
                                  handleChange("preferredLanguage", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                  {languageOptions.map((option) => (
                                    <SelectItem
                                      key={option.code}
                                      value={option.code}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </label>
                          </div>

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
                                    <SelectItem
                                      key={specialty}
                                      value={specialty}
                                    >
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
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
