(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function clean(e) { var t = String((e && e.message) || "Something went wrong."); return /^E\|/.test(t) ? t.split("|").slice(2).join("|") : t; }
  function say(text, err) { var b = $("tdMsg"); b.hidden = false; b.className = "msg" + (err ? " err" : ""); b.textContent = text; b.focus(); }
  function when(t) { return new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  var sb = null, board = "", busy = false;
  var KIND = { order_13_30: "Change of place", first12_move: "Move into the first twelve", player_leaves: "Player left", media_removed: "Media Manager removed" };
  var ST = { pending: "Waiting", applied: "Done", rejected: "Rejected", cancelled: "Declined" };

  function fill(sel, rows, from, to) {
    sel.textContent = "";
    rows.forEach(function (p) { if (p.position >= from && p.position <= to) { var o = el("option", "", p.position + ". " + p.display_name); o.value = p.id; sel.appendChild(o); } });
  }
  async function load(sbx, code, me) {
    var box = $("m-td"); sb = sbx; board = code;
    if (!me || (me.role !== "director" && me.role !== "deputy")) { box.hidden = true; return; }
    box.hidden = false;
    var s = await sb.rpc("td_squad_mine", { p_board: board }); var rows = (!s.error && s.data) || [];
    fill($("ordPlayer"), rows, 13, 99); fill($("f12In"), rows, 13, 99); fill($("f12Out"), rows, 1, 12); fill($("lvPlayer"), rows, 1, 99);
    var r = await sb.rpc("td_requests_mine", { p_board: board }); var list = (!r.error && r.data) || [];
    var ul = $("tdList"); ul.textContent = "";
    list.forEach(function (q) {
      var txt = KIND[q.kind] + ": " + ST[q.status] + ". " + when(q.created_at) + (q.player ? ". " + q.player : "") + (q.player2 ? " and " + q.player2 : "") + (q.new_position ? ", new place " + q.new_position : "") + (q.reason ? ". " + q.reason : "") + (q.note ? ". Note: " + q.note : "") + (q.mine ? "." : ". Sent by the other leader.");
      var li = el("li", "", txt);
      if (q.kind === "order_13_30" && q.status === "pending" && !q.mine) {
        [["Confirm", true], ["Decline", false]].forEach(function (a) {
          var b = el("button", "secondary", a[0]); b.type = "button"; b.setAttribute("aria-label", a[0] + " the change for " + q.player);
          b.addEventListener("click", async function () {
            if (busy) return; busy = true; var x = await sb.rpc("td_order_confirm", { p_id: q.id, p_accept: a[1] }); busy = false;
            if (x.error) { say(clean(x.error), true); return; }
            say(a[1] ? "Confirmed. The order is changed." : "Declined."); if (a[1]) { location.reload(); return; } load(sb, board, me);
          });
          li.appendChild(document.createTextNode(" ")); li.appendChild(b);
        });
      }
      ul.appendChild(li);
    });
    if (!list.length) ul.appendChild(el("li", "", "None yet."));
    box._me = me;
  }
  async function send(fn, args, ok, reset) {
    if (busy) return; busy = true; var x = await sb.rpc(fn, args); busy = false;
    if (x.error) { say(clean(x.error), true); return; }
    (reset || []).forEach(function (i) { var e = $(i); if (e.type === "checkbox") e.checked = false; else e.value = ""; });
    say(ok); load(sb, board, $("m-td")._me);
  }
  $("ordSend").addEventListener("click", function () { send("td_order_propose", { p_board: board, p_player: $("ordPlayer").value, p_new_pos: parseInt($("ordPos").value, 10) || 0, p_reason: $("ordWhy").value }, "Sent. The other leader must confirm.", ["ordPos", "ordWhy"]); });
  $("f12Send").addEventListener("click", function () { send("td_first12_request", { p_board: board, p_in: $("f12In").value, p_out: $("f12Out").value, p_reason: $("f12Why").value, p_agree: $("f12Agree").checked }, "Sent to the General Secretary, who decides within twenty-four hours.", ["f12Why", "f12Agree"]); });
  $("lvSend").addEventListener("click", function () { send("td_leave_record", { p_board: board, p_player: $("lvPlayer").value, p_note: $("lvNote").value }, "Sent to the General Secretary.", ["lvNote"]); });
  $("mrSend").addEventListener("click", function () { send("td_media_removed", { p_board: board, p_note: $("mrNote").value }, "Sent to the General Secretary.", ["mrNote"]); });
  window.__tdLoad = load;
})();
