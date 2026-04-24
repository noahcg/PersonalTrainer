import { brand } from "@/lib/brand";

export function defaultInviteSubject(clientName?: string) {
  if (clientName) {
    return `${clientName}, your coaching account is ready`;
  }

  return `Your ${brand.businessName} account is ready`;
}

export function defaultInviteMessage(clientName?: string) {
  const greeting = clientName ? `Hi ${clientName},` : "Hi there,";

  return [
    greeting,
    "",
    `Your coaching account for ${brand.businessName} is ready.`,
    "Use the button below to set your password and access the app.",
    "",
    "Once you're in, you'll be able to view your plan, message your trainer, and complete weekly check-ins.",
    "",
    "See you inside,",
    brand.coachName,
  ].join("\n");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderInviteEmailHtml({
  subject,
  message,
  actionLink,
}: {
  subject: string;
  message: string;
  actionLink: string;
}) {
  const messageHtml = escapeHtml(message)
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 16px; line-height:1.7; color:#44403c;">${paragraph.replaceAll("\n", "<br />")}</p>`)
    .join("");

  return `
    <div style="background:#f5f1ea; padding:32px 16px; font-family:Georgia, 'Times New Roman', serif;">
      <div style="max-width:620px; margin:0 auto; background:#fffdf8; border:1px solid #e7dfd2; border-radius:28px; overflow:hidden;">
        <div style="background:#151313; color:#f7f3ec; padding:28px 32px;">
          <div style="font-size:12px; letter-spacing:0.32em; text-transform:uppercase; color:#c58c4a;">${escapeHtml(brand.businessName)}</div>
          <h1 style="margin:16px 0 0; font-size:34px; line-height:1.15; font-weight:600;">${escapeHtml(subject)}</h1>
        </div>
        <div style="padding:32px;">
          ${messageHtml}
          <div style="margin:28px 0 20px;">
            <a href="${actionLink}" style="display:inline-block; background:#c58c4a; color:#ffffff; text-decoration:none; padding:14px 22px; border-radius:999px; font-weight:600;">
              Set up your account
            </a>
          </div>
          <p style="margin:0; line-height:1.7; color:#78716c;">If the button doesn’t open, use this link:</p>
          <p style="margin:8px 0 0; line-height:1.6; word-break:break-all;">
            <a href="${actionLink}" style="color:#8a5b26;">${actionLink}</a>
          </p>
        </div>
      </div>
    </div>
  `;
}

export function renderInviteEmailText({
  message,
  actionLink,
}: {
  message: string;
  actionLink: string;
}) {
  return `${message}\n\nSet up your account:\n${actionLink}`;
}
