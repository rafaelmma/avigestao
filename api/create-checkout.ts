import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth || typeof auth !== 'string') {
      return res.status(401).json({ error: 'Missing auth token' });
    }

    const token = auth.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { priceId } = req.body;
    if (!priceId) {
      return res.status(400).json({ error: 'Missing priceId' });
    }

    // Create customer with server-verified user id in metadata
    const customer = await stripe.customers.create({
      metadata: { userId: userData.user.id },
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/settings?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/settings?canceled=true`,
      metadata: { userId: userData.user.id },
    });

    return res.status(200).json({ url: session.url, customerId: customer.id });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
