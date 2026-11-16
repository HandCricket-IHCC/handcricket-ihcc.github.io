(function () {
  var adm = window.__adm;
  var URL = adm.URL, KEY = adm.KEY, BOARDS = adm.BOARDS, sb = adm.sb, $ = adm.$, say = adm.say, sayLive = adm.sayLive, td = adm.td, th = adm.th, rpc = adm.rpc, show = adm.show, setView = adm.setView, fmt = adm.fmt, errMsg = adm.errMsg, btn = adm.btn, callFn = adm.callFn, csvCell = adm.csvCell, downloadCsv = adm.downloadCsv, el = adm.el, plural = adm.plural, isOC = adm.isOC, isOwner = adm.isOwner, guard = adm.guard, loadAll = adm.loadAll, render = adm.render, out = adm.out;
  var DISP = {"New Zealand Hand Cricket Board":"New Zealand Hand Cricket","England Hand Cricket Board":"England and Wales Hand Cricket Board","Australia Hand Cricket Board":"Hand Cricket Australia","Sri Lanka Hand Cricket Board":"Sri Lanka Hand Cricket","South Africa Hand Cricket Board":"Hand Cricket South Africa","UAE Hand Cricket Board":"Emirates Hand Cricket Board","USA Hand Cricket Board":"USA Hand Cricket","Nepal Hand Cricket Board":"Hand Cricket Association of Nepal","India Hand Cricket Board":"Board of Control for Hand Cricket in India"};
  function dispB(n) { return DISP[n] || n; }
  var btReady = false;
  function btInit() {
    if (btReady) return; btReady = true;
    ["btActBoard", "btAnnBoard", "btLogoBoard", "btLdBoard", "btApBoard", "btHiBoard"].forEach(function (id) {
      var sel = $(id);
      if (id === "btActBoard") { var o0 = document.createElement("option"); o0.value = ""; o0.textContent = "All boards"; sel.appendChild(o0); }
      BOARDS.forEach(function (b) { var o = document.createElement("option"); o.value = b; o.textContent = dispB(b); sel.appendChild(o); });
    });
  }
  function fmtT(t) { return new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" }) + " PKT"; }
  var BT_ROLE = { director: "Team Director", deputy: "Deputy Director", media: "Media Manager", owner: "IHCC Owner" };
  function fillList(id, items, empty) {
    var ul = $(id); ul.textContent = "";
    if (!items.length) { var li = document.createElement("li"); li.textContent = empty; ul.appendChild(li); return; }
    items.forEach(function (x) { ul.appendChild(x); });
  }
  function detailText(d) {
    if (!d) return "";
    var o = [];
    if (d.text) o.push("Text: " + d.text);
    if (d.old != null || d.new != null) o.push("Before: " + (d.old || "(empty)") + ". After: " + (d.new || "(empty)"));
    if (d.reason) o.push("Reason: " + d.reason);
    if (d.alt) o.push("Description: " + d.alt);
    return o.length ? " (" + o.join(". ") + ")" : "";
  }
  function btWire() {
    $("btActGo").addEventListener("click", function () { guard(async function () {
      var rows = await rpc("admin_board_activity", { p_board: $("btActBoard").value || null, p_limit: 100 });
      fillList("btActList", rows.map(function (a) { var li = document.createElement("li"); li.textContent = fmtT(a.at) + " · " + dispB(a.board) + " · " + (BT_ROLE[a.role] || a.role) + ": " + a.action + detailText(a.detail); return li; }), "No activity yet.");
      sayLive("Showing " + rows.length + " activity lines.");
    }); });
    $("btAnnGo").addEventListener("click", function () { guard(async function () {
      var board = $("btAnnBoard").value, items = [], off = 0, more = true;
      while (more && off < 30) { var r = await rpc("public_board_announcements", { p_board: board, p_offset: off }); items = items.concat(r.items); off += r.items.length; more = r.more && r.items.length > 0; }
      fillList("btAnnList", items.map(function (a) {
        var li = document.createElement("li"); li.textContent = fmtT(a.at) + " · " + (BT_ROLE[a.role] || a.role) + ": " + a.body + " ";
        li.appendChild(btn("Hide", function () { guard(async function () {
          await rpc("admin_hide_announcement", { p_id: a.id, p_reason: $("btAnnReason").value, p_hide: true });
          say("The announcement is hidden.", false); $("btAnnGo").click();
        }); }, "alt", "Hide this announcement: " + a.body.slice(0, 40)));
        return li;
      }), "No live announcements for this board.");
    }); });
    $("btLogoGo").addEventListener("click", function () { guard(async function () {
      await rpc("admin_remove_logo", { p_board: $("btLogoBoard").value, p_reason: $("btLogoReason").value });
      say("The logo is removed.", false); $("btLogoReason").value = "";
    }); });
    $("btLdGo").addEventListener("click", function () { guard(async function () {
      await rpc("admin_replace_leader", { p_board: $("btLdBoard").value, p_role: $("btLdRole").value, p_email: $("btLdEmail").value });
      say("The leader is replaced.", false); $("btLdEmail").value = "";
    }); });
    $("btSilGo").addEventListener("click", function () { guard(async function () {
      var rows = await rpc("admin_silent_boards", { p_days: parseInt($("btSilDays").value, 10) || 30 });
      fillList("btSilList", rows.map(function (r) { var li = document.createElement("li"); li.textContent = dispB(r.board) + ": " + (r.last_activity ? "last leader activity " + r.days + " days ago (" + fmtT(r.last_activity) + ")" : "no leader activity yet"); return li; }), "No quiet boards.");
    }); });
    function loadAppeals() { return guard(async function () {
      var rows = await rpc("admin_appeal_list");
      fillList("btApList", rows.map(function (a) {
        var li = document.createElement("li"); li.textContent = "#" + a.id + " · " + dispB(a.board) + " · " + a.player + " · " + a.status + ": " + a.body + (a.resolution ? " Decision: " + a.resolution : "") + " ";
        if (a.status === "open") li.appendChild(btn("Close", function () { guard(async function () { await rpc("admin_appeal_resolve", { p_id: a.id, p_resolution: $("btApDecision").value }); say("The appeal is closed.", false); loadAppeals(); }); }, "alt", "Close appeal number " + a.id));
        return li;
      }), "No appeals.");
    }); }
    $("btApGo").addEventListener("click", loadAppeals);
    $("btApAdd").addEventListener("click", function () { guard(async function () {
      await rpc("admin_appeal_add", { p_board: $("btApBoard").value, p_player: $("btApPlayer").value, p_body: $("btApText").value });
      $("btApPlayer").value = ""; $("btApText").value = ""; say("The appeal is recorded.", false); loadAppeals();
    }); });
    $("btHiGo").addEventListener("click", function () { guard(async function () {
      var rows = await rpc("admin_squad_history", { p_board: $("btHiBoard").value });
      fillList("btHiList", rows.map(function (h) { var li = document.createElement("li"); li.textContent = fmtT(h.at) + " · " + (BT_ROLE[h.role] || h.role || "") + " · " + h.kind + " " + JSON.stringify(h.detail || {}); return li; }), "No squad history yet.");
    }); });
    $("btFullBackup").addEventListener("click", function () { guard(async function () {
      var d = await rpc("admin_full_backup");
      var blob = new Blob([JSON.stringify(d)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ihcc-full-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a); say("The full backup file is downloaded.", false);
    }); });
    $("btBackup").addEventListener("click", function () { guard(async function () {
      var d = await rpc("admin_board_backup");
      var blob = new Blob([JSON.stringify(d, null, 1)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ihcc-board-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a); say("The backup file is downloaded.", false);
    }); });
  }
  btWire();
  adm.m.btInit = btInit;
})();
