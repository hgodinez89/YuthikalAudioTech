"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/error-screen";
import { isDbDownDigest } from "@/lib/db-error";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // La pantalla de base de datos solo si la base no respondió (digest propio,
  // ver lib/db-error); el resto es un error genérico. El digest permite
  // rastrearlo en los logs.
  return (
    <main id="main" tabIndex={-1} className="flex-1 outline-none">
      <ErrorScreen
        kind={isDbDownDigest(error.digest) ? "db" : "generic"}
        onRetry={retry}
        digest={error.digest}
      />
    </main>
  );
}
