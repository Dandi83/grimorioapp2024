import type { MetadataRoute } from "next";

// No «orientation»: the app turns with the phone and the tablet. Separate icons: «any» at 192 and 512, and a
// «maskable» one with a margin, so the drawing is not cut by the round or squircle masks of Android.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    // PROMPT 72: the name of the installed app without «D&D» (a trademark of Wizards of the Coast).
    name: "Il Grimorio.App",
    short_name: "Grimorio",
    description: "Incantesimi, mostri e regole 5e in italiano",
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
