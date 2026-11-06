(function () {
  var API = "https://krkrpcnovdobnscknfnw.supabase.co/rest/v1/rpc/public_board_progress";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4", MIN = 12;
  function draw(rows) {
    var by = {}, done = 0, total = 0;
    rows.forEach(function (r) { by[String(r.board).replace(/ Hand Cricket Board$/, "")] = r; });
    document.querySelectorAll("#bgrid .bcard").forEach(function (li) {
      var r = by[li.getAttribute("data-board")]; if (!r) return;
      var c = r.count || 0; total += c; var full = c >= MIN; if (full) done++;
      li.querySelector(".st").textContent = full ? "Squad list complete: " + c + " players" : (c === 0 ? "Squad list: not started" : "Squad list: " + c + " of " + MIN + " players");
      li.querySelector(".bar i").style.width = Math.min(100, Math.round(c / MIN * 100)) + "%";
      if (r.new_code && !li.querySelector("a")) {
        var nm = li.querySelector("strong").textContent, a = document.createElement("a");
        a.href = "board.html?board=" + encodeURIComponent(r.new_code); a.textContent = "Open the board page"; a.style.fontWeight = "700";
        a.setAttribute("aria-label", "Open the board page of " + nm);
        li.insertBefore(a, li.querySelector(".bar"));
      }
    });
    document.getElementById("doneN").textContent = done;
    document.getElementById("doneL").textContent = done === 1 ? "board has completed its squad list" : "boards have completed their squad list";
    document.getElementById("playN").textContent = total;
    document.getElementById("playL").textContent = total === 1 ? "player registered so far" : "players registered so far";
  }
  fetch(API, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: "{}" })
    .then(function (r) { return r.json(); }).then(function (d) { if (Array.isArray(d)) draw(d); }).catch(function () {});
})();

(function () {
  var grid = document.querySelector(".newsgrid");
  if (!grid || !window.IHCCNews) return;
  IHCCNews.load(function (items) {
    grid.textContent = "";
    items.slice(0, 3).forEach(function (n) {
      var art = document.createElement("article");
      var t = document.createElement("time"); t.setAttribute("datetime", n.published_on); t.textContent = IHCCNews.fmtDate(n.published_on); art.appendChild(t);
      var h = document.createElement("h3"); h.textContent = n.title; art.appendChild(h);
      var first = String(n.body || "").split(/\n\s*\n/)[0].replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
      if (first.length > 200) first = first.slice(0, 197).replace(/\s+\S*$/, "") + "...";
      var p = document.createElement("p"); p.textContent = first; art.appendChild(p);
      grid.appendChild(art);
    });
  });
})();
