export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    const protocol = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
    return parsed.host.toLowerCase() === host.toLowerCase() && parsed.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}
