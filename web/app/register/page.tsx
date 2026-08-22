"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          business_name: businessName,
          business_type: businessType,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Registrasi gagal",
        );
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Registrasi gagal",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Buat Akun
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Daftarkan akun dan bisnis kamu.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="business-name"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Nama Bisnis
            </label>

            <input
              id="business-name"
              value={businessName}
              onChange={(event) =>
                setBusinessName(event.target.value)
              }
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="business-type"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Jenis Bisnis
            </label>

            <input
              id="business-type"
              value={businessType}
              onChange={(event) =>
                setBusinessType(event.target.value)
              }
              placeholder="Contoh: Warung, Retail, F&B"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading
              ? "Mendaftarkan..."
              : "Daftar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:underline"
          >
            Masuk
          </Link>
        </p>
      </div>
    </main>
  );
}