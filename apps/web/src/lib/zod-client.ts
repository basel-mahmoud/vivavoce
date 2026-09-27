import { config } from 'zod/mini';

/**
 * Zod for code that runs in the browser. The site's Content-Security-Policy forbids eval, and
 * zod's fast path probes for it with `new Function`, which the browser reports as a policy
 * violation even though zod catches the error. `jitless` skips the probe; it has to be set before
 * any schema is built, so browser code imports zod from here (`import * as z from '@/lib/zod-client'`).
 * The mini build, exported function by function, keeps only what the page uses in its bundle
 * (re-exporting mini's whole namespace pulled in every locale and schema, about 250 KB).
 */
config({ jitless: true });

export { array, enum, literal, maximum, minimum, number, object, string } from 'zod/mini';
