# PLUG ART

Application PLUG ART — dashboard, radar d’opportunités artistiques et agent PLUGY.

## Railway

Start command: `uvicorn app_extra_v60:app --host 0.0.0.0 --port $PORT`

Healthcheck: `/api/health`

Site de production : https://plug-art-live-production.up.railway.app/

Révision interface : `202.20261003.3`. Les routes `/api/v202/smoke` et `/api/health` contrôlent le serveur ; les parcours navigateur sont vérifiés dans la CI.
