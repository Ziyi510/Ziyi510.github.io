/* Map rendering adapted from ChenAnno/ChenAnno.github.io (MIT). */
(function () {
  var map = document.getElementById('visitor-map');
  if (!map || !window.fetch) return;
  var base = map.dataset.api.replace(/\/$/, '');
  var status = document.querySelector('.visitor-map__status');
  var key = 'ziyi510:visit:last';
  var recorded = Promise.resolve();
  // Local previews can display data but never add visits.
  if (location.origin === map.dataset.siteOrigin) {
    var first = true;
    try { first = Date.now() - (+localStorage.getItem(key) || 0) > 864e5; } catch (e) {}
    recorded = fetch(base + '/api/visit', {
      method: 'POST', keepalive: true, credentials: 'omit',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ first: first })
    }).then(function (r) {
      if (r.ok && first) {
        try { localStorage.setItem(key, Date.now()); } catch (e) {}
      }
    }).catch(function () {});
  }
  recorded.then(function () {
    return fetch(base + '/api/visitors', { credentials: 'omit' });
  }).then(function (r) {
    if (!r.ok) throw new Error('Statistics unavailable');
    return r.json();
  }).then(function (data) {
    if (!Array.isArray(data.places) || !Number.isFinite(data.pageviews)) throw new Error('Invalid statistics');
    draw(data.places.filter(function (p) {
      return Number.isFinite(p.lat) && Math.abs(p.lat) < 90 && Number.isFinite(p.lon) && Math.abs(p.lon) <= 180 && p.n > 0;
    }));
    status.textContent = 'Total Views: ' + data.pageviews.toLocaleString('en-US');
  }).catch(function () { status.textContent = 'Visitor map · Statistics temporarily unavailable'; });

  // jVectorMap's world_mill frame: Miller projection, central meridian 11.5,
  // 900 x 440.7 (the land image is cropped to 409 high)
  function project(lat, lon) {
    var R = 6381372, D = Math.PI / 180;
    if (lon < -168.5) lon += 360;
    var x = R * (lon - 11.5) * D;
    var y = -R * Math.log(Math.tan((45 + 0.4 * lat) * D)) / 0.8;
    return [(x + 20004297.151525836) / 40030869.546275226 * 900,
            (y + 12671671.123330014) / 19602063.148465134 * 440.70631074413296];
  }

  function draw(places) {
    var svg = map.querySelector('svg'), tip = map.querySelector('.visitor-map__tip');
    var names = window.Intl && Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
    function country(cc) {
      try { return (names && names.of(cc)) || cc; } catch (e) { return cc; }
    }
    // from the light blue of a single visit to the headings' blue at 50 or more,
    // on a log scale, so one busy place does not wash out all the others
    var LIGHT = [122, 167, 217], DEEP = [34, 75, 119];   // #7aa7d9, #224b77
    function shade(n) {
      var t = Math.min(1, Math.log(Math.max(1, n)) / Math.log(50));
      return 'rgb(' + LIGHT.map(function (c, i) { return Math.round(c + (DEEP[i] - c) * t); }).join(',') + ')';
    }
    // larger markers first, so the small ones stay on top and can be hovered
    places.slice().sort(function (a, b) { return b.n - a.n; }).forEach(function (p) {
      var at = project(p.lat, p.lon);
      if (at[1] > 409) return;
      var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', at[0].toFixed(1));
      dot.setAttribute('cy', at[1].toFixed(1));
      dot.setAttribute('r', (3 + Math.min(4, Math.log(p.n + 1) / Math.LN10 * 2.4)).toFixed(1));
      dot.style.fill = shade(p.n);
      var where = country(p.cc);
      if (p.city && p.city !== where) where = p.city + ', ' + where;
      var label = where + ' · ' + p.n + (p.n > 1 ? ' visits' : ' visit');
      dot.addEventListener('mouseenter', function () {
        tip.textContent = label;
        tip.style.left = at[0] / 9 + '%';
        tip.style.top = at[1] / 4.09 + '%';
        tip.hidden = false;
      });
      dot.addEventListener('mouseleave', function () { tip.hidden = true; });
      svg.appendChild(dot);
    });
    map.setAttribute('aria-label', 'Visitor map: visits from ' + places.length + ' places');

  }
})();
