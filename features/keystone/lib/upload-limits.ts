// Shared by the server-side multipart gate (pages/api/graphql.ts) and the
// dashboard's client-side image validator, so the two never drift apart.
// Kept dependency-free: the dashboard bundles this into the browser.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_LABEL = "5 MB";
