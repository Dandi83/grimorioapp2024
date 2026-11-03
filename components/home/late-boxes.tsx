"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { whenPageIdle } from "@/components/layout/late-extras";

/**
 * PROMPT 57: the question «Come ti trovi?» and the occasional support card decide in the browser whether to appear
 * (from the 3rd and the 5th day of visit). Their code comes when the page is idle, in its own chunk; the share card
 * under them is drawn by the server as before.
 */
const RatingBox = dynamic(() => import("@/components/home/rating-box").then(module => module.RatingBox), { ssr: false });
const SupportCard = dynamic(() => import("@/components/support/support-card").then(module => module.SupportCard), { ssr: false });

export function LateBoxes({ support }: { support: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => whenPageIdle(() => setReady(true)), []);
  if (!ready) return null;
  return (
    <>
      <RatingBox />
      <SupportCard enabled={support} />
    </>
  );
}
