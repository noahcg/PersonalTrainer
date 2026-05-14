# Payment System Guide

This document explains how payments could be added to the Nick Glushien Training app if the trainer ever wants clients to pay online.

It is written for someone who has never built ecommerce or online payments before. It also gives Codex enough structure to help implement the feature later.

This is a planning guide only. It does not mean payments should be implemented immediately.

## The Short Version

Do not build a custom payment system from scratch.

Use a payment provider, most likely `Stripe`, and let Stripe handle the sensitive parts:

- collecting card or bank details
- securely storing payment methods
- processing charges
- sending receipts and invoices
- managing failed payments
- letting clients update payment information
- keeping the app away from raw card data

The app should only store payment status and references to Stripe records, not card numbers.

Recommended first version:

1. The trainer creates or assigns a package in this app.
2. The app creates a Stripe Checkout Session for that package.
3. The client is sent to a Stripe-hosted payment page.
4. Stripe collects payment.
5. Stripe sends the app a webhook event after payment succeeds or fails.
6. The app updates the client's package/payment status.
7. The client can access the correct portal features based on the package and payment rules.

This is not a full ecommerce store. It is online payment collection for training services.

## Important Terms

### Payment Provider

A company that securely processes payments. For this app, Stripe is the recommended default.

Alternatives exist, but Stripe is widely used, well documented, and has hosted payment pages that reduce the amount of custom payment code needed.

### Stripe Checkout

Stripe Checkout is a prebuilt payment page hosted by Stripe. The client leaves this app briefly, pays on Stripe's secure page, and then returns to this app.

This is the safest and simplest first implementation because this app does not directly collect card details.

Stripe docs:

- `https://docs.stripe.com/payments/checkout`
- `https://docs.stripe.com/payments/checkout/how-checkout-works`

### Checkout Session

A temporary Stripe object that represents one attempt to pay.

Example:

- Client is buying a 12-session training package.
- The app asks Stripe to create a Checkout Session for that package.
- Stripe returns a URL.
- The app redirects the client to that URL.

### Webhook

A webhook is how Stripe tells this app that something happened.

The redirect back to the app is not enough. A client might close the browser after paying, or a payment method might finish later. The app should trust Stripe webhook events as the source of truth.

Important events include:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Stripe webhook docs:

- `https://docs.stripe.com/webhooks`

### Stripe Customer

A Stripe record for the paying person.

In this app, a client can have a linked Stripe customer ID. The app should store the Stripe customer ID on a local billing table, not in random text fields.

### Product And Price

In Stripe:

- `Product` is what is being sold, such as "12 Session Package".
- `Price` is how much it costs, such as `$1,200 USD one time`.

Stripe Price IDs are usually used when creating Checkout Sessions.

### Customer Portal

Stripe's hosted Customer Portal lets clients manage billing without this app building all of those screens.

Depending on configuration, clients can:

- update payment methods
- view invoices
- download receipts
- manage subscriptions
- cancel subscriptions, if enabled

Stripe Customer Portal docs:

- `https://docs.stripe.com/customer-management`
- `https://docs.stripe.com/billing/subscriptions/integrating-customer-portal`

## Payment Models That Could Fit This App

There are several possible ways the trainer could charge clients. The right choice depends on how the business actually works.

### Option 1: One-Time Package Payments

Client pays once for a package.

Examples:

- `$600` for 6 sessions
- `$1,100` for 12 sessions
- `$1,800` for 20 sessions

This is probably the best first version if the trainer already sells session packages.

How it works:

1. Trainer assigns a package to a client.
2. App creates a Checkout Session with `mode=payment`.
3. Client pays once.
4. Webhook marks the package as paid.
5. Session usage is tracked inside the app as it already is or as future package logic requires.

Pros:

- simpler than subscriptions
- matches package-based training
- easier to explain to clients
- fewer ongoing billing edge cases

Cons:

- does not automatically renew
- trainer may need to remind clients to buy another package

### Option 2: Recurring Subscriptions

Client pays on a recurring schedule.

Examples:

- `$300/month` for programming access
- `$500/month` for coaching
- `$900/month` for hybrid training

How it works:

1. Trainer assigns a subscription plan.
2. App creates a Checkout Session with `mode=subscription`.
3. Client pays and starts a Stripe subscription.
4. Stripe bills automatically each period.
5. Webhooks keep this app updated about active, past-due, canceled, and unpaid states.

Pros:

- good for predictable monthly revenue
- Stripe can handle renewals, invoices, and failed payment retries
- Customer Portal can let clients update cards

Cons:

- more business rules are needed
- failed payments need clear handling
- cancellations and access changes must be defined
- package session counts may not map cleanly to monthly billing

### Option 3: Trainer-Sent Invoices

Trainer sends invoices through Stripe, and the app only records status.

How it works:

1. Trainer creates or triggers an invoice.
2. Stripe emails the invoice to the client.
3. Client pays through Stripe.
4. Webhook updates this app.

Pros:

- familiar for service businesses
- good for custom amounts
- less need for client-facing purchase flows inside the app

Cons:

- less automated than Checkout
- trainer may still manage more billing manually

### Option 4: Keep Payments Outside The App

Trainer keeps using Venmo, Zelle, cash, check, external invoices, or another payment process.

The app only tracks:

- package status
- session count
- billing notes
- paid/unpaid manually

Pros:

- lowest build cost
- simplest technically
- no payment compliance work inside the app

Cons:

- less automated
- harder to reconcile payments
- clients do not get a polished in-app payment experience

## Recommended Path

For this app, the safest path is:

1. Start with manual/offline payment tracking if the trainer is not ready for online payments.
2. Add Stripe Checkout for one-time package payments.
3. Add Stripe Customer Portal so clients can view invoices and manage payment methods.
4. Add subscriptions only if the trainer's business model truly needs recurring billing.

Do not start with a fully custom checkout form. Do not store card data. Do not build a mini bank inside the app.

## What The App Would Need

The current app already has training packages with fields like price, currency, billing terms, package members, and session counts. A payment system should build on those concepts instead of inventing a separate store.

### Environment Variables

Add these only when payment implementation begins:

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_CURRENCY=usd
```

Optional later:

```env
STRIPE_CUSTOMER_PORTAL_RETURN_URL=
STRIPE_CHECKOUT_SUCCESS_URL=
STRIPE_CHECKOUT_CANCEL_URL=
```

The secret key and webhook secret must only be used server-side.

### Stripe Account Setup

Before coding:

- create a Stripe account
- complete business verification
- connect the trainer's bank account
- configure business name and branding
- decide whether Stripe should send receipts
- configure tax behavior if needed
- create test products/prices in Stripe test mode
- keep live mode disabled until test mode works end to end

### Database Additions

The app should add payment-specific tables instead of stuffing everything into package notes.

Possible tables:

- `billing_customers`
- `billing_checkout_sessions`
- `billing_payments`
- `billing_subscriptions`
- `billing_events`

The exact schema should be designed when implementation starts, but the purpose is:

- connect local clients to Stripe customers
- connect local packages to Stripe payments or subscriptions
- record payment state
- record webhook events so duplicate events are safe
- make support and debugging possible

For a single-trainer app, this does not need multi-tenant billing complexity. It only needs strong client-level linking and security.

### Server Routes

The app would likely need these API routes:

- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/billing/webhook`

Possible behavior:

- `/api/billing/checkout` creates a Stripe Checkout Session for an authenticated client or for a trainer-created client payment request.
- `/api/billing/portal` creates a Stripe Customer Portal session for an authenticated client.
- `/api/billing/webhook` receives Stripe events and updates local payment records.

The webhook route is high-risk and must verify Stripe signatures.

### Client-Facing Screens

Possible client portal additions:

- current package payment status
- `Pay now` button
- payment success page
- payment canceled page
- billing history
- link to Stripe Customer Portal

Keep the client experience simple:

- show what they owe
- show what package they are paying for
- send them to Stripe
- show whether payment is complete

### Trainer-Facing Screens

Possible trainer workspace additions:

- payment status on client profiles
- payment status on package records
- button to create/send payment link
- paid/unpaid/past-due filters
- basic payment history
- failed payment warnings
- manual override note for offline payments

For the trainer, the most useful first view is probably:

- which clients are paid
- which clients are unpaid
- which packages are active
- which payments failed

## How A One-Time Package Payment Would Work

This is the recommended first online payment flow.

1. Trainer creates a package type, such as "12 Session Package".
2. Trainer assigns that package to a client.
3. The package is created locally with a payment state such as `payment_pending`.
4. App creates or reuses a Stripe Customer for that client.
5. App creates a Stripe Checkout Session:
   - mode: `payment`
   - line item: package price
   - metadata: local client ID and package ID
   - success URL: app payment success page
   - cancel URL: app payment canceled page
6. Client pays on Stripe Checkout.
7. Stripe sends `checkout.session.completed`.
8. App verifies the webhook signature.
9. App records the payment as paid.
10. App marks the package as paid or active.
11. Client sees the package as available in the portal.
12. Trainer sees the payment as complete.

Important rule:

Do not activate paid access only because the client landed on the success page. Activate paid access from the Stripe webhook.

## How A Subscription Would Work

Use this only if the trainer wants recurring monthly charges.

1. Trainer defines subscription-style offerings.
2. App maps those offerings to Stripe recurring Prices.
3. Client starts Checkout with `mode=subscription`.
4. Stripe creates a Subscription.
5. Webhooks update local subscription status.
6. App uses local status to decide what the client can access.

Subscription statuses need product decisions:

- `trialing`: can client access everything?
- `active`: normal access
- `past_due`: warning only, or restrict access?
- `canceled`: remove access immediately or at period end?
- `unpaid`: block portal access or let trainer decide?

Do not implement subscriptions until these rules are written down.

## Access Control Rules

Payments and portal access are separate decisions.

The app should not blindly block a client from everything just because a payment failed. The trainer may want manual control.

Recommended first rules:

- A client account can always log in.
- The app can show a limited state if the package is unpaid or inactive.
- The trainer can manually override access when needed.
- Payment status should be visible, but not the only source of client status.
- Offline payment should be allowed as a manual status if the trainer accepts non-card payments.

Possible access states:

- `active`
- `payment_pending`
- `past_due`
- `paused`
- `completed`
- `manual_override`

## Security And Compliance

Do not store:

- card numbers
- card CVC codes
- full bank account numbers
- raw payment method details

Do store:

- Stripe customer ID
- Stripe checkout session ID
- Stripe payment intent ID
- Stripe subscription ID, if subscriptions are used
- payment amount
- currency
- status
- local client ID
- local package ID
- timestamps

The app should rely on Stripe-hosted Checkout and Customer Portal to reduce payment compliance scope.

This does not remove all responsibility. The app still needs:

- secure server routes
- webhook signature verification
- careful environment variable handling
- HTTPS in production
- clear privacy policy and terms
- a plan for refunds and disputes
- tax/accounting guidance from a qualified professional

This document is technical planning, not legal, tax, or accounting advice.

## Refunds And Disputes

Payments are not complete as a product feature until refund and dispute behavior is clear.

Decisions needed:

- Can clients request refunds through the app?
- Does the trainer handle refunds manually in Stripe?
- Should refunded packages be paused, canceled, or manually reviewed?
- What happens to used sessions if a package is refunded?
- How are chargebacks/disputes surfaced to the trainer?

Recommended first version:

- handle refunds manually in Stripe
- record refund webhook events in the app
- show refunded/disputed status to the trainer
- let the trainer decide package access manually

## Stripe Connect Is Probably Not Needed

Stripe Connect is for platforms that route money to multiple sellers or service providers.

This app is for one trainer business. The trainer is the merchant. Clients pay the trainer.

That means the app probably does not need Stripe Connect.

Use a normal Stripe account unless the business model changes.

## Implementation Phases

### Phase 1: Decide Business Rules

- [ ] Decide whether payments are one-time packages, subscriptions, invoices, or offline only.
- [ ] Decide whether clients can pay before account setup, after account setup, or both.
- [ ] Decide what unpaid clients can see.
- [ ] Decide refund policy.
- [ ] Decide whether offline payments need manual recording.
- [ ] Decide who receives payment receipts and failed payment emails.

### Phase 2: Stripe Test Setup

- [ ] Create Stripe test account setup.
- [ ] Create test products and prices.
- [ ] Configure business branding.
- [ ] Configure receipt behavior.
- [ ] Configure Customer Portal in test mode.
- [ ] Add local development environment variables.
- [ ] Install Stripe SDK only when implementation begins.

### Phase 3: Database And API Foundation

- [ ] Add billing tables for customers, sessions, payments, subscriptions, and webhook events.
- [ ] Add RLS policies for client-visible billing data.
- [ ] Add server helper for Stripe client initialization.
- [ ] Add Checkout Session creation route.
- [ ] Add Customer Portal route.
- [ ] Add Stripe webhook route with signature verification.
- [ ] Make webhook processing idempotent so duplicate Stripe events are safe.

### Phase 4: One-Time Package Payments

- [ ] Connect package assignment to payment state.
- [ ] Add `Pay now` action for clients.
- [ ] Add trainer action to create or resend payment link.
- [ ] Update package/payment state from webhooks.
- [ ] Add payment success and cancellation pages.
- [ ] Show payment status in trainer package/client views.
- [ ] Show payment status in client portal.

### Phase 5: Billing Management

- [ ] Add Stripe Customer Portal link for clients.
- [ ] Show basic invoice/payment history.
- [ ] Support manual paid/offline override if needed.
- [ ] Add trainer filters for unpaid, paid, failed, refunded, and disputed payments.
- [ ] Add support notes for payment troubleshooting.

### Phase 6: Subscription Support, Only If Needed

- [ ] Add subscription products and recurring prices.
- [ ] Add subscription status tracking.
- [ ] Add past-due and canceled access rules.
- [ ] Add Customer Portal subscription management.
- [ ] Add webhook handling for subscription lifecycle events.
- [ ] Test failed payment and cancellation scenarios.

### Phase 7: Production Launch

- [ ] Switch from Stripe test keys to live keys in Vercel only.
- [ ] Configure live webhook endpoint.
- [ ] Make a real low-dollar test payment.
- [ ] Confirm webhook updates the app.
- [ ] Confirm receipts/invoices are correct.
- [ ] Confirm trainer bank payout settings.
- [ ] Confirm refund process.
- [ ] Update privacy policy and terms.
- [ ] Add payment workflow checks to the launch checklist.

## Testing Scenarios

Before going live, test:

- successful card payment
- canceled Checkout Session
- failed card payment
- duplicate webhook delivery
- client closes browser after paying
- client pays from mobile
- trainer resends payment link
- client pays after invite setup
- client pays before invite setup, if allowed
- manual offline payment override
- refund issued in Stripe
- disputed payment, if Stripe test tools support the scenario
- subscription renewal, if subscriptions are implemented
- subscription cancellation, if subscriptions are implemented
- past-due subscription, if subscriptions are implemented

## Recommended First Build

If the trainer wanted this built, the first real implementation should be:

- Stripe Checkout for one-time package payments
- Stripe Customer records linked to local clients
- payment status linked to local training packages
- Stripe webhook route with signature verification
- trainer-visible payment status
- client-visible `Pay now` flow
- Stripe Customer Portal link for billing self-service
- manual override for offline payment

Do not start with:

- custom card forms
- Stripe Connect
- subscriptions
- complex tax handling
- automatic hard lockouts for failed payment
- refund automation

Those can come later if the business process proves they are needed.

## Source References

These official Stripe docs should be reviewed again immediately before implementation because payment APIs and recommendations can change:

- Stripe Checkout: `https://docs.stripe.com/payments/checkout`
- How Checkout works: `https://docs.stripe.com/payments/checkout/how-checkout-works`
- Accept a payment: `https://docs.stripe.com/payments/accept-a-payment`
- Webhooks: `https://docs.stripe.com/webhooks`
- Customer Portal: `https://docs.stripe.com/customer-management`
- Subscription Customer Portal: `https://docs.stripe.com/billing/subscriptions/integrating-customer-portal`

