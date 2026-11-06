(function () {
  var API = "https://krkrpcnovdobnscknfnw.supabase.co/rest/v1/rpc/public_board_progress";
  var KEY = "sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4";
  var MIN = 12;
  var BOARD_STYLE = {
    "New Zealand Hand Cricket Board": ["\uD83C\uDDF3\uD83C\uDDFF", "#1d4e89"],
    "England Hand Cricket Board": ["\uD83C\uDDEC\uD83C\uDDE7", "#c8102e"],
    "Pakistan Hand Cricket Board": ["\uD83C\uDDF5\uD83C\uDDF0", "#01411c"],
    "Bangladesh Hand Cricket Board": ["\uD83C\uDDE7\uD83C\uDDE9", "#006a4e"],
    "Afghanistan Hand Cricket Board": ["\uD83C\uDDE6\uD83C\uDDEB", "#b01e2d"],
    "Australia Hand Cricket Board": ["\uD83C\uDDE6\uD83C\uDDFA", "#b8860b"],
    "Sri Lanka Hand Cricket Board": ["\uD83C\uDDF1\uD83C\uDDF0", "#8d153a"],
    "South Africa Hand Cricket Board": ["\uD83C\uDDFF\uD83C\uDDE6", "#007749"],
    "UAE Hand Cricket Board": ["\uD83C\uDDE6\uD83C\uDDEA", "#00732f"],
    "USA Hand Cricket Board": ["\uD83C\uDDFA\uD83C\uDDF8", "#3c3b6e"],
    "Germany Hand Cricket Board": ["\uD83C\uDDE9\uD83C\uDDEA", "#c9a100"],
    "Nepal Hand Cricket Board": ["\uD83C\uDDF3\uD83C\uDDF5", "#dc143c"],
    "India Hand Cricket Board": ["\uD83C\uDDEE\uD83C\uDDF3", "#e07b00"]
  };
  var DISPLAY = {
    "New Zealand Hand Cricket Board": "New Zealand Hand Cricket", "England Hand Cricket Board": "England and Wales Hand Cricket Board",
    "Pakistan Hand Cricket Board": "Pakistan Hand Cricket Board", "Bangladesh Hand Cricket Board": "Bangladesh Hand Cricket Board",
    "Afghanistan Hand Cricket Board": "Afghanistan Hand Cricket Board", "Australia Hand Cricket Board": "Hand Cricket Australia",
    "Sri Lanka Hand Cricket Board": "Sri Lanka Hand Cricket", "South Africa Hand Cricket Board": "Hand Cricket South Africa",
    "UAE Hand Cricket Board": "Emirates Hand Cricket Board", "USA Hand Cricket Board": "USA Hand Cricket",
    "Germany Hand Cricket Board": "German Hand Cricket Federation", "Nepal Hand Cricket Board": "Hand Cricket Association of Nepal",
    "India Hand Cricket Board": "Board of Control for Hand Cricket in India"
  };
  var names = Object.keys(BOARD_STYLE);
  var OPEN = [], LAST = null;
  var list = document.getElementById("list");
  function draw(rows) {
    LAST = rows;
    list.textContent = "";
    var done = 0, by = {};
    (rows || []).forEach(function (r) { by[r.board] = r; });
    names.forEach(function (n) {
      var r = by[n], c = r ? r.count : 0, st = r ? r.state : null; if (st === "Completed") done++;
      var li = document.createElement("li"); li.className = "bcard"; li.style.setProperty("--bc", BOARD_STYLE[n][1]);
      var t = document.createElement("strong"); t.textContent = BOARD_STYLE[n][0] + " " + DISPLAY[n];
      if (r && OPEN.indexOf(r.new_code) > -1) { var lk = document.createElement("a"); lk.href = "board.html?board=" + encodeURIComponent(r.new_code); lk.textContent = "Open the board page"; lk.setAttribute("aria-label", "Open the board page of " + DISPLAY[n]); lk.style.fontWeight = "700"; li.__lk = lk; }
      var s = document.createElement("span"); s.textContent = rows ? st : "Not available right now.";
      var bar = document.createElement("div"); bar.className = "bar"; bar.setAttribute("aria-hidden", "true");
      var i = document.createElement("i"); i.style.width = Math.min(100, Math.round(c / MIN * 100)) + "%"; bar.appendChild(i);
      li.appendChild(t); li.appendChild(s); if (li.__lk) li.appendChild(li.__lk); li.appendChild(bar); list.appendChild(li);
    });
    document.getElementById("summ").textContent = rows ? (done + " of " + names.length + " boards have completed their squad list.") : "Numbers are not available right now. Please try again later.";
  }
  draw(null);
  fetch(API, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: "{}" }).then(function (r) { return r.json(); }).then(function (d) { if (Array.isArray(d)) draw(d); }).catch(function () {});
  fetch(API.replace("public_board_progress", "public_open_boards"), { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: "{}" }).then(function (r) { return r.json(); }).then(function (d) { if (Array.isArray(d)) { OPEN = d.map(function (x) { return x.code; }); if (LAST) draw(LAST); } }).catch(function () {});
})();
