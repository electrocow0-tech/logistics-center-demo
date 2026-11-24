/* Рабочее окно администратора: он может выполнить любой шаг сам. Сотрудников и то, что они видят, он настраивает в «Сотрудники и доступы».
   Режим «Войти под этим сотрудником» показывает тот же интерфейс с его ограничениями: меню, клиенты, деньги, действия. */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, I = u.icon, E = u.esc, L = App.i18n.of("ru"), $ = (id) => document.getElementById(id);

  // ---------- доступы: администратору доступно всё; под сотрудником действуют его разделы, клиенты, деньги и действия ----------
  const asId = () => (App.ui.viewAs && st.S.access[App.ui.viewAs] ? App.ui.viewAs : null);
  const acc = () => (asId() ? st.S.access[asId()] : null);
  const actor = () => asId() || "ramil";
  const can = (fn) => { const a = acc(); return !a || !!a.fn[fn]; };
  const sec = (k) => { const a = acc(); return !a ? true : k === "staff" ? false : !!a.sec[k]; };
  const seeMoney = () => can("cost");
  // каких клиентов видит сотрудник: всех, своих (где он указан менеджером) или выбранных галочками
  const mine = (cid) => { const a = acc(); return !a || a.scope === "all" || (!!cid && (a.scope === "own" ? (st.client(cid) || {}).salesId === asId() : a.clients.includes(cid))); };
  // маршрут (3G, 88G, 89G, 81G) можно скрыть от сотрудника: тогда его нет ни в карточках, ни в списках, ни в фильтрах, ни в текстах истории
  const seeRoute = () => can("route");
  // маршруты берутся из справочника агентов: новый агент тоже скрывается
  const rt = (t) => (seeRoute() ? t : String(t).replace(new RegExp(",?\\s*маршрут (" + st.ROUTES.join("|") + ")(?![A-Za-z0-9])", "g"), ""));
  const vis = (o) => mine(o.clientId);
  const setName = (k) => { const a = st.S.access[k]; return a && a.preset && st.PRESETS[a.preset] ? "набор прав «" + st.PRESETS[a.preset][0].replace("как ", "") + "»" : st.STAFF[k].role.toLowerCase(); };

  const pill = (s, lg, label) => `<span class="st${lg ? " lg" : ""}" data-st="${s}">${label || L.t("st_" + s)}</span>`;
  // подстатус прибывшего груза: хранение, готов к выдаче, выдают
  const SUB_ST = { store: "wait", ready: "in", issuing: "pack" };
  const subPill = (s, lg) => (s.status === "arrived" && st.SUB[s.sub] ? `<span class="st${lg ? " lg" : ""}" data-st="${SUB_ST[s.sub]}" data-sub="${s.sub}">${st.SUB[s.sub]}</span>` : "");
  const wayText = (o) => st.WAY[o.way].t + (o.way === "tk" && o.tk ? ": " + o.tk : "");
  const issuedText = (s) => (s.issue && s.issue.type === "tk" ? "Передан в ТК" : "Выдан");
  const copyBtn = (v, what) => `<button class="lnkb" type="button" data-act="copy" data-v="${E(v)}" data-w="${E(what || "Адрес")}">${I("copy")}Копировать</button>`;
  const cname = (id) => (st.client(id) || {}).name || "Клиент не указан";
  const whn = (id) => st.wh(id).ru;
  const TR = (k) => st.TRANSPORT[k] || st.TRANSPORT.auto;
  const trText = (k) => (st.TRANSPORT[k] ? st.TRANSPORT[k].t : "пока не указан");
  const recsWord = (n) => n + " " + u.plural(n, "груз", "груза", "грузов");
  const paidPill = (s) => (st.isPaid(s) ? '<span class="st" data-st="in">оплачено</span>' : s.paidUsd > 0 ? `<span class="st" data-st="pack">оплачено ${u.usd(s.paidUsd)}</span>` : '<span class="st" data-st="unk">не оплачено</span>');
  const xBtn = `<button class="x" type="button" data-act="closeDesk" aria-label="Закрыть">${I("x")}</button>`;
  const today = () => new Date().toISOString().slice(0, 10);
  const dISO = (t) => { const d = new Date(t); return d.getFullYear() + "-" + u.pad(d.getMonth() + 1) + "-" + u.pad(d.getDate()); };
  const fromISO = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "")); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12).getTime() : null; };
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const delivText = (r) => (r.dpay === "supplier" ? "оплатил поставщик" : r.deliv ? `${u.cny(r.deliv)} (≈ ${u.usd(st.cnyUsd(r.deliv))})` : "не указана");
  const plan = (a) => (a || []).map((k) => st.PACK_RU[k]).join(", ") || "на усмотрение склада";
  const tsPill = (t) => `<span class="st" data-st="${t.status === "collect" ? "wait" : "pack"}">${t.status === "collect" ? "Сборка: склад ищет грузы" : "Упаковка: склад пакует"}</span>`;

  // ---------- меню ----------
  // версия 3.2: вкладки «Денег» вынесены в левое меню отдельными пунктами группы «Деньги», «Сотрудники и доступы» стали вкладкой «Настроек»
  const SCREEN_SEC = { board: "cargo", work: "cargo", clients: "clients", client: "clients", cons: "ships", money: "money", profit: "profit", agents: "agents", tariffs: "tariffs", mskfin: "mskfin", chwh: "chwh", reports: "reports", news: "news", staff: "staff", history: "history" };
  const NAV = [["board", "board", "Грузы (информация)"], ["work", "layers", "Грузы"], ["clients", "users", "Клиенты"], ["cons", "truck", "Отправки"],
    ["g:money", "", "Деньги"], ["money", "wallet", "Оплаты клиентов"], ["profit", "scale", "Расходы и прибыль"], ["agents", "route", "Агенты"], ["mskfin", "wh", "Склад в Москве"], ["chwh", "layers", "Склады в Китае"], ["tariffs", "dollar", "Тарифы клиентов"], ["g:end"],
    ["reports", "chart", "Отчёты"], ["news", "news", "Новости и рассылки"], ["staff", "sliders", "Настройки"], ["history", "history", "История действий"]];
  const allowed = (s) => s === "none" || (!!SCREEN_SEC[s] && sec(SCREEN_SEC[s]));
  // если сотруднику не открыт ни один раздел, показывается спокойная заглушка
  const home = () => { const n = NAV.find((x) => x[0].indexOf("g:") !== 0 && allowed(x[0])); return n ? n[0] : "none"; };
  function counts() {
    const S = st.S;
    return {
      work: st.waiting().filter(vis).length + st.openTasks().filter(vis).length + st.ready().filter(vis).length,
      clients: S.clients.filter((c) => mine(c.id)).length,
      cons: S.ships.filter((s) => (s.status === "arrived" || (s.status === "way" && can("way"))) && vis(s)).length,
    };
  }
  // счётчики просрочки в меню: долг клиента дольше 14 дней, неоплаченные агентам треки старше 30 дней
  function hot() {
    const S = st.S, m = seeMoney();
    return { money: m ? S.ships.filter((s) => vis(s) && st.overC(s)).length : 0, agents: m ? S.ships.filter(st.overA).length : 0 };
  }
  const HOT_T = { money: "треков с долгом дольше 14 дней", agents: "неоплаченных агентам треков старше 30 дней" };
  function side(cur) {
    const c = counts(), h = hot(), curNav = cur === "client" ? "clients" : cur, p = st.STAFF[actor()];
    let grp = false;
    const items = NAV.map((x) => {
      if (x[0] === "g:money") { grp = NAV.some((y) => st.MONEY_SECS.includes(y[0]) && allowed(y[0])); return grp ? `<div class="nav-g" data-navg="money"><span>${x[2]}</span></div>` : ""; }
      if (x[0] === "g:end") return grp ? '<div class="sep"></div>' : "";
      if (!allowed(x[0])) return "";
      const n = h[x[0]] ? `<b class="hot" data-hot="${x[0]}" title="${h[x[0]]} ${HOT_T[x[0]]}">${h[x[0]]}</b>` : c[x[0]] != null ? `<b>${c[x[0]]}</b>` : "";
      return `<a data-act="d" data-s="${x[0]}" class="${curNav === x[0] ? "on" : ""}" data-nav="${x[0]}">${I(x[1])}<span>${x[2]}</span>${n}</a>`;
    }).join("");
    return `<div class="nav">${items}</div><div class="me"><span class="ava">${E(p.ava)}</span><span>${E(p.ru)}<small>${E(p.role)}</small></span></div>`;
  }
  function chromeBar() {
    const v = asId();
    const qs = App.D && App.D.qsHtml ? App.D.qsHtml() : "";
    if (!v) return `<span class="cb-t">${I("monitor")}<span>Рабочее место администратора</span></span>${qs}<span class="who">Рамиль · видит всё и может сделать любой шаг сам</span>`;
    const p = st.STAFF[v], a = acc();
    return `<span class="cb-as">${I("eye")}<span class="ell1">Вы вошли как <b>${E(p.ru)}</b>, ${E(setName(v))}: ${a.scope === "sel" ? "только выбранные клиенты" : a.scope === "own" ? "только свои клиенты" : "все клиенты"}${a.fn.cost ? "" : ", без стоимости"}${a.fn.route ? "" : ", без маршрута"}</span></span>${qs}<button class="btn sm dark" type="button" data-act="viewBack" id="btnViewBack">${I("back")}<span class="lg">Вернуться к администратору</span><span class="sm">Вернуться</span></button>`;
  }

  // ---------- подсказки при наборе: код или название клиента ----------
  const taKeys = { acc: { none: true }, dacc: { none: true } };
  function taItems(key, q) {
    const s = String(q || "").trim().toUpperCase(), all = /^(acc|pbind)$/.test(key);
    const list = st.findClient(/ · /.test(q) ? "" : q).filter((c) => all || mine(c.id)).sort((a, b) => (b.id.indexOf(s) === 0 ? 1 : 0) - (a.id.indexOf(s) === 0 ? 1 : 0) || (b.name.toUpperCase().indexOf(s) === 0 ? 1 : 0) - (a.name.toUpperCase().indexOf(s) === 0 ? 1 : 0)).slice(0, 6), none = App.taEmpty && App.taEmpty[key] ? App.taEmpty[key]() : "Никого не нашли";
    return list.map((c, i) => `<button type="button" class="${i === 0 ? "hl" : ""}" data-act="taPick" data-k="${key}" data-v="${E(c.id)}" tabindex="-1"><b>${E(c.id)}</b><span>${E(c.name)}</span></button>`).join("") || `<p class="muted s13">${E(none)}</p>`;
  }
  // поле с выпадающими подсказками; выбранный клиент показывается как «код · название»
  function ta(key, o) {
    const c = o.val ? st.client(o.val) : null;
    return `<div class="ta${o.flow ? " flow" : ""}${o.up ? " up" : ""}" data-ta="${key}"><span class="ta-i">${I("search")}</span><input class="inp" data-in="taQ" data-k="${key}" value="${c ? E(c.id + " · " + c.name) : E(o.q || "")}" placeholder="${E(o.ph || "Код или название клиента")}" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list"${o.hl ? ` data-hl="${o.hl}"` : ""}><div class="ta-l" hidden></div></div>`;
  }
  const taBox = (el) => el.parentElement.querySelector(".ta-l");
  function taShow(el) { const l = taBox(el); l.innerHTML = taItems(el.dataset.k, el.value); l.hidden = false; }
  function taHide(el) { const l = el && taBox(el); if (l) l.hidden = true; }
  App.ta = ta; App.taPick = {}; App.taType = {};
  document.addEventListener("focusin", (e) => { const el = e.target; if (el && el.dataset && el.dataset.in === "taQ") { taShow(el); try { el.select(); } catch (x) { /* не текстовое поле */ } } });
  document.addEventListener("focusout", (e) => { const el = e.target; if (el && el.dataset && el.dataset.in === "taQ") setTimeout(() => { if (document.activeElement !== el) taHide(el); }, 180); });
  document.addEventListener("keydown", (e) => {
    const el = e.target; if (!el || !el.dataset || el.dataset.in !== "taQ") return;
    const l = taBox(el), items = [...l.querySelectorAll("button")], i = items.findIndex((b) => b.classList.contains("hl"));
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (l.hidden) { taShow(el); return; } if (!items.length) return; const n = (i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length; items.forEach((b, j) => b.classList.toggle("hl", j === n)); }
    else if (e.key === "Enter") { e.preventDefault(); const b = items[Math.max(0, i)]; if (b && !l.hidden) b.click(); }
    else if (e.key === "Escape") { e.stopPropagation(); taHide(el); }
  }, true);

  // ---------- доска «Грузы (информация)»: только обзор, карточка открывается большим окном ----------
  const STAGES = ["in", "packing", "pack", "way", "arrived", "done"];
  // код клиента нажимается и ведёт на рабочую страницу «Грузы» → «На складе» с этим клиентом (cc: код или unk)
  const codeGo = (cc) => (cc && allowed("work") ? ` data-act="clientStock" data-c="${E(cc)}" data-cgo="${E(cc)}" role="link" title="${cc === "unk" ? "Все грузы без кода клиента" : "Все грузы клиента на складе"}"` : "");
  function sc(stage, t, id, o) {
    const go = codeGo(o.cc);
    return `<button class="sc${o.fresh ? " new" : ""}" type="button" data-act="openItem" data-t="${t}" data-id="${E(id)}" data-bc="${t}:${E(id)}">
      <span class="t"><span class="code${go ? " go" : ""}"${go}>${E(o.code)}</span>${o.dmg ? '<i class="dmg" title="Есть повреждение"></i>' : ""}<span class="pl">${o.pl}</span></span>
      <span class="nm">${E(o.name || cname(o.code))}</span><span class="sp">${o.sp}</span>${o.more ? `<span class="more">${o.more}</span>` : ""}${o.sub ? `<span class="subm" data-sub="${o.sub}">${st.SUB[o.sub]}</span>` : ""}
      <span class="f"><span${o.tt ? ' class="tt"' : ""}>${o.meta}</span></span></button>`;
  }
  // n: сколько грузов этого клиента сейчас лежит на складе; если их несколько, на карточке отметка
  const recCard = (r, n) => sc("in", "rec", r.id, { fresh: r.fresh, code: r.clientId, cc: r.clientId, dmg: !!r.damage, pl: u.places(r.places), sp: E(r.supplier), more: n > 1 ? "ещё " + recsWord(n - 1) + " этого клиента" : "", meta: E(r.id) + " · " + E(whn(r.wh)) });
  const unkCard = (r) => sc("unk", "rec", r.id, { fresh: r.fresh, code: "Без кода", cc: "unk", name: st.noteText(r) || "Маркировки нет", dmg: !!r.damage, pl: "", sp: u.places(r.places) + " · нужен клиент", meta: E(r.id) + " · " + E(whn(r.wh)) });
  const taskCard = (t) => sc("packing", "task", t.id, { fresh: t.fresh, code: t.clientId, cc: t.clientId, pl: u.places(st.taskPlaces(t)), sp: (t.status === "collect" ? "сборка" : "упаковка") + " · " + E(whn(t.wh)), meta: E(t.id), tt: true });
  const cargoCard = (c) => sc("pack", "cargo", c.id, { fresh: c.fresh, code: c.clientId, cc: c.clientId, pl: u.places(c.places), sp: `${u.kg(c.weight)} · ${u.vol(c.volume)}`, meta: E(c.id), tt: true });
  function shipCard(s) {
    const t = st.totals(s), r = seeRoute() ? E(s.route) + " · " : "";
    return sc(s.status, "ship", s.id, { fresh: s.fresh, code: s.clientId, cc: s.clientId, pl: u.places(t.places), sub: s.status === "arrived" ? s.sub : "",
      sp: r + (s.status === "way" ? "≈" + u.NB + u.dShort(s.eta) : s.status === "arrived" ? "прибыл " + u.dShort(s.arrivedAt) : s.issue && s.issue.type === "tk" ? "ТК " + E(s.issue.tk) : "выдан " + u.dShort(s.doneAt)), meta: E(s.id), tt: true });
  }
  function boardData() {
    const S = st.S, q = App.tmp.q.trim().toUpperCase(), f = App.tmp.whF;
    const txt = (cid, a) => !q || [cid, cname(cid)].concat(a).some((x) => String(x || "").toUpperCase().includes(q));
    const whOk = (o) => f === "all" || o.wh === f, shipWh = (s) => f === "all" || (st.cargo(s.id) || {}).wh === f;
    const fr = (a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0);
    const ships = (status) => S.ships.filter((s) => s.status === status && vis(s) && shipWh(s) && txt(s.clientId, [s.id, seeRoute() ? s.route : "", st.SUB[s.sub] || ""]));
    return {
      unk: st.unknown().filter((r) => vis(r) && whOk(r) && (!q || [r.id, r.track, st.noteText(r)].some((x) => String(x || "").toUpperCase().includes(q)))).sort((a, b) => b.at - a.at),
      in: st.waiting().filter((r) => vis(r) && whOk(r) && txt(r.clientId, [r.id, r.supplier, r.track])).sort((a, b) => fr(a, b) || b.at - a.at),
      packing: st.openTasks().filter((t) => vis(t) && whOk(t) && txt(t.clientId, [t.id, t.name])).sort((a, b) => fr(a, b) || b.at - a.at),
      pack: st.ready().filter((c) => vis(c) && whOk(c) && txt(c.clientId, [c.id, c.name])).sort((a, b) => fr(a, b) || b.at - a.at),
      way: ships("way").sort((a, b) => fr(a, b) || a.eta - b.eta),
      arrived: ships("arrived").sort((a, b) => fr(a, b) || b.arrivedAt - a.arrivedAt),
      done: ships("done").sort((a, b) => b.doneAt - a.doneAt),
    };
  }
  const LIM = { unk: 5, in: 5, packing: 5, pack: 5, way: 5, arrived: 5, done: 3 };
  function board() {
    const d = boardData(), f = App.tmp.whF, all = App.tmp.laneAll || {}, perClient = {};
    st.waiting().filter(vis).forEach((r) => { perClient[r.clientId] = (perClient[r.clientId] || 0) + 1; });
    const render = { unk: unkCard, in: (r) => recCard(r, perClient[r.clientId] || 1), packing: taskCard, pack: cargoCard, way: shipCard, arrived: shipCard, done: shipCard };
    const lanes = ["unk"].concat(STAGES).map((k) => {
      const list = d[k], shown = all[k] ? list : list.slice(0, LIM[k]);
      return `<div class="lane" data-lane="${k}"><div class="lane-h">${pill(k)}<b>${list.length}</b></div>
        ${shown.map(render[k]).join("") || '<div class="lane-empty">Пусто</div>'}
        ${list.length > LIM[k] ? `<button class="lane-more" type="button" data-act="laneAll" data-k="${k}">${all[k] ? "свернуть" : "ещё " + (list.length - LIM[k])}</button>` : ""}</div>`;
    }).join("");
    return `<div class="pane">
      <div class="ph"><h1>Грузы (информация)</h1><label class="search">${I("search")}<input data-in="q" value="${E(App.tmp.q)}" placeholder="Код клиента, трек, наименование"></label><span class="grow"></span><button class="btn" type="button" data-act="exportBoard" title="Выгрузить в Excel">${I("download")}<span class="hide-n">Excel</span></button></div>
      <div class="fbar"><div class="seg light sm" data-hl="wh-filter">${[["all", "Все склады"]].concat(st.WH.map((w) => [w.id, w.ru])).map(([k, t]) => `<button type="button" class="${f === k ? "on" : ""}" data-act="whF" data-k="${k}">${t}</button>`).join("")}</div><span class="grow"></span>
        <span class="chipb">${I("eye")}Только обзор. Работа с грузами на странице <span class="lnk" data-act="d" data-s="work">«Грузы»</span></span></div>
      <div class="board" id="board">${lanes}</div>
      <p class="muted mt foot">${I("info")}Нажмите на карточку: откроется большое окно с данными, историей, действиями по этапу и всеми грузами этого клиента на складе. У прибывших грузов отметка: хранение, готов к выдаче или выдают.</p>
    </div>`;
  }

  // ---------- «Грузы»: рабочая страница ----------
  function csel() { App.tmp.csel = (App.tmp.csel || []).filter((id) => { const r = st.rec(id); return r && !r.taskId && !r.cargoId; }); return App.tmp.csel; }
  function psel() { App.tmp.psel = (App.tmp.psel || []).filter((id) => { const c = st.cargo(id); return c && st.left(c) > 0; }); return App.tmp.psel; }
  function stockGroups() {
    const g = {}; st.waiting().filter(vis).forEach((r) => (g[r.clientId] = g[r.clientId] || []).push(r));
    const unk = st.unknown().filter(vis); if (unk.length) g.unk = unk;
    return g;
  }
  function codesHtml(g, cur) {
    const q = (App.tmp.wq || "").trim().toUpperCase(), keys = Object.keys(g).filter((k) => k !== "unk" && (!q || / · /.test(App.tmp.wq) || k.includes(q) || cname(k).toUpperCase().includes(q))).sort((a, b) => (g[b].some((r) => r.fresh) ? 1 : 0) - (g[a].some((r) => r.fresh) ? 1 : 0) || a.localeCompare(b));
    const row = (k, title, name) => `<button class="wc${cur === k ? " on" : ""}${k === "unk" ? " unk" : ""}${g[k].some((r) => r.fresh) ? " new" : ""}" type="button" data-act="wcode" data-c="${k}" data-wc="${k}"><span class="code">${title}</span><span class="nm">${name}</span><span class="cgn">${recsWord(g[k].length)} · ${u.places(g[k].reduce((a, r) => a + r.places, 0))}</span></button>`;
    return (keys.map((k) => row(k, E(k), E(cname(k)))).join("") || (q ? '<p class="muted s13 p0">Такого кода на складе нет</p>' : "")) + (g.unk && (!q || / · /.test(App.tmp.wq) || "НЕИЗВЕСТНЫЙ".includes(q)) ? row("unk", "Неизвестный", "без кода клиента") : "");
  }
  function gcard(r, on) {
    return `<div class="gc${on ? " on" : ""}${r.fresh ? " new" : ""}" data-gc="${E(r.id)}">
      ${r.photos.length ? `<button class="gc-ph" type="button" data-act="zoom" data-p="${r.photos[0]}" title="Увеличить фото" aria-label="Увеличить фото">${u.photo(r.photos[0])}${r.photos.length > 1 ? `<em>${r.photos.length} фото</em>` : ""}${r.damage ? '<i class="dmgi" title="Есть повреждение">!</i>' : ""}</button>` : `<div class="gc-ph none">${I("camera")}</div>`}
      <button class="gc-b" type="button" data-act="cgSel" data-id="${E(r.id)}"><span class="cb">${on ? I("check") : ""}</span>
        <span class="gc-t"><b class="mono">${r.track ? E(r.track) : "трек не указан"}</b><small>${r.clientId ? E(r.supplier) : E(st.noteText(r) || "Маркировки нет")}</small>
        <span class="gc-m">${u.places(r.places)} · принят ${u.dShort(r.at)} · ${E(whn(r.wh))}</span><span class="gc-m">Доставка до склада: ${E(delivText(r))}${r.extra ? ", доп. " + u.cny(r.extra) : ""}</span>
        ${r.damage ? `<span class="gc-m bad">Повреждение: ${E(st.noteText({ note: r.damage }))}</span>` : ""}${r.lost ? '<span class="gc-m bad">Не найден при сборке</span>' : ""}</span></button>
      <button class="x sm" type="button" data-act="openItem" data-t="rec" data-id="${E(r.id)}" title="Открыть карточку ${E(r.id)}" aria-label="Открыть карточку">${I("chevron")}</button></div>`;
  }
  function workStock() {
    const g = stockGroups(), keys = Object.keys(g), sel = csel(), asc = App.tmp.wsort === "old";
    let cur = App.tmp.wcode; if (!g[cur]) cur = App.tmp.wcode = keys.filter((k) => k !== "unk").sort()[0] || keys[0] || null;
    const rs = cur ? g[cur].slice().sort((a, b) => (asc ? a.at - b.at : b.at - a.at)) : [], chosen = rs.filter((r) => sel.includes(r.id)), n = chosen.length, unk = cur === "unk";
    if (!cur) return `<div class="wk"><div class="wk-l">${ta("wq", { q: App.tmp.wq, ph: "Код или название клиента", hl: "wq" })}<div class="wk-codes" id="wkCodes"></div></div><div class="wk-r"><div class="box muted">На складе нет грузов, которые ждут упаковки.</div></div></div>`;
    const head = `<div class="wk-h"><span class="tag code lg">${unk ? "Неизвестный" : E(cur)}</span><div class="grow"><b class="ell1">${unk ? "Грузы без кода клиента" : E(cname(cur))}</b><small data-hl="wk-sum">${recsWord(rs.length)} на складе · ${u.places(rs.reduce((a, r) => a + r.places, 0))} · самый старый лежит с ${u.dShort(Math.min(...rs.map((r) => r.at)))}</small></div>
        <button class="btn sm" type="button" data-act="wsort" title="Сортировка по дате приёмки">${I("clock")}${asc ? "Сначала старые" : "Сначала новые"}</button><button class="btn sm" type="button" data-act="cgAll" id="btnCgAll">${n === rs.length ? "Снять все" : "Выбрать все"}</button></div>`;
    const foot = `<div class="wk-foot" data-hl="wk-foot"><span class="wk-n">${n ? `Выбрано ${recsWord(n)}, ${u.places(chosen.reduce((a, r) => a + r.places, 0))}` : "Отметьте грузы галочками"}</span><span class="grow"></span>
        ${unk ? (can("bind") ? `${ta("wbind", { val: App.tmp.wbind, ph: "Код или название клиента", up: true })}<button class="btn pri" type="button" data-act="wbindGo" id="btnWbind" ${n && App.tmp.wbind ? "" : "disabled"}>${I("link")}Привязать к клиенту</button>` : '<span class="muted s13">Привязывает администратор</span>')
          : can("packcmd") ? `<button class="btn pri" type="button" data-act="orgOpen" id="btnOrg" data-hl="org-btn" ${n ? "" : "disabled"}>${I("layers")}Организовать упаковку</button>` : '<span class="muted s13">Упаковку организует администратор</span>'}</div>`;
    return `<div class="wk"><div class="wk-l">${ta("wq", { q: App.tmp.wq, ph: "Код или название клиента", hl: "wq" })}<div class="wk-codes" id="wkCodes">${codesHtml(g, cur)}</div></div>
      <div class="wk-r">${head}<div class="gcs">${rs.map((r) => gcard(r, sel.includes(r.id))).join("")}</div>${foot}</div></div>`;
  }
  function workPacking() {
    const list = st.openTasks().filter(vis).sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || b.at - a.at);
    return `<table class="tbl"><thead><tr><th>Наш трек-номер</th><th>Клиент</th><th>Наименование</th><th>Грузы</th><th>Упаковка и доставка</th><th>Статус</th><th>Склад</th></tr></thead><tbody>
      ${list.map((t) => `<tr class="click${t.fresh ? " fresh" : ""}" data-act="openItem" data-t="task" data-id="${E(t.id)}" data-wt="${E(t.id)}"><td><b class="mono">${E(t.id)}</b><div class="muted s12">${u.when(t.at)}</div></td><td><b>${E(t.clientId)}</b><div class="muted s12">${E(cname(t.clientId))}</div></td><td>${E(t.name) || '<span class="muted">не указано</span>'}</td><td>${recsWord(t.receiptIds.length)}<div class="muted s12">${u.places(st.taskPlaces(t))}</div></td><td>${E(plan(t.packPlan))}<div class="muted s12">${trText(t.transport)}</div></td><td>${tsPill(t)}</td><td class="muted">${E(whn(t.wh))}</td></tr>`).join("") || '<tr><td colspan="7" class="muted">Сейчас у склада нет заказов на упаковку</td></tr>'}
    </tbody></table><p class="muted s12 mt8">Откройте заказ: видно, что собирает склад. Если склад не успевает, администратор может сам отметить найденные грузы и внести упаковку.</p>`;
  }
  function workPacked() {
    const list = st.ready().filter(vis).sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || b.at - a.at), sel = psel();
    return `<div class="wk-bar"><span class="muted s13">Отметьте один или несколько грузов и отправьте: вид доставки, маршрут и место назначения увидит склад.</span><span class="grow"></span>${can("dispatch") ? `<button class="btn pri" type="button" data-act="sendOpen" id="btnSend" data-hl="send-btn" ${sel.length ? "" : "disabled"}>${I("send")}Отправить${sel.length ? " · " + sel.length : ""}</button>` : ""}</div>
      <table class="tbl"><thead><tr><th></th><th>Наш трек-номер</th><th>Клиент</th><th>Наименование</th><th>Упаковка</th><th class="r">Мест</th><th class="r">Вес</th><th class="r">Объём</th><th>Упакован</th><th></th></tr></thead><tbody>
      ${list.map((c) => { const on = sel.includes(c.id); return `<tr class="click${on ? " sel" : ""}${c.fresh ? " fresh" : ""}" data-act="pSel" data-id="${E(c.id)}" data-wp="${E(c.id)}"><td><span class="cb${on ? " on" : ""}">${on ? I("check") : ""}</span></td><td><b class="mono">${E(c.id)}</b></td><td><b>${E(c.clientId)}</b><div class="muted s12">${E(cname(c.clientId))}</div></td><td>${E(c.name) || '<span class="muted">не указано</span>'}</td><td>${E(st.packsText(c.packs))}</td><td class="r">${c.places}</td><td class="r">${u.kg(c.weight)}</td><td class="r">${u.vol(c.volume)}</td><td class="muted">${u.dShort(c.at)}<div class="s12">${E(whn(c.wh))}</div></td><td class="r"><button class="x sm" type="button" data-act="openItem" data-t="cargo" data-id="${E(c.id)}" title="Открыть карточку" aria-label="Открыть карточку">${I("chevron")}</button></td></tr>`; }).join("") || '<tr><td colspan="10" class="muted">Упакованных грузов нет: как только склад упакует, груз появится здесь</td></tr>'}
    </tbody></table>`;
  }
  function work() {
    const tab = ["stock", "packing", "packed"].includes(App.tmp.wtab) ? App.tmp.wtab : "stock";
    const n = { stock: st.waiting().filter(vis).length + st.unknown().filter(vis).length, packing: st.openTasks().filter(vis).length, packed: st.ready().filter(vis).length };
    return `<div class="pane">
      <div class="ph"><h1>Грузы</h1><div class="seg light" data-hl="wtabs">${[["stock", "На складе"], ["packing", "На упаковке"], ["packed", "Упакован"]].map(([k, t]) => `<button type="button" class="${tab === k ? "on" : ""}" data-act="wtab" data-k="${k}" data-wtab="${k}">${t}<b>${n[k]}</b></button>`).join("")}</div><span class="grow"></span>
        ${can("accept") ? `<button class="btn" type="button" data-act="acceptOpen" id="btnAcceptDesk">${I("plus")}Принять груз</button>` : ""}</div>
      ${tab === "stock" ? workStock() : tab === "packing" ? workPacking() : workPacked()}
    </div>`;
  }

  // ---------- большая карточка груза ----------
  function stageOf(t, o) {
    if (t === "rec") return !o.clientId ? "unk" : o.cargoId ? "pack" : o.taskId ? "packing" : "in";
    if (t === "task") return o.status === "done" ? "pack" : "packing";
    if (t === "cargo") { if (st.left(o) > 0) return "pack"; const s = st.ship(o.id); return s ? s.status : "pack"; }
    return o.status;
  }
  const getItem = (t, id) => (t === "rec" ? st.rec(id) : t === "task" ? st.task(id) : t === "cargo" ? st.cargo(id) : st.ship(id));
  const KIND = { rec: "Приход", task: "Заказ на упаковку", cargo: "Груз", ship: "Отправка" };
  const linkrow = (t, id, ic, title, sub) => `<button class="linkrow" type="button" data-act="openItem" data-t="${t}" data-id="${E(id)}">${I(ic)}<span><b>${title}</b><small>${sub}</small></span>${I("chevron")}</button>`;
  const photosHtml = (list) => (list.length ? `<div class="photos">${list.join("")}</div>` : `<div class="ph-none">${I("camera")}Фото не приложили</div>`);
  const recRow = (r) => linkrow("rec", r.id, "box", (r.track ? E(r.track) : E(r.id)) + " · " + E(r.supplier), E(r.id) + " · " + u.places(r.places) + " · принят " + u.dShort(r.at) + (r.damage ? " · есть повреждение" : ""));
  // форма упаковки за склад: найденные грузы, количество по видам, размеры, вес, фото
  function tpDraft(t) {
    let d = App.tmp.tp;
    if (!d || d.id !== t.id) d = App.tmp.tp = { id: t.id, found: t.receiptIds.slice(), packs: {}, dims: [{ l: "", w: "", h: "", n: "" }], weight: "", volMan: "", photos: [], note: "" };
    if (!d.dims.length) d.dims.push({ l: "", w: "", h: "", n: "" }); // хотя бы одна пустая строка размеров
    d.found = d.found.filter((id) => t.receiptIds.includes(id));
    return d;
  }
  const dimRow = (x, i, n) => `<div class="dimr" data-dim="${i}">${["l", "w", "h", "n"].map((k, j) => `<input class="inp" data-in="tpDim" data-i="${i}" data-k="${k}" inputmode="numeric" value="${E(x[k])}" placeholder="${["Длина", "Ширина", "Высота", "Мест"][j]}" aria-label="${["Длина", "Ширина", "Высота", "Мест"][j]}">${j < 3 ? '<i>×</i>' : ""}`).join("")}<button class="x sm" type="button" data-act="tpDimDel" data-i="${i}" aria-label="Убрать строку" ${n > 1 ? "" : "disabled"}>${I("x")}</button></div>`;
  function taskForm(t) {
    const d = tpDraft(t), rs = t.receiptIds.map(st.rec).filter(Boolean), vol = st.dimsVolume(d.dims);
    return `<div class="box act" data-hl="tp-box"><h3>${I("layers")}Упаковать за склад</h3><p>Обычно это делает кладовщик с телефона. Если склад не успевает, внесите данные сами: процесс не должен стоять.</p>
      ${t.status === "collect" ? `<div class="fld"><span>Найденные грузы</span><div class="tp-found">${rs.map((r) => `<button type="button" class="prow${d.found.includes(r.id) ? " on" : ""}" data-act="tpFound" data-id="${E(r.id)}"><span class="cb">${d.found.includes(r.id) ? I("check") : ""}</span><span class="ct"><b>${r.track ? E(r.track) : E(r.id)}</b><small>${E(r.supplier)} · ${u.places(r.places)}</small></span></button>`).join("")}</div></div>` : ""}
      <div class="fld mt8"><span>Количество по видам упаковки</span><div class="tp-packs">${st.PACK.map((k) => `<label><span>${L.t("pk_" + k)}</span><input class="inp" data-in="tpPack" data-k="${k}" inputmode="numeric" value="${E(d.packs[k] || "")}" placeholder="0"></label>`).join("")}</div></div>
      <div class="fld mt8"><span>Размеры, см: длина × ширина × высота × мест</span><div class="dims" id="tpDims">${d.dims.map((x, i) => dimRow(x, i, d.dims.length)).join("")}</div><button class="btn sm" type="button" data-act="tpDimAdd">${I("plus")}Добавить ещё</button></div>
      <div class="row3 mt8"><label class="fld"><span>Вес, кг</span><input class="inp" data-in="tpIn" data-k="weight" inputmode="decimal" value="${E(d.weight)}" placeholder="0"></label><div class="fld"><span>Объём по размерам</span><div class="inp ro" id="tpVol">${u.vol(vol)}</div></div><label class="fld"><span>Или вручную, м³</span><input class="inp" data-in="tpIn" data-k="volMan" inputmode="decimal" value="${E(d.volMan || "")}" placeholder="главнее размеров" id="tpVolMan"></label></div>
      <div class="fld mt8"><span>Фото упакованного груза</span><div class="cam sm">${d.photos.map((p) => `<div class="shot">${u.photo(p, t.packPlan[0] || "bag")}</div>`).join("")}${d.photos.length < 3 ? `<button class="add" type="button" data-act="tpPhoto">${I("camera")}<span>${d.photos.length ? "Ещё" : "Добавить"}</span></button>` : ""}</div></div>
      <button class="btn pri lg block mt" type="button" data-act="taskPack" data-id="${E(t.id)}" id="btnCardNext" ${d.found.length ? "" : "disabled"}>${I("check")}Упаковано</button></div>`;
  }
  function actionBox(t, o, stage) {
    const nextId = 'id="btnCardNext"', adm = !asId();
    if (stage === "unk") {
      return `<div class="box act warn"><h3>${I("alert")}Клиент не указан</h3><p>Склад принял груз без кода клиента${st.noteText(o) ? ": " + E(st.noteText(o).toLowerCase()) : ""}. Привяжите груз к клиенту, и он появится в его списке на складе.</p>
        ${can("bind") ? `${ta("bind", { val: App.tmp.bind, ph: "Начните вводить код или название", flow: true })}<button class="btn pri block mt8" type="button" data-act="bindGo" data-id="${E(o.id)}" ${nextId} ${App.tmp.bind ? "" : "disabled"}>${I("link")}Привязать к клиенту</button>` : '<p class="muted s13 p0">Привязывает администратор или сотрудник с доступом.</p>'}
        ${adm ? `<button class="btn ghost block mt8" type="button" data-act="recDel" data-id="${E(o.id)}">${I("x")}Удалить приход</button>` : ""}</div>`;
    }
    if (t === "rec" && stage === "in") {
      const n = st.waiting(o.wh).filter((r) => r.clientId === o.clientId).length;
      return `<div class="box act"><h3>${I("layers")}Следующий шаг: организовать упаковку</h3><p>У клиента на складе ${E(whn(o.wh))} ${n > 1 ? recsWord(n) + ": можно упаковать вместе" : "один груз"}. В этот момент грузу присваивается наш трек-номер, склад получает задачу.</p>
        ${can("packcmd") ? `<button class="btn pri lg block" type="button" data-act="orgOne" data-id="${E(o.id)}" ${nextId}>${I("layers")}Организовать упаковку</button>` : '<p class="muted s13 p0">Упаковку организует администратор или сотрудник с доступом.</p>'}
        ${adm ? `<button class="btn ghost block mt8" type="button" data-act="recDel" data-id="${E(o.id)}">${I("x")}Удалить приход</button>` : ""}</div>`;
    }
    if (t === "rec") return `<div class="box act"><h3>${I("layers")}${stage === "packing" ? "В заказе на упаковку" : "Упакован"}</h3>${linkrow(o.cargoId ? "cargo" : "task", o.cargoId || o.taskId, "box", E(o.cargoId || o.taskId), o.cargoId ? "приход вошёл в этот груз" : "склад собирает и упаковывает")}</div>`;
    if (t === "task" && stage === "packing") {
      return `<div class="box act"><h3>${I("bell")}${o.status === "collect" ? "Сборка: склад ищет грузы" : "Упаковка: склад пакует"}</h3><p class="p0">Задача у кладовщика: ${E(st.who(st.WH_STAFF[o.wh]))}, склад ${E(whn(o.wh))}. ${o.status === "collect" ? "Он отметит найденные грузы и передаст их на упаковку." : "Грузы собраны " + u.when(o.collectedAt) + ", осталось упаковать и внести размеры."}</p>
        ${adm ? `<button class="btn ghost block mt8" type="button" data-act="taskCancel" data-id="${E(o.id)}">${I("x")}Отменить заказ на упаковку</button>` : ""}</div>${can("packcmd") ? taskForm(o) : ""}`;
    }
    if (t === "task") return `<div class="box act"><h3>${I("check")}Упаковано</h3>${linkrow("cargo", o.id, "box", "Груз " + E(o.id), "упакован " + u.dShort(o.doneAt) + " · " + E(st.who(o.doneBy)))}</div>`;
    if (t === "cargo" && stage === "pack") {
      return `<div class="box act"><h3>${I("send")}Следующий шаг: отправка</h3><p>Груз упакован и ждёт отправки. Укажите вид доставки, маршрут и место назначения: их увидит склад, клиент получит уведомление.</p>
        ${can("dispatch") ? `<button class="btn pri lg block" type="button" data-act="sendOne" data-id="${E(o.id)}" ${nextId}>${I("send")}Отправить</button>` : '<p class="muted s13 p0">Отправляет администратор или сотрудник с доступом.</p>'}</div>`;
    }
    if (t === "cargo") { const s = st.ship(o.id); return `<div class="box act"><h3>${I("truck")}Отправлен</h3>${s ? linkrow("ship", s.id, "truck", "Отправка " + E(s.id), (seeRoute() ? "маршрут " + E(s.route) + " · " : "") + E(s.dest) + " · " + L.t("st_" + s.status).toLowerCase()) : ""}</div>`; }
    const editB = can("dispatch") ? `<button class="btn block mt8" type="button" data-act="shipEdit" data-id="${E(o.id)}">${I("edit")}Исправить данные отправки</button>` : "";
    if (stage === "way") return `<div class="box act"><h3>${I("truck")}В пути</h3>${App.D.tripHtml ? App.D.tripHtml(o, { key: "d", hl: "card-trip", auto: true }) : ""}<p class="mt8">${seeRoute() ? "Маршрут " + E(o.route) + ", " : ""}${E(o.dest)}. Этап и шкала меняются сами по дням, как у клиента. До конца шкала заполнится, когда вы отметите прибытие: груз ляжет на хранение, клиент получит уведомление.</p>
      ${can("arrive") ? `<button class="btn pri lg block" type="button" data-act="arrive" data-id="${E(o.id)}" data-arr="${E(o.id)}" ${nextId}>${I("pin")}Прибыл в Москву</button>` : '<p class="muted s13 p0">Прибытие отмечает администратор или сотрудник с доступом.</p>'}${editB}</div>`;
    const ord = st.issueOf(o), ordB = ord ? `<button class="btn block mt8" type="button" data-act="issOpen" data-id="${E(ord.id)}">${I("file")}Открыть заказ на выдачу ${E(ord.id)}</button>` : "";
    if (stage === "arrived" && o.sub === "store") return `<div class="box act" data-hl="iss-box"><h3>${I("wh")}На хранении в Москве</h3><p>Груз прибыл ${u.dLong(o.arrivedAt)} и лежит на складе в Москве. Дайте команду «Выдать»: склад увидит получателя, способ выдачи и сумму, которую нужно получить.</p>
      ${can("issuecmd") ? `<button class="btn pri lg block" type="button" data-act="issOne" data-id="${E(o.id)}" ${nextId}>${I("send")}Выдать</button>` : '<p class="muted s13 p0">Команду на выдачу даёт администратор или сотрудник с доступом.</p>'}</div>`;
    if (stage === "arrived" && o.sub === "ready") return `<div class="box act" data-hl="iss-box"><h3>${I("bell")}Готов к выдаче</h3><p>Команда на выдачу у склада в Москве: ${E(wayText(ord).toLowerCase())}${ord.collect ? ", получить оплату " + st.rub(ord.collectRub) : ""}. Склад нажмёт «Принят» и возьмёт выдачу в работу.</p>
      ${can("issue") ? `<button class="btn pri lg block" type="button" data-act="issAccept" data-id="${E(ord.id)}" ${nextId}>${I("check")}Принять за склад</button>` : ""}${ordB}</div>`;
    if (stage === "arrived") return `<div class="box act" data-hl="iss-box"><h3>${I("camera")}Выдают</h3><p>Склад в Москве принял выдачу в работу ${u.when(ord.acceptedAt)}. Осталось заполнить фотоотчёт и нажать «Готово»: груз уйдёт в архив.</p>
      ${can("issue") ? `<button class="btn pri lg block" type="button" data-act="repOpen" data-id="${E(o.id)}" ${nextId}>${I("camera")}Фотоотчёт и выдача</button>` : ""}${ordB}</div>`;
    return `<div class="box act"><h3>${I("check")}${o.issue && o.issue.type === "tk" ? "Передан в транспортную компанию" : "Выдан клиенту"}</h3><p class="p0">${o.issue && o.issue.type === "tk" ? E(o.issue.tk) + ", накладная " + E(o.issue.waybill) + ". " : o.issue && o.issue.way === "door" ? "Доставлен до двери. " : "Клиент забрал сам. "}${u.dLong(o.doneAt)} · ${E(st.who(o.doneBy))}</p>${ordB}</div>`;
  }
  // что было после прибытия: хранение, команда на выдачу, расходы, деньги, выдача. Тот же список у склада в Москве и в архиве
  const storyHtml = (s) => `<ol class="tl">${st.issueStory(s).map(([t, at, sub], i, a) => `<li class="${s.status === "done" || i < a.length - 1 ? "done" : "cur"}"><b>${E(t)}</b><small>${at ? u.dShort(at) + " · " + u.hm(at) + " · " : ""}${E(sub || "")}</small></li>`).join("")}</ol>`;
  // фотоотчёт склада в Москве в карточке выданного груза
  const repHtml = (s) => { const r = s.rep; if (!r) return ""; const x = st.REPX.filter(([k]) => r.exp[k] > 0), o = st.issueOf(s);
    return `<dl class="kv"><dt>Способ выдачи</dt><dd>${o ? E(wayText(o)) : s.issue.type === "tk" ? "Передать в ТК: " + E(s.issue.tk) : "Выдан клиенту"}</dd>${s.issue.type === "tk" ? `<dt>Накладная ТК</dt><dd class="mono">${E(s.issue.waybill)}</dd>` : ""}<dt>Повреждение</dt><dd>${r.damage ? `<span class="bad">${E(r.damage)}</span>` : "нет"}</dd>
      <dt>Расходы при выдаче</dt><dd>${x.length ? x.map(([k, t]) => t.toLowerCase() + " " + st.rub(r.exp[k])).join(", ") + (o ? ". Платит " + (o.payer === "client" ? "клиент" : "компания") : "") : "нет"}</dd>${o && o.gotRub ? `<dt>Получено с клиента</dt><dd class="ok">${st.rub(o.gotRub)}</dd>` : ""}${r.note ? `<dt>Примечание склада</dt><dd>${E(r.note)}</dd>` : ""}<dt>Выдал</dt><dd>${E(st.who(r.by))}, ${u.when(r.at)}</dd></dl>`; };
  const DOCS = ["Упаковочный лист", "Инвойс", "Накладная"];
  // строка «Наш трек-номер» в карточке: номер, отметка «задан вручную» и кнопка исправления
  const ttRow = (t, o) => `<dt>Наш трек-номер</dt><dd class="tt-dd"><b class="mono">${E(o.id)}</b>${(st.task(o.id) || {}).manual ? '<span class="muted s12">задан вручную</span>' : ""}${(t === "ship" ? can("dispatch") : can("packcmd")) ? `<button class="lnkb" type="button" data-act="${t === "ship" ? "shipEdit" : "ttEdit"}" data-t="${t}" data-id="${E(o.id)}" data-tte="${E(o.id)}">${I("edit")}Изменить</button>` : ""}</dd>`;
  // «Все грузы клиента на складе»: приняты и ждут упаковки, тот же список, что на рабочей странице «Грузы» → «На складе». Грузы не склеиваются
  function clientGoods(t, o) {
    if (!o.clientId) return "";
    const rs = st.waiting().filter((r) => r.clientId === o.clientId && vis(r)).sort((a, b) => b.at - a.at);
    if (!rs.length) return "";
    const cur = t === "rec" ? o.id : null;
    return `<section class="cg" data-hl="card-goods"><div class="cg-h"><div class="cg-t"><h3>${I("box")}Все грузы клиента на складе<b class="cg-n" id="cgCount">${rs.length}</b></h3><small>${E(o.clientId)} ${E(cname(o.clientId))}: ${recsWord(rs.length)}, ${u.places(rs.reduce((a, r) => a + r.places, 0))}, приняты и ждут упаковки. Нажмите на груз, чтобы открыть его карточку.</small></div>
        ${allowed("work") ? `<button class="btn sm" type="button" data-act="clientStock" data-c="${E(o.clientId)}" id="btnClientStock">${I("layers")}Открыть все грузы клиента</button>` : ""}</div>
      <div class="cg-l">${rs.map((r) => `<button class="cgc${r.id === cur ? " on" : ""}" type="button" data-act="openItem" data-t="rec" data-id="${E(r.id)}" data-cg="${E(r.id)}"${r.id === cur ? ' aria-current="true"' : ""}><span class="cgc-ph">${r.photos.length ? u.photo(r.photos[0]) : I("camera")}${r.damage ? '<i class="dmgi" title="Есть повреждение">!</i>' : ""}</span><span class="cgc-t"><b class="mono">${r.track ? E(r.track) : "трек не указан"}</b><small>${E(r.supplier)}</small><span class="cgc-m">${u.places(r.places)} · принят ${u.dShort(r.at)} · ${E(whn(r.wh))}</span></span></button>`).join("")}</div></section>`;
  }
  function cardHtml(t, id) {
    const o = getItem(t, id); if (!o || (o.clientId && !vis(o)) || (!o.clientId && !vis(o))) return "";
    const stage = stageOf(t, o), c = o.clientId ? st.client(o.clientId) : null, idx = STAGES.indexOf(stage), cg = t === "ship" ? st.cargo(o.id) : null, wid = cg ? cg.wh : o.wh;
    const steps = STAGES.map((k, i) => `<li class="${idx < 0 ? "todo" : i < idx || stage === "done" ? "done" : i === idx ? "cur" : "todo"}"><i>${i < idx || stage === "done" ? I("check") : i + 1}</i><span>${k === "done" && t === "ship" && o.status === "done" ? issuedText(o) : L.t("st_" + k)}</span></li>`).join("");
    const chain = st.chainIds(t, o), log = st.S.log.filter((e) => e.ids.some((x) => chain.includes(x)));
    const NEXT_T = { in: "Организовать упаковку", packing: "Сборка и упаковка на складе", pack: "Отправка", way: "Прибытие в Москву", arrived: o.sub === "store" ? "Команда «Выдать»" : o.sub === "ready" ? "Склад в Москве: «Принят»" : "Фотоотчёт и выдача", unk: "Привязать к клиенту" };
    const tl = log.map((e, i) => `<li class="${i === log.length - 1 && stage !== "done" ? "cur" : "done"}"><b>${E(rt(e.t))}</b><small>${u.dShort(e.at)} · ${u.hm(e.at)} · ${E(st.who(e.by))}</small></li>`).join("") + (NEXT_T[stage] ? `<li class="todo"><b>${NEXT_T[stage]}</b></li>` : "");
    let left = "";
    if (t === "rec") {
      left = photosHtml(o.photos.map((p, i) => `<div class="ph-i">${u.photo(p)}<em>приёмка ${i + 1}</em></div>`).concat((o.dmgPhotos || []).map((p) => `<div class="ph-i dmg">${u.photo(p)}<em>повреждение</em></div>`)))
        + `<dl class="kv"><dt>Склад</dt><dd>${E(whn(o.wh))}</dd><dt>Китайский трек-номер</dt><dd>${o.track ? E(o.track) : '<span class="muted">не указан</span>'}</dd>${c ? `<dt>Поставщик</dt><dd>${E(o.supplier)}</dd>` : ""}${o.what ? `<dt>Что внутри</dt><dd>${E(o.what)}</dd>` : ""}
          <dt>Количество мест</dt><dd>${u.places(o.places)}</dd><dt>Повреждение</dt><dd>${o.damage ? `<span class="bad">${E(st.noteText({ note: o.damage }))}</span>` : "нет"}</dd><dt>Доставка до склада</dt><dd>${E(delivText(o))}</dd><dt>Доп. расходы</dt><dd>${o.extra ? u.cny(o.extra) : "нет"}</dd>
          <dt>Примечание</dt><dd>${st.noteText(o) ? E(st.noteText(o)) : '<span class="muted">нет</span>'}</dd><dt>Принял</dt><dd>${E(st.who(o.by))}, ${u.when(o.at)}</dd></dl>`
        + ((o.deliv || o.extra) && seeMoney() ? `<div class="note">${I("yuan")}Расходы в Китае ${u.cny((o.deliv || 0) + (o.extra || 0))}: ${o.charged ? "уже включены в стоимость груза" : "добавятся к стоимости при отправке, клиент увидит сумму в кабинете"}.</div>` : "")
        + (o.lost ? '<div class="note warn">Склад не нашёл этот груз при сборке заказа. Он остался на складе, запись есть в истории.</div>' : "");
    } else if (t === "task") {
      left = `<dl class="kv">${ttRow(t, o)}<dt>Склад</dt><dd>${E(whn(o.wh))}, ${E(st.who(st.WH_STAFF[o.wh]))}</dd><dt>Наименование</dt><dd>${E(o.name) || '<span class="muted">не указано</span>'}</dd><dt>Заказанная упаковка</dt><dd>${E(plan(o.packPlan))}</dd><dt>Вид доставки</dt><dd>${trText(o.transport)}</dd>
          <dt>Примечание</dt><dd>${o.note ? E(o.note) : '<span class="muted">нет</span>'}</dd><dt>Дата</dt><dd>${u.dLong(o.date)}</dd><dt>Команду дал</dt><dd>${E(st.who(o.by))}, ${u.when(o.at)}</dd></dl>
        <div><h3 class="h3">Грузы в заказе: ${recsWord(o.receiptIds.length)}, ${u.places(st.taskPlaces(o))}</h3>${o.receiptIds.map(st.rec).filter(Boolean).map(recRow).join("")}</div>`;
    } else if (t === "cargo") {
      const recs = o.receiptIds.map(st.rec).filter(Boolean);
      left = photosHtml(o.photos.map((p) => `<div class="ph-i">${u.photo(p, o.packType)}<em>упаковка</em></div>`).concat(recs.filter((r) => r.photos.length).slice(0, 2).map((r) => `<div class="ph-i">${u.photo(r.photos[0])}<em>приёмка</em></div>`)))
        + `<dl class="kv">${ttRow(t, o)}<dt>Наименование</dt><dd>${E(o.name) || '<span class="muted">не указано</span>'}</dd><dt>Упаковка</dt><dd>${E(st.packsText(o.packs))}</dd><dt>Мест</dt><dd>${u.places(o.places)}</dd><dt>Вес и объём</dt><dd>${u.kg(o.weight)} · ${u.vol(o.volume)}${o.volManual ? ' <span class="st" data-st="pack" data-vm="1">вручную</span>' : ""}${o.volume ? " · " + Math.round(o.weight / o.volume) + " кг/м³" : ""}</dd>
          <dt>Размеры, см</dt><dd>${o.dims.map((x) => `${x.l} × ${x.w} × ${x.h}, ${u.places(x.n)}`).join("<br>") || '<span class="muted">не указаны</span>'}</dd><dt>Склад</dt><dd>${E(whn(o.wh))}, упаковал ${E(st.who(o.by))} ${u.dShort(o.at)}</dd>${o.note ? `<dt>Примечание</dt><dd>${E(o.note)}</dd>` : ""}</dl>
${o.packDiff ? `<div class="note warn" data-hl="pack-diff">Упаковано иначе: заказано ${E(plan(o.packPlan))}, фактически ${E(st.packsText(o.packs))}. Запись есть в истории действий.</div>` : ""}
        <div><h3 class="h3">Из чего собран груз</h3>${recs.map(recRow).join("")}</div>`;
    } else {
      const x = st.totals(o), has = (n) => o.docs.some((d) => d.name.indexOf(n) === 0), edit = can("dispatch"), ord = st.issueOf(o);
      left = (o.rep && o.rep.photos.length ? photosHtml(o.rep.photos.map((p) => `<div class="ph-i">${u.photo(p, cg ? cg.packType : undefined)}<em>выдача</em></div>`)) : cg && cg.photos.length ? photosHtml(cg.photos.map((p) => `<div class="ph-i">${u.photo(p, cg.packType)}<em>упаковка</em></div>`)) : "")
        + `<dl class="kv">${ttRow(t, o)}<dt>Вид доставки</dt><dd>${E(TR(o.transport).label)}</dd>${seeRoute() ? `<dt>Маршрут</dt><dd><b>${E(o.route)}</b></dd>` : ""}<dt>Место назначения</dt><dd>${E(o.dest)}</dd><dt>Отправлен</dt><dd>${u.dLong(o.sentAt)}</dd><dt>${o.status === "way" ? "Прибытие" : "Прибыл в Москву"}</dt><dd>${o.status === "way" ? "ориентировочно " + st.rangeText(st.trip(o).from, st.trip(o).to) : u.dLong(o.arrivedAt)}</dd>
          <dt>Мест</dt><dd>${u.places(x.places)}</dd><dt>Вес и объём</dt><dd>${u.kg(x.weight)} · ${u.vol(x.volume)}</dd>${o.status === "arrived" ? `<dt>Сейчас</dt><dd>${subPill(o)}</dd>` : ""}</dl>
        ${o.status !== "way" ? `<div data-hl="ship-story"><h3 class="h3">После прибытия</h3>${storyHtml(o)}${o.status === "done" ? repHtml(o) : ""}${ord && o.status !== "done" ? `<dl class="kv mt8"><dt>Получатель</dt><dd>${E(ord.recv.name) || '<span class="muted">не указан</span>'}${ord.recv.phone ? ", " + E(ord.recv.phone) : ""}</dd><dt>Адрес</dt><dd class="tt-dd">${E(ord.recv.addr) || '<span class="muted">не указан</span>'}${ord.recv.addr ? copyBtn(ord.recv.addr) : ""}</dd><dt>Способ выдачи</dt><dd>${E(wayText(ord))}</dd></dl>` : ""}</div>` : ""}
        ${cg ? `<div data-hl="ship-pack"><h3 class="h3">Груз и упаковка</h3><dl class="kv"><dt>Наименование</dt><dd>${E(cg.name) || '<span class="muted">не указано</span>'}</dd><dt>Упаковка</dt><dd>${E(st.packsText(cg.packs))}</dd>
          <dt>Размеры, см</dt><dd>${cg.dims.map((x) => `${x.l} × ${x.w} × ${x.h}, ${u.places(x.n)}`).join("<br>") || '<span class="muted">не указаны</span>'}</dd><dt>Плотность</dt><dd>${cg.volume ? Math.round(cg.weight / cg.volume) + " кг/м³" : '<span class="muted">нет объёма</span>'}</dd><dt>Склад</dt><dd>${E(whn(cg.wh))}, упаковал ${E(st.who(cg.by))} ${u.dShort(cg.at)}</dd></dl>
          ${linkrow("cargo", cg.id, "layers", "Карточка упаковки " + E(cg.id), E(st.packsText(cg.packs)) + " · склад " + E(whn(cg.wh)))}</div>
          <div data-hl="ship-recs"><h3 class="h3">Из чего собран груз: ${recsWord(cg.receiptIds.length)}</h3>${cg.receiptIds.map(st.rec).filter(Boolean).map(recRow).join("")}</div>` : ""}
        <div><h3 class="h3">Документы</h3>${o.docs.map((d) => `<div class="docrow">${I("file")}<span><b>${E(d.name)}</b><small>${u.dShort(d.at)} · ${E(st.who(d.by))}</small></span><button class="btn sm" type="button" data-act="toast" data-t="В рабочей версии файл скачается: ${E(d.name)}" data-i="download">Скачать</button></div>`).join("") || '<p class="muted small0">Документов пока нет.</p>'}
          ${edit ? `<div class="row wrap attach"><span class="muted">Прикрепить:</span>${DOCS.filter((n) => !has(n)).map((n) => `<button class="btn sm" type="button" data-act="addDoc" data-id="${E(o.id)}" data-n="${n}">${I("plus")}${n}</button>`).join("") || '<span class="muted">все документы на месте</span>'}</div>` : ""}</div>`;
    }
    const moneyBox = t === "ship" && seeMoney() ? (App.D.moneyBox ? App.D.moneyBox(o) : "") : "";
    return `<div class="cx" data-card="${t}:${E(id)}">
      <div class="cx-h"><div class="cx-t"><small>${KIND[t]}${wid ? " · склад " + E(whn(wid)) : ""}</small><h2>${E(o.id)}</h2></div>${pill(stage, true, t === "ship" && o.status === "done" ? issuedText(o) : null)}${t === "ship" ? subPill(o, true) : ""}
        ${c ? `<div class="cx-c"><span class="tag code${codeGo(c.id) ? " go" : ""}"${codeGo(c.id)}>${E(c.id)}</span>${allowed("clients") ? `<span class="lnk ell1" data-act="d" data-s="client" data-p="${E(c.id)}">${E(c.name)}</span>` : `<b class="ell1">${E(c.name)}</b>`}</div>` : '<div class="cx-c"><span class="tag">клиент не указан</span></div>'}
        <span class="grow"></span>${xBtn}</div>
      <ol class="cx-s">${steps}</ol>
      <div class="cx-b">${clientGoods(t, o)}<div class="cx-l">${left}</div>
        <div class="cx-r">${actionBox(t, o, stage)}${moneyBox}<div class="box"><h3>${I("history")}История груза</h3><ol class="tl">${tl}</ol></div></div></div></div>`;
  }
  // окно: открыть с анимацией или обновить на месте, если уже открыто такое же
  function setModal(html) {
    const m = $("modal"), a = document.activeElement, k = a && m.contains(a) && a.dataset && a.dataset.in ? a : null, key = k ? `[data-in="${k.dataset.in}"]${k.dataset.k ? `[data-k="${k.dataset.k}"]` : ""}${k.dataset.i ? `[data-i="${k.dataset.i}"]` : ""}` : "", pos = k ? k.selectionStart : 0, b = m.querySelector(".cx-b"), top = b ? b.scrollTop : m.scrollTop;
    m.innerHTML = html;
    const b2 = m.querySelector(".cx-b"); if (b2) b2.scrollTop = top; else m.scrollTop = top;
    if (key) { const n = m.querySelector(key); if (n) { n.focus({ preventScroll: true }); try { n.setSelectionRange(pos, pos); } catch (e) { /* не текстовое поле */ } } }
    if (App.scenario) App.scenario.decorate();
  }
  function show(kind, html, size) { if (App.modalOpen() && App.tmp.mk === kind) setModal(html); else { App.modal(html, size); App.tmp.mk = kind; } }
  function openItem(t, id) {
    const o = getItem(t, id); if (!o) return;
    const cur = App.tmp.card;
    if (!cur || cur.t !== t || cur.id !== id) App.tmp.bind = null;
    App.tmp.card = { t, id };
    const h = cardHtml(t, id); if (!h) return;
    show("card", h, "xl");
    if (o.fresh && !(App.scenario && App.scenario.on())) { o.fresh = false; st.save(); }
    if (App.scenario) App.scenario.check("openItem", t + ":" + id);
  }
  const redrawCard = () => { const c = App.tmp.card; if (c && App.modalOpen() && App.tmp.mk === "card") { const h = cardHtml(c.t, c.id); if (h) setModal(h); else App.closeDesk(); } };
  // номер TT общий у заказа, груза и отправки: открываем самую позднюю стадию
  const openById = (id) => { const t = st.ship(id) ? "ship" : st.cargo(id) ? "cargo" : st.task(id) ? "task" : st.rec(id) ? "rec" : null; if (t) openItem(t, id); else if (st.issueOrder(id) && App.D.issOpen) App.D.issOpen(id); };
  const confirmBox = (title, text, act, id, btn) => App.overlay(`<span class="opt">${I("alert")}<span class="ol">Подтверждение</span></span><h2>${title}</h2><p>${text}</p><div class="of"><button class="btn pri lg" type="button" data-act="${act}" data-id="${E(id)}" id="btnConfirm">${btn}</button><button class="btn lg" type="button" data-act="closeAny">Отмена</button></div>`);

  // ---------- поле «Наш трек-номер»: автоматический номер подставлен, его можно стереть и вписать свой ----------
  // k: чьё это поле (org, sed, tte); auto: автоматический номер; self: номер груза, который исправляют
  const TTF = {
    org: () => { const d = App.tmp.org; return d ? { d, auto: st.nextTT(d.clientId), self: null, btn: "btnOrgGo" } : null; },
    sed: () => { const d = App.tmp.sed; return d && st.ship(d.id) ? { d, auto: st.ttAutoFor(d.id), self: d.id, btn: "btnSedGo" } : null; },
    tte: () => { const d = App.tmp.tte; return d && (st.cargo(d.id) || st.task(d.id)) ? { d, auto: st.ttAutoFor(d.id), self: d.id, btn: "btnTteGo" } : null; },
  };
  function ttState(x) {
    const err = st.ttCheck(x.d.tt, x.self), id = st.ttNorm(x.d.tt);
    return { err, text: err || (id === x.auto ? (x.self ? "Автоматический номер" : "Автоматический номер, можно вписать свой") : id === x.self ? "Текущий номер, задан вручную" : "Номер задан вручную") };
  }
  function ttField(k, o) {
    const x = TTF[k](); if (!x) return "";
    const s = ttState(x);
    return `<div class="ttf${s.err ? " err" : ""}" data-ttf="${k}"><div class="ttf-r"><input class="inp mono" id="ttIn-${k}" data-in="ttIn" data-k="${k}" value="${E(x.d.tt)}" maxlength="24" placeholder="Впишите номер" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Наш трек-номер" aria-describedby="ttMsg-${k}"${o && o.enter ? ` data-enter="${o.enter}"` : ""}><button class="btn sm" type="button" data-act="ttAuto" data-k="${k}" id="ttAuto-${k}">${I("refresh")}Подставить автоматически</button></div><div class="ttf-m" id="ttMsg-${k}" role="status">${E(s.text)}</div></div>`;
  }
  // при наборе обновляем только сообщение и кнопку: поле не перерисовывается и не теряет курсор
  function ttPaint(k) {
    const x = TTF[k] && TTF[k](); if (!x) return;
    const s = ttState(x), box = document.querySelector(`[data-ttf="${k}"]`), msg = $("ttMsg-" + k), btn = $(x.btn);
    if (box) box.classList.toggle("err", !!s.err);
    if (msg) msg.textContent = s.text;
    if (btn) btn.disabled = !!s.err;
  }

  // ---------- окно «Организовать упаковку» ----------
  function orgOpen(ids, from) {
    const rs = ids.map(st.rec).filter((r) => r && r.clientId && !r.taskId && !r.cargoId); if (!rs.length) return;
    const f = rs[0], list = rs.filter((r) => r.clientId === f.clientId && r.wh === f.wh);
    App.tmp.org = { clientId: f.clientId, wh: f.wh, tt: st.nextTT(f.clientId), ids: list.map((r) => r.id), name: [...new Set(list.map((r) => r.what).filter(Boolean))].join(", ").slice(0, 60), packPlan: [], transport: "", note: "", value: "", date: dISO(Date.now()), from: from || null };
    orgModal();
  }
  function orgModal() {
    const d = App.tmp.org; if (!d) return;
    const c = st.client(d.clientId), rs = d.ids.map(st.rec).filter(Boolean);
    show("org", `<div class="mh"><div class="mi">${I("layers")}</div><div><h2>Организовать упаковку</h2><div class="muted s13">Команда складу ${E(whn(d.wh))}: ${E(st.who(st.WH_STAFF[d.wh]))} получит задачу</div></div>${xBtn}</div>
      <div class="org-top"><div class="tt-box" data-hl="org-tt"><small>Наш трек-номер</small>${ttField("org", { enter: "#btnOrgGo" })}</div><div class="tt-box plain"><small>Код клиента</small><b>${E(c.id)}</b><span class="muted s12 ell1">${E(c.name)}</span></div></div>
      <div class="fld mt"><span>Китайские треки из отмеченных карточек: ${recsWord(rs.length)}, ${u.places(rs.reduce((a, r) => a + r.places, 0))}</span><div class="chips">${rs.map((r) => `<span class="chipx"><b class="mono">${r.track ? E(r.track) : E(r.id)}</b><small>${u.places(r.places)}</small><button type="button" data-act="orgDrop" data-id="${E(r.id)}" aria-label="Убрать из заказа" ${rs.length > 1 ? "" : "disabled"}>${I("x")}</button></span>`).join("")}</div></div>
      <label class="fld mt"><span>Наименование</span><input class="inp" data-in="orgIn" data-k="name" value="${E(d.name)}" placeholder="Например: светильники и посуда" autocomplete="off"></label>
      <div class="fld mt"><span>Вид упаковки</span><div class="choice cols4" data-hl="org-pack">${st.PACK.map((k) => `<button type="button" class="${d.packPlan.includes(k) ? "on" : ""}" data-act="orgPack" data-k="${k}">${L.t("pk_" + k)}</button>`).join("")}</div></div>
      <div class="fld mt"><span>Вид доставки, если уже понятно</span><div class="choice cols4">${Object.keys(st.TRANSPORT).map((k) => `<button type="button" class="${k === d.transport ? "on" : ""}" data-act="orgTr" data-k="${k}">${I(TR(k).ic)}${TR(k).t}</button>`).join("")}<button type="button" class="${d.transport ? "" : "on"}" data-act="orgTr" data-k="">Пока не ясно</button></div></div>
      <div class="row2 mt"><label class="fld"><span>Примечание</span><input class="inp" data-in="orgIn" data-k="note" value="${E(d.note)}" placeholder="Например: хрупкое, проложить пенопластом" autocomplete="off"></label><label class="fld"><span>Дата</span><input class="inp" type="date" data-in="orgIn" data-k="date" value="${E(d.date)}"></label></div>
      ${seeMoney() ? `<label class="fld mt" data-hl="org-value"><span>Стоимость груза, $: для страховки ${E(u.num(st.S.dir.insPct, st.S.dir.insPct % 1 ? 1 : 0))}%</span><input class="inp" data-in="orgIn" data-k="value" inputmode="numeric" value="${E(d.value)}" placeholder="Можно указать позже, при отправке или в карточке груза" autocomplete="off"></label>` : ""}
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="orgGo" id="btnOrgGo" ${st.ttCheck(d.tt) ? "disabled" : ""}>${I("check")}Готово</button></div>`, "wide");
  }
  // ---------- окно «Исправить трек-номер»: заказ на упаковку и упакованный груз (у отправки поле в окне исправления данных) ----------
  function ttEditModal() {
    const d = App.tmp.tte, o = d && (st.cargo(d.id) || st.task(d.id)); if (!o) return;
    show("tte", `<div class="mh"><div class="mi">${I("edit")}</div><div><h2>Исправить трек-номер</h2><div class="muted s13">${E(o.clientId)} ${E(cname(o.clientId))}${o.name ? " · " + E(o.name) : ""}</div></div>${xBtn}</div>
      <div class="fld"><span>Наш трек-номер</span>${ttField("tte", { enter: "#btnTteGo" })}</div>
      <div class="note mt">${I("info")}Новый номер сразу увидят склад и клиент, клиент получит уведомление. Изменение попадёт в историю действий.</div>
      <div class="mf"><button class="btn" type="button" data-act="tteBack">Отмена</button><button class="btn pri" type="button" data-act="tteGo" id="btnTteGo" ${st.ttCheck(d.tt, d.id) ? "disabled" : ""}>${I("check")}Сохранить</button></div>`);
  }
  // ---------- окно «Отправить» и исправление отправки ----------
  function sendOpen(ids) {
    const cs = ids.map(st.cargo).filter((c) => c && st.left(c) > 0); if (!cs.length) return;
    const tr = cs.map((c) => c.transport).find((x) => st.TRANSPORT[x]) || "auto", cl = st.client(cs[0].clientId);
    const vals = {}; cs.forEach((c) => { vals[c.id] = c.value ? String(c.value) : ""; });
    App.tmp.snd = { ids: cs.map((c) => c.id), transport: tr, route: st.ROUTES[0], dest: cs.every((c) => c.clientId === cs[0].clientId) && st.DEST.includes(cl.city) ? cl.city : st.DEST[0], date: dISO(Date.now()), picked: false, values: vals };
    sendModal();
  }
  const shipFields = (d, p) => `<div class="fld"><span>Вид доставки</span><div class="choice cols3">${Object.keys(st.TRANSPORT).map((k) => `<button type="button" class="${k === d.transport ? "on" : ""}" data-act="${p}Tr" data-k="${k}">${I(TR(k).ic)}<span>${TR(k).t}<small>${TR(k).label.split(", ")[1]}</small></span></button>`).join("")}</div></div>
      ${seeRoute() ? `<div class="fld mt"><span>Маршрут</span><div class="choice cols4" data-hl="${p}-route">${st.ROUTES.map((k) => `<button type="button" class="${k === d.route ? "on" : ""}" data-act="${p}Route" data-k="${k}">${k}</button>`).join("")}</div></div>` : '<div class="note mt">Маршрут вам не показывается. Груз уйдёт с маршрутом по умолчанию, администратор может его исправить.</div>'}
      <div class="row2 mt"><label class="fld"><span>Место назначения</span><select class="inp" data-chg="${p}Dest">${[...new Set(st.DEST.concat(d.dest))].map((x) => `<option${x === d.dest ? " selected" : ""}>${E(x)}</option>`).join("")}</select></label><label class="fld"><span>Дата отправки</span><input class="inp" type="date" data-in="${p}In" data-k="date" value="${E(d.date)}"></label></div>`;
  function sendModal() {
    const d = App.tmp.snd; if (!d) return;
    const cs = d.ids.map(st.cargo).filter(Boolean);
    show("send", `<div class="mh"><div class="mi">${I("send")}</div><div><h2>Отправить</h2><div class="muted s13">${recsWord(cs.length)}, ${u.places(cs.reduce((a, c) => a + c.places, 0))}, ${u.kg(cs.reduce((a, c) => a + c.weight, 0))}</div></div>${xBtn}</div>
      <div class="fld"><span>Наши трек-номера</span><div class="chips">${cs.map((c) => `<span class="chipx"><b class="mono">${E(c.id)}</b><small>${E(c.clientId)} · ${u.places(c.places)}</small><button type="button" data-act="sndDrop" data-id="${E(c.id)}" aria-label="Убрать из отправки" ${cs.length > 1 ? "" : "disabled"}>${I("x")}</button></span>`).join("")}</div></div>
      <div class="mt">${shipFields(d, "snd")}</div>
      ${seeMoney() && App.D.sendCalc ? App.D.sendCalc(d, cs) : ""}
      <div class="found mt" id="sndEta">${sendEta(d)}</div>
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="sndGo" id="btnSendGo">${I("send")}Отправить</button></div>`, "wide");
  }
  // ожидаемая дата прибытия: срок в пути у агента маршрута (авиа быстрее)
  function sendEta(d) { const days = st.etaDays(d.route, d.transport), a = st.agentOf(d.route); return `${I("bell")}<span>Прибытие около ${u.dLong(Date.now() + days * u.DAY)}: ${days} ${u.plural(days, "день", "дня", "дней")} в пути${a && d.transport !== "air" && seeRoute() ? ", срок агента " + E(a.route) : ""}<small>склад увидит маршрут и место назначения, клиент получит уведомление: трек-номер, дата прибытия и стоимость</small></span>`; }
  function shipEditModal() {
    const d = App.tmp.sed, s = d && st.ship(d.id); if (!s) return;
    show("sed", `<div class="mh"><div class="mi">${I("edit")}</div><div><h2>Исправить данные отправки</h2><div class="muted s13"><span class="mono">${E(s.id)}</span> · ${E(s.clientId)} ${E(cname(s.clientId))}. Изменение попадёт в историю действий.</div></div>${xBtn}</div>
      <div class="fld"><span>Наш трек-номер</span>${ttField("sed", { enter: "#btnSedGo" })}</div>
      <div class="mt">${shipFields(d, "sed")}</div>
      ${seeMoney() ? `<label class="fld mt"><span>Стоимость, $</span><input class="inp" data-in="sedIn" data-k="cost" inputmode="numeric" value="${E(d.cost)}" data-enter="#btnSedGo"></label>` : ""}
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="sedGo" id="btnSedGo" ${st.ttCheck(d.tt, d.id) ? "disabled" : ""}>${I("check")}Сохранить</button></div>`, "wide");
  }

  // ---------- приёмка с компьютера (та же форма, что у склада) ----------
  let photoSeq = 700;
  function dacc() { if (!App.tmp.dacc) App.tmp.dacc = { wh: App.tmp.whF !== "all" ? App.tmp.whF : "yiwu", track: "", clientId: null, auto: false, supplier: "", what: "", expId: null, expAt: null, photos: [], places: 1, dmg: null, dmgText: "", dmgPhotos: [], dpay: null, deliv: "", extra: "", note: "" }; return App.tmp.dacc; }
  function acceptModal() {
    const d = dacc();
    show("accept", `<div class="mh"><div class="mi">${I("plus")}</div><div><h2>Принять груз</h2><div class="muted s13">Та же форма, что у склада на телефоне. Ни одно поле не обязательно.</div></div>${xBtn}</div>
      <div class="fld"><span>Склад</span><div class="choice cols4">${st.WH.map((w) => `<button type="button" class="${w.id === d.wh ? "on" : ""}" data-act="daWh" data-k="${E(w.id)}">${E(w.ru)}</button>`).join("")}</div></div>
      <div class="row2 mt"><div class="fld"><span>Код клиента${d.auto ? ' <em class="ok">нашёлся по треку</em>' : ""}</span>${ta("dacc", { val: d.clientId, ph: "Начните вводить код или название", hl: "ta-dacc" })}</div>
        <label class="fld"><span>Китайский трек-номер</span><input class="inp" data-in="daTrack" value="${E(d.track)}" placeholder="с наклейки на коробке" autocomplete="off" spellcheck="false"></label></div>
      <div class="row2 mt"><div class="fld"><span>Количество мест</span><div class="stepper"><button type="button" data-act="daPlaces" data-d="-1" aria-label="Меньше">${I("minus")}</button><input class="inp" data-in="daIn" data-k="places" inputmode="numeric" value="${E(d.places)}"><button type="button" data-act="daPlaces" data-d="1" aria-label="Больше">${I("plus")}</button></div></div>
        <div class="fld"><span>Фото груза</span><div class="cam sm">${d.photos.map((p) => `<div class="shot">${u.photo(p)}</div>`).join("")}${d.photos.length < 3 ? `<button class="add" type="button" data-act="daPhoto">${I("camera")}<span>${d.photos.length ? "Ещё" : "Добавить"}</span></button>` : ""}</div></div></div>
      <div class="row2 mt"><div class="fld"><span>Повреждение</span><div class="choice cols2"><button type="button" class="${d.dmg === "no" ? "on" : ""}" data-act="daDmg" data-k="no">Нет</button><button type="button" class="${d.dmg === "yes" ? "on" : ""}" data-act="daDmg" data-k="yes">Есть</button></div>${d.dmg === "yes" ? `<input class="inp mt8" data-in="daIn" data-k="dmgText" value="${E(d.dmgText)}" placeholder="Что повреждено"><div class="cam sm mt8">${d.dmgPhotos.map((p) => `<div class="shot">${u.photo(p)}</div>`).join("")}${d.dmgPhotos.length < 2 ? `<button class="add" type="button" data-act="daDmgPhoto">${I("camera")}<span>Фото</span></button>` : ""}</div>` : ""}</div>
        <div class="fld"><span>Доставка до склада</span><div class="choice cols2"><button type="button" class="${d.dpay === "supplier" ? "on" : ""}" data-act="daDoor" data-k="supplier">Оплатил поставщик</button><button type="button" class="${d.dpay === "wh" ? "on" : ""}" data-act="daDoor" data-k="wh">Оплатили мы</button></div>${d.dpay === "wh" ? `<input class="inp mt8" data-in="daIn" data-k="deliv" inputmode="numeric" value="${E(d.deliv)}" placeholder="Сумма, ¥">` : ""}</div></div>
      <div class="row2 mt"><label class="fld"><span>Доп. расходы, ¥</span><input class="inp" data-in="daIn" data-k="extra" inputmode="numeric" value="${E(d.extra)}" placeholder="0"></label><label class="fld"><span>Примечание</span><input class="inp" data-in="daIn" data-k="note" value="${E(d.note)}" placeholder="Всё, что важно знать о грузе" autocomplete="off"></label></div>
      <div class="note mt">${d.clientId ? "Клиент сразу получит уведомление, груз появится в его списке на складе." : "Без кода клиента груз уйдёт в «Неизвестные»: привязать его к клиенту можно позже."}</div>
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="daGo" id="btnDaGo">${I("check")}Принять</button></div>`, "wide");
  }
  function daMatch() { const d = dacc(), e = st.expectedByTrack(d.track); if (e && !d.expId) { d.expId = e.id; d.expAt = e.at; d.clientId = e.clientId; d.auto = true; d.supplier = e.supplier; d.what = e.what; return true; } if (!e && d.expId) { d.expId = null; d.expAt = null; d.auto = false; d.supplier = ""; d.what = ""; return true; } return false; }

  // ---------- клиенты ----------
  const offStaff = () => Object.keys(st.S.staff).filter((k) => st.S.staff[k].kind !== "wh");
  const birthText = (v) => { const t = fromISO(v); return t ? u.dFull(t) : ""; };
  const nv = (v) => (v ? E(v) : '<span class="muted">не указано</span>');
  function clients() {
    const S = st.S, q = App.tmp.clientsQ.trim().toUpperCase(), m = seeMoney();
    const rows = S.clients.filter((c) => mine(c.id) && (!q || [c.id, c.name, c.city, c.person, c.phone].some((x) => String(x || "").toUpperCase().includes(q)))).map((c) => {
      const a = st.waiting().filter((r) => r.clientId === c.id).length + st.openTasks().filter((x) => x.clientId === c.id).length + st.ready().filter((x) => x.clientId === c.id).length + S.ships.filter((s) => s.clientId === c.id && s.status !== "done").length;
      const d = st.money(c.id).debt;
      return `<tr class="click" data-act="d" data-s="client" data-p="${E(c.id)}" data-cl="${E(c.id)}"><td class="code">${E(c.id)}</td><td><b>${E(c.name) || '<span class="muted">без названия</span>'}</b><div class="muted s12">${E(c.person)}</div></td><td class="nw">${E(c.phone)}</td><td class="muted">${E(c.city)}</td><td class="muted">${c.salesId ? E(st.who(c.salesId)) : "не назначен"}</td><td class="r">${a}</td>${m ? `<td class="r ${d > 0.5 ? "bad" : "ok"}">${d > 0.5 ? u.usd(d) : "нет"}</td>` : ""}</tr>`;
    }).join("");
    return `<div class="pane">
      <div class="ph"><div><h1>Клиенты</h1><div class="sub">${acc() && acc().scope !== "all" ? "Сотрудник видит только тех клиентов, которых ему открыл администратор." : "У каждого клиента постоянный код: буква и три цифры. Его пишут на каждой коробке."}</div></div><span class="grow"></span>${asId() ? "" : `<button class="btn pri" type="button" data-act="clNew" id="btnNewClient">${I("plus")}Новый клиент</button>`}</div>
      <label class="search wide">${I("search")}<input data-in="clientsQ" value="${E(App.tmp.clientsQ)}" placeholder="Код, название, ФИО, телефон или город"></label>
      <table class="tbl"><thead><tr><th>Код</th><th>Компания и ФИО</th><th>Контактный номер</th><th>Город</th><th>Менеджер</th><th class="r">Активные грузы</th>${m ? '<th class="r">Не оплачено</th>' : ""}</tr></thead><tbody>${rows || `<tr><td colspan="${m ? 7 : 6}" class="muted">Никого не нашли</td></tr>`}</tbody></table>
    </div>`;
  }
  function client(id) {
    const c = st.client(id); if (!c || !mine(c.id)) return clients();
    const S = st.S, m = seeMoney(), mm = st.money(c.id), r = c.recv || {};
    const rows = S.ships.filter((s) => s.clientId === c.id && vis(s)).map((s) => ({ t: "ship", id: s.id, at: s.sentAt, st: s.status, sub: s, d: u.places(st.totals(s).places) + (seeRoute() ? " · маршрут " + s.route : "") + ", " + s.dest, cost: s }))
      .concat(st.ready().filter((x) => x.clientId === c.id && vis(x)).map((x) => ({ t: "cargo", id: x.id, at: x.at, st: "pack", d: st.packsText(x.packs) + " · " + u.kg(x.weight) })))
      .concat(st.openTasks().filter((x) => x.clientId === c.id && vis(x)).map((x) => ({ t: "task", id: x.id, at: x.at, st: "packing", d: recsWord(x.receiptIds.length) + " · " + (x.status === "collect" ? "сборка" : "упаковка") })))
      .concat(st.waiting().filter((x) => x.clientId === c.id && vis(x)).map((x) => ({ t: "rec", id: x.id, at: x.at, st: "in", d: x.supplier + " · " + u.places(x.places) })))
      .sort((a, b) => (a.st === "done" ? 1 : 0) - (b.st === "done" ? 1 : 0) || b.at - a.at);
    const exp = S.expected.filter((e) => e.clientId === c.id), nWh = rows.filter((x) => x.t !== "ship").length;
    return `<div class="pane">
      <div class="pback" data-act="d" data-s="clients">${I("back")}Клиенты</div>
      <div class="ph"><span class="tag code lg">${E(c.id)}</span><div><h1>${E(c.name) || "Клиент без названия"}</h1><div class="sub">${[c.city, c.person, c.phone].filter(Boolean).map(E).join(" · ")}${c.since ? " · клиент с " + E(c.since) + " года" : ""}</div></div><span class="grow"></span>${asId() ? "" : `<button class="btn" type="button" data-act="clEdit" data-c="${E(c.id)}" id="btnClientEdit">${I("edit")}Изменить</button>`}</div>
      <div class="kpis">
        <div class="kpi"><span>На складах в Китае</span><strong>${nWh}</strong><small>приходы, заказы на упаковку, упакованные</small></div>
        <div class="kpi"><span>В пути</span><strong>${S.ships.filter((s) => s.clientId === c.id && s.status === "way").length}</strong><small>грузы с нашим трек-номером</small></div>
        <div class="kpi"><span>Прибыли в Москву</span><strong>${S.ships.filter((s) => s.clientId === c.id && s.status === "arrived").length}</strong><small>хранение и выдача</small></div>
        ${m ? `<div class="kpi ${mm.debt > 0.5 ? "bad" : "hero"}"><span>Не оплачено</span><strong>${mm.debt > 0.5 ? u.usd(mm.debt) : "нет"}</strong><small>начислено всего ${u.usd(mm.charged)}</small></div>` : `<div class="kpi"><span>Ждёт посылок</span><strong>${exp.length}</strong><small>трек-номера внесены заранее</small></div>`}
      </div>
      <div class="grid2">
        <div class="col">
          <div class="box tblbox"><table class="tbl bare"><thead><tr><th>Груз</th><th>Статус</th><th>Состав</th>${m ? '<th class="r">Стоимость</th>' : ""}</tr></thead><tbody>
          ${rows.map((x) => `<tr class="click" data-act="openItem" data-t="${x.t}" data-id="${E(x.id)}"><td><b class="mono">${E(x.id)}</b><span class="muted s12 blk">${u.dShort(x.at)}</span></td><td>${x.st === "arrived" ? subPill(x.sub) : pill(x.st, false, x.st === "done" ? issuedText(x.sub) : null)}</td><td class="muted">${E(x.d)}</td>${m ? `<td class="r">${x.cost ? u.usd(x.cost.cost) + `<span class="s12 blk ${st.isPaid(x.cost) ? "ok" : "bad"}">${st.isPaid(x.cost) ? "оплачено" : "не оплачено"}</span>` : '<span class="muted">при отправке</span>'}</td>` : ""}</tr>`).join("") || '<tr><td colspan="4" class="muted">Грузов пока нет</td></tr>'}
          </tbody></table></div>
          <div class="box"><h3>${I("clock")}Ждёт посылок</h3>${exp.map((e) => `<div class="pline"><span><b>${E(e.track)}</b><small>${E(e.supplier)}${e.what ? " · " + E(e.what) : ""}</small></span><small class="muted">${u.when(e.at)}</small></div>`).join("") || '<p class="muted p0">Клиент пока не внёс ни одного трек-номера.</p>'}</div>
        </div>
        <div class="col">
          <div class="box" data-hl="cl-data"><h3>${I("user")}Данные клиента</h3><dl class="kv"><dt>Код</dt><dd><b>${E(c.id)}</b></dd><dt>ФИО</dt><dd>${nv(c.person)}</dd><dt>Название компании</dt><dd>${nv(c.name)}</dd><dt>Контактный номер</dt><dd>${nv(c.phone)}</dd><dt>Город</dt><dd>${nv(c.city)}</dd><dt>Дата рождения</dt><dd>${nv(birthText(c.birth))}</dd><dt>Менеджер</dt><dd>${c.salesId ? E(st.who(c.salesId)) : '<span class="muted">не назначен</span>'}</dd></dl></div>
          <div class="box" data-hl="cl-recv"><h3>${I("pin")}Получатель</h3><dl class="kv"><dt>ФИО получателя</dt><dd>${nv(r.name)}</dd><dt>Телефон</dt><dd>${nv(r.phone)}</dd><dt>Адрес</dt><dd class="tt-dd">${nv(r.addr)}${r.addr ? copyBtn(r.addr) : ""}</dd><dt>Способ выдачи</dt><dd>${st.WAY[r.way] ? E(wayText(r)) : '<span class="muted">не указан</span>'}</dd></dl><p class="muted s12 mt8 p0">Эти данные подставляются в окно «Выдать», их можно исправить для отдельной выдачи.</p></div>
          ${sec("money") ? `<div class="box"><h3>${I("dollar")}Тариф</h3><div class="pline mini"><span>${E(st.tariffLabel(c))}</span><span class="lnk" data-act="d" data-s="tariffs">Тарифы</span></div></div>` : ""}
          <div class="box"><h3>${I("pin")}Адреса складов для поставщиков</h3><p class="s13 p0 mb8">Клиент отправляет адрес поставщику, тот пишет код на каждой коробке.</p>
            ${st.S.dir.whs.map((w) => `<div class="addr"><b>${E(w.ru)}</b><span>${E(w.addr)} · 唛头 ${E(c.id)}${w.addrRu ? `<small class="muted blk">${E(w.addrRu)}</small>` : ""}</span></div>`).join("")}</div>
        </div>
      </div>
    </div>`;
  }
  // окно «Новый клиент» и «Изменить»: обязателен только код
  const clDef = (c) => (c ? { id: c.id, code: c.id, name: c.name || "", person: c.person || "", phone: c.phone || "", city: c.city || "", birth: c.birth || "", salesId: c.salesId || "", recv: Object.assign({ name: "", phone: "", addr: "", way: "pickup", tk: "" }, c.recv || {}) }
    : { id: null, code: "", name: "", person: "", phone: "", city: "", birth: "", salesId: "", recv: { name: "", phone: "", addr: "", way: "pickup", tk: "" } });
  const clErr = (d) => (d.id ? "" : st.clientCodeCheck(d.code));
  function clientModal() {
    const d = App.tmp.cl; if (!d) return;
    const err = clErr(d), r = d.recv;
    show("cl", `<div class="mh"><div class="mi">${I("user")}</div><div><h2>${d.id ? "Изменить клиента" : "Новый клиент"}</h2><div class="muted s13">Обязателен только код. Остальное можно заполнить позже.</div></div>${xBtn}</div>
      <div class="row2"><div class="fld"><span>Код клиента <b>*</b></span>${d.id ? `<div class="inp ro">${E(d.id)}</div><div class="ttf-m">Код не меняется: он написан на коробках клиента</div>` : `<div class="ttf${err && d.code ? " err" : ""}" data-ttf="cl"><input class="inp mono" data-in="clIn" data-k="code" value="${E(d.code)}" maxlength="4" placeholder="Например: D052" autocomplete="off" autocapitalize="characters" spellcheck="false" data-hl="cl-code"><div class="ttf-m" id="clMsg" role="status">${E(err || "Код свободен")}</div></div>`}</div>
        <label class="fld"><span>Название компании</span><input class="inp" data-in="clIn" data-k="name" value="${E(d.name)}" placeholder="Например: ТехноДом" autocomplete="off"></label></div>
      <div class="row2 mt"><label class="fld"><span>ФИО</span><input class="inp" data-in="clIn" data-k="person" value="${E(d.person)}" placeholder="Имя и фамилия" autocomplete="off"></label><label class="fld"><span>Контактный номер</span><input class="inp" data-in="clIn" data-k="phone" value="${E(d.phone)}" placeholder="+7 900 000-00-00" autocomplete="off" inputmode="tel"></label></div>
      <div class="row3 mt"><label class="fld"><span>Город</span><input class="inp" data-in="clIn" data-k="city" value="${E(d.city)}" placeholder="Москва" autocomplete="off"></label><label class="fld"><span>Дата рождения</span><input class="inp" type="date" data-in="clIn" data-k="birth" value="${E(d.birth)}"></label>
        <label class="fld"><span>Менеджер</span><select class="inp" data-chg="clSales"><option value="">Не назначен</option>${offStaff().map((k) => `<option value="${k}"${d.salesId === k ? " selected" : ""}>${E(st.S.staff[k].ru)}</option>`).join("")}</select></label></div>
      <h3 class="h3 mt2">Данные получателя</h3>
      <div class="row2"><label class="fld"><span>ФИО получателя</span><input class="inp" data-in="clRecv" data-k="name" value="${E(r.name)}" placeholder="Кто принимает груз" autocomplete="off"></label><label class="fld"><span>Телефон получателя</span><input class="inp" data-in="clRecv" data-k="phone" value="${E(r.phone)}" placeholder="+7 900 000-00-00" autocomplete="off" inputmode="tel"></label></div>
      <label class="fld mt"><span>Адрес</span><input class="inp" data-in="clRecv" data-k="addr" value="${E(r.addr)}" placeholder="Город, улица, дом, как проехать" autocomplete="off"></label>
      <div class="fld mt"><span>Способ выдачи по умолчанию</span><div class="choice cols3">${Object.keys(st.WAY).map((k) => `<button type="button" class="${r.way === k ? "on" : ""}" data-act="clWay" data-k="${k}">${I(st.WAY[k].ic)}${st.WAY[k].t}</button>`).join("")}</div></div>
      <div class="fld mt tk-row"${r.way === "tk" ? "" : " hidden"}><span>Транспортная компания</span><div class="choice cols3">${st.TK.map((k) => `<button type="button" class="${(r.tk || st.TK[0]) === k ? "on" : ""}" data-act="clTk" data-k="${k}">${k}</button>`).join("")}</div></div>
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="clGo" id="btnClGo" ${err ? "disabled" : ""}>${I("check")}${d.id ? "Сохранить" : "Создать клиента"}</button></div>`, "wide");
  }

  // ---------- сотрудники и доступы: один простой экран ----------
  const nstDef = () => ({ name: "", role: "", login: "", pass: "", preset: "", sec: {}, scope: "all", clients: [] });
  const tgChip = (act, k, on, label) => `<button type="button" class="chipt${on ? " on" : ""}" data-act="${act}" data-k="${k}"><span class="cb">${on ? I("check") : ""}</span>${label}</button>`;
  const prName = (k) => cap(st.PRESETS[k][0].replace("как ", ""));
  const SCOPES = [["all", "Все клиенты"], ["own", "Свои"], ["sel", "Выбранные"]];
  function staffModal() {
    const d = App.tmp.nst || (App.tmp.nst = nstDef());
    show("staff", `<div class="mh"><div class="mi">${I("user")}</div><div><h2>Новый сотрудник</h2><div class="muted s13">Достаточно имени, логина и пароля. Что он видит, можно задать сейчас или поменять позже.</div></div>${xBtn}</div>
      <div class="row2"><label class="fld"><span>Имя</span><input class="inp" data-in="nstIn" data-k="name" value="${E(d.name)}" placeholder="Имя и фамилия" autocomplete="off" data-hl="nst-name"></label><label class="fld"><span>Должность</span><input class="inp" data-in="nstIn" data-k="role" value="${E(d.role)}" placeholder="Например: менеджер" autocomplete="off"></label></div>
      <div class="row2 mt"><label class="fld"><span>Логин</span><input class="inp" data-in="nstIn" data-k="login" value="${E(d.login)}" placeholder="латиницей" autocomplete="off" spellcheck="false"></label><label class="fld"><span>Пароль</span><input class="inp" data-in="nstIn" data-k="pass" value="${E(d.pass)}" placeholder="сотрудник сменит при первом входе" autocomplete="off"></label></div>
      <div class="fld mt"><span>Набор прав одной кнопкой</span><div class="choice cols3" data-hl="nst-preset">${Object.keys(st.PRESETS).map((k) => `<button type="button" class="${d.preset === k ? "on" : ""}" data-act="nstPreset" data-k="${k}">${prName(k)}</button>`).join("")}</div></div>
      <div class="fld mt"><span>Разделы, которые он видит</span><div class="chips">${st.SECTIONS.map(([id, t]) => tgChip("nstSec", id, !!d.sec[id], t)).join("")}</div></div>
      <div class="fld mt"><span>Клиенты</span><div class="row wrap"><div class="seg light sm">${SCOPES.map(([k, t]) => `<button type="button" class="${d.scope === k ? "on" : ""}" data-act="nstScope" data-k="${k}">${t}</button>`).join("")}</div><span class="muted s12">${d.scope === "own" ? "видит только тех, где он указан менеджером" : d.scope === "sel" ? "видит только отмеченных" : "видит всех"}</span></div>
        ${d.scope !== "all" ? `<div class="chips mt8" data-hl="nst-clients">${st.S.clients.map((c) => tgChip("nstClient", c.id, d.clients.includes(c.id), E(c.id) + " " + E(c.name))).join("")}</div>${d.scope === "own" ? '<div class="muted s12 mt8">Отмеченные клиенты закрепятся за ним как за менеджером. Это же можно сделать в карточке клиента.</div>' : ""}` : ""}</div>
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="nstGo" id="btnNstGo">${I("check")}Создать</button></div>`, "wide");
  }
  const ownClients = (k) => st.S.clients.filter((c) => c.salesId === k).map((c) => c.id);
  // сводка «что он видит» простым текстом
  function accSummary(k) {
    const a = st.S.access[k], secs = st.SECTIONS.filter(([id]) => a.sec[id]).map((x) => x[1] + (x[0] === "ships" && !a.fn.way ? " (прибывшие и архив)" : "")), fns = st.FUNCS.filter(([id]) => !/^(cost|route|way)$/.test(id) && a.fn[id]).map((x) => x[1].toLowerCase()), own = ownClients(k);
    return `<p><b>Разделы:</b> ${secs.join(", ") || "пока ничего не открыто"}.</p><p><b>Клиенты:</b> ${a.scope === "sel" ? (a.clients.length ? "только выбранные: " + a.clients.map(E).join(", ") : "выбранные, пока никто не отмечен") : a.scope === "own" ? (own.length ? "только свои, где он указан менеджером: " + own.map(E).join(", ") : "только свои, пока он не указан менеджером ни у одного клиента") : "все"}.</p>
      <p><b>Действия:</b> ${fns.join(", ") || "только просмотр"}.</p><p><b>Деньги:</b> ${a.fn.cost ? "видит стоимость и оплаты" : "стоимость и оплаты не видит"}. <b>Маршрут:</b> ${a.fn.route ? "виден" : "скрыт"}.</p>`;
  }
  function accClients(sel, a) {
    const q = (App.tmp.accq || "").trim().toUpperCase(), own = a.scope === "own";
    return st.S.clients.filter((c) => !q || c.id.includes(q) || c.name.toUpperCase().includes(q)).map((c) => { const on = own ? c.salesId === sel : a.clients.includes(c.id); return `<button type="button" class="prow${on ? " on" : ""}" data-act="accClient" data-c="${E(c.id)}" data-ac="${E(c.id)}"><span class="cb">${on ? I("check") : ""}</span><span class="ct"><b>${E(c.id)}</b><small>${E(c.name)}${own && c.salesId && !on ? " · менеджер " + E(st.who(c.salesId)) : ""}</small></span></button>`; }).join("") || '<p class="muted s13 p0">Никого не нашли</p>';
  }
  function staff() {
    const S = st.S, sel = S.staff[App.tmp.staffSel] ? App.tmp.staffSel : "olga", p = S.staff[sel], a = S.access[sel];
    const meta = (k) => { const x = S.staff[k], ac = S.access[k]; return x.kind === "admin" ? "полный доступ" : x.kind === "wh" ? "телефон склада" : st.SECTIONS.filter(([id]) => ac.sec[id]).length + " разд. · " + (ac.scope === "sel" ? ac.clients.length + " кл." : ac.scope === "own" ? "свои: " + ownClients(k).length : "все клиенты"); };
    const list = Object.keys(S.staff).map((k) => { const x = S.staff[k]; return `<button class="stf${k === sel ? " on" : ""}" type="button" data-act="staffSel" data-k="${k}" data-stf="${k}"><span class="ava sm">${E(x.ava)}</span><span class="ct"><b>${E(x.ru)}</b><small>${E(x.role)} · ${E(x.where)}</small></span><span class="stf-m">${meta(k)}</span></button>`; }).join("");
    const loginRow = `<div class="acc-login"><div><small>Логин</small><b>${E(p.login)}</b></div><div><small>Пароль</small><b>••••••••</b></div>${p.kind === "admin" ? "" : `<button class="btn sm" type="button" data-act="toast" data-t="Новый пароль отправлен сотруднику: ${E(p.ru)}" data-i="key">${I("key")}Сбросить пароль</button>`}</div>`;
    const head = (tag) => `<div class="acc-h"><span class="ava">${E(p.ava)}</span><div><h2>${E(p.ru)}</h2><small>${E(p.role)} · ${E(p.where)}</small></div><span class="grow"></span>${tag}</div>`;
    let panel;
    if (p.kind === "admin") {
      panel = `${head('<span class="st lg" data-st="in">полный доступ</span>')}${loginRow}<div class="note">${I("shield")}Администратор видит все разделы, всех клиентов и деньги и может сам выполнить любой шаг: принять груз, организовать упаковку, упаковать за склад, отправить, принять и выдать за склад в Москве. Только он создаёт сотрудников и задаёт, что они видят.</div>`;
    } else if (p.kind === "wh") {
      panel = `${head('<span class="st lg" data-st="pack">права склада</span>')}${loginRow}
        <div class="box flat acc-sum"><h3>${I("eye")}Что он видит</h3><p><b>Телефон склада:</b> приёмка, задачи на сборку, упаковка, упакованные грузы и отчёт. Только свой склад: ${E(p.where)}.</p><p><b>Деньги:</b> стоимость и оплаты сотрудникам в Китае не показываются.</p><p class="p0"><b>Язык:</b> 中文 или русский, переключается одной кнопкой.</p></div>
        <div class="row wrap"><button class="btn" type="button" data-act="mode" data-mode="wh">${I("phone")}Открыть телефон склада</button></div>`;
    } else {
      const row = (kind, [id, t, s]) => `<div class="acc-r"><span><b>${t}</b><small>${s}</small></span><button class="sw${a[kind][id] ? " on" : ""}" type="button" data-act="accTgl" data-kind="${kind}" data-key="${E(id)}" data-sw="${kind}:${id}" aria-label="${t}"><i></i></button></div>`, fn = (k) => st.FUNCS.find((x) => x[0] === k);
      panel = `${head(`<button class="btn pri" type="button" data-act="viewAs" data-k="${sel}" id="btnViewAs">${I("eye")}Войти под этим сотрудником</button>`)}${loginRow}
        <div class="box flat acc-sum" data-hl="acc-sum"><h3>${I("eye")}Что он видит</h3>${accSummary(sel)}</div>
        <div class="acc-g"><h3>Набор прав одной кнопкой</h3><div class="row wrap" data-hl="acc-presets">${Object.keys(st.PRESETS).map((k) => `<button class="btn sm${a.preset === k ? " cur" : ""}" type="button" data-act="accPreset" data-k="${k}" data-pr="${k}">${prName(k)}</button>`).join("")}<span class="muted s12">дальше можно править вручную</span></div>
          ${a.preset === "mskwh" ? `<p class="muted s12 mt8 p0">На складе он работает с телефона: <span class="lnk" data-act="mode" data-mode="msk">открыть телефон склада в Москве</span>.</p>` : ""}</div>
        <div class="acc-cols"><div class="acc-g" data-hl="acc-sec"><h3>Разделы</h3>${st.SECTIONS.map((x) => row("sec", x)).join("")}${row("fn", fn("cost"))}${row("fn", fn("route"))}</div>
          <div class="acc-g"><h3>Клиенты</h3><div class="seg light sm" data-hl="acc-scope">${SCOPES.map(([k, t]) => `<button type="button" class="${a.scope === k ? "on" : ""}" data-act="accScope" data-v="${k}">${t}</button>`).join("")}</div>
            ${a.scope !== "all" ? `<p class="muted s12 mt8 p0">${a.scope === "own" ? "Свои клиенты: те, где сотрудник указан менеджером. Отметьте клиента, и он закрепится за ним." : "Сотрудник видит только отмеченных клиентов."}</p><label class="search mt8">${I("search")}<input data-in="accQ" value="${E(App.tmp.accq || "")}" placeholder="Код или название, Enter отмечает" autocomplete="off" data-hl="acc-q"></label><div class="acc-cl" id="accCl">${accClients(sel, a)}</div>` : '<p class="muted s13 mt8 p0">Сотрудник видит грузы всех клиентов. Чтобы ограничить, выберите «Свои» или «Выбранные».</p>'}</div></div>`;
    }
    return `<div class="pane">
      <div class="ph"><div><h1>Настройки</h1></div><span class="grow"></span><button class="btn pri" type="button" data-act="nstOpen" id="btnNewStaff">${I("plus")}Новый сотрудник</button></div>
      ${App.D.setTabs ? App.D.setTabs("staff") : ""}
      <div class="note acc-note">${I("info")}Вы сами создаёте сотрудника и задаёте, что он видит. Он входит по своему логину и паролю на этот же адрес.</div>
      <div class="acc"><div class="stf-l">${list}</div><div class="box acc-p" data-hl="acc-p">${panel}</div></div>
    </div>`;
  }
  // заглушка для сотрудника, которому пока ничего не открыли
  function none() {
    return `<div class="pane"><div class="empty-s"><span class="mi">${I("lock")}</span><h2>Вам пока не открыт ни один раздел</h2><p>Администратор откроет нужные разделы в «Настройках», и они сразу появятся в меню слева.</p></div></div>`;
  }

  // ---------- история действий ----------
  const LK = { news: ["Новости", "in"], accept: ["Приёмка", "in"], unknown: ["Приёмка", "unk"], bind: ["Привязка клиента", "in"], packcmd: ["Организация упаковки", "pack"], tt: ["Трек-номер", "pack"], collected: ["Сборка", "pack"], lost: ["Не найден", "unk"], packed: ["Упаковка", "pack"], packdiff: ["Упаковано иначе", "unk"], dispatch: ["Отправка", "way"], edit: ["Изменение", "arrived"], delete: ["Удаление", "unk"], arrive: ["Прибытие", "arrived"], issuecmd: ["Команда на выдачу", "arrived"], issueacc: ["Принят складом", "arrived"], issue: ["Выдача", "done"], pay: ["Оплата", "in"], money: ["Деньги", "pack"], apay: ["Оплата агенту", "way"], dir: ["Настройки", "wait"], wop: ["Взаиморасчёты", "way"], client: ["Клиент", "wait"], access: ["Доступ", "wait"], doc: ["Документ", "wait"], expected: ["Трек клиента", "wait"] };
  // к какому грузу относится запись: наш трек-номер, если он есть в цепочке, иначе номер прихода
  const logRef = (e) => e.ids.find((x) => !/^П-0\d+$/.test(x)) || e.ids[0];
  function histList() {
    const h = App.tmp.hist, q = h.q.trim().toUpperCase();
    // точный номер груза показывает всю цепочку: от приёмки до выдачи (наш трек-номер может быть и вписанным вручную)
    const tt = st.ship(q) || st.cargo(q) || st.task(q), r = tt ? null : st.rec(q), chain = tt ? st.chainIds("cargo", tt.receiptIds ? tt : st.cargo(q) || tt) : r ? st.chainIds("rec", r) : null;
    return st.S.log.filter((e) => (!e.c || mine(e.c)) && (h.who === "all" || e.by === h.who || (h.who === "clients" && String(e.by).indexOf("c:") === 0))
      && (!q || (chain ? e.ids.some((id) => chain.includes(id)) : e.ids.some((id) => id.toUpperCase().includes(q)) || (e.c || "").includes(q) || e.t.toUpperCase().includes(q)))).reverse();
  }
  function history() {
    const h = App.tmp.hist, list = histList(), shown = list.slice(0, h.all ? 400 : 30), S = st.S;
    const rows = shown.map((e) => { const k = LK[e.k] || ["Действие", "wait"], p = S.staff[e.by], ref = logRef(e); return `<tr${ref ? ` class="click" data-act="histOpen" data-id="${E(ref)}"` : ""} data-log="${E(e.id)}"><td class="nw">${u.dShort(e.at)} <span class="muted">${u.hm(e.at)}</span></td><td><span class="row"><span class="ava sm${p ? "" : " cl"}">${p ? E(p.ava) : I("user")}</span><span class="ct"><b>${E(st.who(e.by))}</b><small>${p ? E(p.role) : "кабинет клиента"}</small></span></span></td><td>${pill(k[1], false, k[0])}</td><td>${E(cap(rt(e.t).replace(/^[^:]{3,34}: /, "")))}</td><td class="r muted">${ref ? `<span class="hid mono">${E(ref)}</span>` : ""}</td></tr>`; }).join("");
    return `<div class="pane">
      <div class="ph"><div><h1>История действий</h1><div class="sub">Кто, когда и что добавил, изменил или удалил: приёмка, упаковка, отправки, прибытие, выдача, оплаты, деньги по трекам, оплаты агентам, взаиморасчёты, клиенты, доступы, настройки. Записи нельзя изменить.</div></div><span class="grow"></span><button class="btn" type="button" data-act="exportHist">${I("download")}Выгрузить в Excel</button></div>
      <div class="fbar hist-f"><select class="inp sm" data-chg="histWho" aria-label="Сотрудник" data-hl="hist-who"><option value="all">Все сотрудники</option>${Object.keys(S.staff).map((k) => `<option value="${k}"${h.who === k ? " selected" : ""}>${E(S.staff[k].ru)} · ${E(S.staff[k].role)}</option>`).join("")}<option value="clients"${h.who === "clients" ? " selected" : ""}>Клиенты</option></select>
        <label class="search" data-hl="hist-q">${I("search")}<input data-in="histQ" value="${E(h.q)}" placeholder="Трек-номер груза или код клиента"></label>${h.q || h.who !== "all" ? `<button class="btn sm ghost" type="button" data-act="histClear">${I("x")}Сбросить</button>` : ""}<span class="grow"></span><span class="muted s13">${list.length} ${u.plural(list.length, "запись", "записи", "записей")}</span></div>
      <table class="tbl hist" data-hl="hist-t"><thead><tr><th>Когда</th><th>Кто</th><th>Действие</th><th>Что сделано</th><th class="r">Груз</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="muted">По этому фильтру записей нет</td></tr>'}</tbody></table>
      ${list.length > shown.length ? `<button class="btn block mt" type="button" data-act="histAll">Показать все ${list.length}</button>` : ""}
    </div>`;
  }

  // ---------- действия ----------
  const csvDl = (name, rows, okText) => App.toast(u.download(name, u.csv(rows)) ? okText || "Файл " + name + " скачан, открывается в Excel" : "Браузер не дал скачать файл", "download");
  // открытое окно перерисовывается на месте, когда меняются данные; окна из других файлов добавляются в App.D.modals
  const MODALS = { card: () => redrawCard(), accept: () => acceptModal(), org: () => orgModal(), send: () => sendModal(), sed: () => shipEditModal(), tte: () => ttEditModal(), staff: () => staffModal(), cl: () => clientModal() };
  function redraw() { const fn = MODALS[App.tmp.mk]; if (App.modalOpen() && fn) fn(); }
  const acts = {
    openItem: (d) => openItem(d.t, d.id),
    histOpen: (d) => openById(d.id),
    whF: (d) => { App.tmp.whF = d.k; App.refresh(true); },
    laneAll: (d) => { App.tmp.laneAll = App.tmp.laneAll || {}; App.tmp.laneAll[d.k] = !App.tmp.laneAll[d.k]; App.refresh(true); },
    // рабочая страница «Грузы»
    wtab: (d) => { App.tmp.wtab = d.k; App.refresh(true); if (App.scenario) App.scenario.check("wtab", d.k); },
    wcode: (d) => { App.tmp.wcode = d.c; App.tmp.csel = []; App.tmp.wbind = null; App.refresh(true); },
    cgSel: (d) => {
      const r = st.rec(d.id), sel = csel(); if (!r) return;
      if (sel.length && st.rec(sel[0]).wh !== r.wh && r.clientId) { App.tmp.csel = [d.id]; App.toast("В один заказ на упаковку идут грузы с одного склада", "info"); }
      else { const i = sel.indexOf(d.id); if (i >= 0) sel.splice(i, 1); else sel.push(d.id); }
      App.refresh(true);
    },
    cgAll: () => { const g = stockGroups()[App.tmp.wcode] || [], sel = csel(); App.tmp.csel = sel.length === g.length ? [] : g.filter((r) => !r.clientId || r.wh === g[0].wh).map((r) => r.id); App.refresh(true); },
    orgOpen: () => { const sel = csel(); if (sel.length) orgOpen(sel.slice(), null); },
    orgOne: (d) => orgOpen([d.id], "card"),
    orgDrop: (d) => { const o = App.tmp.org; if (o && o.ids.length > 1) { o.ids = o.ids.filter((x) => x !== d.id); orgModal(); } },
    orgPack: (d) => { const o = App.tmp.org, i = o.packPlan.indexOf(d.k); if (i >= 0) o.packPlan.splice(i, 1); else o.packPlan.push(d.k); o.picked = true; orgModal(); },
    orgTr: (d) => { App.tmp.org.transport = d.k; orgModal(); },
    orgFill: () => { const o = App.tmp.org; if (!o) return; o.name = o.name || "Светильники и посуда"; if (!o.packPlan.length) o.packPlan = ["crate"]; o.transport = o.transport || "auto"; o.note = o.note || "Хрупкое, проложить пенопластом"; o.picked = true; orgModal(); },
    orgGo: () => {
      const o = App.tmp.org; if (!o || !o.ids.length || st.ttCheck(o.tt)) return;
      const t = st.organize(o.ids.slice(), { tt: o.tt, name: o.name, packPlan: o.packPlan, transport: o.transport, note: o.note, value: u.parse(o.value), date: fromISO(o.date), by: actor() });
      App.tmp.org = null; App.tmp.csel = [];
      if (!t) { App.closeDesk(); return; }
      if (o.from === "card") openItem("task", t.id); else App.closeDesk();
      App.toast(`Упаковка организована: трек-номер ${t.id}, склад ${whn(t.wh)} получил задачу`, "layers");
      if (App.scenario) App.scenario.check("packcmd", t);
    },
    wbindGo: () => { const sel = csel(), c = App.tmp.wbind; if (!sel.length || !c) return; sel.forEach((id) => st.assignUnknown(id, c, actor())); App.tmp.csel = []; App.tmp.wbind = null; App.tmp.wcode = c; App.toast(`Привязано к клиенту ${c} ${cname(c)}: ${recsWord(sel.length)}`, "check"); },
    pSel: (d) => { const sel = psel(), i = sel.indexOf(d.id); if (i >= 0) sel.splice(i, 1); else sel.push(d.id); App.refresh(true); },
    sendOpen: () => { const sel = psel(); if (sel.length) sendOpen(sel.slice()); },
    sendOne: (d) => sendOpen([d.id]),
    sndDrop: (d) => { const o = App.tmp.snd; if (o && o.ids.length > 1) { o.ids = o.ids.filter((x) => x !== d.id); sendModal(); } },
    sndTr: (d) => { App.tmp.snd.transport = d.k; sendModal(); },
    sndRoute: (d) => { App.tmp.snd.route = d.k; App.tmp.snd.picked = true; sendModal(); },
    sndFill: () => { const o = App.tmp.snd; if (!o) return; o.route = "88G"; o.picked = true; sendModal(); },
    sndGo: () => {
      const o = App.tmp.snd; if (!o || !can("dispatch")) return;
      const vals = {}; Object.keys(o.values || {}).forEach((k) => { if (String(o.values[k]).trim() !== "") vals[k] = u.parse(o.values[k]); });
      const list = st.send(o.ids.slice(), { transport: o.transport, route: o.route, dest: o.dest, date: o.date === dISO(Date.now()) ? null : fromISO(o.date), values: vals, by: actor() });
      App.tmp.snd = null; App.tmp.psel = []; App.closeDesk();
      if (list.length) { App.toast(rt(list.length > 1 ? `Отправлено грузов: ${list.length}, маршрут ${list[0].route}. Клиенты получили уведомления` : `Груз ${list[0].id} отправлен, маршрут ${list[0].route}, ${list[0].dest}`), "send"); if (App.scenario) list.forEach((s) => App.scenario.check("dispatched", s)); }
    },
    shipEdit: (d) => { const s = st.ship(d.id); if (!s || !can("dispatch")) return; App.tmp.sed = { id: s.id, tt: s.id, transport: s.transport, route: s.route, dest: s.dest, date: dISO(s.sentAt), cost: String(s.cost) }; shipEditModal(); },
    sedTr: (d) => { App.tmp.sed.transport = d.k; shipEditModal(); },
    sedRoute: (d) => { App.tmp.sed.route = d.k; shipEditModal(); },
    sedGo: () => {
      const d = App.tmp.sed; if (!d || !st.ship(d.id) || st.ttCheck(d.tt, d.id)) return;
      // сначала трек-номер (он меняется во всей цепочке), потом остальные данные уже под новым номером
      const old = d.id, id = st.setTT(old, d.tt, actor()) || old, s = st.ship(id), nd = fromISO(d.date);
      st.editShip(id, { transport: d.transport, route: d.route, dest: d.dest, date: nd && dISO(s.sentAt) !== d.date ? nd : null, cost: seeMoney() ? u.parse(d.cost) : null }, actor());
      App.tmp.sed = null; App.closeDesk();
      App.toast(id !== old ? `Данные отправки исправлены, трек-номер теперь ${id}. Запись в истории` : `Данные отправки ${id} исправлены, запись в истории`, "edit");
    },
    // наш трек-номер: поле с автоматическим номером, который можно заменить своим
    ttAuto: (d) => { const x = TTF[d.k] && TTF[d.k](); if (!x) return; x.d.tt = x.auto; const inp = $("ttIn-" + d.k); if (inp) inp.value = x.auto; ttPaint(d.k); },
    ttEdit: (d) => { const o = st.cargo(d.id) || st.task(d.id); if (!o || !can("packcmd")) return; App.tmp.tte = { id: o.id, tt: o.id, t: d.t === "cargo" && st.cargo(o.id) ? "cargo" : "task" }; ttEditModal(); },
    tteBack: () => { const d = App.tmp.tte; App.tmp.tte = null; if (d && getItem(d.t, d.id)) openItem(d.t, d.id); else App.closeDesk(); },
    tteGo: () => {
      const d = App.tmp.tte; if (!d || st.ttCheck(d.tt, d.id)) return;
      const old = d.id, id = st.setTT(old, d.tt, actor());
      App.tmp.tte = null;
      if (getItem(d.t, id || old)) openItem(d.t, id || old); else App.closeDesk();
      if (id) App.toast(`Трек-номер изменён: был ${old}, стал ${id}. Склад и клиент видят новый номер`, "edit");
    },
    // все грузы клиента на складе: рабочая страница «Грузы» → «На складе» с выбранным клиентом
    clientStock: (d) => {
      if (!allowed("work")) return;
      if (!stockGroups()[d.c]) { App.toast(d.c === "unk" ? "Грузов без кода клиента на складе сейчас нет" : `У клиента ${d.c} сейчас нет грузов на складе, которые ждут упаковки`, "info"); return; }
      App.tmp.wtab = "stock"; App.tmp.wq = ""; App.tmp.wcode = d.c; App.tmp.csel = []; App.tmp.wbind = null;
      App.go.desk("work");
    },
    // упаковка за склад из карточки заказа
    tpFound: (d) => { const x = App.tmp.tp; if (!x) return; const i = x.found.indexOf(d.id); if (i >= 0) x.found.splice(i, 1); else x.found.push(d.id); redrawCard(); },
    tpDimAdd: () => { if (App.tmp.tp) { App.tmp.tp.dims.push({ l: "", w: "", h: "", n: "" }); redrawCard(); } },
    tpDimDel: (d) => { const x = App.tmp.tp; if (x && x.dims.length > 1) { x.dims.splice(+d.i, 1); redrawCard(); } },
    tpPhoto: () => { if (App.tmp.tp) { App.tmp.tp.photos.push(photoSeq++); redrawCard(); } },
    tpFill: () => { const x = App.tmp.tp; if (!x) return; x.packs = { crate: "2", bag: "4" }; x.dims = [{ l: "50", w: "50", h: "60", n: "4" }, { l: "90", w: "80", h: "60", n: "2" }]; x.weight = "142"; if (!x.photos.length) x.photos.push(photoSeq++); redrawCard(); },
    taskPack: (d) => {
      const t = st.task(d.id), x = App.tmp.tp; if (!t || !x || x.id !== d.id || !can("packcmd")) return;
      if (t.status === "collect" && !st.collect(t.id, x.found.slice(), actor())) return;
      const c = st.pack(t.id, { packs: x.packs, dims: x.dims, weight: u.parse(x.weight), volume: u.parse(x.volMan), photos: x.photos, note: x.note, by: actor() });
      App.tmp.tp = null;
      if (c) { openItem("cargo", c.id); App.toast(`Груз ${c.id} упакован, клиент получил уведомление`, "check"); if (App.scenario) App.scenario.check("packed", c); }
    },
    taskCancel: (d) => confirmBox("Отменить заказ на упаковку?", `Заказ ${E(d.id)} будет отменён, грузы вернутся во вкладку «На складе». Запись появится в истории действий.`, "taskCancelYes", d.id, "Отменить заказ"),
    taskCancelYes: (d) => { App.closeOverlay(); const t = st.cancelTask(d.id, actor()); if (t) { App.closeDesk(); App.tmp.wcode = t.clientId; App.toast(`Заказ ${t.id} отменён, грузы снова на складе`, "x"); } },
    recDel: (d) => confirmBox("Удалить приход?", `Приход ${E(d.id)} будет удалён из системы. Запись об удалении останется в истории действий.`, "recDelYes", d.id, "Удалить"),
    recDelYes: (d) => { App.closeOverlay(); const r = st.removeRec(d.id, actor()); if (r) { App.closeDesk(); App.toast(`Приход ${r.id} удалён, запись в истории`, "x"); } },
    arrive: (d) => { if (!can("arrive")) return; const s = st.arrive(d.id, actor()); if (s) { App.toast(`Груз ${d.id} прибыл в Москву и лёг на хранение. Клиент получил уведомление`, "bell"); redrawCard(); if (App.scenario) App.scenario.check("arrived", s); } },
    togglePaid: (d) => { const s = st.ship(d.id); st.setPaid(d.id, !st.isPaid(s), actor()); redrawCard(); App.toast(st.isPaid(s) ? "Отмечено: оплачено. Клиент видит это в кабинете" : "Отметка об оплате снята", "wallet"); },
    addDoc: (d) => { st.addDoc(d.id, d.n, actor()); redrawCard(); App.toast("Документ прикреплён, клиент видит его в кабинете", "file"); },
    taPick: (d, el) => { const box = el.closest(".ta"), inp = box && box.querySelector("input"); if (inp) { taHide(inp); inp.blur(); } const fn = App.taPick[d.k]; if (fn) fn(d.v); },
    bindGo: (d) => { if (!App.tmp.bind) return; const r = st.assignUnknown(d.id, App.tmp.bind, actor()); App.tmp.bind = null; if (r) { redrawCard(); App.toast(`Груз ${r.id} привязан к клиенту ${r.clientId} ${cname(r.clientId)}. Клиент получил уведомление`, "check"); } },
    // приёмка с компьютера
    acceptOpen: () => { App.tmp.dacc = null; acceptModal(); },
    daWh: (d) => { dacc().wh = d.k; acceptModal(); },
    daPlaces: (d) => { const x = dacc(); x.places = Math.max(1, (parseInt(x.places, 10) || 1) + parseInt(d.d, 10)); acceptModal(); },
    daPhoto: () => { dacc().photos.push(photoSeq++); acceptModal(); },
    daDmgPhoto: () => { dacc().dmgPhotos.push(photoSeq++); acceptModal(); },
    daDmg: (d) => { const x = dacc(); x.dmg = x.dmg === d.k ? null : d.k; acceptModal(); },
    daDoor: (d) => { const x = dacc(); x.dpay = x.dpay === d.k ? null : d.k; acceptModal(); },
    daGo: () => {
      const x = dacc();
      const r = st.accept({ wh: x.wh, clientId: x.clientId, track: x.track, supplier: x.supplier, what: x.what, expId: x.expId, expAt: x.expAt, places: x.places, damage: x.dmg === "yes" ? x.dmgText.trim() || "Есть повреждение" : "", dmgPhotos: x.dmgPhotos, photos: x.photos, dpay: x.dpay, deliv: u.parse(x.deliv), extra: u.parse(x.extra), note: x.note, by: actor() });
      App.tmp.dacc = null; App.closeDesk(); if (r.clientId) App.tmp.wcode = r.clientId;
      App.toast(r.clientId ? `Груз ${r.id} принят, клиент ${r.clientId} получил уведомление` : `Груз ${r.id} принят без кода клиента и ушёл в «Неизвестные»`, r.clientId ? "check" : "alert");
    },
    // сотрудники и доступы
    staffSel: (d) => { App.tmp.staffSel = d.k; App.tmp.accq = ""; App.refresh(true); },
    nstOpen: () => { App.tmp.nst = null; staffModal(); },
    nstPreset: (d) => { const x = App.tmp.nst, pr = st.PRESETS[d.k]; x.preset = x.preset === d.k ? "" : d.k; x.sec = {}; if (x.preset) { pr[1].split(" ").forEach((k) => { x.sec[k] = true; }); if (pr[3]) x.scope = pr[3]; } staffModal(); },
    nstSec: (d) => { const x = App.tmp.nst; x.sec[d.k] = !x.sec[d.k]; staffModal(); },
    nstScope: (d) => { App.tmp.nst.scope = d.k; staffModal(); },
    nstClient: (d) => { const x = App.tmp.nst, i = x.clients.indexOf(d.k); if (i >= 0) x.clients.splice(i, 1); else x.clients.push(d.k); staffModal(); },
    wsort: () => { App.tmp.wsort = App.tmp.wsort === "old" ? "new" : "old"; App.refresh(true); },
    zoom: (d) => App.overlay(`<div class="zoom">${u.photo(+d.p, d.kind || undefined)}</div><div class="of"><button class="btn lg block" type="button" data-act="closeAny">Закрыть</button></div>`),
    nstFill: () => { const x = App.tmp.nst; if (!x) return; x.name = x.name || "Анна Белова"; x.role = x.role || "Менеджер по продажам"; x.login = x.login || "anna.belova"; x.pass = x.pass || "demo"; if (!x.preset) { x.preset = "sales"; x.sec = {}; st.PRESETS.sales[1].split(" ").forEach((k) => { x.sec[k] = true; }); x.scope = "own"; } if (x.scope === "own" && !x.clients.length) x.clients = ["D051", "K014"].filter((c) => st.client(c)); staffModal(); },
    nstGo: () => { const x = App.tmp.nst || {}; if (!String(x.name || "").trim()) { App.toast("Укажите имя сотрудника", "info"); return; } const id = st.createStaff(x); App.tmp.nst = null; App.tmp.staffSel = id; App.closeDesk(); App.toast(`Сотрудник ${st.STAFF[id].ru} создан. Логин ${st.STAFF[id].login}`, "user"); if (App.scenario) App.scenario.check("staffNew", id); },
    accTgl: (d) => { const k = App.tmp.staffSel, a = st.S.access[k]; if (!a) return; st.setAccess(k, d.kind, d.key, !a[d.kind][d.key]); },
    accScope: (d) => st.setAccess(App.tmp.staffSel, "scope", null, d.v),
    accClient: (d) => { const k = App.tmp.staffSel, a = st.S.access[k], c = st.client(d.c); if (!a || !c) return; if (a.scope === "own") st.setSales(c.id, c.salesId === k ? null : k); else st.setAccess(k, "client", d.c, !a.clients.includes(d.c)); },
    accPreset: (d) => { st.applyPreset(App.tmp.staffSel, d.k); App.toast(`Применён набор прав «${st.PRESETS[d.k][0]}». Дальше можно править вручную`, "shield"); if (App.scenario) App.scenario.check("preset", d.k); },
    viewAs: (d) => { if (!st.S.access[d.k]) return; App.ui.viewAs = d.k; App.saveUI(); App.go.desk(home()); App.toast(`Вы вошли как ${st.who(d.k)}: видно только то, что ему открыто`, "eye"); if (App.scenario) App.scenario.check("viewAs", d.k); },
    viewBack: () => { if (!App.ui.viewAs) return; App.ui.viewAs = null; App.saveUI(); App.go.desk("staff"); if (App.scenario) App.scenario.check("viewBack"); },
    // история
    histClear: () => { App.tmp.hist = { who: "all", q: "", all: false }; App.refresh(true); },
    histAll: () => { App.tmp.hist.all = true; App.refresh(true); },
    histCargo: (d) => { App.tmp.hist = { who: "all", q: d.q || "", all: false }; App.refresh(true); },
    exportHist: () => csvDl("istoriya_" + today() + ".csv", [["Дата", "Время", "Кто", "Действие", "Что сделано", "Груз"]].concat(histList().map((e) => [u.dFull(e.at), u.hm(e.at), st.who(e.by), (LK[e.k] || ["Действие"])[0], e.t, logRef(e) || ""]))),
    exportBoard: () => { const d = boardData(); csvDl("gruzy_" + today() + ".csv", [["Статус", "Номер", "Код клиента", "Клиент", "Склад", "Мест", "Вес, кг", "Объём, м³", "Маршрут"]].concat(d.in.map((r) => ["На складе", r.id, r.clientId, cname(r.clientId), whn(r.wh), r.places, "", "", ""])).concat(d.packing.map((t) => ["На упаковке", t.id, t.clientId, cname(t.clientId), whn(t.wh), st.taskPlaces(t), "", "", ""])).concat(d.pack.map((c) => ["Упакован", c.id, c.clientId, cname(c.clientId), whn(c.wh), c.places, c.weight, u.num(c.volume, 2), ""])).concat(d.way.concat(d.arrived).map((s) => { const t = st.totals(s); return [s.status === "arrived" ? st.SUB[s.sub] : L.t("st_" + s.status), s.id, s.clientId, cname(s.clientId), "", t.places, Math.round(t.weight), u.num(t.volume, 2), seeRoute() ? s.route : ""]; }))); },
    // клиенты: окно «Новый клиент» и «Изменить»
    clNew: () => { App.tmp.cl = clDef(null); clientModal(); },
    clEdit: (d) => { const c = st.client(d.c); if (!c || asId()) return; App.tmp.cl = clDef(c); clientModal(); },
    clWay: (d) => { const x = App.tmp.cl; if (!x) return; x.recv.way = d.k; if (d.k === "tk" && !x.recv.tk) x.recv.tk = st.TK[0]; clientModal(); },
    clTk: (d) => { if (App.tmp.cl) { App.tmp.cl.recv.tk = d.k; clientModal(); } },
    clFill: () => { const x = App.tmp.cl; if (!x) return; if (!x.id && clErr(x)) x.code = ["D052", "D053", "D054", "D055"].find((c) => !st.client(c)) || x.code; x.name = x.name || "Балтика Декор"; x.person = x.person || "Игорь Соколов"; x.phone = x.phone || "+7 900 000-00-31"; x.city = x.city || "Москва"; x.birth = x.birth || "1987-05-20"; x.salesId = x.salesId || "timur"; if (!x.recv.name) x.recv = { name: "Игорь Соколов", phone: "+7 900 000-00-31", addr: "Москва, ул. Лесная, 4, склад 1", way: "door", tk: "" }; clientModal(); },
    clGo: () => {
      const x = App.tmp.cl; if (!x || clErr(x)) return;
      const isNew = !x.id, c = st.saveClient(x, actor()); if (!c) return;
      App.tmp.cl = null; App.closeDesk(); App.go.desk("client", c.id);
      App.toast(isNew ? `Клиент ${c.id} создан${c.salesId ? ", менеджер " + st.who(c.salesId) : ""}` : `Карточка клиента ${c.id} сохранена, запись в истории`, "user");
    },
    // «Копировать» в блоке выдачи: весь блок одним текстом (заказ или то, что сейчас введено в окне «Выдать»)
    copyIss: (d) => {
      const x = App.tmp.iss, o = d.id ? st.issueOrder(d.id) : x ? { way: x.way, tk: x.tk, recv: x.recv, dlv: x.way !== "pickup" ? { payer: x.dlvPayer, rub: u.parse(x.dlvRub), wh: x.dlvWh } : null } : null; if (!o) return;
      const t = st.issueText(o); App.lastCopy = t;
      try { if (navigator.clipboard) navigator.clipboard.writeText(t).catch(() => {}); } catch (e) { /* без буфера обмена */ }
      App.toast("Скопировано", "copy");
    },
    copy: (d) => { try { if (navigator.clipboard) navigator.clipboard.writeText(d.v).catch(() => {}); } catch (e) { /* без буфера обмена */ } App.toast(`${d.w || "Адрес"} скопирован: ${d.v}`, "copy"); },
  };
  Object.assign((App.acts = App.acts || {}), acts);
  Object.assign(App.taPick, {
    wq: (v) => { App.tmp.wq = ""; App.tmp.wcode = v; App.tmp.csel = []; App.refresh(true); },
    wbind: (v) => { App.tmp.wbind = v; App.refresh(true); },
    bind: (v) => { App.tmp.bind = v; redrawCard(); },
    dacc: (v) => { const x = dacc(); x.clientId = v || null; x.auto = false; acceptModal(); },
  });
  Object.assign(App.taType, {
    wq: (v) => { App.tmp.wq = v; const l = $("wkCodes"); if (l) l.innerHTML = codesHtml(stockGroups(), App.tmp.wcode); },
    wbind: () => { if (App.tmp.wbind) { App.tmp.wbind = null; const b = $("btnWbind"); if (b) b.disabled = true; } },
    bind: () => { if (App.tmp.bind) { App.tmp.bind = null; const b = $("btnCardNext"); if (b) b.disabled = true; } },
    dacc: () => { const x = dacc(); x.clientId = null; x.auto = false; },
  });

  App.ins = Object.assign(App.ins || {}, {
    taQ: (v, el) => { const fn = App.taType[el.dataset.k]; if (fn) fn(v, el); taShow(el); },
    q: (v) => { App.tmp.q = v; App.refresh(true); },
    clientsQ: (v) => { App.tmp.clientsQ = v; App.refresh(true); },
    histQ: (v) => { App.tmp.hist.q = v; App.tmp.hist.all = false; App.refresh(true); },
    clIn: (v, el) => { const x = App.tmp.cl; if (!x) return; x[el.dataset.k] = v; if (el.dataset.k !== "code") return; const err = clErr(x), box = el.closest(".ttf"), msg = $("clMsg"), b = $("btnClGo"); if (box) box.classList.toggle("err", !!err && !!x.code); if (msg) msg.textContent = err || "Код свободен"; if (b) b.disabled = !!err; },
    clRecv: (v, el) => { if (App.tmp.cl) App.tmp.cl.recv[el.dataset.k] = v; },
    accQ: (v) => { App.tmp.accq = v; const l = $("accCl"), k = App.tmp.staffSel; if (l) l.innerHTML = accClients(k, st.S.access[k]); },
    orgIn: (v, el) => { if (App.tmp.org) App.tmp.org[el.dataset.k] = v; },
    ttIn: (v, el) => { const x = TTF[el.dataset.k] && TTF[el.dataset.k](); if (!x) return; x.d.tt = v; ttPaint(el.dataset.k); },
    sndIn: (v, el) => { if (App.tmp.snd) App.tmp.snd[el.dataset.k] = v; },
    sedIn: (v, el) => { if (App.tmp.sed) App.tmp.sed[el.dataset.k] = v; },
    nstIn: (v, el) => { if (App.tmp.nst) App.tmp.nst[el.dataset.k] = v; if (App.scenario) App.scenario.decorate(); },
    tpIn: (v, el) => { if (App.tmp.tp) App.tmp.tp[el.dataset.k] = v; },
    tpPack: (v, el) => { if (App.tmp.tp) App.tmp.tp.packs[el.dataset.k] = v; },
    tpDim: (v, el) => { const x = App.tmp.tp; if (!x || !x.dims[+el.dataset.i]) return; x.dims[+el.dataset.i][el.dataset.k] = v; const o = $("tpVol"); if (o) o.textContent = u.vol(st.dimsVolume(x.dims)); },
    daTrack: (v) => { dacc().track = v; if (daMatch()) acceptModal(); },
    daIn: (v, el) => { dacc()[el.dataset.k] = el.dataset.k === "places" ? Math.max(1, parseInt(v, 10) || 1) : v; },
  });
  App.chg = Object.assign(App.chg || {}, {
    histWho: (v) => { App.tmp.hist.who = v; App.tmp.hist.all = false; App.refresh(true); },
    clSales: (v) => { if (App.tmp.cl) App.tmp.cl.salesId = v; },
    sndDest: (v) => { if (App.tmp.snd) App.tmp.snd.dest = v; },
    sedDest: (v) => { if (App.tmp.sed) App.tmp.sed.dest = v; },
  });
  document.addEventListener("change", (e) => { const el = e.target.closest && e.target.closest("[data-chg]"); if (el && App.chg[el.dataset.chg]) App.chg[el.dataset.chg](el.value, el); });
  // Enter в поиске по клиентам в доступах отмечает первого найденного
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target && e.target.dataset && e.target.dataset.in === "accQ") { const b = document.querySelector("#accCl .prow"); if (b) { e.preventDefault(); b.click(); } } });

  App.DK = { asId, acc, actor, can, sec, seeMoney, seeRoute, rt, mine, vis, pill, subPill, wayText, issuedText, copyBtn, cname, whn, xBtn, today, csvDl, show, setModal, recsWord, TR, dISO, fromISO, cap, ta, linkrow, photosHtml, confirmBox, storyHtml, repHtml, allowed, paidPill, recRow, hot, sendEta, getItem };
  App.D = {
    side, chromeBar, allowed, home, screens: { board, work, clients, client, staff, history, none }, modals: MODALS,
    after() {},
    sync: redraw, openItem, openById, redrawCard, orgOpen, orgModal, sendOpen, sendModal, shipEditModal, ttEditModal, acceptModal, staffModal, clientModal,
  };
})(window.App);
