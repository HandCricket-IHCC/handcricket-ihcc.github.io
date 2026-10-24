/* IHCC shared confirmation dialog, version 1.
   Use on any page:  <script src="dialog.js?v=1"></script>
   Then call:
     IHCCDialog.show({
       title: "Player added. An email was sent to the player.",   // read out when the dialog opens
       bad: false,                                                 // true for an error (red border)
       buttons: [
         { label: "Add next player", focus: function () { return document.getElementById("name"); } },
         { label: "Close",           focus: function () { return document.getElementById("row-5"); } }
       ]
     });
   - Focus goes to the title, so TalkBack, Jieshuo and NVDA read it by themselves.
   - Swiping stays inside the dialog (the page behind is not reachable).
   - Escape works like the LAST button (normally Close), including its onClick function.
   - After a button is pressed, the dialog is removed and focus goes to the element returned by that
     button's focus() function. It is looked up AFTER a short delay, so the page can redraw first.
     If it cannot be found, focus goes back to the button that opened the dialog, then to <main>. */
(function () {
  "use strict";
  if (window.IHCCDialog) return;

  var current = null;
  var nativeOk = typeof HTMLDialogElement === "function" && "showModal" in document.createElement("dialog");

  function css() {
    if (document.getElementById("ihcc-dialog-css")) return;
    var s = document.createElement("style");
    s.id = "ihcc-dialog-css";
    s.textContent =
      ".ihcc-dlg{border:3px solid #14213d;border-radius:16px;padding:20px;width:min(92vw,520px);box-sizing:border-box;" +
      "background:Canvas;color:CanvasText;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}" +
      ".ihcc-dlg.bad{border-color:#b00020}" +
      ".ihcc-dlg::backdrop{background:rgba(0,0,0,.55)}" +
      ".ihcc-wrap{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:99999}" +
      ".ihcc-dlg h2{margin:0 0 16px;font-size:20px;line-height:1.35;font-weight:700}" +
      ".ihcc-dlg h2:focus{outline:none}" +
      ".ihcc-dlg button{display:block;width:100%;box-sizing:border-box;min-height:48px;margin:8px 0 0;padding:12px 14px;" +
      "font:inherit;font-weight:600;text-align:center;border-radius:10px;border:2px solid #14213d;background:#14213d;color:#fff;cursor:pointer}" +
      ".ihcc-dlg button.alt{background:Canvas;color:CanvasText}" +
      ".ihcc-dlg button:focus-visible{outline:3px solid #e8c97a;outline-offset:2px}";
    document.head.appendChild(s);
  }

  function resolve(f) {
    try { return typeof f === "function" ? f() : f; } catch (e) { return null; }
  }

  function focusSafe(el) {
    if (!el || !document.body.contains(el)) return false;
    try { el.focus(); } catch (e) { return false; }
    return document.activeElement === el;
  }

  function closeCurrent(focusFn, opener) {
    var c = current; if (!c) return;
    current = null;
    if (c.isNative) { try { c.dlg.close(); } catch (e) {} c.dlg.remove(); }
    else {
      c.wrap.remove();
      var main = document.querySelector("main") || document.body;
      main.removeAttribute("inert"); main.removeAttribute("aria-hidden");
    }
    /* Wait a moment so the browser has finished its own focus handling, and so the page
       can redraw. Then try: the wanted element, the opener, then <main>. */
    setTimeout(function () {
      if (focusSafe(resolve(focusFn))) return;
      if (focusSafe(opener)) return;
      var m = document.querySelector("main");
      if (m) { if (!m.hasAttribute("tabindex")) m.setAttribute("tabindex", "-1"); focusSafe(m); }
    }, 120);
  }

  function show(opts) {
    opts = opts || {};
    css();
    if (!document.body) { document.addEventListener("DOMContentLoaded", function () { show(opts); }); return; }
    var opener = document.activeElement;
    if (current) { /* a new dialog replaces an old one; keep the first opener */
      opener = current.opener;
      var old = current; current = null;
      if (old.isNative) { try { old.dlg.close(); } catch (e) {} old.dlg.remove(); }
      else old.wrap.remove();
    }
    var isNative = nativeOk, dlg, wrap, uid = "ihcc-dt-" + Date.now();
    if (isNative) { dlg = document.createElement("dialog"); }
    else {
      wrap = document.createElement("div"); wrap.className = "ihcc-wrap";
      dlg = document.createElement("div");
      dlg.setAttribute("role", "dialog"); dlg.setAttribute("aria-modal", "true");
      wrap.appendChild(dlg);
    }
    dlg.className = "ihcc-dlg" + (opts.bad ? " bad" : "");
    dlg.setAttribute("aria-labelledby", uid);

    var h = document.createElement("h2");
    h.id = uid; h.tabIndex = -1; h.textContent = opts.title || "";
    dlg.appendChild(h);

    var buttons = (opts.buttons && opts.buttons.length) ? opts.buttons : [{ label: "Close" }];
    var btnEls = [];
    buttons.forEach(function (b, i) {
      var btn = document.createElement("button");
      btn.type = "button"; btn.textContent = b.label;
      if (i > 0) btn.className = "alt";
      btn.addEventListener("click", function () {
        if (b.onClick) { try { b.onClick(); } catch (e) {} }
        closeCurrent(b.focus, opener);
      });
      dlg.appendChild(btn); btnEls.push(btn);
    });
    var last = buttons[buttons.length - 1];
    function escape() {
      if (last.onClick) { try { last.onClick(); } catch (e) {} }
      closeCurrent(last.focus, opener);
    }

    dlg.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); escape(); return; }
      if (!isNative && e.key === "Tab") {
        var items = [h].concat(btnEls), idx = items.indexOf(document.activeElement);
        if (e.shiftKey && idx <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && idx === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    if (isNative) dlg.addEventListener("cancel", function (e) { e.preventDefault(); escape(); });

    current = { dlg: dlg, wrap: wrap, isNative: isNative, opener: opener };
    if (isNative) { document.body.appendChild(dlg); dlg.showModal(); }
    else {
      document.body.appendChild(wrap);
      var main = document.querySelector("main") || document.body;
      main.setAttribute("inert", ""); main.setAttribute("aria-hidden", "true");
    }
    /* let the screen reader see the dialog first, then put focus on the title */
    setTimeout(function () { h.focus(); }, 60);
  }

  window.IHCCDialog = { show: show, version: 1 };
})();
