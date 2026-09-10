import { list } from "@keystone-6/core";
import { checkbox, integer, text } from "@keystone-6/core/fields";

import {
  contentUi,
  createdAt,
  isPublished,
  publicReadContentWrite,
  sortOrder,
} from "./shared";

export const Review = list({
  access: publicReadContentWrite(),
  ui: {
    ...contentUi(),
    labelField: "authorName",
    listView: {
      initialColumns: ["authorName", "rating", "isFeatured", "sortOrder"],
    },
  },
  fields: {
    quoteEs: text({
      validation: { isRequired: true },
      ui: { displayMode: "textarea" },
    }),
    quoteEn: text({ ui: { displayMode: "textarea" } }),

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
});
