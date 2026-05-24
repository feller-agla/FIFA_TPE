# Architecture ticketing FIFA

## Objectif

Le site web admin est l’interface à publier et à exploiter côté administration.
Les TPE restent installés uniquement sur les terminaux physiques; ils enregistrent un encaissement en espèces, génèrent le ticket, puis synchronisent l’enregistrement vers le backend central.

## Acteurs

- Agent: utilisateur métier rattaché à un TPE.
- TPE: terminal de vente qui crée et imprime les tickets.
- Admin: utilisateur web qui gère les agents, les TPE et consulte les tickets.

## Règle métier principale

- 1 TPE = 1 agent.
- Un ticket appartient à un TPE.
- Un ticket hérite automatiquement de l’agent lié au TPE.

## Flux

1. L’agent saisit les infos dans le TPE.
2. Le TPE enregistre l’encaissement espèces.
3. Le TPE génère et imprime le ticket.
4. Le TPE envoie le ticket au backend.
5. Le backend associe le ticket au device et à l’agent.
6. L’admin consulte et contrôle ces données dans le site web.

## Composants

- `backend/`: API NestJS connectée à Supabase pour agents, devices et tickets.
- `admin-web/`: interface Next.js pour l’administration.
- `app/`: application Android TPE.

## Déploiement

- `admin-web/` est la seule application web à déployer publiquement.
- Le push Git doit contenir `backend/`, `admin-web/` et la documentation partagée.
- `app/` n’est pas à publier en ligne: elle est distribuée comme APK privé sur chaque TPE.
- Tous les TPE se connectent au même backend et à la même base Supabase.

## Données centrales

- `agents`: code, nom, téléphone, actif.
- `devices`: identifiant TPE, libellé, agent lié, statut.
- `tickets`: référence, service, route, montant, mode de paiement, détails client.

## Supabase

- URL projet: `https://tzwhnyxqhxwecepygaxm.supabase.co`
- Clé publishable: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Le backend a aussi besoin d’une clé service role pour les écritures en production.

## Point important

Le TPE peut imprimer même si le backend est temporairement indisponible.
La synchro vers la base centrale doit rester asynchrone pour ne pas bloquer l’encaissement.
