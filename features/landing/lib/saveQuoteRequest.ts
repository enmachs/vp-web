import { keystoneContext } from '@/features/keystone/context';
import type { NormalizedQuote } from '@/app/api/quote/validate';

/**
 * Persists one quote-form submission.
 *
 * QuoteRequest denies create to everyone (see features/keystone/models/
 * QuoteRequest.ts), so this writes through sudo() — the same escape hatch
 * seed.ts uses for lists the public may not write.
 *
 * Throws if the write fails; the route handler catches, because a database
 * hiccup must not stop the email from going out.
 */

export interface SavedQuote {
  id: string;
  /** Spanish name of the resolved ServiceType, for the notification email. */
  serviceTypeNameEs: string;
}

/**
 * Resolves the submitted ServiceType by id.
 *
 * Existence is the only hard requirement. A row that resolves but is
 * unpublished or is a `showcase` bucket is still accepted, because the landing
 * page is ISR with revalidate = 60: for up to a minute after an editor changes
 * the taxonomy, a cached page still offers the old option, and that visitor
 * should not lose their request over it.
 */
async function resolveServiceType(id: string | null) {
  if (!id) return null;

  const row = (await keystoneContext.sudo().query.ServiceType.findOne({
    where: { id },
    query: 'id kind isPublished nameEs nameEn',
  })) as { id: string; kind: string; isPublished: boolean; nameEs: string } | null;

  if (!row) {
    console.warn('[quote] unknown serviceTypeId, storing the label only:', id);
    return null;
  }
  if (!row.isPublished || row.kind !== 'service') {
    console.warn(
      `[quote] serviceType ${row.id} is ${row.isPublished ? '' : 'unpublished '}${row.kind}; accepting anyway`
    );
  }
  return row;
}

export async function saveQuoteRequest(quote: NormalizedQuote): Promise<SavedQuote> {
  const serviceType = await resolveServiceType(quote.serviceTypeId);

  const created = (await keystoneContext.sudo().db.QuoteRequest.createOne({
    data: {
      fullName: quote.fullName,
      fromLocation: quote.fromLocation,
      toLocation: quote.toLocation,
      // Prefer the taxonomy's own Spanish name over the client's label, so the
      // stored snapshot is not whatever a tampered payload claimed.
      serviceTypeLabel: serviceType?.nameEs ?? quote.serviceTypeLabel,
      phone: quote.phone,
      howHeardFromUs: quote.howHeardFromUs,
      details: quote.details,
      language: quote.language,
      ...(serviceType ? { serviceType: { connect: { id: serviceType.id } } } : {}),
    },
  })) as { id: string };

  return {
    id: created.id,
    serviceTypeNameEs: serviceType?.nameEs ?? quote.serviceTypeLabel,
  };
}
