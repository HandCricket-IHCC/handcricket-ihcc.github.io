(function () {
  var API = "https://krkrpcnovdobnscknfnw.supabase.co/rest/v1/rpc/public_core";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  var NAMES = {"New Zealand Hand Cricket Board":"New Zealand Hand Cricket","England Hand Cricket Board":"England and Wales Hand Cricket Board","Australia Hand Cricket Board":"Hand Cricket Australia","Sri Lanka Hand Cricket Board":"Sri Lanka Hand Cricket","South Africa Hand Cricket Board":"Hand Cricket South Africa","UAE Hand Cricket Board":"Emirates Hand Cricket Board","USA Hand Cricket Board":"USA Hand Cricket","Germany Hand Cricket Board":"German Hand Cricket Federation","Nepal Hand Cricket Board":"Hand Cricket Association of Nepal","India Hand Cricket Board":"Board of Control for Hand Cricket in India"};
  var box = document.getElementById("cseats"), st = document.getElementById("cstatus");
  if (!box) return;
  function mk(tag, text, cls) { var n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }
  function render(rows) {
    while (box.firstChild) box.removeChild(box.firstChild);
    var filled = rows.filter(function (r) { return r.status === "elected"; }).length;
    st.textContent = filled + " of " + rows.length + " offices are filled. The other offices are elected by the Board of Directors on 20 November 2026.";
    rows.forEach(function (r) {
      var sec = mk("section");
      sec.appendChild(mk("h2", r.seat_no + ". " + r.office));
      if (r.status === "elected") {
        var ul = mk("ul", null, "plain");
        ul.appendChild(mk("li", "Display name: " + r.display_name + "."));
        ul.appendChild(mk("li", "Real name: " + r.real_name + "."));
        ul.appendChild(mk("li", "Board: " + (NAMES[r.board] || r.board) + "."));
        ul.appendChild(mk("li", "Term: 3 December 2026 to 2 December 2027."));
        sec.appendChild(ul);
      } else {
        sec.appendChild(mk("p", "Not filled yet. This office is elected by the Board of Directors in the meeting of 20 November 2026."));
      }
      sec.appendChild(mk("p", "Elected by: " + r.elected_by + "."));
      sec.appendChild(mk("p", "What this office does: " + r.duties));
      box.appendChild(sec);
    });
  }
  fetch(API, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: "{}" })
    .then(function (r) { return r.json(); }).then(render)
    .catch(function () { st.textContent = "The offices are not available right now. Please try again in a moment."; });
})();
