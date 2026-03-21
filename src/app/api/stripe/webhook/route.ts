import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (userId && session.subscription) {
        const subResponse = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        // Extract period end from the first subscription item
        const periodEnd =
          (subResponse as unknown as Record<string, unknown>)
            .current_period_end ??
          subResponse.items?.data?.[0]?.current_period_end;
        await adminClient
          .from("subscriptions")
          .update({
            stripe_subscription_id: subResponse.id,
            stripe_customer_id: session.customer as string,
            plan: "paid",
            status: "active",
            current_period_end: periodEnd
              ? new Date((periodEnd as number) * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data
        .object as unknown as Record<string, unknown> &
        Stripe.Subscription;
      const { data } = await adminClient
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .single();

      if (data) {
        const status = subscription.status as string;
        const isActive = status === "active" || status === "trialing";
        const periodEnd =
          subscription.current_period_end ??
          subscription.items?.data?.[0]?.current_period_end;
        await adminClient
          .from("subscriptions")
          .update({
            plan: isActive ? "paid" : "free",
            status,
            current_period_end: periodEnd
              ? new Date((periodEnd as number) * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await adminClient
        .from("subscriptions")
        .update({
          plan: "free",
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data
        .object as unknown as Record<string, unknown>;
      const subId = invoice.subscription as string | undefined;
      if (subId) {
        await adminClient
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
