import * as z from 'zod/mini';

/**
 * Zod for code that runs in the browser. The site's Content-Security-Policy forbids eval, and
 * zod's fast path probes for it with `new Function`, which the browser reports as a policy
 * violation even though zod catches the error. `jitless` skips the probe; it has to be set before
 * any schema is built, so browser code imports zod from here. The mini build keeps the page's
 * bundle small.
 */
z.config({ jitless: true });

export { z };
