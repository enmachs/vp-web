/**
 * TEMPORARY — delete once the Vercel preview check (V10) is green.
 *
 * This exists to prove the load-bearing assumption of the whole integration:
 * that `getContext()` works inside a Next.js server runtime, and that Keystone
 * and the Prisma client survive bundling. A local pass is necessary but not
 * sufficient — serverless tracing of the Prisma query-compiler WASM only really
 * gets exercised on a deployed Vercel function.
 */
import { getKeystoneContext } from '@/lib/keystone';

// Never prerender this at build time — it must hit a live database.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const serviceTypes = await getKeystoneContext().query.ServiceType.findMany({
      query: 'id key kind nameEs nameEn sortOrder',
      orderBy: { sortOrder: 'asc' },
    });

    return Response.json({
      ok: true,
      serviceTypeCount: serviceTypes.length,
      serviceTypes,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
