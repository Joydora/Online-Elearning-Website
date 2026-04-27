import { NextFunction, Request, Response } from 'express';

// SameSite=Lax on the auth cookie already blocks the classic cross-site
// form-submit CSRF vector. This middleware adds a second line: every
// state-changing request must have an Origin (or Referer) header that
// matches a trusted origin. Any mismatch 403s before the route handler
// runs.
//
// Exemptions:
//   - GET / HEAD / OPTIONS — not state-changing; CORS handles these.
//   - /api/stripe-webhook — server-to-server; no browser, no Origin.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function parseOriginFromUrl(url: string | undefined): string | null {
    if (!url) return null;
    try {
        const u = new URL(url);
        return `${u.protocol}//${u.host}`;
    } catch {
        return null;
    }
}

export function buildCsrfMiddleware(trustedOrigins: readonly string[]) {
    const allowed = new Set(trustedOrigins);
    return function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
        if (SAFE_METHODS.has(req.method)) return next();
        if (req.originalUrl === '/api/stripe-webhook') return next();

        // Browsers always set Origin on fetch/XHR, including same-origin;
        // a missing Origin header usually means curl / server-to-server,
        // which isn't a CSRF vector (no ambient cookies). Only reject
        // when an Origin IS present and doesn't match the allow-list.
        const origin = req.get('origin') ?? parseOriginFromUrl(req.get('referer') ?? undefined);
        if (origin && !allowed.has(origin)) {
            return res.status(403).json({ error: 'CSRF origin check failed' });
        }

        return next();
    };
}
