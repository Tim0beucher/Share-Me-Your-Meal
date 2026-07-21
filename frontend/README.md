# Frontend — recette-app (MVP)

React + TypeScript + Vite, sans framework CSS (styles maison dans `src/styles.css`) ni state
manager externe (le state serveur est simple : `fetch` direct + `useState`/`useEffect`).

## Démarrer

```bash
cp .env.example .env 2>/dev/null || true   # VITE_API_URL déjà présent dans .env par défaut
npm install
npm run dev   # http://localhost:5173, attend l'API sur http://127.0.0.1:3000
```

## Pages

- `/` — fil des recettes publiées (`FeedPage`)
- `/login`, `/register` — authentification
- `/recipes/:id` — détail (ingrédients, étapes, macros total/portion/100g, like, bouton "Adapter")
- `/recipes/new` — création (recherche d'aliments, macros en aperçu live, étapes)

## Décision : grammes uniquement dans l'UI

Le backend/schéma supporte plusieurs unités (cuillère, verre, portion...) via
`food_unit_equivalences`, mais l'UI de ce MVP ne propose que le gramme — conforme à "l'unité
principale doit être le gramme" (brief §9). Ça évite de dupliquer côté client la logique de
conversion d'unités (déjà gérée serveur), pour un recalcul instantané fiable. Étendre l'UI aux
autres unités est possible plus tard sans changement de schéma.

## Recalcul instantané des macros (`src/lib/macros.ts`)

Miroir volontaire de `backend/src/recipes/macro-calculator.ts` : mêmes formules, en JS pur, pour
recalculer les macros à chaque changement de quantité sans appel réseau (fenêtre d'adaptation,
création de recette). Le serveur reste la seule source de vérité — il recalcule à l'identique à
l'enregistrement à partir des données les plus fraîches de `foods`. Testé manuellement : le total
affiché côté client avant sauvegarde est identique au total renvoyé par l'API après sauvegarde.

## Validé dans un vrai navigateur

Parcours complet testé via les outils de preview (pas juste `tsc`) : inscription → connexion →
création d'une recette avec les 4 ingrédients de l'exemple du brief (recherche CIQUAL réelle,
712,75 kcal cohérent avec le backend) → consultation (total/portion/100g) → like → adaptation
(poulet 250g / riz 70g, recalcul instantané -44,1 kcal identique au calcul serveur) → recette
adaptée visible dans le fil avec badge 🔀 et "adaptée 1 fois" sur l'originale.

**Bug trouvé et corrigé pendant ce test** : `RecipeDetailPage` gardait l'état local `liked` en
mémoire en changeant de recette (React Router ne démonte pas le composant sur un changement de
paramètre d'URL), donc naviguer vers une recette jamais likée affichait à tort "❤️ Aimé" si on
avait liké la précédente. Corrigé en réinitialisant `liked` dans le `useEffect` dépendant de `id`.

Non testé : responsive mobile, accessibilité clavier complète, gestion d'erreurs réseau (perte de
connexion API), authentification Google/Apple/Facebook (hors scope MVP).
