import { keystoneContext } from '@/features/keystone/context';
import { PUBLISHED_WHERE, SORT_ORDER } from './published';

export type Review = {
  id: string;
  quoteEs: string;
  quoteEn: string;
  authorName: string;
  initials: string;
  contextEs: string;
  contextEn: string;
  rating: number;
  isFeatured: boolean;
};

const REVIEW_FIELDS =
  'id quoteEs quoteEn authorName initials contextEs contextEn rating isFeatured';

/** Published Review rows for the testimonials section. See published.ts for the contract. */
export async function getReviews(): Promise<Review[] | null> {
  try {
    const rows = (await keystoneContext.query.Review.findMany({
      where: PUBLISHED_WHERE,
      orderBy: SORT_ORDER,
      query: REVIEW_FIELDS,
    })) as Review[];

    return rows.map((row) => ({
      id: row.id,
      quoteEs: row.quoteEs,
      quoteEn: row.quoteEn,
      authorName: row.authorName,
      initials: row.initials,
      contextEs: row.contextEs,
      contextEn: row.contextEn,
      rating: row.rating,
      isFeatured: row.isFeatured,
    }));
  } catch (err) {
    console.error('[landing] Review read failed; rendering without it', err);
    return null;
  }
}
