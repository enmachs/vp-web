/**
 * Seeds reference data for local development. Idempotent — safe to re-run.
 *
 * Run with: npm run db:seed
 *
 * Seeds two things:
 *
 * 1. The ServiceType taxonomy — everything else relates to it, and the keys
 *    must match the category values the landing page already uses
 *    (features/landing/components/Gallery.tsx filters on 'trips'|'pkg'|'clients').
 *
 * 2. The ContactInfo singleton row. This is not optional: ContactInfo sets
 *    `create: denyAll`, so the single row cannot be created through the API or
 *    the dashboard. Without seeding it here the list is permanently empty and
 *    `contactInfo` always resolves to null. Values match what the landing page
 *    currently hardcodes in features/landing/components/Footer.tsx.
 *
 * Uses sudo() because seeding runs unauthenticated, while the content lists
 * require canManageContent to write.
 */
import { keystoneContext } from "./context";

const SERVICE_TYPES = [
  { key: "trips", kind: "service", nameEs: "Viajes", nameEn: "Trips", sortOrder: 1 },
  { key: "pkg", kind: "service", nameEs: "Encomiendas", nameEn: "Parcels", sortOrder: 2 },
  { key: "clients", kind: "showcase", nameEs: "Clientes", nameEn: "Clients", sortOrder: 3 },
  // `as const` keeps `kind` as the literal union the generated
  // ServiceTypeKindType expects, rather than widening it to string.
] as const;

const CONTACT_INFO = {
  email: 'hola@viajerosparaguana.com',
  phone: '+58 414 000 0000',
  whatsapp: '+584140000000',
  addressEs: 'Punto Fijo, Falcón',
  addressEn: 'Punto Fijo, Falcón',
  hoursEs: 'Lunes a sábado, 7:00 a 19:00',
  hoursEn: 'Monday to Saturday, 7:00 to 19:00',
};

async function main() {
  const context = keystoneContext.sudo();

  for (const serviceType of SERVICE_TYPES) {
    const existing = await context.query.ServiceType.findOne({
      where: { key: serviceType.key },
      query: "id",
    });

    if (existing) {
      console.log(`[seed] ServiceType "${serviceType.key}" already exists — skipping`);
      continue;
    }

    await context.query.ServiceType.createOne({
      data: serviceType,
      query: "id key",
    });
    console.log(`[seed] created ServiceType "${serviceType.key}"`);
  }

  const existingContact = await context.query.ContactInfo.findOne({ query: 'id' });
  if (existingContact) {
    console.log('[seed] ContactInfo already exists — skipping');
  } else {
    await context.query.ContactInfo.createOne({
      data: CONTACT_INFO,
      query: 'id',
    });
    console.log('[seed] created ContactInfo singleton');
  }

  await context.prisma.$disconnect();
}

main().catch((error) => {
  console.error("[seed] failed:", error);
  process.exit(1);
});
