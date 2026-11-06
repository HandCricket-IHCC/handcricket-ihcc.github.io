(function () {
  "use strict";
  var URL_ = "https://krkrpcnovdobnscknfnw.supabase.co";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  var ROLE_NAME = { director: "Team Director", deputy: "Deputy Director", media: "Media Manager" };
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function say(box, text, isErr) { box.hidden = false; box.className = "msg" + (isErr ? " err" : ""); box.textContent = text; box.focus(); }
  function errText(e) { var m = (e && (e.message || e.error_description)) || "Something went wrong."; return String(m).replace(/^.*?:\s*/, function (x) { return x.length < 30 ? "" : x; }); }

  var params = new URLSearchParams(location.search);
  var stored = ""; try { stored = sessionStorage.getItem("ihcc_board") || ""; } catch (e) {}
  var code = (params.get("board") || stored || "").trim();
  if (params.get("board")) { try { sessionStorage.setItem("ihcc_board", code); } catch (e) {} }

  var sb = window.supabase ? window.supabase.createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, lock: function (n, t, fn) { return fn(); } } }) : null;
  var data = null;

  function status(text, isErr) { var s = $("status"); s.hidden = false; s.className = "msg" + (isErr ? " err" : ""); s.textContent = text; }

  function render() {
    document.title = data.board + " - IHCC";
    $("boardTitle").textContent = data.board;
    $("codeLine").textContent = data.code + " · Member Board";
    $("ini").textContent = data.code.slice(0, 5);
    $("joinBtn").textContent = "Join " + (data.join_label || data.board);
    showLogo();
    var chips = $("chips"); chips.textContent = "";
    chips.appendChild(el("li", "", data.squad.length + " players"));
    $("aboutText").textContent = data.about || (data.board + " is a Member Board of the International Hand Cricket Council. Its players take part in IHCC tournaments, series and elections under the IHCC Constitution.");
    $("verified").textContent = "";
    var b = el("strong", "", "Board election. "); $("verified").appendChild(b);
    if (data.leaders_set && data.reported_on) {
      var d = new Date(data.reported_on + "T00:00:00");
      var ds = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      $("verified").appendChild(document.createTextNode("The board reported its election to IHCC on " + ds + ". The leaders confirmed in writing that the election was held. IHCC keeps the record."));
    } else {
      $("verified").appendChild(document.createTextNode("The board has not yet reported its internal election to IHCC. Its leaders are not recorded yet."));
    }

    var box = $("leadersBox"); box.textContent = "";
    if (!data.leaders_set) { var nl = el("div", "card"); nl.appendChild(el("p", "", "The Team Director, Deputy Director and Media Manager of this board are not recorded yet. They will appear here after the board holds its internal election and reports it to IHCC.")); box.appendChild(nl); }
    data.leaders.forEach(function (L) {
      var a = el("article", "card leader"); a.setAttribute("aria-label", ROLE_NAME[L.role]);
      a.appendChild(el("span", "role", ROLE_NAME[L.role])); a.appendChild(document.createTextNode(" "));
      var nm = el("div", "lnames"); nm.appendChild(el("span", "dn", L.display_name)); nm.appendChild(document.createTextNode(".. ")); nm.appendChild(el("br"));
      nm.appendChild(el("span", "lrn", "Real name: " + L.real_name)); a.appendChild(nm); a.appendChild(document.createTextNode(" "));
      if (L.wa) {
        var msg = "Assalam o Alaikum, I am contacting you from the IHCC " + data.board + " page.";
        var w = el("a", "wa", "Chat on WhatsApp"); w.href = "https://wa.me/" + encodeURIComponent(L.wa) + "?text=" + encodeURIComponent(msg);
        w.target = "_blank"; w.rel = "noopener noreferrer";
        w.setAttribute("aria-label", "Chat with " + L.display_name + ", " + ROLE_NAME[L.role] + ", on WhatsApp. Opens WhatsApp."); a.appendChild(w);
      } else a.appendChild(el("span", "wa-off", "WhatsApp: Not available"));
      box.appendChild(a);
    });

    var ol = $("teamList"); ol.textContent = "";
    data.squad.forEach(function (p) {
      var li = el("li"); li.appendChild(el("span", "n", String(p.position))).setAttribute("aria-hidden", "true"); li.appendChild(document.createTextNode(" "));
      var names = el("span", "names"); names.appendChild(el("span", "dn", p.display_name)); names.appendChild(document.createTextNode(".. ")); names.appendChild(el("br")); names.appendChild(el("span", "rn", "Real name: " + p.real_name)); li.appendChild(names);
      var label = p.position + ", Display name, " + p.display_name + ". Real name, " + p.real_name;
      if (p.captain) { li.appendChild(document.createTextNode(" ")); li.appendChild(el("span", "tag", "Captain")); label += ". Captain"; }
      if (p.vice) { li.appendChild(document.createTextNode(" ")); li.appendChild(el("span", "tag", "Vice Captain")); label += ". Vice Captain"; }
      if (p.role) { li.appendChild(document.createTextNode(" ")); li.appendChild(el("span", "tag", ROLE_NAME[p.role])); label += ". " + ROLE_NAME[p.role]; }
      li.setAttribute("aria-label", label); ol.appendChild(li);
    });

    var subj = "[IHCC] Problem on the page of " + data.board;
    var body = "Assalam o Alaikum,\n\nBoard page: " + data.board + "\nPage link: " + location.origin + location.pathname + "?board=" + data.code + "\n\nThe problem:\n\n";
    $("reportLink").href = "mailto:handcricket.ihcc@gmail.com?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(body);
    $("status").hidden = true; $("content").hidden = false; $("jump").hidden = false;
  }

  function listText() {
    var lines = [data.board, "IHCC board page", ""];
    data.squad.forEach(function (p) { lines.push("•" + p.position + ", Display name, " + p.display_name + ".. Real name, " + p.real_name + (p.captain ? ".. Captain" : "") + (p.vice ? ".. Vice Captain" : "") + (p.role ? ".. " + ROLE_NAME[p.role] : "")); });
    return lines.join("\n");
  }
  $("copyBtn").addEventListener("click", function () {
    var box = $("copyMsg"), t = listText();
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta);
      say(box, ok ? "The list is copied." : "Could not copy. Please use Download list.", !ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { say(box, "The list is copied.", false); }, fallback); else fallback();
  });
  $("dlBtn").addEventListener("click", function () {
    var box = $("copyMsg");
    try {
      var blob = new Blob([listText() + "\n"], { type: "text/plain;charset=utf-8" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = data.board + " squad list.txt";
      document.body.appendChild(a); a.click(); document.body.removeChild(a); say(box, "The list is downloaded as a text file.", false);
    } catch (e) { say(box, "Could not download. Please use Copy list.", true); }
  });

  // ---- logo ----
  async function showLogo() {
    var c = $("crest"), old = c.querySelector("img"); if (old) old.remove();
    $("ini").hidden = false;
    if (!data.logo) return;
    var key = "ihcc_logo_" + data.code + "_" + data.logo.v, src = "";
    try { src = localStorage.getItem(key) || ""; } catch (e) {}
    if (!src) {
      var r = await sb.rpc("public_board_logo", { p_board: data.code });
      if (r.error || !r.data) return;
      src = "data:" + r.data.mime + ";base64," + r.data.b64;
      try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf("ihcc_logo_" + data.code + "_") === 0) localStorage.removeItem(k); }); localStorage.setItem(key, src); } catch (e) {}
    }
    var img = document.createElement("img"); img.src = src; img.alt = data.logo.alt || "Board logo";
    img.style.cssText = "width:100%;height:100%;object-fit:contain;border-radius:inherit";
    $("ini").hidden = true; c.appendChild(img);
  }

  // ---- announcements ----
  var annOffset = 0;
  function annItem(a) {
    var li = el("li", "card");
    var t = new Date(a.at).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    li.appendChild(el("p", "small muted", t + " · " + ROLE_NAME[a.role]));
    li.appendChild(el("p", "", a.body)).style.whiteSpace = "pre-wrap";
    return li;
  }
  async function loadNews(reset) {
    if (reset) { annOffset = 0; $("newsBox").textContent = ""; }
    var r = await sb.rpc("public_board_announcements", { p_board: data.code, p_offset: annOffset });
    if (r.error || !r.data) return;
    var ul = $("newsBox").querySelector("ul");
    if (!ul) { ul = el("ul", "log"); ul.style.listStyle = "none"; ul.style.padding = "0"; $("newsBox").appendChild(ul); }
    r.data.items.forEach(function (a) { ul.appendChild(annItem(a)); });
    annOffset += r.data.items.length;
    $("olderBtn").hidden = !r.data.more;
    if (!ul.firstChild) { $("newsBox").appendChild(el("p", "muted", "No announcements yet.")); }
    else { var np = $("newsBox").querySelector("p.muted"); if (np) np.remove(); }
  }
  $("olderBtn").addEventListener("click", function () { loadNews(false); });

  // ---- join (closed for now) ----
  $("joinBtn").addEventListener("click", function () { say($("closedMsg"), "Joining is closed for now.", false); });

  // ---- leader bar: login link for leaders, Management link when signed in ----
  var barBusy = false;
  async function loadBar() {
    if (!sb || !data || barBusy) return; barBusy = true;
    try {
      var bar = $("leaderBar"); bar.textContent = "";
      if (!data.leaders_set) { bar.hidden = true; return; }
      var link = "board-manage.html?board=" + encodeURIComponent(data.code);
      var role = null, email = "", fresh = 0;
      try {
        var s = await sb.auth.getSession();
        if (s.data && s.data.session) {
          var r = await sb.rpc("board_my_role", { p_board: data.code });
          if (!r.error && r.data && r.data.role) { role = r.data.role; email = r.data.email || ""; fresh = (r.data.notifications || []).length; }
        }
      } catch (e) {}
      bar.hidden = false;
      if (role) {
        bar.appendChild(el("p", "", "You are signed in as the " + ROLE_NAME[role] + " of this board (" + email + ")."));
        var m = el("a", "btn", fresh ? "Management (" + fresh + " new)" : "Management"); m.href = link; m.id = "manageLink"; m.setAttribute("data-sk", "G"); m.setAttribute("aria-keyshortcuts", "Alt+G"); bar.appendChild(m);
        var o = el("button", "secondary", "Sign out"); o.type = "button"; o.setAttribute("data-sk", "O"); o.setAttribute("aria-keyshortcuts", "Alt+O");
        o.addEventListener("click", async function () { try { await sb.auth.signOut(); } catch (e) {} loadBar(); });
        bar.appendChild(o);
      } else {
        bar.appendChild(el("p", "", "Are you the Team Director, Deputy Director or Media Manager of this board?"));
        var l = el("a", "btn secondary", "Leader login"); l.href = link; l.id = "leaderLogin"; l.setAttribute("data-sk", "G"); l.setAttribute("aria-keyshortcuts", "Alt+G"); bar.appendChild(l);
      }
    } finally { barBusy = false; }
  }

  // ---- start ----
  async function start() {
    if (!code) { status("Please open a board from the Boards page.", true); return; }
    if (!sb) { status("The page could not load. Please check your internet and reload.", true); return; }
    var r = await sb.rpc("public_board_page", { p_board: code });
    if (r.error || !r.data) { status("This board was not found. Please open a board from the Boards page.", true); return; }
    if (!r.data.open) {
      document.title = r.data.board + " - IHCC"; $("boardTitle").textContent = r.data.board; $("codeLine").textContent = r.data.code + " · Member Board";
      status("The page of this board is not open yet. It opens after the board reports its election to IHCC.", false); return;
    }
    data = r.data; render(); await loadNews(true); await loadBar();
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }
  sb && sb.auth.onAuthStateChange(function (evt) { if ((evt === "SIGNED_IN" || evt === "SIGNED_OUT") && data) loadBar(); });
  start();
})();
