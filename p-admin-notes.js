(function () {
  var adm = window.__adm;
  var URL = adm.URL, KEY = adm.KEY, BOARDS = adm.BOARDS, sb = adm.sb, $ = adm.$, say = adm.say, sayLive = adm.sayLive, td = adm.td, th = adm.th, rpc = adm.rpc, show = adm.show, setView = adm.setView, fmt = adm.fmt, errMsg = adm.errMsg, btn = adm.btn, callFn = adm.callFn, csvCell = adm.csvCell, downloadCsv = adm.downloadCsv, el = adm.el, plural = adm.plural, isOC = adm.isOC, isOwner = adm.isOwner, guard = adm.guard, loadAll = adm.loadAll, render = adm.render, out = adm.out;
  var NOTES = { inbox: [], targets: [], openBtn: null };
  function setNoteBadge(n) {
    Array.prototype.forEach.call($("viewSel").options, function (o) { if (o.value === "notes") o.textContent = "Notes" + (n ? " (" + n + " new)" : ""); });
    $("noteBanner").hidden = !n;
    $("noteBannerText").textContent = n ? "You have " + plural(n, "new note", "new notes") + "." : "";
  }
  async function refreshNoteBadge() {
    if (!isOC()) return;
    try { setNoteBadge(await rpc("admin_notes_unread")); } catch (_) {}
  }
  $("noteBannerBtn").addEventListener("click", function () {
    $("viewSel").value = "notes"; setView(); $("notesH").focus();
  });
  async function loadNotes() {
    try {
      var d = await rpc("admin_notes_inbox"); NOTES.inbox = d.notes || []; setNoteBadge(d.unread || 0);
      var body = $("ntRows"); body.textContent = "";
      if (!NOTES.inbox.length) { var tr0 = document.createElement("tr"), c0 = td("No notes."); c0.colSpan = 5; tr0.appendChild(c0); body.appendChild(tr0); }
      NOTES.inbox.forEach(function (n) {
        var tr = document.createElement("tr");
        tr.appendChild(th(n.from_name || n.from_email)); tr.appendChild(td(fmt(n.created_at)));
        tr.appendChild(td(n.body.length > 80 ? n.body.slice(0, 80) + "..." : n.body));
        tr.appendChild(td(n.read ? "Read" : "New"));
        var c = document.createElement("td");
        c.appendChild(btn("Open", function (ev) { readNote(n, ev.currentTarget); }, "alt", "Open the note from " + (n.from_name || n.from_email)));
        tr.appendChild(c); body.appendChild(tr);
      });
      $("notesNote").textContent = NOTES.inbox.length + " of 50 notes kept. " + (d.unread ? plural(d.unread, "new note", "new notes") + "." : "No new notes.");
    } catch (e) { say("Error: " + errMsg(e), true); }
  }
  async function readNote(n, fromBtn) {
    NOTES.openBtn = fromBtn;
    $("ntReadH").textContent = "Note from " + (n.from_name || n.from_email);
    $("ntReadMeta").textContent = n.from_email + ", " + fmt(n.created_at);
    $("ntReadBody").textContent = n.body;
    $("ntRead").hidden = false; $("ntReadH").focus();
    if (!n.read) {
      try { await rpc("admin_note_mark_read", { p_id: n.id }); n.read = true; fromBtn.closest("tr").children[3].textContent = "Read"; var left = NOTES.inbox.filter(function (x) { return !x.read; }).length; setNoteBadge(left); $("notesNote").textContent = NOTES.inbox.length + " of 50 notes kept. " + (left ? plural(left, "new note", "new notes") + "." : "No new notes."); } catch (_) {}
    }
  }
  $("ntReadClose").addEventListener("click", function () {
    $("ntRead").hidden = true; var b = NOTES.openBtn; if (b && document.body.contains(b)) b.focus(); else $("ntListH").focus();
  });
  $("ntReload").addEventListener("click", loadNotes);
  $("ntNew").addEventListener("click", async function () {
    try {
      NOTES.targets = await rpc("admin_note_targets");
      if (!NOTES.targets.length) { say("There is no other administrator to send a note to.", true); return; }
      var box = $("ntTo"); box.textContent = ""; $("ntAll").checked = false;
      NOTES.targets.forEach(function (t) {
        var l = document.createElement("label"); l.className = "opt";
        var c = document.createElement("input"); c.type = "checkbox"; c.value = t.email; c.name = "ntTo";
        l.appendChild(c); l.appendChild(document.createTextNode(t.name + " (" + (t.role === "owner" ? "owner" : "core") + ", " + t.email + ")")); box.appendChild(l);
      });
      $("ntBody").value = ""; $("ntCount").textContent = "0 of 1000 characters";
      $("ntCompose").hidden = false; $("ntComposeH").focus();
    } catch (e) { say(errMsg(e), true); }
  });
  $("ntAll").addEventListener("change", function () {
    var on = this.checked; Array.prototype.forEach.call(document.querySelectorAll('input[name="ntTo"]'), function (c) { c.checked = on; });
  });
  $("ntBody").addEventListener("input", function () { $("ntCount").textContent = this.value.length + " of 1000 characters"; });
  $("ntCancel").addEventListener("click", function () { $("ntCompose").hidden = true; $("ntNew").focus(); });
  $("ntCompose").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var to = Array.prototype.map.call(document.querySelectorAll('input[name="ntTo"]:checked'), function (c) { return c.value; });
    if (!to.length) { say("Choose at least one administrator.", true, function () { return document.querySelector('input[name="ntTo"]'); }); return; }
    if (!$("ntBody").value.trim()) { say("Write the note first.", true, function () { return $("ntBody"); }); return; }
    try {
      var j = await rpc("admin_note_send", { p_to: to, p_body: $("ntBody").value });
      $("ntCompose").hidden = true;
      say("The note was sent to " + plural(j.recipients, "administrator", "administrators") + ".", false, function () { return $("ntNew"); });
    } catch (e) { say(errMsg(e), true, function () { return $("ntBody"); }); }
  });
  $("ntSentBtn").addEventListener("click", async function () {
    try {
      var rows = await rpc("admin_notes_sent"), body = $("ntSentRows"); body.textContent = "";
      if (!rows.length) { var tr0 = document.createElement("tr"), c0 = td("You have not sent any notes."); c0.colSpan = 3; tr0.appendChild(c0); body.appendChild(tr0); }
      rows.forEach(function (n) {
        var tr = document.createElement("tr"); tr.appendChild(td(fmt(n.created_at)));
        tr.appendChild(td(n.to.map(function (t) { return t.name + (t.read ? " (read)" : " (not read yet)"); }).join(", ")));
        tr.appendChild(td(n.body)); body.appendChild(tr);
      });
      $("ntSentWrap").hidden = false; $("ntSentH").focus();
    } catch (e) { say(errMsg(e), true); }
  });
  $("ntClear").addEventListener("click", function () {
    if (!NOTES.inbox.length) { say("There are no notes to clear."); return; }
    window.IHCCDialog.show({
      title: "Clear all " + NOTES.inbox.length + " notes? They will be removed from your list.",
      buttons: [
        { label: "Clear all notes", onClick: async function () { try { await rpc("admin_notes_clear_all"); await loadNotes(); } catch (e) { say(errMsg(e), true); } }, focus: function () { return $("ntNew"); } },
        { label: "Cancel", focus: function () { return $("ntClear"); } }
      ]
    });
  });


  // ---- Send email (owner only) ----
  adm.m.refreshNoteBadge = refreshNoteBadge;
  adm.m.loadNotes = loadNotes;
})();
