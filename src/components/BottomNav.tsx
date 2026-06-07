"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, Map, BarChart3, ArrowLeftRight } from "lucide-react";

const items = [
  { href: "/", label: "Start", icon: Home },
  { href: "/dives", label: "Tauchgänge", icon: List },
  { href: "/map", label: "Karte", icon: Map },
  { href: "/statistics", label: "Statistik", icon: BarChart3 },
  { href: "/import-export", label: "Daten", icon: ArrowLeftRight },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
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
                  active ? "text-ocean-600" : "text-slate-400"
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
