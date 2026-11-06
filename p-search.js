(function () {
  var API = "https://krkrpcnovdobnscknfnw.supabase.co/rest/v1/rpc/public_player_search";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  var form = document.getElementById("sform"), q = document.getElementById("sq"), stat = document.getElementById("sstat"), list = document.getElementById("sres");
  if (!form) return;
  var busy = false;
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var v = q.value.replace(/^\s+|\s+$/g, "");
    list.textContent = "";
    if (v.length < 3) { stat.textContent = "Please type at least 3 letters."; q.focus(); return; }
    if (busy) return;
    busy = true; stat.textContent = "Searching.";
    fetch(API, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify({ p_q: v }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !Array.isArray(d.results)) throw new Error("bad");
        if (d.short) { stat.textContent = "Please type at least 3 letters."; return; }
        if (!d.results.length) { stat.textContent = "No player found for " + v + "."; return; }
        stat.textContent = d.total + (d.total === 1 ? " player found." : " players found.") + (d.total > d.results.length ? " Showing the first " + d.results.length + ". Type more letters to narrow it down." : "");
        d.results.forEach(function (p) {
          var li = document.createElement("li");
          var n = document.createElement("span"); n.className = "sn"; n.textContent = p.display_name; li.appendChild(n);
          var m = document.createElement("span"); m.className = "sm"; m.textContent = ". Real name: " + (p.real_name || "not given") + ". Board: "; li.appendChild(m);
          var a = document.createElement("a"); a.href = "board.html?board=" + encodeURIComponent(p.code); a.textContent = p.board; li.appendChild(a);
          var pos = document.createElement("span"); pos.className = "sm"; pos.textContent = ". Place in the squad: " + p.position + "."; li.appendChild(pos);
          list.appendChild(li);
        });
      })
      .catch(function () { stat.textContent = "The search is not available right now. Please try again in a moment."; })
      .then(function () { setTimeout(function () { busy = false; }, 800); });
  });
})();
