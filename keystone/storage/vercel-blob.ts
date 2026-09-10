import { del, put } from '@vercel/blob';
import type { BaseKeystoneTypeInfo, StorageStrategy } from '@keystone-6/core/types';

/**
 * Env is read lazily on every call. This module is reachable from the Next.js
 * app (which only ever calls `url()`), where BLOB_READ_WRITE_TOKEN is absent by
 * design — reading it at module scope would break the site at import time.
 */
const readWriteToken = () => process.env.BLOB_READ_WRITE_TOKEN;
const baseUrl = () => (process.env.BLOB_BASE_URL ?? '').replace(/\/+$/, '');

/**
 * A Keystone storage strategy backed by Vercel Blob.
 *
 * `url(key)` receives only the key — it never sees what `put()` returned — so
 * the pathname must be reconstructible from the key alone. That is why
 * `addRandomSuffix` is false; Keystone's image() already generates a random id.
 */
export function vercelBlob<TypeInfo extends BaseKeystoneTypeInfo>(
  prefix: string,
): StorageStrategy<TypeInfo> {
  const pathnameFor = (key: string) => `${prefix}/${key}`;

  return {
    async put(key, stream, meta) {
      await put(pathnameFor(key), stream, {
        access: 'public',
        contentType: meta.contentType,
        token: readWriteToken(),
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    },

    async delete(key) {
      await del(pathnameFor(key), { token: readWriteToken() });
    },

    url(key) {
      return `${baseUrl()}/${pathnameFor(key)}`;
    },
  };
}
