(function () {
  var adm = window.__adm;
  var URL = adm.URL, KEY = adm.KEY, BOARDS = adm.BOARDS, sb = adm.sb, $ = adm.$, say = adm.say, sayLive = adm.sayLive, td = adm.td, th = adm.th, rpc = adm.rpc, show = adm.show, setView = adm.setView, fmt = adm.fmt, errMsg = adm.errMsg, btn = adm.btn, callFn = adm.callFn, csvCell = adm.csvCell, downloadCsv = adm.downloadCsv, el = adm.el, plural = adm.plural, isOC = adm.isOC, isOwner = adm.isOwner, guard = adm.guard, loadAll = adm.loadAll, render = adm.render, out = adm.out;
  var NEWS = { items: [], editing: null };
  function todayIso() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function newsClear(focus) {
    NEWS.editing = null; $("nwDate").value = todayIso(); $("nwTitle").value = ""; $("nwBody").value = "";
    $("newsFormH").textContent = "Add a news item"; $("nwSave").textContent = "Save the news item";
    if (focus) $("nwTitle").focus();
  }
  async function loadNews() {
    try {
      NEWS.items = await rpc("admin_news_list") || [];
      if (!NEWS.editing && !$("nwDate").value) $("nwDate").value = todayIso();
      var body = $("nwRows"); body.textContent = "";
      if (!NEWS.items.length) { var tr0 = document.createElement("tr"), c0 = td("No news items."); c0.colSpan = 4; tr0.appendChild(c0); body.appendChild(tr0); }
      NEWS.items.forEach(function (n) {
        var tr = document.createElement("tr");
        tr.appendChild(th(n.published_on)); tr.appendChild(td(n.title)); tr.appendChild(td(n.hidden ? "Hidden" : "Shown"));
        var c = document.createElement("td");
        c.appendChild(btn("Edit", function () {
          NEWS.editing = n.id; $("nwDate").value = n.published_on; $("nwTitle").value = n.title; $("nwBody").value = n.body;
          $("newsFormH").textContent = "Edit the news item"; $("nwSave").textContent = "Save the changes"; $("newsFormH").focus();
        }, "alt", "Edit the news item " + n.title));
        c.appendChild(document.createTextNode(" "));
        c.appendChild(btn(n.hidden ? "Show" : "Hide", async function () {
          try { await rpc("admin_news_hide", { p_id: n.id, p_hidden: !n.hidden }); await loadNews(); say(n.hidden ? "The news item is shown again." : "The news item is hidden.", false); }
          catch (e) { say("Error: " + errMsg(e), true); }
        }, n.hidden ? "alt" : "danger", (n.hidden ? "Show the news item " : "Hide the news item ") + n.title));
        tr.appendChild(c); body.appendChild(tr);
      });
    } catch (e) { say("Error: " + errMsg(e), true); }
  }
  $("newsForm").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    try {
      await rpc("admin_news_save", { p_id: NEWS.editing, p_date: $("nwDate").value || null, p_title: $("nwTitle").value, p_body: $("nwBody").value });
      var edited = !!NEWS.editing; newsClear(false); await loadNews();
      say(edited ? "The news item is saved." : "The news item is added. It is on the News page now.", false, function () { return $("nwTitle"); });
    } catch (e) { say("Error: " + errMsg(e), true); }
  });
  $("nwClear").addEventListener("click", function () { newsClear(true); });

  function toLocalInput(iso) {
    if (!iso) return ""; var d = new Date(iso); if (isNaN(d)) return "";
    var p = function (n) { return ("0" + n).slice(-2); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  async function loadNotice() {
    try {
      var n = await rpc("admin_notice_get");
      $("ncMsg").value = n.message || ""; $("ncKind").value = n.kind || "info";
      $("ncStart").value = toLocalInput(n.starts_at); $("ncEnd").value = toLocalInput(n.ends_at); $("ncOn").checked = !!n.active;
      $("ncState").textContent = n.updated_by ? "Last saved by " + n.updated_by + " on " + fmt(n.updated_at) + ". The notice is " + (n.active ? "switched on." : "switched off.") : "No notice has been saved yet.";
    } catch (e) { say("Error: " + errMsg(e), true); }
  }
  $("noticeForm").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    try {
      var s = $("ncStart").value, e2 = $("ncEnd").value;
      await rpc("admin_notice_set", { p_message: $("ncMsg").value, p_kind: $("ncKind").value, p_starts: s ? new Date(s).toISOString() : null, p_ends: e2 ? new Date(e2).toISOString() : null, p_active: $("ncOn").checked });
      await loadNotice();
      say($("ncOn").checked ? "The notice is saved and switched on. It shows on every page." : "The notice is saved and switched off.", false, function () { return $("ncMsg"); });
    } catch (er) { say("Error: " + errMsg(er), true); }
  });
  adm.m.loadNews = loadNews;
  adm.m.loadNotice = loadNotice;
})();
