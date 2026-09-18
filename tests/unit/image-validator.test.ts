import { describe, expect, it } from "vitest";

import { MAX_IMAGE_BYTES, MAX_IMAGE_LABEL } from "@/features/keystone/lib/upload-limits";
import {
  SUPPORTED_IMAGE_EXTENSIONS,
  validateImage,
  type ImageValue,
} from "@/features/dashboard/views/image/utils";

function upload(size: number, type = "image/png"): ImageValue {
  // A File whose `size` is what we say it is, without allocating it.
  const file = new File([], "photo.png", { type });
  Object.defineProperty(file, "size", { value: size });
  return { kind: "upload", data: { file, validity: { valid: true } as ValidityState }, previous: { kind: "empty" } };
}

const validate = (v: ImageValue) => validateImage(SUPPORTED_IMAGE_EXTENSIONS, v);

describe("dashboard image validator", () => {
  it("caps uploads at 5 MB, matching the server-side multipart limit", () => {
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
    expect(MAX_IMAGE_LABEL).toBe("5 MB");
  });

  it("accepts an image at or under the limit", () => {
    expect(validate(upload(1024))).toBeUndefined();
    expect(validate(upload(MAX_IMAGE_BYTES))).toBeUndefined();
  });

  it("rejects an image over the limit with a readable size and the cap", () => {
    const msg = validate(upload(MAX_IMAGE_BYTES + 1));
    expect(msg).toMatch(/^That image is 5 MB; the limit is 5 MB\.$/);
    expect(validate(upload(7 * 1024 * 1024))).toBe("That image is 7 MB; the limit is 5 MB.");
  });

  it("rejects non-image files before looking at size", () => {
    expect(validate(upload(10, "application/pdf"))).toMatch(/isn't accepted/);
  });

  it("ignores values that are not a pending upload", () => {
    expect(validate({ kind: "empty" })).toBeUndefined();
    expect(validate({ kind: "remove" })).toBeUndefined();
    expect(
      validate({
        kind: "from-server",
        data: { id: "x", url: "https://img/x.png", extension: "png", filesize: 99, width: 1, height: 1 },
      })
    ).toBeUndefined();
  });
});
