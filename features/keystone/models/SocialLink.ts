import { list } from "@keystone-6/core";
import { select, text } from "@keystone-6/core/fields";

import {
  contentUi,
  createdAt,
  isPublished,
  publicReadContentWrite,
  sortOrder,
} from "./shared";

export const SocialLink = list({
  access: publicReadContentWrite(),
  ui: {
    ...contentUi(),
    label: "Social links",
    labelField: "label",
    listView: { initialColumns: ["label", "platform", "url", "sortOrder"] },
  },
  fields: {
    platform: select({
      type: "enum",
      options: [
        { label: "Instagram", value: "instagram" },
        { label: "Facebook", value: "facebook" },
        { label: "TikTok", value: "tiktok" },
        { label: "YouTube", value: "youtube" },
        { label: "X", value: "x" },
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
});
