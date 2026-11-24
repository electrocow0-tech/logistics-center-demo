/* Общие помощники: форматирование, иконки, фото, скачивание файлов. */
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
  const num = (n, d) => Number(n).toFixed(d == null ? 2 : d).replace(".", ",");
  const cny = (n) => "¥" + NB + groups(Math.round(n));
  const usd = (n) => (Math.round(n) < 0 ? "−" : "") + "$" + NB + groups(Math.abs(Math.round(n)));
  const kg = (n) => groups(Math.round(n)) + NB + "кг";
  const vol = (n) => num(n, 2) + NB + "м³";
  const places = (n) => n + NB + plural(n, "место", "места", "мест");
  const parse = (v) => parseFloat(String(v == null ? "" : v).replace(/\s/g, "").replace(",", ".")) || 0;
  const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const pad = (n) => String(n).padStart(2, "0");
  const dShort = (t) => { const d = new Date(t); return pad(d.getDate()) + "." + pad(d.getMonth() + 1); };
  const dFull = (t) => { const d = new Date(t); return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear(); };
  const dLong = (t) => { const d = new Date(t); return d.getDate() + NB + MONTHS[d.getMonth()]; };
  const hm = (t) => { const d = new Date(t); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  function dayStart(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  const dayDiff = (t) => Math.round((dayStart(Date.now()) - dayStart(t)) / 864e5);
  function when(t) {
    const diff = dayDiff(t);
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
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    back: '<path d="m15 6-6 6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
    file: '<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4M9 13h6M9 16.5h6"/>',
    home: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',
    user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.9-3.6 3.6-5.6 7-5.6s6.1 2 7 5.6"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
    spark: '<path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14l-6.7-2 6.7-2z"/>',
    pin: '<path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17v.3"/>',
    send: '<path d="M4 12 20 4l-5 16-3.5-6.5z"/><path d="m11.5 13.5 3-3"/>',
    tg: '<path d="M20.5 4.5 3.5 11l5.5 2 2 6 3-3.5 4.5 3.5z"/><path d="m9 13 7.5-5.5"/>',
    layers: '<path d="M12 4 3 8.5l9 4.5 9-4.5z"/><path d="m3 13 9 4.5 9-4.5"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5z"/>',
    exit: '<path d="M14 4.5h4.5v15H14M10 8.5 6.5 12l3.5 3.5M6.5 12H15"/>',
    play: '<path d="M8 5.5v13l10-6.5z"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    monitor: '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16.5V20"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    dollar: '<path d="M12 3.5v17M16 7.6c-.6-1.3-2-2.1-4-2.1-2.3 0-3.8 1.1-3.8 2.9 0 4 8 2 8 6.2 0 1.8-1.6 3-4.2 3-2.2 0-3.7-.8-4.3-2.2"/>',
    wh: '<path d="M3 20V9l9-5 9 5v11"/><path d="M7 20v-7h10v7M7 16.5h10"/>',
    merge: '<path d="M6 4v4c0 3.5 6 3.5 6 7v5M18 4v4c0 3.5-6 3.5-6 7"/>',
    lang: '<path d="M3.5 6h9M8 4v2M5.5 6c.6 3 2.6 5.4 6 6.8M10.5 6c-.6 3-2.7 5.4-6.5 6.8"/><path d="m13 20 3.5-8.5L20 20M14.2 17.3h4.6"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    scale: '<path d="M12 4v16M6 20h12M5 8h14"/><path d="m5 8-2.5 6a2.7 2.7 0 0 0 5 0zM19 8l-2.5 6a2.7 2.7 0 0 0 5 0z"/>',
    scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M8 8.5v7M11 8.5v7M13.5 8.5v7M16 8.5v7"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8.5-8.5M16 6.5 18.5 9M13.5 9l2 2"/>',
    history: '<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4M4.5 4.5v4h4"/><path d="M12 8v4.5l3 1.8"/>',
    plane: '<path d="M10.5 3.5a1.5 1.5 0 0 1 3 0V9l7.5 4.5v2L13.5 13v5l2.5 2v1.5l-4-1-4 1V20l2.5-2v-5L3 15.5v-2L10.5 9z"/>',
    train: '<rect x="5.5" y="3.5" width="13" height="13" rx="3"/><path d="M5.5 10.5h13M9.5 16.5 8 20.5M14.5 16.5l1.5 4M7 20.5h10M9 13.5h.1M15 13.5h.1"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15 10.2"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    yuan: '<path d="M7 4.5 12 12l5-7.5M12 12v7.5M8 12.5h8M8 16h8"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    ruler: '<path d="M3.5 16.5 16.5 3.5l4 4-13 13z"/><path d="m7.5 12.5 1.8 1.8M10.5 9.5l1.8 1.8M13.5 6.5l1.8 1.8"/>',
    news: '<path d="M4 9.5v5h3l6 4V5.5l-6 4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
    route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H14a3.5 3.5 0 0 0 0-7h-4a3.5 3.5 0 0 1 0-7h5.8"/>',
  };
  const icon = (name, cls) => `<svg class="ic${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;

  // Настоящие фото грузов (свободная лицензия, лежат локально в img/): приёмка и виды упаковки
  const PHOTOS = {
    recv: ["recv-01.jpg", "recv-02.jpg", "recv-03.jpg", "recv-04.jpg", "recv-05.jpg", "recv-06.jpg"],
    box: ["pack-box-01.jpg", "pack-box-02.jpg"],
    pallet: ["pack-pallet-01.jpg", "pack-pallet-02.jpg"],
    crate: ["pack-crate-01.jpg", "pack-crate-02.jpg"],
    sack: ["pack-sack-01.jpg", "pack-sack-02.jpg"],
  };
  PHOTOS.bag = PHOTOS.sack.concat(PHOTOS.box); PHOTOS.wbox = PHOTOS.crate.slice().reverse(); // четыре вида упаковки из ТЗ: мешок и скотч, обрешётка, паллет, ящик
  function photo(seed, kind) {
    const pool = PHOTOS[kind] || PHOTOS.recv;
    const f = pool[Math.abs(Math.round(seed) || 0) % pool.length];
    return `<img src="img/${f}" alt="" width="640" height="480" decoding="async" draggable="false">`;
  }
  const allPhotos = () => [...new Set(Object.values(PHOTOS).flat())];

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
  const csv = (rows) => rows.map((r) => r.map((c) => { const s = String(c == null ? "" : c); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(";")).join("\r\n");

  App.u = { NB, esc, plural, groups, num, usd, cny, kg, vol, places, parse, dShort, dFull, dLong, hm, when, dayDiff, DAY, icon, photo, allPhotos, download, csv, pad };
})(window.App);
