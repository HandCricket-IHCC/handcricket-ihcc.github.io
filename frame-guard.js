/* Clickjacking guard: if this page is shown inside another site's frame, hide it. */
(function () {
  try {
    if (window.top === window.self) return;
  } catch (e) { /* cross-origin access threw: we are framed */ }
  try { document.documentElement.style.display = "none"; } catch (e) {}
  try { window.top.location = window.self.location; } catch (e) {}
})();
