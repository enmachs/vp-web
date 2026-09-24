import { list } from "@keystone-6/core";
import { denyAll } from "@keystone-6/core/access";
import { relationship, select, text } from "@keystone-6/core/fields";

import { permissions } from "../access";
import { HEARD_OPTIONS, LANGUAGE_OPTIONS } from "../lib/heard-options";
import { createdAt } from "./shared";

/**
 * One row per submission of the landing page's quote form
 * (features/landing/components/Tender.tsx -> app/api/quote/route.ts).
 *
 * Until now a submission only became an email. A Resend outage, or an unread
 * inbox, lost the lead with no record that anyone had tried to reach us.
 *
 * Rows are written only through keystoneContext.sudo() from the route handler
 * — the same escape hatch seed.ts uses — which is why every write operation
 * below can be denyAll. Unlike the other landing lists this one is NOT
 * publicly readable: it holds a name and a phone number.
 */
export const QuoteRequest = list({
  access: {
    operation: {
      query: permissions.canManageContent,
      create: denyAll,
      update: denyAll,
      delete: denyAll,
    },
  },
  ui: {
    label: "Quote requests",
    labelField: "fullName",
    // Literal `true`, not contentUi(): that factory gates hideCreate/hideDelete
    // on canManageContent, which would show a Create button to exactly the
    // people who can read this list — on a list whose create is denyAll.
    hideCreate: true,
    hideDelete: true,
    isHidden: ({ session }) => !permissions.canManageContent({ session }),
    itemView: { defaultFieldMode: "read" },
    listView: {
      initialColumns: ["fullName", "serviceTypeLabel", "phone", "createdAt"],
      initialSort: { field: "createdAt", direction: "DESC" },
    },
  },
  fields: {
    fullName: text({ validation: { isRequired: true } }),

    // `from`/`to` are SQL keywords and read badly in the generated GraphQL
    // filter inputs, so the columns carry the suffix the form fields do not.
    fromLocation: text({ validation: { isRequired: true } }),
    toLocation: text({ validation: { isRequired: true } }),

    // Deliberately optional. The landing page is ISR with revalidate = 60, so
    // for up to a minute a cached page can still offer a ServiceType an editor
    // just unpublished; a required relationship would reject that lead.
    serviceType: relationship({
      ref: "ServiceType",
      many: false,
      ui: { itemView: { fieldMode: "read" } },
    }),
    // Snapshot of the label the visitor actually saw. Survives the taxonomy row
    // being renamed or deleted, and — unlike the relationship view, which stays
    // visually interactive in read mode — renders as a plain read-only input.
    serviceTypeLabel: text(),

    phone: text({ validation: { isRequired: true } }),

    // `type: "string"`, not "enum": ServiceType.kind is a structural
    // discriminator, but this is marketing copy that churns. An enum would make
    // every added option an ALTER TYPE migration and would break reads of rows
    // holding a since-removed value.
    howHeardFromUs: select({
      type: "string",
      options: HEARD_OPTIONS.map(({ value, labelEs }) => ({
        value,
        label: labelEs,
      })),
    }),

    details: text({ ui: { displayMode: "textarea" } }),

    /** Which toggle the visitor used, so the reply goes out in that language. */
    language: select({
      type: "string",
      options: LANGUAGE_OPTIONS.map(({ value, label }) => ({ value, label })),
    }),

    createdAt: createdAt(),
  },
});
