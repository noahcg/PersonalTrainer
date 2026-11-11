import { sameOrigin } from "@/lib/agreement/origin";
import { NextResponse } from "next/server";
import { agreementClient } from "@/lib/agreement/server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const auth = await agreementClient();
    if (!auth) return NextResponse.json({ error: "Unavailable." }, { status: 404 });
    const { id } = await context.params;
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (body.agreed !== true || body.electronicConsent !== true || name.length < 2 || name.length > 200) return NextResponse.json({ error: "Enter your full name and confirm both electronic delivery and the agreement." }, { status: 400 });
    const { data, error } = await auth.admin.rpc("accept_client_agreement", { p_offer: id, p_client: auth.client.id, p_profile: auth.user.id, p_name: name });
    if (error) return NextResponse.json({ error: "This agreement is no longer available. Contact your trainer if you need help." }, { status: 409 });
    return NextResponse.json({ ok: true, acceptedAt: data });
  } catch { return NextResponse.json({ error: "Unable to save your agreement. Please try again." }, { status: 500 }); }
}
