import { allowAll, denyAll } from '@keystone-6/core/access';
import type { BaseListTypeInfo, ListAccessControl } from '@keystone-6/core/types';

/**
 * The generated session type resolves to `any` until a `Session` interface is
 * augmented, so keep this shape structural and permissive.
 */
export function isSignedIn({ session }: { session?: { itemId?: string | number } }) {
  return Boolean(session?.itemId);
}

/*
 * These are factories rather than shared constants: a plain object would be
 * pinned to `ListAccessControl<BaseListTypeInfo>` at its definition site and
 * would not be assignable to lists with concrete generated TypeInfo. Calling
 * them inside `list()` lets each one infer its own list's type.
 */

/** Content the public site reads anonymously; only signed-in editors change it. */
export function publicReadAuthedWrite<T extends BaseListTypeInfo>(): ListAccessControl<T> {
  return {
    operation: {
      query: allowAll,
      create: isSignedIn,
      update: isSignedIn,
      delete: isSignedIn,
    },
  };
}

/** Never exposed to the public site — an anonymous query throws. */
export function authedOnly<T extends BaseListTypeInfo>(): ListAccessControl<T> {
  return {
    operation: {
      query: isSignedIn,
      create: isSignedIn,
      update: isSignedIn,
      delete: isSignedIn,
    },
  };
}

/**
 * Singleton lists: publicly readable, editable by signed-in users, but the one
 * row can never be created or destroyed through the API. It is seeded once in
 * `db.onConnect`, which uses sudo and therefore bypasses this.
 */
export function singletonPublicRead<T extends BaseListTypeInfo>(): ListAccessControl<T> {
  return {
    operation: {
      query: allowAll,
      create: denyAll,
      update: isSignedIn,
      delete: denyAll,
    },
  };
}
