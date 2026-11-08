/* Общие помощники: форматирование, иконки, картинки-заглушки (фото коробок, QR). */
window.App = window.App || {};
(function (App) {
  "use strict";

  const NB = " "; // неразрывный пробел

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }
  const groups = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
  const money = (n) => groups(Math.round(n)) + NB + "₽";
  const moneyShort = (n) => (n >= 1e6 ? (Math.round(n / 1e4) / 100).toString().replace(".", ",") + NB + "млн" + NB + "₽" : money(n));
  const kg = (n) => groups(Math.round(n)) + NB + "кг";
  const vol = (n) => n.toFixed(2).replace(".", ",") + NB + "м³";
  const places = (n) => n + NB + plural(n, "место", "места", "мест");
  const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const pad = (n) => String(n).padStart(2, "0");
  const dShort = (t) => { const d = new Date(t); return pad(d.getDate()) + "." + pad(d.getMonth() + 1); };
  const dLong = (t) => { const d = new Date(t); return d.getDate() + NB + MONTHS[d.getMonth()]; };
  const hm = (t) => { const d = new Date(t); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  function dayStart(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function when(t) {
    const diff = Math.round((dayStart(Date.now()) - dayStart(t)) / 864e5);
    if (diff === 0) return "сегодня" + NB + hm(t);
    if (diff === 1) return "вчера" + NB + hm(t);
    return dShort(t);
  }
  const DAY = 864e5;

  // Иконки: линейные, 24×24, цвет через currentColor
  const P = {
    box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
    board: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><path d="M15.5 5.3a3 3 0 0 1 0 5.4M17.5 14.2c1.6.6 2.7 2.3 3 4.8"/>',
    truck: '<path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7z"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 9.5h18M16 14h2"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    team: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><circle cx="12" cy="10" r="2.6"/><path d="M8 17c.7-2 2.2-3 4-3s3.3 1 4 3"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    chat: '<path d="M4 5.5h16v10H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    camera: '<path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.4"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M4 12h16"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    back: '<path d="m15 6-6 6 6 6"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
    file: '<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4M9 13h6M9 16.5h6"/>',
    qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
    home: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',
    user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.9-3.6 3.6-5.6 7-5.6s6.1 2 7 5.6"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
    spark: '<path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14l-6.7-2 6.7-2z"/>',
    pin: '<path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    printer: '<path d="M7 9V4h10v5M7 17H4.5V9.5h15V17H17"/><rect x="7" y="14" width="10" height="6.5" rx="1"/>',
    alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17v.3"/>',
    send: '<path d="M4 12 20 4l-5 16-3.5-6.5z"/><path d="m11.5 13.5 3-3"/>',
    tg: '<path d="M20.5 4.5 3.5 11l5.5 2 2 6 3-3.5 4.5 3.5z"/><path d="m9 13 7.5-5.5"/>',
    layers: '<path d="M12 4 3 8.5l9 4.5 9-4.5z"/><path d="m3 13 9 4.5 9-4.5"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5z"/>',
    exit: '<path d="M14 4.5h4.5v15H14M10 8.5 6.5 12l3.5 3.5M6.5 12H15"/>',
    play: '<path d="M8 5.5v13l10-6.5z"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  };
  const icon = (name, cls) => `<svg class="ic${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;

  // Детерминированный генератор случайных чисел для картинок
  function rng(seed) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

  // «Фото» груза: изометрическая коробка, обрешётка или мешок на фоне склада
  function photo(seed, kind) {
    const r = rng(seed + 11);
    const tones = [["#d9b47c", "#c39558", "#a97a40"], ["#d4ab73", "#b98a4e", "#9c6f36"], ["#e0be8a", "#c9a067", "#ad8248"], ["#cfa66d", "#b48449", "#946a33"]];
    const t = tones[Math.floor(r() * tones.length)];
    const wall = ["#e9ecef", "#e5e7e3", "#eceae6", "#e3e8ec"][Math.floor(r() * 4)];
    const floor = ["#c9cdd2", "#cfcbc3", "#c7cbc6", "#cdd1d6"][Math.floor(r() * 4)];
    const dx = Math.round(r() * 10 - 5), two = r() > 0.45;
    const boxAt = (ox, oy, s, c) => {
      const X = (x) => ox + x * s, Y = (y) => oy + y * s;
      const pts = (a) => a.map(([x, y]) => X(x) + "," + Y(y)).join(" ");
      let g = `<polygon points="${pts([[0, 14], [36, 0], [72, 14], [36, 28]])}" fill="${c[0]}"/>`;
      g += `<polygon points="${pts([[0, 14], [36, 28], [36, 62], [0, 48]])}" fill="${c[1]}"/>`;
      g += `<polygon points="${pts([[36, 28], [72, 14], [72, 48], [36, 62]])}" fill="${c[2]}"/>`;
      if (kind === "crate") {
        const w = "#8a6236";
        g += `<polygon points="${pts([[0, 14], [36, 28], [36, 32], [0, 18]])}" fill="${w}"/><polygon points="${pts([[0, 44], [36, 58], [36, 62], [0, 48]])}" fill="${w}"/>`;
        g += `<polygon points="${pts([[36, 28], [72, 14], [72, 18], [36, 32]])}" fill="${w}"/><polygon points="${pts([[36, 58], [72, 44], [72, 48], [36, 62]])}" fill="${w}"/>`;
        g += `<polygon points="${pts([[16, 20], [20, 22], [20, 56], [16, 54]])}" fill="${w}"/><polygon points="${pts([[52, 22], [56, 20], [56, 54], [52, 56]])}" fill="${w}"/>`;
      } else {
        g += `<polygon points="${pts([[16, 7.5], [20, 6], [56, 20], [52, 21.5]])}" fill="rgba(255,255,255,.35)"/>`;
        g += `<polygon points="${pts([[52, 21.5], [56, 20], [56, 54], [52, 55.5]])}" fill="rgba(255,255,255,.28)"/>`;
        g += `<polygon points="${pts([[8, 26], [26, 33], [26, 43], [8, 36]])}" fill="#fbf8f1"/>`;
        g += `<polygon points="${pts([[10, 29.5], [22, 34.2], [22, 35.4], [10, 30.7]])}" fill="#9aa3ad"/><polygon points="${pts([[10, 32.5], [19, 36], [19, 37.2], [10, 33.7]])}" fill="#b9c0c7"/>`;
      }
      return g;
    };
    let body;
    if (kind === "sack") {
      body = `<ellipse cx="60" cy="80" rx="34" ry="5" fill="rgba(0,0,0,.12)"/>
        <path d="M30 40c0-12 8-20 30-20s30 8 30 20v28c0 9-12 14-30 14s-30-5-30-14z" fill="#f3f1ea"/>
        <path d="M30 40c0-12 8-20 30-20 6 0 11 .6 15 1.8-14 1-24 9-24 22v38c-13-1-21-5-21-12z" fill="#e4e0d5"/>
        <path d="M46 22c4-5 24-5 28 0" stroke="#c9c3b5" stroke-width="2" fill="none"/>
        <path d="M36 50h48M36 60h48" stroke="#d6d1c4" stroke-width="1" stroke-dasharray="2 2"/>
        <rect x="52" y="46" width="18" height="11" rx="1.5" fill="#fff" stroke="#d6d1c4"/>`;
    } else {
      body = `<ellipse cx="62" cy="84" rx="42" ry="5" fill="rgba(0,0,0,.13)"/>`;
      if (two) body += boxAt(44 + dx, 8, 0.62, [t[0], t[1], t[2]].map((c) => c));
      body += boxAt(22 + dx, two ? 24 : 18, two ? 0.85 : 1, t);
    }
    return `<svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="120" height="90" fill="${wall}"/><rect y="58" width="120" height="32" fill="${floor}"/><rect y="57" width="120" height="1.5" fill="rgba(0,0,0,.06)"/>${body}</svg>`;
  }

  // Узор, похожий на QR-код: поисковые квадраты и детерминированный шум
  function qr(seed) {
    const n = 25, r = rng(seed + 5);
    const finder = (x, y, fx, fy) => { const dx = x - fx, dy = y - fy; return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4); };
    let d = "";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let on;
      const F = [[0, 0], [n - 7, 0], [0, n - 7]].find(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
      if (F) on = finder(x, y, F[0], F[1]);
      else if ((x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8)) on = false;
      else on = r() < 0.47;
      if (on) d += `M${x} ${y}h1v1h-1z`;
    }
    return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges" aria-hidden="true"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#fff"/><path d="${d}" fill="#0f1b2d"/></svg>`;
  }

  // Скачивание текстового файла (CSV для Excel) с BOM
  function download(name, text, type) {
    try {
      const blob = new Blob(["﻿" + text], { type: type || "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 600);
      return true;
    } catch (e) { return false; }
  }

  App.u = { NB, esc, plural, groups, money, moneyShort, kg, vol, places, dShort, dLong, hm, when, DAY, icon, photo, qr, download, pad };
})(window.App);
