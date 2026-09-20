import { keystoneContext } from '@/features/keystone/context';
import { PUBLISHED_WHERE, SORT_ORDER } from './published';

export type ServiceType = {
  id: string;
  key: string;
  kind: 'service' | 'showcase';
  nameEs: string;
  nameEn: string;
};

const SERVICE_TYPE_FIELDS = 'id key kind nameEs nameEn';

/**
 * Published ServiceType rows — the taxonomy the gallery filter tabs are built
 * from. See published.ts for the contract.
 */
export async function getServiceTypes(): Promise<ServiceType[] | null> {
  try {
    const rows = (await keystoneContext.query.ServiceType.findMany({
      where: PUBLISHED_WHERE,
      orderBy: SORT_ORDER,
      query: SERVICE_TYPE_FIELDS,
    })) as ServiceType[];

    return rows.map(({ id, key, kind, nameEs, nameEn }) => ({ id, key, kind, nameEs, nameEn }));
  } catch (err) {
    console.error('[landing] ServiceType read failed; rendering without it', err);
    return null;
  }
}
