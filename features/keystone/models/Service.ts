import { list } from "@keystone-6/core";
import { json, relationship, text } from "@keystone-6/core/fields";

import {
  contentUi,
  createdAt,
  isPublished,
  publicReadContentWrite,
  sortOrder,
} from "./shared";

export const Service = list({
  access: publicReadContentWrite(),
  ui: {
    ...contentUi(),
    labelField: "titleEs",
    listView: {
      initialColumns: ["titleEs", "serviceType", "sortOrder", "isPublished"],
    },
  },
  fields: {
    slug: text({ validation: { isRequired: true }, isIndexed: "unique" }),
    titleEs: text({ validation: { isRequired: true } }),
    titleEn: text(),
    bodyEs: text({ ui: { displayMode: "textarea" } }),
    bodyEn: text({ ui: { displayMode: "textarea" } }),

    // Today's s1Tags / s2Tags string arrays. Keystone has no native
    // string-array field; validate with a guard in the mapping layer.
    tagsEs: json({ defaultValue: [] }),
    tagsEn: json({ defaultValue: [] }),

    serviceType: relationship({ ref: "ServiceType.services", many: false }),

    sortOrder: sortOrder(),
    isPublished: isPublished(),
    createdAt: createdAt(),
  },
});
