import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { hasInviteEmailEnv, sendInviteEmail } from "@/lib/email";
import { renderInviteEmailHtml, renderInviteEmailText } from "@/lib/invitations";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { clientId, subject, message } = (await request.json()) as {
      clientId?: string;
      subject?: string;
      message?: string;
    };

    if (!clientId) {
      return NextResponse.json({ error: "Client id is required." }, { status: 400 });
    }

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Invite subject and message are required." }, { status: 400 });
    }

    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin invite flow is not configured." }, { status: 500 });
    }

    const isLocalInviteFallback = process.env.NODE_ENV !== "production" && !hasInviteEmailEnv();

    if (!hasInviteEmailEnv() && !isLocalInviteFallback) {
      return NextResponse.json(
        { error: "Custom invite email is not configured. Add RESEND_API_KEY and INVITE_FROM_EMAIL." },
        { status: 500 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle<{ id: string }>();

    if (!trainer?.id) {
      return NextResponse.json({ error: "Trainer profile not found." }, { status: 403 });
    }

    const { data: client } = await supabase
      .from("clients")
      .select("id, email, full_name")
      .eq("trainer_id", trainer.id)
      .eq("id", clientId)
      .maybeSingle<{ id: string; email: string; full_name: string }>();

    if (!client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    const admin = createAdminClient();
    const { data: existingProfile, error: profileLookupError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("email", client.email)
      .maybeSingle<{ id: string; role: "trainer" | "client" }>();

    if (profileLookupError) {
      return NextResponse.json({ error: profileLookupError.message }, { status: 500 });
    }

    if (existingProfile?.role === "trainer") {
      return NextResponse.json(
        {
          error:
            "This email already belongs to a trainer account. Use a different email address for the client.",
        },
        { status: 400 },
      );
    }

    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/auth/callback?next=/setup-account`;

    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email: client.email,
      options: {
        redirectTo,
        data: {
          full_name: client.full_name,
          role: "client",
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const actionLink = data.properties.action_link;
    const hashedToken = data.properties.hashed_token;
    const verificationType = data.properties.verification_type as EmailOtpType | undefined;
    if (!actionLink) {
      return NextResponse.json({ error: "Unable to generate invite link." }, { status: 500 });
    }

    if (!isLocalInviteFallback) {
      await sendInviteEmail({
        to: client.email,
        subject: subject.trim(),
        html: renderInviteEmailHtml({
          subject: subject.trim(),
          message: message.trim(),
          actionLink,
        }),
        text: renderInviteEmailText({
          message: message.trim(),
          actionLink,
        }),
      });
    }

    const inviteSentAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("clients")
      .update({ invite_sent_at: inviteSentAt })
      .eq("id", client.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      inviteSentAt,
      actionLink:
        isLocalInviteFallback && hashedToken && verificationType
          ? `${origin}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=${encodeURIComponent(verificationType)}&next=${encodeURIComponent("/setup-account")}`
          : isLocalInviteFallback
            ? actionLink
            : undefined,
      delivery: isLocalInviteFallback ? "local_link" : "email",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send invite." },
      { status: 500 },
    );
  }
}
