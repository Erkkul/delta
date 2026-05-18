import { describe, expect, it } from "vitest"

import {
  ProductPhotoConfirmInput,
  ProductPhotoDeleteInput,
  ProductPhotoEntry,
  ProductPhotoMime,
  ProductPhotoReorderInput,
  ProductPhotoUploadInput,
  ProductPhotoUploadOutput,
} from "./photos"

describe("ProductPhotoMime", () => {
  it("accepte jpeg/png/webp", () => {
    expect(ProductPhotoMime.safeParse("image/jpeg").success).toBe(true)
    expect(ProductPhotoMime.safeParse("image/png").success).toBe(true)
    expect(ProductPhotoMime.safeParse("image/webp").success).toBe(true)
  })

  it("refuse gif et heic", () => {
    expect(ProductPhotoMime.safeParse("image/gif").success).toBe(false)
    expect(ProductPhotoMime.safeParse("image/heic").success).toBe(false)
  })
})

describe("ProductPhotoEntry", () => {
  it("exige url et path", () => {
    expect(
      ProductPhotoEntry.safeParse({
        url: "https://x.com/a.jpg",
        path: "uid/pid/abc.jpg",
      }).success,
    ).toBe(true)
    expect(
      ProductPhotoEntry.safeParse({ url: "https://x.com/a.jpg" }).success,
    ).toBe(false)
    expect(
      ProductPhotoEntry.safeParse({ path: "uid/pid/abc.jpg" }).success,
    ).toBe(false)
  })

  it("accepte alt optionnel borné à 120 caractères", () => {
    expect(
      ProductPhotoEntry.safeParse({
        url: "https://x.com/a.jpg",
        path: "uid/pid/abc.jpg",
        alt: "miel doux",
      }).success,
    ).toBe(true)
    expect(
      ProductPhotoEntry.safeParse({
        url: "https://x.com/a.jpg",
        path: "uid/pid/abc.jpg",
        alt: "x".repeat(121),
      }).success,
    ).toBe(false)
  })
})

describe("ProductPhotoUploadInput", () => {
  it("accepte un MIME valide", () => {
    expect(
      ProductPhotoUploadInput.safeParse({ content_type: "image/jpeg" }).success,
    ).toBe(true)
  })

  it("refuse un MIME hors whitelist", () => {
    expect(
      ProductPhotoUploadInput.safeParse({ content_type: "application/pdf" })
        .success,
    ).toBe(false)
  })

  it("refuse une clé inconnue (strict)", () => {
    expect(
      ProductPhotoUploadInput.safeParse({
        content_type: "image/jpeg",
        slot: 0,
      }).success,
    ).toBe(false)
  })
})

describe("ProductPhotoUploadOutput", () => {
  it("exige les 4 champs", () => {
    expect(
      ProductPhotoUploadOutput.safeParse({
        path: "uid/pid/abc.jpg",
        upload_url: "https://x.com/upload",
        public_url: "https://x.com/public.jpg",
        token_expires_in: 60,
      }).success,
    ).toBe(true)
  })

  it("refuse un token_expires_in non positif", () => {
    expect(
      ProductPhotoUploadOutput.safeParse({
        path: "uid/pid/abc.jpg",
        upload_url: "https://x.com/upload",
        public_url: "https://x.com/public.jpg",
        token_expires_in: 0,
      }).success,
    ).toBe(false)
  })
})

describe("ProductPhotoConfirmInput", () => {
  it("accepte path + public_url", () => {
    expect(
      ProductPhotoConfirmInput.safeParse({
        path: "uid/pid/abc.jpg",
        public_url: "https://x.com/p.jpg",
      }).success,
    ).toBe(true)
  })

  it("refuse public_url non-URL", () => {
    expect(
      ProductPhotoConfirmInput.safeParse({
        path: "uid/pid/abc.jpg",
        public_url: "not-a-url",
      }).success,
    ).toBe(false)
  })
})

describe("ProductPhotoDeleteInput", () => {
  it("accepte 0..3", () => {
    expect(ProductPhotoDeleteInput.safeParse({ index: 0 }).success).toBe(true)
    expect(ProductPhotoDeleteInput.safeParse({ index: 3 }).success).toBe(true)
  })

  it("refuse < 0 ou > 3", () => {
    expect(ProductPhotoDeleteInput.safeParse({ index: -1 }).success).toBe(false)
    expect(ProductPhotoDeleteInput.safeParse({ index: 4 }).success).toBe(false)
  })

  it("refuse un index non-entier", () => {
    expect(ProductPhotoDeleteInput.safeParse({ index: 1.5 }).success).toBe(
      false,
    )
  })
})

describe("ProductPhotoReorderInput", () => {
  it("accepte from !== to dans les bornes", () => {
    expect(
      ProductPhotoReorderInput.safeParse({ from: 2, to: 0 }).success,
    ).toBe(true)
  })

  it("refuse from === to", () => {
    expect(
      ProductPhotoReorderInput.safeParse({ from: 1, to: 1 }).success,
    ).toBe(false)
  })

  it("refuse hors bornes", () => {
    expect(
      ProductPhotoReorderInput.safeParse({ from: 4, to: 0 }).success,
    ).toBe(false)
    expect(
      ProductPhotoReorderInput.safeParse({ from: 0, to: -1 }).success,
    ).toBe(false)
  })
})
