/**
 * Speaking Coach — practice math for the archive.
 * Pure helpers: skill levels, streak days, weekly challenges, wiki citations.
 * New localStorage key only: speaking-coach-practice.
 * Does not read or write dong-ui-theme.
 *
 * XP is intentionally absent. The wiki excerpts never define an experience
 * point currency. Progression uses rookie / pretty good / natural.
 */
(function (root) {
  "use strict";

  var STORAGE_KEY = "speaking-coach-practice";

  var SOURCES = {
    habits9: {
      title: "9 Habits for Clearer Speaking (I Wish I Knew Sooner)",
      path: "youtube-wiki/wiki/sources/9-habits-for-clearer-speaking.md",
    },
    delivery: {
      title: "Delivery Habits",
      path: "youtube-wiki/wiki/concepts/delivery-habits.md",
    },
    pause3: {
      title: "Three Second Pause",
      path: "youtube-wiki/wiki/concepts/three-second-pause.md",
    },
    trick321: {
      title: "The 3-2-1 Speaking Trick That Forces You To Stop Rambling!",
      path: "youtube-wiki/wiki/sources/the-3-2-1-speaking-trick-stop-rambling.md",
    },
    vocal: {
      title: "Vocal Habits (Speaking)",
      path: "youtube-wiki/wiki/concepts/vocal-habits-speaking.md",
    },
    levels: {
      title: "How to Speak Better Than 99% of People (Complete Framework)",
      path: "youtube-wiki/wiki/sources/how-to-speak-better-than-99-percent-complete-framework.md",
    },
    commute: {
      title: "How to Trick Your Brain Into Speaking Better INSTANTLY!",
      path: "youtube-wiki/wiki/sources/trick-brain-speaking-better-instantly.md",
    },
    days21: {
      title: "Twenty-One Day Habit System",
      path: "youtube-wiki/wiki/concepts/twenty-one-day-habit-system.md",
    },
  };

  var SKILLS = [
    {
      id: "clarity",
      label: "Clarity",
      hint: "Finish one thought, in plain words.",
      why: "Clarity is a habit: finish one thought, use simple words, then pause so the point lands.",
      sources: [SOURCES.habits9],
    },
    {
      id: "pace",
      label: "Pace",
      hint: "Slow down only where the point must land.",
      why: "One speed highlights nothing — slow down and pause only on the line that has to land.",
      sources: [SOURCES.delivery],
    },
    {
      id: "fillers",
      label: "Filler words",
      hint: "Um, uh, and so become a pause.",
      why: "Replace um, uh, and so with silence so fillers stop reading as uncertainty.",
      sources: [SOURCES.pause3],
    },
    {
      id: "structure",
      label: "Structure",
      hint: "Three steps, two types, or the one thing.",
      why: "A scaffold — three steps, two types, or the one thing — replaces an unprepared ramble.",
      sources: [SOURCES.trick321],
    },
    {
      id: "vocal",
      label: "Vocal delivery",
      hint: "Volume and ending pitch.",
      why: "The score shown is the average of the volume and ending-pitch sub-scores that were recorded. A missing sub-score is left out.",
      sources: [SOURCES.vocal, SOURCES.delivery],
    },
    {
      id: "storytelling",
      label: "Storytelling",
      hint: "A story or analogy, then the point.",
      why: "Natural communicators layer stories and analogies on a framework so listeners feel the point.",
      sources: [SOURCES.levels],
    },
  ];

  var VOCAL_PARTS = [
    {
      id: "volume",
      label: "Volume",
      hint: "Steady through the sentence, not a fade.",
      why: "Healthy volume stays steady to the end of the sentence; a small voice or a fade is heard as small ideas.",
      sources: [SOURCES.vocal],
    },
    {
      id: "endingPitch",
      label: "Ending pitch",
      hint: "Statements land downward.",
      why: "A statement lands on a full stop and a lower pitch. A rise at the end is uptalk.",
      sources: [SOURCES.delivery],
    },
  ];

  var CHALLENGES = [
    {
      id: "three-two-one",
      label: "3-2-1 week",
      detail: "Every answer uses the 3-2-1 trick: three steps, two types, or the one thing.",
      why: "Pick one mode — a framework stops the ramble when you are put on the spot.",
      sources: [SOURCES.trick321],
    },
    {
      id: "pause-restart",
      label: "Pause, don't restart",
      detail: "When you lose the thread, pause instead of restarting the sentence. A repeated opening counts as a miss.",
      why: "Finish one thought, then pause. Repeating the opening of the sentence is a miss.",
      sources: [SOURCES.habits9],
    },
    {
      id: "land-it",
      label: "Land it",
      detail: "Every sentence ends on a full stop with falling pitch, and no uptalk.",
      why: "A full stop and a lower pitch land the line; rising endings and hedges sound unsure.",
      sources: [SOURCES.delivery],
    },
  ];

  var MECHANICS = {
    levels: {
      id: "levels",
      label: "Skill levels",
      why: "Listeners slot each skill into rookie, pretty good, or natural — these are habits, not a fixed identity.",
      sources: [SOURCES.levels],
    },
    streak: {
      id: "streak",
      label: "Daily 2-minute streak",
      why: "Record a two-minute answer, and use the drive you already have — a hands-free voice memo is the rep.",
      sources: [SOURCES.levels, SOURCES.commute],
    },
    install: {
      id: "install",
      label: "21-day window",
      why: "Twenty-one days is the install window, and a missed day does not erase the habit.",
      sources: [SOURCES.days21],
    },
    badges: {
      id: "badges",
      label: "Badges",
      why: "These marks are habits you have logged, not a new identity.",
      sources: [SOURCES.levels],
    },
  };

  var BADGES = [
    {
      id: "two-min",
      label: "Two-minute rep",
      detail: "Log the 2-minute commute memo.",
      why: "A two-minute recorded answer is the self-awareness rep: audit fillers, clarity, and repetition.",
      sources: [SOURCES.levels],
    },
    {
      id: "commute-week",
      label: "Commute week",
      detail: "Four driving memos in seven days.",
      why: "Anchor the rep to the drive you already take — a week of voice memos is enough to feel the shift.",
      sources: [SOURCES.commute],
    },
    {
      id: "framework",
      label: "3-2-1 ready",
      detail: "Finish a 3-2-1 week.",
      why: "With one framework you lean toward the question instead of shrinking from it.",
      sources: [SOURCES.trick321],
    },
    {
      id: "white-space",
      label: "Held the pause",
      detail: "Finish a pause week.",
      why: "People who pause more are perceived as more confident, not less.",
      sources: [SOURCES.delivery],
    },
    {
      id: "full-stop",
      label: "Landed it",
      detail: "Finish a land-it week.",
      why: "Declarative sentences end on a full stop and a lower pitch, instead of a hedge or a rise.",
      sources: [SOURCES.delivery],
    },
    {
      id: "install-21",
      label: "21-day install",
      detail: "Practise on 21 days.",
      why: "Twenty-one days installs the habit of showing up; a miss does not restart the whole block.",
      sources: [SOURCES.days21],
    },
    {
      id: "pretty-good",
      label: "Pretty good",
      detail: "Raise a skill out of rookie.",
      why: "Pretty good is the middle tier — more range than a rookie, still a habit you can train.",
      sources: [SOURCES.levels],
    },
    {
      id: "natural",
      label: "Natural",
      detail: "Carry a skill to natural.",
      why: "Natural is the tier where the instrument runs without conscious grinding.",
      sources: [SOURCES.levels],
    },
  ];

  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }

  function mean(nums) {
    var vals = [];
    for (var i = 0; i < nums.length; i++) {
      if (nums[i] != null && Number.isFinite(nums[i])) vals.push(nums[i]);
    }
    if (!vals.length) return null;
    var sum = 0;
    for (var j = 0; j < vals.length; j++) sum += vals[j];
    return sum / vals.length;
  }

  function todayIso(date) {
    var d = date || new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function practiceDate(session) {
    if (!session || session.date == null) return null;
    var raw = String(session.date).trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
  }

  function addDays(iso, n) {
    var parts = iso.split("-").map(Number);
    var dt = new Date(parts[0], parts[1] - 1, parts[2]);
    dt.setDate(dt.getDate() + n);
    return todayIso(dt);
  }

  function isoWeekId(isoDate) {
    var parts = isoDate.split("-").map(Number);
    var date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    var dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    var isoYear = date.getUTCFullYear();
    var yearStart = new Date(Date.UTC(isoYear, 0, 1));
    var week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    return {
      year: isoYear,
      week: week,
      id: isoYear + "-W" + String(week).padStart(2, "0"),
    };
  }

  function tierToScore(tier) {
    var t = String(tier || "")
      .toLowerCase()
      .trim();
    if (t === "natural") return 5;
    if (t === "pretty good" || t === "pretty-good") return 3.5;
    if (t === "rookie") return 2;
    return null;
  }

  function tierFromScore(score) {
    if (score == null || !Number.isFinite(score)) return null;
    if (score >= 4.5) return "natural";
    if (score >= 3) return "pretty good";
    return "rookie";
  }

  function layerScore(session, key) {
    var layers = session && session.scores && session.scores.layers;
    if (!layers || layers[key] == null) return null;
    var entry = layers[key];
    var raw = typeof entry === "object" ? entry.score : entry;
    var n = Number(raw);
    return Number.isFinite(n) ? clamp(n, 0, 5) : null;
  }

  function explicitSkill(session, key) {
    var skills = session && session.scores && session.scores.skills;
    if (!skills || typeof skills !== "object") return null;
    var aliases = {
      fillers: ["fillers", "filler", "fillerWords", "filler_words"],
      vocal: ["vocal", "vocalDelivery", "vocal_delivery"],
      storytelling: ["storytelling", "story"],
      clarity: ["clarity"],
      pace: ["pace"],
      structure: ["structure"],
    };
    var keys = aliases[key] || [key];
    for (var i = 0; i < keys.length; i++) {
      var raw = skills[keys[i]];
      if (raw == null || raw === "") continue;
      var n = Number(raw);
      if (Number.isFinite(n)) return clamp(n, 0, 5);
    }
    return null;
  }

  function readMetric(session, keys) {
    var bags = [session && session.metrics, session && session.scores, session];
    for (var b = 0; b < bags.length; b++) {
      var bag = bags[b];
      if (!bag || typeof bag !== "object") continue;
      for (var i = 0; i < keys.length; i++) {
        var raw = bag[keys[i]];
        if (raw == null || raw === "" || typeof raw === "object") continue;
        var n = Number(raw);
        if (Number.isFinite(n)) return n;
      }
    }
    return null;
  }

  function parseScore(raw) {
    if (typeof raw !== "string" && typeof raw !== "number") return null;
    if (typeof raw === "string" && /[a-z]/i.test(raw)) {
      var tier = tierToScore(raw);
      if (tier != null) return tier;
    }
    var n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 5) return null;
    return n;
  }

  function scoreBags(session) {
    var scores = session && session.scores;
    return [
      session && session.metrics,
      scores && scores.skills,
      scores && scores.vocal,
      scores && scores.delivery,
      scores,
      session,
    ];
  }

  function readScore(session, keys) {
    var bags = scoreBags(session);
    for (var b = 0; b < bags.length; b++) {
      var bag = bags[b];
      if (!bag || typeof bag !== "object" || Array.isArray(bag)) continue;
      for (var i = 0; i < keys.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(bag, keys[i])) continue;
        var parsed = parseScore(bag[keys[i]]);
        if (parsed != null) return parsed;
      }
    }
    return null;
  }

  var VOLUME_KEYS = ["volume", "volumeScore", "volume_score", "vocalVolume", "vocal_volume"];
  var PITCH_KEYS = [
    "endingPitch",
    "ending_pitch",
    "endingPitchScore",
    "pitch",
    "intonation",
    "intonationScore",
    "pitchScore",
  ];
  var UPSPEAK_KEYS = ["upspeak", "uptalk", "upspeakScore", "uptalkScore"];

  function vocalParts(session) {
    var volume = readScore(session, VOLUME_KEYS);
    var endingPitch = readScore(session, PITCH_KEYS);
    if (endingPitch == null) {
      var upspeak = readScore(session, UPSPEAK_KEYS);
      if (upspeak != null) endingPitch = 5 - upspeak;
    }
    return {
      volume: volume,
      endingPitch: endingPitch,
    };
  }

  function readCount(raw) {
    if (raw == null || raw === "") return null;
    if (Array.isArray(raw)) return raw.length;
    if (typeof raw === "object") {
      if (raw.count == null || raw.count === "") return null;
      var counted = Number(raw.count);
      return Number.isFinite(counted) && counted >= 0 ? counted : null;
    }
    if (typeof raw !== "string" && typeof raw !== "number") return null;
    var n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  function readRestartField(session) {
    var keys = ["restarts", "restartCount", "restart_count"];
    var bags = scoreBags(session);
    for (var b = 0; b < bags.length; b++) {
      var bag = bags[b];
      if (!bag || typeof bag !== "object" || Array.isArray(bag)) continue;
      for (var i = 0; i < keys.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(bag, keys[i])) continue;
        var n = readCount(bag[keys[i]]);
        if (n != null) return n;
      }
    }
    return null;
  }

  var RESTART_WORD = "[A-Za-z][A-Za-z']*";

  function openingRestart(sentence) {
    var s = String(sentence || "").replace(/^[\s"'“”‘’(\[\]«»]+/, "");
    if (!s) return null;
    var dash = new RegExp(
      "^((?:" + RESTART_WORD + ")(?:\\s+" + RESTART_WORD + "){0,3})\\s*[-–—]\\s*\\1\\b",
      "i"
    );
    var dashed = s.match(dash);
    if (dashed) return dashed[1].toLowerCase().replace(/\s+/g, " ");
    var doubled = new RegExp(
      "^((?:" + RESTART_WORD + ")(?:\\s+" + RESTART_WORD + "){0,2})\\s+\\1\\b",
      "i"
    );
    var match = s.match(doubled);
    return match ? match[1].toLowerCase().replace(/\s+/g, " ") : null;
  }

  function countRestartsInText(text) {
    var n = 0;
    String(text || "")
      .split(/[\n.!?]+/)
      .forEach(function (part) {
        if (openingRestart(part)) n += 1;
      });
    return n;
  }

  function decodeEntities(value) {
    return String(value)
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">");
  }

  function analysisExcerpts(html) {
    if (typeof html !== "string" || !html.trim()) return [];
    var out = [];
    var block = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi;
    var found;
    while ((found = block.exec(html))) {
      var text = decodeEntities(found[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      if (text) out.push(text);
    }
    var rest = html.replace(/<blockquote\b[^>]*>[\s\S]*?<\/blockquote>/gi, " ");
    var quoted = /[“"]([^”"]{2,240})[”"]/g;
    while ((found = quoted.exec(rest))) {
      var quote = decodeEntities(found[1]).replace(/\s+/g, " ").trim();
      if (quote) out.push(quote);
    }
    return out;
  }

  function countRestartsInExcerpts(excerpts) {
    var seen = {};
    var n = 0;
    (excerpts || []).forEach(function (text) {
      String(text)
        .split(/[\n.!?]+/)
        .forEach(function (part) {
          var phrase = openingRestart(part);
          if (!phrase || seen[phrase]) return;
          seen[phrase] = true;
          n += 1;
        });
    });
    return n;
  }

  function transcriptBody(session) {
    var keys = ["transcript", "transcriptText", "captions"];
    for (var i = 0; i < keys.length; i++) {
      var value = session && session[keys[i]];
      if (typeof value === "string" && value.trim()) return value;
    }
    return null;
  }

  function restartInfo(session) {
    if (!session) return { count: null, source: null };
    var field = readRestartField(session);
    if (field != null) return { count: field, source: "restarts field" };
    var transcript = transcriptBody(session);
    if (transcript != null) {
      return { count: countRestartsInText(transcript), source: "transcript" };
    }
    var excerpts = analysisExcerpts(session.analysisHtml);
    if (!excerpts.length) return { count: null, source: null };
    return { count: countRestartsInExcerpts(excerpts), source: "quoted speech in this analysis" };
  }

  function restartsInWeek(sessions, weekId) {
    var total = 0;
    var any = false;
    (sessions || []).forEach(function (session) {
      var date = practiceDate(session);
      if (!date || isoWeekId(date).id !== weekId) return;
      var info = restartInfo(session);
      if (info.count == null) return;
      any = true;
      total += info.count;
    });
    return any ? total : null;
  }

  function whiteSpaceEarned(state, sessions) {
    var challenges = (state && state.challenges) || {};
    var keys = Object.keys(challenges);
    for (var i = 0; i < keys.length; i++) {
      var entry = challenges[keys[i]];
      if (!entry || !entry.done || entry.id !== "pause-restart") continue;
      var misses = restartsInWeek(sessions || [], keys[i]);
      if (!(misses > 0)) return true;
    }
    return false;
  }

  function textBlob(session) {
    if (!session) return "";
    var parts = [session.transcript, session.transcriptText, session.analysisHtml, session.captions];
    return parts
      .filter(function (p) {
        return typeof p === "string" && p.trim();
      })
      .join("\n");
  }

  function sessionHasTranscript(session) {
    return textBlob(session).trim().length > 0;
  }

  function sessionHasScores(session) {
    if (!session || !session.scores || typeof session.scores !== "object") return false;
    var layers = session.scores.layers;
    if (layers && typeof layers === "object") {
      var layerKeys = Object.keys(layers);
      for (var i = 0; i < layerKeys.length; i++) {
        if (layerScore(session, layerKeys[i]) != null) return true;
      }
    }
    for (var s = 0; s < SKILLS.length; s++) {
      if (explicitSkill(session, SKILLS[s].id) != null) return true;
    }
    return false;
  }

  /**
   * Audio-only voice memos have no transcript or no scores.
   * Either gap is enough — a hands-free drive recording still counts.
   */
  function isAudioOnly(session) {
    return !sessionHasTranscript(session) || !sessionHasScores(session);
  }

  /**
   * Every dated session is a rep, including audio-only memos.
   * Scored archive sessions count too.
   */
  function sessionCountsAsPractice(session) {
    return practiceDate(session) != null;
  }

  function deriveSession(session) {
    if (!session) return null;
    var structure = layerScore(session, "structure");
    var delivery = layerScore(session, "delivery");
    var authority = layerScore(session, "authority");
    var levels = (session.scores && session.scores.levels) || {};
    var words = tierToScore(levels.words);
    var parts = vocalParts(session);

    var wpm = readMetric(session, ["wpm", "wordsPerMinute", "paceWpm", "pace_wpm"]);
    var fillerRate = readMetric(session, [
      "fillerRate",
      "filler_rate",
      "fillersPerMin",
      "filler_per_min",
    ]);

    var skills = {
      clarity: explicitSkill(session, "clarity") != null ? explicitSkill(session, "clarity") : mean([structure, words]),
      pace: explicitSkill(session, "pace") != null ? explicitSkill(session, "pace") : delivery,
      fillers: explicitSkill(session, "fillers") != null ? explicitSkill(session, "fillers") : delivery,
      structure: explicitSkill(session, "structure") != null ? explicitSkill(session, "structure") : structure,
      vocal: mean([parts.volume, parts.endingPitch]),
      storytelling:
        explicitSkill(session, "storytelling") != null
          ? explicitSkill(session, "storytelling")
          : mean([authority, words]),
    };

    var overall = mean([structure, delivery, authority]);
    var anySkill = SKILLS.some(function (sk) {
      return skills[sk.id] != null;
    });
    var base = {
      slug: session.slug || "",
      title: session.title || session.slug || "",
      date: practiceDate(session),
      overall: overall,
      skills: skills,
      subs: parts,
      restarts: restartInfo(session),
      wpm: wpm,
      fillerRate: fillerRate,
    };
    if (overall == null && !anySkill && wpm == null && fillerRate == null) {
      base.scored = false;
      base.overall = null;
      return base;
    }
    base.scored = overall != null || anySkill;
    return base;
  }

  function aggregate(sessions) {
    var list = (sessions || []).slice().sort(function (a, b) {
      var da = practiceDate(a) || "";
      var db = practiceDate(b) || "";
      if (da !== db) return da < db ? -1 : 1;
      return String(a.slug || "").localeCompare(String(b.slug || ""));
    });
    var timeline = [];
    var buckets = {};
    SKILLS.forEach(function (sk) {
      buckets[sk.id] = [];
    });
    var partBuckets = { volume: [], endingPitch: [] };
    var overalls = [];
    list.forEach(function (session) {
      var derived = deriveSession(session);
      if (!derived) return;
      timeline.push(derived);
      if (!derived.scored) return;
      if (derived.overall != null) overalls.push(derived.overall);
      SKILLS.forEach(function (sk) {
        var v = derived.skills[sk.id];
        if (v != null) buckets[sk.id].push(v);
      });
      VOCAL_PARTS.forEach(function (part) {
        var pv = derived.subs && derived.subs[part.id];
        if (pv != null) partBuckets[part.id].push(pv);
      });
    });
    var summary = SKILLS.map(function (sk) {
      var vals = buckets[sk.id];
      var avg = vals.length ? mean(vals) : null;
      var row = {
        id: sk.id,
        label: sk.label,
        hint: sk.hint,
        why: sk.why,
        sources: sk.sources,
        avg: avg,
        tier: tierFromScore(avg),
        samples: vals.length,
      };
      if (sk.id === "vocal") {
        row.parts = VOCAL_PARTS.map(function (part) {
          var pvals = partBuckets[part.id];
          var pavg = pvals.length ? mean(pvals) : null;
          return {
            id: part.id,
            label: part.label,
            hint: part.hint,
            why: part.why,
            sources: part.sources,
            avg: pavg,
            tier: tierFromScore(pavg),
            samples: pvals.length,
          };
        });
      }
      return row;
    });
    return {
      timeline: timeline,
      summary: summary,
      overallAvg: overalls.length ? mean(overalls) : null,
      scoredCount: timeline.filter(function (p) {
        return p.scored;
      }).length,
    };
  }

  function emptyState() {
    return { v: 1, checkins: [], challenges: {} };
  }

  function loadState(storage) {
    var store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (!store) return emptyState();
    try {
      var raw = store.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      var parsed = JSON.parse(raw);
      var checkins = Array.isArray(parsed.checkins)
        ? parsed.checkins.filter(function (d) {
            return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
          })
        : [];
      var challenges =
        parsed.challenges && typeof parsed.challenges === "object" && !Array.isArray(parsed.challenges)
          ? parsed.challenges
          : {};
      return { v: 1, checkins: checkins, challenges: challenges };
    } catch (err) {
      return emptyState();
    }
  }

  function saveState(state, storage) {
    var store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (!store) return;
    var clean = {
      v: 1,
      checkins: (state.checkins || []).slice().sort(),
      challenges: state.challenges || {},
    };
    store.setItem(STORAGE_KEY, JSON.stringify(clean));
  }

  function withCheckin(state, iso, present) {
    var set = {};
    (state.checkins || []).forEach(function (d) {
      set[d] = true;
    });
    if (present) set[iso] = true;
    else delete set[iso];
    return {
      v: 1,
      checkins: Object.keys(set).sort(),
      challenges: state.challenges || {},
    };
  }

  function withChallenge(state, weekId, challengeId, done) {
    var challenges = {};
    var prev = state.challenges || {};
    Object.keys(prev).forEach(function (k) {
      challenges[k] = prev[k];
    });
    challenges[weekId] = { id: challengeId, done: !!done };
    return { v: 1, checkins: (state.checkins || []).slice(), challenges: challenges };
  }

  function challengeForDate(isoDate) {
    var info = isoWeekId(isoDate);
    var index = Math.abs(info.year * 53 + info.week) % CHALLENGES.length;
    return {
      challenge: CHALLENGES[index],
      week: info,
    };
  }

  function challengeDone(state, weekId, challengeId) {
    var entry = state.challenges && state.challenges[weekId];
    return !!(entry && entry.done && entry.id === challengeId);
  }

  function completedChallengeIds(state) {
    var ids = {};
    var challenges = (state && state.challenges) || {};
    Object.keys(challenges).forEach(function (key) {
      var entry = challenges[key];
      if (entry && entry.done && entry.id) ids[entry.id] = true;
    });
    return ids;
  }

  function collectPracticeDays(sessions, state) {
    var days = {};
    var audioDays = {};
    (state.checkins || []).forEach(function (d) {
      days[d] = true;
    });
    (sessions || []).forEach(function (session) {
      if (!sessionCountsAsPractice(session)) return;
      var date = practiceDate(session);
      days[date] = true;
      if (isAudioOnly(session)) audioDays[date] = true;
    });
    (state.checkins || []).forEach(function (d) {
      audioDays[d] = true;
    });
    return {
      days: days,
      audioDays: audioDays,
    };
  }

  function currentStreak(dayMap, today) {
    var cursor = dayMap[today] ? today : addDays(today, -1);
    if (!dayMap[cursor]) return 0;
    var n = 0;
    while (dayMap[cursor]) {
      n += 1;
      cursor = addDays(cursor, -1);
    }
    return n;
  }

  function bestStreak(dayMap) {
    var days = Object.keys(dayMap).sort();
    var best = 0;
    var run = 0;
    var prev = null;
    for (var i = 0; i < days.length; i++) {
      if (prev && addDays(prev, 1) === days[i]) run += 1;
      else run = 1;
      prev = days[i];
      if (run > best) best = run;
    }
    return best;
  }

  function countInWindow(dayMap, today, windowDays) {
    var n = 0;
    for (var i = 0; i < windowDays; i++) {
      if (dayMap[addDays(today, -i)]) n += 1;
    }
    return n;
  }

  function maxInAnyWindow(dayMap, windowDays) {
    var days = Object.keys(dayMap).sort();
    var best = 0;
    for (var i = 0; i < days.length; i++) {
      var n = 0;
      for (var j = 0; j < windowDays; j++) {
        if (dayMap[addDays(days[i], j)]) n += 1;
      }
      if (n > best) best = n;
    }
    return best;
  }

  function lastDays(today, n) {
    var out = [];
    for (var i = n - 1; i >= 0; i--) out.push(addDays(today, -i));
    return out;
  }

  function weekdayInitial(iso) {
    var parts = iso.split("-").map(Number);
    var dt = new Date(parts[0], parts[1] - 1, parts[2]);
    return ["S", "M", "T", "W", "T", "F", "S"][dt.getDay()];
  }

  function evaluateBadges(ctx) {
    var done = ctx.completed || {};
    var earned = {
      "two-min": ctx.audioDayCount >= 1,
      "commute-week": ctx.audioWindow >= 4,
      framework: !!done["three-two-one"],
      "white-space":
        ctx.pauseRestartClean != null ? !!ctx.pauseRestartClean : !!done["pause-restart"],
      "full-stop": !!done["land-it"],
      "install-21": ctx.practiceDayCount >= 21,
      "pretty-good": ctx.tiers.indexOf("pretty good") !== -1 || ctx.tiers.indexOf("natural") !== -1,
      natural: ctx.tiers.indexOf("natural") !== -1,
    };
    return BADGES.map(function (badge) {
      return {
        id: badge.id,
        label: badge.label,
        detail: badge.detail,
        why: badge.why,
        sources: badge.sources,
        earned: !!earned[badge.id],
      };
    });
  }

  function allCitations() {
    var list = [];
    function push(item) {
      (item.sources || []).forEach(function (src) {
        list.push({
          owner: item.id,
          title: src.title,
          path: src.path,
          why: item.why,
        });
      });
    }
    SKILLS.forEach(push);
    VOCAL_PARTS.forEach(push);
    CHALLENGES.forEach(push);
    BADGES.forEach(push);
    Object.keys(MECHANICS).forEach(function (key) {
      push(MECHANICS[key]);
    });
    return list;
  }

  root.SpeakingCoach = {
    STORAGE_KEY: STORAGE_KEY,
    SOURCES: SOURCES,
    SKILLS: SKILLS,
    VOCAL_PARTS: VOCAL_PARTS,
    CHALLENGES: CHALLENGES,
    MECHANICS: MECHANICS,
    BADGES: BADGES,
    clamp: clamp,
    mean: mean,
    todayIso: todayIso,
    practiceDate: practiceDate,
    addDays: addDays,
    isoWeekId: isoWeekId,
    tierToScore: tierToScore,
    tierFromScore: tierFromScore,
    sessionHasTranscript: sessionHasTranscript,
    sessionHasScores: sessionHasScores,
    isAudioOnly: isAudioOnly,
    sessionCountsAsPractice: sessionCountsAsPractice,
    vocalParts: vocalParts,
    restartInfo: restartInfo,
    restartsInWeek: restartsInWeek,
    whiteSpaceEarned: whiteSpaceEarned,
    countRestartsInText: countRestartsInText,
    deriveSession: deriveSession,
    aggregate: aggregate,
    loadState: loadState,
    saveState: saveState,
    withCheckin: withCheckin,
    withChallenge: withChallenge,
    challengeForDate: challengeForDate,
    challengeDone: challengeDone,
    completedChallengeIds: completedChallengeIds,
    collectPracticeDays: collectPracticeDays,
    currentStreak: currentStreak,
    bestStreak: bestStreak,
    countInWindow: countInWindow,
    maxInAnyWindow: maxInAnyWindow,
    lastDays: lastDays,
    weekdayInitial: weekdayInitial,
    evaluateBadges: evaluateBadges,
    allCitations: allCitations,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
