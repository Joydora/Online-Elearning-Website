import { NextFunction, Request, Response } from 'express';

// Last-resort error handler. Controllers that still throw (or new code
// that forgets try/catch) hit this instead of leaking stack traces
// through the default Express HTML error page or detailed JSON
// responses from controllers that do `(error as Error).message`.
//
// We log the full error server-side (stack + request path) but return
// a generic message to the client so DB schema names, table errors, or
// internal assertion messages don't get exposed.
export function errorHandler(
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
): void {
    // eslint-disable-next-line no-console
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);

    if (res.headersSent) {
        // If the response has already started streaming, Express will
        // just close the socket. Nothing useful we can add here.
        return;
    }

    res.status(500).json({ error: 'Internal server error' });
}
