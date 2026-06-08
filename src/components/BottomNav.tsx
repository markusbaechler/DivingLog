"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, Map, BarChart3, ArrowLeftRight } from "lucide-react";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dives", label: "Dives", icon: List },
  { href: "/map", label: "Map", icon: Map },
  { href: "/statistics", label: "Stats", icon: BarChart3 },
  { href: "/import-export", label: "Data", icon: ArrowLeftRight },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
      <ul
        className="mx-auto flex max-w-2xl items-stretch justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] transition ${
                  active
                    ? "text-ocean-600 dark:text-ocean-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
