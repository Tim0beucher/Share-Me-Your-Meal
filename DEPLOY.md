# Déployer Recette App pour la partager (accès permanent, sans dépendre de ce PC)

Trois services, tous avec un palier gratuit suffisant pour un usage entre amis : **Neon**
(PostgreSQL managé), **Render** (API NestJS), **Vercel** (frontend React). Je ne peux pas créer
ces comptes à votre place (vérification par e-mail, etc.) — ce guide est écrit pour que vous
suiviez les étapes, et je peux exécuter les commandes techniques (migrations, seed, git) dès que
vous me donnez les valeurs demandées (chaîne de connexion, URL déployée...).

Comptez 30-45 minutes la première fois.

## 0. Mettre le code sur GitHub

Le dépôt Git local est déjà initialisé et le premier commit prêt à être fait. Vous devez juste
créer le dépôt distant (GitHub ne peut pas être créé sans vos identifiants) :

1. Allez sur [github.com/new](https://github.com/new), créez un dépôt (ex. `recette-app`), **ne
   cochez aucune case d'initialisation** (pas de README/gitignore — le dépôt local en a déjà).
2. Copiez l'URL du dépôt (ex. `https://github.com/votre-compte/recette-app.git`).
3. Donnez-moi cette URL — j'exécute le premier commit et le push (ou vous pouvez le faire
   vous-même) :
   ```bash
   git remote add origin <URL>
   git branch -M main
   git push -u origin main
   ```

## 1. Base de données — Neon

1. [neon.tech](https://neon.tech) → créer un compte → **New Project** (nom libre, région proche
   de vous, version Postgres 16 ou 17).
2. Une fois créé, Neon affiche une **chaîne de connexion** du type
   `postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`.
   Copiez-la et donnez-la-moi.
3. Je lance les migrations et le seed CIQUAL dessus (mêmes scripts que pour votre base locale) :
   ```bash
   DATABASE_URL="<votre chaîne Neon>" ./database/scripts/migrate.sh
   DATABASE_URL="<votre chaîne Neon>" ./database/scripts/seed.sh
   ```
   (~3 100 aliments à importer, prend une minute ou deux.)

## 2. Backend — Render

1. [render.com](https://render.com) → créer un compte → **New +** → **Web Service**.
2. Connectez votre GitHub, sélectionnez le dépôt `recette-app`.
3. Configuration :
   - **Root Directory** : `backend`
   - **Runtime** : Node
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
   - **Instance Type** : Free
4. Variables d'environnement (section *Environment*) :
   - `DATABASE_URL` = la chaîne Neon de l'étape 1
   - `JWT_SECRET` = `9bbcffb0f0a710f4102ee02b8a79339bd827bf7817e3ba8d6f29628a89ac94db`
     (générée pour vous, à usage unique — n'importe qui avec cette valeur peut forger des jetons
     de connexion, donc ne la partagez qu'ici, jamais commitée dans le code)
   - `FRONTEND_URL` = laissez vide pour l'instant, on y revient à l'étape 4
5. **Create Web Service**. Render build et déploie automatiquement (~3-5 min). Notez l'URL
   attribuée (ex. `https://recette-app-api.onrender.com`).

**Palier gratuit Render** : le service se met en veille après 15 min sans requête ; la requête
suivante réveille le serveur en 30-50 secondes. Normal pour un partage entre amis, gênant pour un
usage pro — un palier payant (~7 $/mois) supprime cette latence si besoin plus tard.

## 3. Frontend — Vercel

1. [vercel.com](https://vercel.com) → créer un compte → **Add New** → **Project**.
2. Connectez le même dépôt GitHub.
3. Configuration :
   - **Root Directory** : `frontend`
   - **Framework Preset** : Vite (détecté automatiquement)
   - **Build Command** : `npm run build` (par défaut)
   - **Output Directory** : `dist` (par défaut)
4. Variable d'environnement :
   - `VITE_API_URL` = l'URL Render de l'étape 2 (ex. `https://recette-app-api.onrender.com`)
5. **Deploy**. Vercel donne une URL du type `https://recette-app.vercel.app` — c'est le lien à
   partager avec vos amis.

## 4. Boucler la boucle : restreindre le CORS

Une fois l'URL Vercel connue, retournez sur Render → votre service → *Environment* → mettez à
jour `FRONTEND_URL` avec cette URL exacte (ex. `https://recette-app.vercel.app`, sans slash
final) → **Save Changes** (Render redéploie automatiquement). Ça empêche n'importe quel autre
site web d'appeler votre API directement.

## 5. Vérifier

Ouvrez l'URL Vercel, créez un compte, créez une recette. Si la première requête met du temps
(cold start Render), c'est normal — patientez 30-50 secondes.

## Après le déploiement initial

- Chaque `git push` sur `main` redéploie automatiquement backend et frontend (Render et Vercel
  surveillent le dépôt).
- Pour une future migration de schéma : appliquer `database/scripts/migrate.sh` avec la chaîne
  Neon en variable `DATABASE_URL`, comme à l'étape 1.
- `JWT_SECRET` ne doit jamais changer une fois en usage : le changer déconnecte tous les
  utilisateurs (leurs jetons existants deviennent invalides).
