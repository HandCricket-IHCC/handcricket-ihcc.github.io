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
    var hid = id === "panel" ? "joinH" : id === "deniedView" ? "deniedH" : (focusLogin ? "loginH" : null);
    if (hid) { $(hid).setAttribute("tabindex", "-1"); $(hid).focus(); }
  }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
  function cleanErr(m) { var t = String(m || ""); var i = t.indexOf("|"); if (i >= 0) { t = t.split("|").slice(2).join("|") || t; } return t.replace(/^E\|/, ""); }
  function when(d) { var x = new Date(d); return isNaN(x) ? "" : x.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }

  function checkbox(card, id, label) {
    var row = el("div", null, "opt"); var cb = document.createElement("input"); cb.type = "checkbox"; cb.id = id;
    var lb = el("label", label); lb.htmlFor = id; row.appendChild(cb); row.appendChild(lb); card.appendChild(row); return cb;
  }

  function render(items) {
    var box = $("joinList"); box.textContent = "";
    $("joinInfo").textContent = items.length ? items.length + " joining request" + (items.length === 1 ? "" : "s") + " waiting. Oldest first."
      : "No joining request is waiting.";
    items.forEach(function (it, n) {
      var card = el("section", null, "card"); card.setAttribute("aria-labelledby", "h" + n);
      var h = el("h3", it.display_name + " (" + it.real_name + "), " + it.board); h.id = "h" + n; card.appendChild(h);
      if (it.sent_by === "player") card.appendChild(el("p", "The player sent this request himself or herself. The Team Director of the board has already approved it."));
      card.appendChild(el("p", "Sent " + when(it.created_at) + ". Decide by " + when(it.due_at) + (it.overdue ? ". OVERDUE." : ". About " + it.hours_left + " hours left.")));
      card.appendChild(el("p", "City: " + it.city + ". Country: " + it.country + ". Gender: " + it.gender + ". Gmail: " + it.email + ". WhatsApp: " + it.whatsapp + "."));
      var a = it.auto || {};
      var notes = [];
      notes.push("Squad now has " + a.squad_size + " players" + (a.squad_full ? " (full, at most thirty)." : "."));
      if (a.in_other_squad) notes.push("WARNING: this Gmail address is already in a squad.");
      if (a.recently_removed) notes.push("Note: this Gmail address was removed from a squad in the last year. Check the cooling-off rules 8.17 to 8.20.");
      card.appendChild(el("p", notes.join(" ")));
      var c1 = checkbox(card, "c1" + n, "The display name is the name of a real cricketer who has played for the country of this board (rule 2.12).");
      var c2 = checkbox(card, "c2" + n, "The name is verified on the verification page of the Hand Cricket application (rule 2.12).");
      var c3 = checkbox(card, "c3" + n, "The player is not in another squad and the cooling-off period is over (rule 2.21 a and b).");
      var c4 = checkbox(card, "c4" + n, "No sanction is in force against the player and the squad stays within thirty (rule 2.21 c and d).");
      var rl = el("label", "Reason (needed if you reject)"); rl.htmlFor = "r" + n; card.appendChild(rl);
      var ta = document.createElement("textarea"); ta.id = "r" + n; ta.rows = 3; ta.maxLength = 500; card.appendChild(ta);
      var ap = el("button", "Approve " + it.display_name); ap.type = "button";
      var rj = el("button", "Reject " + it.display_name, "danger"); rj.type = "button";
      function decide(approve) {
        if (busy) return; busy = true; ap.disabled = rj.disabled = true;
        sb.rpc("gs_join_decide", { p_id: it.id, p_approve: approve, p_reason: ta.value, p_cricketer: c1.checked, p_verified: c2.checked, p_cooling: c3.checked, p_sanction: c4.checked })
          .then(function (r) {
            busy = false;
            if (r.error) { ap.disabled = rj.disabled = false; say(cleanErr(r.error.message), true); return; }
            say(approve ? "Approved. " + it.display_name + " is now at place " + r.data.position + ". " + (r.data.receipt_note || "") : "Rejected. The reason is saved in the log.");
            load(true);
          });
      }
      ap.addEventListener("click", function () { decide(true); });
      rj.addEventListener("click", function () { decide(false); });
      var p = el("p"); p.appendChild(ap); p.appendChild(document.createTextNode(" ")); p.appendChild(rj); card.appendChild(p);
      box.appendChild(card);
    });
  }

  function renderCmp(items) {
    var box = $("cmpList"); box.textContent = "";
    $("cmpInfo").textContent = items.length ? items.length + " open complaint" + (items.length === 1 ? "" : "s") + ". Child safety first, then oldest."
      : "No complaint is open.";
    items.forEach(function (c, n) {
      var card = el("section", null, "card"); card.setAttribute("aria-labelledby", "ch" + n);
      var h = el("h3", c.receipt + ": against " + (c.against_office ? c.against_office + " " : "") + c.against + (c.child_safety ? " (CHILD SAFETY)" : "") + (c.serious ? " (serious)" : "")); h.id = "ch" + n; card.appendChild(h);
      card.appendChild(el("p", "Status: " + c.status + ". Received " + when(c.created_at) + (c.ack_at ? ". Acknowledged " + when(c.ack_at) + "." : ". Acknowledge by " + when(c.ack_due_at) + (c.ack_overdue ? ". OVERDUE." : "."))));
      card.appendChild(el("p", "By: " + c.complainant + " (" + c.complainant_kind + (c.complainant_board ? ", " + c.complainant_board : "") + "), " + c.complainant_email + (c.hide_name ? ". THE COMPLAINANT ASKS THAT HIS NAME IS NOT SHOWN TO THE ACCUSED. Do not tell the accused the name." : ".")));
      card.appendChild(el("p", "Date of the act: " + c.incident_date + "."));
      card.appendChild(el("p", c.what, "prewrap"));
      if (c.proof) card.appendChild(el("p", "Proof: " + c.proof, "prewrap"));
      if (c.answer_due_at) card.appendChild(el("p", "The accused answers by " + when(c.answer_due_at) + (c.answer_at ? ". Answer received " + when(c.answer_at) + "." : ".")));
      if (c.investigator) card.appendChild(el("p", "Investigating officer: " + c.investigator + ". Report due " + when(c.report_due_at) + (c.report_at ? ". Report received." : ".")));
      var nl = el("label", "Note, name or decision (needed for assign, decided and close)"); nl.htmlFor = "cn" + n; card.appendChild(nl);
      var ta = document.createElement("textarea"); ta.id = "cn" + n; ta.rows = 2; ta.maxLength = 500; card.appendChild(ta);
      var p = el("p");
      function btn(label, step, cls) {
        var b = el("button", label, cls); b.type = "button"; b.setAttribute("aria-label", label + ", " + c.receipt);
        b.addEventListener("click", function () {
          if (busy) return; busy = true;
          sb.rpc("gs_cmp_step", { p_id: c.id, p_step: step, p_note: ta.value, p_investigator: step === "assign_investigator" ? ta.value : null }).then(function (r) {
            busy = false;
            if (r.error) { say(cleanErr(r.error.message), true); return; }
            say("Saved: " + label + " for " + c.receipt + "."); load(true);
          });
        });
        p.appendChild(b); p.appendChild(document.createTextNode(" "));
      }
      if (!c.ack_at) btn("Acknowledge and tell the accused", "acknowledge");
      if (c.ack_at && !c.answer_at) btn("Accused has answered", "answer_received", "alt");
      if (c.ack_at && !c.investigator) btn("Assign investigating officer", "assign_investigator", "alt");
      if (c.investigator && !c.report_at) btn("Report received", "report_received", "alt");
      btn("Decided", "decided", "alt"); btn("Close without action", "close", "danger");
      card.appendChild(p);
      if ((c.events || []).length) card.appendChild(el("p", "Log: " + c.events.map(function (e) { return when(e.at) + " " + e.kind; }).join("; ") + "."));
      box.appendChild(card);
    });
  }

  async function load(keepStatus) {
    if (window.__gsToolsLoad) window.__gsToolsLoad();
    var cq = await sb.rpc("gs_cmp_queue"); if (!cq.error) renderCmp((cq.data && cq.data.items) || []);
    var r = await sb.rpc("gs_join_queue");
    if (r.error) { $("deniedText").textContent = cleanErr(r.error.message) || "The check could not be completed."; show("deniedView"); return false; }
    if (!keepStatus) say("");
    render((r.data && r.data.items) || []);
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
