(function () {
  var sb = supabase.createClient('https://krkrpcnovdobnscknfnw.supabase.co', 'sb_publishable_ZUJcEJgLgksBWY5Y3NUdKQ_xNIvs6t4');
  var app = document.getElementById('app');
  var msgEl = document.getElementById('msg');
  var MODE = 'main'; // practice (TEST) mode removed on 5 Nov 2026
  try { localStorage.setItem('ihcc_el_mode', 'main'); } catch (e) {}
  var SESSION = null;

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
  function isTest() { return MODE === 'test'; }
  function T(s) { return (isTest() ? 'TEST: ' : '') + s; }
  function setMode(m) { MODE = m; try { localStorage.setItem('ihcc_el_mode', m); } catch (e) {} }
  function chrome() {
    document.getElementById('testbar').hidden = !isTest();
    document.getElementById('h1').textContent = isTest() ? 'IHCC Nominations (TEST)' : 'IHCC Nominations';
    document.title = isTest() ? 'TEST - Nominations - IHCC' : 'Nominations - IHCC';
  }
  function pkt(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short' }) + ' Pakistan time';
  }
  function localTime(iso) {
    if (!iso) return '';
    var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
    return new Date(iso).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' }) + (tz ? ' (' + tz + ')' : '');
  }
  function field(labelText, control) {
    var id = 'f' + Math.random().toString(36).slice(2, 8);
    control.setAttribute('id', id);
    return el('div', null, [el('label', { for: id, text: labelText }), control]);
  }
  async function call(fn, args) {
    var r = await sb.rpc(fn, args || {});
    if (r.error) { msg(errText(r.error), true, true); return null; }
    return { data: r.data };
  }

  function renderSignedOut() {
    app.innerHTML = '';
    chrome();
    document.getElementById('testbar').hidden = true;
    document.getElementById('h1').textContent = 'IHCC Nominations';
    msg('Please sign in with your Gmail. Team Directors, nominees, proposers and seconders use this page.');
    app.appendChild(el('button', { type: 'button', text: 'Sign in with Google', onclick: function () { signIn('main'); } }));
  }
  function signIn(mode) {
    setMode(mode);
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } })
      .then(function (r) { if (r.error) msg(errText(r.error), true, true); });
  }
  function signOut() { sb.auth.signOut().then(function () { SESSION = null; renderSignedOut(); }); }

  function topBar() {
    var email = (SESSION && SESSION.user && SESSION.user.email) || '';
    return el('div', null, [
      el('p', { class: 'muted', text: 'Signed in as ' + email + '.' }),
      el('button', { type: 'button', class: 'secondary', text: 'Refresh', onclick: function () { load(); } }),
      el('button', { type: 'button', class: 'secondary', text: 'Sign out', onclick: signOut })
    ]);
  }

  async function load() {
    app.innerHTML = '';
    chrome();
    app.appendChild(topBar());
    msg('Loading...');
    var r = await sb.rpc('nom_current', { p_test: isTest() });
    if (r.error) { msg(errText(r.error), true, true); return; }
    var d = r.data || {};
    if (d.state === 'signed_out') { renderSignedOut(); return; }
    if (d.state === 'test_off') { msg('The TEST mode is not available right now.', false, true); return; }
    if (d.state === 'none') { msg(isTest() ? 'No TEST election with nominations is open right now.' : 'Nominations have not started yet. Nothing is open here for now.', false, true); return; }
    if (d.state === 'not_listed') { msg('This Gmail is not on the voting list and is not a Team Director. Only Voting Members and Team Directors can use this page.', true, true); return; }
    render(d);
  }

  function stepLine(label, done, who) {
    return el('li', { text: (done ? 'Done: ' : 'Waiting: ') + label + (who ? ' (' + who + ')' : '') });
  }

  function render(d) {
    var e = d.election;
    app.appendChild(el('h2', { text: (isTest() ? 'TEST: ' : '') + e.title }));
    var open = e.open;
    var info = open ? 'Nominations are open.' : (e.status === 'nominations' ? 'Nominations are closed.' : 'Nominations have ended. This page is now read only.');
    if (e.nominations_close_at) {
      info += ' ' + (open ? 'They close' : 'They closed') + ' on ' + pkt(e.nominations_close_at) + '. In your time: ' + localTime(e.nominations_close_at) + '.';
    }
    msg(T(info), false, true);

    // my confirmations
    app.appendChild(el('h2', { text: 'Your confirmations' }));
    if (!d.tasks.length) {
      app.appendChild(el('p', { class: 'muted', text: 'Nothing is waiting for your confirmation.' }));
    } else {
      var tu = el('ul', { class: 'plain' });
      d.tasks.forEach(function (t) {
        var text = t.role === 'nominee' ? 'You are named as the nominee for ' + t.seat + ' of the ' + dispBoard(t.board) + '.'
                 : t.role === 'proposer' ? 'Proposer needed: ' + t.nominee + ' of the ' + dispBoard(t.board) + ' is nominated for ' + t.seat + '. Any other Voting Member of the same board may propose.'
                 : 'You are named as the seconder of ' + t.nominee + ' of the ' + dispBoard(t.board) + ' for ' + t.seat + '.';
        var li = el('li', { text: text + ' ' });
        if (open) li.appendChild(el('button', { type: 'button', text: T('Confirm as ' + t.role), onclick: async function () {
          if (!window.confirm(T('Confirm as ' + t.role + ' for ' + t.nominee + ', ' + t.seat + '?'))) return;
          var r = await call('nom_confirm', { p_nomination: t.id, p_role: t.role });
          if (r) { await load(); msg(T('Your confirmation is saved.'), false, true); }
        } }));
        tu.appendChild(li);
      });
      app.appendChild(tu);
    }

    // director section
    if (d.director_board) {
      app.appendChild(el('h2', { text: 'Your board: ' + d.director_board }));
      var active = null, used = 0;
      d.mine.forEach(function (n) { if (n.locked_at) used++; if (!n.revoked_at) active = n; });
      app.appendChild(el('p', { class: 'muted', text: 'Each board has two attempts in all. Attempts used so far: ' + used + ' of 2.' }));
      if (active) {
        var box = el('div', { class: 'box' });
        box.appendChild(el('h3', { text: 'Nomination for ' + active.seat + (active.attempt ? ' (attempt ' + active.attempt + ')' : '') }));
        var ul = el('ul', { class: 'plain' });
        ul.appendChild(el('li', { text: 'Nominee: ' + active.nominee + (active.nominee_real ? ' (' + active.nominee_real + ')' : '') }));
        ul.appendChild(stepLine('The nominee confirms', active.nominee_ok, active.nominee));
        ul.appendChild(stepLine('A proposer of your board confirms', active.proposer_ok, active.proposer || ''));
        ul.appendChild(stepLine('The seconder confirms', active.seconder_ok, active.seconder + ', ' + active.seconder_board));
        ul.appendChild(el('li', { text: active.locked_at ? 'Done: locked on ' + pkt(active.locked_at) : 'Waiting: you lock the nomination' }));
        box.appendChild(ul);
        if (!active.locked_at && open) {
          if (active.nominee_ok && active.proposer_ok && active.seconder_ok) {
            box.appendChild(el('button', { type: 'button', text: T('Lock this nomination'), onclick: async function () {
              if (!window.confirm(T('Lock the nomination of ' + active.nominee + ' for ' + active.seat + '? You can withdraw it only within 24 hours.'))) return;
              var r = await call('nom_lock', { p_nomination: active.id });
              if (r) { await load(); msg(T('The nomination is locked.'), false, true); }
            } }));
          }
          box.appendChild(el('button', { type: 'button', class: 'secondary', text: T('Cancel this nomination (not yet locked)'), onclick: async function () {
            if (!window.confirm(T('Cancel this nomination? It has not used an attempt.'))) return;
            var r = await call('nom_cancel', { p_nomination: active.id });
            if (r) { await load(); msg(T('The nomination is cancelled.'), false, true); }
          } }));
        }
        if (active.locked_at) {
          var until = new Date(new Date(active.locked_at).getTime() + 24 * 3600 * 1000);
          if (active.attempt >= 2) {
            box.appendChild(el('p', { class: 'muted', text: 'This was your second attempt. It is final and cannot be withdrawn.' }));
          } else if (new Date() < until && e.status === 'nominations') {
            box.appendChild(el('p', { class: 'muted', text: 'You can withdraw it until ' + pkt(until.toISOString()) + '. After that it is final.' }));
            box.appendChild(el('button', { type: 'button', class: 'danger', text: T('Withdraw this nomination'), onclick: async function () {
              if (!window.confirm(T('Withdraw the nomination? Everything about it is removed and you will have one more attempt.'))) return;
              var r = await call('nom_revoke', { p_nomination: active.id });
              if (r) { await load(); msg(T('The nomination is withdrawn. You have one more attempt if nominations are still open.'), false, true); }
            } }));
          } else {
            box.appendChild(el('p', { class: 'muted', text: 'The 24 hours for withdrawing have ended. This nomination is final.' }));
          }
        }
        app.appendChild(box);
      } else if (used < 2 && open) {
        app.appendChild(el('h3', { text: 'Start a nomination' }));
        var seatSel = el('select'); seatSel.appendChild(el('option', { value: '', text: 'Choose the office' }));
        d.seats.forEach(function (s) { seatSel.appendChild(el('option', { value: s, text: s })); });
        var nomSel = el('select'); nomSel.appendChild(el('option', { value: '', text: 'Choose the nominee (a Voting Member of your board)' }));
        var secSel = el('select'); secSel.appendChild(el('option', { value: '', text: 'Choose the seconder (a Voting Member of another board)' }));
        var groups = {};
        d.voters.forEach(function (v) {
          var label = v.display_name + (v.real_name ? ' (' + v.real_name + ')' : '');
          if (v.board === d.director_board) nomSel.appendChild(el('option', { value: v.email, text: label }));
          else {
            if (!groups[v.board]) { groups[v.board] = el('optgroup', { label: dispBoard(v.board) }); secSel.appendChild(groups[v.board]); }
            groups[v.board].appendChild(el('option', { value: v.email, text: label + ', ' + dispBoard(v.board) }));
          }
        });
        app.appendChild(field('Office', seatSel));
        app.appendChild(field('Nominee', nomSel));
        app.appendChild(field('Seconder', secSel));
        app.appendChild(el('p', { class: 'muted', text: 'After you start, the nominee confirms first, then a proposer of your board, then the seconder you named. IHCC sends no email, so please tell them yourself.' }));
        app.appendChild(el('button', { type: 'button', text: T('Start nomination'), onclick: async function () {
          if (!seatSel.value || !nomSel.value || !secSel.value) { msg('Please choose the office, the nominee and the seconder.', true, true); return; }
          if (!window.confirm(T('Start this nomination?'))) return;
          var r = await call('nom_start', { p_election: e.id, p_seat: seatSel.value, p_nominee: nomSel.value, p_seconder: secSel.value });
          if (r) { await load(); msg(T('The nomination is started. Now the nominee must confirm.'), false, true); }
        } }));
      } else if (used >= 2) {
        app.appendChild(el('p', { text: 'Your board has used both attempts.' }));
      }
    }

    // locked list
    app.appendChild(el('h2', { text: 'Locked nominations' }));
    if (!d.locked.length) app.appendChild(el('p', { class: 'muted', text: 'No nomination is locked yet.' }));
    var lu = el('ul', { class: 'plain' });
    d.locked.forEach(function (n) {
      lu.appendChild(el('li', { text: n.seat + ': ' + n.nominee + (n.nominee_real ? ' (' + n.nominee_real + ')' : '') + ', ' + dispBoard(n.board) }));
    });
    app.appendChild(lu);
    app.appendChild(el('p', { class: 'muted', text: 'Only locked nominations are shown. A nomination still being confirmed is not shown to others.' }));
  }

  sb.auth.onAuthStateChange(function (ev, sess) { SESSION = sess; });
  sb.auth.getSession().then(function (r) {
    SESSION = r.data && r.data.session;
    if (!SESSION) renderSignedOut(); else load();
  });
})();
