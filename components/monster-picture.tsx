import type { MonsterPicture } from "@/lib/monsters-types";

/** The three sizes made at the upload (lib/monster-picture-server.ts): phone, tablet, computer. */
export const PICTURE_SIZES = { s: 480, m: 800, l: 1200 } as const;
export type PictureSize = keyof typeof PICTURE_SIZES;

/** Address of one size: the version is in the name, so the file never changes and is kept for a year. */
export const pictureSrc = (v: string, size: PictureSize) => `/immagini-mostri/${v}-${size}.webp`;

/**
 * The picture of a creature «Dalla redazione» (PROMPT 44), under the head of the sheet and above its description.
 * Width and height of the saved image keep its place before it arrives (no layout shift). It is just under the head,
 * so in sight when the page opens: loaded at once, not lazily. The credits, when given, small under it.
 */
export function MonsterPictureFigure({ picture }: { picture: MonsterPicture }) {
  const srcSet = (Object.keys(PICTURE_SIZES) as PictureSize[]).map(size => `${pictureSrc(picture.v, size)} ${Math.min(PICTURE_SIZES[size], picture.w)}w`).join(", ");
  return (
    <figure className="mx-6 mt-4" data-monster-picture="">
      {/* eslint-disable-next-line @next/next/no-img-element -- three WebP sizes made at the upload, served with their own cache */}
      <img src={pictureSrc(picture.v, "m")} srcSet={srcSet} sizes="(min-width: 1024px) 640px, calc(100vw - 48px)" width={picture.w} height={picture.h}
        alt={picture.alt} loading="eager" decoding="async" className="block h-auto w-full rounded-[12px] border border-border bg-card" />
      {picture.crediti && <figcaption className="mt-1 text-[12px] leading-4 text-muted" data-picture-credits="">{picture.crediti}</figcaption>}
    </figure>
  );
}
