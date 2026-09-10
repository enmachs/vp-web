import { createAuth } from '@keystone-6/auth';
import { statelessSessions } from '@keystone-6/core/session';

const sessionSecret = process.env.SESSION_SECRET;

if (process.env.NODE_ENV === 'production' && !sessionSecret) {
  throw new Error('SESSION_SECRET is required in production (32+ characters)');
}

export const { withAuth } = createAuth({
  listKey: 'User',
  identityField: 'email',
  secretField: 'password',
  sessionData: 'id name email',
  // NOTE: `initFirstItem` was removed in @keystone-6/auth v10 — there is no
  // /init bootstrap page. The first user is seeded in `db.onConnect`
  // (see keystone/config.ts).
});

export const session = statelessSessions({
  secret: sessionSecret ?? 'dev-only-insecure-secret-at-least-32-chars',
  maxAge: 60 * 60 * 24 * 30,
  sameSite: 'lax',
});
