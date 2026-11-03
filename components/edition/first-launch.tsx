"use client";

import dynamic from "next/dynamic";

import { useUserEdition } from "@/components/edition/edition-provider";

// The screen in its own chunk (PROMPT 57): every visit after the first never downloads it.
const FirstLaunchScreen = dynamic(() => import("@/components/edition/first-launch-screen"), { ssr: false });

/**
 * «Scegli l’edizione» with «D&D 2024» · «D&D 2014»: full screen over the library of the Home, the first time the visit
 * starts on the Home and nobody has chosen yet (never over a direct link). Drawn only in the browser,
 * after loading: search engines and link previews see the Home as it is. A choice saves «la tua
 * edizione»; Esc (computers) closes it with 2024, and it does not come back.
 */
export function FirstLaunch() {
  const { firstLaunch } = useUserEdition();
  if (!firstLaunch) return null;
  return <FirstLaunchScreen />;
}
