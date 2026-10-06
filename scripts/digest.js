const { pool } = require("../db");

async function main() {
  if (!pool) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const { rows } = await pool.query(
    "select status, count(*)::int as count from tasks group by status order by status"
  );
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  console.log(`Task digest for ${new Date().toISOString().slice(0, 10)}`);
  console.log(`${total} task${total === 1 ? "" : "s"}`);
  for (const row of rows) {
    console.log(`  ${row.status}: ${row.count}`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
