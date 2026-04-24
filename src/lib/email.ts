export function hasInviteEmailEnv() {
  return Boolean(process.env.RESEND_API_KEY && process.env.INVITE_FROM_EMAIL);
}

export async function sendInviteEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITE_FROM_EMAIL;
  const replyTo = process.env.INVITE_REPLY_TO_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Custom invite email is not configured. Add RESEND_API_KEY and INVITE_FROM_EMAIL.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
      reply_to: replyTo ? [replyTo] : undefined,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Unable to send invite email.");
  }
}
