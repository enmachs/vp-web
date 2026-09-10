import { allowAll, denyAll } from "@keystone-6/core/access";
import { checkbox, integer, timestamp } from "@keystone-6/core/fields";

import { permissions } from "../access";

/**
 * Shared building blocks for the public content lists (ServiceType, Service,
 * GalleryItem, ContactInfo, SocialLink, Review).
 *
 * These are factories rather than shared constants on purpose: a single field
 * or access object reused by reference across several list() calls would be
 * pinned to whichever list typed it first. Calling them per list keeps each
 * definition independent.
 */

/** Explicit ordering, so nothing depends on insertion order. */
export const sortOrder = () =>
  integer({ defaultValue: 0, validation: { isRequired: true } });

/** Lets an editor stage content without a deploy. */
export const isPublished = () => checkbox({ defaultValue: true });

export const createdAt = () =>
  timestamp({
    defaultValue: { kind: "now" },
    ui: { createView: { fieldMode: "hidden" } },
  });

/**
 * Content the public landing page reads anonymously, and only an editor with
 * canManageContent may change.
 *
 * `query: allowAll` is what lets the unauthenticated site fetch this content
 * through /api/graphql — these lists hold nothing private.
 */
export const publicReadContentWrite = () => ({
  operation: {
    query: allowAll,
    create: permissions.canManageContent,
    update: permissions.canManageContent,
    delete: permissions.canManageContent,
  },
});

/**
 * Singleton lists: publicly readable and editable by content managers, but the
 * single row can never be created or destroyed through the API.
 */
export const singletonPublicRead = () => ({
  operation: {
    query: allowAll,
    create: denyAll,
    update: permissions.canManageContent,
    delete: denyAll,
  },
});

/** Hide create/delete in the dashboard for users who cannot manage content. */
export const contentUi = () => ({
  hideCreate: (args: Parameters<typeof permissions.canManageContent>[0]) =>
    !permissions.canManageContent(args),
  hideDelete: (args: Parameters<typeof permissions.canManageContent>[0]) =>
    !permissions.canManageContent(args),
});
