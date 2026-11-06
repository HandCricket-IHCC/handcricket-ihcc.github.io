(function () {
  var SB_URL = 'https://krkrpcnovdobnscknfnw.supabase.co';
  var SB_KEY = 'sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4';
  var sb = supabase.createClient(SB_URL, SB_KEY);
  var app = document.getElementById('app');
  var msgEl = document.getElementById('msg');
  var MODE = 'main'; // practice (TEST) mode removed on 5 Nov 2026; only the real election exists
  try { localStorage.setItem('ihcc_el_mode', 'main'); } catch (e) {}
  var SESSION = null;
  var CUR = null;

  var DISPLAY_NAMES = {"New Zealand Hand Cricket Board":"New Zealand Hand Cricket","England Hand Cricket Board":"England and Wales Hand Cricket Board","Australia Hand Cricket Board":"Hand Cricket Australia","Sri Lanka Hand Cricket Board":"Sri Lanka Hand Cricket","South Africa Hand Cricket Board":"Hand Cricket South Africa","UAE Hand Cricket Board":"Emirates Hand Cricket Board","USA Hand Cricket Board":"USA Hand Cricket","Germany Hand Cricket Board":"German Hand Cricket Federation","Nepal Hand Cricket Board":"Hand Cricket Association of Nepal","India Hand Cricket Board":"Board of Control for Hand Cricket in India"};
  function dispBoard(n) { return DISPLAY_NAMES[n] || n; }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'onclick') n.addEventListener('click', attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function msg(text, isErr, focus) {
    msgEl.textContent = text || '';
    msgEl.className = isErr ? 'err' : '';
    if (focus) msgEl.focus();
  }
  function clearApp() { app.innerHTML = ''; }
  function isTest() { return MODE === 'test'; }
  function T(s) { return (isTest() ? 'TEST: ' : '') + s; }
  function setMode(m) {
    MODE = m;
    try { localStorage.setItem('ihcc_el_mode', m); } catch (e) {}
  }
  function applyChrome() {
    var t = isTest();
    document.getElementById('testbar').hidden = !t;
    document.getElementById('h1').textContent = t ? 'IHCC Election, TEST' : 'IHCC Election';
    document.title = t ? 'TEST - Election - IHCC' : 'Election - IHCC';
  }
  function errText(e) {
    var m = (e && (e.message || e.error_description)) || 'Something went wrong.';
    return m.replace(/^ERROR:\s*/, '');
  }
  function card(cls) { return el('section', { class: 'card' + (cls ? ' ' + cls : '') }); }

  function renderSignedOut() {
    clearApp();
    document.getElementById('testbar').hidden = true;
    document.getElementById('h1').textContent = 'IHCC Election';
    document.title = 'Election - IHCC';
    msg('Please sign in with the Google account, the Gmail, that is on your board squad list.');
    var c = card();
    c.appendChild(el('h2', { text: 'Sign in' }));
    c.appendChild(el('p', { class: 'muted', text: 'This sign in is for the real election. It opens only when IHCC starts it.' }));
    c.appendChild(el('button', { type: 'button', id: 'btnMain', text: 'Sign in with Google', onclick: function () { signIn('main'); } }));
    app.appendChild(c);
  }

  function signIn(mode) {
    setMode(mode);
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } })
      .then(function (r) { if (r.error) msg(errText(r.error), true, true); });
  }
  function signOut() {
    sb.auth.signOut().then(function () { SESSION = null; renderSignedOut(); });
  }

  function accountFooter() {
    return el('footer', { class: 'acct' }, [
      el('button', { type: 'button', class: 'secondary', text: 'Sign out', onclick: signOut })
    ]);
  }

  async function load(afterMsg) {
    clearApp();
    applyChrome();
    msg('Loading...');
    var r = await sb.rpc('elect_current', { p_test: isTest() });
    if (r.error) { msg(errText(r.error), true, true); return; }
    var d = r.data || {};
    CUR = d;
    if (d.state === 'signed_out') { renderSignedOut(); return; }
    if (d.state === 'test_off') { msg('The TEST election is not available right now.', false, true); app.appendChild(accountFooter()); return; }
    if (d.state === 'none') {
      msg(isTest() ? 'No TEST election is open right now. Please wait for IHCC to tell you.' : 'The election has not started yet. Nothing is open here for now.', false, true);
      app.appendChild(accountFooter());
      return;
    }
    if (d.state === 'not_listed') {
      msg('This Gmail is not on the voting list. Only the first 12 players of each board squad can vote. If you think this is a mistake, please contact IHCC.', true, true);
      app.appendChild(accountFooter());
      return;
    }
    if (d.state !== 'ok') { msg('Unexpected state. Please reload.', true, true); return; }
    await renderElection(d, afterMsg);
  }

  function pktText(iso) { return new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short' }) + ', Pakistan time'; }
  function localText(iso) {
    var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (x) {}
    return new Date(iso).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' }) + (tz ? ', ' + tz : '');
  }
  // Spoken label with commas, so a screen reader pauses between the parts.
  function fmtVoteTime(iso) {
    try {
      var d = new Date(iso);
      var o = { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' };
      var local = d.toLocaleString('en-GB', o);
      var pk = d.toLocaleString('en-GB', Object.assign({ timeZone: 'Asia/Karachi' }, o));
      return local === pk ? local + ' Pakistan time' : local + ' your time, ' + pk + ' Pakistan time';
    } catch (e) { return String(iso); }
  }
  function candLabel(c) {
    var parts = [c.display_name];
    if (c.real_name) parts.push(c.real_name);
    if (c.board) parts.push(dispBoard(c.board));
    return parts.join(', ');
  }

  function identityCard(v) {
    var email = (SESSION && SESSION.user && SESSION.user.email) || '';
    var c = card();
    c.appendChild(el('h2', { text: 'You are voting as' }));
    var dl = el('dl', { class: 'who' });
    [['Display name', v.display_name], ['Real name', v.real_name], ['Board', dispBoard(v.board)], ['Gmail', email]].forEach(function (p) {
      dl.appendChild(el('div', null, [el('dt', { text: p[0] }), el('dd', { text: p[1] || '-' })]));
    });
    c.appendChild(dl);
    return c;
  }

  function scheduleCard(e) {
    if (!(e.voting_starts_at && e.voting_ends_at)) return null;
    var c = card();
    c.appendChild(el('h2', { text: 'Voting time' }));
    c.appendChild(el('p', { text: 'Opens, ' + pktText(e.voting_starts_at) + '.' }));
    c.appendChild(el('p', { text: 'Closes, ' + pktText(e.voting_ends_at) + '.' }));
    c.appendChild(el('p', { class: 'muted small', text: 'In your own time, opens ' + localText(e.voting_starts_at) + ', closes ' + localText(e.voting_ends_at) + '. The page opens and closes by itself.' }));
    if (e.paused) c.appendChild(el('p', { text: 'Voting is paused by IHCC for now. Please wait for the announcement in the Main Group.' }));
    return c;
  }

  async function renderElection(d, afterMsg) {
    var e = d.election, v = d.voter || {};
    var both = await Promise.all([
      sb.rpc('elect_ballot', { p_election: e.id }),
      sb.rpc('elect_results', { p_election: e.id })
    ]);
    if (both[0].error) { msg(errText(both[0].error), true, true); return; }
    var ballot = both[0].data;
    var res = both[1].error ? null : both[1].data;

    app.appendChild(el('h2', { text: (isTest() ? 'TEST, ' : '') + e.title, style: 'margin-top:8px' }));
    app.appendChild(identityCard(v));
    var sc = scheduleCard(e);
    if (sc) app.appendChild(sc);

    var status = e.status;
    if (status === 'nominations') {
      msg(T('Voting has not started yet. These are the candidates so far.'), false, true);
      renderCandidatesOnly(ballot);
    } else if (status === 'voting') {
      var info = res && res.stage === 'voting' ? (res.voted_count + ' of ' + res.total_voters + ' voting members have voted so far. ') : '';
      msg(afterMsg || T('Voting is open. ' + info + 'Your vote is final, once you submit it, it cannot be changed.'), false, true);
      renderBallot(e, ballot);
    } else if (status === 'stage1') {
      msg(T('Voting is closed. This is stage one, only the number of people who voted is shown, not their names and not who they voted for.'), false, true);
      renderStage1(e, res, ballot);
    } else if (status === 'closed') {
      msg(T('The election is closed. These are the results.'), false, true);
      renderClosed(res);
    }
    app.appendChild(accountFooter());
  }

  function renderCandidatesOnly(ballot) {
    (ballot.seats || []).forEach(function (s, idx) {
      var c = card('seat');
      c.appendChild(el('h2', null, [el('span', { class: 'num', 'aria-hidden': 'true', text: String(idx + 1) }), s.seat]));
      if (!s.candidates.length) { c.appendChild(el('p', { class: 'muted', text: 'No candidate yet.' })); app.appendChild(c); return; }
      var ul = el('ul', { class: 'plain' });
      s.candidates.forEach(function (x) { ul.appendChild(el('li', { text: candLabel(x) })); });
      c.appendChild(ul);
      if (s.unopposed) c.appendChild(el('p', { class: 'muted', text: 'Only one candidate so far for this seat.' }));
      app.appendChild(c);
    });
  }

  function renderBallot(e, ballot) {
    var seats = ballot.seats || [];
    var contested = seats.filter(function (s) { return s.candidates.length > 1; });
    var pending = contested.filter(function (s) { return !s.my_vote && !s.my_vote_cancelled; });
    if (contested.length) {
      var done = contested.filter(function (s) { return s.my_vote; });
      var left = pending.length;
      var pc = card();
      pc.appendChild(el('h2', { text: 'My votes' }));
      pc.appendChild(el('p', { id: 'prog', text: 'You have voted for ' + done.length + ' of ' + contested.length + ' seats' + (left ? ', ' + left + ' remaining.' : '. All done, thank you.') }));
      pc.appendChild(el('div', { class: 'progress', 'aria-hidden': 'true' }, [el('span', { style: 'width:' + Math.round(100 * done.length / contested.length) + '%' })]));
      var sum = el('ul', { class: 'plain' });
      contested.forEach(function (s) {
        var mine = s.my_vote ? s.candidates.filter(function (c) { return c.id === s.my_vote; })[0] : null;
        sum.appendChild(el('li', { text: s.seat + ', ' + (mine ? 'you voted for ' + candLabel(mine) + (s.my_vote_at ? ', on ' + fmtVoteTime(s.my_vote_at) : '') : (s.my_vote_cancelled ? 'your vote was cancelled by the Election Committee' : 'not voted yet')) }));
      });
      pc.appendChild(sum);
      app.appendChild(pc);
    }

    var ballotCard = null, reviewCard = null, selects = [];
    if (pending.length) {
      ballotCard = card('ballot');
      ballotCard.appendChild(el('h2', { id: 'ballotH', tabindex: '-1', text: 'Your ballot' }));
      ballotCard.appendChild(el('p', { class: 'muted', text: 'Choose one candidate for every seat below, then press Submit my votes. You will see your choices once more, and you can still go back. Your votes are final and cannot be changed after you confirm.' }));
      pending.forEach(function (s, i) {
        var sid = 'sel' + i;
        var f = el('div', { class: 'field' });
        f.appendChild(el('label', { for: sid, class: 'flabel' }, [el('span', { class: 'num', 'aria-hidden': 'true', text: String(i + 1) }), el('span', { text: s.seat })]));
        var sel = el('select', { id: sid, 'aria-required': 'true' });
        sel.appendChild(el('option', { value: '', text: 'Choose a candidate' }));
        s.candidates.forEach(function (c) { sel.appendChild(el('option', { value: c.id, text: candLabel(c) })); });
        f.appendChild(sel);
        ballotCard.appendChild(f);
        selects.push({ seat: s, sel: sel });
      });
      var reviewBtn = el('button', { type: 'button', id: 'btnReview', text: 'Submit my votes', onclick: function () {
        var missing = selects.filter(function (x) { return !x.sel.value; });
        if (missing.length) {
          msg('Please choose a candidate for every seat. Still missing, ' + missing.map(function (x) { return x.seat.seat; }).join(', ') + '.', true, true);
          missing[0].sel.focus();
          return;
        }
        var list = reviewCard.querySelector('ul');
        list.innerHTML = '';
        selects.forEach(function (x) {
          var c = x.seat.candidates.filter(function (k) { return k.id === x.sel.value; })[0];
          list.appendChild(el('li', null, [el('strong', { text: x.seat.seat }), el('span', { text: ', ' + candLabel(c) })]));
        });
        ballotCard.hidden = true;
        reviewCard.hidden = false;
        msg(T('Please check your choices. Your votes are not submitted until you press Yes, submit my votes.'));
        document.getElementById('reviewH').focus();
      } });
      ballotCard.appendChild(reviewBtn);
      app.appendChild(ballotCard);

      reviewCard = card('ballot');
      reviewCard.hidden = true;
      reviewCard.appendChild(el('h2', { id: 'reviewH', tabindex: '-1', text: 'Check your votes' }));
      reviewCard.appendChild(el('p', { class: 'muted', text: 'These are your choices. If you press Yes, submit my votes, they are final and cannot be changed.' }));
      reviewCard.appendChild(el('ul', { class: 'plain' }));
      var back = el('button', { type: 'button', class: 'secondary', text: 'No, go back and change', onclick: function () {
        reviewCard.hidden = true;
        ballotCard.hidden = false;
        msg(T('You can change your choices. Nothing is submitted yet.'));
        selects[0].sel.focus();
      } });
      var fin = el('button', { type: 'button', id: 'btnFinal', text: T('Yes, submit my votes, final'), onclick: async function () {
        fin.disabled = true; back.disabled = true;
        msg('Submitting...');
        var choices = selects.map(function (x) { return { seat: x.seat.seat, candidate: x.sel.value }; });
        var r = await sb.rpc('elect_cast_ballot', { p_election: e.id, p_choices: choices });
        if (r.error) {
          fin.disabled = false; back.disabled = false;
          msg(errText(r.error) + ' If you are not sure, reload the page to see whether your votes were saved.', true, true);
          return;
        }
        await load(T('All your votes are submitted. Thank you. A vote cannot be changed.'));
      } });
      reviewCard.appendChild(back);
      reviewCard.appendChild(fin);
      app.appendChild(reviewCard);
    }

    seats.forEach(function (s, idx) {
      var already = s.my_vote || s.my_vote_cancelled || s.unopposed || !s.candidates.length;
      if (!already) return;
      var c = card('seat');
      var h = el('h2', null, [el('span', { class: 'num', 'aria-hidden': 'true', text: String(idx + 1) }), s.seat]);
      c.appendChild(h);
      if (!s.candidates.length) {
        c.appendChild(el('p', { class: 'muted', text: 'No candidate for this seat. Nothing to vote on.' }));
      } else if (s.unopposed) {
        c.appendChild(el('p', { text: candLabel(s.candidates[0]) + ', is the only candidate and is elected without a contest. No vote is needed.' }));
      } else if (s.my_vote) {
        var mine = s.candidates.filter(function (x) { return x.id === s.my_vote; })[0];
        c.className = 'card seat done';
        h.appendChild(el('span', { class: 'badge', text: 'Voted' }));
        c.appendChild(el('p', { text: 'Your vote for ' + s.seat + ' is submitted, ' + (mine ? candLabel(mine) : '') + (s.my_vote_at ? ', on ' + fmtVoteTime(s.my_vote_at) : '') + '. A vote cannot be changed.' }));
      } else {
        c.className = 'card seat bad';
        c.appendChild(el('p', { text: 'Your vote for ' + s.seat + ' was cancelled by the Election Committee. Please contact the Committee.' }));
      }
      app.appendChild(c);
    });
    app.appendChild(el('p', { class: 'muted small', text: 'Other voters cannot see who you voted for, and you cannot see who they voted for. Only the totals are published.' }));
  }

  function quorumCard(q) {
    if (!q) return null;
    var c = card();
    c.appendChild(el('h2', { text: 'Turnout' }));
    c.appendChild(el('p', { text: q.voted + ' of ' + q.total + ' voting members voted, which is ' + q.percent + ' percent. More than half, at least ' + q.needed + ' voters, are needed for the election to be valid.' }));
    c.appendChild(el('p', { text: q.ok ? 'The turnout is enough. The election is valid.' : 'The turnout is not enough. The voting will be repeated on Sunday, ' + q.repeat_date + ', from 6:00 AM to 6:00 PM, Pakistan time.' }));
    if (q.boards && q.boards.length) {
      c.appendChild(el('h3', { text: 'Votes by board' }));
      c.appendChild(el('p', { class: 'muted small', text: 'If fewer than ' + q.board_min + ' of the 12 voting members of a board voted, the Director of that board cannot vote in the election of the CEO, CFO and Women\'s Director. Only counts are shown, never names.' }));
      var bl = el('ul', { class: 'plain' });
      q.boards.forEach(function (b) {
        bl.appendChild(el('li', { text: dispBoard(b.board) + ', ' + b.voted + ' of ' + b.total + ' voted. ' + (b.ok ? 'Director can vote.' : 'Director cannot vote in the CEO, CFO and Women\'s Director election.') }));
      });
      c.appendChild(bl);
      var low = q.boards.filter(function (b) { return !b.ok; }).length;
      c.appendChild(el('p', { text: low ? (low + ' board(s) are below ' + q.board_min + '.') : 'All boards reached ' + q.board_min + ' or more.' }));
    }
    return c;
  }

  function renderStage1(e, res, ballot) {
    var mc = card();
    mc.appendChild(el('h2', { text: 'My votes' }));
    var mul = el('ul', { class: 'plain' });
    ((ballot && ballot.seats) || []).filter(function (s) { return s.candidates.length > 1; }).forEach(function (s) {
      var mine = s.my_vote ? s.candidates.filter(function (x) { return x.id === s.my_vote; })[0] : null;
      mul.appendChild(el('li', { text: s.seat + ', ' + (mine ? 'you voted for ' + candLabel(mine) + (s.my_vote_at ? ', on ' + fmtVoteTime(s.my_vote_at) : '') : (s.my_vote_cancelled ? 'your vote was cancelled by the Election Committee' : 'you did not vote')) }));
    });
    mc.appendChild(mul);
    app.appendChild(mc);
    var c = card();
    c.appendChild(el('h2', { text: 'How many have voted' }));
    if (res && res.total_voters != null) {
      c.appendChild(el('p', { text: res.voted_count + ' of ' + res.total_voters + ' voting members have voted. Names are not shown.' }));
    }
    app.appendChild(c);
    var qc = quorumCard(res && res.quorum);
    if (qc) app.appendChild(qc);
    var c2 = card();
    c2.appendChild(el('h2', { text: 'A vote under my name was not mine' }));
    c2.appendChild(el('p', { class: 'muted', text: 'Look at the My votes card above. If it says you voted but you did not vote, tell the Election Committee here within 24 hours.' }));
    var ta = el('textarea', { id: 'objNote', 'aria-label': 'Your message to the Election Committee', maxlength: '500' });
    c2.appendChild(ta);
    c2.appendChild(el('button', { type: 'button', text: T('Send my report'), onclick: async function () {
      var note = ta.value.trim();
      if (!note) { msg('Please write a short message first.', true, true); return; }
      var r = await sb.rpc('elect_object', { p_election: e.id, p_note: note });
      if (r.error) { msg(errText(r.error), true, true); return; }
      ta.value = '';
      msg(T('Your report was sent to the Election Committee.'), false, true);
    } }));
    app.appendChild(c2);
  }

  function renderClosed(res) {
    if (!res || res.stage !== 'closed') { var c0 = card(); c0.appendChild(el('p', { text: 'Results are not available.' })); app.appendChild(c0); return; }
    var qc = quorumCard(res.quorum);
    if (qc) app.appendChild(qc);
    (res.seats || []).forEach(function (s, idx) {
      var c = card('seat');
      c.appendChild(el('h2', null, [el('span', { class: 'num', 'aria-hidden': 'true', text: String(idx + 1) }), s.seat]));
      if (!s.candidates.length) { c.appendChild(el('p', { class: 'muted', text: 'No candidate.' })); app.appendChild(c); return; }
      if (s.unopposed) {
        c.appendChild(el('p', { text: s.candidates[0].display_name + ', ' + dispBoard(s.candidates[0].board) + ', was elected without a contest.' }));
        app.appendChild(c); return;
      }
      var ul = el('ul', { class: 'plain' });
      s.candidates.forEach(function (x, i) {
        var li = el('li');
        li.appendChild(el('strong', { text: (i === 0 ? 'Most votes, ' : '') + x.display_name + ', ' + dispBoard(x.board) + ', ' + x.votes + ' votes' }));
        ul.appendChild(li);
      });
      c.appendChild(ul);
      app.appendChild(c);
    });
  }

  setInterval(async function () {
    if (!SESSION || !CUR || !CUR.election) return;
    try {
      var r = await sb.rpc('elect_current', { p_test: isTest() });
      if (r.error || !r.data || !r.data.election) return;
      var n = r.data.election, o = CUR.election;
      if (n.status !== o.status || !!n.paused !== !!o.paused || n.id !== o.id) { load(); }
    } catch (x) {}
  }, 30000);
  sb.auth.onAuthStateChange(function (ev, sess) { SESSION = sess; });
  sb.auth.getSession().then(function (r) {
    SESSION = r.data && r.data.session;
    if (!SESSION) renderSignedOut(); else load();
  });
})();
