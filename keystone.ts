// Entrypoint for the Keystone CLI (`keystone dev` / `build` / `start`).
// The Next.js app deliberately imports `keystone/config.base.ts` instead, which
// omits auth and the Admin UI.
export { default } from './keystone/config';
