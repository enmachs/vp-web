import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { vercelBlob } from '../keystone/storage/vercel-blob';

/**
 * Keystone's `url(key)` never sees what `put()` returned — it must rebuild the
 * pathname from the key alone. That is the whole reason `put()` passes
 * `addRandomSuffix: false`. If these drift apart, every already-uploaded image
 * 404s, silently and all at once.
 */
describe('vercelBlob storage strategy', () => {
  const previous = process.env.BLOB_BASE_URL;

  beforeEach(() => {
    process.env.BLOB_BASE_URL = 'https://example.public.blob.vercel-storage.com';
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.BLOB_BASE_URL;
    else process.env.BLOB_BASE_URL = previous;
  });

  it('builds a url from the prefix and key alone', () => {
    const storage = vercelBlob('gallery');
    assert.equal(
      storage.url('abc123.jpg', undefined as never),
      'https://example.public.blob.vercel-storage.com/gallery/abc123.jpg',
    );
  });

  it('keeps prefixes isolated so a future file() field cannot collide', () => {
    const gallery = vercelBlob('gallery').url('x.jpg', undefined as never);
    const documents = vercelBlob('documents').url('x.jpg', undefined as never);
    assert.notEqual(gallery, documents);
  });

  it('tolerates a trailing slash on BLOB_BASE_URL', () => {
    process.env.BLOB_BASE_URL = 'https://example.public.blob.vercel-storage.com/';
    assert.equal(
      vercelBlob('gallery').url('a.jpg', undefined as never),
      'https://example.public.blob.vercel-storage.com/gallery/a.jpg',
    );
  });

  it('reads env lazily, so importing this module without a token is safe', () => {
    // The Next.js app imports this transitively and has no BLOB_READ_WRITE_TOKEN.
    // Constructing the strategy must not throw.
    assert.doesNotThrow(() => vercelBlob('gallery'));
  });
});
