"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/error-screen";
import { isDbDownDigest } from "@/lib/db-error";

/* Error dentro de canciones: conserva el header y la barra del instrumento. */
export default function SongsError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      kind={isDbDownDigest(error.digest) ? "db" : "generic"}
      onRetry={retry}
      digest={error.digest}
      embedded
    />
  );
}
