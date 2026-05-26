"use client";

import React from "react";
import Image from "next/image";

interface LogoProps {
  className?: string;
  priority?: boolean;
}

export default function SatIcaLogo({ className = "w-full h-auto", priority = true }: LogoProps) {
  return (
    <div className={`relative ${className} overflow-hidden rounded-xl bg-white p-3.5 shadow-sm border border-slate-100/80 flex items-center justify-center`}>
      <Image
        src="/logo_sat_2026.jpeg"
        alt="SAT ICA Logo"
        width={350}
        height={110}
        className="object-contain h-auto max-h-24 w-full select-none"
        priority={priority}
      />
    </div>
  );
}
