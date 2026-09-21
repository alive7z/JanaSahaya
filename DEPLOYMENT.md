# JanaSahaya production deployment

This guide targets one Ubuntu VPS with Docker Compose and a host Nginx TLS reverse proxy. The only published Compose port is the frontend on `127.0.0.1:8080`; the Express API and MySQL are reachable only inside the Compose network.

## 1. Prepare the server and repository

Install Docker Engine with the Compose plugin, Nginx, Certbot, Git, and a firewall. Point the domain's DNS A/AAAA records at the VPS, then:

```sh
git clone YOUR_REPOSITORY_URL janasahaya
cd janasahaya
cp .env.example .env
chmod 600 .env
```

Generate independent secrets. Run each command separately and paste the results into `.env`; do not paste shell expressions such as `$(openssl ...)` into the file.

```sh
openssl rand -hex 32
openssl rand -hex 32
openssl rand -base64 36
openssl rand -base64 36
openssl rand -base64 24
```

Set `CLIENT_ORIGIN` to the exact public origin, for example `https://janasahaya.example.com`, with no trailing slash. Set unique database, owner, officer, and demo passwords. Keep `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=lax` for the recommended same-origin deployment. Set `ENABLE_DEMO_ACCOUNTS=false` if the public demo buttons are not wanted.

Production-required settings are:

| Variable | Purpose |
| --- | --- |
| `MYSQL_ROOT_PASSWORD` | MySQL maintenance account; not used by the app |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Internal application database account |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Different random values, at least 32 characters |
| `CLIENT_ORIGIN` | Exact HTTPS browser origin used by REST and Socket.IO CORS |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Initial unrestricted owner admin |
| `OFFICER_EMAIL`, `OFFICER_PASSWORD` | Initial example officer |
| `DEMO_CITIZEN_EMAIL`, `DEMO_ADMIN_EMAIL`, `DEMO_PASSWORD` | Public recruiter login configuration |

Supported optional settings include `FRONTEND_PORT`, `COOKIE_NAME`, `COOKIE_DOMAIN`, `COOKIE_MAX_AGE_DAYS`, `MAX_UPLOAD_MB`, `DB_POOL_SIZE`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES`, all `RATE_LIMIT_*` values, `LOG_LEVEL`, `SERVICE_NAME`, and `SERVICE_VERSION`. `NODE_ENV`, internal hostnames, `UPLOAD_DIR`, and secure-cookie mode are supplied by Compose. Keep `COOKIE_MAX_AGE_DAYS` aligned with `JWT_REFRESH_EXPIRES`.

## 2. Validate and start

```sh
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 mysql
docker compose logs --tail=100 backend
```

On every backend container start, `src/db/setup.js` creates the database when necessary, applies `schema.sql`, runs unapplied migrations in filename order, and performs idempotent reference/demo seeding before Express starts. A failed setup prevents the API container from starting.

Verify from the VPS:

```sh
curl -fsS http://127.0.0.1:8080/health
curl -fsS http://127.0.0.1:8080/ready
curl -fsS http://127.0.0.1:8080/api/docs/openapi.json
```

`/health` proves the process is live. `/ready` also queries MySQL and returns HTTP 503 when the database is unavailable.

## 3. Configure HTTPS

Copy `deploy/nginx-site.conf.example` to `/etc/nginx/sites-available/janasahaya`, replace every example domain, enable the site, and obtain a certificate. The exact Certbot command depends on the installed integration; a common sequence is:

```sh
sudo ln -s /etc/nginx/sites-available/janasahaya /etc/nginx/sites-enabled/janasahaya
sudo nginx -t
sudo certbot --nginx -d janasahaya.example.com
sudo nginx -t
sudo systemctl reload nginx
```

The host proxy must forward `Upgrade`, `Connection`, `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto`. The container Nginx then routes `/api/`, `/uploads/`, and `/socket.io/` to Express and serves React routes with the SPA fallback.

After HTTPS is working, verify:

```sh
curl -fsS https://janasahaya.example.com/health
curl -fsS https://janasahaya.example.com/ready
curl -fsS https://janasahaya.example.com/api/docs/openapi.json
curl -I https://janasahaya.example.com/dashboard
```

The last request must return the SPA rather than 404. In browser developer tools, confirm the refresh cookie is `HttpOnly`, `Secure`, has the configured `SameSite` value, and is scoped to `/api/v1/auth`.

## 4. Recruiter journey checks

Perform these checks on mobile and desktop widths:

1. Open the landing page and use **Explore as Citizen**.
2. Allow location, then repeat with permission denied and choose a manual/map location.
3. Open Map and confirm **All Issues** works without requesting location; test 500 m, 1 km, 2 km, and 5 km filters.
4. Submit an issue with a JPEG/PNG/WebP image and confirm `/uploads/...` loads over HTTPS.
5. Log out, use **Explore as Admin**, find the demo-citizen issue, assign it, and change its status.
6. Confirm the demo admin cannot alter users, roles, departments, categories, SLA configuration, or non-demo issues.
7. Log in as the configured officer, accept the issue, add resolution evidence, and resolve it.
8. Return as the citizen and verify the live Socket.IO update and resolution state.
9. Review audit logs and analytics. Open `/api/docs` and confirm Swagger can call the same-origin API.
10. In developer tools, confirm Socket.IO connects to `wss://janasahaya.example.com/socket.io/` and there are no mixed-content or CSP errors.

## 5. Persistence and restart verification

Create a recognizable issue and upload an image, record its issue ID and image URL, then:

```sh
docker compose restart
docker compose ps
curl -fsS https://janasahaya.example.com/ready
```

Confirm the issue, demo accounts, and image remain. Rebuilding should also preserve both named volumes:

```sh
docker compose up -d --build
docker volume ls | grep -E 'mysql_data|uploads_data'
```

`docker compose down` removes containers and the network but preserves named volumes. Do not use `docker compose down -v` in production unless permanent data deletion is intended.

## 6. Backups

Create a root-owned backup directory with restricted permissions. Example database backup:

```sh
mkdir -p backups
chmod 700 backups
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --routines --triggers "$MYSQL_DATABASE"' > backups/janasahaya.sql
chmod 600 backups/janasahaya.sql
```

Example upload-volume backup (replace `janasahaya_uploads_data` with the name shown by `docker volume ls`):

```sh
docker run --rm -v janasahaya_uploads_data:/data:ro -v "$PWD/backups:/backup" alpine tar -czf /backup/uploads.tar.gz -C /data .
```

Copy both files to encrypted off-server storage. Schedule daily backups, retain multiple generations, and test restoration on a separate Compose project. Never test a restore against the production database first.

## 7. Updating and operations

```sh
git pull --ff-only
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 backend
curl -fsS https://janasahaya.example.com/ready
```

Useful operational commands:

```sh
docker compose logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose restart
docker compose down
```

Changing MySQL password variables after the named database volume already exists does not automatically alter existing MySQL account passwords. Perform database credential rotation deliberately inside MySQL, then update `.env` and restart the backend.

## 8. Repository security before publishing

The repository previously committed a root `.env` containing a Supabase project URL and publishable key. Before making the repository public, revoke/rotate that credential in Supabase and remove `.env` from every Git history ref with a history-rewrite tool such as `git filter-repo`. Coordinate the forced update with every clone. A current `.gitignore` entry does not remove secrets from old commits.

Before every release:

```sh
git status --short
git ls-files | grep -E '(^|/)(\.env|node_modules|dist|uploads|.*\.log$)'
cd backend && npm ci && npm test
cd ../frontend && npm ci && npm test && npm run build
```
