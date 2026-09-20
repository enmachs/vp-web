import { keystoneContext } from '@/features/keystone/context';
import { PUBLISHED_WHERE, SORT_ORDER } from './published';

export type SocialLink = {
  id: string;
  platform: string;
  label: string;
  url: string;
};

const SOCIAL_LINK_FIELDS = 'id platform label url';

/** Published SocialLink rows for the footer. See published.ts for the contract. */
export async function getSocialLinks(): Promise<SocialLink[] | null> {
  try {
    const rows = (await keystoneContext.query.SocialLink.findMany({
      where: PUBLISHED_WHERE,
      orderBy: SORT_ORDER,
      query: SOCIAL_LINK_FIELDS,
    })) as SocialLink[];

    return rows.map(({ id, platform, label, url }) => ({ id, platform, label, url }));
  } catch (err) {
    console.error('[landing] SocialLink read failed; rendering without it', err);
    return null;
  }
}
