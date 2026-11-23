"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NewDeckButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function create() {
    setPending(true);
    try {
      const res = await fetch("/api/decks", { method: "POST" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        id?: string;
      } | null;
      if (res.ok && data?.id) {
        router.push(`/decks/${data.id}/edit`);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={create} disabled={pending}>
      <PlusIcon />
      {pending ? "Creating…" : "New deck"}
    </Button>
  );
}
