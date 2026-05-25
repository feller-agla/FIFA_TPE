# FIFA Ticket Backend

Backend NestJS pour centraliser les tickets, les agents et les TPE via Supabase.

## Déploiement

- Le backend sert le site admin web et les TPE.
- Le site `admin-web/` est la seule partie web à publier.
- L’application Android `app/` n’est pas publiée en ligne; elle reste installée sur les TPE physiques.
- Tous les terminaux parlent au même backend et à la même base Supabase.

## Hébergement sur Render

Déploiement recommandé:

1. Créer un nouveau projet Render, puis ajouter un Web Service depuis le dépôt GitHub.
2. Choisir le mode manuel, pas le blueprint.
3. Renseigner:
	- Root directory: `backend`
	- Build command: `npm install && npm run build`
	- Start command: `npm run start`
4. Ajouter les variables d'environnement dans Render:
	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
	- `SUPABASE_SERVICE_ROLE_KEY`
5. Déployer puis tester `GET /api/health`.

## Authentification des agents

L'application Android requiert maintenant un login `email/mot de passe` avant d'accéder au TPE.

Avant d'utiliser cette fonctionnalité, applique la migration [supabase/agent_login_migration.sql](supabase/agent_login_migration.sql) dans Supabase pour ajouter les colonnes `email`, `password_hash` et `password_salt` à la table `agents`.

Le nouvel endpoint est:

- `POST /api/auth/login`

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
