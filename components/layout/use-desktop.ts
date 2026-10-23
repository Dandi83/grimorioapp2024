"use client";

import { useEffect, useState } from "react";

/** True on a computer (≥1024 px), after mount: the server and the first render are the phone layout. */
export function useDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return desktop;
}
