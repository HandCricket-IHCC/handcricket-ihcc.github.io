(function () {
  var API = "https://krkrpcnovdobnscknfnw.supabase.co/rest/v1/rpc/public_core";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  var NAMES = {"New Zealand Hand Cricket Board":"New Zealand Hand Cricket","England Hand Cricket Board":"England and Wales Hand Cricket Board","Australia Hand Cricket Board":"Hand Cricket Australia","Sri Lanka Hand Cricket Board":"Sri Lanka Hand Cricket","South Africa Hand Cricket Board":"Hand Cricket South Africa","UAE Hand Cricket Board":"Emirates Hand Cricket Board","USA Hand Cricket Board":"USA Hand Cricket","Nepal Hand Cricket Board":"Hand Cricket Association of Nepal","India Hand Cricket Board":"Board of Control for Hand Cricket in India"};
  var box = document.getElementById("cseats"), st = document.getElementById("cstatus");
  if (!box) return;
  function mk(tag, text, cls) { var n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }
  var FLAGS = ["Afghanistan","Australia","Bangladesh","England","India","Nepal","New Zealand","Pakistan","South Africa","Sri Lanka","UAE","USA"];
  function flagOf(board) {
    for (var i = 0; i < FLAGS.length; i++) if (String(board).indexOf(FLAGS[i]) === 0) return "flags/" + FLAGS[i].toLowerCase().replace(/ /g, "-") + ".svg";
    return null;
  }
  function initials(name) {
    var w = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!w.length) return "";
    return (w[0].charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : "")).toUpperCase();
  }
  function card(r) {
    var done = r.status === "elected";
    var li = mk("li", null, "ccard" + (done ? "" : " vacant"));
    var head = mk("div", null, "chead");
    var av = mk("span", done ? initials(r.real_name) : String(r.seat_no), "cav"); av.setAttribute("aria-hidden", "true");
    var ht = mk("div");
    ht.appendChild(mk("h3", r.office));
    ht.appendChild(mk("span", done ? "Elected" : "To be elected on 20 November 2026", "cbadge"));
    head.appendChild(av); head.appendChild(ht); li.appendChild(head);
    if (done) {
      li.appendChild(mk("p", r.display_name, "cname"));
      li.appendChild(mk("p", "Real name: " + r.real_name, "creal"));
      var bp = mk("p", null, "cboard"), fl = flagOf(r.board);
      if (fl) { var im = document.createElement("img"); im.src = fl; im.alt = ""; im.width = 30; im.height = 22; bp.appendChild(im); }
      bp.appendChild(document.createTextNode(NAMES[r.board] || r.board));
      li.appendChild(bp);
      li.appendChild(mk("p", "Term: 3 December 2026 to 2 December 2027.", "cmeta"));
    } else {
      li.appendChild(mk("p", "Not filled yet. The Board of Directors elects this office in its meeting of 20 November 2026.", "cmeta"));
    }
    var d = mk("details");
    d.appendChild(mk("summary", "What this office does"));
    d.appendChild(mk("p", r.duties));
    li.appendChild(d);
    return li;
  }
  function render(rows) {
    while (box.firstChild) box.removeChild(box.firstChild);
    var filled = rows.filter(function (r) { return r.status === "elected"; }).length;
    st.textContent = filled + " of " + rows.length + " offices are filled. The other offices are elected by the Board of Directors on 20 November 2026.";
    var groups = [], map = {};
    rows.forEach(function (r) {
      var k = r.elected_by || "";
      if (!map[k]) { map[k] = []; groups.push(k); }
      map[k].push(r);
    });
    groups.forEach(function (k, i) {
      var sec = mk("section", null, "cgroup");
      sec.setAttribute("aria-labelledby", "cg" + i);
      var h = mk("h2", "Elected by " + k); h.id = "cg" + i; sec.appendChild(h);
      var ul = mk("ul", null, "cgrid");
      map[k].forEach(function (r) { ul.appendChild(card(r)); });
      sec.appendChild(ul);
      box.appendChild(sec);
    });
  }
  fetch(API, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: "{}" })
    .then(function (r) { return r.json(); }).then(render)
    .catch(function () { st.textContent = "The offices are not available right now. Please try again in a moment."; });
})();
