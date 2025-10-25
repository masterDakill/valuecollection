import React, { useEffect, useMemo, useState } from 'https://esm.sh/react@18?dev';
import { createRoot } from 'https://esm.sh/react-dom@18/client?dev';
import htm from 'https://esm.sh/htm@3.1.1';
import {
  aliasValue,
  countAboveThreshold,
  createAnalyzePayload,
  formatCurrency,
  normalizeAd,
  normalizeItem,
  normalizePhoto,
  computeDashboardStats,
  shortDate
} from './ui-helpers.mjs';

const html = htm.bind(React.createElement);
const API_BASE = window.__API_BASE__ || '';

const ENDPOINT_LABELS = {
  healthz: 'GET /healthz',
  photos: 'GET /api/photos',
  analyze: 'POST /api/photos/analyze',
  items: 'GET /api/items',
  adsGenerate: 'POST /api/ads/générer',
  adsExport: 'GET /api/ads/export'
};

async function fetchJson(path, options = {}) {
  const headers = Object.assign(
    {
      Accept: 'application/json'
    },
    options.headers || {},
    options.body ? { 'Content-Type': 'application/json' } : {}
  );

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    const errorText = isJson ? JSON.stringify(await response.json()) : await response.text();
    throw new Error(errorText || `HTTP ${response.status}`);
  }

  return isJson ? response.json() : response.text();
}

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  const remove = (id) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  };

  const push = (message, tone = 'info') => {
    const id = crypto.randomUUID();
    setNotifications((current) => [...current, { id, message, tone }]);
    setTimeout(() => remove(id), 5000);
  };

  const view = notifications.map((notification) =>
    html`<div
      key=${notification.id}
      className=${classNames(
        'rounded-lg px-4 py-2 text-sm shadow transition-all',
        notification.tone === 'error' && 'bg-red-100 text-red-800',
        notification.tone === 'success' && 'bg-green-100 text-green-800',
        notification.tone === 'info' && 'bg-blue-100 text-blue-800'
      )}
    >
      ${notification.message}
    </div>`
  );

  return { push, remove, view };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const base64 = result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Format de fichier non supporté'));
      }
    };
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });
}

function EndpointStatusList({ endpointStatus }) {
  const entries = Object.entries(ENDPOINT_LABELS).map(([key, label]) => {
    const status = endpointStatus[key]?.status || 'unknown';
    const message = endpointStatus[key]?.message || null;
    const at = endpointStatus[key]?.checkedAt || null;

    const tone =
      status === 'ok' ? 'text-green-600 bg-green-100' : status === 'error' ? 'text-red-600 bg-red-100' : 'text-slate-600 bg-slate-100';

    return html`<li key=${key} className="flex items-center justify-between rounded-lg border bg-white px-4 py-2">
      <div>
        <p className="text-sm font-medium text-slate-900">${label}</p>
        ${message
          ? html`<p className="text-xs text-red-600">${message}</p>`
          : at
            ? html`<p className="text-xs text-slate-500">Vérifié: ${shortDate(at)}</p>`
            : null}
      </div>
      <span className=${classNames('rounded-full px-3 py-1 text-xs font-semibold', tone)}>
        ${status === 'ok' ? 'OK' : status === 'error' ? 'Erreur' : 'À tester'}
      </span>
    </li>`;
  });

  return html`<ul className="grid gap-3 md:grid-cols-2">${entries}</ul>`;
}

function AnalyzeResultCard({ result }) {
  if (!result) {
    return html`<div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
      Lancez une analyse pour voir les résultats détaillés ici.
    </div>`;
  }

  const smart = result.smart_analysis || {};
  const evaluations = Array.isArray(result.evaluations) ? result.evaluations : [];

  return html`<div className="grid gap-4">
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Résumé IA</h3>
      <div className="mt-3 grid gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Titre détecté</span>
          <span className="font-medium text-slate-900">${aliasValue(smart?.extracted_data || {}, ['title'], '—')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Catégorie</span>
          <span className="font-medium text-slate-900">${smart.category || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Confiance</span>
          <span className="font-medium text-slate-900">${smart.confidence ? `${Math.round(smart.confidence * 100)}%` : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Rareté</span>
          <span className="font-medium capitalize text-slate-900">${smart.estimated_rarity || '—'}</span>
        </div>
      </div>
    </section>

    ${evaluations.length
      ? html`<section className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Sources d'évaluation</h3>
          <div className="mt-3 space-y-3">
            ${evaluations.map((evaluation) =>
              html`<div key=${evaluation.evaluation_source} className="rounded-lg border px-3 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">${evaluation.evaluation_source}</span>
                  <span className="text-slate-600">${formatCurrency(evaluation.estimated_value, evaluation.currency)}</span>
                </div>
                <p className="text-xs text-slate-500">Confiance: ${Math.round((evaluation.confidence_score || 0) * 100)}%</p>
              </div>`
            )}
          </div>
        </section>`
      : null}

    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Payload complet</h3>
      <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-900 p-3 text-xs text-white">${JSON.stringify(result, null, 2)}</pre>
    </section>
  </div>`;
}

function PhotosGrid({ photos, loading, onRefresh }) {
  if (loading) {
    return html`<div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
      Chargement des photos en cours…
    </div>`;
  }

  if (!photos.length) {
    return html`<div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
      Aucune photo enregistrée pour le moment.
      <button className="ml-2 text-blue-600 hover:underline" onClick=${onRefresh}>Rafraîchir</button>
    </div>`;
  }

  return html`<div className="space-y-4">
    <div className="flex justify-end">
      <button className="rounded-lg border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50" onClick=${onRefresh}>
        Rafraîchir
      </button>
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      ${photos.map((photo) =>
        html`<article key=${photo.id} className="rounded-lg border bg-white shadow-sm">
          ${photo.url
            ? html`<img src=${photo.url} alt="Photo analysée" className="h-48 w-full rounded-t-lg object-cover" loading="lazy" />`
            : html`<div className="flex h-48 items-center justify-center rounded-t-lg bg-slate-100 text-slate-400">Aperçu indisponible</div>`}
          <div className="space-y-2 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-900">${photo.source}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">${photo.status}</span>
            </div>
            <p className="text-xs text-slate-500">Analyse: ${shortDate(photo.analyzedAt)}</p>
            <div className="grid gap-1 text-xs text-slate-500">
              <div className="flex items-center justify-between">
                <span>Items détectés</span>
                <span className="font-medium text-slate-900">${photo.detectedItemsCount || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Valeur totale</span>
                <span className="font-medium text-slate-900">${formatCurrency(
                  photo.detectedItemsValue,
                  photo.detectedItemsCurrency
                )}</span>
              </div>
            </div>
            ${photo.detectedItems && photo.detectedItems.length
              ? html`<div className="rounded bg-slate-50 p-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top items</p>
                  <ul className="mt-1 space-y-1">
                    ${photo.detectedItems.slice(0, 3).map(
                      (item) => html`<li className="flex items-center justify-between text-xs">
                        <span className="truncate pr-2 text-slate-700">${item.title}</span>
                        <span className="font-medium text-slate-900">${formatCurrency(
                          item.estimatedValue,
                          item.currency
                        )}</span>
                      </li>`
                    )}
                  </ul>
                </div>`
              : null}
            ${photo.notes ? html`<p className="text-xs text-slate-500">${photo.notes}</p>` : null}
          </div>
        </article>`
      )}
    </div>
  </div>`;
}

function ItemsTable({ items, loading, onRefresh }) {
  if (loading) {
    return html`<div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
      Chargement des items détectés…
    </div>`;
  }

  if (!items.length) {
    return html`<div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
      Aucun item détecté pour le moment.
      <button className="ml-2 text-blue-600 hover:underline" onClick=${onRefresh}>Rafraîchir</button>
    </div>`;
  }

  return html`<div className="space-y-4">
    <div className="flex justify-end">
      <button className="rounded-lg border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50" onClick=${onRefresh}>
        Rafraîchir
      </button>
    </div>
    <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Titre</th>
            <th className="px-4 py-3">Auteur / Artiste</th>
            <th className="px-4 py-3">Catégorie</th>
            <th className="px-4 py-3">Valeur estimée</th>
            <th className="px-4 py-3">Confiance</th>
            <th className="px-4 py-3">Détecté le</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          ${items.map((item) =>
            html`<tr key=${item.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">${item.title}</td>
              <td className="px-4 py-3">${item.author || '—'}</td>
              <td className="px-4 py-3">${item.category || '—'}</td>
              <td className="px-4 py-3">${formatCurrency(item.estimatedValue, item.currency)}</td>
              <td className="px-4 py-3">${item.confidence ? `${Math.round(item.confidence * 100)}%` : '—'}</td>
              <td className="px-4 py-3 text-xs text-slate-500">${shortDate(item.detectedAt)}</td>
            </tr>`
          )}
        </tbody>
      </table>
    </div>
  </div>`;
}

function AdsPanel({ adsState, minValue, setMinValue, onGenerate, onExport }) {
  const { data: ads, loading, error, exporting } = adsState;

  return html`<div className="grid gap-4">
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <form
        className="flex flex-col gap-4 md:flex-row md:items-end"
        onSubmit=${(event) => {
          event.preventDefault();
          onGenerate();
        }}
      >
        <label className="flex flex-1 flex-col text-sm">
          <span className="text-slate-600">Valeur minimale (CAD)</span>
          <input
            type="number"
            min="0"
            value=${minValue}
            onChange=${(event) => setMinValue(Number(event.target.value))}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled=${loading}
          >
            ${loading ? 'Génération…' : 'Générer les annonces'}
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick=${onExport}
            disabled=${exporting}
          >
            ${exporting ? 'Export…' : 'Exporter CSV'}
          </button>
        </div>
      </form>
      ${error ? html`<p className="mt-3 text-sm text-red-600">${error}</p>` : null}
    </div>

    ${loading
      ? html`<div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
          Génération des annonces en cours…
        </div>`
      : ads.length
        ? html`<div className="grid gap-4 md:grid-cols-2">
            ${ads.map((ad) =>
              html`<article key=${ad.id} className="flex h-full flex-col rounded-lg border bg-white p-4 shadow-sm">
                <header className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">${ad.title}</h3>
                    <p className="text-xs uppercase text-slate-500">${ad.platform}</p>
                  </div>
                  <span className="rounded bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    ${formatCurrency(ad.price, ad.currency)}
                  </span>
                </header>
                <p className="mt-3 flex-1 whitespace-pre-line text-sm text-slate-600">${ad.description || '—'}</p>
              </article>`
            )}
          </div>`
        : html`<div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
            Lancez une génération pour voir les annonces.
          </div>`}
  </div>`;
}

function CollectionApp() {
  const [activeTab, setActiveTab] = useState('analyze');
  const [healthState, setHealthState] = useState({ status: 'loading' });
  const [endpointStatus, setEndpointStatus] = useState({});
  const [photosState, setPhotosState] = useState({ data: [], loading: false, error: null });
  const [itemsState, setItemsState] = useState({ data: [], loading: false, error: null });
  const [adsState, setAdsState] = useState({ data: [], loading: false, error: null, exporting: false });
  const [analyzeForm, setAnalyzeForm] = useState({
    imageUrl: '',
    file: null,
    filePreview: null,
    maxItems: 10,
    collectionId: '',
    analyzing: false,
    result: null,
    error: null
  });
  const [minValue, setMinValue] = useState(100);
  const [thresholdValue, setThresholdValue] = useState(500);
  const notifications = useNotifications();

  useEffect(() => {
    checkHealth();
    refreshPhotos();
    refreshItems();
  }, []);

  async function checkHealth() {
    setHealthState({ status: 'loading' });
    try {
      const data = await fetchJson('/healthz');
      setHealthState({ status: 'ok', data });
      setEndpointStatus((current) => ({
        ...current,
        healthz: { status: 'ok', checkedAt: new Date().toISOString() }
      }));
    } catch (error) {
      setHealthState({ status: 'error', error: error.message });
      setEndpointStatus((current) => ({
        ...current,
        healthz: { status: 'error', message: error.message }
      }));
      notifications.push(`Health check en erreur: ${error.message}`, 'error');
    }
  }

  async function refreshPhotos() {
    setPhotosState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await fetchJson('/api/photos');
      const photosArray = Array.isArray(data?.photos) ? data.photos : Array.isArray(data) ? data : [];
      setPhotosState({ data: photosArray.map(normalizePhoto), loading: false, error: null });
      setEndpointStatus((current) => ({
        ...current,
        photos: { status: 'ok', checkedAt: new Date().toISOString() }
      }));
    } catch (error) {
      setPhotosState({ data: [], loading: false, error: error.message });
      setEndpointStatus((current) => ({
        ...current,
        photos: { status: 'error', message: error.message }
      }));
      notifications.push(`Chargement photos: ${error.message}`, 'error');
    }
  }

  async function refreshItems() {
    setItemsState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await fetchJson('/api/items');
      const itemsArray = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setItemsState({ data: itemsArray.map(normalizeItem), loading: false, error: null });
      setEndpointStatus((current) => ({
        ...current,
        items: { status: 'ok', checkedAt: new Date().toISOString() }
      }));
    } catch (error) {
      setItemsState({ data: [], loading: false, error: error.message });
      setEndpointStatus((current) => ({
        ...current,
        items: { status: 'error', message: error.message }
      }));
      notifications.push(`Chargement items: ${error.message}`, 'error');
    }
  }

  async function verifyEndpoints() {
    const updates = {};
    const checks = [
      { key: 'healthz', request: () => fetchJson('/healthz') },
      { key: 'photos', request: () => fetchJson('/api/photos') },
      { key: 'items', request: () => fetchJson('/api/items') },
      {
        key: 'adsExport',
        request: async () => {
          const response = await fetch(`${API_BASE}/api/ads/export`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return true;
        }
      }
    ];

    for (const check of checks) {
      try {
        await check.request();
        updates[check.key] = { status: 'ok', checkedAt: new Date().toISOString() };
      } catch (error) {
        updates[check.key] = { status: 'error', message: error.message };
      }
    }

    setEndpointStatus((current) => ({ ...current, ...updates }));
    notifications.push('Vérification API complétée', 'info');
  }

  async function handleAnalyze(event) {
    event.preventDefault();
    setAnalyzeForm((current) => ({ ...current, analyzing: true, error: null }));

    try {
      let imageBase64 = null;
      if (analyzeForm.file) {
        if (analyzeForm.file.size > 10 * 1024 * 1024) {
          throw new Error('Le fichier dépasse 10MB.');
        }
        imageBase64 = await fileToBase64(analyzeForm.file);
      }

      const payload = createAnalyzePayload({
        imageUrl: analyzeForm.imageUrl,
        imageBase64,
        options: { maxItems: analyzeForm.maxItems, collectionId: analyzeForm.collectionId }
      });

      const data = await fetchJson('/api/photos/analyze', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setAnalyzeForm((current) => ({
        ...current,
        analyzing: false,
        error: null,
        result: data
      }));

      setEndpointStatus((current) => ({
        ...current,
        analyze: { status: 'ok', checkedAt: new Date().toISOString() }
      }));

      notifications.push('Analyse complétée avec succès', 'success');
      refreshPhotos();
      refreshItems();
    } catch (error) {
      setAnalyzeForm((current) => ({ ...current, analyzing: false, error: error.message }));
      setEndpointStatus((current) => ({
        ...current,
        analyze: { status: 'error', message: error.message }
      }));
      notifications.push(`Analyse impossible: ${error.message}`, 'error');
    }
  }

  function handleFileChange(event) {
    const file = event.target.files && event.target.files[0];
    setAnalyzeForm((current) => {
      if (current.filePreview) {
        URL.revokeObjectURL(current.filePreview);
      }
      if (!file) {
        return { ...current, file: null, filePreview: null };
      }
      return { ...current, file, filePreview: URL.createObjectURL(file) };
    });
  }

  function clearFile() {
    setAnalyzeForm((current) => {
      if (current.filePreview) {
        URL.revokeObjectURL(current.filePreview);
      }
      return { ...current, file: null, filePreview: null };
    });
  }

  async function handleGenerateAds() {
    setAdsState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await fetchJson('/api/ads/generate', {
        method: 'POST',
        body: JSON.stringify({ min_value: Number(minValue) || 0 })
      });

      const list = Array.isArray(data?.ads) ? data.ads : Array.isArray(data) ? data : [];
      setAdsState((current) => ({ ...current, loading: false, error: null, data: list.map(normalizeAd) }));
      setEndpointStatus((current) => ({
        ...current,
        adsGenerate: { status: 'ok', checkedAt: new Date().toISOString() }
      }));
      notifications.push('Annonces générées', 'success');
    } catch (error) {
      setAdsState((current) => ({ ...current, loading: false, error: error.message }));
      setEndpointStatus((current) => ({
        ...current,
        adsGenerate: { status: 'error', message: error.message }
      }));
      notifications.push(`Génération annonces: ${error.message}`, 'error');
    }
  }

  async function handleExportAds() {
    setAdsState((current) => ({ ...current, exporting: true }));
    try {
      const response = await fetch(`${API_BASE}/api/ads/export`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `annonces-${new Date().toISOString().slice(0, 19)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setEndpointStatus((current) => ({
        ...current,
        adsExport: { status: 'ok', checkedAt: new Date().toISOString() }
      }));
      notifications.push('Export CSV téléchargé', 'success');
    } catch (error) {
      setEndpointStatus((current) => ({
        ...current,
        adsExport: { status: 'error', message: error.message }
      }));
      notifications.push(`Export impossible: ${error.message}`, 'error');
    } finally {
      setAdsState((current) => ({ ...current, exporting: false }));
    }
  }

  const stats = useMemo(
    () =>
      computeDashboardStats({
        items: itemsState.data,
        photos: photosState.data,
        ads: adsState.data,
        lastAnalysis: analyzeForm.result
      }),
    [itemsState.data, photosState.data, adsState.data, analyzeForm.result]
  );

  const aboveThreshold = useMemo(
    () => countAboveThreshold(itemsState.data, Number(thresholdValue) || 0),
    [itemsState.data, thresholdValue]
  );

  return html`<div className="min-h-screen bg-slate-50">
    <header className="bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Évaluateur de Collection Pro</h1>
          <p className="text-sm text-slate-600">Analyse IA, statistiques et génération d'annonces</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className=${classNames(
              'rounded-full px-3 py-1 text-sm font-medium',
              healthState.status === 'ok' && 'bg-green-100 text-green-700',
              healthState.status === 'error' && 'bg-red-100 text-red-700',
              healthState.status === 'loading' && 'bg-slate-100 text-slate-600'
            )}
          >
            ${healthState.status === 'ok'
              ? 'API en ligne'
              : healthState.status === 'error'
                ? `API indisponible`
                : 'Vérification…'}
          </span>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
            onClick=${checkHealth}
          >
            Rafraîchir statut
          </button>
          <button
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-blue-700"
            onClick=${verifyEndpoints}
          >
            Vérifier API
          </button>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      ${notifications.view.length
        ? html`<div className="fixed right-6 top-6 z-50 space-y-2">${notifications.view}</div>`
        : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Total photos</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">${stats.totalPhotos}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Items détectés</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">${stats.totalItems}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Valeur estimée</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">${formatCurrency(stats.estimatedTotalValue)}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase text-slate-500">≥ Seuil (CAD)</p>
            <input
              type="number"
              min="0"
              value=${thresholdValue}
              onChange=${(event) => setThresholdValue(event.target.value)}
              className="w-20 rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">${aboveThreshold}</p>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">État des endpoints</h2>
        <p className="mt-1 text-xs text-slate-500">Cliquez sur “Vérifier API” pour rafraîchir le statut.</p>
        <div className="mt-3">
          ${html`<${EndpointStatusList} endpointStatus=${endpointStatus} />`}
        </div>
      </section>

      <nav className="flex gap-2">
        ${[
          { key: 'analyze', label: 'Analyser' },
          { key: 'photos', label: 'Photos' },
          { key: 'books', label: 'Livres / Items' },
          { key: 'ads', label: 'Annonces' }
        ].map((tab) =>
          html`<button
            key=${tab.key}
            onClick=${() => setActiveTab(tab.key)}
            className=${classNames(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            )}
          >
            ${tab.label}
          </button>`
        )}
      </nav>

      ${activeTab === 'analyze'
        ? html`<section className="grid gap-4 md:grid-cols-[360px,1fr]">
            <form className="rounded-lg border bg-white p-4 shadow-sm" onSubmit=${handleAnalyze}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">URL d'image</label>
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value=${analyzeForm.imageUrl}
                    onChange=${(event) => setAnalyzeForm((current) => ({ ...current, imageUrl: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Upload</p>
                  <div className="flex gap-2">
                    <input
                      id="file-input"
                      type="file"
                      accept="image/*"
                      onChange=${handleFileChange}
                      className="hidden"
                    />
                    <label
                      for="file-input"
                      className="inline-flex cursor-pointer items-center rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-purple-700"
                    >
                      Choisir un fichier
                    </label>
                    ${analyzeForm.file
                      ? html`<button
                          type="button"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                          onClick=${clearFile}
                        >
                          Effacer
                        </button>`
                      : null}
                  </div>
                  <p className="text-xs text-slate-500">Formats supportés: JPG, PNG (10MB max)</p>
                  ${analyzeForm.filePreview
                    ? html`<img src=${analyzeForm.filePreview} alt="Prévisualisation" className="mt-2 h-40 w-full rounded-lg object-cover" />`
                    : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm">
                    <span className="text-slate-600">Max items</span>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value=${analyzeForm.maxItems}
                      onChange=${(event) => setAnalyzeForm((current) => ({ ...current, maxItems: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-slate-600">Collection ID</span>
                    <input
                      type="text"
                      value=${analyzeForm.collectionId}
                      onChange=${(event) => setAnalyzeForm((current) => ({ ...current, collectionId: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                </div>

                ${analyzeForm.error ? html`<p className="text-sm text-red-600">${analyzeForm.error}</p>` : null}

                <button
                  type="submit"
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled=${analyzeForm.analyzing}
                >
                  ${analyzeForm.analyzing ? 'Analyse en cours…' : 'Analyser la photo'}
                </button>
              </div>
            </form>
            <div className="space-y-4">
              ${html`<${AnalyzeResultCard} result=${analyzeForm.result} />`}
            </div>
          </section>`
        : null}

      ${activeTab === 'photos'
        ? html`<section className="rounded-lg border bg-white p-4 shadow-sm">
            ${html`<${PhotosGrid} photos=${photosState.data} loading=${photosState.loading} onRefresh=${refreshPhotos} />`}
          </section>`
        : null}

      ${activeTab === 'books'
        ? html`<section className="rounded-lg border bg-white p-4 shadow-sm">
            ${itemsState.error ? html`<p className="mb-3 text-sm text-red-600">${itemsState.error}</p>` : null}
            ${html`<${ItemsTable} items=${itemsState.data} loading=${itemsState.loading} onRefresh=${refreshItems} />`}
          </section>`
        : null}

      ${activeTab === 'ads'
        ? html`<section className="rounded-lg border bg-white p-4 shadow-sm">
            ${adsState.error ? html`<p className="mb-3 text-sm text-red-600">${adsState.error}</p>` : null}
            ${html`<${AdsPanel}
              adsState=${adsState}
              minValue=${minValue}
              setMinValue=${setMinValue}
              onGenerate=${handleGenerateAds}
              onExport=${handleExportAds}
            />`}
          </section>`
        : null}
    </main>
  </div>`;
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(html`<${CollectionApp} />`);
}
