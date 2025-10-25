#!/usr/bin/env bash
set -euo pipefail

echo "==> 0) Vérifs rapides de config"
test -f .dev.vars && echo " .dev.vars OK" || { echo " .dev.vars MANQUANT"; exit 1; }
grep -q "^OPENAI_API_KEY=sk-" .dev.vars && echo " OPENAI_API_KEY présent" || { echo " OPENAI_API_KEY manquant ou invalide"; exit 1; }

echo "==> 1) Vérifier la base D1 (Cloudflare)"
# NB: le nom de binding DOIT correspondre à wrangler.toml [[d1_databases]] name
BINDING=${BINDING:-DB}
echo " Binding D1: $BINDING"
echo " Tables existantes:"
npm run db:ls || true

echo "==> 2) Vérifier les colonnes de collection_items"
wrangler d1 execute "$BINDING" --local --command="PRAGMA table_info(collection_items);" \
  | tee /tmp/cols.txt >/dev/null || true
grep -q "photo_id" /tmp/cols.txt && echo "  photo_id OK" || echo "  photo_id ABSENT"
grep -q "bbox" /tmp/cols.txt && echo "  bbox OK" || echo "  bbox ABSENT"
grep -q "detection_confidence" /tmp/cols.txt && echo "  detection_confidence OK" || echo "  detection_confidence ABSENT"
grep -q "detection_index" /tmp/cols.txt && echo "  detection_index OK" || echo "  detection_index ABSENT"

echo "==> 3) Démarrer le serveur en arrière-plan"
# Adapte si ton script s'appelle différemment (ex: dev:d1)
PORT=${PORT:-3000}
npm run dev:d1 >/tmp/dev.log 2>&1 &
SRV_PID=$!
sleep 2
echo " Serveur PID: $SRV_PID (logs: /tmp/dev.log)"

echo "==> 4) Vérifier l'API"
curl -s "http://localhost:$PORT/api/photos" | grep -q '"success":' \
  && echo " /api/photos OK" \
  || { echo " /api/photos ÉCHEC (voir /tmp/dev.log)"; kill $SRV_PID || true; exit 1; }

echo "==> 5) Tester l'API OpenAI rapidement"
curl -s https://api.openai.com/v1/models \
  -H "Authorization: Bearer $(grep OPENAI_API_KEY .dev.vars | cut -d= -f2)" \
  | grep -q '"data":' && echo " OpenAI reachable OK" || echo " OpenAI ÉCHEC (clé ou réseau)"

echo "==> 6) Tester un upload léger (URL, évite base64)"
curl -s -X POST "http://localhost:$PORT/api/photos/analyze" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://upload.wikimedia.org/wikipedia/commons/6/6e/Golde33443.jpg","maxItems":3}' \
  | grep -q '"success":true' && echo " analyze(url) OK" || echo " analyze(url) ÉCHEC (voir /tmp/dev.log)"

echo "==> 7) Test PAYLOAD_TOO_LARGE (optionnel, illustratif)"
# Pour tester le handling, on envoie un petit base64 simulé
curl -s -X POST "http://localhost:$PORT/api/photos/analyze" \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."}' >/dev/null || true
echo "   -> Si tu vois PAYLOAD_TOO_LARGE, utilise imageUrl ou compresse."

echo "==> 8) Résumé"
echo " - DB & colonnes: vérifiées"
echo " - API /api/photos: OK"
echo " - Appel OpenAI: OK (si indiqué)"
echo " - analyze(imageUrl): OK (si indiqué)"

echo "==> Terminé."
# Laisse le serveur tourner pour inspection, sinon décommente:
# kill $SRV_PID
