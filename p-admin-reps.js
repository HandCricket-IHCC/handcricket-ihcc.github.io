(function () {
  var adm = window.__adm;
  var URL = adm.URL, KEY = adm.KEY, BOARDS = adm.BOARDS, sb = adm.sb, $ = adm.$, say = adm.say, sayLive = adm.sayLive, td = adm.td, th = adm.th, rpc = adm.rpc, show = adm.show, setView = adm.setView, fmt = adm.fmt, errMsg = adm.errMsg, btn = adm.btn, callFn = adm.callFn, csvCell = adm.csvCell, downloadCsv = adm.downloadCsv, el = adm.el, plural = adm.plural, isOC = adm.isOC, isOwner = adm.isOwner, guard = adm.guard, loadAll = adm.loadAll, render = adm.render, out = adm.out;
  async function loadReps() {
    try {
      var rows = await rpc("admin_progress"), body = $("repsBody"); body.textContent = "";
      rows.forEach(function (r) {
        var tr = document.createElement("tr"); tr.appendChild(th(r.board));
        var c = document.createElement("td"), inp = document.createElement("input");
        inp.type = "email"; inp.value = r.rep_email || ""; inp.setAttribute("aria-label", "Representative Gmail for " + r.board); inp.style.minWidth = "220px"; c.appendChild(inp); tr.appendChild(c);
        tr.appendChild(td(r.rep_email ? (r.invite_status ? (r.invite_status === "sent" ? "Sent " + fmt(r.invited_at) : r.invite_status) : "Not sent") : "No email set"));
        var a = document.createElement("td");
        a.appendChild(btn("Save", async function () {
          try { await rpc("admin_rep_set", { p_board: r.board, p_email: inp.value }); say("Saved the representative for " + r.board + ". Now send the invitation."); loadReps(); }
          catch (e) { say(errMsg(e), true); }
        }, "", "Save representative for " + r.board));
        if (r.rep_email) {
          a.appendChild(btn(r.invite_status ? "Resend invitation" : "Send invitation", async function () {
            try { var j = await callFn("admin_invite", { board: r.board }); say(j.ok ? "Invitation sent to " + r.rep_email + "." : "The invitation email could not be sent.", !j.ok); loadReps(); }
            catch (e) { say(errMsg(e), true); }
          }, "alt", (r.invite_status ? "Resend invitation to " : "Send invitation to ") + r.board));
          a.appendChild(btn("Remove", async function () {
            try { await rpc("admin_rep_remove", { p_board: r.board }); say("Removed the representative of " + r.board + "."); loadReps(); }
            catch (e) { say(errMsg(e), true); }
          }, "alt", "Remove representative of " + r.board));
        }
        tr.appendChild(a); body.appendChild(tr);
      });
    } catch (e) { say("Error: " + errMsg(e), true); }
  }

  $("remindBtn").addEventListener("click", async function () {
    try { var j = await callFn("admin_reminder"); say("Reminder emails sent to " + j.sent + " board representative" + (j.sent === 1 ? "" : "s") + " with fewer than 12 players."); } catch (e) { say(errMsg(e), true); }
  });
  $("voterBtn").addEventListener("click", async function () {
    try { var rows = await rpc("admin_voter_list"); if (!rows.length) { say("No completed boards yet, so the voter list is empty.", true); return; }
      downloadCsv(rows, [["board", "Board"], ["number", "Number"], ["display_name", "Display name"], ["real_name", "Real name"], ["email", "Gmail"]], "ihcc-voter-list"); say("The voter list was downloaded (" + rows.length + " voters). This download is recorded in the audit log."); }
    catch (e) { say(errMsg(e), true); }
  });


  // ---- Squads of all boards (owner and core) ----
  adm.m.loadReps = loadReps;
})();
