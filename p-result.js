(function () {
  var API = "https://krkrpcnovdobnscknfnw.supabase.co/rest/v1/rpc/public_turnout";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  var BOARDS = {"New Zealand Hand Cricket Board":"New Zealand Hand Cricket","England Hand Cricket Board":"England and Wales Hand Cricket Board","Australia Hand Cricket Board":"Hand Cricket Australia","Sri Lanka Hand Cricket Board":"Sri Lanka Hand Cricket","South Africa Hand Cricket Board":"Hand Cricket South Africa","UAE Hand Cricket Board":"Emirates Hand Cricket Board","USA Hand Cricket Board":"USA Hand Cricket","Germany Hand Cricket Board":"German Hand Cricket Federation","Nepal Hand Cricket Board":"Hand Cricket Association of Nepal","India Hand Cricket Board":"Board of Control for Hand Cricket in India"};
  var main = document.getElementById("rmain"), sub = document.getElementById("rsub"), body = document.getElementById("rbody");
  if (!main) return;
  function mk(tag, text, cls) { var n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }
  function bn(b) { return BOARDS[b] || b; }
  function section(title) { var s = mk("section"); s.appendChild(mk("h2", title)); body.appendChild(s); return s; }
  function render(t) {
    if (!t || t.stage !== "closed" || !t.seats) {
      main.textContent = "The result is not published yet.";
      sub.textContent = t && t.stage === "voting" ? "Voting is open. The result is published after the voting closes." : "";
      return;
    }
    main.textContent = t.title + ". " + t.voted + " of " + t.total + " voting members voted.";
    sub.textContent = "Voting was held on Sunday 15 November 2026, from 6:00 AM to 6:00 PM, Pakistan time.";
    while (body.firstChild) body.removeChild(body.firstChild);

    var s1 = section("Election figures");
    var f = mk("ul", null, "plain");
    [
      "Voting members on the list: " + t.total + ".",
      "Votes needed for the election to be valid: " + t.needed + " or more.",
      "Members who voted: " + t.voted + " (" + t.percent + " percent).",
      "Members who did not vote: " + t.not_voted + " (" + t.not_voted_percent + " percent).",
      "Valid votes: " + t.voted + ". Cancelled votes: 0.",
      t.ok ? "The turnout is enough. The election is valid." : "The turnout is not enough."
    ].forEach(function (x) { f.appendChild(mk("li", x)); });
    s1.appendChild(f);

    var s2 = section("Elected");
    var w = mk("ul", null, "plain");
    t.seats.forEach(function (s) {
      var c = s.candidates.filter(function (x) { return x.winner; })[0];
      if (c) w.appendChild(mk("li", s.seat + ": " + c.display_name + ", real name " + c.real_name + ", " + bn(c.board) + ", " + c.votes + " votes."));
      else if (s.unopposed && s.candidates[0]) w.appendChild(mk("li", s.seat + ", elected without a contest: " + s.candidates[0].display_name + ", real name " + s.candidates[0].real_name + "."));
      else w.appendChild(mk("li", s.seat + ": the votes are equal. The tie rule of Constitution clause 16.15 applies."));
    });
    s2.appendChild(w);

    t.seats.forEach(function (s) {
      var sc = section(s.seat);
      sc.appendChild(mk("p", "Valid votes: " + s.valid_votes + ".", "small"));
      var ul = mk("ul", null, "plain");
      s.candidates.forEach(function (c, i) {
        ul.appendChild(mk("li", (i + 1) + ". " + c.display_name + ", real name " + c.real_name + ", " + bn(c.board) + ". " + c.votes + " votes, " + c.percent_of_all + " percent of all " + t.total + " members, " + c.percent_of_votes + " percent of the votes cast." + (c.winner ? " Winner." : "")));
      });
      sc.appendChild(ul);
    });

    if (t.boards && t.boards.length) {
      var sb = section("Turnout by board");
      sb.appendChild(mk("p", "If fewer than 7 of the 12 voting members of a board voted, the Director of that board cannot vote in the election of the CEO, CFO and Women's Director (Constitution clause 16.17). Only counts are shown.", "small"));
      var bl = mk("ul", null, "plain");
      t.boards.forEach(function (b) {
        bl.appendChild(mk("li", bn(b.board) + ": " + b.voted + " of " + b.total + " voted. " + (b.ok ? "Director can vote." : "Director cannot vote in the CEO, CFO and Women's Director election.")));
      });
      sb.appendChild(bl);
    }
    document.getElementById("rclaimsec").hidden = false;

    var vs = document.getElementById("rvotersec"), vb = document.getElementById("rvbody");
    if (t.voters && t.voters.length) {
      document.getElementById("rvnote").textContent = t.voters.length + " members voted. Only the names are shown. How each member voted is never published.";
      while (vb.firstChild) vb.removeChild(vb.firstChild);
      var groups = {}, order = [];
      t.voters.forEach(function (v) { if (!groups[v.board]) { groups[v.board] = []; order.push(v.board); } groups[v.board].push(v); });
      order.sort(function (a, b) { return bn(a).localeCompare(bn(b)); });
      order.forEach(function (b) {
        vb.appendChild(mk("h3", bn(b) + ", " + groups[b].length + " voted"));
        var ul = mk("ul", null, "plain");
        groups[b].forEach(function (v) { ul.appendChild(mk("li", v.display_name + ", real name " + v.real_name + ", " + bn(b) + ".")); });
        vb.appendChild(ul);
      });
      vs.hidden = false;
    }
  }
  fetch(API, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: "{}" })
    .then(function (r) { return r.json(); }).then(render)
    .catch(function () { main.textContent = "The result is not available right now."; sub.textContent = "Please try again in a moment."; });
})();
