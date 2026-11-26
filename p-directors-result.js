(function () {
  var main = document.getElementById("dmain"), sub = document.getElementById("dsub"), body = document.getElementById("dbody");
  if (!main) return;
  function mk(tag, text, cls) { var n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }
  function pct(a, b) { return b ? (Math.round(a * 1000 / b) / 10).toString() : "0"; }
  function section(title, id) { var s = mk("section"); var h = mk("h2", title); if (id) h.id = id; s.appendChild(h); body.appendChild(s); return s; }
  function render(d) {
    var bn = function (b) { return d.boards[b] || b; };
    var voted = d.votes.filter(function (v) { return !v.absent; });
    var absent = d.votes.filter(function (v) { return v.absent; });
    main.textContent = d.title + ". " + voted.length + " of " + d.directors + " Directors voted.";
    sub.textContent = "The Board of Directors voted on " + d.date + ", on Google Meet, in a recorded meeting. The voting was open, so how each board voted is published.";
    while (body.firstChild) body.removeChild(body.firstChild);

    var tally = d.seats.map(function (s) {
      var t = {};
      s.candidates.forEach(function (c) { t[c.id] = 0; });
      voted.forEach(function (v) { t[v[s.key]] = (t[v[s.key]] || 0) + 1; });
      var list = s.candidates.slice().sort(function (a, b) { return t[b.id] - t[a.id]; });
      return { s: s, t: t, list: list };
    });

    var s1 = section("Figures");
    var f = mk("ul", null, "plain");
    [
      "Boards with a Director: " + d.directors + ".",
      "Directors who voted: " + voted.length + ".",
      "Directors who did not vote: " + absent.length + (absent.length ? ": " + absent.map(function (a) { return bn(a.board); }).join(", ") + ", who was not present." : "."),
      "A seat is won by the candidate who gets more than half of the votes of all the Directors, that is at least 7 of the " + d.directors + "."
    ].forEach(function (x) { f.appendChild(mk("li", x)); });
    s1.appendChild(f);

    var s2 = section("Elected", "d-elected");
    var w = mk("ul", null, "plain");
    tally.forEach(function (x) {
      var c = x.list[0];
      w.appendChild(mk("li", x.s.seat + ": " + (c.display_name ? c.display_name + ", real name " + c.real_name : c.real_name) + ", " + bn(c.board) + ", " + x.t[c.id] + " of " + voted.length + " votes."));
    });
    s2.appendChild(w);
    s2.appendChild(mk("p", "The term of these three offices is 3 December 2026 to 2 December 2027.", "small"));

    tally.forEach(function (x, i) {
      var sc = section(x.s.seat, "d-seat-" + (i + 1));
      var ul = mk("ul", null, "plain");
      x.list.forEach(function (c, j) {
        var who = (c.display_name ? c.display_name + ", real name " + c.real_name : c.real_name) + ", " + bn(c.board);
        ul.appendChild(mk("li", (j + 1) + ". " + who + ". " + x.t[c.id] + " votes, " + pct(x.t[c.id], voted.length) + " percent of the " + voted.length + " votes cast." + (j === 0 ? " Winner." : "")));
      });
      sc.appendChild(ul);
      sc.appendChild(mk("h3", "How each board voted"));
      var bl = mk("ul", null, "plain");
      d.votes.forEach(function (v) {
        if (v.absent) { bl.appendChild(mk("li", bn(v.board) + ": did not attend, did not vote.")); return; }
        var c = x.s.candidates.filter(function (k) { return k.id === v[x.s.key]; })[0];
        bl.appendChild(mk("li", bn(v.board) + ": " + c.real_name + "."));
      });
      sc.appendChild(bl);
    });
  }
  fetch("directors-result.json", { cache: "no-cache" })
    .then(function (r) { return r.json(); }).then(render)
    .catch(function () { main.textContent = "The result is not available right now."; sub.textContent = "Please try again in a moment."; });
})();
