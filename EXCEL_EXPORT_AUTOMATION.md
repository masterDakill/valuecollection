# Automatisation Export Excel/CSV - ValueCollection

**Date:** 2025-11-01  
**Objectif:** Enregistrer automatiquement les résultats d'analyse dans Excel/CSV  
**Intégration:** Application ValueCollection existante

---

## 🎯 Objectif

Automatiser l'export des données d'analyse de livres vers un fichier Excel (`valuecollection.xlsx`) avec:
- Ajout automatique après chaque analyse
- Structure cohérente
- Compatible Excel/Numbers/Google Sheets

---

## 🏗️ Architecture Proposée

### Option 1: Intégration DirecteAppli (Recommandé)
**Avantage:** Natif, rapide, pas de dépendance externe

### Option 2: GenSpark AI Agent
**Avantage:** Automatisation avancée, orchestration

### Option 3: Webhook + Make.com
**Avantage:** Flexibilité, multiples intégrations

---

## ✅ Option 1: Export Natif dans ValueCollection

### A. Créer le Service d'Export

**Fichier:** `src/services/excel-export.service.ts`

```typescript
import * as XLSX from 'xlsx';

export interface ExcelRow {
  Date: string;
  Titre: string;
  Auteur: string;
  Editeur: string;
  Annee: number | null;
  ISBN: string;
  Etat: string;
  Estimation_CAD: number | null;
  Source: string;
  URL: string;
  Photo: string;
  Confiance: number;
  Notes: string;
}

export class ExcelExportService {
  private filePath = '/data/valuecollection.xlsx';

  /**
   * Ajouter une ligne au fichier Excel
   */
  async addRow(data: Partial<ExcelRow>): Promise<void> {
    try {
      let workbook: XLSX.WorkBook;
      let worksheet: XLSX.WorkSheet;

      // Vérifier si le fichier existe
      if (await this.fileExists()) {
        // Charger le fichier existant
        const file = await this.readFile();
        workbook = XLSX.read(file, { type: 'buffer' });
        worksheet = workbook.Sheets[workbook.SheetNames[0]];
      } else {
        // Créer nouveau workbook
        workbook = XLSX.utils.book_new();
        worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Analyses');
      }

      // Préparer les données
      const row: ExcelRow = {
        Date: new Date().toISOString().split('T')[0],
        Titre: data.Titre || '',
        Auteur: data.Auteur || '',
        Editeur: data.Editeur || '',
        Annee: data.Annee || null,
        ISBN: data.ISBN || '',
        Etat: data.Etat || '',
        Estimation_CAD: data.Estimation_CAD || null,
        Source: data.Source || 'Analyse IA',
        URL: data.URL || '',
        Photo: data.Photo || '',
        Confiance: data.Confiance || 0,
        Notes: data.Notes || ''
      };

      // Ajouter la ligne
      XLSX.utils.sheet_add_json(worksheet, [row], { 
        origin: -1, 
        skipHeader: false 
      });

      // Sauvegarder
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      await this.writeFile(buffer);

      console.log('✅ Données ajoutées à valuecollection.xlsx');
    } catch (error) {
      console.error('❌ Erreur export Excel:', error);
      throw error;
    }
  }

  /**
   * Exporter toutes les analyses existantes
   */
  async exportAll(items: any[]): Promise<Buffer> {
    const rows: ExcelRow[] = items.map(item => ({
      Date: item.created_at?.split('T')[0] || '',
      Titre: item.title || '',
      Auteur: item.artist_author || '',
      Editeur: item.publisher_label || '',
      Annee: item.year || null,
      ISBN: item.isbn || '',
      Etat: item.condition || '',
      Estimation_CAD: item.estimated_value || null,
      Source: 'Base de données',
      URL: item.external_url || '',
      Photo: item.image_url || '',
      Confiance: item.confidence || 0,
      Notes: item.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Analyses');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Exporter en CSV
   */
  async exportCSV(items: any[]): Promise<string> {
    const rows = items.map(item => ({
      Date: item.created_at?.split('T')[0] || '',
      Titre: item.title || '',
      Auteur: item.artist_author || '',
      Editeur: item.publisher_label || '',
      Annee: item.year || '',
      ISBN: item.isbn || '',
      Etat: item.condition || '',
      Estimation_CAD: item.estimated_value || '',
      Source: 'Base de données',
      URL: item.external_url || '',
      Photo: item.image_url || '',
      Confiance: item.confidence || 0,
      Notes: item.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    return XLSX.utils.sheet_to_csv(worksheet);
  }

  private async fileExists(): Promise<boolean> {
    // Implémenter selon l'environnement (Cloudflare R2, local, etc.)
    return false;
  }

  private async readFile(): Promise<Buffer> {
    // Implémenter selon l'environnement
    return Buffer.from([]);
  }

  private async writeFile(buffer: Buffer): Promise<void> {
    // Implémenter selon l'environnement
  }
}
```

### B. Ajouter les Routes d'Export

**Fichier:** `src/routes/export.ts`

```typescript
import { Hono } from 'hono';
import { ExcelExportService } from '../services/excel-export.service';

const export_routes = new Hono();
const excelService = new ExcelExportService();

// Export manuel de tous les items
export_routes.get('/export/excel', async (c) => {
  try {
    const db = c.env.DB;
    
    // Récupérer tous les items
    const { results } = await db.prepare(`
      SELECT * FROM collection_items 
      ORDER BY created_at DESC
    `).all();

    const buffer = await excelService.exportAll(results);

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="valuecollection.xlsx"'
      }
    });
  } catch (error) {
    return c.json({ error: 'Export failed' }, 500);
  }
});

// Export CSV
export_routes.get('/export/csv', async (c) => {
  try {
    const db = c.env.DB;
    
    const { results } = await db.prepare(`
      SELECT * FROM collection_items 
      ORDER BY created_at DESC
    `).all();

    const csv = await excelService.exportCSV(results);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="valuecollection.csv"'
      }
    });
  } catch (error) {
    return c.json({ error: 'Export failed' }, 500);
  }
});

// Export automatique après analyse
export_routes.post('/export/auto-add', async (c) => {
  try {
    const data = await c.req.json();
    
    await excelService.addRow({
      Titre: data.title,
      Auteur: data.author,
      Editeur: data.publisher,
      Annee: data.year,
      ISBN: data.isbn,
      Etat: data.condition,
      Estimation_CAD: data.estimated_value,
      Source: 'Analyse IA',
      Confiance: data.confidence,
      Notes: data.notes
    });

    return c.json({ 
      success: true, 
      message: '✅ Données ajoutées à valuecollection.xlsx' 
    });
  } catch (error) {
    return c.json({ error: 'Failed to add row' }, 500);
  }
});

export default export_routes;
```

### C. Installer la Dépendance

```bash
npm install xlsx
npm install --save-dev @types/xlsx
```

### D. Intégrer dans l'Application

**Fichier:** `src/index.tsx`

```typescript
import export_routes from './routes/export';

// ... existing code ...

app.route('/api', export_routes);
```

---

## ✅ Option 2: GenSpark AI Agent

### A. Configuration du Spark

**Nom:** 💾 Enregistreur Excel ValueCollection

**Prompt:**

```
Tu es un agent spécialisé dans l'enregistrement automatique de données d'analyse de livres.

TÂCHE:
- Recevoir des données d'analyse au format JSON
- Les enregistrer dans un fichier Excel nommé `valuecollection.xlsx`
- Chemin: `/data/valuecollection.xlsx`

COLONNES (ordre exact):
1. Date (format YYYY-MM-DD)
2. Titre
3. Auteur
4. Éditeur
5. Année
6. ISBN
7. État
8. Estimation_CAD
9. Source
10. URL
11. Photo
12. Confiance
13. Notes

COMPORTEMENT:
- Si le fichier n'existe pas: créer avec en-têtes
- Si le fichier existe: ajouter ligne à la fin
- Champs manquants: laisser vide
- Toujours répondre: "✅ Données ajoutées à valuecollection.xlsx (ligne X)"

TECHNOLOGIES:
- Node.js: utiliser librairie 'xlsx'
- Python: utiliser 'pandas' ou 'openpyxl'

EXEMPLE ENTRÉE:
{
  "Titre": "Art of D&D",
  "Auteur": "Jeff Easley",
  "Éditeur": "TSR",
  "Année": 1985,
  "Estimation_CAD": 120,
  "Confiance": 0.95
}

EXEMPLE SORTIE:
✅ Données ajoutées à valuecollection.xlsx (ligne 42)
Titre: Art of D&D | Auteur: Jeff Easley | Valeur: 120 CAD
```

### B. Code du Spark (Node.js)

```javascript
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = '/data/valuecollection.xlsx';

async function addToExcel(data) {
  let workbook;
  let worksheet;
  
  // Vérifier si fichier existe
  if (fs.existsSync(EXCEL_PATH)) {
    workbook = XLSX.readFile(EXCEL_PATH);
    worksheet = workbook.Sheets[workbook.SheetNames[0]];
  } else {
    // Créer nouveau fichier
    workbook = XLSX.utils.book_new();
    worksheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Analyses');
  }
  
  // Préparer la ligne
  const row = {
    Date: new Date().toISOString().split('T')[0],
    Titre: data.Titre || '',
    Auteur: data.Auteur || '',
    Editeur: data.Editeur || '',
    Annee: data.Annee || null,
    ISBN: data.ISBN || '',
    Etat: data.Etat || '',
    Estimation_CAD: data.Estimation_CAD || null,
    Source: data.Source || 'Analyse IA',
    URL: data.URL || '',
    Photo: data.Photo || '',
    Confiance: data.Confiance || 0,
    Notes: data.Notes || ''
  };
  
  // Ajouter
  XLSX.utils.sheet_add_json(worksheet, [row], { origin: -1 });
  
  // Sauvegarder
  XLSX.writeFile(workbook, EXCEL_PATH);
  
  // Compter les lignes
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const lineNumber = range.e.r + 1;
  
  return `✅ Données ajoutées à valuecollection.xlsx (ligne ${lineNumber})
Titre: ${row.Titre} | Auteur: ${row.Auteur} | Valeur: ${row.Estimation_CAD} CAD`;
}

// Export pour GenSpark
module.exports = { addToExcel };
```

### C. Webhook d'Intégration

**Dans votre application ValueCollection:**

```typescript
// Après une analyse réussie
async function onAnalysisComplete(item: CollectionItem) {
  // Envoyer à GenSpark
  const response = await fetch('https://genspark.ai/api/webhook/YOUR_SPARK_ID', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Titre: item.title,
      Auteur: item.artist_author,
      Editeur: item.publisher_label,
      Annee: item.year,
      ISBN: item.isbn,
      Etat: item.condition,
      Estimation_CAD: item.estimated_value,
      Confiance: item.confidence
    })
  });
  
  const result = await response.json();
  console.log(result.message);
}
```

---

## ✅ Option 3: Export Manuel avec Bouton UI

### A. Ajouter Bouton dans l'Interface

**Fichier:** `src/index.tsx` (dans la section UI)

```jsx
<button 
  onclick="exportToExcel()"
  class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
>
  📥 Exporter vers Excel
</button>

<script>
async function exportToExcel() {
  try {
    const response = await fetch('/api/export/excel');
    const blob = await response.blob();
    
    // Télécharger
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'valuecollection.xlsx';
    a.click();
    
    alert('✅ Export Excel réussi!');
  } catch (error) {
    alert('❌ Erreur export: ' + error.message);
  }
}
</script>
```

---

## 📊 Structure du Fichier Excel Généré

```
| Date       | Titre        | Auteur      | Éditeur | Année | ISBN          | État      | Estimation_CAD | Source      | URL | Photo | Confiance | Notes |
|------------|--------------|-------------|---------|-------|---------------|-----------|----------------|-------------|-----|-------|-----------|-------|
| 2025-11-01 | Art of D&D   | Jeff Easley | TSR     | 1985  | 978-0880380    | Très bon  | 120.00         | Analyse IA  | ... | ...   | 0.95      | ...   |
| 2025-11-01 | Player's HB  | Gary Gygax  | TSR     | 1978  | 978-0935696    | Bon       | 250.00         | Analyse IA  | ... | ...   | 0.88      | ...   |
```

---

## 🚀 Installation et Utilisation

### 1. Installer les Dépendances

```bash
cd /path/to/valuecollection
npm install xlsx
npm install --save-dev @types/xlsx
```

### 2. Créer les Fichiers

- `src/services/excel-export.service.ts`
- `src/routes/export.ts`

### 3. Intégrer dans l'App

Ajouter les routes dans `src/index.tsx`

### 4. Tester

```bash
# Export manuel
curl http://localhost:3001/api/export/excel -o valuecollection.xlsx

# Ou via l'interface
# Cliquer sur "Exporter vers Excel"
```

---

## 💡 Recommandation

**Pour ValueCollection, je recommande Option 1 (Natif) car:**
- ✅ Pas de dépendance externe
- ✅ Fonctionne offline
- ✅ Plus rapide
- ✅ Meilleur contrôle
- ✅ Déjà dans l'architecture Cloudflare

**GenSpark AI Agent (Option 2) est utile si:**
- Vous voulez orchestrer plusieurs workflows
- Vous avez besoin d'intelligence supplémentaire
- Vous voulez combiner avec d'autres services

---

## 📝 Prochaines Étapes

1. Choisir l'option (1, 2 ou 3)
2. Installer les dépendances
3. Créer les fichiers de service
4. Tester l'export
5. Ajouter bouton UI (optionnel)

**Voulez-vous que je génère les fichiers complets prêts à utiliser pour votre projet?**
