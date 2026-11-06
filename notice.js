(function () {
  var API = "https://krkrpcnovdobnscknfnw.supabase.co/rest/v1/rpc/public_notice";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  fetch(API, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: "{}" })
    .then(function (r) { return r.json(); })
    .then(function (n) {
      if (!n || typeof n.message !== "string" || !n.message) return;
      var d = document.createElement("div");
      d.className = "ihcc-notice " + (n.kind === "warning" ? "warning" : "info");
      d.setAttribute("role", "status");
      d.id = "ihccNotice";
      d.textContent = (n.kind === "warning" ? "Important notice: " : "Notice: ") + n.message;
      var skip = document.querySelector("a.skip");
      if (skip && skip.parentNode === document.body) document.body.insertBefore(d, skip.nextSibling);
      else document.body.insertBefore(d, document.body.firstChild);
    })
    .catch(function () {});
})();
