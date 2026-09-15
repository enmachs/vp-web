import { keystoneContext } from '@/features/keystone/context';

/**
 * Shape of the ContactInfo singleton as consumed by the landing page. Kept
 * as a plain object type (not the generated Keystone type) so it can cross
 * the Server → Client Component boundary as a prop.
 */
export type ContactInfo = {
  email: string;
  phone: string;
  whatsapp: string;
  addressEs: string;
  addressEn: string;
  mapsUrl: string;
  hoursEs: string;
  hoursEn: string;
};

const CONTACT_INFO_QUERY =
  'email phone whatsapp addressEs addressEn mapsUrl hoursEs hoursEn';

/**
 * Reads the ContactInfo singleton through the in-process Keystone context —
 * no HTTP round trip to /api/graphql. Server-only: `keystoneContext` pulls in
 * Prisma, so this must not be imported from a 'use client' module.
 *
 * Resolves to `null` in two cases callers must tolerate:
 * - the singleton has not been seeded (features/keystone/seed.ts) —
 *   `create: denyAll` means it can never be created through the dashboard;
 * - the database is unreachable. `/` is prerendered at build time, and
 *   VERCEL-DEPLOYMENT-NOTES.md relies on `next build` not needing a DB, so a
 *   read failure degrades to an empty contact column rather than failing the
 *   build or 500-ing the whole landing page. ISR re-reads on the next
 *   revalidation (see `revalidate` in app/page.tsx).
 */
export async function getContactInfo(): Promise<ContactInfo | null> {
  try {
    // Singleton lists take no `where` — same call the seed uses.
    const row = (await keystoneContext.query.ContactInfo.findOne({
      query: CONTACT_INFO_QUERY,
    })) as ContactInfo | null;
    if (!row) return null;
    // Keystone returns null-prototype objects; React refuses to pass those to
    // Client Components ("Only plain objects ... can be passed"), so copy the
    // fields into a plain literal.
    return {
      email: row.email,
      phone: row.phone,
      whatsapp: row.whatsapp,
      addressEs: row.addressEs,
      addressEn: row.addressEn,
      mapsUrl: row.mapsUrl,
      hoursEs: row.hoursEs,
      hoursEn: row.hoursEn,
    };
  } catch (err) {
    console.error('[landing] ContactInfo read failed; rendering without it', err);
    return null;
  }
}
