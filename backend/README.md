# FIFA Ticket Backend

Backend NestJS pour centraliser les tickets, les agents et les TPE via Supabase.

## Déploiement

- Le backend sert le site admin web et les TPE.
- Le site `admin-web/` est la seule partie web à publier.
- L’application Android `app/` n’est pas publiée en ligne; elle reste installée sur les TPE physiques.
- Tous les terminaux parlent au même backend et à la même base Supabase.

## Variables d'environnement

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tzwhnyxqhxwecepygaxm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xP5ngBNpq4B0QCqs6332rA_LuBo61kv
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

En production, privilégie la clé service role côté backend pour les écritures.

## Schéma Supabase

Applique le script [supabase/schema.sql](supabase/schema.sql) dans Supabase pour créer les tables `agents`, `devices` et `tickets`.

## Développement

```bash
cd backend
npm install
npm run dev
```

## Endpoints

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/agents`
- `POST /api/agents`
- `PATCH /api/agents/:id`
- `GET /api/devices`
- `POST /api/devices`
- `PATCH /api/devices/:deviceId/assign`
- `GET /api/tickets`
- `POST /api/tickets`
