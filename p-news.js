(function () {
  var sec = document.querySelector('section[aria-labelledby="n"]');
  if (!sec || !window.IHCCNews) return;
  IHCCNews.load(function (items) {
    sec.querySelectorAll("article.news").forEach(function (a) { a.remove(); });
    items.forEach(function (n) {
      var art = document.createElement("article"); art.className = "news";
      var h = document.createElement("h3"); h.textContent = n.title; art.appendChild(h);
      var t = document.createElement("time"); t.setAttribute("datetime", n.published_on); t.textContent = IHCCNews.fmtDate(n.published_on); art.appendChild(t);
      IHCCNews.body(art, n.body);
      sec.appendChild(art);
    });
    var u = document.querySelector(".updated");
    if (u) u.textContent = "Last updated: " + IHCCNews.fmtDate(items[0].published_on);
  });
})();
