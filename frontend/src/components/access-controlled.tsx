"use client";

import { memo } from "react";
import { useAccess } from "@/lib/access-context";

interface AccessControlledProps {
  id: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function AccessControlledInner({
  id,
  children,
  fallback = null,
}: AccessControlledProps) {
  const { hasAccess, loading } = useAccess();

  if (loading) return null;

  if (hasAccess(id)) return <>{children}</>;

  return <>{fallback}</>;
}

const AccessControlled = memo(AccessControlledInner);
AccessControlled.displayName = "AccessControlled";

export default AccessControlled;
