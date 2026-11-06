(function () {
  var API = "https://krkrpcnovdobnscknfnw.supabase.co/rest/v1/rpc/public_news";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var OKURL = /^(https:\/\/[^\s()<>"']+|[a-z0-9-]+\.html)$/i;
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    return m ? (parseInt(m[3], 10) + " " + MONTHS[parseInt(m[2], 10) - 1] + " " + m[1]) : "";
  }
  // Plain text. Blank line = new paragraph. [text](address) = a link, only https or a page of this site.
  function addText(p, text) {
    var re = /\[([^\]]{1,120})\]\(([^)\s]{1,300})\)/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) p.appendChild(document.createTextNode(text.slice(last, m.index)));
      if (OKURL.test(m[2])) {
        var a = document.createElement("a"); a.href = m[2]; a.textContent = m[1];
        if (/^https:/i.test(m[2])) a.rel = "noopener";
        p.appendChild(a);
      } else p.appendChild(document.createTextNode(m[0]));
      last = re.lastIndex;
    }
    if (last < text.length) p.appendChild(document.createTextNode(text.slice(last)));
  }
  function body(container, text) {
    String(text || "").split(/\n\s*\n/).forEach(function (para) {
      para = para.replace(/^\s+|\s+$/g, ""); if (!para) return;
      var p = document.createElement("p"); addText(p, para); container.appendChild(p);
    });
  }
  function load(ok) {
    fetch(API, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: "{}" })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (Array.isArray(d) && d.length) ok(d); })
      .catch(function () {});
  }
  window.IHCCNews = { load: load, body: body, fmtDate: fmtDate };
})();
