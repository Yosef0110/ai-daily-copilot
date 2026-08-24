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
    label: "Products",
  },
  {
    href: "/inventory",
    label: "Inventory",
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white md:hidden">
      <div className="grid grid-cols-3">
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
                  ? "px-2 py-3 text-center text-xs font-semibold text-blue-600"
                  : "px-2 py-3 text-center text-xs font-medium text-slate-500"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}