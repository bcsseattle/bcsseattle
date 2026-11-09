import os
import stripe
from datetime import datetime, timezone


stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

# Timestamp for August 18, 2025, 00:00:00 PDT converted to UTC timestamp
# PDT is UTC-7 in August, so add 7 hours
AUG_18_2025_ANCHOR = 1755668400  # 2025-08-18 07:00:00 UTC

def next_billing_anchor(current_period_end):
    # If subscription period ends before Aug 18, align to Aug 18, else keep current period end
    if current_period_end < AUG_18_2025_ANCHOR:
        return AUG_18_2025_ANCHOR
    return current_period_end

# List of subscription IDs to update
subscription_ids = [
    "sub_1RcGDHFMlzXQHtL1jq73RJDi",
    # Add more subscription IDs here...
]

for sub_id in subscription_ids:
    try:
        # Retrieve subscription
        sub = stripe.Subscription.retrieve(sub_id)

        # Access subscription item and current_period_end inside the item
        item = sub['items']['data'][0]
        current_period_end = item.get('current_period_end')

        if current_period_end is None:
            print(f"⚠️ Subscription {sub_id} has no current_period_end, skipping.")
            continue

        # Calculate target billing cycle anchor
        target_anchor = next_billing_anchor(current_period_end)

        # Prepare item details for update (must include id, price, quantity)
        item_id = item['id']
        price_id = item['price']['id']
        quantity = item.get('quantity', 1) or 1

        # Update subscription with new billing cycle anchor and same items (to satisfy Stripe)
        updated = stripe.Subscription.modify(
            sub_id,
            items=[{
                "id": item_id,
                "price": price_id,
                "quantity": quantity,
            }],
            billing_cycle_anchor=target_anchor,
            proration_behavior="none"
        )

        print(f"✅ Updated subscription {sub_id} billing cycle anchor to {datetime.utcfromtimestamp(target_anchor)} UTC")

    except Exception as e:
        print(f"❌ Failed updating subscription {sub_id}: {e}")