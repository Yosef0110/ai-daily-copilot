"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  {
    href: "/dashboard",
    label: "Dashboard",
  },
  {
    href: "/products",
    label: "Product Master",
  },
  {
    href: "/inventory",
    label: "Inventory",
  },
  {
    href: "/forecast",
    label: "Forecasting",
  },
  {
    href: "/imports",
    label: "Imports"
  }
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-64 flex-col border-r bg-white md:flex">
      <div className="border-b px-6 py-5">
        <Link
          href="/dashboard"
          className="text-xl font-bold text-slate-900"
        >
          AI Daily Copilot
        </Link>

        <p className="mt-1 text-xs text-slate-500">
          UMKM Management
        </p>
      </div>

      <nav className="space-y-1 p-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "block rounded-lg bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700"
                  : "block rounded-lg px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}