import React from "react";
import { Sidebar } from "@/presentation/components/sidebar";
import { Header } from "@/presentation/components/header";
import { Footer } from "@/presentation/components/footer";
import { SessionGuard } from "@/presentation/components/session-guard";
import { IdleTimer } from "@/presentation/components/idle-timer";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SessionGuard>
      <IdleTimer />
      <div className="flex h-screen bg-clean-white overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
            <div className="p-8 animate-in fade-in duration-700">
              {children}
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </SessionGuard>
  );
}
