"use client";

import { useEffect } from "react";
import { ErrorDb } from "@/components/error-db";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // El único backend es Supabase: un error de datos casi siempre significa
  // proyecto pausado por inactividad (free tier) o sin conexión.
  return <ErrorDb onRetry={reset} />;
}
