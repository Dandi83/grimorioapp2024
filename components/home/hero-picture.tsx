import { getImageProps } from "next/image";
import { preload } from "react-dom";

/**
 * The library picture of the Home (and of the «Scegli l'edizione» screen), PROMPT 59.
 * Phones (up to 672 px CSS, also 3× screens): at most 828 px wide, quality 60 (about 45 KB instead of 81 KB).
 * Tablets and computers: the same widths and quality as before (next/image, quality 75).
 * One <picture>: the browser downloads one file only, the one of its <source> or of the <img>.
 */
export const HERO_SRC = "/hero-atmosfera.webp";
export const HERO_PHONE_MEDIA = "(max-width: 672px)";
// The exact complement of the phone query (no gap at fractional widths such as 672.5 px).
export const HERO_WIDE_MEDIA = "not all and (max-width: 672px)";
export const HERO_PHONE_QUALITY = 60;
export const HERO_PHONE_MAX_WIDTH = 828;

/** The phone candidates, built by next/image (same addresses and optimizer), only up to 828 px. */
function phoneSrcSet() {
  const { srcSet = "" } = getImageProps({ src: HERO_SRC, alt: "", fill: true, sizes: "100vw", quality: HERO_PHONE_QUALITY }).props;
  return srcSet.split(", ").filter(entry => Number(entry.split(" ")[1]?.replace("w", "")) <= HERO_PHONE_MAX_WIDTH).join(", ");
}

type Props = {
  alt: string;
  /** The sizes of the <img> for tablets and computers, as before. */
  sizes: string;
  className?: string;
  /** Home only: the two preloads in the HTML, each with its media, the same files as the picture. */
  preloadImage?: boolean;
};

export function HeroPicture({ alt, sizes, className, preloadImage = false }: Props) {
  const phone = phoneSrcSet();
  const { props: wide } = getImageProps({ src: HERO_SRC, alt, fill: true, sizes, loading: "eager", fetchPriority: "high", className });
  if (preloadImage) {
    preload(HERO_SRC, { as: "image", imageSrcSet: phone, imageSizes: "100vw", fetchPriority: "high", media: HERO_PHONE_MEDIA } as Parameters<typeof preload>[1]);
    preload(HERO_SRC, { as: "image", imageSrcSet: wide.srcSet, imageSizes: sizes, fetchPriority: "high", media: HERO_WIDE_MEDIA } as Parameters<typeof preload>[1]);
  }
  return (
    <picture>
      <source media={HERO_PHONE_MEDIA} srcSet={phone} sizes="100vw" />
      <img {...wide} alt={alt} />
    </picture>
  );
}
