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
    var hid = id === "panel" ? "sxH" : id === "deniedView" ? "deniedH" : (focusLogin ? "loginH" : null);
    if (hid) { $(hid).setAttribute("tabindex", "-1"); $(hid).focus(); }
  }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
  function cleanErr(m) { var t = String(m || ""); var i = t.indexOf("|"); if (i >= 0) { t = t.split("|").slice(2).join("|") || t; } return t.replace(/^E\|/, ""); }
  function when(d) { var x = new Date(d); return isNaN(x) ? "" : x.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }

  var busy2 = false;
  function act(fn, args, done, reset) {
    if (busy) return; busy = true;
    sb.rpc(fn, args).then(function (r) {
      busy = false; if (r.error) { say(cleanErr(r.error.message), true); return; }
      (reset || []).forEach(function (i) { var e = $(i); if (e.type === "checkbox") e.checked = false; else e.value = ""; });
      var extra = r.data && r.data.third_time ? " This is the third time for the same offence, so it should move to the next level." : "";
      say(done + extra); load(true);
    });
  }
  function mkBtn(p, label, aria, cls, fn) { var b = el("button", label, cls); b.type = "button"; b.setAttribute("aria-label", aria); b.addEventListener("click", fn); p.appendChild(b); p.appendChild(document.createTextNode(" ")); return b; }
  function mkField(card, id, label, tag, opts) {
    var l = el("label", label); l.htmlFor = id; card.appendChild(l);
    var f;
    if (tag === "select") { f = document.createElement("select"); (opts || []).forEach(function (o) { var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; f.appendChild(op); }); }
    else if (tag === "textarea") { f = document.createElement("textarea"); f.rows = 3; f.maxLength = 1500; }
    else { f = document.createElement("input"); f.type = tag || "text"; f.maxLength = 300; f.autocomplete = "off"; }
    f.id = id; card.appendChild(f); return f;
  }
  function mkTick(card, id, label) { var row = el("div", null, "opt"); var cb = document.createElement("input"); cb.type = "checkbox"; cb.id = id; row.appendChild(cb); var l = el("label", label); l.htmlFor = id; row.appendChild(l); card.appendChild(row); return cb; }
  var KIND = { warning: "Warning", suspension: "Suspension", squad_removal: "Removal from a squad", ban: "Ban", office_removal: "Removal from an office", fine: "Fine" };
  var GROUND = [["new_proof", "New proof that was not there before"], ["procedure", "A fault of procedure"], ["too_heavy", "The sanction is far too heavy"], ["beyond_powers", "The Core Committee went beyond its powers"]];

  function renderSanctions(rows) {
    var box = $("scList"); box.textContent = "";
    if (!rows.length) { box.appendChild(el("p", "No sanction has been recorded.")); return; }
    rows.forEach(function (s, n) {
      var card = el("section", null, "card"); card.setAttribute("aria-labelledby", "sc" + n);
      var h = el("h3", s.ref + ": " + s.target + (s.board ? " (" + s.board + ")" : "") + ", " + KIND[s.kind] + ", " + s.level + ", " + s.status); h.id = "sc" + n; card.appendChild(h);
      var t = "Offence: " + s.offence + ". Decided by " + (s.by === "core" ? "the Core Committee" : "the Board of Directors") + " on " + s.decided_on + "." + (s.permanent ? " Permanent." : (s.ends_on ? " Until " + s.ends_on + "." : "")) + (s.fine ? " Fine: " + Number(s.fine).toLocaleString("en-GB") + " PKR." : "") + (s.repeat_count > 1 ? " Time number " + s.repeat_count + " for this offence." : "");
      card.appendChild(el("p", t));
      if (s.public_note) card.appendChild(el("p", "Text for the Main Group (display name, offence, sanction and length only): " + s.public_note));
      if (s.note) card.appendChild(el("p", "Note: " + s.note));
      if (s.appeal) card.appendChild(el("p", "Appeal: " + s.appeal.status + " (" + (s.appeal.kind === "full_board" ? "full Board" : "five Directors by lot") + ")."));
      var today = new Date().toISOString().slice(0, 10);
      if (s.appealable && !s.appeal && today <= s.appeal_by) {
        card.appendChild(el("p", "An appeal may be made until " + s.appeal_by + "."));
        var g = mkField(card, "sg" + n, "Ground of the appeal", "select", GROUND);
        var rs = mkField(card, "sr" + n, "Reason, in writing", "textarea");
        var pa = el("p");
        mkBtn(pa, "Open the appeal", "Open the appeal for " + s.ref, null, function () { act("gs_appeal_open", { p_sanction: s.id, p_ground: g.value, p_reason: rs.value }, "The appeal is opened. You must check within twenty-four hours whether there is a ground."); });
        card.appendChild(pa);
      }
      if (s.status === "active" || s.status === "reduced") {
        var p = el("p");
        mkBtn(p, "Mark as ended", "Mark as ended: " + s.ref, "alt", function () { act("gs_sanction_set", { p_id: s.id, p_status: "ended", p_note: null }, "Saved."); });
        mkBtn(p, "Cancel the sanction", "Cancel the sanction: " + s.ref, "danger", function () { act("gs_sanction_set", { p_id: s.id, p_status: "cancelled", p_note: null }, "Saved."); });
        card.appendChild(p);
      }
      box.appendChild(card);
    });
  }

  var AS = { filed: "Waiting for your check", refused: "Refused", admitted: "Admitted", drawn: "Lot drawn", decided: "Decided" };
  function renderAppeals(rows) {
    var box = $("apList"); box.textContent = "";
    if (!rows.length) { box.appendChild(el("p", "No appeal has been opened.")); return; }
    rows.forEach(function (a, n) {
      var card = el("section", null, "card"); card.setAttribute("aria-labelledby", "ap" + n);
      var h = el("h3", a.ref + ", " + a.target + ": " + AS[a.status] + (a.outcome ? ", " + a.outcome : "")); h.id = "ap" + n; card.appendChild(h);
      var t = "Goes to " + (a.kind === "full_board" ? "the full Board of Directors" : "five Directors by lot") + ". Ground: " + a.ground + ". Filed " + a.filed_on + ". Reason: " + a.reason + ".";
      if (a.status === "filed") t += " Check by " + when(a.check_due) + (a.check_overdue ? ". OVERDUE." : ".");
      if (a.refused_note) t += " Refused: " + a.refused_note + ".";
      if (a.objection_at) t += " Objection received " + when(a.objection_at) + ".";
      if (a.committee) t += " Committee (boards of the Directors): " + a.committee.join(", ") + ".";
      if (a.decide_due && a.status !== "decided") t += " Decision due " + when(a.decide_due) + (a.decide_overdue ? ". OVERDUE." : ".");
      card.appendChild(el("p", t));
      var p = el("p");
      if (a.status === "filed" || (a.status === "refused" && a.objection_at)) {
        var nt = mkField(card, "an" + n, "Reason for refusing (needed to refuse)", "text");
        card.appendChild(p);
        mkBtn(p, "Admit the appeal", "Admit the appeal: " + a.ref, null, function () { act("gs_appeal_check", { p_id: a.id, p_ok: true, p_note: null }, "The appeal is admitted."); });
        mkBtn(p, "Refuse, there is no ground", "Refuse the appeal: " + a.ref, "danger", function () { act("gs_appeal_check", { p_id: a.id, p_ok: false, p_note: nt.value }, "The appeal is refused. The person may object once within forty-eight hours."); });
      } else if (a.status === "refused" && a.can_object) {
        var on = mkField(card, "ao" + n, "Objection of the person (once, within forty-eight hours)", "text");
        card.appendChild(p);
        mkBtn(p, "Record the objection", "Record the objection: " + a.ref, "alt", function () { act("gs_appeal_object", { p_id: a.id, p_note: on.value }, "The objection is recorded. Check the appeal once more."); });
      } else if (a.status === "admitted" && a.kind === "committee5") {
        var cb = mkField(card, "ac" + n, "Board of the complainant (it is left out of the lot)", "text");
        card.appendChild(p);
        mkBtn(p, "Draw the lot", "Draw the lot of five Directors: " + a.ref, null, function () { act("gs_appeal_draw", { p_id: a.id, p_complainant_board: cb.value }, "The lot is drawn. Read the names to everyone, for example on Google Meet."); });
      }
      if (a.status === "drawn" || (a.status === "admitted" && a.kind === "full_board")) {
        var oc = mkField(card, "ad" + n, "Decision", "select", [["upheld", "Sanction upheld"], ["reduced", "Sanction reduced"], ["cancelled", "Sanction cancelled"]]);
        var vt = mkTick(card, "av" + n, "The vote met the rule: three of five, or more than half of the Board. To change a large sanction, more than two-thirds of all Directors.");
        var dn = mkField(card, "aq" + n, "Note", "text");
        var p2 = el("p"); card.appendChild(p2);
        mkBtn(p2, "Record the decision", "Record the decision: " + a.ref, null, function () { act("gs_appeal_decide", { p_id: a.id, p_outcome: oc.value, p_votes_ok: vt.checked, p_note: dn.value }, "The decision is recorded. If the appeal succeeded, tell the Main Group that the sanction was wrong."); });
      }
      box.appendChild(card);
    });
  }

  var NS = { open: "Waiting for the new holder", filled: "New holder chosen" };
  function renderNc(rows) {
    var box = $("ncList"); box.textContent = "";
    if (!rows.length) { box.appendChild(el("p", "No case has been recorded.")); return; }
    rows.forEach(function (c, n) {
      var card = el("section", null, "card"); card.setAttribute("aria-labelledby", "nc" + n);
      var h = el("h3", c.board + ", " + c.office + ": " + NS[c.status]); h.id = "nc" + n; card.appendChild(h);
      card.appendChild(el("p", c.signatories + " of 12 said it in writing, on " + c.recorded_on + ". The board elects a new holder by " + c.due + (c.overdue ? ". OVERDUE." : ".") + (c.note ? " Note: " + c.note : "")));
      if (c.status === "open") { var p = el("p"); mkBtn(p, "New holder chosen", "New holder chosen for " + c.board + ", " + c.office, "alt", function () { act("gs_noconf_done", { p_id: c.id, p_note: null }, "Saved."); }); card.appendChild(p); }
      box.appendChild(card);
    });
  }

  var IS = { proposed: "Waiting for your approval", active: "Active, Directors must confirm", confirmed: "Confirmed by the Directors", lapsed: "Ended by itself, Directors did not confirm in time", ended: "Ended", withdrawn: "Withdrawn" };
  function renderIm(rows) {
    var box = $("imList"); box.textContent = "";
    if (!rows.length) { box.appendChild(el("p", "No interim measure has been proposed.")); return; }
    rows.forEach(function (m, n) {
      var card = el("section", null, "card"); card.setAttribute("aria-labelledby", "im" + n);
      var h = el("h3", m.target + ": " + IS[m.status] + (m.outcome ? ", " + m.outcome : "")); h.id = "im" + n; card.appendChild(h);
      card.appendChild(el("p", "Offence: " + m.offence + ". Reason: " + m.reason + "." + (m.confirm_due && (m.status === "active") ? " Directors confirm by " + when(m.confirm_due) + "." : "") + (m.ends_at && (m.status === "active" || m.status === "confirmed") ? " Ends at the latest " + when(m.ends_at) + "." : "") + (m.objection_at ? " The accused objected " + when(m.objection_at) + "." : "")));
      var p = el("p");
      function step(label, s, cls) { mkBtn(p, label, label + ": " + m.target, cls, function () { act("gs_interim_step", { p_id: m.id, p_step: s, p_note: null }, "Saved."); }); }
      if (m.status === "proposed") { mkBtn(p, "Approve with the Chairman", "Approve the interim measure: " + m.target, null, function () { act("gs_interim_approve", { p_id: m.id }, "Approved. The Directors must confirm within seven days."); }); step("Withdraw", "withdraw", "alt"); }
      if (m.status === "active") { step("Directors confirmed", "directors_confirmed"); step("Accused objected in writing", "objection", "alt"); step("Withdraw", "withdraw", "alt"); }
      if (m.status === "confirmed") { step("Accused objected in writing", "objection", "alt"); step("Found innocent, restore what he lost", "innocent", "alt"); step("Found guilty, inquiry finished", "guilty", "alt"); }
      if (m.status === "lapsed") { step("Found innocent, restore what he lost", "innocent", "alt"); }
      if (p.firstChild) card.appendChild(p);
      box.appendChild(card);
    });
  }

  $("scAdd").addEventListener("click", function () {
    act("gs_sanction_add", { p_target_kind: $("scKind0").value, p_target: $("scTarget").value, p_board: $("scBoard").value, p_offence: $("scOffence").value, p_kind: $("scKind").value, p_level: $("scLevel").value, p_by: $("scBy").value, p_decided: $("scDecided").value || null, p_ends: $("scEnds").value || null, p_permanent: $("scPerm").checked, p_fine: $("scFine").value ? Number($("scFine").value) : null, p_receipt: $("scReceipt").value, p_note: $("scNote").value }, "The sanction is recorded.", ["scTarget", "scBoard", "scOffence", "scDecided", "scEnds", "scPerm", "scFine", "scReceipt", "scNote"]);
  });
  $("ncAdd").addEventListener("click", function () {
    act("gs_noconf_record", { p_board: $("ncBoard").value, p_office: $("ncOffice").value, p_signatories: $("ncCount").value ? parseInt($("ncCount").value, 10) : null, p_note: $("ncNote").value }, "Recorded. The office ends and the board has thirty days to elect a new holder.", ["ncBoard", "ncCount", "ncNote"]);
  });
  async function load(keepStatus) {
    var s = await sb.rpc("gs_sanction_list");
    if (s.error) { $("deniedText").textContent = cleanErr(s.error.message) || "The check could not be completed."; show("deniedView"); return false; }
    renderSanctions(s.data || []);
    var a = await sb.rpc("gs_appeal_list"); if (!a.error) renderAppeals(a.data || []);
    var c = await sb.rpc("gs_noconf_list"); if (!c.error) renderNc(c.data || []);
    var i = await sb.rpc("gs_interim_list"); if (!i.error) renderIm(i.data || []);
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
