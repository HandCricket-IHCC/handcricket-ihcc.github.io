(function () {
  var b = document.getElementById("menuBtn"), n = document.getElementById("siteNav");
  if (!b || !n) return;
  function set(o) { n.setAttribute("data-open", o ? "true" : "false"); b.setAttribute("aria-expanded", o ? "true" : "false"); b.textContent = o ? "Close menu" : "Menu"; }
  b.addEventListener("click", function () { set(n.getAttribute("data-open") !== "true"); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && n.getAttribute("data-open") === "true") { set(false); b.focus(); } });
})();
