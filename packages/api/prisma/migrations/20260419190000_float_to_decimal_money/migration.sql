-- Float → Decimal(10, 2) for money fields.
-- Binary floats (f64) lose cents in multi-step arithmetic (revenue split, fee
-- calc, aggregate SUMs). Postgres NUMERIC(10,2) gives us 99,999,999.99 upper
-- bound — plenty for course prices in VND/USD — with exact decimal semantics.

ALTER TABLE "Course"
    ALTER COLUMN "price" TYPE DECIMAL(10, 2) USING "price"::numeric(10, 2);

ALTER TABLE "Payment"
    ALTER COLUMN "amount" TYPE DECIMAL(10, 2) USING "amount"::numeric(10, 2);

ALTER TABLE "RevenueLedger"
    ALTER COLUMN "grossAmount"  TYPE DECIMAL(10, 2) USING "grossAmount"::numeric(10, 2),
    ALTER COLUMN "platformFee"  TYPE DECIMAL(10, 2) USING "platformFee"::numeric(10, 2),
    ALTER COLUMN "teacherShare" TYPE DECIMAL(10, 2) USING "teacherShare"::numeric(10, 2);
