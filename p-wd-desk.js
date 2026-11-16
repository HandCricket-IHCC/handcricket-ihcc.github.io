(function () {
  var URL_ = "https://krkrpcnovdobnscknfnw.supabase.co";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  var sb = window.supabase.createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, lock: function (name, timeout, fn) { return fn(); } } });
  var $ = function (id) { return document.getElementById(id); };
  var busy = false;
  window.__ihccSb = sb;
  function say(t, err) { var s = $("status"); s.textContent = t || ""; s.hidden = !t; s.className = "msg" + (err ? " err" : ""); if (t) s.focus(); }
  function show(id, focusLogin) {
    ["loginView", "deniedView", "panel"].forEach(function (v) { $(v).hidden = v !== id; });
    var hid = id === "panel" ? "wcH" : id === "deniedView" ? "deniedH" : (focusLogin ? "loginH" : null);
    if (hid) { $(hid).setAttribute("tabindex", "-1"); $(hid).focus(); }
  }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
  function cleanErr(m) { var t = String(m || ""); var i = t.indexOf("|"); if (i >= 0) { t = t.split("|").slice(2).join("|") || t; } return t.replace(/^E\|/, ""); }
  function when(d) { var x = new Date(d); return isNaN(x) ? "" : x.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }

  var ST = { open: "Open", with_core: "With the Core Committee", closed: "Closed" };
  function act(fn, args, done, reset) {
    if (busy) return; busy = true;
    sb.rpc(fn, args).then(function (r) { busy = false; if (r.error) { say(cleanErr(r.error.message), true); return; } (reset || []).forEach(function (i) { $(i).value = ""; }); say(done); load(true); });
  }
  function renderWd(d) {
    var box = $("wcList"); box.textContent = "";
    if (!(d.cases || []).length) box.appendChild(el("p", "No matter has been added."));
    (d.cases || []).forEach(function (c, n) {
      var card = el("section", null, "card"); card.setAttribute("aria-labelledby", "wc" + n);
      var h = el("h3", ST[c.status] + ": " + c.summary); h.id = "wc" + n; card.appendChild(h);
      card.appendChild(el("p", "Added " + when(c.created_at) + (c.note ? ". Note: " + c.note : "")));
      if (c.status !== "closed") {
        var p = el("p");
        [["Passed to the Core Committee", "with_core"], ["Close", "closed"]].forEach(function (x) {
          var b = el("button", x[0], "alt"); b.type = "button"; b.setAttribute("aria-label", x[0] + ": " + c.summary);
          b.addEventListener("click", function () { act("wd_case_set", { p_id: c.id, p_status: x[1], p_note: null }, "Saved."); });
          p.appendChild(b); p.appendChild(document.createTextNode(" "));
        });
        card.appendChild(p);
      }
      box.appendChild(card);
    });
    var pb = $("wpList"); pb.textContent = ""; var ul = el("ul");
    (d.participation || []).forEach(function (p) { ul.appendChild(el("li", p.board + ": " + p.women + " women players, as of " + p.as_of + (p.note ? ". " + p.note : "") + ".")); });
    pb.appendChild(ul); if (!(d.participation || []).length) pb.appendChild(el("p", "No number has been saved."));
  }
  function renderRep(rows) {
    var box = $("rpList"); box.textContent = ""; var ul = el("ul");
    rows.forEach(function (r) { ul.appendChild(el("li", when(r.created_at) + ", " + r.office + ", " + r.kind + ": " + r.body)); });
    box.appendChild(ul); if (!rows.length) box.appendChild(el("p", "Nothing has been saved."));
  }
  $("wcAdd").addEventListener("click", function () { act("wd_case_add", { p_summary: $("wcSum").value }, "Added.", ["wcSum"]); });
  $("wpSave").addEventListener("click", function () { act("wd_part_set", { p_board: $("wpBoard").value, p_count: $("wpCount").value === "" ? null : parseInt($("wpCount").value, 10), p_note: $("wpNote").value }, "Saved.", ["wpBoard", "wpCount", "wpNote"]); });
  $("rpSend").addEventListener("click", function () { act("report_add", { p_office: "Women's Director", p_kind: $("rpKind").value, p_body: $("rpBody").value }, "Saved for the Board of Directors.", ["rpBody"]); });
  async function load(keepStatus) {
    var w = await sb.rpc("wd_list");
    if (w.error) { $("deniedText").textContent = cleanErr(w.error.message) || "The check could not be completed."; show("deniedView"); return false; }
    renderWd(w.data || {});
    var r = await sb.rpc("report_list", { p_office: "Women's Director" }); if (!r.error) renderRep(r.data || []);
    if (!keepStatus) say("");
    return true;
  }

  async function start() {
    if (busy) return; busy = true;
    try {
      var s = await sb.auth.getSession();
      if (!s.data.session) { show("loginView"); return; }
      $("who").textContent = "Signed in as " + s.data.session.user.email;
      var ok = await load(false);
      if (ok) show("panel");
    } finally { busy = false; }
  }
  $("signIn").addEventListener("click", function () {
    sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + window.location.pathname, queryParams: { prompt: "select_account" } } });
  });
  $("reload").addEventListener("click", function () { load(false); });
  async function out() { await sb.auth.signOut({ scope: "global" }); $("who").textContent = ""; say("You are signed out."); show("loginView", true); }
  $("signOut").addEventListener("click", out); $("signOut2").addEventListener("click", out);
  sb.auth.onAuthStateChange(function (evt) { if (evt === "SIGNED_IN") start(); });
  start();
})();
