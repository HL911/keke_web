"use client";

import { Toaster } from "@/components/ui/sonner";

interface ShadcnProviderProps {
  children: React.ReactNode;
}

export default function ShadcnProvider({ children }: ShadcnProviderProps) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
