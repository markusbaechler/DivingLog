import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { ProfileForm } from "@/components/ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
        Profile
      </h1>
      <ProfileForm
        profile={(profile as Profile) ?? null}
        email={user?.email ?? ""}
      />
    </div>
  );
}
