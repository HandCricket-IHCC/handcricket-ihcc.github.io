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
      sub.textContent = t.percent + " percent voted. " + (t.ok ? "The turnout is enough. The election is valid." : "The turnout is not enough. The voting is repeated on " + t.repeat_date + ".");
      note.textContent = BASE + " Last checked at " + checked + ", Pakistan time.";
    }
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
