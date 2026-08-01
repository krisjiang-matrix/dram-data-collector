import {
  detectInflectionPointsWithDates,
  filterSignificantPoints,
} from "./inflectionPoints.js";

const DATA_URL = "data/dram_prices.jsonl";

const state = {
  snapshots: [],
  category: "ALL",
  selectedItem: null,
  chart: null,
};

const categoryColor = {
  DDR5: "#8b5cf6",
  DDR4: "#3b82f6",
  DDR3: "#64748b",
};

function categoryOf(item) {
  if (item.includes("DDR5")) return "DDR5";
  if (item.includes("DDR4")) return "DDR4";
  if (item.includes("DDR3")) return "DDR3";
  return "DDR4";
}

function fmtUsd(v) {
  return "$" + v.toFixed(2);
}

function fmtPct(v) {
  return (v >= 0 ? "▲ " : "▼ ") + Math.abs(v).toFixed(2) + "%";
}

function renderLastUpdate() {
  const el = document.getElementById("lastUpdate");
  if (state.snapshots.length === 0) {
    el.textContent = "No data yet";
    return;
  }
  const last = state.snapshots[state.snapshots.length - 1];
  el.textContent = `${last.date} · ${last.publishedAt.replace(/\(GMT\+8\)/, "").trim()}`;
}

function renderFilters() {
  const filterEl = document.getElementById("categoryFilters");
  const cats = ["ALL", "DDR5", "DDR4", "DDR3"];

  filterEl.innerHTML = "";
  for (const cat of cats) {
    const btn = document.createElement("button");
    btn.className = `chip active cat-${cat.toLowerCase()}`;
    btn.textContent = cat === "ALL" ? "All" : cat;
    btn.dataset.cat = cat;
    btn.addEventListener("click", () => {
      state.category = cat;
      renderFilters();
      renderLatest();
    });
    if (state.category !== cat) {
      btn.className = "chip";
      if (cat === "DDR5") btn.classList.add("cat-ddr5");
      if (cat === "DDR4") btn.classList.add("cat-ddr4");
      if (cat === "DDR3") btn.classList.add("cat-ddr3");
    }
    filterEl.appendChild(btn);
  }
}

function renderLatest() {
  const tbody = document.getElementById("latestRows");
  if (state.snapshots.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">No data yet — the first collection runs daily via GitHub Actions.</td></tr>`;
    return;
  }

  const latest = state.snapshots[state.snapshots.length - 1];
  const filtered = latest.prices.filter(
    (p) => state.category === "ALL" || p.category === state.category
  );

  tbody.innerHTML = filtered
    .map(
      (p) => `
      <tr>
        <td class="item">${p.item}</td>
        <td class="num">${fmtUsd(p.dailyHigh)}</td>
        <td class="num">${fmtUsd(p.dailyLow)}</td>
        <td class="num">${fmtUsd(p.sessionHigh)}</td>
        <td class="num">${fmtUsd(p.sessionLow)}</td>
        <td class="num avg">${fmtUsd(p.sessionAverage)}</td>
        <td class="num change ${
          p.sessionChange > 0 ? "up" : p.sessionChange < 0 ? "down" : "flat"
        }">${fmtPct(p.sessionChange)}</td>
      </tr>`
    )
    .join("");

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">No ${state.category} items in the latest snapshot.</td></tr>`;
  }
}

function renderItemFilters() {
  const el = document.getElementById("itemFilters");
  const items = [];

  for (const snap of state.snapshots) {
    for (const p of snap.prices) {
      if (state.category === "ALL" || p.category === state.category) {
        if (!items.some((i) => i.item === p.item)) {
          items.push({ item: p.item, category: p.category });
        }
      }
    }
  }

  if (!state.selectedItem && items.length > 0) {
    state.selectedItem = items[0].item;
  }
  if (state.selectedItem && !items.some((i) => i.item === state.selectedItem)) {
    state.selectedItem = items[0]?.item ?? null;
  }

  el.innerHTML = "";
  for (const it of items) {
    const btn = document.createElement("button");
    const cat = it.category;
    const base = `chip cat-${cat.toLowerCase()}`;
    btn.className = state.selectedItem === it.item ? `chip active ${base}` : `chip ${base}`;
    btn.textContent = it.item;
    btn.addEventListener("click", () => {
      state.selectedItem = it.item;
      renderItemFilters();
      renderChart();
    });
    el.appendChild(btn);
  }
}

function collectSeries(item) {
  const points = [];
  for (const snap of state.snapshots) {
    const p = snap.prices.find((x) => x.item === item);
    if (p) {
      points.push({
        date: snap.date,
        value: p.sessionAverage,
        high: p.sessionHigh,
        low: p.sessionLow,
      });
    }
  }
  return points;
}

function renderChart() {
  const canvas = document.getElementById("priceChart");
  const emptyEl = document.getElementById("chartEmpty");
  const wrap = document.querySelector(".chart-wrap");

  if (!state.selectedItem) {
    wrap.classList.add("hidden");
    emptyEl.textContent = "Select an item to view price trends.";
    emptyEl.style.display = "";
    return;
  }

  const series = collectSeries(state.selectedItem);
  if (series.length < 3) {
    wrap.classList.add("hidden");
    emptyEl.textContent = "Not enough historical data for this item yet.";
    emptyEl.style.display = "";
    return;
  }

  emptyEl.style.display = "none";
  wrap.classList.remove("hidden");

  const dates = series.map((s) => s.date);
  const averages = series.map((s) => s.value);

  const inflectionPoints = detectInflectionPointsWithDates(
    series.map((s, i) => ({ value: s.value, date: i }))
  );
  const significant = filterSignificantPoints(inflectionPoints, 2, 0.5);

  const peakLabels = significant.filter((p) => p.type === "peak");
  const valleyLabels = significant.filter((p) => p.type === "valley");

  const config = {
    type: "line",
    data: {
      labels: dates,
      datasets: [
        {
          label: "Session Average",
          data: averages,
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139, 92, 246, 0.08)",
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: true, labels: { boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: (ctx) => ` $${ctx.parsed.y.toFixed(2)}`,
          },
        },
        annotation: undefined,
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } },
        y: {
          grid: { color: "#eef2f7" },
          ticks: { callback: (v) => "$" + v.toFixed(2) },
        },
      },
    },
  };

  // Add inflection point markers as scatter datasets on the same scale.
  if (peakLabels.length > 0) {
    config.data.datasets.push({
      type: "scatter",
      label: "Peaks",
      data: peakLabels.map((p) => ({ x: dates[p.index], y: p.value })),
      pointBackgroundColor: "#ef4444",
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
      pointRadius: 5,
    });
  }
  if (valleyLabels.length > 0) {
    config.data.datasets.push({
      type: "scatter",
      label: "Valleys",
      data: valleyLabels.map((p) => ({ x: dates[p.index], y: p.value })),
      pointBackgroundColor: "#10b981",
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
      pointRadius: 5,
    });
  }

  if (state.chart) {
    state.chart.destroy();
  }
  state.chart = new Chart(canvas, config);

  document.getElementById("peakCount").textContent = peakLabels.length;
  document.getElementById("valleyCount").textContent = valleyLabels.length;
  document.getElementById("dataPointCount").textContent = series.length;
}

async function loadData() {
  try {
    const resp = await fetch(DATA_URL, { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    state.snapshots = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.error("Failed to load data:", err);
    document.getElementById("latestRows").innerHTML =
      `<tr><td colspan="7" class="empty">Could not load data/dram_prices.jsonl — the first collection may not have run yet.</td></tr>`;
    return;
  }

  renderLastUpdate();
  renderFilters();
  renderLatest();
  renderItemFilters();
  renderChart();
}

loadData();
