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
    var hid = id === "panel" ? "cmpH" : id === "deniedView" ? "deniedH" : (focusLogin ? "loginH" : null);
    if (hid) { $(hid).setAttribute("tabindex", "-1"); $(hid).focus(); }
  }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
  function cleanErr(m) { var t = String(m || ""); var i = t.indexOf("|"); if (i >= 0) { t = t.split("|").slice(2).join("|") || t; } return t.replace(/^E\|/, ""); }
  function when(d) { var x = new Date(d); return isNaN(x) ? "" : x.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }

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
          sb.rpc("dc_cmp_step", { p_id: c.id, p_step: step, p_note: ta.value, p_investigator: step === "assign_investigator" ? ta.value : null }).then(function (r) {
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


  var SIL = { notice: "Waiting for his answer", answered: "He answered", withdrawn: "Withdrawn", declared: "Office declared vacant, Directors to confirm", confirmed: "Directors confirmed", ended: "Directors did not confirm" };
  function renderSil(rows) {
    var box = $("silList"); box.textContent = "";
    if (!rows.length) { box.appendChild(el("p", "No notice has been given.")); return; }
    rows.forEach(function (s, n) {
      var card = el("section", null, "card"); card.setAttribute("aria-labelledby", "sh" + n);
      var h = el("h3", SIL[s.status] + ", notice of " + when(s.created_at)); h.id = "sh" + n; card.appendChild(h);
      var t = "Answer due " + when(s.answer_due_at) + "."; if (s.declared_at) t += " Declared " + when(s.declared_at) + ". Directors confirm by " + when(s.confirm_due_at) + (s.confirm_overdue ? ". OVERDUE." : ".");
      card.appendChild(el("p", t)); if (s.note) card.appendChild(el("p", "Note: " + s.note)); if (s.decision_note) card.appendChild(el("p", "Result: " + s.decision_note));
      var nl = el("label", "Note (optional)"); nl.htmlFor = "sn" + n; card.appendChild(nl);
      var inp = document.createElement("input"); inp.type = "text"; inp.id = "sn" + n; inp.maxLength = 300; inp.autocomplete = "off"; card.appendChild(inp);
      var p = el("p");
      function btn(label, step, cls) {
        var b = el("button", label, cls); b.type = "button"; b.setAttribute("aria-label", label + ", " + s.office);
        b.addEventListener("click", function () {
          if (busy) return; busy = true;
          sb.rpc("dc_silent_step", { p_id: s.id, p_step: step, p_note: inp.value }).then(function (r) {
            busy = false; if (r.error) { say(cleanErr(r.error.message), true); return; } say("Saved: " + label + "."); load(true);
          });
        });
        p.appendChild(b); p.appendChild(document.createTextNode(" "));
      }
      if (s.status === "notice") { btn("He answered", "answered", "alt"); if (s.can_declare) btn("Declare the office vacant", "declare", "danger"); btn("Withdraw the notice", "withdraw", "alt"); }
      if (s.status === "declared") { btn("Directors confirmed", "directors_confirmed", "alt"); btn("Directors did not confirm", "directors_not_confirmed", "alt"); btn("Withdraw", "withdraw", "alt"); }
      if (p.firstChild) card.appendChild(p);
      box.appendChild(card);
    });
  }
  $("silOpen").addEventListener("click", function () {
    if (busy) return; busy = true;
    sb.rpc("dc_silent_open", { p_note: $("silNote").value, p_fourteen: $("silTick").checked }).then(function (r) {
      busy = false; if (r.error) { say(cleanErr(r.error.message), true); return; }
      $("silNote").value = ""; $("silTick").checked = false; say("The notice is recorded. Send it to him by email and WhatsApp. He has seven days to answer."); load(true);
    });
  });

  function renderCl(rows) {
    var box = $("clList"); box.textContent = ""; var ul = el("ul");
    rows.forEach(function (l) { ul.appendChild(el("li", l.from + " to " + l.to + (l.note ? ". " + l.note : "") + (l.cancelled ? ". Cancelled." : "."))); });
    box.appendChild(ul); if (!rows.length) box.appendChild(el("p", "No leave has been approved."));
  }
  $("clGrant").addEventListener("click", function () {
    if (busy) return; busy = true;
    sb.rpc("dc_leave_chairman", { p_from: $("clFrom").value || null, p_to: $("clTo").value || null, p_note: $("clNote").value }).then(function (r) {
      busy = false; if (r.error) { say(cleanErr(r.error.message), true); return; }
      ["clFrom", "clTo", "clNote"].forEach(function (i) { $(i).value = ""; }); say("The leave of the Chairman is approved."); load(true);
    });
  });

  async function load(keepStatus) {
    var cq = await sb.rpc("dc_cmp_queue");
    if (cq.error) { $("deniedText").textContent = cleanErr(cq.error.message) || "The check could not be completed."; show("deniedView"); return false; }
    renderCmp((cq.data && cq.data.items) || []);
    var sl = await sb.rpc("dc_silent_list"); if (!sl.error) renderSil(sl.data || []);
    var cl = await sb.rpc("dc_leave_list"); if (!cl.error) renderCl(cl.data || []);
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
