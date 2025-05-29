"use client";

import { useEffect } from "react";

export function ServiceInitializer() {
  useEffect(() => {
    // Only initialize services in production and in the browser
    if (
      process.env.NODE_ENV === "production" &&
      typeof window !== "undefined"
    ) {
      fetch("/api/init").catch(console.error);
    }
  }, []);

  // This component doesn't render anything
  return null;
}
