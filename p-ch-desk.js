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
    var hid = id === "panel" ? "mtH" : id === "deniedView" ? "deniedH" : (focusLogin ? "loginH" : null);
    if (hid) { $(hid).setAttribute("tabindex", "-1"); $(hid).focus(); }
  }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
  function cleanErr(m) { var t = String(m || ""); var i = t.indexOf("|"); if (i >= 0) { t = t.split("|").slice(2).join("|") || t; } return t.replace(/^E\|/, ""); }
  function when(d) { var x = new Date(d); return isNaN(x) ? "" : x.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }

  var SIL = { notice: "Waiting for his answer", answered: "He answered", withdrawn: "Withdrawn", declared: "Office declared vacant, Directors to confirm", confirmed: "Directors confirmed", ended: "Directors did not confirm" };
  function renderSil(rows) {
    var box = $("silList"); box.textContent = "";
    if (!rows.length) { box.appendChild(el("p", "No notice has been recorded.")); return; }
    rows.forEach(function (s, n) {
      var card = el("section", null, "card"); card.setAttribute("aria-labelledby", "sh" + n);
      var h = el("h3", s.office + ": " + SIL[s.status] + ", notice of " + when(s.created_at)); h.id = "sh" + n; card.appendChild(h);
      var t = "Answer due " + when(s.answer_due_at) + "."; if (s.declared_at) t += " Declared " + when(s.declared_at) + ". Directors confirm by " + when(s.confirm_due_at) + (s.confirm_overdue ? ". OVERDUE." : ".");
      card.appendChild(el("p", t)); if (s.note) card.appendChild(el("p", "Note: " + s.note)); if (s.decision_note) card.appendChild(el("p", "Result: " + s.decision_note));
      var nl = el("label", "Note (optional)"); nl.htmlFor = "sn" + n; card.appendChild(nl);
      var inp = document.createElement("input"); inp.type = "text"; inp.id = "sn" + n; inp.maxLength = 300; inp.autocomplete = "off"; card.appendChild(inp);
      var p = el("p");
      function btn(label, step, cls) {
        var b = el("button", label, cls); b.type = "button"; b.setAttribute("aria-label", label + ", " + s.office);
        b.addEventListener("click", function () {
          if (busy) return; busy = true;
          sb.rpc("ch_silent_step", { p_id: s.id, p_step: step, p_note: inp.value }).then(function (r) {
            busy = false; if (r.error) { say(cleanErr(r.error.message), true); return; } say("Saved: " + label + ", " + s.office + "."); load(true);
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
  function renderLeave(rows) {
    var box = $("lvList"); box.textContent = "";
    var ul = el("ul"); rows.forEach(function (l) {
      var li = el("li", l.office + ": " + l.from + " to " + l.to + (l.note ? ". " + l.note : "") + (l.cancelled ? ". Cancelled." : (l.active ? ". Active or coming." : ". Finished.")));
      if (l.active) { var b = el("button", "Cancel", "alt"); b.type = "button"; b.setAttribute("aria-label", "Cancel the leave of " + l.office);
        b.addEventListener("click", function () { if (busy) return; busy = true; sb.rpc("ch_leave_cancel", { p_id: l.id }).then(function (r) { busy = false; if (r.error) { say(cleanErr(r.error.message), true); return; } say("The leave is cancelled."); load(true); }); });
        li.appendChild(document.createTextNode(" ")); li.appendChild(b); }
      ul.appendChild(li);
    });
    box.appendChild(ul); if (!rows.length) box.appendChild(el("p", "No leave has been approved."));
  }
  var MS = { ordered: "Waiting for the General Secretary", called: "Called", cancelled: "Cancelled" };
  function renderMeet(rows) {
    var box = $("mtList"); box.textContent = ""; var ul = el("ul");
    rows.forEach(function (m) { ul.appendChild(el("li", MS[m.status] + ". Ordered " + when(m.created_at) + (m.wanted_for ? ", wanted for " + when(m.wanted_for) : "") + ". Agenda: " + m.agenda + (m.called_at ? ". Called " + when(m.called_at) + (m.called_note ? ", " + m.called_note : "") + "." : "."))); });
    box.appendChild(ul); if (!rows.length) box.appendChild(el("p", "No meeting has been ordered."));
  }
  function act(fn, args, done, reset) {
    if (busy) return; busy = true;
    sb.rpc(fn, args).then(function (r) { busy = false; if (r.error) { say(cleanErr(r.error.message), true); return; } (reset || []).forEach(function (i) { var e = $(i); if (e.type === "checkbox") e.checked = false; else e.value = ""; }); say(done); load(true); });
  }
  $("mtSend").addEventListener("click", function () { var w = $("mtWhen").value; act("ch_meeting_order", { p_agenda: $("mtAgenda").value, p_when: w ? new Date(w).toISOString() : null }, "The order is sent. The General Secretary calls the meeting with twenty-four hours' notice.", ["mtAgenda", "mtWhen"]); });
  $("lvGrant").addEventListener("click", function () { act("ch_leave_grant", { p_office: $("lvOffice").value, p_from: $("lvFrom").value || null, p_to: $("lvTo").value || null, p_note: $("lvNote").value }, "The leave is approved. An acting officer does the work meanwhile.", ["lvFrom", "lvTo", "lvNote"]); });
  $("silOpen").addEventListener("click", function () { act("ch_silent_open", { p_office: $("silOffice").value, p_note: $("silNote").value, p_fourteen: $("silTick").checked }, "The notice is recorded. The General Secretary sends it by email and WhatsApp. The officer has seven days to answer.", ["silNote", "silTick"]); });

  async function load(keepStatus) {
    var m = await sb.rpc("ch_meeting_list");
    if (m.error) { $("deniedText").textContent = cleanErr(m.error.message) || "The check could not be completed."; show("deniedView"); return false; }
    renderMeet(m.data || []);
    var l = await sb.rpc("ch_leave_list"); if (!l.error) renderLeave(l.data || []);
    var s = await sb.rpc("ch_silent_list"); if (!s.error) renderSil(s.data || []);
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
