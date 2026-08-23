"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function Topbar() {
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center justify-end border-b bg-white px-6 md:flex">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-slate-100"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
            U
          </div>

          <div className="text-left">
            <div className="text-sm font-semibold text-slate-900">
              UMKM Demo
            </div>

            <div className="text-xs text-slate-500">
              Owner
            </div>
          </div>

          <span className="text-sm text-slate-500">
            ▾
          </span>
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border bg-white shadow-lg">
            <button
              type="button"
              className="block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              Profil Bisnis
            </button>

            <button
              type="button"
              className="block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              Pengaturan
            </button>

            <div className="border-t">
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}