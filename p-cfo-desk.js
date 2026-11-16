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
    var hid = id === "panel" ? "fnH" : id === "deniedView" ? "deniedH" : (focusLogin ? "loginH" : null);
    if (hid) { $(hid).setAttribute("tabindex", "-1"); $(hid).focus(); }
  }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
  function cleanErr(m) { var t = String(m || ""); var i = t.indexOf("|"); if (i >= 0) { t = t.split("|").slice(2).join("|") || t; } return t.replace(/^E\|/, ""); }
  function when(d) { var x = new Date(d); return isNaN(x) ? "" : x.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }

  function act(fn, args, done, reset) {
    if (busy) return; busy = true;
    sb.rpc(fn, args).then(function (r) { busy = false; if (r.error) { say(cleanErr(r.error.message), true); return; } (reset || []).forEach(function (i) { var e = $(i); if (e.type === "checkbox") e.checked = false; else e.value = ""; }); say(done); load(true); });
  }
  function pkr(n) { return Number(n).toLocaleString("en-GB") + " PKR"; }
  function renderFin(d) {
    $("fnTotals").textContent = "Came in: " + pkr(d.income) + ". Went out: " + pkr(d.expense) + ". Balance: " + pkr(Number(d.income) - Number(d.expense)) + ".";
    var box = $("fnList"); box.textContent = ""; var ul = el("ul");
    (d.entries || []).forEach(function (e) { ul.appendChild(el("li", e.date + ", " + (e.direction === "in" ? "came in " : "went out ") + pkr(e.amount) + ", " + e.category + (e.note ? ". " + e.note : "") + ".")); });
    box.appendChild(ul); if (!(d.entries || []).length) box.appendChild(el("p", "No entry has been saved."));
    var fb = $("fiList"); fb.textContent = "";
    if (!(d.fines || []).length) { fb.appendChild(el("p", "No fine has been recorded.")); return; }
    d.fines.forEach(function (f, n) {
      var card = el("section", null, "card"); card.setAttribute("aria-labelledby", "fi" + n);
      var h = el("h3", (f.board || "Fine") + ", " + pkr(f.amount) + ", " + (f.status === "given" ? "given in charity" : "waiting")); h.id = "fi" + n; card.appendChild(h);
      card.appendChild(el("p", "Received " + f.received_on + ". Due by " + f.due_on + (f.overdue ? ". OVERDUE." : ".") + (f.status === "given" ? " Given to " + f.charity + " on " + f.given_on + "." : "") + (f.note ? " Note: " + f.note : "")));
      if (f.status === "pending") {
        var l1 = el("label", "Charity"); l1.htmlFor = "ch" + n; card.appendChild(l1);
        var i1 = document.createElement("input"); i1.type = "text"; i1.id = "ch" + n; i1.maxLength = 120; i1.autocomplete = "off"; card.appendChild(i1);
        var row = el("div", null, "opt"); var cb = document.createElement("input"); cb.type = "checkbox"; cb.id = "cc" + n; row.appendChild(cb);
        var l2 = el("label", "The Chairman agreed to this charity."); l2.htmlFor = "cc" + n; row.appendChild(l2); card.appendChild(row);
        var p = el("p"); var b = el("button", "Mark as given in charity"); b.type = "button"; b.setAttribute("aria-label", "Mark as given in charity, " + (f.board || "fine") + " " + pkr(f.amount));
        b.addEventListener("click", function () { act("fin_fine_give", { p_id: f.id, p_charity: i1.value, p_chairman: cb.checked, p_given: null, p_note: null }, "Saved. The fine is given in charity."); });
        p.appendChild(b); card.appendChild(p);
      }
      fb.appendChild(card);
    });
  }
  function renderRep(rows) {
    var box = $("rpList"); box.textContent = ""; var ul = el("ul");
    rows.forEach(function (r) { ul.appendChild(el("li", when(r.created_at) + ", " + r.office + ", " + r.kind + ": " + r.body)); });
    box.appendChild(ul); if (!rows.length) box.appendChild(el("p", "No report has been saved."));
  }
  $("fnAdd").addEventListener("click", function () { act("fin_add", { p_direction: $("fnDir").value, p_date: $("fnDate").value || null, p_amount: $("fnAmt").value ? Number($("fnAmt").value) : null, p_category: $("fnCat").value, p_note: $("fnNote").value }, "The entry is saved.", ["fnDate", "fnAmt", "fnCat", "fnNote"]); });
  $("fiAdd").addEventListener("click", function () { act("fin_fine_add", { p_board: $("fiBoard").value, p_amount: $("fiAmt").value ? Number($("fiAmt").value) : null, p_received: $("fiDate").value || null, p_note: $("fiNote").value }, "The fine is recorded. It must be given in charity within thirty days.", ["fiBoard", "fiAmt", "fiDate", "fiNote"]); });
  $("rpSend").addEventListener("click", function () { act("report_add", { p_office: "CFO", p_kind: $("rpKind").value, p_body: $("rpBody").value }, "Saved for the Board of Directors.", ["rpBody"]); });
  function renderBp(rows) {
    var box = $("bpList"); box.textContent = "";
    if (!rows.length) { box.appendChild(el("p", "No badge price is owed.")); return; }
    rows.forEach(function (q, n) {
      var card = el("section", null, "card"); card.setAttribute("aria-labelledby", "bq" + n);
      var h = el("h3", (q.status === "owed" ? "Number " + q.order + ": " : "Paid: ") + q.player + ", " + q.board + ", " + pkr(q.price)); h.id = "bq" + n; card.appendChild(h);
      card.appendChild(el("p", (q.kind === "left" ? "Left or removed on " : "Accepted on ") + q.owed_since + (q.status === "owed" ? (q.eligible ? ". May be paid now." : ". May be paid from " + q.eligible_from + ".") : ". Paid on " + q.paid_on + ".")));
      if (q.status === "owed") {
        var p = el("p"); var b = el("button", "Mark as paid in full"); b.type = "button"; b.setAttribute("aria-label", "Mark as paid in full: " + q.player + ", " + q.board);
        b.addEventListener("click", function () { act("cfo_badge_paid", { p_id: q.id, p_paid: null, p_note: null }, "Saved. Remember to write it in the accounts."); });
        p.appendChild(b); card.appendChild(p);
      }
      box.appendChild(card);
    });
  }
  $("bpAdd").addEventListener("click", function () {
    act("cfo_badge_add", { p_board: $("bpBoard").value, p_player: $("bpPlayer").value, p_kind: $("bpKind").value, p_since: $("bpSince").value || null, p_eligible: $("bpElig").value || null, p_price: $("bpPrice").value ? Number($("bpPrice").value) : null, p_note: null }, "Added to the list.", ["bpBoard", "bpPlayer", "bpSince", "bpElig", "bpPrice"]);
  });
  async function load(keepStatus) {
    var f = await sb.rpc("fin_list");
    if (f.error) { $("deniedText").textContent = cleanErr(f.error.message) || "The check could not be completed."; show("deniedView"); return false; }
    renderFin(f.data || {});
    var bq = await sb.rpc("cfo_badge_list"); if (!bq.error) renderBp(bq.data || []);
    var r = await sb.rpc("report_list", { p_office: "CFO" }); if (!r.error) renderRep(r.data || []);
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
