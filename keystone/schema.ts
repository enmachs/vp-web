import { list } from '@keystone-6/core';
import {
  calendarDay,
  checkbox,
  image,
  integer,
  json,
  password,
  relationship,
  select,
  text,
  timestamp,
} from '@keystone-6/core/fields';
import type { BaseListTypeInfo } from '@keystone-6/core/types';

import type { Lists } from '../generated/keystone/types';
import { authedOnly, publicReadAuthedWrite, singletonPublicRead } from './access';
import { vercelBlob } from './storage/vercel-blob';

// Shared field definitions. Every collection list gets an explicit order so
// nothing depends on insertion order, and a publish flag so the client can
// stage content without a deploy.
//
// Generic so each call infers the calling list's TypeInfo; a non-generic helper
// would be pinned to BaseListTypeInfo and rejected by list<...>().
const sortOrder = <T extends BaseListTypeInfo>() =>
  integer<T>({ defaultValue: 0, validation: { isRequired: true } });

const isPublished = <T extends BaseListTypeInfo>() => checkbox<T>({ defaultValue: true });

const createdAt = <T extends BaseListTypeInfo>() =>
  timestamp<T>({
    defaultValue: { kind: 'now' },
    ui: { createView: { fieldMode: 'hidden' } },
  });

// Annotated rather than `satisfies`, so each list() call is contextually typed
// with its concrete generated TypeInfo instead of inferring BaseListTypeInfo.
export const lists: Lists = {
  // ───────────────────────────────────────────────────────────── auth ──
  User: list<Lists.User.TypeInfo>({
    access: authedOnly(),
    ui: {
      listView: { initialColumns: ['name', 'email', 'createdAt'] },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      email: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
      password: password({ validation: { isRequired: true } }),
      createdAt: createdAt(),
    },
  }),

  // ────────────────────────────────────────────────────── taxonomy ──
  /**
   * The single taxonomy behind what the site currently triplicates:
   * gallery `cat` values, the s1/s2 prefixes in dict.services, and
   * dict.tender.typeOpt.
   *
   * `kind` distinguishes a sellable service (trips, pkg) from a gallery-only
   * bucket (clients), so the quote form can offer exactly the rows where
   * kind === 'service'.
   */
  ServiceType: list<Lists.ServiceType.TypeInfo>({
    access: publicReadAuthedWrite(),
    ui: {
      label: 'Service types',
      labelField: 'nameEs',
      listView: { initialColumns: ['nameEs', 'key', 'kind', 'sortOrder'] },
    },
    fields: {
      // Preserves today's GalleryPhoto.cat values: 'trips' | 'pkg' | 'clients'
      key: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
      kind: select({
        type: 'enum',
        options: [
          { label: 'Service (offered & quotable)', value: 'service' },
          { label: 'Showcase (gallery tag only)', value: 'showcase' },
        ],
        defaultValue: 'service',
        validation: { isRequired: true },
        ui: { displayMode: 'segmented-control' },
      }),
      nameEs: text({ validation: { isRequired: true } }),
      nameEn: text(),

      services: relationship({
        ref: 'Service.serviceType',
        many: true,
        ui: { displayMode: 'count', itemView: { fieldMode: 'read' } },
      }),
      galleryItems: relationship({
        ref: 'GalleryItem.serviceType',
        many: true,
        ui: { displayMode: 'count', itemView: { fieldMode: 'read' } },
      }),

      sortOrder: sortOrder(),
      isPublished: isPublished(),
      createdAt: createdAt(),
    },
  }),

  // ────────────────────────────────────────────────────── services ──
  Service: list<Lists.Service.TypeInfo>({
    access: publicReadAuthedWrite(),
    ui: {
      labelField: 'titleEs',
      listView: { initialColumns: ['titleEs', 'serviceType', 'sortOrder', 'isPublished'] },
    },
    fields: {
      slug: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
      titleEs: text({ validation: { isRequired: true } }),
      titleEn: text(),
      bodyEs: text({ ui: { displayMode: 'textarea' } }),
      bodyEn: text({ ui: { displayMode: 'textarea' } }),

      // Today's s1Tags / s2Tags string arrays. Keystone has no native
      // string-array field; validate with a guard in the mapping layer.
      tagsEs: json({ defaultValue: [] }),
      tagsEn: json({ defaultValue: [] }),

      serviceType: relationship({ ref: 'ServiceType.services', many: false }),

      sortOrder: sortOrder(),
      isPublished: isPublished(),
      createdAt: createdAt(),
    },
  }),

  // ─────────────────────────────────────────────────────── gallery ──
  GalleryItem: list<Lists.GalleryItem.TypeInfo>({
    access: publicReadAuthedWrite(),
    ui: {
      label: 'Gallery',
      labelField: 'labelEs',
      listView: { initialColumns: ['labelEs', 'serviceType', 'takenOn', 'sortOrder'] },
    },
    fields: {
      image: image({ storage: vercelBlob('gallery') }),
      labelEs: text({ validation: { isRequired: true } }),
      labelEn: text(),

      // A real date rather than a bilingual pair: 'Mar 2025' vs 'Dic 2024' is a
      // formatting difference, so format with Intl at render time.
      takenOn: calendarDay(),

      // Tint for the striped placeholder shown until a photo is uploaded.
      placeholderColor: text({ defaultValue: '#8a8a8a' }),

      serviceType: relationship({ ref: 'ServiceType.galleryItems', many: false }),

      sortOrder: sortOrder(),
      isPublished: isPublished(),
      createdAt: createdAt(),
    },
  }),

  // ─────────────────────────────────────────────────────── contact ──
  /**
   * Singleton: contact details are one-of-each. Machine-readable values are
   * stored raw (e.g. '+584140000000') so tel:/mailto:/wa.me hrefs can be
   * derived in code — the site currently has none.
   */
  ContactInfo: list<Lists.ContactInfo.TypeInfo>({
    isSingleton: true,
    access: singletonPublicRead(),
    ui: {
      label: 'Contact info',
      hideCreate: true,
      hideDelete: true,
    },
    fields: {
      email: text(),
      phone: text(),
      whatsapp: text(),
      addressEs: text(),
      addressEn: text(),
      mapsUrl: text(),
      hoursEs: text(),
      hoursEn: text(),
    },
  }),

  // ────────────────────────────────────────────────────────  social ──
  SocialLink: list<Lists.SocialLink.TypeInfo>({
    access: publicReadAuthedWrite(),
    ui: {
      label: 'Social links',
      labelField: 'label',
      listView: { initialColumns: ['label', 'platform', 'url', 'sortOrder'] },
    },
    fields: {
      platform: select({
        type: 'enum',
        options: [
          { label: 'Instagram', value: 'instagram' },
          { label: 'Facebook', value: 'facebook' },
          { label: 'TikTok', value: 'tiktok' },
          { label: 'YouTube', value: 'youtube' },
          { label: 'X', value: 'x' },
        ],
        validation: { isRequired: true },
      }),
      // Brand nouns — deliberately not bilingual.
      label: text({ validation: { isRequired: true } }),
      url: text({ validation: { isRequired: true } }),
      handle: text(),

      sortOrder: sortOrder(),
      isPublished: isPublished(),
      createdAt: createdAt(),
    },
  }),

  // ─────────────────────────────────────────────────────── reviews ──
  Review: list<Lists.Review.TypeInfo>({
    access: publicReadAuthedWrite(),
    ui: {
      labelField: 'authorName',
      listView: { initialColumns: ['authorName', 'rating', 'isFeatured', 'sortOrder'] },
    },
    fields: {
      quoteEs: text({ validation: { isRequired: true }, ui: { displayMode: 'textarea' } }),
      quoteEn: text({ ui: { displayMode: 'textarea' } }),

      // Proper nouns — not bilingual.
      authorName: text({ validation: { isRequired: true } }),
      initials: text({ validation: { isRequired: true } }),

      // The 'where' line, e.g. 'Encomienda · Coro'
      contextEs: text(),
      contextEn: text(),

      rating: integer({
        defaultValue: 5,
        validation: { isRequired: true, min: 1, max: 5 },
      }),

      // Replaces the presentational `dark` flag: content-meaningful, and the
      // component decides how a featured review is styled.
      isFeatured: checkbox({ defaultValue: false }),

      sortOrder: sortOrder(),
      isPublished: isPublished(),
      createdAt: createdAt(),
    },
  }),
};
