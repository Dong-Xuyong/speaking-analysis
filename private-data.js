/* Private speaking data: data/ and audio/ live in the private repo Dong-Xuyong/speaking-data.
 * Read through the GitHub Contents API with the shared `dong-gh-sync` token (localStorage).
 * No token, or a token without access to speaking-data -> PrivateData.NoAccess error. */
(function (global) {
  "use strict";
  var REPO = "Dong-Xuyong/speaking-data";
  var API = "https://api.github.com/repos/" + REPO + "/contents/";
  function token() {
    try {
      var cfg = JSON.parse(global.localStorage.getItem("dong-gh-sync") || "null");
      return cfg && typeof cfg.token === "string" && cfg.token.trim() ? cfg.token.trim() : "";
    } catch (e) { return ""; }
  }
  function NoAccess(msg) { var e = new Error(msg); e.noAccess = true; return e; }
  async function raw(path) {
    var t = token();
    if (!t) throw NoAccess("No sync token");
    var clean = String(path).split("?")[0].split("/").map(function (s) { return encodeURIComponent(decodeURIComponent(s)); }).join("/");
    var res = await fetch(API + clean, {
      cache: "no-store",
      headers: { Authorization: "Bearer " + t, Accept: "application/vnd.github.raw" }
    });
    if (res.status === 401 || res.status === 403 || (res.status === 404 && /index\.json$/.test(clean))) {
      throw NoAccess("Token cannot read " + REPO + " (" + res.status + ")");
    }
    if (!res.ok) throw new Error("Failed to load " + path + " (" + res.status + ")");
    return res;
  }
  var urls = new Map();
  global.PrivateData = {
    repo: REPO,
    hasToken: function () { return !!token(); },
    json: async function (path) { return (await raw(path)).json(); },
    text: async function (path) { return (await raw(path)).text(); },
    blobUrl: async function (path) {
      if (urls.has(path)) return urls.get(path);
      var blob = await (await raw(path)).blob();
      var u = URL.createObjectURL(new Blob([blob], { type: /\.mp3$/i.test(path) ? "audio/mpeg" : blob.type }));
      urls.set(path, u);
      return u;
    },
    hydrateAudio: function (root) {
      (root || document).querySelectorAll("audio[data-private-src]").forEach(function (el) {
        var p = el.getAttribute("data-private-src");
        el.removeAttribute("data-private-src");
        global.PrivateData.blobUrl(p).then(function (u) { el.src = u; }).catch(function () {});
      });
    }
  };
})(window);
