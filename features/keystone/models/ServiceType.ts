import { list } from "@keystone-6/core";
import { relationship, select, text } from "@keystone-6/core/fields";

import {
  contentUi,
  createdAt,
  isPublished,
  publicReadContentWrite,
  sortOrder,
} from "./shared";

/**
 * The single taxonomy behind what the landing page currently triplicates:
 * gallery `cat` values, the s1/s2 prefixes in dict.services, and
 * dict.tender.typeOpt.
 *
 * `kind` distinguishes a sellable service (trips, pkg) from a gallery-only
 * bucket (clients), so the quote form can offer exactly the rows where
 * kind === 'service'.
 */
export const ServiceType = list({
  access: publicReadContentWrite(),
  ui: {
    ...contentUi(),
    label: "Service types",
    labelField: "nameEs",
    listView: { initialColumns: ["nameEs", "key", "kind", "sortOrder"] },
  },
  fields: {
    // Preserves today's GalleryPhoto.cat values: 'trips' | 'pkg' | 'clients'
    key: text({ validation: { isRequired: true }, isIndexed: "unique" }),
    kind: select({
      type: "enum",
      options: [
        { label: "Service (offered & quotable)", value: "service" },
        { label: "Showcase (gallery tag only)", value: "showcase" },
      ],
      defaultValue: "service",
      validation: { isRequired: true },
      ui: { displayMode: "segmented-control" },
    }),
    nameEs: text({ validation: { isRequired: true } }),
    nameEn: text(),

    services: relationship({
      ref: "Service.serviceType",
      many: true,
      ui: { displayMode: "count", itemView: { fieldMode: "read" } },
    }),
    galleryItems: relationship({
      ref: "GalleryItem.serviceType",
      many: true,
      ui: { displayMode: "count", itemView: { fieldMode: "read" } },
    }),

    sortOrder: sortOrder(),
    isPublished: isPublished(),
    createdAt: createdAt(),
  },
});
