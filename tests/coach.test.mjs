import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

const sandbox = { localStorage: memoryStorage(), console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL("../coach.js", import.meta.url), "utf8"), sandbox);
const C = sandbox.SpeakingCoach;

const zara1 = {
  slug: "zara-interview",
  title: "Zara interview",
  date: "2026-07-26",
  analysisHtml: "<p>Full notes</p>",
  scores: {
    layers: {
      structure: { score: 2 },
      delivery: { score: 2 },
      authority: { score: 2 },
    },
    levels: { voice: "rookie", body: "rookie", words: "pretty good" },
  },
};

const zara2 = {
  slug: "zara-interview-2",
  title: "Zara interview 2",
  date: "2026-07-27",
  analysisHtml: "<p>Full notes</p>",
  scores: {
    layers: {
      structure: { score: 2 },
      delivery: { score: 2 },
      authority: { score: 2 },
    },
    levels: { voice: "rookie", body: "rookie", words: "pretty good" },
  },
};

test("storage key is new and leaves the theme key alone", () => {
  assert.equal(C.STORAGE_KEY, "speaking-coach-practice");
  assert.equal(JSON.stringify(C).includes("dong-ui-theme"), false);
  assert.equal(
    C.SKILLS.map((s) => s.id).join(","),
    "clarity,pace,fillers,structure,vocal,storytelling"
  );
  assert.equal(
    C.allCitations().some((c) => /\bxp\b/i.test(c.owner) || /\bxp\b/i.test(c.title)),
    false
  );
});

test("every citation points at a page in the wiki excerpt", () => {
  const wiki = readFileSync(
    "/home/ubuntu/.cursor/projects/workspace/uploads/speak_wiki_f537.md",
    "utf8"
  );
  const cites = C.allCitations();
  assert.ok(cites.length >= 12);
  for (const cite of cites) {
    assert.match(cite.why, /\S/, cite.owner);
    assert.ok(cite.why.length < 220, cite.owner + " why should stay one line");
    assert.ok(wiki.includes("===== " + cite.path + " ====="), cite.path);
    assert.ok(wiki.includes("# " + cite.title), cite.title + " @ " + cite.path);
  }
});

test("past sessions derive six skills and an overall score", () => {
  const agg = C.aggregate([zara2, zara1]);
  assert.equal(agg.scoredCount, 2);
  assert.equal(agg.overallAvg, 2);
  const byId = Object.fromEntries(agg.summary.map((s) => [s.id, s]));
  assert.equal(byId.structure.avg, 2);
  assert.equal(byId.pace.avg, 2);
  assert.equal(byId.fillers.avg, 2);
  assert.equal(byId.vocal.avg, 2);
  assert.equal(byId.clarity.avg, 2.75);
  assert.equal(byId.storytelling.avg, 2.75);
  assert.equal(byId.clarity.tier, "rookie");
  assert.equal(agg.timeline[0].date, "2026-07-26");
  assert.equal(agg.timeline[1].slug, "zara-interview-2");
  assert.equal(agg.timeline[0].wpm, null);
  assert.equal(agg.timeline[0].fillerRate, null);
});

test("explicit metrics and skill overrides are preferred", () => {
  const session = {
    slug: "memo",
    date: "2026-08-01",
    analysisHtml: "<p>notes</p>",
    metrics: { wpm: 132, fillerRate: 0.04 },
    scores: {
      layers: { structure: { score: 2 }, delivery: { score: 2 }, authority: { score: 2 } },
      levels: { voice: "rookie", words: "rookie" },
      skills: { pace: 4, vocal: 3 },
    },
  };
  const derived = C.deriveSession(session);
  assert.equal(derived.wpm, 132);
  assert.equal(derived.fillerRate, 0.04);
  assert.equal(derived.skills.pace, 4);
  assert.equal(derived.skills.vocal, 3);
  assert.equal(C.tierFromScore(4), "pretty good");
  assert.equal(C.tierFromScore(4.5), "natural");
});

test("audio-only sessions count toward the streak", () => {
  const memo = { slug: "drive-memo", date: "2026-10-12", title: "Drive" };
  const noScores = { slug: "captions-only", date: "2026-10-11", analysisHtml: "<p>um</p>" };
  const noTranscript = {
    slug: "scores-only",
    date: "2026-10-10",
    scores: { layers: { delivery: { score: 3 } } },
  };
  assert.equal(C.isAudioOnly(memo), true);
  assert.equal(C.isAudioOnly(noScores), true);
  assert.equal(C.isAudioOnly(noTranscript), true);
  assert.equal(C.isAudioOnly(zara1), false);
  assert.equal(C.sessionCountsAsPractice(memo), true);
  assert.equal(C.sessionCountsAsPractice(zara1), true);

  const state = C.emptyState ? null : { v: 1, checkins: ["2026-10-13"], challenges: {} };
  const collected = C.collectPracticeDays([memo, noScores, zara1], {
    v: 1,
    checkins: ["2026-10-13"],
    challenges: {},
  });
  assert.equal(collected.days["2026-10-12"], true);
  assert.equal(collected.days["2026-10-11"], true);
  assert.equal(collected.days["2026-07-26"], true);
  assert.equal(collected.days["2026-10-13"], true);
  assert.equal(collected.audioDays["2026-10-12"], true);
  assert.equal(collected.audioDays["2026-07-26"], undefined);

  const streak = C.currentStreak(collected.days, "2026-10-13");
  assert.equal(streak, 3);
  assert.equal(C.bestStreak(collected.days), 3);
  assert.equal(state.checkins[0], "2026-10-13");
});

test("a check-in alone keeps the streak, and a miss does not invent days", () => {
  const onlyYesterday = { "2026-10-12": true };
  assert.equal(C.currentStreak(onlyYesterday, "2026-10-13"), 1);
  assert.equal(C.currentStreak({}, "2026-10-13"), 0);
  assert.equal(C.currentStreak({ "2026-10-10": true }, "2026-10-13"), 0);
  const store = memoryStorage();
  C.saveState({ v: 1, checkins: ["2026-10-13"], challenges: { "2026-W42": { id: "land-it", done: true } } }, store);
  const loaded = C.loadState(store);
  assert.equal(Array.from(loaded.checkins).join(","), "2026-10-13");
  assert.equal(loaded.challenges["2026-W42"].done, true);
  assert.equal(store.getItem("dong-ui-theme"), null);
  const junk = memoryStorage();
  junk.setItem(C.STORAGE_KEY, "{");
  assert.equal(C.loadState(junk).checkins.length, 0);
});

test("weekly challenges rotate across three wiki-backed reps", () => {
  const ids = [];
  for (let i = 0; i < 6; i++) {
    const iso = C.addDays("2026-10-12", i * 7);
    ids.push(C.challengeForDate(iso).challenge.id);
  }
  assert.deepEqual(ids.slice(0, 3).sort(), ["land-it", "pause-restart", "three-two-one"]);
  assert.equal(ids[0], ids[3]);
  assert.equal(ids[1], ids[4]);
  assert.notEqual(ids[0], ids[1]);
  const today = C.challengeForDate("2026-10-13");
  assert.equal(today.week.id, C.isoWeekId("2026-10-13").id);
  assert.ok(C.CHALLENGES.some((ch) => ch.id === today.challenge.id));
});

test("badges follow logged reps and do not award themselves", () => {
  const none = C.evaluateBadges({
    audioDayCount: 0,
    audioWindow: 0,
    practiceDayCount: 2,
    completed: {},
    tiers: ["rookie"],
  });
  const map = Object.fromEntries(none.map((b) => [b.id, b.earned]));
  assert.equal(map["two-min"], false);
  assert.equal(map["install-21"], false);
  assert.equal(map["pretty-good"], false);
  assert.equal(map.framework, false);

  const some = C.evaluateBadges({
    audioDayCount: 1,
    audioWindow: 4,
    practiceDayCount: 21,
    completed: { "three-two-one": true, "land-it": true },
    tiers: ["pretty good"],
  });
  const earned = Object.fromEntries(some.map((b) => [b.id, b.earned]));
  assert.equal(earned["two-min"], true);
  assert.equal(earned["commute-week"], true);
  assert.equal(earned.framework, true);
  assert.equal(earned["full-stop"], true);
  assert.equal(earned["white-space"], false);
  assert.equal(earned["install-21"], true);
  assert.equal(earned["pretty-good"], true);
  assert.equal(earned.natural, false);
});
