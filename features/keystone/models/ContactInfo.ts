import { list } from "@keystone-6/core";
import { text } from "@keystone-6/core/fields";

import { singletonPublicRead } from "./shared";

/**
 * Singleton: contact details are one-of-each. Machine-readable values are
 * stored raw (e.g. '+584140000000') so tel:/mailto:/wa.me hrefs can be
 * derived in code — the landing page currently hardcodes them.
 */
export const ContactInfo = list({
  isSingleton: true,
  access: singletonPublicRead(),
  ui: {
    label: "Contact info",
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
});
