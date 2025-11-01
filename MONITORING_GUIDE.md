# 📊 Guide du Système de Monitoring

## 🎯 Vue d'Ensemble

Le système de monitoring suit **en temps réel** l'utilisation de chaque outil/service dans l'application:
- LLMs (OpenAI, Anthropic, Gemini)
- APIs externes (Google Books, eBay, Open Library)
- Scraping (AbeBooks, BookFinder, Amazon)
- Services internes (analyse photos, évaluation, enrichissement)

## 🚀 Installation

### 1. Appliquer la Migration

```bash
./apply-monitoring-migration.sh
```

Ou manuellement:
```bash
wrangler d1 execute DB --local --file=migrations/0005_monitoring_system.sql
```

### 2. Rebuild l'Application

```bash
npm run build
npm run dev:d1
```

## 📡 Routes API

### GET /api/monitoring
Snapshot complet de tous les services (dernières 24h)

**Exemple**:
```bash
curl http://localhost:3000/api/monitoring | python3 -m json.tool
```

**Réponse**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-11-01T05:00:00.000Z",
    "services": {
      "openai": {
        "serviceName": "OpenAI GPT-4",
        "totalCalls": 15,
        "successCalls": 14,
        "failedCalls": 1,
        "totalCostUSD": 0.14,
        "avgResponseTime": 3245,
        "lastUsed": "2025-11-01T04:55:00.000Z",
        "status": "active"
      },
      "gemini": {
        "serviceName": "Google Gemini",
        "totalCalls": 8,
        "successCalls": 7,
        "failedCalls": 1,
        "totalCostUSD": 0.0,
        "avgResponseTime": 4120,
        "lastUsed": "2025-11-01T04:50:00.000Z",
        "status": "active"
      },
      // ... autres services
    },
    "summary": {
      "totalCalls": 45,
      "totalCostUSD": 0.35,
      "successRate": 91.1,
      "avgResponseTime": 2850
    }
  }
}
```

### GET /api/monitoring/:service?hours=24
Historique d'un service spécifique

**Exemple**:
```bash
curl "http://localhost:3000/api/monitoring/OpenAI%20GPT-4?hours=24" | python3 -m json.tool
```

### GET /api/monitoring/stats/summary
Résumé rapide pour dashboard

**Exemple**:
```bash
curl http://localhost:3000/api/monitoring/stats/summary | python3 -m json.tool
```

**Réponse**:
```json
{
  "success": true,
  "summary": {
    "totalCalls": 45,
    "successCalls": 41,
    "successRate": "91.11",
    "totalCost": "0.3500",
    "avgResponseTime": "2850.45"
  },
  "topServices": [
    {"service_name": "OpenAI GPT-4", "calls": 15, "cost": 0.14},
    {"service_name": "Google Gemini", "calls": 8, "cost": 0.0},
    {"service_name": "GPT-4 Vision", "calls": 5, "cost": 0.25}
  ],
  "errorServices": [
    {"service_name": "Anthropic Claude", "errors": 3},
    {"service_name": "eBay Finding API", "errors": 2}
  ]
}
```

## 💡 Utilisation dans le Code

### Exemple: Tracker un Appel de Service

```typescript
import { createMonitoringService } from '../services/monitoring.service';

async function myService(db: D1Database) {
  const monitoring = createMonitoringService(db);
  const startTime = Date.now();

  try {
    // Votre appel API
    const result = await fetch('https://api.example.com/data');
    const data = await result.json();

    // Tracker succès
    await monitoring.trackServiceCall(
      'OpenAI GPT-4',
      true, // success
      Date.now() - startTime, // response time
      0.01, // cost in USD
      { model: 'gpt-4-turbo', tokens: 150 } // optional details
    );

    return data;
  } catch (error) {
    // Tracker échec
    await monitoring.trackServiceCall(
      'OpenAI GPT-4',
      false, // failed
      Date.now() - startTime,
      0.0,
      { error: error.message }
    );

    throw error;
  }
}
```

## 📊 Services Suivis

| Service | Nom dans le système | Coût/appel |
|---------|---------------------|------------|
| **LLMs** | | |
| OpenAI GPT-4 | `OpenAI GPT-4` | $0.01 |
| GPT-4 Vision | `OpenAI GPT-4` | $0.05 |
| Anthropic Claude | `Anthropic Claude` | $0.015 |
| Google Gemini | `Google Gemini` | GRATUIT |
| **APIs** | | |
| Google Books | `Google Books API` | GRATUIT |
| Open Library | `Open Library` | GRATUIT |
| eBay Finding | `eBay Finding API` | GRATUIT |
| **Scraping** | | |
| AbeBooks | `AbeBooks Scraping` | GRATUIT |
| BookFinder | `BookFinder Scraping` | GRATUIT |
| Amazon | `Amazon Scraping` | GRATUIT |
| **Services** | | |
| Analyse photos | `Photo Analysis` | Variable |
| Agrégation prix | `Price Aggregation` | Variable |
| Analyse rareté | `Rarity Analysis` | Variable |
| Enrichissement | `Book Enrichment` | Variable |

## 📈 Métriques Disponibles

### Par Service
- **Total appels**: Nombre total d'appels dans la période
- **Succès**: Nombre d'appels réussis
- **Échecs**: Nombre d'appels échoués
- **Coût total**: Coût cumulé en USD
- **Temps moyen**: Temps de réponse moyen en ms
- **Dernière utilisation**: Timestamp du dernier appel
- **Status**: `active`, `error`, ou `disabled`

### Globales
- **Taux de succès**: Pourcentage de succès global
- **Coût total**: Somme de tous les coûts
- **Temps de réponse moyen**: Moyenne pondérée

## 🎨 Visualisation dans l'Interface

### Dashboard Principal
```
📊 MONITORING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 Résumé (24h)
   Total appels: 45
   Taux succès: 91.1%
   Coût total: $0.35 USD
   Temps moyen: 2.85s

🔥 Top Services
   1. OpenAI GPT-4     (15 appels, $0.14)
   2. Google Gemini    (8 appels, $0.00)
   3. GPT-4 Vision     (5 appels, $0.25)

⚠️ Services en Erreur
   1. Anthropic Claude (3 erreurs)
   2. eBay Finding API (2 erreurs)
```

### Interface Web
Accédez à: **http://localhost:3000#monitoring**

Vous verrez:
- Graphiques en temps réel
- Tableaux détaillés par service
- Historique des 24 dernières heures
- Filtres par service/période

## 🔧 Requêtes SQL Utiles

### Stats Globales
```sql
SELECT * FROM v_service_stats;
```

### Appels des dernières 24h
```sql
SELECT
  service_name,
  COUNT(*) as calls,
  AVG(response_time_ms) as avg_time,
  SUM(cost_usd) as total_cost
FROM service_monitoring
WHERE created_at >= datetime('now', '-24 hours')
GROUP BY service_name
ORDER BY calls DESC;
```

### Services en erreur
```sql
SELECT
  service_name,
  COUNT(*) as errors,
  MAX(created_at) as last_error
FROM service_monitoring
WHERE success = 0
  AND created_at >= datetime('now', '-24 hours')
GROUP BY service_name
ORDER BY errors DESC;
```

### Évolution temporelle
```sql
SELECT
  strftime('%Y-%m-%d %H:00', created_at) as hour,
  COUNT(*) as calls,
  SUM(cost_usd) as cost
FROM service_monitoring
WHERE created_at >= datetime('now', '-24 hours')
GROUP BY hour
ORDER BY hour;
```

## 💰 Estimation des Coûts

### Pour 1 Livre Analysé
```
- Photo analyse (GPT-4 Vision): $0.05
- Enrichissement (APIs): $0.00
- Évaluation rareté (GPT-4): $0.01
- Prix Gemini + Google: $0.00

TOTAL: ~$0.06 par livre
```

### Pour 1000 Livres
```
- Photos analysées: $50
- Évaluations IA: $10
- Prix Google Search: $0 (gratuit)

TOTAL: ~$60 pour 1000 livres
```

## 🧪 Tests

### Test Manuel
```bash
# 1. Trigger une évaluation
curl -X POST http://localhost:3000/api/items/2/evaluate

# 2. Vérifier le monitoring
curl http://localhost:3000/api/monitoring/stats/summary | python3 -m json.tool

# 3. Vérifier les coûts
sqlite3 .wrangler/state/v3/d1/*/valeurcollection.sqlite \
  "SELECT service_name, SUM(cost_usd) as cost FROM service_monitoring GROUP BY service_name;"
```

### Script de Test
```bash
#!/bin/bash
# Test monitoring avec 5 évaluations

for id in 2 3 4 5 6; do
  echo "Évaluation livre #$id..."
  curl -s -X POST "http://localhost:3000/api/items/$id/evaluate" > /dev/null
  sleep 2
done

echo ""
echo "📊 Statistiques:"
curl -s http://localhost:3000/api/monitoring/stats/summary | python3 -m json.tool
```

## 🐛 Dépannage

### Problème: Aucune donnée dans le monitoring
**Solution**: Vérifier que la migration est appliquée
```bash
wrangler d1 execute DB --local --command="SELECT COUNT(*) FROM service_monitoring;"
```

### Problème: Coûts à 0
**Cause**: Le tracking n'est pas encore intégré dans tous les services
**Solution**: Attendre l'intégration complète (prochaine version)

### Problème: Données anciennes
**Solution**: Les stats sont sur 24h par défaut. Pour voir plus:
```bash
curl "http://localhost:3000/api/monitoring/OpenAI%20GPT-4?hours=168" # 7 jours
```

## 📚 Exemples d'Utilisation

### 1. Surveiller les Coûts en Temps Réel
```bash
watch -n 5 "curl -s http://localhost:3000/api/monitoring/stats/summary | python3 -c \"import sys,json;d=json.load(sys.stdin);print(f'Coût: {d[\\\"summary\\\"][\\\"totalCost\\\"]} USD')\""
```

### 2. Alertes sur Erreurs
```bash
# Vérifier toutes les 5 minutes
while true; do
  errors=$(curl -s http://localhost:3000/api/monitoring/stats/summary | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d.get('errorServices',[])))")

  if [ "$errors" -gt 0 ]; then
    echo "⚠️ ALERTE: $errors service(s) en erreur!"
  fi

  sleep 300
done
```

### 3. Rapport Journalier
```bash
#!/bin/bash
# Génère un rapport quotidien

echo "📊 RAPPORT QUOTIDIEN - $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

summary=$(curl -s http://localhost:3000/api/monitoring/stats/summary)

echo "$summary" | python3 <<EOF
import json, sys
data = json.load(sys.stdin)
s = data['summary']
print(f"Appels totaux: {s['totalCalls']}")
print(f"Taux succès: {s['successRate']}%")
print(f"Coût total: \${s['totalCost']} USD")
print(f"Temps moyen: {s['avgResponseTime']}ms")
print("")
print("Services les plus utilisés:")
for svc in data.get('topServices', [])[:3]:
    print(f"  - {svc['service_name']}: {svc['calls']} appels")
EOF
```

## 🎯 Prochaines Étapes

1. **Auto-tracking**: Intégrer automatiquement dans tous les services
2. **Alertes**: Notifications si taux d'erreur > 10%
3. **Export**: CSV/JSON des statistiques
4. **Graphiques**: Charts.js pour visualisation
5. **Prédictions**: Estimer coûts futurs basés sur tendance

---

**Système de Monitoring - Prêt à utiliser!** 🚀
