# PLUG ART

Application PLUG ART — dashboard, radar d’opportunités artistiques et agent PLUGY.

## Railway

Start command: `uvicorn app_extra_v60:app --host 0.0.0.0 --port $PORT`

Healthcheck: `/api/health`

Site de production : https://plug-art-live-production.up.railway.app/

Révision interface : `210.20261023.1` (V210). Les routes `/api/v202/smoke` et `/api/health` contrôlent le serveur ; les parcours navigateur sont vérifiés dans la CI.

## V210 : vitesse et fiabilité

- Tableau de bord : statistiques prioritaires affichées avant les requêtes secondaires, listes secondaires réactualisées lorsque nécessaire.
- Bouton Actualiser : rafraîchit le dashboard visible et précise les échecs partiels sans écraser les données déjà affichées.
- Retour sur l’onglet : révalidation conditionnelle après 3 minutes, sans rafraîchissement continuel en arrière-plan.
- Radar : quatre zones de recherche conservées, deux appels IA externes simultanés maximum, suspension temporaire des recherches automatiques après une erreur fournisseur 429.
- Validation : `tests/frontend/v210-performance.mjs` et les suites historiques du Studio, du Radar, du Bureau et de l’interface mobile.
- Le temps de chargement réseau complet dépend toujours du terminal et de la connexion ; les latences CI ne sont pas des garanties de production.
