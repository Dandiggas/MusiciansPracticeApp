import { AccountSettingsPanel } from "@/components/account/AccountSettingsPanel";
import { djangoFetchJson } from "@/lib/serverFetch";
import { CurrentUser } from "@/types/admin";


export default async function AccountPage() {
  const currentUser = await djangoFetchJson<CurrentUser>("current-user/");

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
      <div className="border-b border-border pb-6">
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
          Settings
        </h1>
      </div>

      <AccountSettingsPanel currentUser={currentUser} />
    </main>
  );
}
