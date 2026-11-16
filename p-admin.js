(function () {
  var URL = "https://krkrpcnovdobnscknfnw.supabase.co";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  var BOARDS = ["Afghanistan Hand Cricket Board","Australia Hand Cricket Board","Bangladesh Hand Cricket Board","England Hand Cricket Board","Germany Hand Cricket Board","India Hand Cricket Board","Nepal Hand Cricket Board","New Zealand Hand Cricket Board","Pakistan Hand Cricket Board","Scotland Hand Cricket Board","South Africa Hand Cricket Board","Sri Lanka Hand Cricket Board","UAE Hand Cricket Board","USA Hand Cricket Board","Zimbabwe Hand Cricket Board"];
  var sb = window.supabase.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, lock: function (name, timeout, fn) { return fn(); } } });
  var $ = function (id) { return document.getElementById(id); };
  var me = null, entries = [], boardCounts = {};

  /* sayLive: plain written message in a live region (login problems, loading, sign-out). */
  function sayLive(text, isErr) {
    var s = $("status"); s.textContent = text || ""; s.hidden = !text; s.className = "msg" + (isErr ? " err" : "");
    var w = $("status2"); w.textContent = ""; w.hidden = true;
  }
  /* find the button that was pressed again after the page redrew its tables */
  function findBack(op, key) {
    if (op && document.body.contains(op) && op !== document.body) return op;
    if (!key) return null;
    var all = document.querySelectorAll("button, select, input, a, [tabindex]");
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      if (c.id === key || c.getAttribute("aria-label") === key || (c.tagName === "BUTTON" && c.textContent.trim() === key)) return c;
    }
    return null;
  }
  /* say: results of actions. Opens a dialog (read out by the screen reader); the written message stays on the page. */
  function say(text, isErr, focusFn) {
    if (!text) { sayLive(""); return; }
    if (!window.IHCCDialog) { sayLive(text, isErr); return; }
    var op = document.activeElement;
    var key = op && (op.id || op.getAttribute("aria-label") || (op.textContent || "").trim()) || "";
    var s = $("status"); s.textContent = ""; s.hidden = true;
    var w = $("status2"); w.textContent = text; w.hidden = false; w.className = "msg" + (isErr ? " err" : "");
    window.IHCCDialog.show({
      title: (isErr ? "Error. " : "") + text, bad: !!isErr,
      buttons: [{ label: "Close", focus: function () { var f = focusFn && focusFn(); return f || findBack(op, key); } }]
    });
  }
  function show(view, focusLogin) {
    ["loginView", "deniedView", "panel"].forEach(function (v) { $(v).hidden = v !== view; });
    /* after sign-in, move the screen reader cursor to the heading of the new view */
    var hid = view === "panel" ? "statH" : view === "deniedView" ? "deniedH" : (focusLogin ? "loginH" : null);
    if (hid && $(hid)) { $(hid).setAttribute("tabindex", "-1"); $(hid).focus(); }
  }
  function td(text) { var c = document.createElement("td"); c.textContent = text == null ? "" : String(text); return c; }
  function th(text) { var c = document.createElement("th"); c.scope = "row"; c.textContent = text; return c; }

  BOARDS.forEach(function (b) {
    [$("fBoard"), $("aBoard")].forEach(function (sel) { var o = document.createElement("option"); o.value = b; o.textContent = b; sel.appendChild(o); });
  });

  async function rpc(name, args) {
    var r = await sb.rpc(name, args || {});
    if (r.error) throw new Error(r.error.message || "Request failed");
    return r.data;
  }

  async function start() {
    var s = await sb.auth.getSession();
    if (!s.data.session) { show("loginView"); $("who").textContent = ""; return; }
    try {
      me = await rpc("admin_me");
    } catch (e) { sayLive("Could not check your access: " + e.message, true); show("loginView"); return; }
    var email = s.data.session.user.email || "";
    if (!me || !me.is_admin) {
      $("deniedText").textContent = "The account " + email + " is not an IHCC administrator. Sign out and sign in with the correct Google account, or ask the IHCC Owner to add you.";
      show("deniedView"); return;
    }
    $("who").textContent = me.email + " (" + me.role + (me.board_name ? ", " + me.board_name : "") + ")";
    show("panel");
    var vs = $("viewSel");
    Array.prototype.forEach.call(vs.options, function (o) {
      var ok = (o.value === "squads" || o.value === "notes" || o.value === "news" || o.value === "notice") ? (me.role === "owner" || me.role === "core")
        : o.value === "entries" ? (me.role !== "auditor" && me.role !== "election_officer" && me.role !== "core")
        : o.value === "summary" ? ["owner", "verifier", "auditor", "election_officer"].indexOf(me.role) >= 0
        : o.value === "admins" ? me.role === "owner"
        : o.value === "reps" ? me.role === "owner"
        : o.value === "mail" ? me.role === "owner"
        : o.value === "boardtools" ? me.role === "owner"
        : (me.role === "owner" || me.role === "auditor");
      o.disabled = !ok; o.hidden = !ok;
    });
    for (var i = 0; i < vs.options.length; i++) { if (!vs.options[i].disabled) { vs.selectedIndex = i; break; } }
    setView();
    startIdle();
    if (me.role === "owner" || me.role === "core") { M.refreshNoteBadge(); if (!window.__noteTimer) window.__noteTimer = setInterval(function () { M.refreshNoteBadge(); }, 120000); }
    await loadAll();
  }

  function setView() {
    var v = $("viewSel").value, oc = (me.role === "owner" || me.role === "core");
    $("entSec").hidden = v !== "entries"; $("sumSec").hidden = v !== "summary";
    $("statSec").hidden = !(v === "entries" || v === "summary");
    $("squadsSec").hidden = !(v === "squads" && oc);
    $("notesSec").hidden = !(v === "notes" && oc);
    $("newsSec").hidden = !(v === "news" && oc);
    $("noticeSec").hidden = !(v === "notice" && oc);
    if (v === "news" && oc) M.loadNews();
    if (v === "notice" && oc) M.loadNotice();
    $("adminsSec").hidden = !(v === "admins" && me.role === "owner");
    $("repsSec").hidden = !(v === "reps" && me.role === "owner");
    $("mailSec").hidden = !(v === "mail" && me.role === "owner");
    $("btSec").hidden = !(v === "boardtools" && me.role === "owner");
    if (v === "boardtools" && me.role === "owner") M.btInit();
    $("auditSec").hidden = !(v === "audit" && (me.role === "owner" || me.role === "auditor"));
    if (v === "squads" && oc) { M.showSquadHome(); M.loadSquads(); }
    if (v === "notes" && oc) M.loadNotes();
    if (v === "reps" && me.role === "owner") M.loadReps();
    if (v === "mail" && me.role === "owner") M.loadMail();
  }


  /* ---- News and site notice (Owner and Core) ---- */
  var idleTimer = null, IDLE_MS = 30 * 60 * 1000;
  function startIdle() {
    function reset() { clearTimeout(idleTimer); idleTimer = setTimeout(async function () { await out(); sayLive("You were signed out because the page was not used for 30 minutes."); }, IDLE_MS); }
    ["click", "keydown", "touchstart", "change"].forEach(function (ev) { document.addEventListener(ev, reset, true); });
    reset();
  }

  async function loadStats() {
    var s = await rpc("admin_stats");
    $("statLine").textContent = "Total entries: " + s.total + ". Entries today: " + s.today + ". Pending: " + s.pending + ". Confirmation emails not sent: " + s.email_failed + ".";
  }

  async function loadAll() {
    sayLive("Loading");
    try {
      var jobs = [];
      if (["owner", "verifier", "auditor", "election_officer"].indexOf(me.role) >= 0) { jobs.push(loadSummary()); jobs.push(loadStats()); } else { $("sumBody").textContent = ""; }
      if (me.role !== "auditor" && me.role !== "election_officer" && me.role !== "core") jobs.push(loadEntries()); else { entries = []; render(); }
      if (me.role === "owner") jobs.push(loadAdmins());
      if (me.role === "owner" || me.role === "auditor") jobs.push(loadAudit());
      await Promise.all(jobs);
      sayLive("");
    } catch (e) { say("Error: " + e.message, true); }
  }

  async function loadSummary() {
    var rows = await rpc("admin_summary"), by = {};
    rows.forEach(function (r) { by[r.board_name] = r; }); boardCounts = by; boardLine();
    var body = $("sumBody"); body.textContent = "";
    BOARDS.forEach(function (b) {
      var r = by[b] || { total: 0, verified: 0, pending: 0, rejected: 0, has_12: false };
      var tr = document.createElement("tr");
      tr.appendChild(th(b)); tr.appendChild(td(r.total)); tr.appendChild(td(r.verified)); tr.appendChild(td(r.pending)); tr.appendChild(td(r.rejected)); tr.appendChild(td(r.has_12 ? "Yes" : "No"));
      body.appendChild(tr);
    });
  }

  async function loadEntries() { entries = await rpc("admin_list_entries"); render(); }

  function flagsOf(e) {
    var f = [];
    if (e.same_ip_entries > 1) f.push(e.same_ip_entries + " entries from the same IP");
    if (e.same_whatsapp_entries > 1) f.push(e.same_whatsapp_entries + " entries with the same WhatsApp number");
    if (e.same_ip_other_boards > 0) f.push("same IP used for another board");
    if (e.country_mismatch) f.push("IP country differs from the country entered");
    if (e.fast_fill) f.push("form filled in less than 20 seconds");
    return f;
  }

  var LABELS = { created_at: "Submitted", board_name: "Board", display_name: "Display name", real_name: "Real name", email: "Email", whatsapp: "WhatsApp", city: "City", country: "Country", status: "Status", admin_note: "Note", receipt_code: "Registration number", email_status: "Confirmation email", fill_seconds: "Seconds to fill", ip_address: "IP address", ip_city: "IP city", ip_country: "IP country", ip_isp: "Internet provider", device_type: "Device type", device_model: "Device model", device_platform: "System", client_timezone: "Time zone" };
  var ORDER = ["board_name", "display_name", "real_name", "email", "whatsapp", "city", "country", "receipt_code", "created_at", "email_status", "fill_seconds", "ip_address", "ip_city", "ip_country", "ip_isp", "device_type", "device_model", "device_platform", "client_timezone", "admin_note"];
  var canEdit = function () { return ["owner", "core", "verifier"].indexOf(me.role) >= 0; };

  function filtered() {
    var b = $("fBoard").value, s = $("fStatus").value, q = $("fSearch").value.trim().toLowerCase(), fl = $("fFlag").value;
    return entries.filter(function (e) {
      if (b && e.board_name !== b) return false;
      if (s && e.status !== s) return false;
      if (fl && flagsOf(e).length === 0) return false;
      if (q) {
        var hay = [e.display_name, e.real_name, e.email, e.whatsapp, e.receipt_code, e.city, e.country].join(" ").toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function render() {
    var list = filtered(), box = $("entries"); box.textContent = "";
    $("count").textContent = list.length + " of " + entries.length + " entries shown.";
    list.forEach(function (e) {
      var card = document.createElement("details"); card.className = "entry";
      var fl = flagsOf(e);
      var sm = document.createElement("summary");
      sm.textContent = e.display_name + (e.real_name ? " (" + e.real_name + ")" : "") + ", " + e.status + (fl.length ? ", flagged" : "");
      card.appendChild(sm);
      var body = document.createElement("div"); body.className = "body"; card.appendChild(body);
      if (fl.length) { var p = document.createElement("p"); p.className = "flag"; p.textContent = "Flags: " + fl.join("; ") + "."; body.appendChild(p); }
      var dl = document.createElement("dl");
      ORDER.forEach(function (k) {
        if (e[k] === undefined || e[k] === null || e[k] === "") return;
        var dt = document.createElement("dt"); dt.textContent = LABELS[k] || k;
        var dd = document.createElement("dd"); dd.textContent = k === "created_at" ? new Date(e[k]).toLocaleString() : e[k];
        dl.appendChild(dt); dl.appendChild(dd);
      });
      body.appendChild(dl);
      if (canEdit()) {
        var tools = document.createElement("div"); tools.className = "tools";
        var l1 = document.createElement("label"); l1.textContent = "Set status ";
        var sel = document.createElement("select");
        ["pending", "verified", "rejected"].forEach(function (s) { var o = document.createElement("option"); o.textContent = s; if (s === e.status) o.selected = true; sel.appendChild(o); });
        l1.appendChild(sel);
        var l2 = document.createElement("label"); l2.textContent = "Note ";
        var note = document.createElement("input"); note.type = "text"; note.maxLength = 500; note.value = e.admin_note || ""; l2.appendChild(note);
        var save = document.createElement("button"); save.type = "button"; save.textContent = "Save status for " + e.display_name;
        save.addEventListener("click", async function () {
          save.disabled = true;
          try { await rpc("admin_set_status", { p_id: e.id, p_status: sel.value, p_note: note.value }); say("Saved: " + e.display_name + " is now " + sel.value + "."); await Promise.all([loadEntries(), loadSummary(), loadStats()]); }
          catch (er) { say("Could not save: " + er.message, true); }
          save.disabled = false;
        });
        tools.appendChild(l1); tools.appendChild(l2); tools.appendChild(save);
        if (e.email && (me.role === "owner" || me.role === "core")) {
          var mail = document.createElement("a"); mail.href = "mailto:" + e.email + "?subject=" + encodeURIComponent("IHCC squad registration " + (e.receipt_code || ""));
          mail.textContent = "Write an email to " + e.display_name; mail.style.alignSelf = "center"; tools.appendChild(mail);
          var rs = document.createElement("button"); rs.type = "button"; rs.className = "alt";
          rs.textContent = "Send confirmation email again to " + e.display_name + (e.email_status === "sent" ? " (already sent)" : "");
          rs.addEventListener("click", async function () {
            rs.disabled = true;
            try {
              var ses = await sb.auth.getSession();
              var res = await fetch(URL + "/functions/v1/submit-squad-player", { method: "POST", headers: { "content-type": "application/json", "authorization": "Bearer " + ses.data.session.access_token, "apikey": KEY }, body: JSON.stringify({ action: "resend", id: e.id }) });
              var j = await res.json();
              say(j.ok ? "Confirmation email sent again to " + e.display_name + "." : "The email could not be sent.", !j.ok);
              await Promise.all([loadEntries(), loadStats()]);
            } catch (er) { say("Could not send: " + er.message, true); }
            rs.disabled = false;
          });
          tools.appendChild(rs);
        }
        if (me.role === "owner") {
          var del = document.createElement("button"); del.type = "button"; del.className = "danger"; del.textContent = "Delete entry of " + e.display_name;
          var armed = false;
          del.addEventListener("click", async function () {
            if (!armed) { armed = true; del.textContent = "Press again to confirm deleting " + e.display_name; return; }
            del.disabled = true;
            try { await rpc("admin_delete_entry", { p_id: e.id }); say("Deleted the entry of " + e.display_name + "."); await Promise.all([loadEntries(), loadSummary(), loadAudit(), loadStats()]); }
            catch (er) { say("Could not delete: " + er.message, true); del.disabled = false; }
          });
          tools.appendChild(del);
        }
        body.appendChild(tools);
      }
      box.appendChild(card);
    });
  }

  function boardLine() {
    var b = $("fBoard").value, el = $("boardLine");
    if (!b) { el.textContent = ""; return; }
    var r = boardCounts[b];
    el.textContent = r ? b + ": " + r.total + " players (" + r.verified + " verified, " + r.pending + " pending, " + r.rejected + " rejected). " + (r.has_12 ? "Minimum 12 complete." : "Minimum 12 not complete yet.") : b;
  }

  async function loadAdmins() {
    var rows = await rpc("admin_list_admins"), box = $("admins"); box.textContent = "";
    var wrap = document.createElement("div"); wrap.className = "scroll";
    var t = document.createElement("table");
    t.innerHTML = "<thead><tr><th scope='col'>Email</th><th scope='col'>Name</th><th scope='col'>Role</th><th scope='col'>Board</th><th scope='col'>Active</th></tr></thead>";
    var tb = document.createElement("tbody");
    rows.forEach(function (r) { var tr = document.createElement("tr"); tr.appendChild(th(r.email)); tr.appendChild(td(r.display_name)); tr.appendChild(td(r.role)); tr.appendChild(td(r.board_name)); tr.appendChild(td(r.active ? "Yes" : "No")); tb.appendChild(tr); });
    t.appendChild(tb); wrap.appendChild(t); box.appendChild(wrap);
  }

  async function loadAudit() {
    if (!(me.role === "owner" || me.role === "auditor")) return;
    var rows = await rpc("admin_audit"), body = $("auditBody"); body.textContent = "";
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      tr.appendChild(td(new Date(r.at).toLocaleString())); tr.appendChild(td(r.actor_email)); tr.appendChild(td(r.action)); tr.appendChild(td(r.target)); tr.appendChild(td(JSON.stringify(r.details || {})));
      body.appendChild(tr);
    });
  }

  $("admForm").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    try {
      await rpc("admin_upsert_admin", { p_email: $("aEmail").value, p_role: $("aRole").value, p_board: $("aBoard").value || null, p_name: $("aName").value || null, p_active: $("aActive").value === "true" });
      say("Administrator saved: " + $("aEmail").value + "."); $("admForm").reset(); await Promise.all([loadAdmins(), loadAudit()]);
    } catch (e) { say("Could not save the administrator: " + e.message, true); }
  });

  function csvCell(v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  $("csvBtn").addEventListener("click", function () {
    var list = filtered(); if (!list.length) { say("Nothing to download.", true); return; }
    var keys = Object.keys(list[0]).filter(function (k) { return k !== "id"; });
    var lines = [keys.join(",")].concat(list.map(function (e) { return keys.map(function (k) { return csvCell(e[k]); }).join(","); }));
    var blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a"); a.href = window.URL.createObjectURL(blob); a.download = "ihcc-entries-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); a.remove(); say("The CSV file has been downloaded.");
  });

  ["fBoard", "fStatus", "fFlag"].forEach(function (id) { $(id).addEventListener("change", function () { boardLine(); render(); }); });

  // ---- Board representatives and squad progress ----
  function fmt(d) { return d ? new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }) + " PKT" : "Never"; }
  async function callFn(action, data) {
    var ses = await sb.auth.getSession();
    var r = await fetch(URL + "/functions/v1/rep-squad", { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + ses.data.session.access_token, apikey: KEY },
      body: JSON.stringify(Object.assign({ action: action }, data || {})) });
    var j = await r.json().catch(function () { return { ok: false, error: "Unexpected reply." }; });
    if (!j.ok && j.error) throw new Error(j.error);
    return j;
  }
  function errMsg(e) { var m = String(e && e.message || e); return m.indexOf("E|") === 0 ? m.split("|").slice(2).join("|") : m; }
  function btn(label, fn, cls, aria) { var b = document.createElement("button"); b.type = "button"; b.textContent = label; if (cls) b.className = cls; if (aria) b.setAttribute("aria-label", aria); b.addEventListener("click", fn); return b; }

  function downloadCsv(rows, cols, name) {
    var lines = [cols.map(function (c) { return csvCell(c[1]); }).join(",")];
    rows.forEach(function (r) { lines.push(cols.map(function (c) { return csvCell(r[c[0]]); }).join(",")); });
    var blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a"); a.href = window.URL.createObjectURL(blob); a.download = name + "-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
  }
  function isOwner() { return me && me.role === "owner"; }
  function isOC() { return me && (me.role === "owner" || me.role === "core"); }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  (function () {
    if (/Mac|iPhone|iPad/.test(navigator.platform || "")) return;
    var VIEWS = ["squads", "notes", "reps", "mail", "admins", "audit", "entries", "summary", "boardtools"];
    function shown(n) { return !!(n.offsetWidth || n.offsetHeight || n.getClientRects().length) && !n.disabled; }
    document.addEventListener("keydown", function (e) {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat || !me) return;
      var m = /^(?:Key([A-Z])|Digit([0-9]))$/.exec(e.code || ""); if (!m) return;
      if (document.querySelector("dialog[open], .ihcc-wrap")) return;
      var k = m[1] || m[2];
      if (m[2]) {
        var v = VIEWS[parseInt(k, 10) - 1], sel = $("viewSel"), ok = false;
        if (!v) return;
        Array.prototype.forEach.call(sel.options, function (o) { if (o.value === v && !o.disabled && !o.hidden) ok = true; });
        if (!ok) return;
        e.preventDefault(); sel.value = v; setView();
        var h = { squads: "squadsH", notes: "notesH" }[v]; if (h && $(h)) $(h).focus();
        return;
      }
      var list = document.querySelectorAll('[data-sk="' + k + '"]');
      for (var i = 0; i < list.length; i++) {
        if (!shown(list[i])) continue;
        e.preventDefault();
        if (/^(SELECT|INPUT|TEXTAREA)$/.test(list[i].tagName) || list[i].hasAttribute("data-sk-focus")) list[i].focus(); else list[i].click();
        return;
      }
    }, true);
  })();

  /* ---- Board tools (Owner) ---- */
  async function guard(fn) { try { await fn(); } catch (e) { say(errMsg(e), true); } }
  $("viewSel").addEventListener("change", setView);
  $("fSearch").addEventListener("input", render);
  $("reloadBtn").addEventListener("click", loadAll);
  $("signIn").addEventListener("click", function () {
    sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + window.location.pathname, queryParams: { prompt: "select_account" } } });
  });
  async function out() { await sb.auth.signOut({ scope: "global" }); me = null; entries = []; sayLive("You are signed out."); show("loginView", true); $("who").textContent = ""; }
  $("signOut").addEventListener("click", out); $("signOut2").addEventListener("click", out);

  var M = {};
  window.__adm = { URL: URL, KEY: KEY, BOARDS: BOARDS, sb: sb, $: $, say: say, sayLive: sayLive, td: td, th: th, rpc: rpc, show: show, setView: setView, fmt: fmt, errMsg: errMsg, btn: btn, callFn: callFn, csvCell: csvCell, downloadCsv: downloadCsv, el: el, plural: plural, isOC: isOC, isOwner: isOwner, guard: guard, loadAll: loadAll, render: render, out: out, me: function () { return me; }, m: M };
  sb.auth.onAuthStateChange(function (evt) { if (evt === "SIGNED_IN" && !me) start(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
