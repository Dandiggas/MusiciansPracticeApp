"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { CheckCircle, Eye, EyeSlash, Key, UserCircle } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrentUser } from "@/types/admin";


type PasswordForm = {
  old_password: string;
  new_password1: string;
  new_password2: string;
};

function extractErrorMessage(body: unknown) {
  if (body && typeof body === "object") {
    const firstValue = Object.values(body)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }
    if (typeof firstValue === "string") {
      return firstValue;
    }
    if ("detail" in body && typeof body.detail === "string") {
      return body.detail;
    }
  }
  return "Could not update your password. Check the fields and try again.";
}

function PasswordInput({
  id,
  label,
  name,
  value,
  disabled,
  visible,
  onChange,
  onToggle,
}: {
  id: keyof PasswordForm;
  label: string;
  name: keyof PasswordForm;
  value: string;
  disabled: boolean;
  visible: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          required
          disabled={disabled}
          className="h-10 rounded-lg border-border/60 bg-background px-3 pr-11 shadow-none transition-colors duration-200 focus:border-primary/50 focus:bg-white"
        />
        <button
          type="button"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          onClick={onToggle}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          {visible ? <EyeSlash size={18} weight="regular" /> : <Eye size={18} weight="regular" />}
        </button>
      </div>
    </div>
  );
}

export function AccountSettingsPanel({ currentUser }: { currentUser: CurrentUser }) {
  const [form, setForm] = useState<PasswordForm>({
    old_password: "",
    new_password1: "",
    new_password2: "",
  });
  const [visibleFields, setVisibleFields] = useState<Record<keyof PasswordForm, boolean>>({
    old_password: false,
    new_password1: false,
    new_password2: false,
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const toggleField = (field: keyof PasswordForm) => {
    setVisibleFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");
    setError("");

    try {
      const response = await fetch("/api/django/dj-rest-auth/password/change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(extractErrorMessage(body));
      }

      setForm({ old_password: "", new_password1: "", new_password2: "" });
      setStatus("saved");
    } catch (changeError) {
      setStatus("error");
      setError(
        changeError instanceof Error
          ? changeError.message
          : extractErrorMessage(null)
      );
    }
  };

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="border-y border-border/70 py-5">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-muted p-2.5 text-muted-foreground">
            <UserCircle size={22} weight="regular" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {currentUser.username}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {currentUser.email || "No email on file"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Key size={18} weight="regular" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Change password
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your current password before choosing a new one.
            </p>
          </div>
        </div>

        {status === "saved" && (
          <div
            role="status"
            className="mt-5 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm font-medium text-foreground"
          >
            <CheckCircle size={16} weight="regular" className="text-success" />
            Password updated.
          </div>
        )}

        {status === "error" && (
          <div className="mt-5 rounded-lg bg-destructive/[0.06] px-3.5 py-2.5 text-sm font-medium text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <PasswordInput
            id="old_password"
            label="Current password"
            name="old_password"
            value={form.old_password}
            disabled={status === "saving"}
            visible={visibleFields.old_password}
            onChange={handleChange}
            onToggle={() => toggleField("old_password")}
          />
          <PasswordInput
            id="new_password1"
            label="New password"
            name="new_password1"
            value={form.new_password1}
            disabled={status === "saving"}
            visible={visibleFields.new_password1}
            onChange={handleChange}
            onToggle={() => toggleField("new_password1")}
          />
          <PasswordInput
            id="new_password2"
            label="Confirm new password"
            name="new_password2"
            value={form.new_password2}
            disabled={status === "saving"}
            visible={visibleFields.new_password2}
            onChange={handleChange}
            onToggle={() => toggleField("new_password2")}
          />

          <Button type="submit" disabled={status === "saving"} className="w-full sm:w-auto">
            {status === "saving" ? "Saving..." : "Update password"}
          </Button>
        </form>
      </section>
    </div>
  );
}
