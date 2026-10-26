import type { MetadataRoute } from "next";

// No «orientation»: the app turns with the phone and the tablet. Separate icons: «any» at 192 and 512, and a
// «maskable» one with a margin, so the drawing is not cut by the round or squircle masks of Android.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Il Grimorio.App — Incantesimi e Bestiario D&D 5e",
    short_name: "Grimorio",
    description:
      "Consulta, cerca e filtra incantesimi, mostri e animali di D&D 5e in italiano. Salva i preferiti.",
    lang: "it",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F6EFDF",
    theme_color: "#F6EFDF",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
