(function () {
  var API = "https://krkrpcnovdobnscknfnw.supabase.co/rest/v1/rpc/public_turnout";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  var main = document.getElementById("tmain"), sub = document.getElementById("tsub"), note = document.getElementById("tnote"), btn = document.getElementById("tref");
  if (!main) return;
  var BASE = note.textContent, timer = null;
  function pk(d, opts) { try { return new Intl.DateTimeFormat("en-GB", opts).format(d); } catch (e) { return ""; } }
  function when(iso) {
    var d = new Date(iso);
    return pk(d, { timeZone: "Asia/Karachi", day: "numeric", month: "long", year: "numeric" }) + " at " + pk(d, { timeZone: "Asia/Karachi", hour: "numeric", minute: "2-digit", hour12: true });
  }
  var BOARDS = {"New Zealand Hand Cricket Board":"New Zealand Hand Cricket","England Hand Cricket Board":"England and Wales Hand Cricket Board","Australia Hand Cricket Board":"Hand Cricket Australia","Sri Lanka Hand Cricket Board":"Sri Lanka Hand Cricket","South Africa Hand Cricket Board":"Hand Cricket South Africa","UAE Hand Cricket Board":"Emirates Hand Cricket Board","USA Hand Cricket Board":"USA Hand Cricket","Germany Hand Cricket Board":"German Hand Cricket Federation","Nepal Hand Cricket Board":"Hand Cricket Association of Nepal","India Hand Cricket Board":"Board of Control for Hand Cricket in India"};
  function mk(tag, text, cls) { var n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }
  function renderResults(t) {
    var sec = document.getElementById("resultsec"), body = document.getElementById("rbody");
    if (!sec || !body) return;
    if (!t || t.stage !== "closed" || !t.seats) { sec.hidden = true; return; }
    while (body.firstChild) body.removeChild(body.firstChild);
    body.appendChild(mk("p", "Election: " + t.title + ". Voting was held on Sunday 15 November 2026, from 6:00 AM to 6:00 PM, Pakistan time. Voting members on the list: " + t.total + ". Members who voted: " + t.voted + " (" + t.percent + " percent). Members who did not vote: " + t.not_voted + " (" + t.not_voted_percent + " percent). Votes needed for the election to be valid: " + t.needed + " or more. " + (t.ok ? "The turnout is enough and the election is valid." : "The turnout is not enough.")));
    var win = mk("ul", null, "plain");
    t.seats.forEach(function (s) {
      var w = s.candidates.filter(function (c) { return c.winner; })[0];
      if (w) win.appendChild(mk("li", s.seat + ", elected: " + w.display_name + ", real name " + w.real_name + ", " + (BOARDS[w.board] || w.board) + ", with " + w.votes + " votes."));
      else if (s.unopposed && s.candidates[0]) win.appendChild(mk("li", s.seat + ", elected without a contest: " + s.candidates[0].display_name + ", real name " + s.candidates[0].real_name + "."));
      else win.appendChild(mk("li", s.seat + ", the votes are equal. The tie rule of Constitution clause 16.15 applies."));
    });
    body.appendChild(mk("h3", "Elected"));
    body.appendChild(win);
    t.seats.forEach(function (s) {
      body.appendChild(mk("h3", s.seat));
      body.appendChild(mk("p", "Valid votes: " + s.valid_votes + ". Cancelled votes: 0.", "small"));
      var ul = mk("ul", null, "plain");
      s.candidates.forEach(function (c, i) {
        ul.appendChild(mk("li", (i + 1) + ". " + c.display_name + ", real name " + c.real_name + ", " + (BOARDS[c.board] || c.board) + ". " + c.votes + " votes, " + c.percent_of_all + " percent of all " + t.total + " members, " + c.percent_of_votes + " percent of the votes cast." + (c.winner ? " Winner." : "")));
      });
      body.appendChild(ul);
    });
    if (t.boards && t.boards.length) {
      body.appendChild(mk("h3", "Turnout by board"));
      body.appendChild(mk("p", "If fewer than 7 of the 12 voting members of a board voted, the Director of that board cannot vote in the election of the CEO, CFO and Women's Director (Constitution clause 16.17). Only counts are shown, never names.", "small"));
      var bl = mk("ul", null, "plain");
      t.boards.forEach(function (b) {
        bl.appendChild(mk("li", (BOARDS[b.board] || b.board) + ", " + b.voted + " of " + b.total + " voted. " + (b.ok ? "Director can vote." : "Director cannot vote in the CEO, CFO and Women's Director election.")));
      });
      body.appendChild(bl);
    }
    sec.hidden = false;
  }
  function show(t) {
    if (!t) { main.textContent = "There is no real election yet."; sub.textContent = ""; return; }
    var checked = pk(new Date(), { timeZone: "Asia/Karachi", hour: "numeric", minute: "2-digit", hour12: true });
    if (t.stage === "not_started") {
      main.textContent = "Voting has not started yet.";
      sub.textContent = t.voting_starts_at ? "Voting opens on " + when(t.voting_starts_at) + " and closes on " + when(t.voting_ends_at) + ", Pakistan time." : "";
      note.textContent = BASE;
    } else if (t.stage === "voting") {
      main.textContent = t.voted + " of " + t.total + " voting members have voted so far.";
      sub.textContent = t.percent + " percent have voted. More than half of the voters (" + t.needed + " or more) must vote, or the voting is repeated on " + t.repeat_date + ".";
      note.textContent = BASE + " The numbers update by themselves every minute. Last checked at " + checked + ", Pakistan time.";
    } else {
      main.textContent = "Voting is closed. " + t.voted + " of " + t.total + " voting members voted.";
      sub.textContent = t.percent + " percent voted and " + (t.not_voted != null ? t.not_voted + " members (" + t.not_voted_percent + " percent) did not vote. " : "") + "At least " + t.needed + " were needed. " + (t.ok ? "The turnout is enough. The election is valid." : "The turnout is not enough. The voting is repeated on " + t.repeat_date + ".");
      note.textContent = BASE + " Last checked at " + checked + ", Pakistan time.";
    }
    renderResults(t);
    clearInterval(timer);
    if (t.stage === "voting") timer = setInterval(function () { if (!document.hidden) get(); }, 60000);
  }
  function get() {
    fetch(API, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: "{}" })
      .then(function (r) { return r.json(); }).then(function (d) { show(d); })
      .catch(function () { main.textContent = "The turnout is not available right now."; sub.textContent = "Please try again in a moment."; });
  }
  btn.hidden = false;
  btn.addEventListener("click", function () { main.textContent = "Checking."; get(); });
  get();
})();
