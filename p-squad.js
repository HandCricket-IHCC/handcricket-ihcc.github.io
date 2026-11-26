(function () {
  var API = "https://krkrpcnovdobnscknfnw.supabase.co/rest/v1/rpc/public_board_progress";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  fetch(API, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: "{}" }).then(function (r) { return r.json(); }).then(function (d) {
    if (!Array.isArray(d)) return;
    var total = 0; d.forEach(function (r) { total += r.count || 0; });
    document.getElementById("doneNum").textContent = d.length; document.getElementById("totNum").textContent = total;
    document.getElementById("progressSec").hidden = false;
  }).catch(function () {});
})();
