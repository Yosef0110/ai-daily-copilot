import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex">
        <AppSidebar />

        <div className="min-w-0 pb-16 md:ml-64 md:pb-0">
          <Topbar />

          {children}
        </div>
      </div>

      <MobileNav />
    </div>
  );
}