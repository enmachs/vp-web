import { Readable } from "node:stream";
import { HeadObjectCommand, ListObjectsV2Command, S3 } from "@aws-sdk/client-s3";
// graphql-upload v15 ships CJS with a default export; the Upload scalar's
// parseValue does an instanceof check, so it must be this exact class.
// @ts-ignore
import Upload from "graphql-upload/Upload.js";

import { imageStorage } from "@/features/keystone/storage";
import type { Session } from "@/features/keystone/access";

/** The value Keystone's `image` field expects for `{ upload: … }` when a
 *  mutation is run through the context rather than over HTTP. */
export function makeUpload(buffer: Buffer, filename: string, mimetype = "image/png") {
  const upload = new Upload();
  upload.resolve({
    createReadStream: () => Readable.from(buffer),
    filename,
    mimetype,
    encoding: "7bit",
  });
  return upload;
}

// Same config Keystone uses to write, so a HeadObject here is proof the
// upload path put the bytes where the app will later look for them.
const s = imageStorage as Extract<typeof imageStorage, { kind: "s3" }>;
export const bucket = s.bucketName;
export const pathPrefix = s.pathPrefix ?? "";
export const publicBase = (process.env.IMAGE_PUBLIC_URL ?? "").replace(/\/+$/, "");

export const s3 = new S3({
  region: s.region,
  endpoint: s.endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId: s.accessKeyId!, secretAccessKey: s.secretAccessKey! },
});

export async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e: any) {
    if (e?.name === "NotFound" || e?.$metadata?.httpStatusCode === 404) return false;
    throw e;
  }
}

export async function objectSize(key: string): Promise<number | undefined> {
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  return head.ContentLength;
}

export async function listTestObjects(): Promise<string[]> {
  const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: pathPrefix }));
  return (res.Contents ?? []).map((o) => o.Key!).sort();
}

export const contentManagerRole = {
  name: "__test-content-manager",
  canAccessDashboard: true,
  canManageContent: true,
};

export const viewerRole = {
  name: "__test-viewer",
  canAccessDashboard: true,
  canManageContent: false,
};

/** Shape `statelessSessions` + `createAuth` put on `context.session`. */
export function sessionFor(user: { id: string; name: string }, role: Session["data"]["role"]): Session {
  return { listKey: "User", itemId: user.id, data: { name: user.name, role } };
}
