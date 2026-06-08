"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Waves, LogOut, User, Home, List, Map, BarChart3, ArrowLeftRight } from "lucide-react";

const desktopItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dives", label: "Dives", icon: List },
  { href: "/map", label: "Map", icon: Map },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/import-export", label: "Data", icon: ArrowLeftRight },
];

export function TopBar({ name }: { name: string }) {
  const router = useRouter();
  const pathname = usePathname();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-ocean-700 dark:text-ocean-300">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ocean-600 text-white">
            <Waves size={18} />
          </span>
          <span className="text-lg font-bold">DivingLog</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {desktopItems.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-ocean-50 text-ocean-700 dark:bg-ocean-950 dark:text-ocean-300"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={16} /> {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Link
            href="/profile"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <User size={16} />
            <span className="hidden sm:inline">{name}</span>
          </Link>
          <button
            onClick={signOut}
            title="Sign out"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
