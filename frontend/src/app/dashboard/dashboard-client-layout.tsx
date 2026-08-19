"use client";

import { AccessProvider } from "@/lib/access-context";

export function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  return <AccessProvider>{children}</AccessProvider>;
}