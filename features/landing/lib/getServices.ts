import { keystoneContext } from '@/features/keystone/context';
import { PUBLISHED_WHERE, SORT_ORDER, asStringArray } from './published';

export type Service = {
  id: string;
  slug: string;
  titleEs: string;
  titleEn: string;
  bodyEs: string;
  bodyEn: string;
  tagsEs: string[];
  tagsEn: string[];
};

const SERVICE_FIELDS = 'id slug titleEs titleEn bodyEs bodyEn tagsEs tagsEn';

/** Published Service rows for the services section. See published.ts for the contract. */
export async function getServices(): Promise<Service[] | null> {
  try {
    const rows = (await keystoneContext.query.Service.findMany({
      where: PUBLISHED_WHERE,
      orderBy: SORT_ORDER,
      query: SERVICE_FIELDS,
    })) as Array<Omit<Service, 'tagsEs' | 'tagsEn'> & { tagsEs: unknown; tagsEn: unknown }>;

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      titleEs: row.titleEs,
      titleEn: row.titleEn,
      bodyEs: row.bodyEs,
      bodyEn: row.bodyEn,
      tagsEs: asStringArray(row.tagsEs),
      tagsEn: asStringArray(row.tagsEn),
    }));
  } catch (err) {
    console.error('[landing] Service read failed; rendering without it', err);
    return null;
  }
}
