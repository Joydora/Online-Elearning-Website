-- 1) Snapshot columns on RevenueLedger.
-- Historical reports must stay explainable after a course is renamed
-- or a teacher is offboarded. Backfill existing rows by joining the
-- live records; new rows get real snapshots from recordRevenue().

ALTER TABLE "RevenueLedger"
    ADD COLUMN "courseTitleSnapshot"  VARCHAR(200),
    ADD COLUMN "teacherNameSnapshot"  VARCHAR(200),
    ADD COLUMN "teacherEmailSnapshot" VARCHAR(320),
    ADD COLUMN "feePctSnapshot"       DECIMAL(5, 2);

UPDATE "RevenueLedger" rl
SET
    "courseTitleSnapshot" = LEFT(c.title, 200),
    "teacherNameSnapshot" = LEFT(
        COALESCE(NULLIF(TRIM(
            CONCAT_WS(' ', u."firstName", u."lastName")
        ), ''), u.username),
        200
    ),
    "teacherEmailSnapshot" = LEFT(u.email, 320),
    "feePctSnapshot" = 20.00
FROM "Course" c, "User" u
WHERE rl."courseId" = c.id
  AND rl."teacherId" = u.id;

ALTER TABLE "RevenueLedger"
    ALTER COLUMN "courseTitleSnapshot"  SET NOT NULL,
    ALTER COLUMN "teacherNameSnapshot"  SET NOT NULL,
    ALTER COLUMN "teacherEmailSnapshot" SET NOT NULL,
    ALTER COLUMN "feePctSnapshot"       SET NOT NULL;

-- 2) TEXT length limits on user-facing fields.
-- Prevents pathological inputs (a 4 MB "first name") from eating
-- disk and blowing up responses. Widths chosen from RFC limits or
-- generous real-world UIs:
--   email: RFC 5321 max = 320
--   username / name: 64 / 100 is plenty for human-facing usage
--   Stripe ids: Stripe currently caps at 64 chars; 100 is headroom
--   course title: 200; description: 5000 (matches the React form)

ALTER TABLE "User"
    ALTER COLUMN "email"                 TYPE VARCHAR(320),
    ALTER COLUMN "username"              TYPE VARCHAR(64),
    ALTER COLUMN "hashedPassword"        TYPE VARCHAR(100),
    ALTER COLUMN "firstName"             TYPE VARCHAR(100),
    ALTER COLUMN "lastName"              TYPE VARCHAR(100),
    ALTER COLUMN "stripeCustomerId"      TYPE VARCHAR(100),
    ALTER COLUMN "stripePaymentMethodId" TYPE VARCHAR(100);

ALTER TABLE "Category"
    ALTER COLUMN "name" TYPE VARCHAR(100);

ALTER TABLE "Course"
    ALTER COLUMN "title"       TYPE VARCHAR(200),
    ALTER COLUMN "description" TYPE VARCHAR(5000);
