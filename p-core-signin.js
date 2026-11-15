(function () {
  var URL_ = "https://krkrpcnovdobnscknfnw.supabase.co";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  var sb = window.supabase.createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, lock: function (name, timeout, fn) { return fn(); } } });
  var $ = function (id) { return document.getElementById(id); };
  var busy = false;
  function say(t, err) { var s = $("status"); s.textContent = t || ""; s.hidden = !t; s.className = "msg" + (err ? " err" : ""); }
  function show(id, focusIt) {
    ["loginView", "deniedView", "panel"].forEach(function (v) { $(v).hidden = v !== id; });
    var hid = id === "panel" ? "seatH" : id === "deniedView" ? "deniedH" : (focusIt ? "loginH" : null);
    if (hid) { $(hid).setAttribute("tabindex", "-1"); $(hid).focus(); }
  }
  function fmt(d) { if (!d) return ""; var x = new Date(d + "T00:00:00Z"); return isNaN(x) ? d : x.getUTCDate() + " " + ["January","February","March","April","May","June","July","August","September","October","November","December"][x.getUTCMonth()] + " " + x.getUTCFullYear(); }
  async function start() {
    if (busy) return; busy = true;
    try {
      var s = await sb.auth.getSession();
      if (!s.data.session) { show("loginView"); return; }
      $("who").textContent = "Signed in as " + s.data.session.user.email;
      var r = await sb.rpc("core_my_seat");
      if (r.error) { say("Something went wrong. Please try again.", true); show("deniedView"); $("deniedText").textContent = "The check could not be completed."; return; }
      var d = r.data || {};
      if (d.ok) {
        $("seatLine").textContent = d.office + ": " + d.display_name + " (" + d.real_name + "), " + d.board;
        $("seatTerm").textContent = "Term: " + fmt(d.term_start) + " to " + fmt(d.term_end) + ".";
        $("seatDuties").textContent = d.duties || "";
        $("seatTools").textContent = "Your office tools will appear here. They are not built yet. Sign-in is open for testing only.";
        say("");
        show("panel");
      } else {
        var t = d.reason === "not_open" ? "Sign-in for the Core Committee opens on " + fmt(d.access_from) + "." : "This Google account does not hold a Core Committee office.";
        $("deniedText").textContent = t; show("deniedView");
      }
    } finally { busy = false; }
  }
  $("signIn").addEventListener("click", function () {
    sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + window.location.pathname, queryParams: { prompt: "select_account" } } });
  });
  async function out() { await sb.auth.signOut({ scope: "global" }); $("who").textContent = ""; say("You are signed out."); show("loginView", true); }
  $("signOut").addEventListener("click", out); $("signOut2").addEventListener("click", out);
  sb.auth.onAuthStateChange(function (evt) { if (evt === "SIGNED_IN") start(); });
  start();
})();
