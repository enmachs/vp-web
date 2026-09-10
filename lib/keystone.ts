import { getContext } from '@keystone-6/core/context';

import * as PrismaModule from '@/generated/prisma/client';
import keystoneConfig from '@/keystone/config.base';
import type { Context } from '@/generated/keystone/types';

/**
 * A single Keystone context for the whole Next.js process.
 *
 * Deliberately a function, not a module-scope const: `getContext()` constructs a
 * PrismaClient eagerly, and Next evaluates module scope while collecting page
 * data during `next build`. Exporting a const therefore made a missing
 * DATABASE_URL a *build* failure rather than a request failure. Constructing on
 * first call keeps the site buildable before the database exists.
 *
 * The globalThis cache matters because Fluid Compute reuses function instances
 * and dev HMR re-evaluates modules; without it each reload would open another
 * pool and exhaust the database's connection limit.
 *
 * Note this context has no session, so it is evaluated as an anonymous user and
 * list access control genuinely applies. Do not call `.sudo()` here — letting
 * access control bite is what stops an accidental User query from returning
 * password hashes.
 */
const globalForKeystone = globalThis as unknown as {
  __keystoneContext?: Context;
};

export function getKeystoneContext(): Context {
  globalForKeystone.__keystoneContext ??= getContext(keystoneConfig, PrismaModule);
  return globalForKeystone.__keystoneContext;
}
