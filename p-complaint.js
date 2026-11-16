(function () {
  var URL_ = "https://krkrpcnovdobnscknfnw.supabase.co";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  var sb = window.supabase.createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, lock: function (name, timeout, fn) { return fn(); } } });
  var $ = function (id) { return document.getElementById(id); };
  var busy = false;
  var STATUS = { received: "Received. Waiting for the written receipt.", acknowledged: "Acknowledged. The accused has been told and has three days to answer.", answered: "The accused has answered.", investigation: "With the investigating officer.", report_in: "The report is in. The Core Committee decides.", decided: "Decided.", closed: "Closed.", withdrawn: "Withdrawn." };
  function say(t, err) { var s = $("status"); s.textContent = t || ""; s.hidden = !t; s.className = "msg" + (err ? " err" : ""); }
  function show(id, focusLogin) {
    $("loginView").hidden = id !== "login"; $("panel").hidden = id !== "panel";
    var h = id === "panel" ? "formH" : (focusLogin ? "loginH" : null);
    if (h) { $(h).setAttribute("tabindex", "-1"); $(h).focus(); }
  }
  function cleanErr(m) { var t = String(m || ""); if (/^E\|/.test(t)) t = t.split("|").slice(2).join("|"); return t; }
  function when(d) { var x = new Date(d); return isNaN(x) ? "" : x.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }
  async function loadMine() {
    var r = await sb.rpc("cmp_my_list"); var ul = $("mine"); ul.textContent = "";
    var rows = (!r.error && r.data) || [];
    rows.forEach(function (c) {
      var t = c.receipt + ", against " + c.against + ", sent " + when(c.created_at) + ". " + (STATUS[c.status] || c.status);
      if (c.answer_due_at && c.status === "acknowledged") t += " Answer due " + when(c.answer_due_at) + ".";
      if (c.report_due_at && c.status === "investigation") t += " Report due " + when(c.report_due_at) + ".";
      var li = document.createElement("li"); li.textContent = t; ul.appendChild(li);
    });
    if (!rows.length) { var li = document.createElement("li"); li.textContent = "None."; ul.appendChild(li); }
  }
  async function start() {
    if (busy) return; busy = true;
    try {
      var s = await sb.auth.getSession();
      if (!s.data.session) { show("login"); return; }
      $("who").textContent = "Signed in as " + s.data.session.user.email;
      await loadMine(); show("panel");
    } finally { busy = false; }
  }
  $("kind").addEventListener("change", function () { $("officeRow").hidden = $("kind").value !== "officer"; });
  $("send").addEventListener("click", async function () {
    if (busy) return; busy = true; $("send").disabled = true;
    var r = await sb.rpc("cmp_submit", { p_against_kind: $("kind").value, p_against_office: $("office").value, p_against_text: $("against").value, p_what: $("what").value,
      p_proof: $("proof").value, p_incident: $("when").value || null, p_serious: $("serious").checked, p_child: $("child").checked, p_hide: $("hide").checked });
    busy = false; $("send").disabled = false;
    if (r.error) { say(cleanErr(r.error.message), true); $("status").focus(); return; }
    ["against", "what", "proof", "when"].forEach(function (i) { $(i).value = ""; });
    ["serious", "child", "hide"].forEach(function (i) { $(i).checked = false; }); $("kind").value = ""; $("officeRow").hidden = true;
    await loadMine();
    say("Your complaint is received. Your receipt code is " + r.data.receipt + ". The General Secretary acknowledges it in writing within twenty-four hours.");
    $("status").setAttribute("tabindex", "-1"); $("status").focus();
  });
  $("signIn").addEventListener("click", function () {
    sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + window.location.pathname, queryParams: { prompt: "select_account" } } });
  });
  $("signOut").addEventListener("click", async function () { await sb.auth.signOut({ scope: "global" }); $("who").textContent = ""; say("You are signed out."); show("login", true); });
  sb.auth.onAuthStateChange(function (evt) { if (evt === "SIGNED_IN") start(); });
  start();
})();
