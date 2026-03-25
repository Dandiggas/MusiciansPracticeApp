"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, Clock3, Music2, Sparkles } from "lucide-react";

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const apiUrl = `${apiBaseUrl}/dj-rest-auth/login/`;

    try {
      const response = await axios.post(apiUrl, formData);
      localStorage.setItem("token", response.data.key);
      localStorage.setItem("userId", response.data.user);
      router.push("/dashboard");
    } catch (err) {
      console.error("Login error", err);
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<{ detail?: string }>;
        setError(
          axiosError.response?.data?.detail ||
            "Invalid username or password. Please try again."
        );
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_28%),radial-gradient(circle_at_85%_18%,_rgba(14,165,233,0.15),_transparent_22%),linear-gradient(180deg,_#fffdf7_0%,_#fff_40%,_#f8fafc_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-10 h-64 w-64 rounded-full bg-amber-200/25 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-sky-200/20 blur-3xl" />
      </div>

      <div className="container relative mx-auto flex min-h-screen items-center px-4 py-10 md:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-white/60 bg-slate-950 p-8 text-white shadow-[0_35px_100px_-55px_rgba(15,23,42,0.95)]">
            <div className="inline-flex items-center rounded-full border border-white/12 bg-white/8 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              Welcome Back
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
              Practice makes permanent. Intentional practice makes progress.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
              Log in, reopen your last session, and get back to focused work
              without rebuilding your setup from scratch.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <Music2 className="h-5 w-5 text-amber-300" />
                <p className="mt-3 text-sm font-semibold text-white">
                  Resume your setup
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Jump back into the last instrument, media source, and flow.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <Clock3 className="h-5 w-5 text-sky-300" />
                <p className="mt-3 text-sm font-semibold text-white">
                  Build consistency
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Short sessions still matter when the setup is ready the moment you sit down.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <Sparkles className="h-5 w-5 text-rose-300" />
                <p className="mt-3 text-sm font-semibold text-white">
                  Plan when you need it
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Recommendations stay available without getting in the way of practice.
                </p>
              </div>
            </div>
          </div>

          <Card className="border-white/70 bg-white/90 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
            <CardHeader className="space-y-3">
              <div className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Log In
              </div>
              <CardTitle className="text-3xl font-black tracking-tight text-slate-950">
                Return to your dashboard
              </CardTitle>
              <CardDescription className="text-base text-slate-600">
                Your session history, last setup, and practice recommendations
                live behind your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-semibold text-slate-800">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="your_username"
                    required
                    disabled={isLoading}
                    className="h-12 rounded-2xl border-slate-200 bg-white px-4 shadow-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-800">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="h-12 rounded-2xl border-slate-200 bg-white px-4 shadow-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 w-full rounded-2xl bg-slate-950 text-base text-white hover:bg-slate-800"
                >
                  {isLoading ? "Logging in..." : "Open My Dashboard"}
                  {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  New here?
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Create an account so your sessions, setup, and history persist.
                </p>
                <Button
                  asChild
                  variant="secondary"
                  className="mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-none hover:bg-slate-50"
                >
                  <Link href="/register">Create Account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
