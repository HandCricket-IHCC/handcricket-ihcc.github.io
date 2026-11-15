/* Home page "current event" banner. The events are in events.json (from, to, title, text, link, linkText). Times include the time zone. */
(function () {
  var main = document.getElementById("main");
  if (!main) return;
  fetch("events.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (list) {
    var now = Date.now();
    var ev = (list || []).filter(function (e) { return Date.parse(e.from) <= now && now < Date.parse(e.to); })[0];
    if (!ev) return;
    var s = document.createElement("section");
    s.className = "eventbar";
    s.setAttribute("aria-labelledby", "eventH");
    var h = document.createElement("h2"); h.id = "eventH"; h.textContent = ev.title;
    var p = document.createElement("p"); p.textContent = ev.text;
    s.appendChild(h); s.appendChild(p);
    if (ev.link && /^[a-z0-9\-]+\.html$/.test(ev.link)) {
      var a = document.createElement("a"); a.className = "btnwa"; a.href = ev.link; a.textContent = ev.linkText || "Read more";
      var q = document.createElement("p"); q.appendChild(a); s.appendChild(q);
    }
    main.insertBefore(s, main.firstChild);
  }).catch(function () {});
})();
