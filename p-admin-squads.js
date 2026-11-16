(function () {
  var adm = window.__adm;
  var URL = adm.URL, KEY = adm.KEY, BOARDS = adm.BOARDS, sb = adm.sb, $ = adm.$, say = adm.say, sayLive = adm.sayLive, td = adm.td, th = adm.th, rpc = adm.rpc, show = adm.show, setView = adm.setView, fmt = adm.fmt, errMsg = adm.errMsg, btn = adm.btn, callFn = adm.callFn, csvCell = adm.csvCell, downloadCsv = adm.downloadCsv, el = adm.el, plural = adm.plural, isOC = adm.isOC, isOwner = adm.isOwner, guard = adm.guard, loadAll = adm.loadAll, render = adm.render, out = adm.out;
  var MINP = 12, MAXP = 30;
  var SQ = { summary: null, dupC: [], dupN: [], recent: [], board: null, openBtn: null, player: null, playerBtn: null };
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
  adm.m.showSquadHome = showSquadHome;
  adm.m.loadSquads = loadSquads;
})();
