"use client";

import { useMemo, useState } from "react";
import { EnvelopeSimple, ShieldCheck, Trash, UserCircle } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminUser } from "@/types/admin";


function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function verificationLabel(user: AdminUser) {
  if (user.verified_emails.some((email) => email.verified)) {
    return "Verified";
  }
  return "Unverified";
}

function primaryEmail(user: AdminUser) {
  return user.email || user.verified_emails[0]?.email || "No email";
}

export function AdminUsersPanel({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUser[];
  currentUserId: number;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [confirmingUserId, setConfirmingUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const counts = useMemo(
    () => ({
      total: users.length,
      unverified: users.filter((user) => verificationLabel(user) === "Unverified")
        .length,
      admins: users.filter((user) => user.is_staff || user.is_superuser).length,
    }),
    [users]
  );

  const deleteUser = async (user: AdminUser) => {
    setDeletingUserId(user.id);
    setError("");

    try {
      const response = await fetch(`/api/django/admin/users/${user.id}/`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Unable to delete this user."
        );
      }

      setUsers((currentUsers) =>
        currentUsers.filter((currentUser) => currentUser.id !== user.id)
      );
      setConfirmingUserId(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this user."
      );
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border-y border-border/70 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Users
          </p>
          <p className="mt-1 text-2xl font-black text-foreground">{counts.total}</p>
        </div>
        <div className="border-y border-border/70 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Unverified
          </p>
          <p className="mt-1 text-2xl font-black text-foreground">
            {counts.unverified}
          </p>
        </div>
        <div className="border-y border-border/70 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Admins
          </p>
          <p className="mt-1 text-2xl font-black text-foreground">{counts.admins}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold">Last login</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="bg-card">
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-muted p-2 text-muted-foreground">
                        <UserCircle size={18} weight="regular" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {user.username}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <EnvelopeSimple size={14} weight="regular" />
                          {primaryEmail(user)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={
                          verificationLabel(user) === "Verified"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {verificationLabel(user)}
                      </Badge>
                      {(user.is_staff || user.is_superuser) && (
                        <Badge className="gap-1">
                          <ShieldCheck size={12} weight="regular" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {formatDate(user.date_joined)}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {formatDate(user.last_login)}
                  </td>
                  <td className="px-4 py-4">
                    <DeleteControls
                      canDelete={user.id !== currentUserId}
                      confirming={confirmingUserId === user.id}
                      deleting={deletingUserId === user.id}
                      onCancel={() => setConfirmingUserId(null)}
                      onConfirm={() => void deleteUser(user)}
                      onRequest={() => setConfirmingUserId(user.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-border md:hidden">
          {users.map((user) => (
            <div key={user.id} className="space-y-4 bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{user.username}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {primaryEmail(user)}
                  </p>
                </div>
                <Badge
                  variant={
                    verificationLabel(user) === "Verified" ? "secondary" : "outline"
                  }
                >
                  {verificationLabel(user)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <p className="uppercase tracking-[0.14em]">Joined</p>
                  <p className="mt-1 text-sm text-foreground">
                    {formatDate(user.date_joined)}
                  </p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.14em]">Last login</p>
                  <p className="mt-1 text-sm text-foreground">
                    {formatDate(user.last_login)}
                  </p>
                </div>
              </div>
              <DeleteControls
                canDelete={user.id !== currentUserId}
                confirming={confirmingUserId === user.id}
                deleting={deletingUserId === user.id}
                onCancel={() => setConfirmingUserId(null)}
                onConfirm={() => void deleteUser(user)}
                onRequest={() => setConfirmingUserId(user.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeleteControls({
  canDelete,
  confirming,
  deleting,
  onCancel,
  onConfirm,
  onRequest,
}: {
  canDelete: boolean;
  confirming: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onRequest: () => void;
}) {
  if (!canDelete) {
    return (
      <div className="text-right text-xs font-medium text-muted-foreground">
        Current account
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onConfirm}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Confirm"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={deleting}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <Button type="button" variant="ghost" size="sm" onClick={onRequest}>
        <Trash size={15} weight="regular" />
        Delete
      </Button>
    </div>
  );
}
