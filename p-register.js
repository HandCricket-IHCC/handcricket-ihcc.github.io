(function () {
  var URL_ = "https://krkrpcnovdobnscknfnw.supabase.co";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  var FN = URL_ + "/functions/v1/rep-squad";
  var CONSENT = "I confirm that I have permission from every player I add, that the details are correct, and I agree to the data terms of this form. Along with the details I type, IHCC also notes technical details such as my IP address and device, only to keep registration and elections fair.";
  var sb = window.supabase.createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, lock: function (name, timeout, fn) { return fn(); } } });
  var $ = function (id) { return document.getElementById(id); };
  var me = null, players = [], editingId = null, busy = false, starting = false;
  var mode = "list", skipPop = 0; /* "list" = squad list page, "form" = add or edit player page */
  var FIELDS = ["display_name", "real_name", "whatsapp", "email", "city", "country"];
  var LABEL = { display_name: "Display name", real_name: "Real name", whatsapp: "WhatsApp number", email: "Gmail address", city: "City", country: "Country" };

  /* say: plain written message in a live region (sign-in problems, sign-out). */
  function say(text, bad) {
    var m = $("msg"); m.textContent = text || ""; m.hidden = !text; m.className = "msgbox" + (bad ? " bad" : "");
    var d = $("doneMsg"); d.textContent = ""; d.hidden = true;
  }
  /* notify: result of an action. Opens a dialog that the screen reader reads out by itself.
     The written message also stays on the page. buttons: [{label, focus: function -> element}]. */
  function notify(text, bad, buttons) {
    if (!window.IHCCDialog) { say(text, bad); return; }
    var m = $("msg"); m.textContent = ""; m.hidden = true;
    var d = $("doneMsg"); d.textContent = text; d.hidden = false; d.className = "msgbox" + (bad ? " bad" : "");
    window.IHCCDialog.show({ title: (bad ? "Error. " : "") + text, bad: !!bad, buttons: buttons });
  }
  function lineEl(id) { return id ? $("line-" + id) : null; }
  function firstLine() { return document.querySelector("#plist .line"); }
  function show(view) {
    ["loadingView", "loginView", "deniedView", "repView"].forEach(function (v) { $(v).hidden = v !== view; });
  }
  var DISPLAY_NAMES = {"New Zealand Hand Cricket Board":"New Zealand Hand Cricket","England Hand Cricket Board":"England and Wales Hand Cricket Board","Australia Hand Cricket Board":"Hand Cricket Australia","Sri Lanka Hand Cricket Board":"Sri Lanka Hand Cricket","South Africa Hand Cricket Board":"Hand Cricket South Africa","UAE Hand Cricket Board":"Emirates Hand Cricket Board","USA Hand Cricket Board":"USA Hand Cricket","Germany Hand Cricket Board":"German Hand Cricket Federation","Nepal Hand Cricket Board":"Hand Cricket Association of Nepal","India Hand Cricket Board":"Board of Control for Hand Cricket in India"};
  function dispBoard(n) { return DISPLAY_NAMES[n] || n; }
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }
  function errText(e) {
    var m = String((e && e.message) || e || "");
    if (m.indexOf("E|") === 0) return m.split("|").slice(2).join("|");
    return m || "Something went wrong. Please try again.";
  }
  async function rpc(name, args) {
    var r = await sb.rpc(name, args || {});
    if (r.error) throw new Error(r.error.message || "Request failed");
    return r.data;
  }
  async function call(action, data) {
    var s = await sb.auth.getSession();
    if (!s.data.session) throw new Error("Please sign in again.");
    var res = await fetch(FN, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.data.session.access_token, apikey: KEY },
      body: JSON.stringify(Object.assign({ action: action }, data || {}))
    });
    var j = await res.json().catch(function () { return { ok: false, error: "Unexpected reply. Please try again." }; });
    if (!j.ok) { var er = new Error(j.error || "Something went wrong."); er.field = j.field; throw er; }
    return j;
  }
  function lineOf(p) {
    return "•" + p.position + ", Display name, " + p.display_name + ".. Real name, " + p.real_name + (p.position <= 12 ? ".. Voter" : "");
  }
  function pkt(d) {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(d)) + " (Pakistan time)";
  }
  function left(deadline, now) {
    var ms = new Date(deadline).getTime() - new Date(now).getTime() - (Date.now() - clientAtLoad);
    if (ms <= 0) return null;
    var m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
    return d + " day" + (d === 1 ? "" : "s") + ", " + h + " hour" + (h === 1 ? "" : "s") + " and " + mi + " minute" + (mi === 1 ? "" : "s");
  }
  var clientAtLoad = Date.now();

  var CLOSED = true; /* squad submission is closed; set to false to open the old form again */
  async function start() {
    if (CLOSED) { return; }
    if (starting) return; starting = true;
    try {
      var s = await Promise.race([sb.auth.getSession(), new Promise(function (res) { setTimeout(function () { res(null); }, 12000); })]);
      if (!s) { say("The sign-in check took too long. Press Sign in with Google again. If it still does not work, open this page in the Chrome browser.", true); show("loginView"); return; }
      if (!s.data.session) { show("loginView"); return; }
      show("loadingView");
      me = await Promise.race([rpc("rep_me"), new Promise(function (res, rej) { setTimeout(function () { rej(new Error("The server did not answer. Please reload the page and try again.")); }, 20000); })]);
      clientAtLoad = Date.now();
      if (!me || !me.authorized) {
        var em = (s.data.session.user && s.data.session.user.email) || "";
        $("deniedText").textContent = "The Google account " + em + " is not on the list of board representatives. Sign out and sign in with the Gmail address that the IHCC Owner added for your board.";
        show("deniedView"); $("deniedTitle").focus(); return;
      }
      await loadList();
      show("repView");
      render();
      $("boardName").focus();
      resetIdle();
    } catch (e) {
      say(errText(e), true); show("loginView");
    } finally { starting = false; }
  }
  async function loadList() { players = await rpc("rep_list"); me.count = players.length; }
  async function refreshMe() { var c = clientAtLoad; me = await rpc("rep_me"); clientAtLoad = Date.now(); }

  function editable() { return me && me.editable; }

  function render(focusSpec) {
    var n = players.length, min = 12, max = 20;
    $("boardName").textContent = dispBoard(me.board);
    $("whoLine").textContent = "Signed in as " + me.email + ".";
    var l = left(me.deadline, me.now);
    $("deadlineLine").textContent = l ? "Last date: " + pkt(me.deadline) + ". Time left: " + l + "." : "The last date has passed (" + pkt(me.deadline) + ").";
    var c = $("counter"); c.textContent = "";
    var need = Math.max(0, min - n);
    c.appendChild(el("p", { "class": "pnum" }, n + " of " + min + " minimum" + (need > 0 ? ", " + need + " more needed" : ". Minimum reached") + ". Maximum " + max + "."));
    var bar = el("div", { "class": "bar", "aria-hidden": "true" }); var fill = el("i"); fill.style.width = Math.min(100, Math.round(n / min * 100)) + "%"; bar.appendChild(fill); c.appendChild(bar);
    var warn = $("warn");
    if (n < min && !me.is_final) { warn.hidden = false; warn.textContent = "Warning: your board will be disqualified if it has fewer than 12 players by the deadline."; } else { warn.hidden = true; warn.textContent = ""; }

    // state box
    var sb_ = $("stateBox"); sb_.textContent = ""; sb_.hidden = true;
    var past = !l;
    if (me.is_final) {
      sb_.hidden = false;
      sb_.appendChild(el("p", null, "Your final list was submitted on " + pkt(me.final_at) + ". It is locked."));
      if (!past) {
        sb_.appendChild(el("p", null, "Before the deadline you can reopen it, make changes, and lock it again."));
        var rb = el("button", { type: "button", "class": "alt", id: "reopenBtn" }, "Reopen to edit"); rb.addEventListener("click", doReopen); sb_.appendChild(rb);
      } else { sb_.appendChild(el("p", null, "The deadline has passed. Only the IHCC Owner can unlock the list now.")); }
    } else if (!me.editable) {
      sb_.hidden = false;
      sb_.appendChild(el("p", null, n >= min ? "The deadline has passed and your list was locked automatically." : "The deadline has passed. Your board has fewer than 12 players and is not eligible."));
      sb_.appendChild(el("p", null, "Only the IHCC Owner can unlock the list now."));
    } else if (me.owner_unlock) {
      sb_.hidden = false;
      sb_.appendChild(el("p", null, "The IHCC Owner has unlocked your list. You can edit it now."));
    }

    // consent / form / final visibility
    var needConsent = editable() && !me.consent_at;
    $("consentSec").hidden = !needConsent;
    $("consentText").textContent = CONSENT;
    if (mode === "form" && !(editable() && me.consent_at)) mode = "list";
    var canAdd = editable() && !!me.consent_at;
    $("formSec").hidden = !(canAdd && mode === "form");
    $("listSec").hidden = mode === "form";
    $("consentSec").hidden = !needConsent || mode === "form";
    $("addBtn").hidden = false;
    $("finalSec").hidden = !(canAdd && mode === "list");
    $("newWrap").hidden = !canAdd;
    $("newBtn").disabled = n >= max;
    $("newBtn").textContent = n >= max ? "Add player (the list is full, 20 players)" : "Add player";
    $("finalBtn").disabled = n < min;
    $("finalIntro").textContent = n < min ? "You need at least 12 players before you can do the final submit." : "When your list is ready, press Final submit. IHCC will receive your final list and you will get a copy by email.";
    $("formTitle").textContent = editingId ? "Edit player" : "Add a player";
    $("addBtn").textContent = editingId ? "Save changes" : "Add player";
    $("addBtn").disabled = (!editingId && n >= max) || busy;
    if (!editingId && n >= max) { $("formTitle").textContent = "Add a player (list is full)"; }

    // list
    var ul = $("plist"); ul.textContent = "";
    $("emptyNote").hidden = n > 0;
    players.forEach(function (p, i) {
      var li = el("li", { "class": p.position <= 12 ? "voter" : "" });
      li.appendChild(el("p", { "class": "line", tabindex: "0", id: "line-" + p.id }, lineOf(p)));
      if (editable()) {
        var acts = el("div", { "class": "acts" });
        var mk = function (label, act, cls) {
          var b = el("button", { type: "button", "data-id": p.id, "data-act": act }, label);
          b.setAttribute("aria-label", label + " " + p.display_name);
          if (cls) b.className = cls; return b;
        };
        var be = mk("Edit", "edit"), bd = mk("Delete", "del", "danger"), bu = mk("Move up", "up"), bw = mk("Move down", "down");
        if (i === 0) bu.disabled = true; if (i === n - 1) bw.disabled = true;
        be.addEventListener("click", function () { startEdit(p.id); });
        bd.addEventListener("click", function () { askDelete(li, p); });
        bu.addEventListener("click", function () { move(p.id, -1); });
        bw.addEventListener("click", function () { move(p.id, 1); });
        [be, bd, bu, bw].forEach(function (b) { acts.appendChild(b); });
        li.appendChild(acts);
      }
      ul.appendChild(li);
    });
    $("copyBtn").disabled = n === 0; $("dlBtn").disabled = n === 0;
    if (focusSpec) {
      /* focus the row itself: the screen reader reads its new number and name */
      var t = $("line-" + focusSpec.id);
      if (t) setTimeout(function () { t.focus(); }, 60);
    }
    /* first paragraph of the state box can take focus (used after final submit) */
    var sp = $("stateBox").querySelector("p"); if (sp) sp.setAttribute("tabindex", "-1");
  }

  function clearErrors() {
    FIELDS.forEach(function (f) { $("e-" + f).textContent = ""; $(f).removeAttribute("aria-invalid"); });
    $("summary").textContent = "";
  }
  function fieldError(f, text) {
    if (f && $("e-" + f)) { $("e-" + f).textContent = text; $(f).setAttribute("aria-invalid", "true"); }
  }
  function resetForm() { FIELDS.forEach(function (f) { $(f).value = ""; }); editingId = null; clearErrors(); }

  function validateLocal() {
    var bad = [];
    FIELDS.forEach(function (f) { if (!$(f).value.trim()) { fieldError(f, LABEL[f] + " is required."); bad.push(f); } });
    var em = $("email").value.trim();
    if (em && !/^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(em)) { fieldError("email", "Enter a valid Gmail address ending in @gmail.com."); if (bad.indexOf("email") < 0) bad.push("email"); }
    return bad;
  }

  /* ---- two pages inside this page: the squad list, and the add/edit player form ---- */
  function openForm(id) {
    var p = id ? players.filter(function (x) { return x.id === id; })[0] : null;
    resetForm();
    if (p) { editingId = id; FIELDS.forEach(function (f) { $(f).value = p[f] || ""; }); }
    mode = "form";
    render();
    try { history.pushState({ ihccForm: 1 }, ""); } catch (e) {}
    window.scrollTo(0, 0);
    setTimeout(function () { $("display_name").focus(); }, 60);
  }
  function doLeave() { resetForm(); mode = "list"; render(); window.scrollTo(0, 0); }
  /* leave the form page. Same step is used by the Back button, the dialog Close button and Escape. */
  function leaveForm() {
    if (mode !== "form") return;
    doLeave();
    if (history.state && history.state.ihccForm) { skipPop++; try { history.back(); } catch (e) { skipPop = 0; } }
  }
  window.addEventListener("popstate", function () {
    if (skipPop > 0) { skipPop--; return; }
    if (mode === "form") {
      var id = editingId; doLeave();
      setTimeout(function () { var t = lineEl(id) || $("newBtn"); if (t && !t.disabled) t.focus(); }, 60);
    }
  });

  $("f").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    if (busy) return;
    clearErrors();
    var bad = validateLocal();
    if (bad.length) {
      $("summary").textContent = "Please fix: " + bad.map(function (f) { return LABEL[f]; }).join(", ") + ".";
      $("summary").focus(); return;
    }
    busy = true; $("addBtn").disabled = true;
    var wasEdit = !!editingId;
    try {
      var payload = { id: editingId };
      FIELDS.forEach(function (f) { payload[f] = $(f).value; });
      var r = await call("save_player", payload);
      var note = wasEdit ? "Changes saved." : "Player added.";
      if (r.mail_status === "sent") note += " An email was sent to the player.";
      else if (r.mail_status === "none") note += " No email was sent because the details are the same as in the last email.";
      else if (r.mail_status === "limit") note += " The daily email limit for this player was reached, so no email was sent now.";
      else note += " The email to the player could not be sent. IHCC will check this.";
      if (r.other_board) note += " This player may also be in another board's squad. IHCC will contact you.";
      var savedId = wasEdit ? editingId : null;
      resetForm();
      await loadList(); await refreshMe();
      busy = false;
      render();
      if (!wasEdit && players.length) savedId = players[players.length - 1].id;
      var btns = [];
      if (!wasEdit && players.length < 20 && editable()) btns.push({ label: "Add next player", focus: function () { return $("display_name"); } });
      btns.push({ label: "Close", onClick: leaveForm, focus: function () { return lineEl(savedId) || firstLine() || $("newBtn"); } });
      notify(note, false, btns);
    } catch (e) {
      busy = false;
      if (e.field && $("e-" + e.field)) { fieldError(e.field, e.message); $("summary").textContent = e.message; $("summary").focus(); }
      else {
        $("summary").textContent = errText(e);
        notify(errText(e), true, [{ label: "Close", focus: function () { return $("addBtn"); } }]);
      }
      render();
    }
  });

  function startEdit(id) {
    var p = players.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    openForm(id);
    /* written note only; focus goes to the field, which the screen reader reads by itself */
    $("msg").textContent = ""; $("msg").hidden = true;
    var dm = $("doneMsg"); dm.textContent = "Editing " + p.display_name + ". Change the details and press Save changes."; dm.hidden = false; dm.className = "msgbox";
  }
  $("cancelEdit").addEventListener("click", function () {
    var id = editingId; leaveForm();
    var dm = $("doneMsg"); dm.textContent = ""; dm.hidden = true;
    setTimeout(function () { var t = lineEl(id) || $("newBtn"); if (t && !t.disabled) t.focus(); }, 60);
  });
  $("newBtn").addEventListener("click", function () {
    var dm = $("doneMsg"); dm.textContent = ""; dm.hidden = true;
    openForm(null);
  });

  function askDelete(li, p) {
    var acts = li.querySelector(".acts"); acts.hidden = true;
    var box = el("div", { "class": "confirmbox" });
    box.appendChild(el("p", { "class": "confirm", tabindex: "-1" }, "Delete " + p.display_name + " from the squad list?"));
    var row = el("div", { "class": "acts" });
    var yes = el("button", { type: "button", "class": "danger" }, "Yes, delete"); yes.setAttribute("aria-label", "Yes, delete " + p.display_name);
    var no = el("button", { type: "button" }, "Cancel"); no.setAttribute("aria-label", "Cancel, keep " + p.display_name);
    row.appendChild(yes); row.appendChild(no); box.appendChild(row); li.appendChild(box);
    no.addEventListener("click", function () { box.remove(); acts.hidden = false; var b = acts.querySelector('[data-act="del"]'); if (b) b.focus(); });
    yes.onclick = async function () {
      yes.disabled = true;
      try {
        await rpc("rep_delete_player", { p_id: p.id });
        await loadList(); await refreshMe(); render();
        notify(p.display_name + " was deleted. The numbers of the other players were updated.", false,
          [{ label: "Close", focus: function () { return firstLine() || $("newBtn") || $("listTitle"); } }]);
      } catch (e) {
        box.remove(); acts.hidden = false;
        notify(errText(e), true, [{ label: "Close", focus: function () { return acts.querySelector('[data-act="del"]') || lineEl(p.id); } }]);
      }
    };
    box.querySelector(".confirm").focus();
  }

  async function move(id, dir) {
    try {
      await rpc("rep_move_player", { p_id: id, p_dir: dir });
      await loadList();
      var dm = $("doneMsg"); dm.textContent = ""; dm.hidden = true;
      render({ id: id });
    } catch (e) { notify(errText(e), true, [{ label: "Close", focus: function () { return lineEl(id); } }]); }
  }

  // consent
  $("consentChk").addEventListener("change", function () { $("consentBtn").disabled = !this.checked; });
  $("consentBtn").addEventListener("click", async function () {
    this.disabled = true;
    var self = this;
    try {
      await call("consent", { text: CONSENT }); await refreshMe(); render();
      notify("Thank you. You can now add players.", false, [{ label: "Add first player", onClick: function () { openForm(null); }, focus: function () { return $("display_name"); } }]);
    }
    catch (e) { self.disabled = false; notify(errText(e), true, [{ label: "Close", focus: function () { return $("consentBtn"); } }]); }
  });

  // copy / download
  function listText() { return players.map(lineOf).join("\n"); }
  $("copyBtn").addEventListener("click", async function () {
    var t = listText();
    var back = [{ label: "Close", focus: function () { return $("copyBtn"); } }];
    try { await navigator.clipboard.writeText(t); notify("The squad list was copied.", false, back); }
    catch (e) {
      var ta = el("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      ta.remove();
      if (ok) notify("The squad list was copied.", false, back);
      else notify("Copy did not work. Use the download button instead.", true, back);
    }
  });
  $("dlBtn").addEventListener("click", function () {
    var d = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "long", year: "numeric" }).format(new Date());
    var head = dispBoard(me.board) + "\nDate: " + d + "\nStatus: " + (me.is_final || (!me.editable && players.length >= 12) ? "Final" : "Not final") + "\n\n";
    var blob = new Blob([head + listText() + "\n"], { type: "text/plain;charset=utf-8" });
    var a = el("a"); a.href = URL.createObjectURL(blob); a.download = dispBoard(me.board) + " squad list.txt";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    notify("The squad list file was downloaded.", false, [{ label: "Close", focus: function () { return $("dlBtn"); } }]);
  });

  // final submit
  $("finalBtn").addEventListener("click", function () {
    $("finalPanel").hidden = false; $("finalBtn").hidden = true;
    $("finalQ").textContent = "Are you sure you want to submit the final list of " + players.length + " players for the " + dispBoard(me.board) + "? After this the list is locked. Before the deadline you can reopen it.";
    $("finalConsentText").textContent = CONSENT;
    $("finalChk").checked = false; $("finalType").value = ""; $("finalGo").disabled = true;
    $("finalQ").focus();
  });
  function finalReady() { $("finalGo").disabled = !($("finalChk").checked && $("finalType").value.trim() === "FINAL"); }
  $("finalChk").addEventListener("change", finalReady); $("finalType").addEventListener("input", finalReady);
  $("finalCancel").addEventListener("click", function () { $("finalPanel").hidden = true; $("finalBtn").hidden = false; $("finalBtn").focus(); });
  $("finalGo").addEventListener("click", async function () {
    var self = this;
    this.disabled = true;
    try {
      var r = await call("final_submit", { consent: true });
      await refreshMe(); await loadList();
      $("finalPanel").hidden = true; $("finalBtn").hidden = false;
      render();
      notify("Your final list was submitted. " + (r.mail_status === "sent" ? "A copy was sent to your email." : "The copy email could not be sent."), false,
        [{ label: "Close", focus: function () { var p = $("stateBox").querySelector("p"); return p || $("boardName"); } }]);
    } catch (e) { self.disabled = false; notify(errText(e), true, [{ label: "Close", focus: function () { return $("finalGo"); } }]); }
  });

  async function doReopen() {
    try {
      await call("reopen"); await refreshMe(); render();
      notify("Your list is open for editing again. The IHCC Owner was informed. Remember to lock it again with Final submit.", false,
        [{ label: "Close", focus: function () { return $("newBtn"); } }]);
    }
    catch (e) { notify(errText(e), true, [{ label: "Close", focus: function () { return $("reopenBtn") || $("boardName"); } }]); }
  }

  // auth
  $("signInBtn").addEventListener("click", function () {
    sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + window.location.pathname, queryParams: { prompt: "select_account" } } });
  });
  async function out() { await sb.auth.signOut(); me = null; players = []; editingId = null; mode = "list"; say("You are signed out."); show("loginView"); }
  $("signOut").addEventListener("click", out); $("signOutDenied").addEventListener("click", out);
  sb.auth.onAuthStateChange(function (evt) { if (evt === "SIGNED_IN" && !me) start(); });

  var idleTimer = null;
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(async function () { await out(); say("You were signed out because the page was not used for 60 minutes."); }, 60 * 60 * 1000);
  }
  ["click", "keydown", "touchstart"].forEach(function (ev) { document.addEventListener(ev, function () { if (me) resetIdle(); }, { passive: true }); });

  start();
})();
