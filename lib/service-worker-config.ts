/** Emergency switch: set GRIMORIO_SERVICE_WORKER=off on Vercel and redeploy. */
export function serviceWorkerEnabled() {
  return process.env.GRIMORIO_SERVICE_WORKER !== "off";
}
