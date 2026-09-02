/* лёгкий рантайм статического сайта: страницы уже собраны, здесь только интерактив */
(function () {
  'use strict';
  var BASE = window.__BASE__ || '/';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem('pddkz.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('pddkz.' + k, JSON.stringify(v)); } catch (e) { } }
  };
  var ICON = {
    sun: '<path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
    moon: '<path d="M21 13.5A9 9 0 0 1 10.5 3a9 9 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
    sign: '<path d="M12 2 22 12 12 22 2 12 12 2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    book: '<path d="M4 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4V4Zm16 0h-6a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H20V4Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    az: '<path d="M3 17 6.5 7 10 17M4.2 14h4.6M14 7h6l-6 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    x: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  };
  var svg = function (k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICON[k] || '') + '</svg>'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };

  /* стили загружены — снимаем страховочный фон из head, дальше правит таблица стилей */
  document.documentElement.style.removeProperty('background-color');
  document.documentElement.style.removeProperty('color-scheme');

  /* ---------- тема и размер текста ---------- */
  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function applyTheme() {
    var th = LS.get('theme', null);
    if (th === 'dark' || th === 'light') document.documentElement.setAttribute('data-theme', th);
    var b = $('#themebtn');
    if (b) b.innerHTML = svg(isDark() ? 'sun' : 'moon');
  }
  function applyFs() { document.documentElement.style.setProperty('--fs', LS.get('fs', 17) + 'px'); }
  function applyView() {
    var r = document.documentElement;
    r.toggleAttribute('data-nomarks', !LS.get('marks', true));
    r.toggleAttribute('data-noterms', !LS.get('terms', true));
    var m = $('#marksbtn'), t = $('#termsbtn');
    if (m) m.classList.toggle('on', !!LS.get('marks', true));
    if (t) t.classList.toggle('on', !!LS.get('terms', true));
  }

  /* ---------- уведомление ---------- */
  var toastT;
  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 1900);
  }
  function copy(txt) {
    try { navigator.clipboard.writeText(txt); } catch (e) { }
  }

  /* ---------- прочитанные главы ---------- */
  function chapterKey() {
    var b = $('#readbtn');
    return b ? b.getAttribute('data-key') : null;
  }
  function applyRead() {
    var b = $('#readbtn'); if (!b) return;
    var read = LS.get('read', {}), on = !!read[b.getAttribute('data-key')];
    b.classList.toggle('on', on);
    var s = b.querySelector('span');
    if (s) s.textContent = on ? 'Прочитано' : 'Отметить прочитанным';
  }

  /* ---------- поиск ---------- */
  var IDX = null, idxLoading = null;
  function loadIndex() {
    if (IDX) return Promise.resolve(IDX);
    if (!idxLoading) {
      idxLoading = fetch(BASE + 'assets/search.json').then(function (r) { return r.json(); }).then(function (j) {
        j.forEach(function (it) { it.l = it.t.toLowerCase(); });
        IDX = j; return IDX;
      }).catch(function () { return []; });
    }
    return idxLoading;
  }
  function find(q) {
    q = String(q || '').trim().toLowerCase();
    if (q.length < 2 || !IDX) return [];
    var toks = q.split(/\s+/).filter(Boolean);
    var res = [];
    for (var i = 0; i < IDX.length; i++) {
      var it = IDX[i], sc = 0, ok = true;
      for (var k = 0; k < toks.length; k++) {
        var at = it.l.indexOf(toks[k]);
        if (at < 0) { ok = false; break; }
        sc += at === 0 ? 30 : (at < 60 ? 12 : 5);
      }
      if (!ok) continue;
      if (it.l.indexOf(q) >= 0) sc += 25;
      if (it.dt === 'Знак' || it.dt === 'Термин') sc += 6;
      res.push({ it: it, sc: sc });
    }
    res.sort(function (a, b) { return b.sc - a.sc; });
    return res.slice(0, 60).map(function (r) { return r.it; });
  }
  function snippet(text, q) {
    var l = text.toLowerCase(), toks = String(q).toLowerCase().split(/\s+/).filter(Boolean);
    var at = -1;
    for (var i = 0; i < toks.length && at < 0; i++) at = l.indexOf(toks[i]);
    var from = at > 90 ? at - 60 : 0;
    var cut = text.slice(from, from + 260);
    var out = esc((from ? '…' : '') + cut + (text.length > from + 260 ? '…' : ''));
    toks.forEach(function (t) {
      if (t.length < 2) return;
      out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
    });
    return out;
  }
  function renderResults(q) {
    var box = $('#pres'); if (!box) return;
    if (String(q).trim().length < 2) {
      box.innerHTML = '<div class="empty"><div class="big">🔍</div>Введите запрос — минимум две буквы</div>';
      return;
    }
    var res = find(q);
    if (!res.length) {
      box.innerHTML = '<div class="empty"><div class="big">🔍</div>Ничего не нашлось по запросу «' + esc(q) + '»</div>';
      return;
    }
    box.innerHTML = '<p class="lede">Найдено: ' + res.length + (res.length === 60 ? ' и больше' : '') + '</p>' +
      res.map(function (it) {
        return '<a class="sres" href="' + it.u + '"><div class="where">' +
          svg(it.dt === 'Знак' ? 'sign' : (it.dt === 'Термин' ? 'az' : 'book')) + esc(it.ct || it.dt) + '</div>' +
          '<div class="txt">' + snippet(it.t, q) + '</div></a>';
      }).join('');
  }

  /* подсказки в верхнем поиске */
  var sgSel = -1;
  function suggest(v) {
    var box = $('#suggest'); if (!box) return;
    v = String(v || '').trim();
    if (v.length < 2) { box.classList.remove('on'); box.innerHTML = ''; return; }
    loadIndex().then(function () {
      var res = find(v).slice(0, 7);
      if (!res.length) { box.classList.remove('on'); box.innerHTML = ''; return; }
      box.innerHTML = res.map(function (it) {
        return '<a class="sgitem" href="' + it.u + '"><span class="sgw">' + esc(it.dt) + '</span>' +
          '<span class="sgt">' + esc(it.t.slice(0, 110)) + '</span></a>';
      }).join('') + '<a class="sgall" href="' + BASE + 'poisk/?q=' + encodeURIComponent(v) + '">Все результаты по запросу «' + esc(v) + '»</a>';
      box.classList.add('on');
      sgSel = -1;
    });
  }
  function hideSuggest() { var b = $('#suggest'); if (b) { b.classList.remove('on'); b.innerHTML = ''; } }

  /* ---------- фильтры ---------- */
  function filterSigns() {
    var q = ($('#signq') ? $('#signq').value : '').trim().toLowerCase();
    var g = LS.get('signFilter', 0);
    var total = 0;
    $$('.groupttl').forEach(function (ttl) {
      var grid = ttl.nextElementSibling;
      while (grid && String(grid.className).indexOf('signgrid') < 0) grid = grid.nextElementSibling;
      if (!grid) return;
      var law = ttl.querySelector('.lawbtn');
      var gi = law ? (law.getAttribute('href') || '').replace(/\/$/, '').split('glava-')[1] : '';
      gi = gi ? parseInt(gi, 10) : 0;
      var shown = 0;
      $$('.signcard', grid).forEach(function (card) {
        var code = (card.querySelector('.code') || {}).textContent || '';
        var nm = (card.querySelector('.nm') || {}).textContent || '';
        var hit = !q || code.toLowerCase().indexOf(q) === 0 || nm.toLowerCase().indexOf(q) >= 0;
        card.style.display = hit ? '' : 'none';
        if (hit) shown++;
      });
      var groupOk = !g || g === gi;
      ttl.style.display = (groupOk && shown) ? '' : 'none';
      grid.style.display = (groupOk && shown) ? '' : 'none';
      if (groupOk) total += shown;
      var c = ttl.querySelector('.c'); if (c) c.textContent = shown;
    });
    $$('.fchip').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-f') === g); });
    var none = $('#nosigns');
    if (none) none.style.display = total ? 'none' : '';
  }
  function filterGloss() {
    var q = ($('#glossq') ? $('#glossq').value : '').trim().toLowerCase();
    $$('.gitem').forEach(function (it) {
      it.style.display = (!q || it.textContent.toLowerCase().indexOf(q) >= 0) ? '' : 'none';
    });
  }

  /* ---------- МРП ---------- */
  function initMrp() {
    var inp = $('#mrpinput'); if (!inp) return;
    var saved = LS.get('mrp', null);
    if (saved) inp.value = saved;
    var apply = function () {
      var v = parseFloat(inp.value) || 0;
      $$('.mrp').forEach(function (el) {
        var m = parseFloat(el.getAttribute('data-m')) || 0;
        var t = el.querySelector('.tg');
        if (!t) { t = document.createElement('span'); t.className = 'tg'; el.appendChild(t); }
        t.textContent = v ? ' · ' + Math.round(m * v).toLocaleString('ru-RU') + ' ₸' : '';
      });
      LS.set('mrp', v);
    };
    inp.addEventListener('input', apply);
    apply();
  }

  /* ---------- увеличение картинок ---------- */
  var ZOOMSEL = '.infofig img, .roadfig img, .inlinefigs img, .bigfig img, .cheatfigs img, .signpage .plate img';
  function markZoomable() {
    $$(ZOOMSEL).forEach(function (im) {
      var check = function () { im.classList.toggle('zoomable', im.naturalWidth > im.clientWidth + 4); };
      if (im.complete && im.naturalWidth) check();
      else im.addEventListener('load', check, { once: true });
    });
  }
  function openZoom(im) {
    closeZoom();
    var d = document.createElement('div');
    d.className = 'imgzoom'; d.id = 'imgzoom';
    d.innerHTML = '<div class="izin"><img src="' + (im.currentSrc || im.src) + '" alt="' + esc(im.alt || '') + '"></div>' +
      '<div class="izhint">Нажмите ещё раз, чтобы закрыть</div>';
    document.body.appendChild(d);
    document.body.style.overflow = 'hidden';
  }
  function closeZoom() {
    var z = $('#imgzoom');
    if (!z) return false;
    z.remove(); document.body.style.overflow = '';
    return true;
  }

  /* ---------- панель знака при наведении ---------- */
  var TIPSEL = '.rex img, .blk-ref .thumbs img, .mkchip, .sref-m';
  var tipBox = null, tipFor = null;
  function showTip(el) {
    if (tipFor === el) return;
    var pic, code, name;
    if (el.tagName === 'IMG') {
      var alt = el.getAttribute('alt') || '';
      var sp = alt.indexOf(' ');
      if (sp < 0) return;
      pic = '<img src="' + (el.currentSrc || el.src) + '" alt="">';
      code = alt.slice(0, sp); name = alt.slice(sp + 1);
    } else {
      var g = el.querySelector('svg');
      if (!g) return;
      pic = g.outerHTML;
      code = el.getAttribute('data-code') || ''; name = el.getAttribute('data-name') || '';
    }
    if (!tipBox) { tipBox = document.createElement('div'); tipBox.className = 'signtip'; document.body.appendChild(tipBox); }
    tipFor = el;
    tipBox.innerHTML = pic + '<div><div class="tc">' + code.replace(/[&<>"]/g, '') +
      '</div><div class="tn">' + name.replace(/[&<>]/g, '') + '</div></div>';
    var r = el.getBoundingClientRect();
    tipBox.style.left = '0px'; tipBox.style.top = '0px';
    var w = tipBox.offsetWidth, h = tipBox.offsetHeight;
    var x = r.left + r.width / 2 - w / 2;
    x = Math.max(8, Math.min(x, innerWidth - w - 8));
    var y = r.top - h - 10;
    if (y < 8) y = r.bottom + 10;
    tipBox.style.left = Math.round(x) + 'px';
    tipBox.style.top = Math.round(y) + 'px';
    tipBox.classList.add('on');
  }
  function hideTip() {
    if (!tipBox) return;
    tipBox.classList.remove('on');
    tipFor = null;
  }
  document.addEventListener('mouseover', function (e) {
    var im = e.target.closest && e.target.closest(TIPSEL);
    if (im) showTip(im); else if (tipFor) hideTip();
    var pa = e.target.closest && e.target.closest('a[href]');
    if (pa && isSignHref(pa.getAttribute('href'))) fetchSign(pa.getAttribute('href'));
    if (e.target.closest && e.target.closest('.sref-m')) loadMarks();
  });
  document.addEventListener('mouseleave', hideTip, true);
  window.addEventListener('scroll', hideTip, true);
  window.addEventListener('blur', hideTip);
  /* ---------- знак открывается панелью поверх страницы ---------- */
  var SIGNBASE = BASE + 'dorozhnye-znaki/';
  var signCache = {}, ovPushed = false;
  function isSignHref(h) { return h && h.indexOf(SIGNBASE) === 0 && h !== SIGNBASE; }
  function fetchSign(href) {
    if (signCache[href]) return Promise.resolve(signCache[href]);
    return fetch(href).then(function (r) { return r.text(); }).then(function (t) {
      var d = new DOMParser().parseFromString(t, 'text/html');
      var el = d.querySelector('.signpage');
      signCache[href] = el ? { html: el.innerHTML, title: d.title } : null;
      return signCache[href];
    }).catch(function () { return null; });
  }
  function closeOverlay(back) {
    var o = $("#ov"); if (!o) return false;
    o.remove(); document.body.style.overflow = "";
    if (back && ovPushed) { ovPushed = false; history.back(); }
    ovPushed = false;
    return true;
  }
  function openSignOverlay(href) {
    hideTip();
    var already = !!$("#ov"), wasPushed = ovPushed;
    if (already) { $("#ov").remove(); }
    var d = document.createElement("div");
    d.className = "overlay"; d.id = "ov";
    d.innerHTML = "<div class=\"modal\" style=\"position:relative\"><button class=\"iconbtn modal-x\" id=\"ovx\" aria-label=\"Закрыть\">" + svg("x") + "</button><div class=\"modal-b ovload\">Загружаем…</div></div>";
    document.body.appendChild(d);
    document.body.style.overflow = "hidden";
    try {
      if (already && wasPushed) { history.replaceState({ ov: href }, "", href); ovPushed = true; }
      else { history.pushState({ ov: href }, "", href); ovPushed = true; }
    } catch (e) { }
    fetchSign(href).then(function (r) {
      var box = $("#ov"); if (!box) return;
      if (!r) { location.href = href; return; }
      box.querySelector(".modal").innerHTML =
        "<button class=\"iconbtn modal-x\" id=\"ovx\" aria-label=\"Закрыть\">" + svg("x") + "</button>" + r.html;
      markZoomable();
      box.querySelector(".modal").scrollTop = 0;
    });
  }
  window.addEventListener('popstate', function () { closeOverlay(false); });
  /* ---------- разметка тоже открывается панелью ---------- */
  var markPage = null, markCards = {};
  function loadMarks() {
    if (markPage) return markPage;
    markPage = fetch(BASE + 'prosto/razmetka-dorogi/').then(function (r) { return r.text(); }).then(function (t) {
      var d = new DOMParser().parseFromString(t, 'text/html');
      [].forEach.call(d.querySelectorAll('.mkitem'), function (el) {
        markCards[el.id.replace(/^m-/, '')] = el.innerHTML;
      });
      return markCards;
    }).catch(function () { return markCards; });
    return markPage;
  }
  function openMarkOverlay(code) {
    hideTip();
    var here = document.getElementById('m-' + code);
    if (here) { here.scrollIntoView({ block: 'center' }); location.hash = 'm-' + code; return; }
    closeOverlay(false);
    var d = document.createElement('div');
    d.className = 'overlay'; d.id = 'ov';
    d.innerHTML = '<div class="modal" style="position:relative;max-width:560px">' +
      '<button class="iconbtn modal-x" id="ovx" aria-label="Закрыть">' + svg('x') + '</button>' +
      '<div class="modal-b ovload">Загружаем…</div></div>';
    document.body.appendChild(d);
    document.body.style.overflow = 'hidden';
    loadMarks().then(function (cards) {
      var box = $('#ov'); if (!box) return;
      if (!cards[code]) { location.href = BASE + 'prosto/razmetka-dorogi/#m-' + code; return; }
      box.querySelector('.modal').innerHTML =
        '<button class="iconbtn modal-x" id="ovx" aria-label="Закрыть">' + svg('x') + '</button>' +
        '<div class="modal-b"><div class="mkitem plain">' + cards[code] + '</div>' +
        '<a class="tocard" style="margin-top:16px" href="' + BASE + 'prosto/razmetka-dorogi/">' + svg('book') + 'Вся разметка одним списком</a></div>';
    });
  }
  /* ---------- события ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('#ovx')) { e.preventDefault(); closeOverlay(true); return; }
    if (t.id === 'ov') { e.preventDefault(); closeOverlay(true); return; }
    var mk = t.closest && t.closest('.sref-m');
    if (mk && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      var mc = (mk.getAttribute('href') || '').split('#m-')[1];
      if (mc) { e.preventDefault(); openMarkOverlay(mc); return; }
    }
    var sa = t.closest && t.closest('a[href]');
    if (sa && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0 && isSignHref(sa.getAttribute('href'))) {
      e.preventDefault(); openSignOverlay(sa.getAttribute('href')); return;
    }
    if (closeZoom()) { e.preventDefault(); return; }
    var zi = t.closest && t.closest(ZOOMSEL);
    if (zi && zi.classList.contains('zoomable')) { e.preventDefault(); openZoom(zi); return; }
    if (!t.closest('.searchwrap')) hideSuggest();

    var tr = t.closest('[data-tree]');
    if (tr) {
      e.preventDefault();
      tr.classList.toggle('open');
      var sub = $('#sub-' + tr.getAttribute('data-tree'));
      if (sub) sub.classList.toggle('open');
      return;
    }
    var cp = t.closest('[data-copy]');
    if (cp) {
      e.preventDefault();
      copy(location.href.split('#')[0] + '#' + cp.getAttribute('data-copy'));
      toast('Ссылка на пункт скопирована');
      return;
    }
    if (t.closest('#readbtn')) {
      var k = chapterKey(); if (!k) return;
      var read = LS.get('read', {});
      if (read[k]) delete read[k]; else read[k] = 1;
      LS.set('read', read); applyRead();
      toast(read[k] ? 'Глава отмечена как прочитанная' : 'Отметка снята');
      return;
    }
    if (t.closest('#lnkbtn')) { copy(location.href); toast('Ссылка скопирована'); return; }
    if (t.closest('#marksbtn')) { LS.set('marks', !LS.get('marks', true)); applyView(); toast(LS.get('marks', true) ? 'Подсветка включена' : 'Подсветка выключена'); return; }
    if (t.closest('#termsbtn')) { LS.set('terms', !LS.get('terms', true)); applyView(); toast(LS.get('terms', true) ? 'Подсказки к терминам включены' : 'Подсказки выключены'); return; }
    if (t.closest('#themebtn')) { LS.set('theme', isDark() ? 'light' : 'dark'); applyTheme(); return; }
    if (t.closest('#fsbtn')) {
      var fs = LS.get('fs', 17); fs = fs >= 20 ? 15 : fs + 1;
      LS.set('fs', fs); applyFs(); toast('Размер текста: ' + fs + 'px'); return;
    }
    if (t.closest('#menubtn')) { $('#sidebar').classList.toggle('open'); $('#scrim').classList.toggle('on'); return; }
    if (t.id === 'scrim') { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('on'); return; }
    if (t.closest('#brand')) { location.href = BASE; return; }
    var f = t.closest('[data-f]');
    if (f) { e.preventDefault(); LS.set('signFilter', +f.getAttribute('data-f')); filterSigns(); return; }
  });

  document.addEventListener('input', function (e) {
    if (e.target.id === 'q') { suggest(e.target.value); return; }
    if (e.target.id === 'signq') { filterSigns(); return; }
    if (e.target.id === 'glossq') { filterGloss(); return; }
    if (e.target.id === 'pq') {
      var v = e.target.value;
      loadIndex().then(function () { if ($('#pq') && $('#pq').value === v) renderResults(v); });
      return;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test((e.target.tagName || ''))) {
      var q = $('#q'); if (q) { e.preventDefault(); q.focus(); q.select(); }
      return;
    }
    if (e.key === 'Escape') { if (closeZoom()) return; if (closeOverlay(true)) return; hideSuggest(); return; }
    if (e.target.id === 'q') {
      var box = $('#suggest');
      var items = box ? $$('.sgitem', box) : [];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!items.length) return;
        e.preventDefault();
        sgSel += e.key === 'ArrowDown' ? 1 : -1;
        if (sgSel < -1) sgSel = items.length - 1;
        if (sgSel >= items.length) sgSel = -1;
        items.forEach(function (el, i) { el.classList.toggle('sel', i === sgSel); });
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (sgSel >= 0 && items[sgSel]) { location.href = items[sgSel].getAttribute('href'); return; }
        var v = e.target.value.trim();
        if (v) location.href = BASE + 'poisk/?q=' + encodeURIComponent(v);
      }
    }
  });

  /* ---------- старт ---------- */
  applyTheme(); applyFs(); applyView(); applyRead(); initMrp(); markZoomable();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  if ($('#signq')) filterSigns();
  if ($('#glossq')) filterGloss();

  if ($('#pres')) {
    var q0 = decodeURIComponent((location.search.match(/[?&]q=([^&]*)/) || [])[1] || '').replace(/\+/g, ' ');
    if ($('#pq')) $('#pq').value = q0;
    loadIndex().then(function () { renderResults(q0); });
    if ($('#pq')) $('#pq').focus();
  }

  /* подсветка пункта из адреса */
  if (location.hash && /^#p-/.test(location.hash)) {
    var el = document.getElementById(location.hash.slice(1));
    if (el) {
      el.scrollIntoView({ block: 'center' });
      el.style.transition = 'box-shadow .4s';
      el.style.boxShadow = '0 0 0 3px var(--accent)';
      setTimeout(function () { el.style.boxShadow = ''; }, 1600);
    }
  }
})();
