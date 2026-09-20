import { keystoneContext } from '@/features/keystone/context';
import { PUBLISHED_WHERE, SORT_ORDER } from './published';

export type GalleryItem = {
  id: string;
  labelEs: string;
  labelEn: string;
  /** ISO timestamp, or null when the editor left it blank. */
  takenOn: string | null;
  placeholderColor: string;
  /** Absolute public URL (storage.ts rewrites it to IMAGE_PUBLIC_URL), or null when no photo is uploaded. */
  image: { url: string; width: number; height: number } | null;
  /** ServiceType.key the gallery tabs filter on, or null when unassigned. */
  serviceTypeKey: string | null;
};

const GALLERY_ITEM_FIELDS =
  'id labelEs labelEn takenOn placeholderColor image { url width height } serviceType { key }';

type Row = Omit<GalleryItem, 'serviceTypeKey'> & { serviceType: { key: string } | null };

/** Published GalleryItem rows for the gallery grid. See published.ts for the contract. */
export async function getGalleryItems(): Promise<GalleryItem[] | null> {
  try {
    const rows = (await keystoneContext.query.GalleryItem.findMany({
      where: PUBLISHED_WHERE,
      orderBy: SORT_ORDER,
      query: GALLERY_ITEM_FIELDS,
    })) as Row[];

    return rows.map((row) => ({
      id: row.id,
      labelEs: row.labelEs,
      labelEn: row.labelEn,
      takenOn: row.takenOn,
      placeholderColor: row.placeholderColor,
      image: row.image
        ? { url: row.image.url, width: row.image.width, height: row.image.height }
        : null,
      serviceTypeKey: row.serviceType?.key ?? null,
    }));
  } catch (err) {
    console.error('[landing] GalleryItem read failed; rendering without it', err);
    return null;
  }
}
