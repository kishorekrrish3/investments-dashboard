import { initializeDatabase } from "../db";
import { ensureDefaultPersonalUser } from "../lib/auth";

async function main() {
  console.log("Applying tables to Turso Cloud database...");
  await initializeDatabase();
  console.log("Tables created successfully.");

  console.log("Initializing owner profile in Turso Cloud...");
  const res = await ensureDefaultPersonalUser();
  console.log("Result:", res);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error initializing owner profile:", err);
  process.exit(1);
});
