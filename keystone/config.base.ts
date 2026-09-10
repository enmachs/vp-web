import { config } from '@keystone-6/core';

import type { TypeInfo } from '../generated/keystone/types';
import { db } from './db';
import { lists } from './schema';

/**
 * The auth-free Keystone config.
 *
 * This is what the Next.js app imports and hands to `getContext()`. Keeping
 * @keystone-6/auth (and through it Express and the pages-router Admin UI) out of
 * this module is what stops the serverless bundle from dragging the entire admin
 * stack into the marketing site.
 *
 * The Admin UI is disabled here; `keystone/config.ts` is the entrypoint that
 * turns it on for the CLI and the admin container.
 */
export default config<TypeInfo>({
  db,
  lists,
  ui: { isDisabled: true },
});
