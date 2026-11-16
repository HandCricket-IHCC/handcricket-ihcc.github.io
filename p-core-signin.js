(function () {
  var URL_ = "https://krkrpcnovdobnscknfnw.supabase.co";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  var sb = window.supabase.createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, lock: function (name, timeout, fn) { return fn(); } } });
  var $ = function (id) { return document.getElementById(id); };
  var busy = false;
  function say(t, err) { var s = $("status"); s.textContent = t || ""; s.hidden = !t; s.className = "msg" + (err ? " err" : ""); if (t) s.focus(); }
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
        $("seatTools").textContent = "Your office tools are being built one by one. Sign-in is open for testing only.";
        if (d.office === "General Secretary") { var lk = document.createElement("a"); lk.href = "gs-desk.html"; lk.textContent = "Open the General Secretary desk"; var lkd = document.createElement("a"); lkd.href = "gs-discipline.html"; lkd.textContent = "Open sanctions, appeals, no confidence and interim measures"; $("seatTools").appendChild(document.createTextNode(" ")); $("seatTools").appendChild(lk); $("seatTools").appendChild(document.createTextNode(" ")); $("seatTools").appendChild(lkd); }
        if (d.office === "Deputy Chairman") { var lk2 = document.createElement("a"); lk2.href = "dc-desk.html"; lk2.textContent = "Open the Deputy Chairman desk"; $("seatTools").appendChild(document.createTextNode(" ")); $("seatTools").appendChild(lk2); }
        [["CEO", "ceo-desk.html", "CEO"], ["CFO", "cfo-desk.html", "CFO"], ["Women's Director", "wd-desk.html", "Women's Director"]].forEach(function (x) { if (d.office === x[0]) { var lk4 = document.createElement("a"); lk4.href = x[1]; lk4.textContent = "Open the " + x[2] + " desk"; $("seatTools").appendChild(document.createTextNode(" ")); $("seatTools").appendChild(lk4); } });
        if (d.office === "Chairman") { var lk3 = document.createElement("a"); lk3.href = "ch-desk.html"; lk3.textContent = "Open the Chairman desk"; $("seatTools").appendChild(document.createTextNode(" ")); $("seatTools").appendChild(lk3); }
        say("");
        show("panel");
        try {
          var dl = await sb.rpc("core_due_list"); var box = $("dueList"); box.textContent = "";
          var rows = (dl && dl.data) || [];
          if (!rows.length) { var pp = document.createElement("p"); pp.textContent = "Nothing is due in the next fourteen days."; box.appendChild(pp); }
          else { var ul = document.createElement("ul"); rows.forEach(function (x) { var li = document.createElement("li"); var dt = new Date(x.due); li.textContent = (x.overdue ? "LATE. " : "") + x.office + ": " + x.what + ", by " + (isNaN(dt) ? "" : dt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })) + "."; ul.appendChild(li); }); box.appendChild(ul); }
        } catch (e) { /* the list is only a help */ }
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
