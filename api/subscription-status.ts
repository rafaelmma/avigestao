import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user_id)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({
          status: "none",
          isActive: false,
          isCanceled: true,
          isTrial: false,
        }),
        { status: 200 }
      );
    }

    const now = new Date();
    const periodEnd = data.current_period_end
      ? new Date(data.current_period_end)
      : null;

    const isActive =
      data.status === "active" ||
      (data.status === "trialing" &&
        periodEnd !== null &&
        periodEnd > now);

    return new Response(
      JSON.stringify({
        status: data.status,
        current_period_end: data.current_period_end,
        isActive,
        isCanceled: data.status === "canceled",
        isTrial: data.status === "trialing",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Subscription status error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
