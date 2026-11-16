/* Home page "happening now" card in the hero. The events are in events.json (from, to, label, title, text, link, linkText). Times include the time zone. */
(function () {
  var wrap = document.querySelector(".hero.home .wrap");
  if (!wrap) return;
  fetch("events.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (list) {
    var now = Date.now();
    var ev = (list || []).filter(function (e) { return Date.parse(e.from) <= now && now < Date.parse(e.to); })[0];
    if (!ev) return;
    var s = document.createElement("section");
    s.className = "nextcard";
    s.setAttribute("aria-labelledby", "eventH");
    var l = document.createElement("p"); l.className = "nl"; l.textContent = ev.label || "Happening now";
    var h = document.createElement("h2"); h.id = "eventH"; h.textContent = ev.title;
    var p = document.createElement("p"); p.textContent = ev.text;
    s.appendChild(l); s.appendChild(h); s.appendChild(p);
    if (ev.link && /^[a-z0-9\-]+\.html$/.test(ev.link)) {
      var a = document.createElement("a"); a.className = "nbtn"; a.href = ev.link; a.textContent = ev.linkText || "Read more";
      s.appendChild(a);
    }
    wrap.appendChild(s);
    wrap.classList.add("has-next");
  }).catch(function () {});
})();
