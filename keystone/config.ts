import { config } from '@keystone-6/core';
import type { KeystoneContext } from '@keystone-6/core/types';

import type { TypeInfo } from '../generated/keystone/types';
import { session, withAuth } from './auth';
import { db } from './db';
import { lists } from './schema';

/**
 * Seeds the initial admin user and the ContactInfo singleton row.
 *
 * This replaces `initFirstItem`, removed in @keystone-6/auth v10 — without it a
 * fresh database gives you a sign-in page you cannot get past. It lives here and
 * not in config.base.ts so it can never run from a Vercel function, and the user
 * seed is additionally inert unless SEED_ADMIN_* are set.
 */
async function onConnect(context: KeystoneContext<TypeInfo>) {
  const sudo = context.sudo();

  // The ContactInfo singleton denies `create` through the API, so the single row
  // has to be brought into existence here.
  if ((await sudo.db.ContactInfo.count({})) === 0) {
    await sudo.db.ContactInfo.createOne({ data: {} });
    console.log('[keystone] created ContactInfo singleton');
  }

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return;
  if ((await sudo.db.User.count({})) > 0) return;

  await sudo.db.User.createOne({ data: { name: 'Admin', email, password } });
  console.log(`[keystone] seeded initial admin user: ${email}`);
}

export default withAuth(
  config<TypeInfo>({
    db: { ...db, onConnect },
    lists,
    session,
    // next dev owns 3000; the container platform injects its own PORT.
    server: { port: Number(process.env.PORT ?? 3001) },
    ui: {
      isAccessAllowed: ({ session }) => Boolean(session?.itemId),
    },
  }),
);
