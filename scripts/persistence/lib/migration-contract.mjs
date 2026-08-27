import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_DIRECTORY = path.resolve(moduleDirectory, "../../..", "db", "migrations");

export function listMigrationVersions(directory = MIGRATIONS_DIRECTORY) {
  return fs.readdirSync(directory)
    .filter(file => file.endsWith(".sql"))
    .sort();
}

export function migrationPath(version, directory = MIGRATIONS_DIRECTORY) {
  return path.join(directory, version);
}
