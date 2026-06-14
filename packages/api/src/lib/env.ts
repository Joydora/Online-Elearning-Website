// Fail fast at startup rather than at the first request that needs an
// env var. A missing JWT_SECRET means every login silently issues
// tokens signed with "undefined"; a missing DATABASE_URL means Prisma
// picks up the default "postgresql://..." and hangs on connect. Check
// the hard requirements here and throw before we start listening.

type EnvSpec = {
    name: string;
    required: boolean;
    validate?: (v: string) => string | null;
};

const SPECS: EnvSpec[] = [
    { name: 'DATABASE_URL', required: true },
    {
        name: 'JWT_SECRET',
        required: true,
        validate: (v) =>
            v.length < 16 ? 'must be at least 16 chars (prefer 32+ for prod)' : null,
    },
    { name: 'FRONTEND_URL', required: false },
    { name: 'FRONTEND_URLS', required: false },
    // Stripe / Ollama are optional — their code paths fall back to
    // heuristics or fail at call time with a clear message.
    { name: 'STRIPE_SECRET_KEY', required: false },
    { name: 'STRIPE_WEBHOOK_SECRET', required: false },
    { name: 'PLATFORM_FEE_PCT', required: false },
];

export function validateEnv(): void {
    const failures: string[] = [];

    for (const spec of SPECS) {
        const raw = process.env[spec.name];
        const present = raw !== undefined && raw !== '';

        if (spec.required && !present) {
            failures.push(`  - ${spec.name} is required but missing`);
            continue;
        }
        if (present && spec.validate) {
            const err = spec.validate(raw!);
            if (err) failures.push(`  - ${spec.name}: ${err}`);
        }
    }

    if (failures.length > 0) {
        throw new Error(
            `Invalid environment configuration:\n${failures.join('\n')}\n` +
                'See .env.example for the full list of settings.',
        );
    }
}
