import crypto from "crypto";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const challengeCode = url.searchParams.get("challenge_code");

  if (!challengeCode) {
    return new Response(
      JSON.stringify({ error: "Missing challenge_code parameter" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN!;
  const host = req.headers.get("host");
  const endpoint = `https://${host}/api/ebay/account-deletion`;

  const hash = crypto
    .createHash("sha256")
    .update(challengeCode + verificationToken + endpoint)
    .digest("base64");

  return new Response(
    JSON.stringify({ challengeResponse: hash }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}

export async function POST() {
  return new Response(null, { status: 200 });
}
