(function () {
  var sb = function () { return window.__ihccSb; };
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
  function say(t, err) { var s = $("status"); s.textContent = t || ""; s.hidden = !t; s.className = "msg" + (err ? " err" : ""); }
  function cleanErr(m) { var t = String(m || ""); if (/^E\|/.test(t)) t = t.split("|").slice(2).join("|"); return t; }
  function when(d) { var x = new Date(d); return isNaN(x) ? "" : x.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }
  var busy = false, picked = null, boardsFilled = false;

  async function loadBadges() {
    var r = await sb().rpc("gs_badge_overview"); if (r.error) return;
    var d = r.data || {}, tl = $("badgeTasks"); tl.textContent = "";
    (d.tasks || []).forEach(function (t, n) {
      var c = el("section", null, "card"); c.setAttribute("aria-labelledby", "bt" + n);
      var h = el("h4", t.player + ", " + t.board); h.id = "bt" + n; c.appendChild(h);
      c.appendChild(el("p", "Added " + when(t.created_at) + ". " + (t.overdue ? "OVERDUE since " + when(t.due_at) + "." : "Put the name by " + when(t.due_at) + " (" + t.days_left + " days left).")));
      var b = el("button", "The name is on the account", "alt"); b.type = "button"; b.setAttribute("aria-label", "The name is on the account of " + t.player);
      b.addEventListener("click", async function () {
        var x = await sb().rpc("gs_badge_done", { p_task: t.id, p_note: null });
        if (x.error) { say(cleanErr(x.error.message), true); return; } say("Saved. " + t.player + ": name on the account."); loadBadges();
      });
      c.appendChild(b); tl.appendChild(c);
    });
    if (!(d.tasks || []).length) tl.appendChild(el("p", "No name is waiting."));
    var rl = $("badgeReserve"); rl.textContent = "";
    var ul = el("ul"); (d.reserve || []).forEach(function (x) { ul.appendChild(el("li", x.badge + " (" + x.board + "), in the reserve since " + when(x.since) + ", reason: " + x.reason + ".")); });
    rl.appendChild(ul); if (!(d.reserve || []).length) rl.appendChild(el("p", "The reserve is empty."));
  }

  async function loadShort() {
    var r = await sb().rpc("gs_shortfall_list"); if (r.error) return;
    var rows = r.data || [], box = $("shortList"); box.textContent = "";
    $("shortInfo").textContent = rows.length ? rows.length + " board" + (rows.length === 1 ? " has" : "s have") + " fewer than twelve players." : "Every board has at least twelve players.";
    rows.forEach(function (b, n) {
      var c = el("section", null, "card"); c.setAttribute("aria-labelledby", "sh" + n);
      var h = el("h4", b.board + ": " + b.players + " players, " + b.missing + " missing"); h.id = "sh" + n; c.appendChild(h);
      c.appendChild(el("p", b.last_kind ? "Last notice: " + (b.last_kind === "shortfall_30" ? "thirty days" : "last fourteen days") + ", given " + when(b.last_at) + ", ends " + when(b.deadline_at) + (b.deadline_passed ? " (PASSED)." : ".") : "No notice has been given yet."));
      function btn(label, kind) {
        var x = el("button", label, "alt"); x.type = "button"; x.setAttribute("aria-label", label + ", " + b.board);
        x.addEventListener("click", async function () {
          var z = await sb().rpc("gs_notice_issue", { p_board: b.board, p_kind: kind, p_note: null });
          if (z.error) { say(cleanErr(z.error.message), true); return; } say("Notice given to " + b.board + ". It ends " + when(z.data.deadline_at) + ". Now tell the board in writing."); loadShort();
        });
        c.appendChild(x); c.appendChild(document.createTextNode(" "));
      }
      if (!b.last_kind) btn("Give the thirty-day notice", "shortfall_30");
      else if (b.last_kind === "shortfall_30" && b.deadline_passed) btn("Give the last fourteen days", "shortfall_14");
      box.appendChild(c);
    });
  }

  async function fillBoards() {
    if (boardsFilled) return;
    var b = await sb().rpc("gs_board_names"); if (b.error) return;
    var sel = $("rsBoard"); sel.textContent = "";
    (b.data || []).forEach(function (n) { var o = el("option", n); o.value = n; sel.appendChild(o); });
    boardsFilled = true;
  }

  $("rsAdd").addEventListener("click", async function () {
    var r = await sb().rpc("gs_reserve_add", { p_board: $("rsBoard").value, p_badge: $("rsName").value, p_reason: $("rsWhy").value });
    if (r.error) { say(cleanErr(r.error.message), true); return; } $("rsName").value = ""; say("Put into the reserve."); loadBadges();
  });
  $("pqGo").addEventListener("click", async function () {
    var r = await sb().rpc("gs_player_search", { p_text: $("pqText").value }); var box = $("pqList"); box.textContent = "";
    if (r.error) { say(cleanErr(r.error.message), true); return; }
    var rows = r.data || [];
    if (!rows.length) { box.appendChild(el("p", "Nobody found. Write at least three letters.")); return; }
    rows.forEach(function (p) {
      var b = el("button", p.display_name + " (" + p.real_name + "), " + p.board + ", place " + p.position + ", " + p.email, "alt"); b.type = "button";
      b.addEventListener("click", function () { picked = p; $("chgForm").hidden = false; $("chgWho").textContent = "Selected: " + p.display_name + " (" + p.real_name + "), " + p.board; $("chgWho").setAttribute("tabindex", "-1"); $("chgWho").focus(); });
      var pp = el("p"); pp.appendChild(b); box.appendChild(pp);
    });
  });
  $("chgGo").addEventListener("click", async function () {
    if (!picked || busy) return; busy = true;
    var r = await sb().rpc("gs_change_apply", { p_player: picked.id, p_kind: $("chgKind").value, p_new: $("chgNew").value, p_note: $("chgNote").value, p_identity: $("chgId").checked, p_not_frozen: $("chgFrozen").checked });
    busy = false;
    if (r.error) { say(cleanErr(r.error.message), true); return; }
    say("Changed. Old value: " + r.data.old + ". New value: " + r.data.new + ". It is saved in the log. Tell the player in writing.");
    $("chgNew").value = ""; $("chgNote").value = ""; $("chgId").checked = false; $("chgFrozen").checked = false; $("chgForm").hidden = true; picked = null; $("pqList").textContent = "";
  });

  var KIND = { first12_move: "Move into the first twelve", player_leaves: "A player has left", media_removed: "Media Manager removed" };
  async function loadBoardReqs() {
    var r = await sb().rpc("gs_board_requests"); var box = $("brList"); if (!box) return; box.textContent = "";
    if (r.error) { return; }
    var rows = r.data || [];
    if (!rows.length) { box.appendChild(el("p", "No request is waiting.")); return; }
    rows.forEach(function (q, n) {
      var c = el("section", null, "card"); c.setAttribute("aria-labelledby", "br" + n);
      var h = el("h4", KIND[q.kind] + ", " + q.board); h.id = "br" + n; c.appendChild(h);
      var line = "Sent by the " + (q.by === "director" ? "Team Director" : "Deputy Director") + " on " + when(q.created_at) + ".";
      if (q.due_at) line += (q.overdue ? " OVERDUE since " : " Decide by ") + when(q.due_at) + ".";
      c.appendChild(el("p", line));
      if (q.kind === "first12_move" && q.player && q.player2) c.appendChild(el("p", "Comes in: " + q.player.display_name + " (" + q.player.real_name + "), now place " + q.player.position + ". Goes down: " + q.player2.display_name + " (" + q.player2.real_name + "), now place " + q.player2.position + "."));
      if (q.kind === "player_leaves" && q.player) c.appendChild(el("p", "Player: " + q.player.display_name + " (" + q.player.real_name + "), place " + q.player.position + "."));
      if (q.reason) c.appendChild(el("p", "Note: " + q.reason));
      var lab = el("label", "Reason or note"); lab.setAttribute("for", "brn" + n); c.appendChild(lab);
      var inp = el("input"); inp.type = "text"; inp.id = "brn" + n; inp.maxLength = 300; inp.autocomplete = "off"; c.appendChild(inp);
      var yes = el("button", q.kind === "media_removed" ? "Noted" : "Approve", "alt"); yes.type = "button"; yes.setAttribute("aria-label", "Approve: " + KIND[q.kind] + ", " + q.board);
      var no = el("button", "Reject", "alt"); no.type = "button"; no.setAttribute("aria-label", "Reject: " + KIND[q.kind] + ", " + q.board);
      async function go(ok) {
        if (busy) return; busy = true;
        var x = await sb().rpc("gs_board_request_decide", { p_id: q.id, p_approve: ok, p_note: inp.value });
        busy = false;
        if (x.error) { say(cleanErr(x.error.message), true); return; }
        say(ok ? "Done." : "Rejected."); loadBoardReqs();
      }
      yes.addEventListener("click", function () { go(true); }); no.addEventListener("click", function () { go(false); });
      var p = el("p"); p.appendChild(yes); p.appendChild(document.createTextNode(" ")); p.appendChild(no); c.appendChild(p);
      box.appendChild(c);
    });
  }

  window.__gsToolsLoad = function () { fillBoards(); loadBadges(); loadShort(); loadBoardReqs(); };
})();
