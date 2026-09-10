/**
 * Seeds reference data for local development. Idempotent — safe to re-run.
 *
 * Run with: npm run db:seed
 *
 * Only the ServiceType taxonomy is seeded, because everything else relates to it
 * and the keys must match the category values the current frontend already uses
 * (components/Gallery.tsx filters on 'trips' | 'pkg' | 'clients').
 *
 * Uses sudo() because seeding runs unauthenticated; the site's read path
 * deliberately does not.
 */
import { getContext } from '@keystone-6/core/context';

import * as PrismaModule from '../generated/prisma/client';
import config from './config.base';

const SERVICE_TYPES = [
  { key: 'trips', kind: 'service', nameEs: 'Viajes', nameEn: 'Trips', sortOrder: 1 },
  { key: 'pkg', kind: 'service', nameEs: 'Encomiendas', nameEn: 'Parcels', sortOrder: 2 },
  { key: 'clients', kind: 'showcase', nameEs: 'Clientes', nameEn: 'Clients', sortOrder: 3 },
  // `as const` keeps `kind` as the literal union the generated
  // ServiceTypeKindType expects, rather than widening it to string.
] as const;

async function main() {
  const context = getContext(config, PrismaModule).sudo();

  for (const serviceType of SERVICE_TYPES) {
    const existing = await context.query.ServiceType.findOne({
      where: { key: serviceType.key },
      query: 'id',
    });

    if (existing) {
      console.log(`[seed] ServiceType "${serviceType.key}" already exists — skipping`);
      continue;
    }

    await context.query.ServiceType.createOne({ data: serviceType, query: 'id key' });
    console.log(`[seed] created ServiceType "${serviceType.key}"`);
  }

  await context.prisma.$disconnect();
}

main().catch((error) => {
  console.error('[seed] failed:', error);
  process.exit(1);
});
