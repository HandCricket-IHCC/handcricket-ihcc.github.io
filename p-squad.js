(function () {
  var API = "https://krkrpcnovdobnscknfnw.supabase.co/rest/v1/rpc/public_board_progress";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  fetch(API, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: "{}" }).then(function (r) { return r.json(); }).then(function (d) {
    if (!Array.isArray(d)) return;
    var done = 0, dots = document.getElementById("dots"); dots.textContent = "";
    d.forEach(function (r) { var i = document.createElement("i"); if (r.state === "Completed") { done++; i.className = "on"; } dots.appendChild(i); });
    document.getElementById("doneNum").textContent = done; document.getElementById("totNum").textContent = d.length;
    document.getElementById("progressSec").hidden = false;
  }).catch(function () {});
})();
