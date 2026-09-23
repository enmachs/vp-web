/**
 * Seeds reference data for local development. Idempotent — safe to re-run.
 *
 * Run with: npm run db:seed
 *
 * Seeds three things:
 *
 * 1. The ServiceType taxonomy — everything else relates to it. The landing
 *    gallery builds its filter tabs from the published rows and matches
 *    GalleryItem.serviceType on `key`.
 *
 * 2. The two Service rows the landing page used to hardcode in dict.ts
 *    (features/landing/components/Services.tsx now reads published rows), so
 *    a fresh database does not render the services section empty.
 *
 * 3. The ContactInfo singleton row. This is not optional: ContactInfo sets
 *    `create: denyAll`, so the single row cannot be created through the API or
 *    the dashboard. Without seeding it here the list is permanently empty and
 *    `contactInfo` always resolves to null and the landing page footer renders
 *    an empty contact column (features/landing/components/Footer.tsx).
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

const SERVICES = [
  {
    slug: 'viajes',
    serviceTypeKey: 'trips',
    titleEs: 'Viajes',
    titleEn: 'Trips',
    bodyEs: 'Traslados cómodos entre Paraguaná, el occidente y el centro del país. Privados o compartidos, con paradas acordadas y espacio para el equipaje real de una familia.',
    bodyEn: 'Comfortable transfers between Paraguaná, the west and the center of the country. Private or shared, with agreed stops and room for real family luggage.',
    tagsEs: ['Privado', 'Compartido', 'Aeropuerto', 'Grupos'],
    tagsEn: ['Private', 'Shared', 'Airport', 'Groups'],
    sortOrder: 1,
  },
  {
    slug: 'encomiendas',
    serviceTypeKey: 'pkg',
    titleEs: 'Encomiendas',
    titleEn: 'Parcels',
    bodyEs: 'Enviamos lo que necesitas llegar a tiempo: documentos, repuestos, mercancía, cajas familiares. Recogida puerta a puerta y entrega con confirmación.',
    bodyEn: 'We move what needs to arrive on time: documents, spare parts, goods, family boxes. Door-to-door pickup, confirmed delivery.',
    tagsEs: ['Puerta a puerta', 'Rastreo', 'Mismo día', 'Carga especial'],
    tagsEn: ['Door to door', 'Tracking', 'Same day', 'Special cargo'],
    sortOrder: 2,
  },
];

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

  for (const { serviceTypeKey, ...service } of SERVICES) {
    const existing = await context.query.Service.findOne({
      where: { slug: service.slug },
      query: 'id',
    });

    if (existing) {
      console.log(`[seed] Service "${service.slug}" already exists — skipping`);
      continue;
    }

    await context.query.Service.createOne({
      data: { ...service, serviceType: { connect: { key: serviceTypeKey } } },
      query: 'id slug',
    });
    console.log(`[seed] created Service "${service.slug}"`);
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
