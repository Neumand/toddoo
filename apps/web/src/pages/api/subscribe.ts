import type { APIRoute } from "astro";
import { Resend } from "resend";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const email = body.email;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return new Response(JSON.stringify({ error: "Invalid email address" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = import.meta.env.RESEND_API_KEY;

  if (!apiKey) {
    // In development or if key not set, just log
    console.log(`[Newsletter] Subscription request: ${email}`);
    return new Response(
      JSON.stringify({ message: "Subscribed (dev mode)" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const resend = new Resend(apiKey);

    // Add contact to the Resend audience
    const audienceId = import.meta.env.RESEND_AUDIENCE_ID;

    if (audienceId) {
      await resend.contacts.create({
        audienceId,
        email,
      });
    }

    return new Response(
      JSON.stringify({ message: "Subscribed successfully!" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Subscription error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to subscribe. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
