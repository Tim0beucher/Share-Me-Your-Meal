# Accéder à l'app depuis un mobile (dev local)

Le PC et le mobile doivent être sur le **même réseau** (même Wi-Fi / routeur).

1. Démarrer le backend et le frontend normalement (`npm run start:dev` / `npm run dev`).
2. Trouver l'IP locale du PC : `Get-NetIPAddress -AddressFamily IPv4` (PowerShell) ou `ipconfig`,
   ligne "Adresse IPv4" de l'interface active (Wi-Fi ou Ethernet). Exemple : `192.168.1.23`.
3. Sur le mobile, ouvrir un navigateur et aller sur `http://<IP-DU-PC>:5173`.

## Ce qui a été configuré pour que ça marche

- **Vite** (`frontend/vite.config.ts`) écoute sur `host: true` (toutes les interfaces), pas
  seulement `localhost` — sinon le serveur refuse les connexions venant d'un autre appareil.
- **NestJS** (`backend/src/main.ts`) écoute explicitement sur `0.0.0.0` pour la même raison.
- **L'URL de l'API côté frontend** (`frontend/src/api/client.ts`) se déduit automatiquement de
  l'hôte utilisé pour charger la page (`window.location.hostname`) au lieu d'être figée à
  `127.0.0.1`. Résultat : que la page soit ouverte via `localhost:5173` (PC) ou
  `192.168.1.23:5173` (mobile), elle appelle la bonne API (`localhost:3000` ou
  `192.168.1.23:3000`) sans configuration manuelle. Pour forcer une URL d'API différente
  (déploiement séparé plus tard), définir `VITE_API_URL` dans `frontend/.env`.
- **Pare-feu Windows** : une règle existante autorise déjà `node.exe` en entrée sur le profil
  réseau actif ("Public"). Rien à changer ici — vérifié via
  `Get-NetFirewallRule -DisplayName "Node.js JavaScript Runtime"`. Si ce n'était pas le cas ou si
  le profil réseau change, il faudrait une règle `New-NetFirewallRule` pour les ports 3000/5173.

## Limites de cette configuration

- **IP locale non figée** : si le PC change de réseau ou renouvelle son bail DHCP, l'IP peut
  changer — refaire l'étape 2.
- **Accessible uniquement sur le même réseau local**, pas depuis Internet (normal pour du dev ;
  un vrai accès distant demanderait un tunnel — ngrok, Cloudflare Tunnel — ou un déploiement).
- **CORS actuellement ouvert à tout domaine** (`app.enableCors()` sans restriction) pour
  simplifier le dev multi-appareils ; à restreindre à l'origine du frontend avant toute mise en
  production.
