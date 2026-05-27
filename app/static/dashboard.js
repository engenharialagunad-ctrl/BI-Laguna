const COLORS = ["#39a66f", "#f0b84f", "#4a6fa5", "#9b6dd8", "#d86d6d"];
const state = {
  category: "",
  source: "",
  sources: [],
  categories: []
};

function numberValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function display(value) {
  return value === undefined || value === null || value === "" ? "-" : value;
}

function formatNumber(value, digits = 2) {
  const parsed = numberValue(value);
  return parsed.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatInteger(value) {
  return Math.round(numberValue(value)).toLocaleString("pt-BR");
}

function safe(value) {
  return String(display(value))
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderKpis(charts) {
  const kpis = charts.kpis || [];
  return `<section class="kpis">${kpis.map((item) => `
    <div class="kpi">
      <span>${safe(item.label)}</span>
      <strong>${safe(item.value)}</strong>
    </div>
  `).join("")}</section>`;
}

function renderProductionKpis(data) {
  const indicators = data.indicators || {};
  const period = indicators.periodLabel || (
    indicators.periodStart || indicators.periodEnd
      ? `${display(indicators.periodStart)} a ${display(indicators.periodEnd)}`
      : "-"
  );
  const cards = [
    { label: "Periodo de apontamento", value: period },
    { label: "Total de barras", value: formatNumber(indicators.totalBars) },
    { label: "Total de cortes", value: formatInteger(indicators.totalCuts) }
  ];

  return `<section class="kpis production-kpis">${cards.map((item) => `
    <div class="kpi">
      <span>${safe(item.label)}</span>
      <strong>${safe(item.value)}</strong>
    </div>
  `).join("")}</section>`;
}

function renderFilters(payload) {
  const categories = state.categories.length ? state.categories : (payload.categories || []);
  const sources = state.sources.length ? state.sources : (payload.sources || []);
  const visibleSources = state.category
    ? sources.filter((source) => source.category === state.category)
    : sources;

  return `
    <section class="filters">
      <label>
        <span>Categoria</span>
        <select id="categoryFilter">
          <option value="">Todas as categorias</option>
          ${categories.map((category) => `<option value="${safe(category)}" ${category === state.category ? "selected" : ""}>${safe(category)}</option>`).join("")}
        </select>
      </label>
      <label>
        <span>Origem</span>
        <select id="sourceFilter">
          <option value="">Todas as origens</option>
          ${visibleSources.map((source) => `<option value="${safe(source.key)}" ${source.key === state.source ? "selected" : ""}>${safe(source.name)} (${safe(source.category)})</option>`).join("")}
        </select>
      </label>
    </section>
  `;
}

function attachFilters() {
  const categoryFilter = document.getElementById("categoryFilter");
  const sourceFilter = document.getElementById("sourceFilter");
  if (categoryFilter) {
    categoryFilter.addEventListener("change", () => {
      state.category = categoryFilter.value;
      state.source = "";
      loadData();
    });
  }
  if (sourceFilter) {
    sourceFilter.addEventListener("change", () => {
      state.source = sourceFilter.value;
      loadData();
    });
  }
}

function renderBars(title, rows, limit = 12) {
  const sorted = [...(rows || [])].sort((a, b) => numberValue(b.value) - numberValue(a.value)).slice(0, limit);
  const max = sorted.reduce((highest, item) => Math.max(highest, numberValue(item.value)), 0);
  const content = sorted.map((item) => {
    const percent = max > 0 ? Math.max(3, Math.round((numberValue(item.value) / max) * 100)) : 0;
    return `
      <div class="bar-row">
        <div>${safe(item.label)}</div>
        <div class="track"><div class="fill" style="width:${percent}%"></div></div>
        <strong>${safe(formatNumber(item.value))}</strong>
      </div>
    `;
  }).join("");
  return `<div class="panel"><h2>${title}</h2><div class="bars">${content || "Sem dados."}</div></div>`;
}

function renderClientBars(rows) {
  const sorted = [...(rows || [])].sort((a, b) => numberValue(b.value) - numberValue(a.value));
  const max = sorted.reduce((highest, item) => Math.max(highest, numberValue(item.value)), 0);
  const content = sorted.map((item) => {
    const percent = max > 0 ? Math.max(3, Math.round((numberValue(item.value) / max) * 100)) : 0;
    return `
      <div class="client-bar">
        <div class="client-bar__label">
          <strong>${safe(item.label)}</strong>
          <span>${formatInteger(item.cuts)} cortes</span>
        </div>
        <div class="track"><div class="fill" style="width:${percent}%"></div></div>
        <div class="client-bar__value">${safe(formatNumber(item.value))}</div>
      </div>
    `;
  }).join("");
  return `<div class="panel panel-large"><h2>Barras processadas por cliente</h2><div class="client-bars">${content || "Sem dados."}</div></div>`;
}

function renderDonut(title, rows) {
  const data = rows || [];
  const total = data.reduce((sum, item) => sum + numberValue(item.value), 0);
  let start = 0;
  const segments = data.map((item, index) => {
    const degrees = total > 0 ? (numberValue(item.value) / total) * 360 : 0;
    const segment = `${COLORS[index % COLORS.length]} ${start}deg ${start + degrees}deg`;
    start += degrees;
    return segment;
  });
  const legend = data.map((item, index) => `
    <div class="legend-item">
      <span class="swatch" style="background:${COLORS[index % COLORS.length]}"></span>
      <span>${safe(item.label)}: <strong>${safe(item.value)}</strong></span>
    </div>
  `).join("");
  return `
    <div class="panel">
      <h2>${title}</h2>
      <div class="donut-wrap">
        <div class="donut" style="background:conic-gradient(${segments.join(",")})"></div>
        <div class="legend">${legend || "Sem dados."}</div>
      </div>
    </div>
  `;
}

function renderTable(title, headers, rows, fields) {
  return `
    <div class="panel">
      <h2>${title}</h2>
      <div class="table-wrap">
        <table>
          <thead><tr>${headers.map((header) => `<th>${safe(header)}</th>`).join("")}</tr></thead>
          <tbody>
            ${(rows || []).map((row) => `
              <tr>${fields.map((field) => `<td>${safe(row[field])}</td>`).join("")}</tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderClientProductionTable(rows) {
  const sorted = [...(rows || [])].sort((a, b) => numberValue(b.totalBars) - numberValue(a.totalBars));
  const tableRows = sorted.map((row) => ({
    client: row.client,
    sourceCategory: row.sourceCategory,
    totalCuts: formatInteger(row.totalCuts),
    totalBars: formatNumber(row.totalBars)
  }));
  return renderTable(
    "Listagem por cliente",
    ["Categoria", "Cliente", "Cortes", "Barras"],
    tableRows,
    ["sourceCategory", "client", "totalCuts", "totalBars"]
  );
}

function render(payload) {
  const app = document.getElementById("app");
  if (!payload.ok) {
    app.innerHTML = `<div class="status">${safe(payload.message)}\n\n${safe(payload.diagnostic)}</div>`;
    return;
  }

  const data = payload.data || {};
  const charts = payload.charts || {};
  app.innerHTML = `
    <header class="topbar">
      <div>
        <div class="brand">BI Laguna</div>
        <div class="subtle">Atualizado em ${safe(payload.generatedAt)} | Recebido em ${safe(payload.receivedAt)}</div>
      </div>
      <div class="subtle">${safe(payload.sources?.length || 0)} origem(ns)</div>
    </header>
    <section class="content">
      ${renderFilters(payload)}
      ${renderProductionKpis(data)}
      <section class="single-grid">
        ${renderClientBars(charts.clientBars)}
        ${renderClientProductionTable(data.clientSummary)}
      </section>
    </section>
  `;
  attachFilters();
}

function buildDataUrl() {
  const params = new URLSearchParams();
  if (state.category) params.set("category", state.category);
  if (state.source) params.set("source", state.source);
  const query = params.toString();
  return query ? `/api/data?${query}` : "/api/data";
}

function loadData() {
  return fetch(buildDataUrl())
    .then((response) => response.json())
    .then(render)
    .catch((error) => {
      document.getElementById("app").innerHTML = `<div class="status">Erro ao carregar dados: ${safe(error.message)}</div>`;
    });
}

fetch("/api/sources")
  .then((response) => response.json())
  .then((payload) => {
    state.sources = payload.sources || [];
    state.categories = payload.categories || [];
    return loadData();
  })
  .catch((error) => {
    document.getElementById("app").innerHTML = `<div class="status">Erro ao carregar dados: ${safe(error.message)}</div>`;
  });
