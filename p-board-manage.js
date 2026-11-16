(function () {
  "use strict";
  var URL_ = "https://krkrpcnovdobnscknfnw.supabase.co";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  var ROLE_NAME = { director: "Team Director", deputy: "Deputy Director", media: "Media Manager" };
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function say(box, text, isErr) { box.hidden = false; box.className = "msg" + (isErr ? " err" : ""); box.textContent = text; box.focus(); }
  function errText(e) { var m = (e && (e.message || e.error_description)) || "Something went wrong."; return String(m).replace(/^.*?:\s*/, function (x) { return x.length < 30 ? "" : x; }); }
  function when(t, long) { return new Date(t).toLocaleString("en-GB", long ? { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }

  var params = new URLSearchParams(location.search);
  var stored = ""; try { stored = sessionStorage.getItem("ihcc_board") || ""; } catch (e) {}
  var code = (params.get("board") || stored || "").trim();
  if (params.get("board")) { try { sessionStorage.setItem("ihcc_board", code); } catch (e) {} }

  var sb = window.supabase ? window.supabase.createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, lock: function (n, t, fn) { return fn(); } } }) : null;
  var data = null, me = null, notifSeen = false, tab = "ann";

  function status(text, isErr) { var s = $("status"); s.hidden = false; s.className = "msg" + (isErr ? " err" : ""); s.textContent = text; }
  function pubHref() { return "board.html?board=" + encodeURIComponent(code); }

  function showOnly(which) {
    $("status").hidden = true;
    $("loginView").hidden = which !== "login"; $("appView").hidden = which !== "app";
  }
  function setTitle() {
    document.title = "Management - " + data.board + " - IHCC";
    $("boardTitle").textContent = data.board;
    $("codeLine").textContent = data.code + " · Board management";
    $("ini").textContent = data.code.slice(0, 5);
    $("pubLink").href = pubHref(); $("backLink1").href = pubHref();
  }

  // ---- tabs ----
  function allowedTabs() { return me && (me.role === "director" || me.role === "deputy") ? ["ann", "squad", "cap", "brand", "wa", "act"] : ["ann", "squad", "brand", "wa", "act"]; }
  function showTab(name, focus) {
    if (allowedTabs().indexOf(name) < 0) name = "ann";
    tab = name; try { sessionStorage.setItem("ihcc_mtab", name); } catch (e) {}
    ["ann", "squad", "cap", "brand", "wa", "act"].forEach(function (k) { $("p-" + k).hidden = k !== name; });
    Array.prototype.forEach.call($("tabs").querySelectorAll("button"), function (b) {
      if (b.getAttribute("data-tab") === name) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    });
    if (focus) $("h-" + name).focus();
  }
  Array.prototype.forEach.call($("tabs").querySelectorAll("button"), function (b) { b.addEventListener("click", function () { showTab(b.getAttribute("data-tab"), true); }); });

  // ---- render ----
  function renderApp() {
    setTitle();
    var ch = $("chips"); ch.textContent = ""; ch.appendChild(el("li", "", ROLE_NAME[me.role]));
    $("whoNote").textContent = "Signed in as the " + ROLE_NAME[me.role] + " (" + me.email + ").";
    var isTop = me.role === "director" || me.role === "deputy";
    $("tabCap").parentNode.hidden = !isTop; $("m-logo").hidden = me.role !== "director";
    $("waNum").value = me.wa_digits ? "+" + me.wa_digits : ""; $("waOn").checked = !!me.wa_on;
    $("aboutEdit").value = me.about || (data && data.about) || ""; $("aboutCount").textContent = $("aboutEdit").value.length + " of 250 characters";
    $("annQuota").textContent = "Today the board has put " + me.posts_used + " of 3 announcements live.";
    var cs = $("capSel"), vs = $("viceSel"); cs.textContent = ""; vs.textContent = "";
    [cs, vs].forEach(function (sel) { var o = el("option", "", "Not chosen"); o.value = ""; sel.appendChild(o); });
    (me.squad12 || []).forEach(function (p) {
      [cs, vs].forEach(function (sel) { var o = el("option", "", p.position + ". " + p.display_name + " (" + p.real_name + ")"); o.value = p.id; sel.appendChild(o); });
    });
    cs.value = me.captain_id || ""; vs.value = me.vice_id || "";
    var mp = $("myPosts"); mp.textContent = "";
    (me.my_posts || []).forEach(function (a) { mp.appendChild(annItem(a)); });
    if (!mp.firstChild) mp.appendChild(el("li", "", "None."));
    var nl = $("notifList"); nl.textContent = "";
    (me.notifications || []).forEach(function (a) { nl.appendChild(el("li", "", when(a.at) + " · " + ROLE_NAME[a.role] + ": " + a.action)); });
    $("m-notif").hidden = !nl.firstChild;
    if (nl.firstChild && !notifSeen) { notifSeen = true; sb.rpc("board_mark_seen", { p_board: data.code }).then(function () {}); }
    var ul = $("actList"); ul.textContent = "";
    (me.activity || []).forEach(function (a) { ul.appendChild(el("li", "", when(a.at) + " · " + ROLE_NAME[a.role] + ": " + a.action)); });
    if (!ul.firstChild) ul.appendChild(el("li", "", "Nothing yet."));
    var ol = $("teamList"); ol.textContent = "";
    ((data && data.squad) || []).forEach(function (p) {
      var li = el("li"); li.appendChild(el("span", "n", String(p.position))).setAttribute("aria-hidden", "true"); li.appendChild(document.createTextNode(" "));
      var names = el("span", "names"); names.appendChild(el("span", "dn", p.display_name)); names.appendChild(document.createTextNode(" ")); names.appendChild(el("span", "rn", "Real name: " + p.real_name)); li.appendChild(names);
      var label = p.position + ", Display name, " + p.display_name + ". Real name, " + p.real_name;
      if (p.captain) { li.appendChild(document.createTextNode(" ")); li.appendChild(el("span", "tag", "Captain")); label += ". Captain"; }
      if (p.vice) { li.appendChild(document.createTextNode(" ")); li.appendChild(el("span", "tag", "Vice Captain")); label += ". Vice Captain"; }
      if (p.role) { li.appendChild(document.createTextNode(" ")); li.appendChild(el("span", "tag", ROLE_NAME[p.role])); label += ". " + ROLE_NAME[p.role]; }
      li.setAttribute("aria-label", label); ol.appendChild(li);
    });
    showOnly("app"); showTab(tab, false); jrLoad(); pjQLoad(); if (window.__tdLoad) window.__tdLoad(sb, data.code, me);
  }
  function annItem(a) {
    var li = el("li", "card");
    li.appendChild(el("p", "small muted", when(a.at, true) + " · " + ROLE_NAME[a.role]));
    li.appendChild(el("p", "", a.body)).style.whiteSpace = "pre-wrap";
    var b = el("button", "secondary", "Delete for everyone"); b.type = "button";
    b.setAttribute("aria-label", "Delete this announcement for everyone: " + a.body.slice(0, 40));
    b.addEventListener("click", async function () {
      if (!confirm("Delete this announcement for everyone?")) return;
      var r = await sb.rpc("board_delete_announcement", { p_board: data.code, p_id: a.id });
      if (r.error) { say($("annMsg"), errText(r.error), true); return; }
      await refresh(); say($("annMsg"), "Deleted.", false);
    });
    li.appendChild(b);
    return li;
  }

  async function loadAll() {
    var s = await sb.auth.getSession();
    if (!s.data.session) { me = null; return "login"; }
    var r = await sb.rpc("board_my_role", { p_board: data.code });
    if (r.error) { me = null; $("signMsg").dataset.err = errText(r.error); return "error"; }
    me = r.data;
    if (!me.role) return "notleader";
    return "app";
  }
  function showLogin(kind) {
    setTitle(); showOnly("login"); $("chips").textContent = "";
    var txt = $("loginText"), btn = $("signInBtn");
    btn.hidden = false;
    if (kind === "notleader") {
      txt.textContent = "You are signed in as " + (me && me.email || "this account") + ", but this Gmail is not the Team Director, Deputy Director or Media Manager of this board. Please sign in with the Gmail you gave in your squad form.";
      btn.textContent = "Sign in with another account";
    } else if (kind === "error") {
      txt.textContent = "Sign-in could not be checked: " + ($("signMsg").dataset.err || "please try again.");
      btn.textContent = "Sign in with Google";
    } else {
      txt.textContent = "This page is for the Team Director, the Deputy Director and the Media Manager of this board. Sign in with the Google account (Gmail) you gave in your squad form. Nobody else can open it.";
      btn.textContent = "Sign in with Google";
    }
  }
  async function refresh() {
    var r = await sb.rpc("public_board_page", { p_board: data.code });
    if (!r.error && r.data && r.data.open) data = r.data;
    var k = await loadAll();
    if (k === "app") renderApp(); else showLogin(k);
  }

  // ---- actions ----
  $("signInBtn").addEventListener("click", async function () {
    if (!sb) { say($("signMsg"), "Sign-in could not load. Please reload the page.", true); return; }
    try { await sb.auth.signOut({ scope: "global" }); } catch (e) {}
    sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: "select_account" } } });
  });
  $("signOutBtn").addEventListener("click", async function () {
    try { await sb.auth.signOut({ scope: "global" }); } catch (e) {}
    me = null; showLogin("login"); say($("signMsg"), "You are signed out.", false);
  });
  function jrClean(e) { var t = errText(e); return t.replace(/^E\|[a-z]+\|/, ""); }
  async function pjQLoad() {
    var box = $("m-pj"); if (!me || (me.role !== "director" && me.role !== "deputy")) { box.hidden = true; return; }
    var ul = $("pjQueue"); ul.textContent = "";
    var r = await sb.rpc("td_join_list", { p_board: data.code });
    var rows = (!r.error && r.data) || [];
    box.hidden = !rows.length;
    rows.forEach(function (x) {
      var li = el("li", "", x.display_name + " (" + x.real_name + "), " + x.city + ", " + x.country + ". " + (x.gender === "female" ? "Female" : "Male") + ". Gmail: " + x.email + ". WhatsApp: " + x.whatsapp + ". Sent " + when(x.created_at) + "." + (x.in_other_squad ? " WARNING: this Gmail is already in a squad." : "") + (x.overdue ? " The twenty-four hours are over." : ""));
      var rs = el("input", ""); rs.type = "text"; rs.maxLength = 300; rs.id = "pjr" + x.id; rs.setAttribute("aria-label", "Reason for refusing " + x.display_name);
      var a = el("button", "", "Approve"); a.type = "button"; a.setAttribute("aria-label", "Approve " + x.display_name + " and send to the General Secretary");
      a.addEventListener("click", async function () { var d = await sb.rpc("td_join_decide", { p_id: x.id, p_approve: true, p_reason: null }); if (d.error) { say($("pjQMsg"), jrClean(d.error), true); return; } await pjQLoad(); say($("pjQMsg"), x.display_name + " is approved and sent to the General Secretary.", false); });
      var n = el("button", "secondary", "Refuse"); n.type = "button"; n.setAttribute("aria-label", "Refuse " + x.display_name + ". Write the reason in the box before this button");
      n.addEventListener("click", async function () { var d = await sb.rpc("td_join_decide", { p_id: x.id, p_approve: false, p_reason: rs.value }); if (d.error) { say($("pjQMsg"), jrClean(d.error), true); rs.focus(); return; } await pjQLoad(); say($("pjQMsg"), x.display_name + " is refused.", false); });
      li.appendChild(document.createElement("br")); li.appendChild(rs); li.appendChild(a); li.appendChild(n);
      ul.appendChild(li);
    });
  }
  async function jrLoad() {
    var box = $("m-join"); if (!me || (me.role !== "director" && me.role !== "deputy")) { box.hidden = true; return; }
    box.hidden = false;
    var ul = $("jrList"); ul.textContent = "";
    var r = await sb.rpc("jr_list_mine", { p_board: data.code });
    var rows = (!r.error && r.data) || [];
    var NAME = { td_pending: "Waiting for the Team Director", sent: "Waiting for the General Secretary", approved: "Approved", rejected: "Rejected", withdrawn: "Withdrawn" };
    rows.forEach(function (x) {
      var li = el("li", "", x.display_name + " (" + x.real_name + "): " + NAME[x.status] + ". Sent " + when(x.created_at) + (x.reason ? ". Reason: " + x.reason : "") + ".");
      if (x.status === "sent") {
        var b = el("button", "secondary", "Withdraw"); b.type = "button"; b.setAttribute("aria-label", "Withdraw the request for " + x.display_name);
        b.addEventListener("click", async function () { var w = await sb.rpc("jr_withdraw", { p_id: x.id }); if (w.error) { say($("jrMsg"), jrClean(w.error), true); return; } await jrLoad(); say($("jrMsg"), "The request is withdrawn.", false); });
        li.appendChild(document.createTextNode(" ")); li.appendChild(b);
      }
      ul.appendChild(li);
    });
    if (!rows.length) ul.appendChild(el("li", "", "None yet."));
  }
  $("jrSend").addEventListener("click", async function () {
    var b = $("jrMsg");
    var r = await sb.rpc("jr_submit", { p_board: data.code, p_display: $("jrDisplay").value, p_real: $("jrReal").value, p_city: $("jrCity").value, p_country: $("jrCountry").value,
      p_email: $("jrEmail").value, p_whatsapp: $("jrWa").value, p_gender: $("jrGender").value, p_final: $("jrFinal").checked, p_statement: $("jrStmt").checked });
    if (r.error) { say(b, jrClean(r.error), true); return; }
    ["jrDisplay", "jrReal", "jrCity", "jrCountry", "jrEmail", "jrWa"].forEach(function (i) { $(i).value = ""; });
    $("jrGender").value = ""; $("jrFinal").checked = false; $("jrStmt").checked = false;
    await jrLoad(); say(b, "Sent to the General Secretary, who decides within twenty-four hours.", false);
  });
  $("removeBtn").addEventListener("click", function () { say($("closedMsg"), "Removal is closed until the elections are finished.", false); });
  $("swapBtn").addEventListener("click", function () { say($("closedMsg"), "Swapping is closed until the elections are finished.", false); });
  $("waSave").addEventListener("click", async function () {
    var b = $("waMsg"), on = $("waOn").checked, digits = $("waNum").value.replace(/\D/g, "");
    if (on && digits.length < 10) { say(b, "Please write a full number with the country code, or switch the button off.", true); return; }
    var r = await sb.rpc("board_set_my_whatsapp", { p_board: data.code, p_digits: digits || null, p_on: on });
    if (r.error) { say(b, errText(r.error), true); return; }
    await refresh(); say(b, on ? "Saved. Your WhatsApp button is shown on the page." : "Saved. The page says WhatsApp: Not available for you.", false);
  });
  $("annText").addEventListener("input", function () { $("annCount").textContent = this.value.length + " of 1000 characters"; });
  $("annPost").addEventListener("click", async function () {
    var b = $("annMsg"), t = $("annText").value.trim();
    if (!t) { say(b, "Please write the announcement first.", true); return; }
    var r = await sb.rpc("board_post_announcement", { p_board: data.code, p_body: t });
    if (r.error) { say(b, errText(r.error), true); return; }
    $("annText").value = ""; $("annCount").textContent = "0 of 1000 characters";
    await refresh(); say(b, "The announcement is live.", false);
  });
  $("capSave").addEventListener("click", async function () {
    var b = $("capMsg"), c = $("capSel").value || null, v = $("viceSel").value || null;
    if (c && c === v) { say(b, "The Captain and the Vice Captain must be two different players.", true); return; }
    var r = await sb.rpc("board_set_captain", { p_board: data.code, p_captain: c, p_vice: v });
    if (r.error) { say(b, errText(r.error), true); return; }
    await refresh(); say(b, "Saved. The squad order on the page is updated.", false);
  });
  $("logoSave").addEventListener("click", async function () {
    var b = $("logoMsg"), f = $("logoFile").files[0], alt = $("logoAlt").value.trim();
    if (!f) { say(b, "Please choose a picture first.", true); return; }
    if (f.size > 1048576) { say(b, "This picture is too big. It must be under 1 MB.", true); return; }
    if (alt.length < 3) { say(b, "Please write a short description of the logo.", true); return; }
    var buf = new Uint8Array(await f.arrayBuffer()), bin = "";
    for (var i = 0; i < buf.length; i += 8192) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
    var r = await sb.rpc("board_set_logo", { p_board: data.code, p_mime: f.type, p_b64: btoa(bin), p_alt: alt });
    if (r.error) { say(b, errText(r.error), true); return; }
    await refresh(); say(b, "The logo is live.", false);
  });
  $("aboutEdit").addEventListener("input", function () { $("aboutCount").textContent = this.value.length + " of 250 characters"; });
  $("aboutSave").addEventListener("click", async function () {
    var b = $("aboutMsg"), t = $("aboutEdit").value.trim();
    if (!t) { say(b, "Please write something first.", true); return; }
    var r = await sb.rpc("board_set_about", { p_board: data.code, p_text: t });
    if (r.error) { say(b, errText(r.error), true); return; }
    await refresh(); say(b, "Saved. The old About text is replaced.", false);
  });

  // ---- start ----
  async function start() {
    if (!code) { status("Please open a board from the Boards page, then use Leader login.", true); return; }
    if (!sb) { status("The page could not load. Please check your internet and reload.", true); return; }
    var r = await sb.rpc("public_board_page", { p_board: code });
    if (r.error || !r.data) { status("This board was not found. Please open a board from the Boards page.", true); return; }
    data = r.data;
    if (!data.open) { setTitle(); status("The page of this board is not open yet.", false); return; }
    if (!data.leaders_set) {
      setTitle(); showOnly("login");
      $("loginText").textContent = "Leader sign-in for this board is not open yet. It opens after the board reports its internal election to IHCC and IHCC records the leaders.";
      $("signInBtn").hidden = true; return;
    }
    try { var st = sessionStorage.getItem("ihcc_mtab"); if (st) tab = st; } catch (e) {}
    var k = await loadAll();
    if (k === "app") { renderApp(); } else showLogin(k);
  }
  sb && sb.auth.onAuthStateChange(function (evt) { if (evt === "SIGNED_IN" && data && !me) { loadAll().then(function (k) { if (k === "app") renderApp(); else showLogin(k); }); } });
  start();
})();
