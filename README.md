
# Can Durmuş — Architecture Portfolio
A portfolio website with its own content management panel, built for a practicing architect and running in production at [cdmi.com.tr](https://cdmi.com.tr). The client has no technical background, so the main goal was a site he can keep up to date himself: projects, categories, bio, profile photo and CV are all managed from an admin panel, without touching code.

## Stack
TypeScript · Node.js · Express · EJS · Prisma ORM · PostgreSQL (Neon) · Cloudinary · Render

## Media storage
Uploaded images are not written to the server's disk. Render's free instances have an ephemeral filesystem: every redeploy or restart wipes local files, so a project uploaded today could silently disappear next week. Images go to Cloudinary instead, and the database only stores their references. When a project or photo is removed, the file is deleted from Cloudinary as well, so nothing is left orphaned.

## Admin panel
The admin area sits behind a login, and its credentials are read from environment variables rather than stored in the codebase. Removing content works independently of the surrounding form: deleting the profile photo, for example, sends its own request and does not depend on other fields being filled in. Fields that don't need to be mandatory, like the bio, are optional on both the client and the server, and the public site hides empty sections cleanly instead of rendering broken images or blank boxes.

## Deployment
The app runs on Render with a custom domain and HTTPS. The start command runs `prisma migrate deploy` before the server boots, so schema changes are applied automatically on each deploy. Migrations run at startup rather than at build time because they need `DATABASE_URL`, which is injected at runtime.

Free instances sleep after 15 minutes without traffic, which makes the first visitor wait for a cold start. To avoid that without adding an external service, the server pings its own public `/health` endpoint every 10 minutes. The endpoint touches neither the database nor storage. The ping only starts when `NODE_ENV=production` and `SELF_PING_URL` are set, so it never runs locally. It targets the public URL rather than localhost, because the host only counts inbound traffic from outside.

## Secrets
Secrets are never committed. `.env.example` documents the required keys with empty values, and real values live only locally and in the hosting dashboard. A git pre-commit hook, kept in `scripts/hooks/` so it can be reinstalled on any machine, rejects any commit that includes `.env` files or key files.

## Getting started
Requirements: Node.js, a PostgreSQL database (Neon), a Cloudinary account

```
npm install
cp .env.example .env        # fill in database, admin and Cloudinary values
npm run build
npm run db:deploy
npm start
```

## Environment variables
| Variable | Purpose |
|---|---|
| DATABASE_URL | PostgreSQL connection string |
| ADMIN_USER / ADMIN_PASSWORD | Admin panel credentials |
| CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET | Media storage |
| NODE_ENV | `production` in deployment |
| SITE_URL | Public URL, used for Open Graph link previews |
| SELF_PING_URL | Public `/health` URL, enables the keep-alive ping |

## Project structure
```
src/
├── routes/        # public and admin routes
├── controllers/   # public site and admin panel logic
├── middlewares/   # auth, security, file upload
├── lib/           # Prisma client, Cloudinary storage, self-ping
└── server.ts
views/             # EJS templates for the site and admin panel
prisma/
├── schema.prisma
└── migrations/
```

## Notes
Things I would change next:

- **The admin account is a single set of credentials from the environment.** That fits a one-person portfolio, but it means no multiple users, no roles and no password reset flow. Storing hashed admin users in the database would make it extensible.
- **Local development uses the same database as production.** It kept setup simple, but a careless test locally changes the live site. A separate Neon branch for development would remove that risk.
- **The self-ping cannot wake a server that has already been put to sleep.** In practice the first incoming request restarts it and the ping resumes, but an external monitor would make this fully reliable.
- **There are no automated tests.** The upload and delete flows are the ones most likely to break quietly during a refactor.
