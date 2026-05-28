import { migrateConfig } from "../pages/admin/closet-builder/defaults.js";

export function parseConfig(jsonString) {
  try {
    return migrateConfig(JSON.parse(jsonString || "{}"));
  } catch {
    return {};
  }
}
