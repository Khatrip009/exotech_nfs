# ExoTech NFS Creator

Simple production-ready single-repo app (Express + static frontend) to register/login and create customizable "NFS codes" with color, frame and design.

Quick start (local):

1. Install dependencies:

```bash
cd /workspaces/exotech_nfs
npm --prefix backend install
```

2. Run the server:

```bash
NODE_ENV=development node backend/server.js
```

3. Open http://localhost:3000

Docker (recommended for production-like run):

```bash
docker compose up --build
```

Notes:
- `docker-compose` builds the image from this repository; there is no need to mount the `backend/` directory unless you want to actively develop inside the container.
- The compose file mounts `./public` so you can tweak frontend files without rebuilding, and it mounts `./data` to `/app/backend/data` to persist the SQLite database.
- Data is persisted to `./data`.
- Change `JWT_SECRET` in `docker-compose.yml` for production.
- The backend exposes a small REST API under `/api`.

Project layout:
- `backend/` - Express server and DB
- `public/` - static frontend assets (served by Express)
- `Dockerfile`, `docker-compose.yml` - container configs

If you want, I can:
- Add tests and linting
- Add email verification or OAuth
- Replace SQLite with Postgres
