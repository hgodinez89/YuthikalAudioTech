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

  // Boundary genérico: cubre cualquier error del servidor (fallo de datos,
  // BD temporalmente inaccesible, etc.). El digest permite rastrearlo en logs.
  return <ErrorDb onRetry={reset} digest={error.digest} />;
}
