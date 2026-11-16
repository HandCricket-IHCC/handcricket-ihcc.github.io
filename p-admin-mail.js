(function () {
  var adm = window.__adm;
  var URL = adm.URL, KEY = adm.KEY, BOARDS = adm.BOARDS, sb = adm.sb, $ = adm.$, say = adm.say, sayLive = adm.sayLive, td = adm.td, th = adm.th, rpc = adm.rpc, show = adm.show, setView = adm.setView, fmt = adm.fmt, errMsg = adm.errMsg, btn = adm.btn, callFn = adm.callFn, csvCell = adm.csvCell, downloadCsv = adm.downloadCsv, el = adm.el, plural = adm.plural, isOC = adm.isOC, isOwner = adm.isOwner, guard = adm.guard, loadAll = adm.loadAll, render = adm.render, out = adm.out;
  var DAILY = 240;
  async function callMail(action, data) {
    var ses = await sb.auth.getSession();
    var r = await fetch(URL + "/functions/v1/owner-mail", { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + ses.data.session.access_token, apikey: KEY },
      body: JSON.stringify(Object.assign({ action: action }, data || {})) });
    var j = await r.json().catch(function () { return { ok: false, error: "Unexpected reply." }; });
    if (!j.ok && j.error && action !== "test") throw new Error(j.error);
    return j;
  }
  BOARDS.forEach(function (b, i) {
    var l = document.createElement("label"); l.className = "opt";
    var c = document.createElement("input"); c.type = "checkbox"; c.value = b; c.name = "mBoard";
    l.appendChild(c); l.appendChild(document.createTextNode(b)); $("mBoards").appendChild(l);
  });
  function mAud() { return document.querySelector('input[name="mAud"]:checked').value; }
  function mBoardsSel() { return Array.prototype.map.call(document.querySelectorAll('input[name="mBoard"]:checked'), function (c) { return c.value; }); }
  function mSync() { var a = mAud(); $("mBoardsSet").hidden = a !== "reps"; $("mOneSet").hidden = a !== "one"; }
  Array.prototype.forEach.call(document.querySelectorAll('input[name="mAud"]'), function (r) { r.addEventListener("change", mSync); });
  mSync();
  function mArgs() { var a = mAud(); return { p_audience: a, p_boards: a === "reps" && mBoardsSel().length ? mBoardsSel() : null, p_email: a === "one" ? $("mEmail").value : null, p_name: a === "one" ? $("mName").value : null }; }
  var mSentToday = 0;
  function mBudgetLine() { $("mailBudget").textContent = "Today " + mSentToday + " of " + DAILY + " campaign emails are used. " + Math.max(0, DAILY - mSentToday) + " are left for today."; }

  async function loadMail() {
    try {
      var d = await rpc("admin_mail_list"); mSentToday = d.sent_today || 0; mBudgetLine();
      var body = $("mHist"); body.textContent = "";
      if (!d.campaigns.length) { var tr0 = document.createElement("tr"); var c0 = td("No emails have been created yet."); c0.colSpan = 8; tr0.appendChild(c0); body.appendChild(tr0); }
      d.campaigns.forEach(function (c) {
        var tr = document.createElement("tr");
        tr.appendChild(td(fmt(c.created_at))); tr.appendChild(td(c.detail)); tr.appendChild(td(c.subject));
        tr.appendChild(td(c.total)); tr.appendChild(td(c.sent)); tr.appendChild(td(c.failed));
        tr.appendChild(td(c.status === "cancelled" ? "Stopped" : c.pending));
        var a = document.createElement("td");
        a.appendChild(btn("Details", function () { showMailDetail(c); }, "alt", "Details of the email " + c.subject));
        if (c.failed > 0 && c.status !== "cancelled") a.appendChild(btn("Send failed again", async function () {
          try { say("Sending again."); var j = await callMail("retry", { campaign_id: c.id }); say("Tried again: " + j.sent + " sent, " + j.failed + " failed, " + j.pending + " waiting."); loadMail(); }
          catch (e) { say(errMsg(e), true); }
        }, "alt", "Send the failed emails of " + c.subject + " again"));
        if (c.pending > 0 && c.status !== "cancelled") {
          a.appendChild(btn("Send waiting now", async function () {
            try { var j = await callMail("send", { campaign_id: c.id }); say("Sent " + j.sent + ", failed " + j.failed + ", still waiting " + j.pending + (j.pending && j.budget_left === 0 ? ". Today's limit is used. The rest goes tomorrow automatically." : ".")); loadMail(); }
            catch (e) { say(errMsg(e), true); }
          }, "alt", "Send the waiting emails of " + c.subject + " now"));
          a.appendChild(btn("Stop remaining", async function () {
            try { var j = await rpc("admin_mail_cancel", { p_campaign: c.id }); say("Stopped. " + j.stopped + " waiting " + (j.stopped === 1 ? "email" : "emails") + " will not be sent."); loadMail(); }
            catch (e) { say(errMsg(e), true); }
          }, "danger", "Stop the waiting emails of " + c.subject));
        }
        tr.appendChild(a); body.appendChild(tr);
      });
    } catch (e) { say("Error: " + errMsg(e), true); }
  }
  async function showMailDetail(c) {
    try {
      var rows = await rpc("admin_mail_recipients", { p_campaign: c.id }), b = $("mDetailBody"); b.textContent = "";
      rows.forEach(function (r) { var tr = document.createElement("tr"); tr.appendChild(td(r.email)); tr.appendChild(td(r.board)); tr.appendChild(td(r.status)); tr.appendChild(td(r.error)); b.appendChild(tr); });
      $("mDetail").hidden = false; var h = $("mDetailH"); h.textContent = "People of the email " + c.subject + ": " + rows.length; h.focus();
    } catch (e) { say(errMsg(e), true); }
  }
  function mValid() {
    if ($("mSubject").value.trim().length < 3) { say("Write a subject first.", true); return false; }
    if ($("mBody").value.trim().length < 3) { say("Write the message first.", true); return false; }
    return true;
  }
  var mPending = null;
  $("mReview").addEventListener("click", async function () {
    if (!mValid()) return;
    try {
      var a = await rpc("admin_mail_audience", mArgs()), list = a.recipients || [];
      if (!list.length) { say("No one is in this group yet.", true); return; }
      mPending = { args: mArgs(), count: list.length };
      var d = await rpc("admin_mail_list"); mSentToday = d.sent_today || 0; mBudgetLine();
      var left = Math.max(0, DAILY - mSentToday), now = Math.min(left, list.length);
      var b = $("mReviewBody2"); b.textContent = "";
      list.forEach(function (r) { var tr = document.createElement("tr"); tr.appendChild(td(r.email)); tr.appendChild(td(r.board)); tr.appendChild(td(r.name)); b.appendChild(tr); });
      $("mReviewH").textContent = "Review: this email goes to " + list.length + " " + (list.length === 1 ? "person" : "people");
      $("mReviewInfo").textContent = now >= list.length ? "All of them are sent now." : now + " are sent now and " + (list.length - now) + " tomorrow, because of the daily limit.";
      $("mReviewSubj").textContent = ($("mSubject").value.trim().indexOf("[IHCC]") === 0 ? "" : "[IHCC] ") + $("mSubject").value.trim();
      $("mReviewBody").textContent = $("mBody").value.trim();
      $("mConfirmRow").hidden = list.length <= 20; $("mConfirm").value = "";
      $("mReviewBox").hidden = false; $("mailForm").hidden = true; $("mReviewH").focus();
    } catch (e) { say(errMsg(e), true); }
  });
  $("mBack").addEventListener("click", function () { $("mReviewBox").hidden = true; $("mailForm").hidden = false; $("mailFormH").setAttribute("tabindex", "-1"); $("mailFormH").focus(); });
  $("mTest").addEventListener("click", async function () {
    if (!mValid()) return;
    try { var j = await callMail("test", { subject: $("mSubject").value, body: $("mBody").value });
      say(j.ok ? "A test email was sent to " + j.to + "." : "The test email could not be sent." + (j.error ? " " + j.error : ""), !j.ok); }
    catch (e) { say(errMsg(e), true); }
  });
  $("mSendNow").addEventListener("click", async function () {
    if (!mPending) return;
    if (mPending.count > 20 && $("mConfirm").value.trim() !== "SEND") { say("Type SEND in the box to confirm this big group.", true); return; }
    var sendBtn = $("mSendNow"); sendBtn.disabled = true;
    try {
      var a = mPending.args;
      var made = await rpc("admin_mail_create", { p_audience: a.p_audience, p_boards: a.p_boards, p_email: a.p_email, p_name: a.p_name, p_subject: $("mSubject").value, p_body: $("mBody").value });
      var sent = 0, failed = 0, pending = made.total, guard = 0;
      while (pending > 0 && guard++ < 30) {
        $("mProgress").textContent = "Sending. " + sent + " sent so far.";
        var j = await callMail("send", { campaign_id: made.id });
        sent += j.sent; failed += j.failed; pending = j.pending;
        if (j.sent + j.failed === 0) break;
      }
      $("mProgress").textContent = "";
      $("mReviewBox").hidden = true; $("mailForm").hidden = false; mPending = null;
      var msg = "Sent to " + sent + " " + (sent === 1 ? "person" : "people") + "." + (failed ? " " + failed + " could not be sent." : "") + (pending ? " " + pending + " are waiting and go out automatically." : "");
      if (!failed && !pending) { $("mSubject").value = ""; $("mBody").value = ""; }
      var hh = $("mHistH"); hh.setAttribute("tabindex", "-1");
      say(msg, failed > 0, function () { return hh; });
      loadMail();
    } catch (e) { $("mProgress").textContent = ""; say(errMsg(e), true); }
    finally { sendBtn.disabled = false; }
  });
  $("mReload").addEventListener("click", loadMail);


  // ----- Keyboard shortcuts: Alt + key (Windows and Linux). Uses the physical key, so it works with any keyboard language. -----
  adm.m.loadMail = loadMail;
})();
