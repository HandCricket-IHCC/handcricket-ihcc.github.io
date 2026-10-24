/* IHCC shared toast (flash) notification, version 1.
   Use on any page:  <script src="toast.js"></script>
   Then call:        IHCCToast.show("Player added.");          // normal, polite
                     IHCCToast.show("Gmail is required.", true); // error, assertive
   - A visible box appears at the bottom of the screen and goes away by itself.
   - Screen readers (TalkBack, Jieshuo, NVDA, VoiceOver) announce the text through
     two hidden live regions that exist from page load, which is the most reliable way.
   - The visible box is hidden from screen readers so nothing is read twice.
   - Works without any other file and without any page CSS. */
(function () {
  "use strict";
  if (window.IHCCToast) return;

  var SHOW_MS = 7000, ERR_MS = 10000;
  var polite, assertive, box, boxText, timer = null, flip = false;

  function css() {
    var s = document.createElement("style");
    s.textContent =
      ".ihcc-sr{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}" +
      ".ihcc-toast{position:fixed;left:50%;bottom:max(20px,env(safe-area-inset-bottom));transform:translate(-50%,24px);z-index:99999;" +
      "box-sizing:border-box;max-width:min(92vw,560px);width:max-content;padding:14px 18px;border-radius:14px;" +
      "background:#14213d;color:#fff;border:2px solid #ffffff;font:600 16px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;" +
      "box-shadow:0 8px 28px rgba(0,0,0,.35);opacity:0;visibility:hidden;transition:opacity .2s ease,transform .2s ease,visibility 0s linear .2s;" +
      "overflow-wrap:anywhere;cursor:pointer}" +
      ".ihcc-toast.on{opacity:1;visibility:visible;transform:translate(-50%,0);transition-delay:0s}" +
      ".ihcc-toast.bad{background:#7a0c1e;border-color:#ffd6dc}" +
      "@media (prefers-reduced-motion:reduce){.ihcc-toast{transition:none}}";
    document.head.appendChild(s);
  }

  function build() {
    if (box) return;
    css();
    polite = document.createElement("div");
    polite.className = "ihcc-sr"; polite.setAttribute("role", "status");
    polite.setAttribute("aria-live", "polite"); polite.setAttribute("aria-atomic", "true");
    assertive = document.createElement("div");
    assertive.className = "ihcc-sr"; assertive.setAttribute("role", "alert");
    assertive.setAttribute("aria-live", "assertive"); assertive.setAttribute("aria-atomic", "true");
    box = document.createElement("div");
    box.className = "ihcc-toast"; box.setAttribute("aria-hidden", "true");
    boxText = document.createElement("span");
    box.appendChild(boxText);
    box.addEventListener("click", hide);
    document.body.appendChild(polite);
    document.body.appendChild(assertive);
    document.body.appendChild(box);
  }

  function hide() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (box) box.className = box.className.replace(" on", "");
  }

  function announce(region, text) {
    /* Clear first, then set after a short delay, so the same sentence said twice
       in a row is still announced. A changing invisible suffix guarantees a change. */
    var other = region === polite ? assertive : polite;
    other.textContent = "";
    region.textContent = "";
    flip = !flip;
    setTimeout(function () { region.textContent = text + (flip ? "​" : ""); }, 60);
  }

  function show(text, bad) {
    text = text == null ? "" : String(text).trim();
    if (!text) { hide(); return; }
    if (!document.body) { document.addEventListener("DOMContentLoaded", function () { show(text, bad); }); return; }
    build();
    boxText.textContent = text;
    box.className = "ihcc-toast on" + (bad ? " bad" : "");
    announce(bad ? assertive : polite, text);
    try { if (navigator.vibrate) navigator.vibrate(bad ? [60, 40, 60] : 35); } catch (e) {}
    if (timer) clearTimeout(timer);
    timer = setTimeout(hide, bad ? ERR_MS : SHOW_MS);
  }

  /* Build the hidden live regions as early as possible, so they are already known
     to the screen reader when the first message arrives. */
  if (document.body) build();
  else document.addEventListener("DOMContentLoaded", build);

  window.IHCCToast = { show: show, hide: hide, version: 1 };
})();
