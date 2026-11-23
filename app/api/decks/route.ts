import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createDeckFromStarter } from "@/lib/starter";

/** Creates a new deck for the signed-in user, seeded from the starter template. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deck = await createDeckFromStarter(user.id);
  return NextResponse.json(deck, { status: 201 });
}
