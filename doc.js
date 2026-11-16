(function () {
  var main = document.getElementById("main");
  if (!main) return;
  var stat = document.getElementById("dstat");
  var list = document.getElementById("dres");
  function say(t) { stat.textContent = ""; setTimeout(function () { stat.textContent = t; }, 30); }
  function focusId(id) {
    var el = document.getElementById(id);
    if (!el) return false;
    el.setAttribute("tabindex", "-1");
    el.scrollIntoView();
    el.focus({ preventScroll: true });
    return true;
  }
  window.addEventListener("hashchange", function () {
    var id = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (id) focusId(id);
  });
  /* Build the search index: each clause with its sub-items, and each heading */
  var items = [];
  var nodes = main.querySelectorAll("p.cl, p.sub, h2[id], h3[id]");
  var last = null;
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    if (n.id === "dbx" || n.id === "tocH" || n.id === "toolsH") continue;
    if (n.classList.contains("sub")) { if (last) last.text += " " + n.textContent; continue; }
    var label = n.classList.contains("cl") ? "Clause " + n.querySelector(".num").textContent : n.textContent;
    last = { id: n.id, label: label, text: n.textContent };
    items.push(last);
  }
  function keyOf(num) { return (main.getAttribute("data-doc") === "r" ? "r-" : "c-") + num.replace(/\./g, "-"); }
  var sform = document.getElementById("dsearch");
  sform.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var q = document.getElementById("dq").value.trim().toLowerCase();
    list.textContent = "";
    if (q.length < 2) { say("Please type at least 2 letters."); return; }
    var words = q.split(/\s+/);
    var found = [];
    for (var i = 0; i < items.length; i++) {
      var t = items[i].text.toLowerCase(), ok = true;
      for (var w = 0; w < words.length; w++) if (t.indexOf(words[w]) < 0) { ok = false; break; }
      if (ok) found.push(items[i]);
    }
    if (!found.length) { say("Nothing found for " + q + "."); return; }
    var shown = found.slice(0, 40);
    say(found.length + (found.length === 1 ? " result." : " results.") + (found.length > shown.length ? " Showing the first " + shown.length + ". Type more words to narrow it down." : ""));
    shown.forEach(function (it) {
      var li = document.createElement("li");
      var a = document.createElement("a"); a.href = "#" + it.id; a.textContent = it.label; a.className = "sn"; li.appendChild(a);
      var pos = it.text.toLowerCase().indexOf(words[0]);
      var start = Math.max(0, pos - 50);
      var snip = it.text.slice(start, start + 170).replace(/\s+/g, " ");
      var sp = document.createElement("span"); sp.className = "sm"; sp.textContent = ". " + (start > 0 ? "..." : "") + snip + "..."; li.appendChild(sp);
      list.appendChild(li);
    });
  });
  /* Go to clause number */
  var jform = document.getElementById("djump");
  var dn = document.getElementById("dn");
  function target() {
    var v = dn.value.trim().toUpperCase().replace(/[^0-9A-Z.]/g, "");
    if (!/^\d+\.\d+[A-Z]?$/.test(v)) { say("Please type a clause number like 8.19."); dn.focus(); return null; }
    var id = keyOf(v);
    if (!document.getElementById(id)) { say("There is no clause " + v + " in this document."); dn.focus(); return null; }
    return id;
  }
  jform.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var id = target(); if (!id) return;
    history.pushState(null, "", "#" + id);
    focusId(id);
    say("Moved to clause " + dn.value.trim() + ".");
  });
  function copyText(t, done) {
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { done(true); }, fallback); else fallback();
  }
  function linkFor(id) { return location.origin + location.pathname + "#" + id; }
  document.getElementById("dcopy").addEventListener("click", function () {
    var id = target(); if (!id) return;
    copyText(linkFor(id), function (ok) { say(ok ? "Link to clause " + dn.value.trim() + " copied." : "Could not copy. The link is " + linkFor(id)); });
  });
  /* A Copy link button on every clause */
  var cls = main.querySelectorAll("p.cl");
  for (var c = 0; c < cls.length; c++) {
    (function (p) {
      var num = p.querySelector(".num").textContent;
      var b = document.createElement("button");
      b.type = "button"; b.className = "cpy"; b.textContent = "Copy link";
      b.setAttribute("aria-label", "Copy link to clause " + num);
      b.addEventListener("click", function () {
        copyText(linkFor(p.id), function (ok) { say(ok ? "Link to clause " + num + " copied." : "Could not copy. The link is " + linkFor(p.id)); });
      });
      p.appendChild(document.createTextNode(" "));
      p.appendChild(b);
    })(cls[c]);
  }
  /* Floating shortcuts: Contents and Top, shown after the reader has scrolled down */
  var dock = document.createElement("nav");
  dock.className = "dock"; dock.setAttribute("aria-label", "Page shortcuts"); dock.hidden = true;
  function dbtn(label, fn) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = label;
    b.addEventListener("click", fn); dock.appendChild(b);
  }
  dbtn("Contents", function () { history.pushState(null, "", "#tocH"); focusId("tocH"); });
  dbtn("Top", function () {
    window.scrollTo(0, 0);
    main.setAttribute("tabindex", "-1");
    main.focus({ preventScroll: true });
  });
  document.body.appendChild(dock);
  var ticking = false;
  function showDock() { ticking = false; dock.hidden = window.scrollY < 900; }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(showDock); } }, { passive: true });
  showDock();
  if (location.hash.length > 1) focusId(decodeURIComponent(location.hash.slice(1)));
})();
