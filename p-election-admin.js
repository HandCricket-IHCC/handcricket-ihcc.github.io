(function () {
  var sb = supabase.createClient('https://krkrpcnovdobnscknfnw.supabase.co', 'sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4');
  var app = document.getElementById('app');
  var msgEl = document.getElementById('msg');
  var ME = null;
  var SELECTED = null;
  var STATUSES = [['draft', 'Draft'], ['nominations', 'Nominations'], ['voting', 'Voting open'], ['stage1', 'Stage one (names only)'], ['closed', 'Closed (results)']];

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
  function msg(t, err, focus) { msgEl.textContent = t || ''; msgEl.className = err ? 'err' : ''; if (focus) msgEl.focus(); }
  function errText(e) { return ((e && (e.message || e.error_description)) || 'Something went wrong.').replace(/^ERROR:\s*/, ''); }
  async function rpc(name, args) {
    var r = await sb.rpc(name, args || {});
    if (r.error) { msg(errText(r.error), true, true); return null; }
    return { data: r.data };
  }
  function field(labelText, control) {
    var id = 'f' + Math.random().toString(36).slice(2, 8);
    control.setAttribute('id', id);
    return el('div', null, [el('label', { for: id, text: labelText }), control]);
  }
  function select(opts, placeholder) {
    var s = el('select');
    if (placeholder) s.appendChild(el('option', { value: '', text: placeholder }));
    opts.forEach(function (o) { s.appendChild(el('option', { value: o[0], text: o[1] })); });
    return s;
  }
  function vLabel(v) { return v.display_name + ' (' + v.real_name + '), ' + dispBoard(v.board); }
  function isOwner() { return ME && ME.role === 'owner'; }
  function isHead() { return ME && ME.role === 'election_officer'; }
  function toPktInput(iso) {
    if (!iso) return '';
    var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
    var m = {}; parts.forEach(function (x) { m[x.type] = x.value; });
    return m.year + '-' + m.month + '-' + m.day + 'T' + m.hour + ':' + m.minute;
  }
  function fromPktInput(v) { return v ? v + ':00+05:00' : null; }
  function pktShow(iso) { return iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short' }) + ' Pakistan time' : 'not set'; }
  function download(name, text) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function csvCell(x) { x = (x === null || x === undefined) ? '' : String(x); return '"' + x.replace(/"/g, '""') + '"'; }

  function renderSignedOut() {
    app.innerHTML = '';
    msg('Sign in with your admin Google account.');
    app.appendChild(el('button', { type: 'button', text: 'Sign in with Google', onclick: function () {
      sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    } }));
  }

  async function start() {
    var s = await sb.auth.getSession();
    if (!s.data.session) { renderSignedOut(); return; }
    var me = await rpc('admin_me');
    if (!me) return;
    if (!me.data.is_admin) { app.innerHTML = ''; msg('This Gmail is not an IHCC admin.', true, true); app.appendChild(el('button', { type: 'button', class: 'secondary', text: 'Sign out', onclick: signOut })); return; }
    ME = me.data;
    if (['owner', 'core', 'election_officer'].indexOf(ME.role) < 0) { msg('Your admin role cannot manage elections.', true, true); return; }
    await renderHome();
  }
  function signOut() { sb.auth.signOut({ scope: "global" }).then(renderSignedOut); }

  async function renderHome() {
    app.innerHTML = '';
    var list = await rpc('admin_elections_list');
    if (!list) return;
    msg('Signed in as ' + ME.email + ' (' + ME.role + ').');
    app.appendChild(el('button', { type: 'button', class: 'secondary', text: 'Sign out', onclick: signOut }));

    app.appendChild(el('h2', { text: 'Elections' }));
    if (!list.data.length) app.appendChild(el('p', { class: 'muted', text: 'No election yet. Create one below.' }));
    var ul = el('ul', { class: 'plain' });
    list.data.forEach(function (e) {
      var li = el('li');
      li.appendChild(el('button', { type: 'button', class: 'secondary', text: (e.is_test ? 'TEST: ' : 'REAL: ') + e.title + ' (' + e.status + ', ' + e.candidates + ' candidates, ' + e.voted + ' voted)', onclick: function () { SELECTED = e.id; renderElection(); } }));
      ul.appendChild(li);
    });
    app.appendChild(ul);

    app.appendChild(el('h2', { text: 'Create an election' }));
    var title = el('input', { type: 'text', maxlength: '120' });
    app.appendChild(field('Title', title));
    app.appendChild(el('button', { type: 'button', text: 'Create election', onclick: async function () {
      var t = title.value.trim();
      if (t.length < 2) { msg('Please write a title.', true, true); return; }
      if (!window.confirm('You are creating a REAL election. Continue?')) return;
      var r = await rpc('admin_election_create', { p_title: t, p_is_test: false });
      if (!r) return;
      SELECTED = r.data.id;
      renderElection();
    } }));
  }

  async function renderElection() {
    app.innerHTML = '';
    var both = await Promise.all([rpc('admin_election_view', { p_id: SELECTED }), rpc('admin_election_voters', { p_id: SELECTED })]);
    if (!both[0] || !both[1]) return;
    var d = both[0].data, voters = both[1].data, e = d.election;
    var byEmail = {}; voters.forEach(function (v) { byEmail[v.email] = v; });

    app.appendChild(el('button', { type: 'button', class: 'secondary', text: 'Back to all elections', onclick: renderHome }));
    app.appendChild(el('button', { type: 'button', class: 'secondary', text: 'Refresh', onclick: renderElection }));
    app.appendChild(el('h2', { text: (e.is_test ? 'TEST: ' : 'REAL: ') + e.title }));
    if (e.is_test) app.appendChild(el('p', null, [el('span', { class: 'badge', text: 'TEST ELECTION' })]));
    var stEff = d.status_eff || e.status;
    msg('Status: ' + stEff + (stEff !== e.status ? ' (set by the schedule; the saved status is ' + e.status + ')' : '') + (e.paused ? '. VOTING IS PAUSED' : '') + '. Voter list ' + (e.voters_frozen ? 'is frozen (fixed).' : 'is live (follows the squads).') + ' ' + d.voters_total + ' voters, ' + d.voted_count + ' have voted. More than half are needed for a valid election: at least ' + d.turnout_needed + ' voters.');

    // Status
    app.appendChild(el('h3', { text: 'Status' }));
    STATUSES.forEach(function (s) {
      var b = el('button', { type: 'button', class: s[0] === stEff ? '' : 'secondary', text: (s[0] === stEff ? 'Current: ' : 'Set: ') + s[1], onclick: async function () {
        if (s[0] === stEff) return;
        if (!window.confirm('Change status to "' + s[1] + '"?' + (!e.is_test && s[0] === 'voting' ? ' This freezes the voter list for good.' : ''))) return;
        var r = await rpc('admin_election_status', { p_id: SELECTED, p_status: s[0] });
        if (r) renderElection();
      } });
      app.appendChild(b);
    });

    // Schedule
    app.appendChild(el('h3', { text: 'Times (Pakistan time)' }));
    app.appendChild(el('p', { class: 'muted', text: 'When the times are set, nominations close by themselves, and voting opens and closes by itself. A vote outside the times is not accepted. Set the status to Nominations first.' }));
    var tNom = el('input', { type: 'datetime-local', value: toPktInput(e.nominations_close_at) });
    var tStart = el('input', { type: 'datetime-local', value: toPktInput(e.voting_starts_at) });
    var tEnd = el('input', { type: 'datetime-local', value: toPktInput(e.voting_ends_at) });
    app.appendChild(field('Nominations close at', tNom));
    app.appendChild(field('Voting opens at', tStart));
    app.appendChild(field('Voting closes at', tEnd));
    app.appendChild(el('p', { class: 'muted', text: 'Saved now: nominations close ' + pktShow(e.nominations_close_at) + '. Voting opens ' + pktShow(e.voting_starts_at) + '. Voting closes ' + pktShow(e.voting_ends_at) + '.' }));
    app.appendChild(el('button', { type: 'button', text: 'Save the times', onclick: async function () {
      var r = await rpc('admin_election_schedule', { p_id: SELECTED, p_nom_close: fromPktInput(tNom.value), p_vote_start: fromPktInput(tStart.value), p_vote_end: fromPktInput(tEnd.value) });
      if (r) { msg('The times are saved.', false, true); renderElection(); }
    } }));

    // Voter list
    app.appendChild(el('h3', { text: 'Voter list' }));
    var ul = el('ul', { class: 'plain' });
    d.voters_by_board.forEach(function (b) { ul.appendChild(el('li', { text: dispBoard(b.board) + ': ' + b.count + ' voters' })); });
    app.appendChild(ul);
    if (!e.voters_frozen) {
      app.appendChild(el('button', { type: 'button', class: 'secondary', text: 'Freeze the voter list now', onclick: async function () {
        if (!window.confirm('Freeze the voter list as it is right now?')) return;
        var r = await rpc('admin_election_freeze', { p_id: SELECTED, p_frozen: true }); if (r) renderElection();
      } }));
    } else if (e.is_test) {
      app.appendChild(el('button', { type: 'button', class: 'secondary', text: 'Unfreeze (make live again)', onclick: async function () {
        var r = await rpc('admin_election_freeze', { p_id: SELECTED, p_frozen: false }); if (r) renderElection();
      } }));
    }

    // Candidates
    app.appendChild(el('h2', { text: 'Candidates and tally' }));
    d.seats.forEach(function (s) {
      app.appendChild(el('h3', { text: s.seat }));
      if (!s.candidates.length) { app.appendChild(el('p', { class: 'muted', text: 'No candidate yet.' })); return; }
      var cu = el('ul', { class: 'plain' });
      s.candidates.forEach(function (c) {
        var li = el('li');
        var pr = byEmail[c.proposer], se = byEmail[c.seconder];
        li.appendChild(document.createTextNode(c.display_name + ' (' + c.real_name + '), ' + dispBoard(c.board) + '. Votes: ' + c.votes + '. Proposer: ' + (pr ? pr.display_name : c.proposer) + '. Seconder: ' + (se ? se.display_name + ' (' + se.board + ')' : c.seconder) + '. '));
        if ((e.status === 'draft' || e.status === 'nominations') && isOwner()) {
          li.appendChild(el('button', { type: 'button', class: 'danger', text: 'Remove ' + c.display_name, onclick: async function () {
            var why = e.is_test ? 'test' : window.prompt('Reason for removing ' + c.display_name + ' (required, it is written in the log):', '');
            if (why === null) return;
            if (!window.confirm('Remove candidate ' + c.display_name + '?')) return;
            var r = await rpc('admin_candidate_remove', { p_id: c.id, p_reason: why }); if (r) renderElection();
          } }));
        }
        cu.appendChild(li);
      });
      app.appendChild(cu);
    });

    if ((e.status === 'draft' || e.status === 'nominations') && isOwner()) {
      app.appendChild(el('h3', { text: 'Add a candidate directly (Owner only)' }));
      var seatSel = select(d.seats.map(function (s) { return [s.seat, s.seat]; }), 'Choose a seat');
      var candSel = select(voters.map(function (v) { return [v.email, vLabel(v)]; }), 'Choose the candidate');
      var propSel = select([], 'Choose the proposer (same board)');
      var secSel = select([], 'Choose the seconder (another board)');
      candSel.addEventListener('change', function () {
        var c = byEmail[candSel.value];
        propSel.innerHTML = ''; secSel.innerHTML = '';
        propSel.appendChild(el('option', { value: '', text: 'Choose the proposer (same board)' }));
        secSel.appendChild(el('option', { value: '', text: 'Choose the seconder (another board)' }));
        if (!c) return;
        voters.forEach(function (v) {
          if (v.board === c.board && v.email !== c.email) propSel.appendChild(el('option', { value: v.email, text: vLabel(v) }));
          if (v.board !== c.board) secSel.appendChild(el('option', { value: v.email, text: vLabel(v) }));
        });
      });
      app.appendChild(field('Seat', seatSel));
      app.appendChild(field('Candidate', candSel));
      app.appendChild(field('Proposer', propSel));
      app.appendChild(field('Seconder', secSel));
      app.appendChild(el('button', { type: 'button', text: 'Add candidate', onclick: async function () {
        if (!seatSel.value || !candSel.value || !propSel.value || !secSel.value) { msg('Please fill all four fields.', true, true); return; }
        var why2 = e.is_test ? 'test' : window.prompt('Why are you adding this candidate directly (not through the nominations page)? A reason is required and is written in the log:', '');
        if (why2 === null) return;
        var r = await rpc('admin_candidate_save', { p_election: SELECTED, p_seat: seatSel.value, p_candidate: candSel.value, p_proposer: propSel.value, p_seconder: secSel.value, p_reason: why2 });
        if (r) { renderElection(); }
      } }));
    }

    // Nominations in progress
    var noms = await rpc('admin_nominations', { p_id: SELECTED });
    app.appendChild(el('h2', { text: 'Nominations by the Team Directors' }));
    var nl = el('ul', { class: 'plain' });
    ((noms && noms.data) || []).forEach(function (n) {
      var t = n.board + ', ' + n.seat + ': ';
      if (n.revoked_at) t += 'withdrawn or cancelled' + (n.attempt ? ' (attempt ' + n.attempt + ')' : '');
      else t += (n.nominee || '') + '. Nominee ' + (n.nominee_ok ? 'confirmed' : 'waiting') + '. Proposer ' + (n.proposer_ok ? 'confirmed (' + n.proposer + ')' : 'waiting') + '. Seconder ' + (n.seconder || '') + ', ' + (n.seconder_board || '') + ' ' + (n.seconder_ok ? 'confirmed' : 'waiting') + '. ' + (n.locked_at ? 'LOCKED (attempt ' + n.attempt + ')' : 'Not locked.');
      nl.appendChild(el('li', { text: t }));
    });
    if (!nl.children.length) nl.appendChild(el('li', { class: 'muted', text: 'No nomination yet.' }));
    app.appendChild(nl);

    // Head: enter a vote for a member who called
    var canEnter = (stEff === 'voting' || stEff === 'stage1') && (e.is_test ? isOwner() : (isHead() && ME.is_head));
    if (canEnter) {
      app.appendChild(el('h2', { text: 'Enter a vote for a member who called (Head only)' }));
      app.appendChild(el('p', { class: 'muted', text: 'Use this only after you have recorded the call. Write the time of the call and a note. Keep the recording as proof.' }));
      var evSel = select(voters.map(function (v) { return [v.email, vLabel(v)]; }), 'Choose the member');
      var evTime = el('input', { type: 'datetime-local', value: toPktInput(new Date().toISOString()) });
      var evNote = el('input', { type: 'text', maxlength: '300' });
      app.appendChild(field('Member who called', evSel));
      app.appendChild(field('Time of the call (Pakistan time)', evTime));
      app.appendChild(field('Note about the call', evNote));
      var evSeats = [];
      d.seats.forEach(function (s) {
        if (s.candidates.length < 2) return;
        var cs = select(s.candidates.map(function (c) { return [c.id, c.display_name + ', ' + dispBoard(c.board)]; }), 'No vote for this office');
        app.appendChild(field(s.seat, cs));
        evSeats.push({ seat: s.seat, sel: cs });
      });
      app.appendChild(el('button', { type: 'button', text: 'Enter this vote', onclick: async function () {
        var choices = evSeats.filter(function (x) { return x.sel.value; }).map(function (x) { return { seat: x.seat, candidate: x.sel.value }; });
        if (!evSel.value || !choices.length || evNote.value.trim().length < 5) { msg('Choose the member, at least one candidate, and write a note of at least 5 letters.', true, true); return; }
        if (!window.confirm('Enter this vote for ' + byEmail[evSel.value].display_name + '?')) return;
        var r = await rpc('admin_vote_enter', { p_election: SELECTED, p_voter_email: evSel.value, p_choices: choices, p_call_time: fromPktInput(evTime.value), p_note: evNote.value.trim() });
        if (r) { msg('Vote entered for ' + r.data.entered + ' office(s).', false, true); renderElection(); }
      } }));
    }

    // Owner emergency
    if (isOwner() && (stEff === 'voting' || e.paused)) {
      app.appendChild(el('h2', { text: 'Emergency (Owner only)' }));
      app.appendChild(el('p', { class: 'muted', text: 'Use only when the voting service fails or is attacked. Write the reason, then announce it in the Main Group at once. Every use is recorded.' }));
      ['pause', 'resume', 'close'].forEach(function (a) {
        if (a === 'resume' && !e.paused) return;
        if (a !== 'resume' && stEff !== 'voting') return;
        app.appendChild(el('button', { type: 'button', class: 'danger', text: a === 'pause' ? 'Pause voting now' : a === 'resume' ? 'Resume voting' : 'Close voting now', onclick: async function () {
          var why = window.prompt('Reason (required):', ''); if (why === null) return;
          if (why.trim().length < 5) { msg('Please write a reason of at least 5 letters.', true, true); return; }
          if (!window.confirm('Really ' + a + ' the voting?')) return;
          var r = await rpc('admin_emergency', { p_id: SELECTED, p_action: a, p_note: why.trim() });
          if (r) { msg('Done: ' + a + '. Please announce it in the Main Group.', false, true); renderElection(); }
        } }));
      });
    }

    // Log and export
    app.appendChild(el('h2', { text: 'Log of actions' }));
    app.appendChild(el('button', { type: 'button', class: 'secondary', text: 'Show the log', onclick: async function () {
      var r = await rpc('election_log', { p_id: SELECTED }); if (!r) return;
      var box = document.getElementById('logbox'); if (box) box.remove();
      box = el('ul', { class: 'plain', id: 'logbox' });
      r.data.forEach(function (x) {
        box.appendChild(el('li', { text: new Date(x.at).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'medium' }) + ' PKT, ' + x.actor + ', ' + x.action + ' ' + JSON.stringify(x.details || {}) }));
      });
      if (!r.data.length) box.appendChild(el('li', { text: 'No action recorded yet.' }));
      app.appendChild(box);
      msg('The log has ' + r.data.length + ' entries, shown at the bottom of the page.', false, true);
    } }));
    app.appendChild(el('button', { type: 'button', class: 'secondary', text: 'Download the results as a CSV file', onclick: async function () {
      var r = await rpc('election_export', { p_id: SELECTED }); if (!r) return;
      var rows = [['Office', 'Candidate', 'Candidate board', 'Voter', 'Voter board', 'Time of vote', 'Entered by Head after a call', 'Time of call']];
      r.data.forEach(function (x) { rows.push([x.seat, x.candidate, x.candidate_board, x.voter, x.voter_board, x.cast_at, x.entered_by_head ? 'yes' : 'no', x.call_time || '']); });
      download('ihcc_election_results.csv', rows.map(function (row) { return row.map(csvCell).join(','); }).join('\r\n'));
      msg('The file was downloaded: ' + r.data.length + ' votes.', false, true);
    } }));

    // Who voted
    app.appendChild(el('h2', { text: 'Who has voted (' + d.voted_names.length + ')' }));
    var vu = el('ul', { class: 'plain' });
    d.voted_names.forEach(function (x) {
      var li = el('li', { text: x.name + ', ' + dispBoard(x.board) + ' ' });
      if (x.email.indexOf('dummy-') !== 0) {
        li.appendChild(el('button', { type: 'button', class: 'secondary', text: 'Cancel vote of ' + x.name, onclick: async function () {
          var note = window.prompt('Reason for cancelling this vote (required):', '');
          if (note === null) return;
          if (note.trim().length < 5) { msg('Please write a reason of at least 5 letters.', true, true); return; }
          var r = await rpc('admin_vote_cancel', { p_election: SELECTED, p_voter_email: x.email, p_note: note });
          if (r) { msg('Cancelled ' + r.data.cancelled + ' vote(s). The member may vote again if voting is open.', false, true); renderElection(); }
        } }));
      }
      vu.appendChild(li);
    });
    app.appendChild(vu);

    // Objections
    app.appendChild(el('h2', { text: 'Objections (' + d.objections.length + ')' }));
    var ou = el('ul', { class: 'plain' });
    d.objections.forEach(function (o) {
      var li = el('li', { text: o.voter_name + ' (' + o.voter_norm + '): ' + o.note + (o.resolved ? ' [resolved: ' + (o.resolution || '') + ']' : ' ') });
      if (!o.resolved) li.appendChild(el('button', { type: 'button', class: 'secondary', text: 'Mark resolved', onclick: async function () {
        var res = window.prompt('Short note on how it was resolved:', ''); if (res === null) return;
        var r = await rpc('admin_objection_resolve', { p_id: o.id, p_resolution: res }); if (r) renderElection();
      } }));
      ou.appendChild(li);
    });
    app.appendChild(ou);

    // Owner tools
    if (isOwner()) {
      app.appendChild(el('h2', { text: 'Owner tools' }));
      var headIn = el('input', { type: 'text', maxlength: '120' });
      app.appendChild(field('Election Committee Head: Gmail (must be an election_officer admin)', headIn));
      app.appendChild(el('button', { type: 'button', class: 'secondary', text: 'Make this person the Head', onclick: async function () {
        if (!headIn.value.trim()) { msg('Write the Gmail first.', true, true); return; }
        var r = await rpc('admin_set_head', { p_email: headIn.value.trim(), p_head: true }); if (r) msg('Done. This person is now the Head.', false, true);
      } }));
    }
  }

  sb.auth.onAuthStateChange(function () {});
  start();
})();
