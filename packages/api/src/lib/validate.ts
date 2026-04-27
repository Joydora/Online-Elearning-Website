// Cheap input validators. Deliberately small — good enough to catch
// obvious garbage before it hits the DB (trim, type, length, format),
// not a full schema library. Callers return the first error; the
// frontend surfaces it as-is.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Usernames: letters/digits/underscore/hyphen/dot, 3–32.
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;

export function validateEmail(raw: unknown): string | null {
    if (typeof raw !== 'string') return 'email must be a string';
    const v = raw.trim();
    if (v.length === 0) return 'email is required';
    if (v.length > 320) return 'email is too long';
    if (!EMAIL_RE.test(v)) return 'email is not a valid address';
    return null;
}

export function validateUsername(raw: unknown): string | null {
    if (typeof raw !== 'string') return 'username must be a string';
    const v = raw.trim();
    if (v.length < 3) return 'username must be at least 3 characters';
    if (v.length > 32) return 'username must be at most 32 characters';
    if (!USERNAME_RE.test(v)) return 'username may contain letters, digits, . _ - only';
    return null;
}

export function validatePassword(raw: unknown): string | null {
    if (typeof raw !== 'string') return 'password must be a string';
    if (raw.length < 8) return 'password must be at least 8 characters';
    if (raw.length > 200) return 'password must be at most 200 characters';
    // Require at least one letter and one digit — light bar against the
    // worst passwords without blocking passphrases.
    if (!/[A-Za-z]/.test(raw) || !/\d/.test(raw)) {
        return 'password must contain at least one letter and one digit';
    }
    return null;
}

// Pagination: callers accept limit / offset from req.query. Without a
// cap, a caller can ask for limit=100000 and blow up the response size
// (and RAM). Clamp to [1, max].
export type Pagination = { take: number; skip: number };

export function parsePagination(
    query: Record<string, unknown>,
    opts: { defaultLimit?: number; maxLimit?: number } = {},
): Pagination {
    const max = opts.maxLimit ?? 100;
    const def = Math.min(opts.defaultLimit ?? 20, max);

    const rawLimit = Number(query.limit);
    const rawOffset = Number(query.offset);

    const take =
        Number.isFinite(rawLimit) && Number.isInteger(rawLimit) && rawLimit > 0
            ? Math.min(rawLimit, max)
            : def;
    const skip =
        Number.isFinite(rawOffset) && Number.isInteger(rawOffset) && rawOffset >= 0
            ? rawOffset
            : 0;

    return { take, skip };
}
