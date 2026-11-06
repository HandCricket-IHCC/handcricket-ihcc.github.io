/* Keyboard shortcuts: Alt + key (Windows and Linux). Uses the physical key, so it works with any keyboard language. */
(function () {
  if (/Mac|iPhone|iPad/.test(navigator.platform || "")) return;
  function shown(n) { return !!(n.offsetWidth || n.offsetHeight || n.getClientRects().length) && !n.disabled; }
  document.addEventListener("keydown", function (e) {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat) return;
    var m = /^Key([A-Z])$/.exec(e.code || ""); if (!m) return;
    if (document.querySelector("dialog[open], .ihcc-wrap")) return;
    var list = document.querySelectorAll('[data-sk="' + m[1] + '"]');
    for (var i = 0; i < list.length; i++) {
      if (!shown(list[i])) continue;
      e.preventDefault();
      if (/^(SELECT|INPUT|TEXTAREA)$/.test(list[i].tagName) || list[i].hasAttribute("data-sk-focus")) list[i].focus(); else list[i].click();
      return;
    }
  }, true);
})();
