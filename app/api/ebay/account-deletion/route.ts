import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const challengeCode = searchParams.get("challenge_code");

  if (!challengeCode) {
    return new Response("Missing challenge_code", { status: 400 });
  }

  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN!;
  const endpoint = `https://${req.headers.get("host")}/api/ebay/account-deletion`;

  const hash = crypto
    .createHash("sha256")
    .update(challengeCode + verificationToken + endpoint, "utf8")
    .digest("base64");

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "no-store");

  return new Response(
    JSON.stringify({ challengeResponse: hash }),
    { status: 200, headers }
  );
}

export async function POST() {
  return new Response(null, { status: 200 });
}
