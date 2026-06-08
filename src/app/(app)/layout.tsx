import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    profile?.display_name || user.email?.split("@")[0] || "Diver";

  return (
    <div className="min-h-screen">
      <TopBar name={name} />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:pb-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
