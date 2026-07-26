/**
 * Speaking Analysis — static SPA shell
 * Hash routes: #/  |  #/session/<slug>
 * Data: data/index.json, data/sessions/<slug>.json
 */

(function () {
  "use strict";

  const root = document.getElementById("view-root");
  const headerMeta = document.getElementById("header-meta");

  let catalogCache = null;

  const TIER_RANK = { rookie: 1, "pretty good": 2, natural: 3 };

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parseRoute() {
    const hash = (location.hash || "#/").replace(/^#/, "") || "/";
    const parts = hash.split("/").filter(Boolean);

    if (parts.length === 0) {
      return { name: "home" };
    }
    if (parts[0] === "session" && parts[1]) {
      return { name: "session", slug: decodeURIComponent(parts[1]) };
    }
    return { name: "home" };
  }

  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) {
      throw new Error(`Failed to load ${path} (${res.status})`);
    }
    return res.json();
  }

  async function loadCatalog() {
    if (catalogCache) return catalogCache;
    catalogCache = await fetchJson("data/index.json");
    return catalogCache;
  }

  function setLoading(msg) {
    root.innerHTML = `<div class="state-panel">${escapeHtml(msg || "Loading…")}</div>`;
  }

  function setError(msg) {
    root.innerHTML = `<div class="state-panel error">${escapeHtml(msg)}</div>`;
  }

  function statusBadge(status) {
    const s = (status || "full").toLowerCase();
    const label = s === "provisional" ? "provisional" : "full";
    return `<span class="badge ${label}">${escapeHtml(label)}</span>`;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return escapeHtml(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function updateHeaderMeta(catalog) {
    if (!catalog) {
      headerMeta.textContent = "";
      return;
    }
    const count = catalog.sessionCount ?? (catalog.sessions || []).length;
    const gen = catalog.generated ? formatDate(catalog.generated) : "—";
    headerMeta.innerHTML = `${count} session${count === 1 ? "" : "s"} · updated ${gen}`;
  }

  function scoreBar(label, value, max = 5) {
    const n = Math.max(0, Math.min(max, Number(value) || 0));
    const pct = (n / max) * 100;
    return `
      <div class="score-row">
        <span class="score-label">${escapeHtml(label)}</span>
        <div class="score-track" aria-hidden="true"><div class="score-fill" style="width:${pct}%"></div></div>
        <span class="score-num">${n}/${max}</span>
      </div>`;
  }

  function tierClass(tier) {
    const t = String(tier || "").toLowerCase();
    if (t === "natural") return "tier-natural";
    if (t === "pretty good") return "tier-pretty";
    return "tier-rookie";
  }

  function renderLevels(levels) {
    if (!levels || typeof levels !== "object") return "";
    const channels = ["voice", "body", "words"];
    const cells = channels
      .map((ch) => {
        const tier = levels[ch] || "—";
        return `
          <div class="level-cell ${tierClass(tier)}">
            <span class="level-channel">${escapeHtml(ch)}</span>
            <span class="level-tier">${escapeHtml(tier)}</span>
          </div>`;
      })
      .join("");
    return `
      <section class="levels-block">
        <p class="section-label">Communication levels</p>
        <div class="level-grid">${cells}</div>
      </section>`;
  }

  function renderTopFixes(topFixes) {
    const items = Array.isArray(topFixes) ? topFixes : [];
    if (items.length === 0) return "";
    const lis = items
      .map((item, i) => {
        const rank = item.rank || i + 1;
        const fix = item.fix || "";
        const problem = item.problem || "";
        const instead = item.instead || "";
        const drill = item.drill || "";
        return `
          <li class="focus-card">
            <span class="focus-num">${String(rank).padStart(2, "0")}</span>
            <div class="focus-body">
              <h3>${escapeHtml(fix)}</h3>
              ${problem ? `<p class="focus-why">${escapeHtml(problem)}</p>` : ""}
              ${instead ? `<p class="focus-drill"><strong>Instead:</strong> ${escapeHtml(instead)}</p>` : ""}
              ${drill ? `<p class="focus-why">${escapeHtml(drill)}</p>` : ""}
            </div>
          </li>`;
      })
      .join("");
    return `
      <section class="focus-block">
        <p class="section-label">Top fixes</p>
        <h2>Highest-leverage changes</h2>
        <ol class="focus-list">${lis}</ol>
      </section>`;
  }

  function renderFocus(focusNext) {
    const items = Array.isArray(focusNext) ? focusNext : [];
    if (items.length === 0) return "";
    const lis = items
      .map((item, i) => {
        const title = typeof item === "string" ? item : item.title || item.focus || "";
        const why = typeof item === "object" ? item.why || "" : "";
        const drill = typeof item === "object" ? item.drill || "" : "";
        const concepts = typeof item === "object" && Array.isArray(item.concepts) ? item.concepts : [];
        const chips = concepts
          .map((c) => `<span class="concept-chip">${escapeHtml(c)}</span>`)
          .join("");
        return `
          <li class="focus-card">
            <span class="focus-num">${String(i + 1).padStart(2, "0")}</span>
            <div class="focus-body">
              <h3>${escapeHtml(title)}</h3>
              ${why ? `<p class="focus-why">${escapeHtml(why)}</p>` : ""}
              ${drill ? `<p class="focus-drill">${escapeHtml(drill)}</p>` : ""}
              ${chips ? `<div class="concept-chips">${chips}</div>` : ""}
            </div>
          </li>`;
      })
      .join("");
    return `
      <section class="focus-block">
        <p class="section-label">Focus next</p>
        <h2>Practice priorities</h2>
        <ol class="focus-list">${lis}</ol>
      </section>`;
  }

  function renderScores(scores) {
    if (!scores) return "";
    const layers = scores.layers || {};
    const bars = ["structure", "delivery", "authority"]
      .filter((k) => layers[k] != null)
      .map((k) => {
        const entry = layers[k];
        const val = typeof entry === "object" ? entry.score : entry;
        return scoreBar(k, val);
      })
      .join("");
    const notes = ["structure", "delivery", "authority"]
      .map((k) => {
        const entry = layers[k];
        if (!entry || typeof entry !== "object" || !entry.note) return "";
        return `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(entry.note)}</li>`;
      })
      .filter(Boolean)
      .join("");

    return `
      <section class="scores-block">
        <p class="section-label">Rubric scores</p>
        <div class="score-bars">${bars}</div>
        ${notes ? `<ul class="score-notes">${notes}</ul>` : ""}
        ${renderLevels(scores.levels)}
      </section>`;
  }

  function youtubeEmbed(videoId) {
    if (!videoId) return "";
    return `
      <div class="video-embed">
        <iframe
          src="https://www.youtube.com/embed/${escapeHtml(videoId)}"
          title="Speaking sample"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          loading="lazy"
        ></iframe>
      </div>`;
  }

  function overallHint(session) {
    const levels = session.scores?.levels || {};
    const ranks = Object.values(levels)
      .map((t) => TIER_RANK[String(t).toLowerCase()] || 0)
      .filter(Boolean);
    if (ranks.length === 0) return "";
    const avg = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    if (avg < 1.6) return "rookie-leaning";
    if (avg < 2.4) return "building pretty-good";
    return "natural-leaning";
  }

  function renderCatalog(catalog, query) {
    const sessions = Array.isArray(catalog.sessions) ? catalog.sessions : [];
    updateHeaderMeta(catalog);

    const q = (query || "").trim().toLowerCase();
    const filtered = q
      ? sessions.filter((s) => {
          const hay = [s.title, s.context, s.summary, s.slug, s.date, s.status]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        })
      : sessions;

    const sorted = [...filtered].sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || ""))
    );

    if (sessions.length === 0) {
      root.innerHTML = `
        <section class="catalog-hero">
          <h1>Speaking analysis</h1>
          <p>YouTube speaking samples scored against your wiki communication OS.</p>
        </section>
        <div class="empty-archive">
          <h2>No sessions yet</h2>
          <p>Run <code>python scripts/sync_speaking_analysis.py</code> after adding a session.</p>
        </div>
      `;
      return;
    }

    const cards = sorted
      .map((s, i) => {
        const delay = Math.min(i * 0.03, 0.35);
        const focus0 =
          Array.isArray(s.focusPreview) && s.focusPreview[0]
            ? `<p class="summary">Next: ${escapeHtml(s.focusPreview[0])}</p>`
            : s.summary
              ? `<p class="summary">${escapeHtml(s.summary)}</p>`
              : "";
        return `
        <li>
          <a class="report-card" href="#/session/${encodeURIComponent(s.slug)}" style="animation-delay:${delay}s">
            <div class="report-card-top">
              <span class="report-card-meta">${escapeHtml(formatDate(s.date))}</span>
              ${statusBadge(s.status)}
            </div>
            <h2>${escapeHtml(s.title || s.slug)}</h2>
            ${s.context ? `<p class="topic">${escapeHtml(s.context)}</p>` : ""}
            ${focus0}
          </a>
        </li>`;
      })
      .join("");

    root.innerHTML = `
      <section class="catalog-hero">
        <h1>Speaking analysis</h1>
        <p>Interview and talk samples scored with Structure, Delivery, Authority, and Communication Levels from your wiki.</p>
      </section>
      <div class="search-row">
        <input
          type="search"
          class="search-input"
          id="catalog-search"
          placeholder="Search title, context, summary…"
          value="${escapeHtml(query || "")}"
          autocomplete="off"
          spellcheck="false"
        />
        <span class="filter-chip" id="result-count">${sorted.length} / ${sessions.length}</span>
      </div>
      ${
        sorted.length === 0
          ? `<p class="no-results">No sessions match “${escapeHtml(query)}”.</p>`
          : `<ul class="report-list">${cards}</ul>`
      }
    `;

    const input = document.getElementById("catalog-search");
    if (input) {
      input.focus({ preventScroll: true });
      const caret = input.value.length;
      input.setSelectionRange(caret, caret);
      input.addEventListener("input", () => {
        renderCatalog(catalog, input.value);
      });
    }
  }

  function renderSession(session) {
    headerMeta.textContent = session.context || session.date || "";
    const hint = overallHint(session);

    root.innerHTML = `
      <a class="back-link" href="#/">← All sessions</a>
      <article class="report-view">
        <header class="report-hero">
          ${youtubeEmbed(session.video_id)}
          <div class="report-kicker">
            ${statusBadge(session.status)}
            <span class="date">${escapeHtml(formatDate(session.date))}</span>
            ${session.context ? `<span class="topic-label">${escapeHtml(session.context)}</span>` : ""}
            ${hint ? `<span class="topic-label">${escapeHtml(hint)}</span>` : ""}
          </div>
          <h1>${escapeHtml(session.title || session.slug)}</h1>
          ${session.summary ? `<p class="report-lede">${escapeHtml(session.summary)}</p>` : ""}
          ${
            session.url
              ? `<p class="video-link"><a href="${escapeHtml(session.url)}" rel="noopener" target="_blank">Open on YouTube</a></p>`
              : ""
          }
        </header>

        ${renderScores(session.scores)}
        ${renderTopFixes(session.top_fixes || session.scores?.top_fixes)}
        ${renderFocus(session.focus_next || session.scores?.focus_next)}

        <section class="synthesis">
          <p class="section-label">Analysis</p>
          <div class="synthesis-body">${session.analysisHtml || "<p>No analysis available.</p>"}</div>
        </section>
      </article>
    `;
  }

  async function showHome() {
    setLoading("Loading sessions…");
    try {
      const catalog = await loadCatalog();
      renderCatalog(catalog, "");
    } catch (err) {
      console.error(err);
      setError("Could not load data/index.json. Is the archive synced?");
      headerMeta.textContent = "";
    }
  }

  async function showSession(slug) {
    setLoading("Loading session…");
    try {
      const session = await fetchJson(`data/sessions/${encodeURIComponent(slug)}.json`);
      renderSession(session);
    } catch (err) {
      console.error(err);
      setError(`Session “${slug}” not found.`);
      headerMeta.textContent = "";
    }
  }

  async function route() {
    const r = parseRoute();
    document.title =
      r.name === "session" ? `${r.slug} · Speaking Analysis` : "Speaking Analysis";

    if (r.name === "session") {
      await showSession(r.slug);
    } else {
      await showHome();
    }
  }

  window.addEventListener("hashchange", () => {
    route();
  });

  if (!location.hash || location.hash === "#") {
    location.replace("#/");
  }

  route();
})();
