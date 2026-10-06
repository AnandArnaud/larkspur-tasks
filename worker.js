const Redis = require("ioredis");

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.log("REDIS_URL is not set, nothing to consume. Exiting.");
  process.exit(0);
}

const QUEUE = "larkspur:jobs";
const redis = new Redis(redisUrl);
let running = true;

redis.on("error", (err) => {
  console.error(`redis: ${err.message}`);
});

function handle(job) {
  switch (job.type) {
    case "task.created":
      console.log(`task ${job.taskId} created: ${job.title}`);
      break;
    default:
      console.log(`unknown job type "${job.type}", skipping`);
  }
}

async function consume() {
  console.log(`worker waiting on ${QUEUE}`);
  while (running) {
    let popped;
    try {
      popped = await redis.blpop(QUEUE, 5);
    } catch (err) {
      if (!running) break;
      throw err;
    }
    if (!popped) continue;
    let job;
    try {
      job = JSON.parse(popped[1]);
    } catch (err) {
      console.error(`discarding malformed job: ${popped[1]}`);
      continue;
    }
    handle(job);
  }
  console.log("worker stopped");
}

function shutdown(signal) {
  console.log(`${signal} received, stopping`);
  running = false;
  redis.disconnect();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

consume().catch((err) => {
  console.error(err);
  process.exit(1);
});
