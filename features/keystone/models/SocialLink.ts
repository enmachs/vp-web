import { list } from "@keystone-6/core";
import { select, text } from "@keystone-6/core/fields";
import type { KeystoneContext } from "@keystone-6/core/types";

import {
  contentUi,
  createdAt,
  isPublished,
  publicReadContentWrite,
  sortOrder,
} from "./shared";

export const UNIQUE_SORT_ORDER_ERROR =
  "already used by another social link";

async function nextSortOrder(context: KeystoneContext) {
  const [last] = await context.sudo().query.SocialLink.findMany({
    orderBy: [{ sortOrder: "desc" }],
    take: 1,
    query: "sortOrder",
  });
  return (typeof last?.sortOrder === "number" ? last.sortOrder : 0) + 1;
}

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

    // Unique index is the real guarantee; the hook is a friendlier error.
    sortOrder: sortOrder({
      isIndexed: "unique",
      ui: {
        description:
          "Must be unique. Lower numbers appear first. New links default to one past the current highest.",
      },
      hooks: {
        resolveInput: async ({
          operation,
          inputData,
          resolvedData,
          context,
        }) => {
          if (operation !== "create") return resolvedData.sortOrder;
          if (inputData.sortOrder != null) return resolvedData.sortOrder;
          return nextSortOrder(context);
        },
        validate: async ({
          operation,
          resolvedData,
          item,
          addValidationError,
          context,
        }) => {
          if (operation === "delete") return;

          const value =
            resolvedData.sortOrder !== undefined &&
            resolvedData.sortOrder !== null
              ? resolvedData.sortOrder
              : item?.sortOrder;
          if (typeof value !== "number") return;

          const clash = await context.sudo().query.SocialLink.findMany({
            where: {
              sortOrder: { equals: value },
              ...(item?.id
                ? { id: { not: { equals: String(item.id) } } }
                : {}),
            },
            take: 1,
            query: "id",
          });

          if (clash.length > 0) {
            addValidationError(UNIQUE_SORT_ORDER_ERROR);
          }
        },
      },
    }),
    isPublished: isPublished(),
    createdAt: createdAt(),
  },
});
