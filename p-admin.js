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
  function show(view) { ["loginView", "deniedView", "panel"].forEach(function (v) { $(v).hidden = v !== view; }); }
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
    if (me.role === "owner" || me.role === "core") { refreshNoteBadge(); if (!window.__noteTimer) window.__noteTimer = setInterval(refreshNoteBadge, 120000); }
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
    if (v === "news" && oc) loadNews();
    if (v === "notice" && oc) loadNotice();
    $("adminsSec").hidden = !(v === "admins" && me.role === "owner");
    $("repsSec").hidden = !(v === "reps" && me.role === "owner");
    $("mailSec").hidden = !(v === "mail" && me.role === "owner");
    $("btSec").hidden = !(v === "boardtools" && me.role === "owner");
    if (v === "boardtools" && me.role === "owner") btInit();
    $("auditSec").hidden = !(v === "audit" && (me.role === "owner" || me.role === "auditor"));
    if (v === "squads" && oc) { showSquadHome(); loadSquads(); }
    if (v === "notes" && oc) loadNotes();
    if (v === "reps" && me.role === "owner") loadReps();
    if (v === "mail" && me.role === "owner") loadMail();
  }


  /* ---- News and site notice (Owner and Core) ---- */
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

  async function loadReps() {
    try {
      var rows = await rpc("admin_progress"), body = $("repsBody"); body.textContent = "";
      rows.forEach(function (r) {
        var tr = document.createElement("tr"); tr.appendChild(th(r.board));
        var c = document.createElement("td"), inp = document.createElement("input");
        inp.type = "email"; inp.value = r.rep_email || ""; inp.setAttribute("aria-label", "Representative Gmail for " + r.board); inp.style.minWidth = "220px"; c.appendChild(inp); tr.appendChild(c);
        tr.appendChild(td(r.rep_email ? (r.invite_status ? (r.invite_status === "sent" ? "Sent " + fmt(r.invited_at) : r.invite_status) : "Not sent") : "No email set"));
        var a = document.createElement("td");
        a.appendChild(btn("Save", async function () {
          try { await rpc("admin_rep_set", { p_board: r.board, p_email: inp.value }); say("Saved the representative for " + r.board + ". Now send the invitation."); loadReps(); }
          catch (e) { say(errMsg(e), true); }
        }, "", "Save representative for " + r.board));
        if (r.rep_email) {
          a.appendChild(btn(r.invite_status ? "Resend invitation" : "Send invitation", async function () {
            try { var j = await callFn("admin_invite", { board: r.board }); say(j.ok ? "Invitation sent to " + r.rep_email + "." : "The invitation email could not be sent.", !j.ok); loadReps(); }
            catch (e) { say(errMsg(e), true); }
          }, "alt", (r.invite_status ? "Resend invitation to " : "Send invitation to ") + r.board));
          a.appendChild(btn("Remove", async function () {
            try { await rpc("admin_rep_remove", { p_board: r.board }); say("Removed the representative of " + r.board + "."); loadReps(); }
            catch (e) { say(errMsg(e), true); }
          }, "alt", "Remove representative of " + r.board));
        }
        tr.appendChild(a); body.appendChild(tr);
      });
    } catch (e) { say("Error: " + errMsg(e), true); }
  }

  function downloadCsv(rows, cols, name) {
    var lines = [cols.map(function (c) { return csvCell(c[1]); }).join(",")];
    rows.forEach(function (r) { lines.push(cols.map(function (c) { return csvCell(r[c[0]]); }).join(",")); });
    var blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a"); a.href = window.URL.createObjectURL(blob); a.download = name + "-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
  }
  $("remindBtn").addEventListener("click", async function () {
    try { var j = await callFn("admin_reminder"); say("Reminder emails sent to " + j.sent + " board representative" + (j.sent === 1 ? "" : "s") + " with fewer than 12 players."); } catch (e) { say(errMsg(e), true); }
  });
  $("voterBtn").addEventListener("click", async function () {
    try { var rows = await rpc("admin_voter_list"); if (!rows.length) { say("No completed boards yet, so the voter list is empty.", true); return; }
      downloadCsv(rows, [["board", "Board"], ["number", "Number"], ["display_name", "Display name"], ["real_name", "Real name"], ["email", "Gmail"]], "ihcc-voter-list"); say("The voter list was downloaded (" + rows.length + " voters). This download is recorded in the audit log."); }
    catch (e) { say(errMsg(e), true); }
  });


  // ---- Squads of all boards (owner and core) ----
  var MINP = 12, MAXP = 20;
  var SQ = { summary: null, dupC: [], dupN: [], recent: [], board: null, openBtn: null, player: null, playerBtn: null };
  function isOwner() { return me && me.role === "owner"; }
  function isOC() { return me && (me.role === "owner" || me.role === "core"); }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  async function copyText(txt) {
    try { await navigator.clipboard.writeText(txt); return true; } catch (_) {}
    var ta = document.createElement("textarea"); ta.value = txt; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(ta); ta.select(); var ok = false;
    try { ok = document.execCommand("copy"); } catch (_2) {}
    ta.remove(); return ok;
  }
  function timeLeft(deadline) {
    var ms = new Date(deadline) - Date.now();
    if (ms <= 0) return "the deadline has passed";
    var d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
    return plural(d, "day", "days") + ", " + plural(h, "hour", "hours") + " and " + plural(m, "minute", "minutes");
  }
  function minText(b) { return b.count >= MINP ? "Complete" : "Not met, " + (MINP - b.count) + " more needed"; }
  function isLockedStatus(st) { return st === "Final submitted" || st === "Auto-locked at deadline" || st === "Not eligible (under 12)"; }
  function showSquadHome() { $("sqHome").hidden = false; $("sqBoard").hidden = true; }

  async function loadSquads() {
    try {
      var res = await Promise.all([rpc("admin_squads_summary"), rpc("admin_dup_flags"), rpc("admin_dup_names"), rpc("admin_recent_activity")]);
      SQ.summary = res[0]; SQ.dupC = res[1] || []; SQ.dupN = res[2] || []; SQ.recent = res[3] || [];
      renderSquadHome();
      $("sqLoaded").textContent = "Loaded at " + new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) + " Pakistan time.";
    } catch (e) { say("Error: " + errMsg(e), true); }
  }

  function renderSquadHome() {
    var B = SQ.summary.boards, T = SQ.summary.totals, ul, i;
    Array.prototype.forEach.call(document.querySelectorAll("#sqHome [data-ownerbtn]"), function (n) { n.hidden = !isOwner(); });
    // overall
    var started = B.filter(function (b) { return b.count > 0; }).length;
    var minc = B.filter(function (b) { return b.count >= MINP; }).length;
    var fin = B.filter(function (b) { return b.is_final; }).length;
    var risk = B.filter(function (b) { return b.status === "At risk" || b.status === "Not eligible (under 12)"; }).length;
    var withRep = B.filter(function (b) { return b.rep_email; }).length;
    var signed = B.filter(function (b) { return b.last_sign_in; }).length;
    ul = $("sqOverall"); ul.textContent = "";
    [
      "Players in all teams: " + T.players + ".",
      "Entries added today: " + T.added_today + ". Changed today: " + T.changed_today + ".",
      "Teams that started: " + started + " of " + B.length + ".",
      "Teams with the minimum of " + MINP + " players: " + minc + " of " + B.length + ".",
      "Teams that submitted the final list: " + fin + " of " + B.length + ".",
      "Teams at risk or not eligible: " + risk + ".",
      "Representatives who have signed in: " + signed + " of " + withRep + ".",
      "Deadline: 31 October 2026, 11:59 PM Pakistan time. Time left: " + timeLeft(T.deadline) + "."
    ].forEach(function (t) { ul.appendChild(el("li", t)); });

    // needs attention
    var att = [];
    B.forEach(function (b) {
      var nm = b.board, n = b.count;
      if (!b.rep_email) { att.push({ t: nm + ": no representative is set.", b: nm }); }
      else if (!b.invite_status) { att.push({ t: nm + ": the invitation email was not sent.", b: nm }); }
      else if (b.invite_status !== "sent") { att.push({ t: nm + ": the invitation email failed.", b: nm }); }
      else if (!b.last_sign_in) { att.push({ t: nm + ": the representative has not signed in yet.", b: nm }); }
      if (b.status === "At risk") att.push({ t: nm + ": at risk. Only " + n + " of " + MINP + " players and the deadline is close.", b: nm });
      if (b.status === "Not eligible (under 12)") att.push({ t: nm + ": not eligible. Fewer than " + MINP + " players at the deadline.", b: nm });
      if (n > 0 && n < MINP && !b.is_final && b.last_activity && (Date.now() - new Date(b.last_activity)) > 24 * 36e5) att.push({ t: nm + ": no activity for more than 24 hours. " + n + " of " + MINP + " players.", b: nm });
      if (b.mail_failed > 0) att.push({ t: nm + ": " + plural(b.mail_failed, "player confirmation email", "player confirmation emails") + " failed. Check the Gmail address.", b: nm });
    });
    SQ.dupC.slice(0, 10).forEach(function (d) { att.push({ t: "Same " + d.match + " in two teams: " + d.board + " (" + d.display_name + ") and " + d.other_board + " (" + d.other_display_name + ").", b: d.board }); });
    if (SQ.dupC.length > 10) att.push({ t: "And " + (SQ.dupC.length - 10) + " more players with the same Gmail or WhatsApp number in two teams.", b: null });
    SQ.dupN.slice(0, 10).forEach(function (d) { att.push({ t: "Same display name in two teams: " + d.board + " (" + d.display_name + ") and " + d.other_board + " (" + d.other_display_name + ").", b: d.board }); });
    if (SQ.dupN.length > 10) att.push({ t: "And " + (SQ.dupN.length - 10) + " more players with the same display name in two teams.", b: null });
    SQ.attCount = att.length;
    ul = $("sqAttn"); ul.textContent = "";
    if (!att.length) ul.appendChild(el("li", "Nothing needs attention right now."));
    att.forEach(function (a) {
      var l = el("li", a.t);
      if (a.b) { l.appendChild(document.createTextNode(" ")); l.appendChild(btn("Open", function (ev) { openBoard(a.b, ev.currentTarget); }, "alt", "Open " + a.b)); }
      ul.appendChild(l);
    });

    // recent activity
    ul = $("sqRecent"); ul.textContent = "";
    if (!SQ.recent.length) ul.appendChild(el("li", "No activity yet."));
    SQ.recent.forEach(function (r) { ul.appendChild(el("li", fmt(r.at) + ": " + r.board + ", " + r.what + ".")); });

    renderTeams();
    updateListSel();
  }

  function listLabel(v) {
    var n = { teams: SQ.summary.boards.length, attn: SQ.attCount || 0, recent: SQ.recent.length };
    return { teams: "All teams", attn: "Needs attention", recent: "Recent activity" }[v] + " (" + n[v] + ")";
  }
  function updateListSel() {
    var sel = $("sqListSel");
    Array.prototype.forEach.call(sel.options, function (o) { o.textContent = listLabel(o.value); });
    var v = sel.value;
    $("sqTeamsWrap").hidden = v !== "teams"; $("sqAttnWrap").hidden = v !== "attn"; $("sqRecentWrap").hidden = v !== "recent";
    $("sqListNote").textContent = "Showing: " + listLabel(v).replace(/ \((\d+)\)$/, "") + ", " + plural({ teams: SQ.summary.boards.length, attn: SQ.attCount || 0, recent: SQ.recent.length }[v], "item", "items") + ".";
  }
  $("sqListSel").addEventListener("change", updateListSel);

  function renderTeams() {
    var B = SQ.summary.boards.slice(), f = $("sqFilter").value, so = $("sqSort").value;
    var shown = B.filter(function (b) {
      if (f === "all") return true;
      if (f === "locked") return b.status === "Auto-locked at deadline" || b.status === "Not eligible (under 12)";
      return b.status === f;
    });
    if (so === "few") shown.sort(function (a, b) { return a.count - b.count; });
    else if (so === "many") shown.sort(function (a, b) { return b.count - a.count; });
    else if (so === "recent") shown.sort(function (a, b) { return (new Date(b.last_activity || 0)) - (new Date(a.last_activity || 0)); });
    else if (so === "name") shown.sort(function (a, b) { return a.board.localeCompare(b.board); });
    var body = $("sqRows"); body.textContent = "";
    shown.forEach(function (b) {
      var tr = document.createElement("tr");
      tr.appendChild(th(b.board));
      var c = document.createElement("td"); c.appendChild(document.createTextNode(b.count + " of " + MAXP + " "));
      var pr = document.createElement("progress"); pr.className = "pbar"; pr.max = MAXP; pr.value = b.count; pr.setAttribute("aria-hidden", "true"); c.appendChild(pr); tr.appendChild(c);
      tr.appendChild(td(minText(b))); tr.appendChild(td(b.status));
      tr.appendChild(td(b.last_activity ? fmt(b.last_activity) : "None"));
      var o = document.createElement("td");
      var ob = btn("Open", function (ev) { openBoard(b.board, ev.currentTarget); }, "alt", "Open " + b.board); ob.setAttribute("data-board", b.board);
      o.appendChild(ob); tr.appendChild(o);
      body.appendChild(tr);
    });
    $("sqTeamsNote").textContent = "Showing " + shown.length + " of " + B.length + " teams.";
  }
  $("sqFilter").addEventListener("change", renderTeams);
  $("sqSort").addEventListener("change", renderTeams);
  $("sqReload").addEventListener("click", loadSquads);

  // ----- one team -----
  async function openBoard(name, fromBtn) {
    if (fromBtn) SQ.openBtn = fromBtn;
    try {
      var d = await rpc("admin_board_detail", { p_board: name });
      SQ.board = d; SQ.player = null; renderBoard();
      $("sqHome").hidden = true; $("sqBoard").hidden = false; $("sbH").focus();
    } catch (e) { say("Error: " + errMsg(e), true); }
  }
  function renderBoard() {
    var d = SQ.board, n = (d.players || []).length;
    $("sbH").textContent = d.board;
    var ul = $("sbInfo"); ul.textContent = "";
    [
      "Status: " + d.status + ".",
      "Players: " + n + " of " + MAXP + ". Minimum of " + MINP + ": " + (n >= MINP ? "complete" : "not met, " + (MINP - n) + " more needed") + ".",
      "Representative: " + (d.rep_email || "not set") + ".",
      "Invitation: " + (d.invite_status ? (d.invite_status === "sent" ? "sent " + fmt(d.invited_at) : d.invite_status) : "not sent") + ".",
      "Last sign-in: " + fmt(d.last_sign_in) + ".",
      "Terms accepted: " + (d.consent_at ? fmt(d.consent_at) : "not yet") + ".",
      d.is_final ? "Final list submitted: " + fmt(d.final_at) + "." : "Final list: not submitted.",
      d.reopen_count > 0 ? "Reopened " + plural(d.reopen_count, "time", "times") + " after the final submit." : null
    ].forEach(function (t) { if (t) ul.appendChild(el("li", t)); });
    $("sbRemind").hidden = !(d.rep_email && !d.is_final);
    var lk = $("sbLock"), canUnlock = d.is_final || d.status === "Auto-locked at deadline" || d.status === "Not eligible (under 12)";
    if (isOwner()) {
      if (canUnlock) { lk.hidden = false; lk.textContent = "Unlock this team"; lk.dataset.mode = "unlock"; }
      else if (d.owner_unlock) { lk.hidden = false; lk.textContent = "Lock this team"; lk.dataset.mode = "lock"; }
      else lk.hidden = true;
    } else lk.hidden = true;
    $("sbPlayer").hidden = true;
    var body = $("sbRows"); body.textContent = "";
    if (!n) { var tr0 = document.createElement("tr"), c0 = td("No players yet."); c0.colSpan = 5; tr0.appendChild(c0); body.appendChild(tr0); }
    (d.players || []).forEach(function (p) {
      var tr = document.createElement("tr");
      tr.appendChild(td(p.number + (p.number <= MINP ? " (voter)" : " (not a voter)")));
      tr.appendChild(td(p.display_name)); tr.appendChild(td(p.real_name));
      tr.appendChild(td(p.mail_status === "sent" ? "Sent" : (p.mail_status === "failed" ? "Failed" : "Not sent")));
      var c = document.createElement("td");
      var b = btn("Details", function (ev) { showPlayer(p, ev.currentTarget); }, "alt", "Details of player " + p.number + ", " + p.display_name);
      c.appendChild(b); tr.appendChild(c); body.appendChild(tr);
    });
  }
  function backToTeams() {
    var d = SQ.board; showSquadHome();
    var b = d && document.querySelector('#sqRows [data-board="' + d.board.replace(/"/g, '\\"') + '"]');
    var ob = SQ.openBtn;
    if (ob && document.body.contains(ob) && ob.offsetParent !== null) ob.focus();
    else if (b && !$("sqTeamsWrap").hidden) b.focus(); else if (!$("sqTeamsWrap").hidden) $("sqTeamsH").focus(); else $("sqListSel").focus();
  }
  $("sbBack").addEventListener("click", backToTeams);
  $("sbReload").addEventListener("click", function () { if (SQ.board) openBoard(SQ.board.board); });

  function squadText(d) {
    var out = [d.board + " - " + (d.players || []).length + " players - " + d.status];
    (d.players || []).forEach(function (p) {
      out.push(p.number + ". Display name: " + p.display_name + "; Real name: " + p.real_name + "; Gmail: " + p.email + "; WhatsApp: " + p.whatsapp + "; City: " + p.city + "; Country: " + p.country + "; Registration number: " + p.receipt_code + (p.number <= MINP ? "; Voter" : ""));
    });
    return out.join("\n");
  }
  $("sbCopy").addEventListener("click", async function () {
    var d = SQ.board; if (!d || !(d.players || []).length) { say("There are no players to copy.", true); return; }
    if (!(await copyText(squadText(d)))) { say("Copy did not work in this browser. Use Download instead.", true); return; }
    try { await rpc("admin_log_export", { p_kind: "copy_board", p_target: d.board, p_rows: d.players.length }); } catch (_) {}
    say("The squad of " + d.board + " was copied (" + plural(d.players.length, "player", "players") + ").");
  });
  $("sbCsv").addEventListener("click", async function () {
    var d = SQ.board; if (!d || !(d.players || []).length) { say("There are no players to download.", true); return; }
    var rows = d.players.map(function (p) { return { board: d.board, number: p.number, display_name: p.display_name, real_name: p.real_name, email: p.email, whatsapp: p.whatsapp, city: p.city, country: p.country, receipt_code: p.receipt_code }; });
    downloadCsv(rows, [["board", "Board"], ["number", "Number"], ["display_name", "Display name"], ["real_name", "Real name"], ["email", "Gmail"], ["whatsapp", "WhatsApp"], ["city", "City"], ["country", "Country"], ["receipt_code", "Registration number"]], "ihcc-squad-" + d.board.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase());
    try { await rpc("admin_log_export", { p_kind: "download_board", p_target: d.board, p_rows: rows.length }); } catch (_) {}
    say("The squad of " + d.board + " was downloaded (" + plural(rows.length, "player", "players") + ").");
  });
  $("sbRemind").addEventListener("click", async function () {
    var d = SQ.board; if (!d) return;
    try {
      var j = await callFn("admin_remind_one", { board: d.board });
      if (j.ok) say("A reminder was sent to " + j.email + "."); else say("The reminder email could not be sent. Please try again later.", true);
    } catch (e) { say(errMsg(e), true); }
  });
  $("sbLock").addEventListener("click", async function () {
    var d = SQ.board; if (!d) return; var unlock = this.dataset.mode === "unlock";
    try { await rpc("admin_set_unlock", { p_board: d.board, p_unlock: unlock }); say(d.board + (unlock ? " is unlocked." : " is locked.")); await openBoard(d.board); }
    catch (e) { say(errMsg(e), true); }
  });

  // ----- one player -----
  function showPlayer(p, fromBtn) {
    SQ.player = p; SQ.playerBtn = fromBtn;
    $("spH").textContent = "Details of player " + p.number + ": " + p.display_name;
    var dl = $("spList"); dl.textContent = "";
    [["Display name", p.display_name], ["Real name", p.real_name], ["Gmail", p.email], ["WhatsApp number", p.whatsapp], ["City", p.city], ["Country", p.country],
     ["Registration number", p.receipt_code], ["Number in the squad", p.number + (p.number <= MINP ? " (voter)" : " (not a voter)")],
     ["Added", fmt(p.created_at)], ["Last changed", fmt(p.updated_at)],
     ["Confirmation email", p.mail_status === "sent" ? "Sent" : (p.mail_status === "failed" ? "Failed. Check the Gmail address." : "Not sent")]
    ].forEach(function (x) { dl.appendChild(el("dt", x[0])); dl.appendChild(el("dd", x[1])); });
    $("sbPlayer").hidden = false; $("spH").focus();
  }
  async function logPlayerCopy() { var d = SQ.board, p = SQ.player; if (d && p) { try { await rpc("admin_log_export", { p_kind: "copy_player", p_target: d.board + " / " + p.receipt_code, p_rows: 1 }); } catch (_) {} } }
  $("spCopy").addEventListener("click", async function () {
    var p = SQ.player, d = SQ.board; if (!p) return;
    var txt = ["Board: " + d.board, "Display name: " + p.display_name, "Real name: " + p.real_name, "Gmail: " + p.email, "WhatsApp number: " + p.whatsapp, "City: " + p.city, "Country: " + p.country, "Registration number: " + p.receipt_code].join("\n");
    if (!(await copyText(txt))) { say("Copy did not work in this browser.", true); return; }
    await logPlayerCopy(); say("The details of " + p.display_name + " were copied.", false, function () { return $("spCopy"); });
  });
  $("spGmail").addEventListener("click", async function () {
    var p = SQ.player; if (!p) return;
    if (!(await copyText(p.email))) { say("Copy did not work in this browser.", true); return; }
    await logPlayerCopy(); say("The Gmail address of " + p.display_name + " was copied.", false, function () { return $("spGmail"); });
  });
  $("spWa").addEventListener("click", async function () {
    var p = SQ.player; if (!p) return;
    if (!(await copyText(p.whatsapp))) { say("Copy did not work in this browser.", true); return; }
    await logPlayerCopy(); say("The WhatsApp number of " + p.display_name + " was copied.", false, function () { return $("spWa"); });
  });
  $("spClose").addEventListener("click", function () {
    $("sbPlayer").hidden = true; var b = SQ.playerBtn;
    if (b && document.body.contains(b)) b.focus(); else $("sbPlayersH").focus();
  });

  // ----- copy and download for all teams -----
  $("sqCopyTeams").addEventListener("click", async function () {
    if (!SQ.summary) return;
    var lines = SQ.summary.boards.map(function (b) { return b.board + ": " + b.count + " of " + MAXP + " players. Minimum of " + MINP + ": " + minText(b) + ". Status: " + b.status + "."; });
    if (!(await copyText(lines.join("\n")))) { say("Copy did not work in this browser.", true); return; }
    say("The list of all teams was copied.");
  });
  $("sqCopy").addEventListener("click", async function () {
    try {
      var rows = await rpc("admin_all_squads_copy"); if (!rows.length) { say("There are no players yet.", true); return; }
      var out = [], cur = null;
      rows.forEach(function (r) {
        if (r.board !== cur) { if (cur) out.push(""); cur = r.board; out.push(r.board + " - " + r.status); }
        out.push(r.number + ". Display name: " + r.display_name + "; Real name: " + r.real_name + "; Gmail: " + r.email + "; WhatsApp: " + r.whatsapp + "; City: " + r.city + "; Country: " + r.country + "; Registration number: " + r.receipt_code);
      });
      if (!(await copyText(out.join("\n")))) { say("Copy did not work in this browser. Use Download instead.", true); return; }
      say("All squads were copied (" + plural(rows.length, "player", "players") + "). This is recorded in the audit log.");
    } catch (e) { say(errMsg(e), true); }
  });
  $("sqCsv").addEventListener("click", async function () {
    try {
      var rows = await rpc("admin_all_squads"); if (!rows.length) { say("There are no players yet.", true); return; }
      downloadCsv(rows, [["board", "Board"], ["number", "Number"], ["display_name", "Display name"], ["real_name", "Real name"], ["email", "Gmail"], ["whatsapp", "WhatsApp"], ["city", "City"], ["country", "Country"], ["receipt_code", "Registration number"], ["status", "Board status"]], "ihcc-all-squads");
      say("All squads were downloaded (" + plural(rows.length, "player", "players") + "). This is recorded in the audit log.");
    } catch (e) { say(errMsg(e), true); }
  });

  // ---- Notes between administrators (owner and core) ----
  var NOTES = { inbox: [], targets: [], openBtn: null };
  function setNoteBadge(n) {
    Array.prototype.forEach.call($("viewSel").options, function (o) { if (o.value === "notes") o.textContent = "Notes" + (n ? " (" + n + " new)" : ""); });
    $("noteBanner").hidden = !n;
    $("noteBannerText").textContent = n ? "You have " + plural(n, "new note", "new notes") + "." : "";
  }
  async function refreshNoteBadge() {
    if (!isOC()) return;
    try { setNoteBadge(await rpc("admin_notes_unread")); } catch (_) {}
  }
  $("noteBannerBtn").addEventListener("click", function () {
    $("viewSel").value = "notes"; setView(); $("notesH").focus();
  });
  async function loadNotes() {
    try {
      var d = await rpc("admin_notes_inbox"); NOTES.inbox = d.notes || []; setNoteBadge(d.unread || 0);
      var body = $("ntRows"); body.textContent = "";
      if (!NOTES.inbox.length) { var tr0 = document.createElement("tr"), c0 = td("No notes."); c0.colSpan = 5; tr0.appendChild(c0); body.appendChild(tr0); }
      NOTES.inbox.forEach(function (n) {
        var tr = document.createElement("tr");
        tr.appendChild(th(n.from_name || n.from_email)); tr.appendChild(td(fmt(n.created_at)));
        tr.appendChild(td(n.body.length > 80 ? n.body.slice(0, 80) + "..." : n.body));
        tr.appendChild(td(n.read ? "Read" : "New"));
        var c = document.createElement("td");
        c.appendChild(btn("Open", function (ev) { readNote(n, ev.currentTarget); }, "alt", "Open the note from " + (n.from_name || n.from_email)));
        tr.appendChild(c); body.appendChild(tr);
      });
      $("notesNote").textContent = NOTES.inbox.length + " of 50 notes kept. " + (d.unread ? plural(d.unread, "new note", "new notes") + "." : "No new notes.");
    } catch (e) { say("Error: " + errMsg(e), true); }
  }
  async function readNote(n, fromBtn) {
    NOTES.openBtn = fromBtn;
    $("ntReadH").textContent = "Note from " + (n.from_name || n.from_email);
    $("ntReadMeta").textContent = n.from_email + ", " + fmt(n.created_at);
    $("ntReadBody").textContent = n.body;
    $("ntRead").hidden = false; $("ntReadH").focus();
    if (!n.read) {
      try { await rpc("admin_note_mark_read", { p_id: n.id }); n.read = true; fromBtn.closest("tr").children[3].textContent = "Read"; var left = NOTES.inbox.filter(function (x) { return !x.read; }).length; setNoteBadge(left); $("notesNote").textContent = NOTES.inbox.length + " of 50 notes kept. " + (left ? plural(left, "new note", "new notes") + "." : "No new notes."); } catch (_) {}
    }
  }
  $("ntReadClose").addEventListener("click", function () {
    $("ntRead").hidden = true; var b = NOTES.openBtn; if (b && document.body.contains(b)) b.focus(); else $("ntListH").focus();
  });
  $("ntReload").addEventListener("click", loadNotes);
  $("ntNew").addEventListener("click", async function () {
    try {
      NOTES.targets = await rpc("admin_note_targets");
      if (!NOTES.targets.length) { say("There is no other administrator to send a note to.", true); return; }
      var box = $("ntTo"); box.textContent = ""; $("ntAll").checked = false;
      NOTES.targets.forEach(function (t) {
        var l = document.createElement("label"); l.className = "opt";
        var c = document.createElement("input"); c.type = "checkbox"; c.value = t.email; c.name = "ntTo";
        l.appendChild(c); l.appendChild(document.createTextNode(t.name + " (" + (t.role === "owner" ? "owner" : "core") + ", " + t.email + ")")); box.appendChild(l);
      });
      $("ntBody").value = ""; $("ntCount").textContent = "0 of 1000 characters";
      $("ntCompose").hidden = false; $("ntComposeH").focus();
    } catch (e) { say(errMsg(e), true); }
  });
  $("ntAll").addEventListener("change", function () {
    var on = this.checked; Array.prototype.forEach.call(document.querySelectorAll('input[name="ntTo"]'), function (c) { c.checked = on; });
  });
  $("ntBody").addEventListener("input", function () { $("ntCount").textContent = this.value.length + " of 1000 characters"; });
  $("ntCancel").addEventListener("click", function () { $("ntCompose").hidden = true; $("ntNew").focus(); });
  $("ntCompose").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var to = Array.prototype.map.call(document.querySelectorAll('input[name="ntTo"]:checked'), function (c) { return c.value; });
    if (!to.length) { say("Choose at least one administrator.", true, function () { return document.querySelector('input[name="ntTo"]'); }); return; }
    if (!$("ntBody").value.trim()) { say("Write the note first.", true, function () { return $("ntBody"); }); return; }
    try {
      var j = await rpc("admin_note_send", { p_to: to, p_body: $("ntBody").value });
      $("ntCompose").hidden = true;
      say("The note was sent to " + plural(j.recipients, "administrator", "administrators") + ".", false, function () { return $("ntNew"); });
    } catch (e) { say(errMsg(e), true, function () { return $("ntBody"); }); }
  });
  $("ntSentBtn").addEventListener("click", async function () {
    try {
      var rows = await rpc("admin_notes_sent"), body = $("ntSentRows"); body.textContent = "";
      if (!rows.length) { var tr0 = document.createElement("tr"), c0 = td("You have not sent any notes."); c0.colSpan = 3; tr0.appendChild(c0); body.appendChild(tr0); }
      rows.forEach(function (n) {
        var tr = document.createElement("tr"); tr.appendChild(td(fmt(n.created_at)));
        tr.appendChild(td(n.to.map(function (t) { return t.name + (t.read ? " (read)" : " (not read yet)"); }).join(", ")));
        tr.appendChild(td(n.body)); body.appendChild(tr);
      });
      $("ntSentWrap").hidden = false; $("ntSentH").focus();
    } catch (e) { say(errMsg(e), true); }
  });
  $("ntClear").addEventListener("click", function () {
    if (!NOTES.inbox.length) { say("There are no notes to clear."); return; }
    window.IHCCDialog.show({
      title: "Clear all " + NOTES.inbox.length + " notes? They will be removed from your list.",
      buttons: [
        { label: "Clear all notes", onClick: async function () { try { await rpc("admin_notes_clear_all"); await loadNotes(); } catch (e) { say(errMsg(e), true); } }, focus: function () { return $("ntNew"); } },
        { label: "Cancel", focus: function () { return $("ntClear"); } }
      ]
    });
  });


  // ---- Send email (owner only) ----
  var DAILY = 240;
  async function callMail(action, data) {
    var ses = await sb.auth.getSession();
    var r = await fetch(URL + "/functions/v1/owner-mail", { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + ses.data.session.access_token, apikey: KEY },
      body: JSON.stringify(Object.assign({ action: action }, data || {})) });
    var j = await r.json().catch(function () { return { ok: false, error: "Unexpected reply." }; });
    if (!j.ok && j.error && action !== "test") throw new Error(j.error);
    return j;
  }
  BOARDS.forEach(function (b, i) {
    var l = document.createElement("label"); l.className = "opt";
    var c = document.createElement("input"); c.type = "checkbox"; c.value = b; c.name = "mBoard";
    l.appendChild(c); l.appendChild(document.createTextNode(b)); $("mBoards").appendChild(l);
  });
  function mAud() { return document.querySelector('input[name="mAud"]:checked').value; }
  function mBoardsSel() { return Array.prototype.map.call(document.querySelectorAll('input[name="mBoard"]:checked'), function (c) { return c.value; }); }
  function mSync() { var a = mAud(); $("mBoardsSet").hidden = a !== "reps"; $("mOneSet").hidden = a !== "one"; }
  Array.prototype.forEach.call(document.querySelectorAll('input[name="mAud"]'), function (r) { r.addEventListener("change", mSync); });
  mSync();
  function mArgs() { var a = mAud(); return { p_audience: a, p_boards: a === "reps" && mBoardsSel().length ? mBoardsSel() : null, p_email: a === "one" ? $("mEmail").value : null, p_name: a === "one" ? $("mName").value : null }; }
  var mSentToday = 0;
  function mBudgetLine() { $("mailBudget").textContent = "Today " + mSentToday + " of " + DAILY + " campaign emails are used. " + Math.max(0, DAILY - mSentToday) + " are left for today."; }

  async function loadMail() {
    try {
      var d = await rpc("admin_mail_list"); mSentToday = d.sent_today || 0; mBudgetLine();
      var body = $("mHist"); body.textContent = "";
      if (!d.campaigns.length) { var tr0 = document.createElement("tr"); var c0 = td("No emails have been created yet."); c0.colSpan = 8; tr0.appendChild(c0); body.appendChild(tr0); }
      d.campaigns.forEach(function (c) {
        var tr = document.createElement("tr");
        tr.appendChild(td(fmt(c.created_at))); tr.appendChild(td(c.detail)); tr.appendChild(td(c.subject));
        tr.appendChild(td(c.total)); tr.appendChild(td(c.sent)); tr.appendChild(td(c.failed));
        tr.appendChild(td(c.status === "cancelled" ? "Stopped" : c.pending));
        var a = document.createElement("td");
        a.appendChild(btn("Details", function () { showMailDetail(c); }, "alt", "Details of the email " + c.subject));
        if (c.failed > 0 && c.status !== "cancelled") a.appendChild(btn("Send failed again", async function () {
          try { say("Sending again."); var j = await callMail("retry", { campaign_id: c.id }); say("Tried again: " + j.sent + " sent, " + j.failed + " failed, " + j.pending + " waiting."); loadMail(); }
          catch (e) { say(errMsg(e), true); }
        }, "alt", "Send the failed emails of " + c.subject + " again"));
        if (c.pending > 0 && c.status !== "cancelled") {
          a.appendChild(btn("Send waiting now", async function () {
            try { var j = await callMail("send", { campaign_id: c.id }); say("Sent " + j.sent + ", failed " + j.failed + ", still waiting " + j.pending + (j.pending && j.budget_left === 0 ? ". Today's limit is used. The rest goes tomorrow automatically." : ".")); loadMail(); }
            catch (e) { say(errMsg(e), true); }
          }, "alt", "Send the waiting emails of " + c.subject + " now"));
          a.appendChild(btn("Stop remaining", async function () {
            try { var j = await rpc("admin_mail_cancel", { p_campaign: c.id }); say("Stopped. " + j.stopped + " waiting " + (j.stopped === 1 ? "email" : "emails") + " will not be sent."); loadMail(); }
            catch (e) { say(errMsg(e), true); }
          }, "danger", "Stop the waiting emails of " + c.subject));
        }
        tr.appendChild(a); body.appendChild(tr);
      });
    } catch (e) { say("Error: " + errMsg(e), true); }
  }
  async function showMailDetail(c) {
    try {
      var rows = await rpc("admin_mail_recipients", { p_campaign: c.id }), b = $("mDetailBody"); b.textContent = "";
      rows.forEach(function (r) { var tr = document.createElement("tr"); tr.appendChild(td(r.email)); tr.appendChild(td(r.board)); tr.appendChild(td(r.status)); tr.appendChild(td(r.error)); b.appendChild(tr); });
      $("mDetail").hidden = false; var h = $("mDetailH"); h.textContent = "People of the email " + c.subject + ": " + rows.length; h.focus();
    } catch (e) { say(errMsg(e), true); }
  }
  function mValid() {
    if ($("mSubject").value.trim().length < 3) { say("Write a subject first.", true); return false; }
    if ($("mBody").value.trim().length < 3) { say("Write the message first.", true); return false; }
    return true;
  }
  var mPending = null;
  $("mReview").addEventListener("click", async function () {
    if (!mValid()) return;
    try {
      var a = await rpc("admin_mail_audience", mArgs()), list = a.recipients || [];
      if (!list.length) { say("No one is in this group yet.", true); return; }
      mPending = { args: mArgs(), count: list.length };
      var d = await rpc("admin_mail_list"); mSentToday = d.sent_today || 0; mBudgetLine();
      var left = Math.max(0, DAILY - mSentToday), now = Math.min(left, list.length);
      var b = $("mReviewBody2"); b.textContent = "";
      list.forEach(function (r) { var tr = document.createElement("tr"); tr.appendChild(td(r.email)); tr.appendChild(td(r.board)); tr.appendChild(td(r.name)); b.appendChild(tr); });
      $("mReviewH").textContent = "Review: this email goes to " + list.length + " " + (list.length === 1 ? "person" : "people");
      $("mReviewInfo").textContent = now >= list.length ? "All of them are sent now." : now + " are sent now and " + (list.length - now) + " tomorrow, because of the daily limit.";
      $("mReviewSubj").textContent = ($("mSubject").value.trim().indexOf("[IHCC]") === 0 ? "" : "[IHCC] ") + $("mSubject").value.trim();
      $("mReviewBody").textContent = $("mBody").value.trim();
      $("mConfirmRow").hidden = list.length <= 20; $("mConfirm").value = "";
      $("mReviewBox").hidden = false; $("mailForm").hidden = true; $("mReviewH").focus();
    } catch (e) { say(errMsg(e), true); }
  });
  $("mBack").addEventListener("click", function () { $("mReviewBox").hidden = true; $("mailForm").hidden = false; $("mailFormH").setAttribute("tabindex", "-1"); $("mailFormH").focus(); });
  $("mTest").addEventListener("click", async function () {
    if (!mValid()) return;
    try { var j = await callMail("test", { subject: $("mSubject").value, body: $("mBody").value });
      say(j.ok ? "A test email was sent to " + j.to + "." : "The test email could not be sent." + (j.error ? " " + j.error : ""), !j.ok); }
    catch (e) { say(errMsg(e), true); }
  });
  $("mSendNow").addEventListener("click", async function () {
    if (!mPending) return;
    if (mPending.count > 20 && $("mConfirm").value.trim() !== "SEND") { say("Type SEND in the box to confirm this big group.", true); return; }
    var sendBtn = $("mSendNow"); sendBtn.disabled = true;
    try {
      var a = mPending.args;
      var made = await rpc("admin_mail_create", { p_audience: a.p_audience, p_boards: a.p_boards, p_email: a.p_email, p_name: a.p_name, p_subject: $("mSubject").value, p_body: $("mBody").value });
      var sent = 0, failed = 0, pending = made.total, guard = 0;
      while (pending > 0 && guard++ < 30) {
        $("mProgress").textContent = "Sending. " + sent + " sent so far.";
        var j = await callMail("send", { campaign_id: made.id });
        sent += j.sent; failed += j.failed; pending = j.pending;
        if (j.sent + j.failed === 0) break;
      }
      $("mProgress").textContent = "";
      $("mReviewBox").hidden = true; $("mailForm").hidden = false; mPending = null;
      var msg = "Sent to " + sent + " " + (sent === 1 ? "person" : "people") + "." + (failed ? " " + failed + " could not be sent." : "") + (pending ? " " + pending + " are waiting and go out automatically." : "");
      if (!failed && !pending) { $("mSubject").value = ""; $("mBody").value = ""; }
      var hh = $("mHistH"); hh.setAttribute("tabindex", "-1");
      say(msg, failed > 0, function () { return hh; });
      loadMail();
    } catch (e) { $("mProgress").textContent = ""; say(errMsg(e), true); }
    finally { sendBtn.disabled = false; }
  });
  $("mReload").addEventListener("click", loadMail);


  // ----- Keyboard shortcuts: Alt + key (Windows and Linux). Uses the physical key, so it works with any keyboard language. -----
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
  var DISP = {"New Zealand Hand Cricket Board":"New Zealand Hand Cricket","England Hand Cricket Board":"England and Wales Hand Cricket Board","Australia Hand Cricket Board":"Hand Cricket Australia","Sri Lanka Hand Cricket Board":"Sri Lanka Hand Cricket","South Africa Hand Cricket Board":"Hand Cricket South Africa","UAE Hand Cricket Board":"Emirates Hand Cricket Board","USA Hand Cricket Board":"USA Hand Cricket","Germany Hand Cricket Board":"German Hand Cricket Federation","Nepal Hand Cricket Board":"Hand Cricket Association of Nepal","India Hand Cricket Board":"Board of Control for Hand Cricket in India"};
  function dispB(n) { return DISP[n] || n; }
  var btReady = false;
  function btInit() {
    if (btReady) return; btReady = true;
    ["btActBoard", "btAnnBoard", "btLogoBoard", "btLdBoard", "btApBoard", "btHiBoard"].forEach(function (id) {
      var sel = $(id);
      if (id === "btActBoard") { var o0 = document.createElement("option"); o0.value = ""; o0.textContent = "All boards"; sel.appendChild(o0); }
      BOARDS.forEach(function (b) { var o = document.createElement("option"); o.value = b; o.textContent = dispB(b); sel.appendChild(o); });
    });
  }
  function fmtT(t) { return new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" }) + " PKT"; }
  var BT_ROLE = { director: "Team Director", deputy: "Deputy Director", media: "Media Manager", owner: "IHCC Owner" };
  function fillList(id, items, empty) {
    var ul = $(id); ul.textContent = "";
    if (!items.length) { var li = document.createElement("li"); li.textContent = empty; ul.appendChild(li); return; }
    items.forEach(function (x) { ul.appendChild(x); });
  }
  function detailText(d) {
    if (!d) return "";
    var o = [];
    if (d.text) o.push("Text: " + d.text);
    if (d.old != null || d.new != null) o.push("Before: " + (d.old || "(empty)") + ". After: " + (d.new || "(empty)"));
    if (d.reason) o.push("Reason: " + d.reason);
    if (d.alt) o.push("Description: " + d.alt);
    return o.length ? " (" + o.join(". ") + ")" : "";
  }
  async function guard(fn) { try { await fn(); } catch (e) { say(errMsg(e), true); } }
  function btWire() {
    $("btActGo").addEventListener("click", function () { guard(async function () {
      var rows = await rpc("admin_board_activity", { p_board: $("btActBoard").value || null, p_limit: 100 });
      fillList("btActList", rows.map(function (a) { var li = document.createElement("li"); li.textContent = fmtT(a.at) + " · " + dispB(a.board) + " · " + (BT_ROLE[a.role] || a.role) + ": " + a.action + detailText(a.detail); return li; }), "No activity yet.");
      sayLive("Showing " + rows.length + " activity lines.");
    }); });
    $("btAnnGo").addEventListener("click", function () { guard(async function () {
      var board = $("btAnnBoard").value, items = [], off = 0, more = true;
      while (more && off < 30) { var r = await rpc("public_board_announcements", { p_board: board, p_offset: off }); items = items.concat(r.items); off += r.items.length; more = r.more && r.items.length > 0; }
      fillList("btAnnList", items.map(function (a) {
        var li = document.createElement("li"); li.textContent = fmtT(a.at) + " · " + (BT_ROLE[a.role] || a.role) + ": " + a.body + " ";
        li.appendChild(btn("Hide", function () { guard(async function () {
          await rpc("admin_hide_announcement", { p_id: a.id, p_reason: $("btAnnReason").value, p_hide: true });
          say("The announcement is hidden.", false); $("btAnnGo").click();
        }); }, "alt", "Hide this announcement: " + a.body.slice(0, 40)));
        return li;
      }), "No live announcements for this board.");
    }); });
    $("btLogoGo").addEventListener("click", function () { guard(async function () {
      await rpc("admin_remove_logo", { p_board: $("btLogoBoard").value, p_reason: $("btLogoReason").value });
      say("The logo is removed.", false); $("btLogoReason").value = "";
    }); });
    $("btLdGo").addEventListener("click", function () { guard(async function () {
      await rpc("admin_replace_leader", { p_board: $("btLdBoard").value, p_role: $("btLdRole").value, p_email: $("btLdEmail").value });
      say("The leader is replaced.", false); $("btLdEmail").value = "";
    }); });
    $("btSilGo").addEventListener("click", function () { guard(async function () {
      var rows = await rpc("admin_silent_boards", { p_days: parseInt($("btSilDays").value, 10) || 30 });
      fillList("btSilList", rows.map(function (r) { var li = document.createElement("li"); li.textContent = dispB(r.board) + ": " + (r.last_activity ? "last leader activity " + r.days + " days ago (" + fmtT(r.last_activity) + ")" : "no leader activity yet"); return li; }), "No quiet boards.");
    }); });
    function loadAppeals() { return guard(async function () {
      var rows = await rpc("admin_appeal_list");
      fillList("btApList", rows.map(function (a) {
        var li = document.createElement("li"); li.textContent = "#" + a.id + " · " + dispB(a.board) + " · " + a.player + " · " + a.status + ": " + a.body + (a.resolution ? " Decision: " + a.resolution : "") + " ";
        if (a.status === "open") li.appendChild(btn("Close", function () { guard(async function () { await rpc("admin_appeal_resolve", { p_id: a.id, p_resolution: $("btApDecision").value }); say("The appeal is closed.", false); loadAppeals(); }); }, "alt", "Close appeal number " + a.id));
        return li;
      }), "No appeals.");
    }); }
    $("btApGo").addEventListener("click", loadAppeals);
    $("btApAdd").addEventListener("click", function () { guard(async function () {
      await rpc("admin_appeal_add", { p_board: $("btApBoard").value, p_player: $("btApPlayer").value, p_body: $("btApText").value });
      $("btApPlayer").value = ""; $("btApText").value = ""; say("The appeal is recorded.", false); loadAppeals();
    }); });
    $("btHiGo").addEventListener("click", function () { guard(async function () {
      var rows = await rpc("admin_squad_history", { p_board: $("btHiBoard").value });
      fillList("btHiList", rows.map(function (h) { var li = document.createElement("li"); li.textContent = fmtT(h.at) + " · " + (BT_ROLE[h.role] || h.role || "") + " · " + h.kind + " " + JSON.stringify(h.detail || {}); return li; }), "No squad history yet.");
    }); });
    $("btBackup").addEventListener("click", function () { guard(async function () {
      var d = await rpc("admin_board_backup");
      var blob = new Blob([JSON.stringify(d, null, 1)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ihcc-board-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a); say("The backup file is downloaded.", false);
    }); });
  }
  btWire();
  $("viewSel").addEventListener("change", setView);
  $("fSearch").addEventListener("input", render);
  $("reloadBtn").addEventListener("click", loadAll);
  $("signIn").addEventListener("click", function () {
    sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + window.location.pathname, queryParams: { prompt: "select_account" } } });
  });
  async function out() { await sb.auth.signOut({ scope: "global" }); me = null; entries = []; sayLive("You are signed out."); show("loginView"); $("who").textContent = ""; }
  $("signOut").addEventListener("click", out); $("signOut2").addEventListener("click", out);

  sb.auth.onAuthStateChange(function (evt) { if (evt === "SIGNED_IN" && !me) start(); });
  start();
})();
