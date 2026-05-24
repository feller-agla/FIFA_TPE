# Push Scope

Goal: push only the backend and the admin web app, plus shared documentation.

## Include

- `backend/`
- `admin-web/`
- `ARCHITECTURE.md`
- `backend/README.md`
- `.gitignore`

## Exclude

- Android TPE build outputs
- Local environment files
- `node_modules`
- `.next`
- `dist`
- `local.properties`

## Suggested staging

```bash
git add backend admin-web ARCHITECTURE.md backend/README.md .gitignore PUSH_SCOPE.md
```

## Notes

- The TPE app remains installed locally on the terminals.
- The backend stays hosted publicly so all TPEs can communicate with the same API and Supabase database.
- Do not add `backend/.env` or `admin-web/.env` to Git.
