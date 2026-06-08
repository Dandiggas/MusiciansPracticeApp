import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import { djangoFetchJson } from "@/lib/serverFetch";
import { AdminUser, CurrentUser } from "@/types/admin";


export default async function AdminPage() {
  const [users, currentUser] = await Promise.all([
    djangoFetchJson<AdminUser[]>("admin/users/"),
    djangoFetchJson<CurrentUser>("current-user/"),
  ]);

  return (
    <main className="container mx-auto max-w-6xl px-4 py-10 md:px-8">
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            User control room
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review registered accounts and remove test users from the production
            app.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <AdminUsersPanel initialUsers={users} currentUserId={currentUser.id} />
      </div>
    </main>
  );
}
