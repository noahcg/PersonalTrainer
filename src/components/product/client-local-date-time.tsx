"use client";

import { useEffect, useState } from "react";

function formatLocalDateTime(iso: string) {
  const date = new Date(iso);
  return `${date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} at ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  })}`;
}

export function ClientLocalDateTime({ iso, fallback }: { iso: string; fallback: string }) {
  const [formatted, setFormatted] = useState(fallback);

  useEffect(() => {
    const timeout = window.setTimeout(() => setFormatted(formatLocalDateTime(iso)), 0);
    return () => window.clearTimeout(timeout);
  }, [iso]);

  return <span>{formatted}</span>;
}
