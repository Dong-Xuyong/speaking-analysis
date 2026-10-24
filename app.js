/**
 * Speaking Coach Analysis — static SPA shell
 * Hash routes: #/  |  #/session/<slug>
 * Data: data/index.json, data/sessions/<slug>.json
 * Practice state: localStorage key speaking-coach-practice (see coach.js)
 */

(function () {
  "use strict";

  const root = document.getElementById("view-root");
  const headerMeta = document.getElementById("header-meta");
  const APP_NAME = "Speaking Coach Analysis";

  let catalogCache = null;
  let detailCache = new Map();
  let loadedSessions = [];
  let homeQuery = "";
  let chartSeriesId = "all";

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
    return window.PrivateData.json(path);
  }

  async function loadCatalog() {
    if (catalogCache) return catalogCache;
    catalogCache = await fetchJson("data/index.json");
    return catalogCache;
  }

  function setLoading(msg) {
    root.innerHTML = `<div class="state-panel dx-card">${escapeHtml(msg || "Loading…")}</div>`;
  }

  function setError(msg) {
    root.innerHTML = `<div class="state-panel error dx-card">${escapeHtml(msg)}</div>`;
  }

  function statusBadge(status) {
    const s = (status || "full").toLowerCase();
    const label = s === "provisional" ? "provisional" : "full";
    return `<span class="badge ${label}">${escapeHtml(label)}</span>`;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim());
    const d = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(iso);
    if (Number.isNaN(d.getTime())) return escapeHtml(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function shortDate(iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    if (!match) return "";
    const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function formatScore(n) {
    if (n == null || !Number.isFinite(n)) return "—";
    const rounded = Math.round(n * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function updateHeaderMeta(text) {
    headerMeta.textContent = text || "";
  }

  function catalogStats(catalog) {
    const sessions = Array.isArray(catalog.sessions) ? catalog.sessions : [];
    const count = catalog.sessionCount ?? sessions.length;
    const full = sessions.filter((s) => (s.status || "full").toLowerCase() !== "provisional").length;
    const gen = catalog.generated
      ? new Date(catalog.generated).toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : "—";
    return { sessions, count, full, gen };
  }

  function renderHero(catalog, lede) {
    const { count, full, gen } = catalogStats(catalog);
    return `
      <section class="learning-hero" aria-labelledby="learning-title">
        <div class="hero-topline">
          <span class="eyebrow">Speaking archive</span>
        </div>
        <h1 id="learning-title">${escapeHtml(APP_NAME)}</h1>
        <p>${escapeHtml(lede)}</p>
        <div class="status-stats">
          <div>
            <strong>${count}</strong>
            <span>Session${count === 1 ? "" : "s"}</span>
          </div>
          <div>
            <strong>${full}</strong>
            <span>Full</span>
          </div>
          <div>
            <strong>${escapeHtml(gen)}</strong>
            <span>Updated</span>
          </div>
        </div>
      </section>`;
  }

  function sectionHead(eyebrow, title) {
    return `
      <div class="section-heading">
        <div>
          <span class="eyebrow">${escapeHtml(eyebrow)}</span>
          <h2>${escapeHtml(title)}</h2>
        </div>
      </div>`;
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
        ${sectionHead("Communication levels", "Voice, body, words")}
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
        ${sectionHead("Top fixes", "Highest-leverage changes")}
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
        ${sectionHead("Focus next", "Practice priorities")}
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
        ${sectionHead("Rubric scores", "Structure, delivery, authority")}
        <div class="score-bars">${bars}</div>
        ${notes ? `<ul class="score-notes">${notes}</ul>` : ""}
      </section>
      ${renderLevels(scores.levels)}`;
  }

  function youtubeEmbed(videoId) {
    if (!videoId) return "";
    return `
      <div class="video-embed">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${escapeHtml(videoId)}"
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

  function coachApi() {
    return window.SpeakingCoach || null;
  }

  function tipButton(id, label) {
    return `<button type="button" class="info-tip" aria-expanded="false" aria-controls="${escapeHtml(id)}" aria-label="Wiki source for ${escapeHtml(label)}">ⓘ</button>`;
  }

  function tipPop(id, why, sources) {
    const cites = (sources || [])
      .map(
        (src) => `
        <li class="tip-cite">
          <span class="tip-title">${escapeHtml(src.title)}</span>
          <code>${escapeHtml(src.path)}</code>
        </li>`
      )
      .join("");
    return `
      <div class="tip-pop" id="${escapeHtml(id)}" role="note" hidden>
        <p class="tip-why">${escapeHtml(why)}</p>
        <ul class="tip-cites">${cites}</ul>
      </div>`;
  }

  function chartSeries(agg) {
    const Coach = coachApi();
    const points = agg.timeline.filter((p) => p.date);
    const series = [
      {
        id: "overall",
        label: "Overall",
        scale: "score",
        values: points.map((p) => p.overall),
      },
    ];
    (Coach ? Coach.SKILLS : []).forEach((skill) => {
      series.push({
        id: skill.id,
        label: skill.label,
        scale: "score",
        values: points.map((p) => (p.skills ? p.skills[skill.id] : null)),
      });
      if (skill.id === "vocal") {
        (Coach.VOCAL_PARTS || []).forEach((part) => {
          series.push({
            id: part.id,
            label: part.label,
            scale: "score",
            values: points.map((p) => (p.subs ? p.subs[part.id] : null)),
          });
        });
      }
    });
    if (points.some((p) => p.wpm != null)) {
      series.push({
        id: "wpm",
        label: "Pace (WPM)",
        scale: "auto",
        values: points.map((p) => p.wpm),
      });
    }
    if (points.some((p) => p.fillerRate != null)) {
      series.push({
        id: "fillerRate",
        label: "Filler rate",
        scale: "auto",
        values: points.map((p) => p.fillerRate),
      });
    }
    return { points, series };
  }

  function activeSeries(pack) {
    if (chartSeriesId === "all") {
      return pack.series.filter((s) => s.scale === "score" && s.values.some((v) => v != null));
    }
    const one = pack.series.find((s) => s.id === chartSeriesId);
    return one ? [one] : pack.series.slice(0, 1);
  }

  function renderLineChart(pack) {
    const shown = activeSeries(pack);
    const dates = pack.points.map((p) => p.date);
    if (!dates.length || !shown.length || !shown.some((s) => s.values.some((v) => v != null))) {
      const focused = shown.length === 1 ? shown[0] : null;
      if (focused && (focused.id === "volume" || focused.id === "endingPitch" || focused.id === "vocal")) {
        return `<p class="chart-empty">${escapeHtml(focused.label)} is not recorded on these sessions.</p>`;
      }
      return `<p class="chart-empty">No scored sessions yet. A voice memo with no transcript or scores still counts toward the streak.</p>`;
    }

    const w = 360;
    const h = 188;
    const pad = { l: 34, r: 12, t: 14, b: 32 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const times = dates.map((d) => {
      const parts = d.split("-").map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
    });
    const t0 = Math.min.apply(null, times);
    const t1 = Math.max.apply(null, times);
    const xAt = (i) =>
      t1 === t0 ? pad.l + innerW / 2 : pad.l + (innerW * (times[i] - t0)) / (t1 - t0);

    const auto = shown.some((s) => s.scale === "auto");
    let yMin = 0;
    let yMax = 5;
    if (auto) {
      const vals = shown.flatMap((s) => s.values.filter((v) => v != null && Number.isFinite(v)));
      yMin = Math.min.apply(null, vals);
      yMax = Math.max.apply(null, vals);
      if (yMin === yMax) {
        yMin -= 1;
        yMax += 1;
      }
      const span = yMax - yMin || 1;
      yMin -= span * 0.15;
      yMax += span * 0.15;
    }
    const yAt = (v) => pad.t + innerH * (1 - (v - yMin) / (yMax - yMin || 1));

    const gridVals = auto ? [yMin, (yMin + yMax) / 2, yMax] : [0, 2.5, 5];
    const grid = gridVals
      .map((v) => {
        const y = yAt(v);
        const label = auto ? (Math.round(v * 10) / 10).toString() : String(v);
        return `
          <line class="grid" x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}"></line>
          <text class="axis" x="${pad.l - 6}" y="${y + 3}" text-anchor="end">${escapeHtml(label)}</text>`;
      })
      .join("");

    const lines = shown
      .map((series) => {
        const segs = [];
        let cur = [];
        series.values.forEach((v, i) => {
          if (v == null || !Number.isFinite(v)) {
            if (cur.length) segs.push(cur);
            cur = [];
          } else {
            cur.push(i);
          }
        });
        if (cur.length) segs.push(cur);
        const polys = segs
          .map((seg) => {
            const pts = seg.map((i) => `${xAt(i).toFixed(1)},${yAt(series.values[i]).toFixed(1)}`).join(" ");
            return `<polyline class="chart-line s-${escapeHtml(series.id)}" pathLength="1" points="${pts}"></polyline>`;
          })
          .join("");
        const dots = series.values
          .map((v, i) => {
            if (v == null || !Number.isFinite(v)) return "";
            return `<circle class="chart-dot s-${escapeHtml(series.id)}" cx="${xAt(i).toFixed(1)}" cy="${yAt(v).toFixed(1)}" r="3.5"><title>${escapeHtml(series.label)} ${escapeHtml(formatScore(v))} · ${escapeHtml(shortDate(dates[i]))}</title></circle>`;
          })
          .join("");
        return polys + dots;
      })
      .join("");

    const labelIdx = dates.length <= 4 ? dates.map((_, i) => i) : [0, dates.length - 1];
    const xLabels = labelIdx
      .map((i) => {
        const anchor = i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle";
        const x = i === 0 ? pad.l : i === dates.length - 1 ? w - pad.r : xAt(i);
        return `<text class="axis x" x="${x}" y="${h - 8}" text-anchor="${anchor}">${escapeHtml(shortDate(dates[i]))}</text>`;
      })
      .join("");

    const summary = shown
      .map((s) => {
        const vals = s.values.filter((v) => v != null);
        if (!vals.length) return "";
        return `${s.label} ${formatScore(vals[vals.length - 1])}`;
      })
      .filter(Boolean)
      .join(", ");

    return `
      <svg class="chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Progress chart. ${escapeHtml(summary)}">
        ${grid}
        ${lines}
        ${xLabels}
      </svg>`;
  }

  function chartCaption(agg, pack) {
    const scored = agg.timeline.filter((p) => p.scored);
    if (!scored.length) {
      return "Audio-only memos count toward the streak. Scores show up here after a session is analysed.";
    }
    const hasWpm = agg.timeline.some((p) => p.wpm != null);
    const hasFiller = agg.timeline.some((p) => p.fillerRate != null);
    const missing = [];
    if (!hasWpm) missing.push("pace in words per minute");
    if (!hasFiller) missing.push("filler-word rate");
    const tail = missing.length
      ? ` ${missing[0].charAt(0).toUpperCase()}${missing.join(" and ").slice(1)} will plot when a session records them. Until then, pace and filler words follow the delivery score.`
      : "";
    const shown = activeSeries(pack);
    const focus = shown[0];
    let delta = "";
    if (focus && chartSeriesId !== "all") {
      const vals = focus.values.filter((v) => v != null && Number.isFinite(v));
      if (vals.length >= 2) {
        const change = Math.round((vals[vals.length - 1] - vals[0]) * 10) / 10;
        const sign = change > 0 ? "+" : "";
        delta = ` ${focus.label} ${sign}${change} from the first scored session.`;
      }
    }
    const vocalNote = agg.timeline.some((p) => p.subs && (p.subs.volume != null || p.subs.endingPitch != null))
      ? ""
      : " Volume and ending pitch are not recorded on these sessions.";
    return `Overall averages structure, delivery, and authority. Clarity blends structure with the words tier; vocal delivery averages the volume and ending-pitch scores that were recorded; storytelling blends authority with the words tier.${vocalNote}${tail}${delta}`;
  }

  function renderChartCard(agg) {
    const pack = chartSeries(agg);
    const chips = [{ id: "all", label: "All" }]
      .concat(pack.series.map((s) => ({ id: s.id, label: s.label })))
      .map((chip) => {
        const pressed = chip.id === chartSeriesId ? "true" : "false";
        return `<button type="button" class="chart-chip" data-chart="${escapeHtml(chip.id)}" aria-pressed="${pressed}">${escapeHtml(chip.label)}</button>`;
      })
      .join("");
    return `
      <section class="chart-card" aria-labelledby="chart-title">
        <div class="section-heading">
          <div>
            <span class="eyebrow">Progress</span>
            <h2 id="chart-title">Scores over time</h2>
          </div>
        </div>
        <div class="chart-chips" role="group" aria-label="Chart metric">${chips}</div>
        <div class="chart-frame">${renderLineChart(pack)}</div>
        <ul class="chart-legend">
          ${activeSeries(pack)
            .map(
              (s) =>
                `<li><span class="swatch s-${escapeHtml(s.id)}" aria-hidden="true"></span>${escapeHtml(s.label)}</li>`
            )
            .join("")}
        </ul>
        <p class="chart-note">${escapeHtml(chartCaption(agg, pack))}</p>
      </section>`;
  }

  function renderSkillCards(summary) {
    const cards = summary
      .map((skill) => {
        const missing = skill.avg == null;
        const pct = missing ? 0 : Math.max(0, Math.min(100, (skill.avg / 5) * 100));
        const tier = missing ? "not recorded" : skill.tier || "—";
        const tierCss = missing ? "tier-unscored" : tierClass(skill.tier);
        const meta = missing
          ? ""
          : `${formatScore(skill.avg)} avg · ${skill.samples} session${skill.samples === 1 ? "" : "s"}`;
        const parts = (skill.parts || [])
          .map((part) => {
            const partText = part.avg == null ? "not recorded" : `${formatScore(part.avg)} · ${part.tier}`;
            return `
              <p class="skill-sub">
                <span>${escapeHtml(part.label)}</span>
                <span>${escapeHtml(partText)}</span>
                ${tipButton("tip-part-" + part.id, part.label)}
              </p>
              ${tipPop("tip-part-" + part.id, part.why, part.sources)}`;
          })
          .join("");
        return `
          <article class="skill-card" data-skill="${escapeHtml(skill.id)}">
            <div class="skill-card-top">
              <h3>${escapeHtml(skill.label)}</h3>
              ${tipButton("tip-skill-" + skill.id, skill.label)}
            </div>
            <p class="skill-tier ${tierCss}">${escapeHtml(tier)}</p>
            <div class="score-track" aria-hidden="true"><div class="score-fill" style="width:${pct}%"></div></div>
            ${meta ? `<p class="skill-meta">${escapeHtml(meta)}</p>` : ""}
            ${parts}
            <p class="skill-hint">${escapeHtml(skill.hint)}</p>
            ${tipPop("tip-skill-" + skill.id, skill.why, skill.sources)}
          </article>`;
      })
      .join("");
    return cards;
  }

  function renderBadges(badges, mechanic) {
    const items = badges
      .map((badge) => {
        const state = badge.earned ? "is-earned" : "is-locked";
        return `
          <li class="badge-item ${state}">
            <div class="badge-copy">
              <strong>${escapeHtml(badge.label)}</strong>
              <span>${escapeHtml(badge.detail)}</span>
            </div>
            ${tipButton("tip-badge-" + badge.id, badge.label)}
            ${tipPop("tip-badge-" + badge.id, badge.why, badge.sources)}
          </li>`;
      })
      .join("");
    return `
      <section class="badges-block" aria-labelledby="badges-title">
        <div class="tip-wrap">
          <div class="section-heading">
            <div>
              <span class="eyebrow">Habits logged</span>
              <h2 id="badges-title">Badges</h2>
            </div>
            ${tipButton("tip-badges", mechanic.label)}
          </div>
          ${tipPop("tip-badges", mechanic.why, mechanic.sources)}
        </div>
        <ul class="badge-list">${items}</ul>
      </section>`;
  }

  function renderCoach(sessions) {
    const Coach = coachApi();
    if (!Coach) return "";
    const today = Coach.todayIso();
    const state = Coach.loadState();
    const collected = Coach.collectPracticeDays(sessions, state);
    const streak = Coach.currentStreak(collected.days, today);
    const best = Coach.bestStreak(collected.days);
    const logged = Object.keys(collected.days).length;
    const windowCount = Coach.countInWindow(collected.days, today, 21);
    const audioDays = Object.keys(collected.audioDays);
    const audioWindow = Coach.maxInAnyWindow(collected.audioDays, 7);
    const agg = Coach.aggregate(sessions);
    const week = Coach.challengeForDate(today);
    const challenge = week.challenge;
    const challengeOn = Coach.challengeDone(state, week.week.id, challenge.id);
    const practisedToday = !!collected.days[today];
    const dots = Coach.lastDays(today, 7)
      .map((iso) => {
        const on = collected.days[iso] ? " is-on" : "";
        const now = iso === today ? " is-today" : "";
        return `
          <li>
            <span class="day-dot${on}${now}" title="${escapeHtml(iso)}"></span>
            <span class="day-label">${escapeHtml(Coach.weekdayInitial(iso))}</span>
          </li>`;
      })
      .join("");
    const monday = (() => {
      const parts = today.split("-").map(Number);
      const dt = new Date(parts[0], parts[1] - 1, parts[2]);
      const day = dt.getDay() || 7;
      dt.setDate(dt.getDate() - day + 1);
      return Coach.todayIso(dt);
    })();
    const sunday = Coach.addDays(monday, 6);
    const tiers = agg.summary.map((s) => s.tier).filter(Boolean);
    const badges = Coach.evaluateBadges({
      audioDayCount: audioDays.length,
      audioWindow: audioWindow,
      practiceDayCount: logged,
      completed: Coach.completedChallengeIds(state),
      pauseRestartClean: Coach.whiteSpaceEarned(state, sessions),
      tiers: tiers,
    });
    const weekRestarts = challenge.id === "pause-restart" ? Coach.restartsInWeek(sessions, week.week.id) : null;
    const restartLine =
      challenge.id === "pause-restart"
        ? weekRestarts == null
          ? "Restarts this week: not recorded. Each repeated opening is a miss."
          : `Restarts this week: ${weekRestarts}. Each one is a miss.`
        : "";
    const checkLabel = practisedToday ? "Practised today" : "I practised today";

    return `
      <section class="coach-panel" id="coach-panel" aria-label="Practice">
        <article class="streak-card">
          <div class="tip-wrap">
            <div class="streak-head">
              <div>
                <span class="eyebrow">Daily rep · while you drive</span>
                <p class="streak-figure" aria-live="polite">
                  <strong>${streak}</strong>
                  <span>day streak</span>
                </p>
              </div>
              ${tipButton("tip-streak", Coach.MECHANICS.streak.label)}
            </div>
            ${tipPop("tip-streak", Coach.MECHANICS.streak.why, Coach.MECHANICS.streak.sources)}
          </div>
          <p class="streak-lede">Two minutes, hands-free. A tap or a memo with no transcript or scores keeps the chain.</p>
          <ol class="week-dots" aria-label="Last seven days">${dots}</ol>
          <button type="button" class="checkin-btn${practisedToday ? " is-done" : ""}" data-checkin aria-pressed="${practisedToday ? "true" : "false"}">${escapeHtml(checkLabel)}</button>
          <div class="streak-stats">
            <div><strong>${best}</strong><span>Best</span></div>
            <div><strong>${logged}</strong><span>Days logged</span></div>
            <div><strong>${windowCount}/21</strong><span>This window</span></div>
          </div>
          <div class="install-line">
            <span>${windowCount} of the last 21 days</span>
            ${tipButton("tip-install", Coach.MECHANICS.install.label)}
          </div>
          ${tipPop("tip-install", Coach.MECHANICS.install.why, Coach.MECHANICS.install.sources)}
        </article>

        ${renderChartCard(agg)}

        <article class="challenge-card">
          <div class="tip-wrap">
            <div class="challenge-head">
              <div>
                <span class="eyebrow">This week · ${escapeHtml(shortDate(monday))} – ${escapeHtml(shortDate(sunday))}</span>
                <h2>${escapeHtml(challenge.label)}</h2>
              </div>
              ${tipButton("tip-challenge", challenge.label)}
            </div>
            ${tipPop("tip-challenge", challenge.why, challenge.sources)}
          </div>
          <p class="challenge-detail">${escapeHtml(challenge.detail)}</p>
          ${restartLine ? `<p class="restart-line">${escapeHtml(restartLine)}</p>` : ""}
          <button
            type="button"
            class="challenge-btn${challengeOn ? " is-done" : ""}"
            data-challenge="${escapeHtml(challenge.id)}"
            data-week="${escapeHtml(week.week.id)}"
            aria-pressed="${challengeOn ? "true" : "false"}"
          >${challengeOn ? "Logged for this week" : "I did this in my reps"}</button>
        </article>

        <section class="skills-block" aria-labelledby="skills-title">
          <div class="tip-wrap">
            <div class="section-heading">
              <div>
                <span class="eyebrow">From every scored session</span>
                <h2 id="skills-title">Skill levels</h2>
              </div>
              ${tipButton("tip-levels", Coach.MECHANICS.levels.label)}
            </div>
            ${tipPop("tip-levels", Coach.MECHANICS.levels.why, Coach.MECHANICS.levels.sources)}
          </div>
          <div class="skill-grid">${renderSkillCards(agg.summary)}</div>
        </section>

        ${renderBadges(badges, Coach.MECHANICS.badges)}
      </section>`;
  }

  function renderRestartBlock(session) {
    const Coach = coachApi();
    const info = Coach.restartInfo(session);
    const count = info.count == null ? "not recorded" : String(info.count);
    const source = info.source ? ` · ${info.source}` : "";
    return `
      <p class="restart-line">Restarts: ${escapeHtml(count)}${escapeHtml(source)}</p>
      <p class="chart-note">Each repeated opening is a miss on Pause, don't restart.</p>`;
  }

  function renderVocalSubs(derived) {
    const Coach = coachApi();
    return (Coach.VOCAL_PARTS || [])
      .map((part) => {
        const value = derived.subs ? derived.subs[part.id] : null;
        const missing = value == null;
        const pct = missing ? 0 : Math.max(0, Math.min(100, (value / 5) * 100));
        const num = missing ? "not recorded" : `${formatScore(value)} · ${Coach.tierFromScore(value)}`;
        return `
          <div class="vocal-sub">
            <div class="score-row score-sub">
              <span class="score-label">${escapeHtml(part.label)} ${tipButton("tip-session-" + part.id, part.label)}</span>
              <div class="score-track" aria-hidden="true"><div class="score-fill" style="width:${pct}%"></div></div>
              <span class="score-num${missing ? " is-missing" : ""}">${escapeHtml(num)}</span>
            </div>
            ${tipPop("tip-session-" + part.id, part.why, part.sources)}
          </div>`;
      })
      .join("");
  }

  function renderSessionSkills(session) {
    const Coach = coachApi();
    if (!Coach) return "";
    const derived = Coach.deriveSession(session);
    const restarts = renderRestartBlock(session);
    if (!derived || !derived.scored) {
      return `
        <section class="scores-block session-skills">
          ${sectionHead("This take", "No scores on this memo")}
          <p class="chart-note">A session with no transcript or scores still counts as a practice day.</p>
          ${restarts}
        </section>`;
    }
    const rows = Coach.SKILLS.map((skill) => {
      const value = derived.skills[skill.id];
      const missing = value == null;
      const tier = missing ? "" : Coach.tierFromScore(value) || "—";
      const pct = missing ? 0 : Math.max(0, Math.min(100, (value / 5) * 100));
      const num = missing
        ? skill.id === "vocal"
          ? "not recorded"
          : "— · —"
        : `${formatScore(value)} · ${tier}`;
      const subs = skill.id === "vocal" ? renderVocalSubs(derived) : "";
      return `
        <div class="score-row">
          <span class="score-label">${escapeHtml(skill.label)}</span>
          <div class="score-track" aria-hidden="true"><div class="score-fill" style="width:${pct}%"></div></div>
          <span class="score-num${missing && skill.id === "vocal" ? " is-missing" : ""}">${escapeHtml(num)}</span>
        </div>
        ${subs}`;
    }).join("");
    const extras = [];
    if (derived.wpm != null) extras.push(`Pace ${derived.wpm} WPM`);
    if (derived.fillerRate != null) extras.push(`Filler rate ${derived.fillerRate}`);
    return `
      <section class="scores-block session-skills">
        ${sectionHead("This session", "Six skills")}
        <div class="score-bars">${rows}</div>
        ${extras.length ? `<p class="chart-note">${escapeHtml(extras.join(" · "))}</p>` : ""}
        ${restarts}
      </section>`;
  }

  function renderCatalog(catalog, query) {
    const { sessions } = catalogStats(catalog);
    updateHeaderMeta("");
    root.classList.remove("is-detail");
    const sorted = [...sessions].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    const latest = sorted[0];
    const older = sorted.slice(1);
    let latestHtml = "";
    if (latest) {
      const full = loadedSessions.find((x) => x.slug === latest.slug) || latest;
      const r = loadRating(latest.slug);
      const avg = ratingAvg(r);
      const derived = coachApi() && !full._detailMissing ? coachApi().deriveSession(full) : null;
      const media = latest.video_id
        ? youtubeEmbed(latest.video_id)
        : full.url ? `<p><a href="${escapeHtml(full.url)}" target="_blank" rel="noopener">Open video</a></p>` : "";
      latestHtml = `<section class="ui-card home-card dx-card">
          <h2 class="mini-head">Latest video</h2>
          ${media}
          <p class="latest-title"><a href="#/session/${encodeURIComponent(latest.slug)}">${escapeHtml(latest.title || latest.slug)}</a> <span class="report-card-meta">${escapeHtml(shortDate(latest.date))}</span></p>
          <details class="fold rate-fold"${avg == null ? " open" : ""}><summary data-rated-badge="${escapeHtml(latest.slug)}">${avg != null ? `Rated ✓ avg ${avg.toFixed(1)}` : "Rate this"}</summary>
            ${renderRatingPanel(latest.slug, derived)}
          </details>
        </section>`;
    }
    const list = older.length
      ? `<section class="home-list dx-card"><h2 class="mini-head">Older sessions</h2><ul class="compact-list">${older
          .map((s) => {
            const a = ratingAvg(loadRating(s.slug));
            return `<li><a href="#/session/${encodeURIComponent(s.slug)}"><span class="report-card-meta">${escapeHtml(shortDate(s.date))}</span> ${escapeHtml(s.title || s.slug)}${a != null ? ` <span class="rate-coach">✓ ${a.toFixed(1)}</span>` : ""}</a></li>`;
          })
          .join("")}</ul></section>`
      : "";
    root.innerHTML = `
      ${latestHtml || `<p class="chart-note dx-on-bg">No sessions yet</p>`}
      <section class="ui-card home-card dx-card" id="voice-of-day"><h2 class="mini-head">Voice of the day</h2><p class="chart-note">Loading…</p></section>
      ${list}
    `;
    renderVoiceOfDay();
  }

  let repsCache = null;
  let voiceShowOpen = false;
  document.addEventListener("click", (e) => {
    const done = e.target.closest("[data-rep-done]");
    const undo = e.target.closest("[data-rep-undo]");
    if (!done && !undo) return;
    const key = "speaking-done:" + (done || undo).getAttribute(done ? "data-rep-done" : "data-rep-undo");
    try {
      if (done) { localStorage.setItem(key, "1"); voiceShowOpen = false; }
      else if (localStorage.getItem(key) === "1") localStorage.removeItem(key);
      else voiceShowOpen = true;
    } catch (err) {}
    renderVoiceOfDay();
  });
  async function renderVoiceOfDay() {
    const box = document.getElementById("voice-of-day");
    if (!box) return;
    try {
      if (!repsCache) {
        const reps = await fetchJson("data/reps.json");
        reps.sort((a, b) => String(b.date).localeCompare(String(a.date)));
        const rep = reps[0];
        let text = "";
        if (rep && rep.transcript) { try { text = await window.PrivateData.text(rep.transcript); } catch (e) {} }
        repsCache = { rep, text };
      }
      const { rep, text } = repsCache;
      const el = document.getElementById("voice-of-day");
      if (!el) return;
      if (!rep) { el.innerHTML = `<h2 class="mini-head">Voice of the day</h2><p class="chart-note">No rep yet</p>`; return; }
      const doneKey = "speaking-done:" + rep.date;
      let manual = false;
      try { manual = localStorage.getItem(doneKey) === "1"; } catch (e) {}
      const auto = rep.done === true || (catalogCache && (catalogCache.sessions || []).some((x) => x.date === rep.date));
      if ((manual || auto) && !voiceShowOpen) {
        el.innerHTML = `<p class="rep-done-line">Today's rep done ✓ <button type="button" class="mini-btn" data-rep-undo="${escapeHtml(rep.date)}">${manual ? "Undo" : "Show"}</button></p>`;
        return;
      }
      el.innerHTML = `<h2 class="mini-head">Voice of the day</h2>
        <p class="latest-title">${escapeHtml(rep.title)}</p>
        <p class="rep-meta">Focus: ${escapeHtml(rep.focus)}</p>
        <audio controls preload="metadata" data-private-src="${escapeHtml(rep.audio)}"></audio>
        ${text ? `<details class="fold"><summary>Transcript</summary><p class="rep-transcript">${escapeHtml(text)}</p></details>` : ""}
        ${manual || auto ? "" : `<button type="button" class="mini-btn" data-rep-done="${escapeHtml(rep.date)}">Done ✓</button>`}`;
      window.PrivateData.hydrateAudio(el);
    } catch (e) {
      box.innerHTML = `<h2 class="mini-head">Voice of the day</h2><p class="chart-note">${e && e.noAccess ? "Private. Add your sync token to load reps." : "Could not load reps."}</p>`;
    }
  }

  function renderSession(session) {
    updateHeaderMeta(session.date ? formatDate(session.date) : "");
    root.classList.add("is-detail");
    const fix = (session.top_fixes || session.scores?.top_fixes || [])[0];
    const focus = (session.focus_next || session.scores?.focus_next || [])[0];
    const nextFix = fix ? fix.fix : focus ? focus.title : "";
    const nextHow = fix ? fix.instead || fix.drill : focus ? focus.why : "";
    const derived = coachApi() ? coachApi().deriveSession(session) : null;

    root.innerHTML = `
      <a class="back-link dx-on-bg" href="#/">← All sessions</a>
      <article class="report-view clean-session">
        <header class="clean-head dx-card">
          <span class="report-card-meta">${escapeHtml(formatDate(session.date))}</span>
          <h1>${escapeHtml(session.title || session.slug)}</h1>
        </header>
        ${renderRatingPanel(session.slug, derived)}
        ${session.summary ? `<section class="clean-block dx-card"><h2 class="mini-head">Summary</h2><p class="clamp-3">${escapeHtml(session.summary)}</p></section>` : ""}
        ${nextFix ? `<section class="clean-block next-fix dx-card"><h2 class="mini-head">Next fix</h2><p class="next-fix-title">${escapeHtml(nextFix)}</p>${nextHow ? `<p class="chart-note">${escapeHtml(nextHow)}</p>` : ""}</section>` : ""}
        ${session.video_id ? `<details class="fold dx-card"><summary>Video</summary>${youtubeEmbed(session.video_id)}</details>` : session.url ? `<p class="video-link dx-on-bg"><a href="${escapeHtml(session.url)}" rel="noopener" target="_blank">Open video</a></p>` : ""}
        ${renderWhatToFix(session.whatToFix)}
        ${renderTranscript(session.transcript)}
        ${renderPerfectVersion(session.perfectVersion)}
        <details class="fold dx-card"><summary>Coach analysis</summary>
          <div class="synthesis-body">${session.analysisHtml || "<p>No analysis available.</p>"}</div>
          ${renderTopFixes(session.top_fixes || session.scores?.top_fixes)}
        </details>
        <details class="fold dx-card"><summary>Score breakdown</summary>
          ${renderScores(session.scores)}
          ${renderSessionSkills(session)}
        </details>
      </article>
    `;
  }

  /* ---------- Practice folds: What to fix, Transcript, Perfect version ---------- */
  function fixItems(value) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
  }

  function renderWhatToFix(value) {
    const items = fixItems(value);
    const body = items.length
      ? `<ul class="practice-fixes">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : `<p class="chart-note">Not written yet</p>`;
    return `<details class="fold dx-card"><summary>What to fix</summary>${body}</details>`;
  }

  function renderPerfectVersion(value) {
    const text = typeof value === "string" ? value.trim() : "";
    const body = text
      ? `<div class="perfect-version">${escapeHtml(text)}</div>`
      : `<p class="chart-note">Not written yet</p>`;
    return `<details class="fold dx-card"><summary>Perfect version</summary>${body}</details>`;
  }

  /* ---------- Transcript ---------- */
  function fmtTime(sec) {
    const t = Math.max(0, Math.floor(Number(sec) || 0));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  }

  function renderTranscript(tr) {
    let segs = [];
    let text = "";
    if (typeof tr === "string") text = tr;
    else if (tr && typeof tr === "object") {
      segs = Array.isArray(tr.segments) ? tr.segments : [];
      text = tr.text || segs.map((x) => x.text).join(" ");
    }
    if (!text.trim() && !segs.length) {
      return `<details class="fold dx-card"><summary>Transcript</summary><p class="chart-note">No transcript yet</p></details>`;
    }
    const body = segs.length
      ? `<ol class="transcript-segs">${segs
          .map((x) => `<li><span class="ts">${fmtTime(x.start)}</span> ${escapeHtml(x.text)}</li>`)
          .join("")}</ol>`
      : `<p class="rep-transcript">${escapeHtml(text)}</p>`;
    const meta = tr && tr.source ? `<p class="chart-note">${escapeHtml(tr.source)}</p>` : "";
    return `<details class="fold dx-card"><summary>Transcript</summary>${body}${meta}</details>`;
  }

  /* ---------- Self-rating (localStorage only, this device) ---------- */
  const RATING_PREFIX = "speaking-self-rating:";
  const RATING_SKILLS = [
    { id: "structure", label: "Structure", coach: "structure" },
    { id: "clarity", label: "Clarity", coach: "clarity" },
    { id: "pace", label: "Pace", coach: "pace" },
    { id: "fillers", label: "Filler words", coach: "fillers" },
    { id: "confidence", label: "Confidence & eye contact", coach: null },
    { id: "energy", label: "Energy", coach: null },
  ];

  function loadRating(slug) {
    try {
      const v = JSON.parse(localStorage.getItem(RATING_PREFIX + slug) || "null");
      return v && typeof v === "object" ? v : { scores: {}, note: "" };
    } catch (e) {
      return { scores: {}, note: "" };
    }
  }

  function saveRating(slug, r) {
    r.updated = new Date().toISOString();
    localStorage.setItem(RATING_PREFIX + slug, JSON.stringify(r));
  }

  function ratingAvg(r) {
    const vals = Object.values((r && r.scores) || {}).filter((n) => n >= 1 && n <= 5);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  function renderRatingPanel(slug, derived) {
    const r = loadRating(slug);
    const avg = ratingAvg(r);
    const coachSkills = (derived && derived.scored && derived.skills) || {};
    const rows = RATING_SKILLS.map((sk) => {
      const mine = r.scores[sk.id] || 0;
      const coach = sk.coach ? coachSkills[sk.coach] : null;
      const btns = [1, 2, 3, 4, 5]
        .map(
          (n) =>
            `<button type="button" class="star${n <= mine ? " on" : ""}" data-rate="${sk.id}" data-val="${n}" data-slug="${escapeHtml(slug)}" aria-label="${escapeHtml(sk.label)} ${n} of 5" aria-pressed="${n === mine}">★</button>`
        )
        .join("");
      return `<div class="rate-row">
          <span class="rate-label">${escapeHtml(sk.label)}</span>
          <span class="stars" role="group" aria-label="${escapeHtml(sk.label)}">${btns}</span>
          <span class="rate-coach">${coach != null ? `coach ${formatScore(coach)}` : ""}</span>
        </div>`;
    }).join("");
    return `<section class="clean-block rating-panel dx-card" data-rating-slug="${escapeHtml(slug)}">
        <div class="rate-head">
          <h2 class="mini-head">My rating</h2>
          <span class="rate-avg">${avg != null ? `avg ${avg.toFixed(1)}` : "not rated"}</span>
        </div>
        <div class="rate-grid">${rows}</div>
        <textarea class="rate-note" data-rate-note="${escapeHtml(slug)}" rows="2" placeholder="Optional note">${escapeHtml(r.note || "")}</textarea>
      </section>`;
  }

  function refreshRatingPanel(slug) {
    const panel = document.querySelector(`.rating-panel[data-rating-slug="${CSS.escape(slug)}"]`);
    if (!panel) return;
    const session = detailCache.get(slug);
    const derived = session && coachApi() ? coachApi().deriveSession(session) : null;
    const tmp = document.createElement("div");
    tmp.innerHTML = renderRatingPanel(slug, derived);
    panel.replaceWith(tmp.firstElementChild);
  }

  document.addEventListener("click", (e) => {
    const star = e.target.closest("[data-rate]");
    if (star) {
      const slug = star.getAttribute("data-slug");
      const r = loadRating(slug);
      const id = star.getAttribute("data-rate");
      const val = Number(star.getAttribute("data-val"));
      r.scores = r.scores || {};
      if (r.scores[id] === val) delete r.scores[id];
      else r.scores[id] = val;
      saveRating(slug, r);
      refreshRatingPanel(slug);
      const badge = document.querySelector(`[data-rated-badge="${CSS.escape(slug)}"]`);
      if (badge) { const a = ratingAvg(r); badge.textContent = a != null ? `Rated ✓ avg ${a.toFixed(1)}` : "Rate this"; }
    }
  });
  document.addEventListener("input", (e) => {
    const t = e.target.closest("[data-rate-note]");
    if (!t) return;
    const slug = t.getAttribute("data-rate-note");
    const r = loadRating(slug);
    r.note = t.value;
    saveRating(slug, r);
  });

  async function loadAllSessions(catalog) {
    const metas = Array.isArray(catalog.sessions) ? catalog.sessions : [];
    return Promise.all(
      metas.map(async (meta) => {
        const slug = meta && meta.slug;
        if (!slug) return meta;
        const cached = detailCache.get(slug);
        if (cached && !cached._detailMissing) return Object.assign({}, meta, cached);
        try {
          const full = await fetchJson(`data/sessions/${encodeURIComponent(slug)}.json`);
          const merged = Object.assign({}, meta, full);
          detailCache.set(slug, merged);
          return merged;
        } catch (err) {
          console.error(err);
          const fallback = Object.assign({}, meta, { _detailMissing: true });
          detailCache.set(slug, fallback);
          return fallback;
        }
      })
    );
  }

  async function showHome() {
    setLoading("Loading sessions…");
    root.classList.remove("is-detail");
    try {
      const catalog = await loadCatalog();
      loadedSessions = await loadAllSessions(catalog);
      renderCatalog(catalog, homeQuery);
    } catch (err) {
      if (err && err.noAccess) {
        setError("Speaking data is private (repo Dong-Xuyong/speaking-data). Save a sync token that can read it under localStorage key dong-gh-sync, then reload.");
      } else {
        console.error(err);
        setError("Could not load data/index.json. Is the archive synced?");
      }
      updateHeaderMeta("");
    }
  }

  async function showSession(slug) {
    setLoading("Loading session…");
    try {
      const session = await fetchJson(`data/sessions/${encodeURIComponent(slug)}.json`);
      detailCache.set(slug, session);
      document.title = `${session.title || slug} · ${APP_NAME}`;
      renderSession(session);
    } catch (err) {
      if (!(err && err.noAccess)) console.error(err);
      setError(err && err.noAccess ? "Speaking data is private. Add your sync token to view sessions." : `Session “${slug}” not found.`);
      updateHeaderMeta("");
      root.classList.remove("is-detail");
    }
  }

  function closeTips() {
    document.querySelectorAll(".tip-pop").forEach((pop) => {
      pop.hidden = true;
    });
    document.querySelectorAll(".info-tip").forEach((btn) => {
      btn.setAttribute("aria-expanded", "false");
    });
  }

  function toggleTip(btn) {
    const pop = document.getElementById(btn.getAttribute("aria-controls"));
    if (!pop) return;
    const willOpen = pop.hidden;
    closeTips();
    if (willOpen) {
      pop.hidden = false;
      btn.setAttribute("aria-expanded", "true");
    }
  }

  function rerenderHome() {
    if (!catalogCache) return;
    const input = document.getElementById("catalog-search");
    if (input) homeQuery = input.value;
    renderCatalog(catalogCache, homeQuery);
  }

  document.addEventListener("click", (event) => {
    const tip = event.target.closest(".info-tip");
    if (tip) {
      event.preventDefault();
      toggleTip(tip);
      return;
    }
    if (event.target.closest(".tip-pop")) return;

    const checkin = event.target.closest("[data-checkin]");
    const challenge = event.target.closest("[data-challenge]");
    const chart = event.target.closest("[data-chart]");
    if (!checkin && !challenge && !chart) {
      closeTips();
      return;
    }
    closeTips();
    const Coach = coachApi();
    if (!Coach || !catalogCache) return;

    if (chart) {
      chartSeriesId = chart.getAttribute("data-chart") || "all";
      rerenderHome();
      return;
    }

    if (checkin) {
      const today = Coach.todayIso();
      const state = Coach.loadState();
      const fromSessions = Coach.collectPracticeDays(loadedSessions, {
        v: 1,
        checkins: [],
        challenges: {},
      });
      const sessionToday = !!fromSessions.days[today];
      const hasCheckin = state.checkins.indexOf(today) !== -1;
      const next =
        hasCheckin && !sessionToday
          ? Coach.withCheckin(state, today, false)
          : Coach.withCheckin(state, today, true);
      Coach.saveState(next);
      rerenderHome();
      return;
    }

    if (challenge) {
      const id = challenge.getAttribute("data-challenge");
      const weekId = challenge.getAttribute("data-week");
      const state = Coach.loadState();
      const done = !Coach.challengeDone(state, weekId, id);
      Coach.saveState(Coach.withChallenge(state, weekId, id, done));
      rerenderHome();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTips();
  });

  async function route() {
    const r = parseRoute();
    document.title = r.name === "session" ? `${r.slug} · ${APP_NAME}` : APP_NAME;

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
