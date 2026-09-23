/**
 * Shared bits for the landing page's public content reads
 * (getServices, getGalleryItems, getReviews, getServiceTypes, getSocialLinks).
 *
 * Every loader follows the same contract as getContactInfo:
 * - reads through the in-process Keystone context (server-only);
 * - only `isPublished` rows, ordered by `sortOrder`, so an editor can stage
 *   content in the dashboard without it showing up on the site;
 * - resolves to `[]` when the list is empty and `null` when the read fails
 *   (unreachable DB at build time — see getContactInfo), so the page renders
 *   an empty state instead of failing the build;
 * - copies rows into plain object literals, because Keystone returns
 *   null-prototype objects that React refuses to hand to Client Components.
 */
export const PUBLISHED_WHERE = { isPublished: { equals: true } } as const;
export const SORT_ORDER = { sortOrder: 'asc' } as const;

/** `json` fields have no schema; only accept a real string array. */
export function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];
}
