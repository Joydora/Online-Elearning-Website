-- Stripe delivers webhooks at-least-once. A dropped ACK re-fires the
-- event, which without dedup would re-enroll the student and re-book
-- a RevenueLedger row. The handler inserts into this table first and
-- short-circuits on P2002.

CREATE TABLE "StripeWebhookEvent" (
    "id"          VARCHAR(100) PRIMARY KEY,
    "type"        VARCHAR(100) NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
