/**
 * Freestyle MicroVM Client Bridge for Corvus Studio.
 * Interfaces with the Freestyle Cloud MicroVM infrastructure.
 */

import { Freestyle } from "freestyle";

export const freestyle = new Freestyle({
  apiKey: process.env["FREESTYLE_API_KEY"] || "mock-freestyle-key-for-dev",
});

export const WORKDIR = "/workdir/app";
export const VM_PORT = 3000;
export const APP_SESSION = "dev";
export const BASE_SNAPSHOT_SLUG = "corvus-next-base";
