import type { ReactNode } from "react";

import { AdminEditionBar } from "@/components/admin-edition/edition-bar";
import { isAdmin } from "@/lib/admin-auth";
import { adminEdition } from "@/lib/admin-edition-server";

/** Every admin page starts with the edition switch (only after the login: the login page has none). */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await isAdmin())) return children;
  const edition = await adminEdition();
  return (
    <>
      <AdminEditionBar key={edition} edition={edition} />
      {children}
    </>
  );
}
