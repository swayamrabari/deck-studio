import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { readJsonBody } from "@/lib/http";
import { createDeckFromStarter } from "@/lib/starter";

/** Creates a new deck for the signed-in user, seeded from the starter template. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: bodyError } = await readJsonBody(request);
  if (bodyError) return bodyError;
  const title = typeof body?.title === "string" ? body.title : "";
  const deck = await createDeckFromStarter(user.id, title);
  revalidatePath("/decks");
  return NextResponse.json(deck, { status: 201 });
}
