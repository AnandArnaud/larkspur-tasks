const express = require("express");
const Redis = require("ioredis");
const { pool } = require("./db");

const port = Number(process.env.PORT) || 3000;
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
const STATUSES = ["todo", "in_progress", "done"];

if (redis) {
  redis.on("error", (err) => {
    console.error(`redis: ${err.message}`);
  });
}

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/tasks", async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: "DATABASE_URL is not set" });
  }
  const { rows } = await pool.query("select id, title, status, created_at from tasks order by id");
  res.json({ tasks: rows });
});

app.post("/tasks", async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: "DATABASE_URL is not set" });
  }
  const { title, status = "todo" } = req.body || {};
  if (typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({ error: "title is required" });
  }
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${STATUSES.join(", ")}` });
  }
  const { rows } = await pool.query(
    "insert into tasks (title, status) values ($1, $2) returning id, title, status, created_at",
    [title.trim(), status]
  );
  const task = rows[0];
  if (redis) {
    await redis.rpush("larkspur:jobs", JSON.stringify({ type: "task.created", taskId: task.id, title: task.title }));
  }
  res.status(201).json(task);
});

async function start() {
  if (pool) {
    await pool.query(`
      create table if not exists tasks (
        id serial primary key,
        title text not null,
        status text not null default 'todo',
        created_at timestamptz not null default now()
      )
    `);
  }
  app.listen(port, "0.0.0.0", (err) => {
    if (err) throw err;
    console.log(`larkspur-tasks web listening on port ${port}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
