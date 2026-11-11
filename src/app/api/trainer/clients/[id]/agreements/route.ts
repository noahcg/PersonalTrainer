import { sameOrigin } from "@/lib/agreement/origin";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { agreementTrainer } from "@/lib/agreement/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const auth = await agreementTrainer(id);
    if (!auth) return NextResponse.json({ error: "Unavailable." }, { status: 404 });
    const [packages, offers] = await Promise.all([
      auth.admin.from("training_package_members").select("training_packages!inner(id, title, kind, total_sessions, price_cents, currency, status, trainer_id)").eq("client_id", id).eq("training_packages.trainer_id", auth.trainer.id),
      auth.admin.from("client_agreement_offers").select("id, version_label, status, package_snapshot, pdf_sha256, approved_at, created_at, client_agreement_acceptances(full_name, accepted_at, method)").eq("client_id", id).eq("trainer_id", auth.trainer.id).order("created_at", { ascending: false }),
    ]);
    if (packages.error || offers.error) throw packages.error || offers.error;
    return NextResponse.json({ packages: (packages.data ?? []).flatMap((row) => Array.isArray(row.training_packages) ? row.training_packages : row.training_packages ? [row.training_packages] : []), offers: offers.data ?? [] });
  } catch { return NextResponse.json({ error: "Unable to load agreements. Check that the agreement migration is installed." }, { status: 500 }); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const { id } = await context.params;
    const auth = await agreementTrainer(id);
    if (!auth) return NextResponse.json({ error: "Unavailable." }, { status: 404 });
    const form = await request.formData();
    const file = form.get("pdf");
    const packageId = String(form.get("packageId") || "");
    const version = String(form.get("version") || "").trim();
    if (!(file instanceof File) || file.size < 5 || file.size > 5 * 1024 * 1024 || version.length < 1 || version.length > 120 || form.get("approved") !== "yes") {
      return NextResponse.json({ error: "Select a PDF under 5 MB, enter a version, and confirm your approval." }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.subarray(0, 5).toString() !== "%PDF-") return NextResponse.json({ error: "The file must be a PDF." }, { status: 400 });
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const document = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableFontFace: true }).promise;
      if (document.numPages < 1 || document.numPages > 30) throw new Error("Invalid page count");
      for (let i = 1; i <= document.numPages; i++) {
        const content = await (await document.getPage(i)).getTextContent();
        if (!content.items.some((item) => "str" in item && item.str.trim())) throw new Error("Page lacks selectable text");
      }
      await document.destroy();
    } catch {
      return NextResponse.json({ error: "Use an unencrypted PDF of at most 30 pages with selectable text on every page." }, { status: 400 });
    }
    const { data: membership, error: lookupError } = await auth.admin.from("training_package_members").select("training_packages!inner(id, title, kind, total_sessions, price_cents, currency, status, trainer_id)").eq("client_id", id).eq("training_package_id", packageId).eq("training_packages.trainer_id", auth.trainer.id).maybeSingle();
    if (lookupError) throw lookupError;
    const pkg = Array.isArray(membership?.training_packages) ? membership.training_packages[0] : membership?.training_packages;
    if (!pkg || !("status" in pkg) || !["pending", "active"].includes(String(pkg.status))) return NextResponse.json({ error: "Choose a current package belonging to this client." }, { status: 400 });
    const { error } = await auth.admin.from("client_agreement_offers").insert({ trainer_id: auth.trainer.id, client_id: id, training_package_id: packageId, approved_by: auth.user.id, version_label: version, package_snapshot: pkg, pdf_base64: bytes.toString("base64"), pdf_sha256: createHash("sha256").update(bytes).digest("hex") });
    if (error?.code === "23505") return NextResponse.json({ error: "This client already has an agreement awaiting review. Withdraw it before offering another." }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to offer agreement." }, { status: 500 }); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const { id } = await context.params;
    const auth = await agreementTrainer(id);
    if (!auth) return NextResponse.json({ error: "Unavailable." }, { status: 404 });
    const body = await request.json();
    const offerId = typeof body.offerId === "string" ? body.offerId : "";
    const { data, error } = await auth.admin.from("client_agreement_offers").update({ status: "withdrawn" }).eq("id", offerId).eq("client_id", id).eq("trainer_id", auth.trainer.id).eq("status", "offered").select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Offer is no longer available to withdraw." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to withdraw agreement." }, { status: 500 }); }
}
