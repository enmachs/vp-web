import { list } from "@keystone-6/core";
import { image, relationship, text, timestamp } from "@keystone-6/core/fields";

import {
  contentUi,
  createdAt,
  isPublished,
  publicReadContentWrite,
  sortOrder,
} from "./shared";

export const GalleryItem = list({
  access: publicReadContentWrite(),
  ui: {
    ...contentUi(),
    label: "Gallery",
    labelField: "labelEs",
    listView: {
      initialColumns: ["labelEs", "serviceType", "takenOn", "sortOrder"],
    },
  },
  fields: {
    // Uses the project's existing S3 storage rather than vp-web's Vercel Blob
    // adapter, so there is one storage backend for the whole project.
    image: image({ storage: "my_images" }),
    labelEs: text({ validation: { isRequired: true } }),
    labelEn: text(),

    // A real date rather than a bilingual pair: 'Mar 2025' vs 'Dic 2024' is a
    // formatting difference, so format with Intl at render time.
    //
    // vp-web used calendarDay() here. This dashboard resolves field views
    // through features/keystone/view-order and has no calendarDay renderer, so
    // registry.ts would throw and break the whole item view. timestamp() is
    // supported; the time component is simply unused.
    takenOn: timestamp(),

    // Tint for the striped placeholder shown until a photo is uploaded.
    placeholderColor: text({ defaultValue: "#8a8a8a" }),

    serviceType: relationship({ ref: "ServiceType.galleryItems", many: false }),

    sortOrder: sortOrder(),
    isPublished: isPublished(),
    createdAt: createdAt(),
  },
});
