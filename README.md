# Larkspur Tasks

A task board API with a background worker. The web process serves the API, the worker drains a job list, and a digest script summarises the board by status.

## Processes

The app runs on a Procfile-based platform. The `Procfile` declares two process types:

```
web: node server.js
worker: node worker.js
```

Postgres and Redis are managed add-ons on the platform and are injected into both processes as `DATABASE_URL` and `REDIS_URL`.

`scripts/digest.js` prints a count of tasks by status and exits. In production it runs hourly through the platform's scheduler add-on with the command `node scripts/digest.js`.

## Running locally

```
npm install
DATABASE_URL=postgres://localhost:5432/larkspur npm start
REDIS_URL=redis://localhost:6379 npm run worker
DATABASE_URL=postgres://localhost:5432/larkspur npm run digest
```

The web process creates the `tasks` table on first start. Without `DATABASE_URL` the server still starts and answers `GET /health`, but the task routes answer 503. Without `REDIS_URL` the worker exits straight away and the web process skips job publishing.

## Environment variables

| Variable | Read by | Description |
| --- | --- | --- |
| `PORT` | web | Port to listen on (defaults to 3000). |
| `DATABASE_URL` | web, digest | Postgres connection string. |
| `REDIS_URL` | web, worker | Redis connection string. |
| `NODE_ENV` | web, digest | When set to `production`, Postgres connections use TLS. |

## Routes

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness check, answers `{"ok":true}`. |
| `GET` | `/tasks` | Lists all tasks. |
| `POST` | `/tasks` | Creates a task: `{"title":"Write the launch note","status":"todo"}`. Status is one of `todo`, `in_progress`, `done`. |

Each created task publishes a `task.created` job on the `larkspur:jobs` list, which the worker logs.
