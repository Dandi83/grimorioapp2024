import "server-only";
import { cookies } from "next/headers";

import { ADMIN_EDITION_COOKIE, parseAdminEdition, type AdminEdition } from "./admin-edition";

/** The edition chosen in the admin area (2024 until changed). */
export async function adminEdition(): Promise<AdminEdition> {
  return parseAdminEdition((await cookies()).get(ADMIN_EDITION_COOKIE)?.value);
}
