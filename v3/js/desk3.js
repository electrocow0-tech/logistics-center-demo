/* Экраны компьютера, третья часть (версия 3.1): «Отправки» с вкладками «В пути», «Прибывшие» и «Архив»,
   окно «Выдать», карточка заказа на выдачу, фотоотчёт и выдача за склад в Москве. */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, I = u.icon, E = u.esc, $ = (id) => document.getElementById(id);
  const K = App.DK, can = K.can, vis = K.vis, cname = K.cname, actor = K.actor, xBtn = K.xBtn;
  const scn = (ev, x) => { if (App.scenario) App.scenario.check(ev, x); };
  const daysWord = (n) => n + " " + u.plural(n, "день", "дня", "дней");
  const cg = (s) => st.cargo(s.id) || {};
  const shPhoto = (s) => { const c = cg(s); return c.photos && c.photos.length ? u.photo(c.photos[0], c.packType) : ""; };
  const sumText = (list) => { const t = st.sumShips(list); return `${u.places(t.places)} · ${u.kg(t.weight)} · ${u.vol(t.volume)}`; };
  const ORD_ST = { ready: ["in", "Готов к выдаче"], issuing: ["pack", "Выдают"], done: ["done", "Выдан"] };
  const ordPill = (o, lg) => K.pill(ORD_ST[o.status][0], lg, o.status === "done" && o.way === "tk" ? "Передан в ТК" : ORD_ST[o.status][1]);
  // способ выдачи выданного груза: до двери, самовывоз или ТК
  const wayOf = (s) => (s.issue ? (s.issue.type === "tk" ? "tk" : s.issue.way || "pickup") : "pickup");
  const wayDone = (s) => (st.WAY[wayOf(s)] || st.WAY.pickup).t + (wayOf(s) === "tk" && s.issue && s.issue.tk ? ": " + s.issue.tk : "");
  const inRange = (t, from, to) => (!from || t >= from - 12 * 3600e3) && (!to || t <= to + 12 * 3600e3);
  const dates = (key, f, what) => `<label class="dt"><span>с</span><input class="inp sm" type="date" data-in="${key}" data-k="from" value="${E(f.from)}" aria-label="${what} с"></label><label class="dt"><span>по</span><input class="inp sm" type="date" data-in="${key}" data-k="to" value="${E(f.to)}" aria-label="${what} по"></label>`;
  const clearBtn = (act) => `<button class="btn sm ghost" type="button" data-act="${act}">${I("x")}Сбросить</button>`;
  let photoSeq = 900;

  // ---------- «Отправки»: три вкладки ----------
  const TABS = [["way", "В пути"], ["arr", "Прибывшие"], ["arch", "Архив"], ["all", "Все"]];
  const tabOk = (k) => (k === "way" ? can("way") : k === "arr" || k === "arch" || k === "all");
  // после входа под сотрудником или возврата вкладка начинается заново: без права «way» сразу «Прибывшие»
  // null, а не undefined: иначе первый показ «Отправок» сбрасывает вкладку, заданную заранее (например, сценарием)
  let tabAs = null;
  const curTab = () => { const a = K.asId(); if (a !== tabAs) { tabAs = a; App.tmp.ctab = null; } if (!tabOk(App.tmp.ctab)) App.tmp.ctab = can("way") ? "way" : "arr"; return App.tmp.ctab; };
  const wayAll = () => st.S.ships.filter((s) => s.status === "way" && vis(s));
  const arrAll = () => st.S.ships.filter((s) => s.status === "arrived" && vis(s));
  const archAll = () => st.S.ships.filter((s) => s.status === "done" && vis(s));
  // «Все» (версия 3.2): все отправки любого статуса в одном списке; без права «way» грузы в пути не видны
  const allAll = () => st.S.ships.filter((s) => (s.status !== "way" || can("way")) && vis(s));

  // «В пути»: поиск, маршрут (если виден), вид доставки, даты отправки
  const cfDef = () => ({ q: "", route: "all", tr: "all", from: "", to: "" });
  const cf = () => { const f = App.tmp.cf; if (!f || f.tr == null) App.tmp.cf = Object.assign(cfDef(), f || {}); return App.tmp.cf; };
  function wayList() {
    const f = cf(), q = f.q.trim().toUpperCase(), from = K.fromISO(f.from), to = K.fromISO(f.to), r = K.seeRoute();
    return wayAll().filter((s) => (!r || f.route === "all" || s.route === f.route) && (f.tr === "all" || s.transport === f.tr) && inRange(s.sentAt, from, to)
      && (!q || [s.id, s.clientId, cname(s.clientId), s.dest, cg(s).name, r ? s.route : ""].some((x) => String(x || "").toUpperCase().includes(q))))
      .sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || a.eta - b.eta);
  }
  function consWay() {
    const f = cf(), list = wayList(), m = K.seeMoney(), r = K.seeRoute(), dirty = f.q || (r && f.route !== "all") || f.tr !== "all" || f.from || f.to;
    const rows = list.map((s) => {
      const t = st.totals(s);
      return `<tr class="click${s.fresh ? " fresh" : ""}" data-act="openItem" data-t="ship" data-id="${E(s.id)}" data-sh="${E(s.id)}"><td><b class="mono">${E(s.id)}</b><div class="muted s12">${E(cg(s).name || "")}</div></td>
        <td><b>${E(s.clientId)}</b><div class="muted s12">${E(cname(s.clientId))}</div></td><td>${u.places(t.places)}<div class="muted s12">${u.kg(t.weight)} · ${u.vol(t.volume)}</div></td>
        <td>${r ? `<b>${E(s.route)}</b> · ` : ""}${E(K.TR(s.transport).t)}<div class="muted s12">${E(s.dest)}</div></td><td class="nw">${u.dShort(s.sentAt)}<div class="muted s12">прибытие ≈${u.NB}${u.dShort(s.eta)}</div></td>
        ${m ? `<td class="r">${u.usd(s.cost)}<div class="s12 ${st.isPaid(s) ? "ok" : "bad"}">${st.isPaid(s) ? "оплачено" : "не оплачено"}</div></td>` : ""}
        <td class="r"><span class="btns">${can("arrive") ? `<button class="btn sm" type="button" data-act="arrive" data-id="${E(s.id)}" data-arr="${E(s.id)}">${I("pin")}Прибыл</button>` : ""}${can("dispatch") ? `<button class="btn sm" type="button" data-act="shipEdit" data-id="${E(s.id)}" data-se="${E(s.id)}" title="Исправить данные отправки" aria-label="Исправить данные отправки">${I("edit")}</button>` : ""}</span></td></tr>`;
    }).join("");
    return `<div class="fbar cons-f" data-hl="cons-f"><label class="search">${I("search")}<input data-in="cfQ" value="${E(f.q)}" placeholder="Трек-номер, клиент, место назначения"></label>
        ${r ? `<select class="inp sm" data-chg="cfRoute" aria-label="Маршрут"><option value="all">Все маршруты</option>${st.ROUTES.map((x) => `<option${f.route === x ? " selected" : ""}>${x}</option>`).join("")}</select>` : ""}
        <select class="inp sm" data-chg="cfTr" aria-label="Вид доставки"><option value="all">Все виды доставки</option>${Object.keys(st.TRANSPORT).map((k) => `<option value="${k}"${f.tr === k ? " selected" : ""}>${E(K.TR(k).t)}</option>`).join("")}</select>
        ${dates("cfDate", f, "Отправлены")}${dirty ? clearBtn("cfClear") : ""}<span class="grow"></span><span class="muted s13">${list.length} ${u.plural(list.length, "груз", "груза", "грузов")} в пути</span></div>
      <table class="tbl" data-hl="way-t"><thead><tr><th>Наш трек-номер</th><th>Клиент</th><th>Груз</th><th>${r ? "Маршрут" : "Доставка"}</th><th>Отправлен</th>${m ? '<th class="r">Стоимость</th>' : ""}<th class="r"></th></tr></thead><tbody>${rows || `<tr><td colspan="${m ? 7 : 6}" class="muted">${dirty ? "По этим фильтрам грузов в пути нет" : "Сейчас в пути ничего нет"}</td></tr>`}</tbody></table>
      <p class="muted s12 mt8">Когда груз придёт в Москву, нажмите «Прибыл»: он перейдёт во вкладку «Прибывшие» и к складу в Москве на хранение, клиент получит уведомление.</p>`;
  }

  // «Прибывшие»: как «Грузы → На складе»: слева коды клиентов, справа карточки треков, галочки и «Выдать»
  const SUBO = { ready: 0, issuing: 1, store: 2 };
  const isToday = (t) => !!t && u.dayDiff(t) === 0;
  function arrGroups() { const g = {}; arrAll().forEach((s) => (g[s.clientId] = g[s.clientId] || []).push(s)); return g; }
  function arrCodes(g, cur) {
    const q = (App.tmp.aq || "").trim().toUpperCase(), any = / · /.test(App.tmp.aq || "");
    const keys = Object.keys(g).filter((k) => !q || any || k.includes(q) || cname(k).toUpperCase().includes(q)).sort((a, b) => (g[b].some((s) => s.fresh) ? 1 : 0) - (g[a].some((s) => s.fresh) ? 1 : 0) || a.localeCompare(b));
    return keys.map((k) => {
      const l = g[k], inw = l.filter((s) => s.sub !== "store").length, td = l.filter((s) => isToday(s.arrivedAt)).length;
      return `<button class="wc${cur === k ? " on" : ""}${l.some((s) => s.fresh) ? " new" : ""}" type="button" data-act="acode" data-c="${E(k)}" data-acode="${E(k)}"><span class="code">${E(k)}</span><span class="nm">${E(cname(k))}</span><span class="cgn">${st.partsWord(l.length)} · ${u.places(st.sumShips(l).places)}${td ? " · сегодня " + td : ""}${inw ? " · в выдаче " + inw : ""}</span></button>`;
    }).join("") || (q ? '<p class="muted s13 p0">Такого кода среди прибывших нет</p>' : "");
  }
  function asel(all) { App.tmp.asel = (App.tmp.asel || []).filter((id) => all.some((s) => s.id === id && s.sub === "store")); return App.tmp.asel; }
  function acard(s, on, pickable) {
    const c = cg(s), ord = st.issueOf(s), pick = pickable && s.sub === "store", d = st.storeDays(s);
    const ph = c.photos && c.photos.length ? `<button class="gc-ph" type="button" data-act="zoom" data-p="${E(c.photos[0])}" data-kind="${E(c.packType || "")}" title="Увеличить фото" aria-label="Увеличить фото">${u.photo(c.photos[0], c.packType)}${c.photos.length > 1 ? `<em>${c.photos.length} фото</em>` : ""}</button>` : `<div class="gc-ph none">${I("camera")}</div>`;
    const body = `<span class="gc-t"><b class="mono">${E(s.id)}</b><small>${E(c.name || "наименование не указано")}</small><span class="gc-m">${sumText([s])}</span>${K.seeRoute() ? `<span class="gc-m">маршрут ${E(s.route)} · ${E(s.dest)}</span>` : ""}
        <span class="gc-m">прибыл ${u.dShort(s.arrivedAt)} · на хранении ${d ? daysWord(d) : "меньше дня"}</span><span class="ac-st">${K.subPill(s)}</span></span>`;
    return `<div class="gc ac${on ? " on" : ""}${s.fresh ? " new" : ""}" data-ag="${E(s.id)}">${ph}
      ${pick ? `<button class="gc-b" type="button" data-act="aSel" data-id="${E(s.id)}"><span class="cb">${on ? I("check") : ""}</span>${body}</button><button class="x sm" type="button" data-act="openItem" data-t="ship" data-id="${E(s.id)}" title="Открыть карточку ${E(s.id)}" aria-label="Открыть карточку">${I("chevron")}</button>`
        : `<button class="gc-b one" type="button" data-act="openItem" data-t="ship" data-id="${E(s.id)}">${body}</button>`}
      ${ord ? `<div class="ac-o"><button class="lnkb" type="button" data-act="issOpen" data-id="${E(ord.id)}" data-io="${E(ord.id)}">${I("file")}Заказ ${E(ord.id)}</button><small class="ell1">${E(K.wayText(ord))}${ord.collect ? " · получить " + st.rub(ord.collectRub) : ""}</small></div>` : ""}</div>`;
  }
  function consArr() {
    const g = arrGroups(), keys = Object.keys(g);
    let cur = App.tmp.acode; if (!g[cur]) cur = App.tmp.acode = keys.sort()[0] || null;
    const left = `<div class="wk-l">${K.ta("aq", { q: App.tmp.aq, ph: "Код или название клиента", hl: "aq" })}<div class="wk-codes" id="arCodes">${arrCodes(g, cur)}</div></div>`;
    if (!cur) return `<div class="wk">${left}<div class="wk-r"><div class="box muted">Прибывших грузов нет.${can("way") ? " Когда груз придёт в Москву, отметьте прибытие во вкладке «В пути»." : ""}</div></div></div>`;
    const all = g[cur].slice().sort((a, b) => SUBO[a.sub] - SUBO[b.sub] || b.arrivedAt - a.arrivedAt), sub = st.SUB[App.tmp.asub] ? App.tmp.asub : "all";
    const list = sub === "all" ? all : all.filter((s) => s.sub === sub), pickable = can("issuecmd"), sel = asel(all), chosen = all.filter((s) => sel.includes(s.id));
    const storeL = list.filter((s) => s.sub === "store"), storeAll = all.filter((s) => s.sub === "store"), tot = st.sumShips(list), ct = st.sumShips(chosen);
    const subs = [["all", "Все"]].concat(Object.keys(st.SUB).map((k) => [k, st.SUB[k]]));
    const head = `<div class="wk-h"><span class="tag code lg">${E(cur)}</span><div class="grow"><b class="ell1">${E(cname(cur))}</b><small>${st.partsWord(all.length)} в Москве${all.some((s) => isToday(s.arrivedAt)) ? ", сегодня приехало " + all.filter((s) => isToday(s.arrivedAt)).length : ""} · самая ранняя с ${u.dShort(Math.min(...all.map((s) => s.arrivedAt)))}</small></div>
        ${pickable && storeL.length ? `<button class="btn sm" type="button" data-act="aAll" id="btnArAll">${storeL.every((s) => sel.includes(s.id)) ? "Снять все" : "Выбрать все"}</button>` : ""}</div>
      <div class="ar-tot" data-hl="ar-sum"><div><small>Партий</small><b>${list.length}</b></div><div><small>Мест</small><b>${tot.places}</b></div><div><small>Общий вес</small><b>${u.kg(tot.weight)}</b></div><div><small>Общий объём</small><b>${u.vol(tot.volume)}</b></div></div>
      <div class="ar-f"><div class="seg light sm" data-hl="ar-sub">${subs.map(([k, t]) => `<button type="button" class="${sub === k ? "on" : ""}" data-act="asub" data-k="${k}" data-asub="${k}">${t}<b>${k === "all" ? all.length : all.filter((s) => s.sub === k).length}</b></button>`).join("")}</div></div>`;
    const foot = pickable ? `<div class="wk-foot" data-hl="ar-foot"><span class="wk-n">${chosen.length ? `Выбрано ${st.tracksWord(chosen.length)}, ${u.kg(ct.weight)}, ${u.vol(ct.volume)}` : storeAll.length ? "Отметьте треки на хранении галочками" : "Все треки клиента уже в выдаче"}</span><span class="grow"></span>
        <button class="btn pri" type="button" data-act="issNew" id="btnIssue" data-hl="issue-btn" ${chosen.length ? "" : "disabled"}>${I("send")}Выдать${chosen.length > 1 ? " · " + chosen.length : ""}</button></div>`
      : `<div class="wk-foot"><span class="wk-n muted">Команду «Выдать» даёт администратор. Треки «Готов к выдаче» откройте, чтобы принять и выдать</span></div>`;
    return `<div class="wk ar">${left}
      <div class="wk-r">${head}<div class="gcs">${list.map((s) => acard(s, sel.includes(s.id), pickable)).join("") || '<div class="box muted">С этим подстатусом треков нет</div>'}</div>${foot}</div></div>`;
  }

  // «Архив»: выданные и переданные в ТК
  const afDef = () => ({ q: "", way: "all", from: "", to: "" });
  const af = () => App.tmp.af || (App.tmp.af = afDef());
  function archList() {
    const f = af(), q = f.q.trim().toUpperCase(), from = K.fromISO(f.from), to = K.fromISO(f.to);
    return archAll().filter((s) => (f.way === "all" || wayOf(s) === f.way) && inRange(s.doneAt, from, to)
      && (!q || [s.id, s.clientId, cname(s.clientId), s.issue && s.issue.waybill, s.issue && s.issue.tk, cg(s).name].some((x) => String(x || "").toUpperCase().includes(q)))).sort((a, b) => b.doneAt - a.doneAt);
  }
  function consArch() {
    const f = af(), list = archList(), dirty = f.q || f.way !== "all" || f.from || f.to;
    const rows = list.map((s) => {
      const x = st.repSum(s.rep), o = st.issueOf(s), wb = s.issue && s.issue.type === "tk" ? s.issue.waybill : "";
      return `<tr class="click" data-act="openItem" data-t="ship" data-id="${E(s.id)}" data-arc="${E(s.id)}"><td><b class="mono">${E(s.id)}</b><div class="muted s12">${E(cg(s).name || "")}</div></td>
        <td><b>${E(s.clientId)}</b><div class="muted s12">${E(cname(s.clientId))}</div></td><td>${E(wayDone(s))}${o ? `<div class="muted s12">заказ ${E(o.id)}</div>` : ""}</td>
        <td class="mono">${wb ? E(wb) : '<span class="muted">нет</span>'}</td><td class="nw">${u.dFull(s.doneAt)}<div class="muted s12">${u.hm(s.doneAt)}</div></td>
        <td class="r">${x ? st.rub(x) + `<div class="muted s12">${o && o.payer === "client" ? "платит клиент" : "платит компания"}</div>` : '<span class="muted">нет</span>'}</td><td>${E(st.who(s.doneBy))}</td></tr>`;
    }).join("");
    return `<div class="fbar cons-f" data-hl="arch-f"><label class="search">${I("search")}<input data-in="afQ" value="${E(f.q)}" placeholder="Трек, код, клиент, накладная"></label>
        <select class="inp sm" data-chg="afWay" aria-label="Способ выдачи"><option value="all">Все способы выдачи</option>${Object.keys(st.WAY).map((k) => `<option value="${k}"${f.way === k ? " selected" : ""}>${E(st.WAY[k].t)}</option>`).join("")}</select>
        ${dates("afDate", f, "Выданы")}${dirty ? clearBtn("afClear") : ""}<span class="grow"></span><span class="muted s13">${list.length} ${u.plural(list.length, "груз", "груза", "грузов")}</span></div>
      <table class="tbl" data-hl="arch-t"><thead><tr><th>Наш трек-номер</th><th>Клиент</th><th>Способ выдачи</th><th>Накладная</th><th>Дата выдачи</th><th class="r">Расходы</th><th>Кто выдал</th></tr></thead><tbody>${rows || `<tr><td colspan="7" class="muted">${dirty ? "По этим фильтрам ничего нет" : "Выданных грузов пока нет"}</td></tr>`}</tbody></table>
      <p class="muted s12 mt8">Нажмите на строку: в карточке груза история после прибытия (хранение, команда на выдачу, расходы, деньги, выдача) и фотоотчёт склада.</p>`;
  }

  // «Все»: статус, поиск, фильтры по статусу, маршруту, виду доставки и датам отправки
  const ALL_ST = [["way", "В пути"], ["store", "Хранение"], ["ready", "Готов к выдаче"], ["issuing", "Выдают"], ["done", "Выдан"], ["tk", "Передан в ТК"]];
  const stKey = (s) => (s.status === "way" ? "way" : s.status === "arrived" ? s.sub : wayOf(s) === "tk" ? "tk" : "done");
  const xfDef = () => ({ q: "", st: "all", route: "all", tr: "all", from: "", to: "" });
  const xf = () => App.tmp.xf || (App.tmp.xf = xfDef());
  const statusPill = (s) => (s.status === "arrived" ? K.subPill(s) : s.status === "way" ? K.pill("way") : K.pill("done", false, K.issuedText(s)));
  function allList() {
    const f = xf(), q = f.q.trim().toUpperCase(), from = K.fromISO(f.from), to = K.fromISO(f.to), r = K.seeRoute();
    return allAll().filter((s) => (f.st === "all" || stKey(s) === f.st) && (!r || f.route === "all" || s.route === f.route) && (f.tr === "all" || s.transport === f.tr) && inRange(s.sentAt, from, to)
      && (!q || [s.id, s.clientId, cname(s.clientId), s.dest, cg(s).name, r ? s.route : "", s.issue && s.issue.waybill].some((x) => String(x || "").toUpperCase().includes(q)))).sort((a, b) => b.sentAt - a.sentAt);
  }
  function consAll() {
    const f = xf(), list = allList(), m = K.seeMoney(), r = K.seeRoute(), dirty = f.q || f.st !== "all" || (r && f.route !== "all") || f.tr !== "all" || f.from || f.to;
    const sts = ALL_ST.filter(([k]) => k !== "way" || can("way"));
    const rows = list.map((s) => {
      const t = st.totals(s), when = s.status === "done" ? ["выдан", s.doneAt] : s.status === "arrived" ? ["прибыл", s.arrivedAt] : ["прибытие ≈", s.eta];
      return `<tr class="click${s.fresh ? " fresh" : ""}" data-act="openItem" data-t="ship" data-id="${E(s.id)}" data-all="${E(s.id)}"><td><b class="mono">${E(s.id)}</b><div class="muted s12">${E(cg(s).name || "")}</div></td>
        <td><b>${E(s.clientId)}</b><div class="muted s12">${E(cname(s.clientId))}</div></td><td>${statusPill(s)}</td>
        <td>${r ? `<b>${E(s.route)}</b> · ` : ""}${E(K.TR(s.transport).t)}<div class="muted s12">${E(s.dest)}</div></td><td>${u.places(t.places)}<div class="muted s12">${u.kg(t.weight)} · ${u.vol(t.volume)}</div></td>
        <td class="nw">${u.dShort(s.sentAt)}<div class="muted s12">${when[0]}${u.NB}${u.dShort(when[1])}</div></td>
        ${m ? `<td class="r">${u.usd(s.cost)}<div class="s12 ${st.isPaid(s) ? "ok" : "bad"}">${st.isPaid(s) ? "оплачено" : "не оплачено"}</div></td>` : ""}</tr>`;
    }).join("");
    return `<div class="fbar cons-f" data-hl="all-f"><label class="search">${I("search")}<input data-in="xfQ" value="${E(f.q)}" placeholder="Трек, код, клиент, накладная"></label>
        <select class="inp sm" data-chg="xfSt" aria-label="Статус"><option value="all">Все статусы</option>${sts.map(([k, t]) => `<option value="${k}"${f.st === k ? " selected" : ""}>${t}</option>`).join("")}</select>
        ${r ? `<select class="inp sm" data-chg="xfRoute" aria-label="Маршрут"><option value="all">Все маршруты</option>${st.ROUTES.map((x) => `<option${f.route === x ? " selected" : ""}>${E(x)}</option>`).join("")}</select>` : ""}
        <select class="inp sm" data-chg="xfTr" aria-label="Вид доставки"><option value="all">Все виды доставки</option>${Object.keys(st.TRANSPORT).map((k) => `<option value="${k}"${f.tr === k ? " selected" : ""}>${E(K.TR(k).t)}</option>`).join("")}</select>
        ${dates("xfDate", f, "Отправлены")}${dirty ? clearBtn("xfClear") : ""}<span class="grow"></span><span class="muted s13">${list.length} ${u.plural(list.length, "груз", "груза", "грузов")}</span></div>
      <div class="tbx"><table class="tbl" data-hl="all-t"><thead><tr><th>Наш трек-номер</th><th>Клиент</th><th>Статус</th><th>${r ? "Маршрут" : "Доставка"}</th><th>Груз</th><th>Отправлен</th>${m ? '<th class="r">Стоимость</th>' : ""}</tr></thead><tbody>${rows || `<tr><td colspan="${m ? 7 : 6}" class="muted">${dirty ? "По этим фильтрам ничего нет" : "Отправок пока нет"}</td></tr>`}</tbody></table></div>
      <p class="muted s12 mt8">Все отправки в одном списке: в пути, на хранении, в выдаче и выданные. Нажмите на строку: откроется карточка груза.</p>`;
  }

  function cons() {
    const tab = curTab(), n = { way: wayAll().length, arr: arrAll().length, arch: archAll().length, all: allAll().length };
    return `<div class="pane">
      <div class="ph"><h1>Отправки</h1><div class="seg light" data-hl="ctabs">${TABS.filter(([k]) => tabOk(k)).map(([k, t]) => `<button type="button" class="${tab === k ? "on" : ""}" data-act="ctab" data-k="${k}" data-ctab="${k}">${t}<b>${n[k]}</b></button>`).join("")}</div><span class="grow"></span>
        <button class="btn" type="button" data-act="exportCons" id="btnConsCsv" title="Выгрузить в Excel">${I("download")}<span class="hide-n">Excel</span></button></div>
      ${tab === "way" ? consWay() : tab === "arr" ? consArr() : tab === "all" ? consAll() : consArch()}
    </div>`;
  }

  // ---------- окно «Выдать»: заказ на выдачу из одного или нескольких треков одного клиента ----------
  function issStart(ids, from) {
    const list = ids.map(st.ship).filter((s) => s && s.status === "arrived" && s.sub === "store" && vis(s)); if (!list.length || !can("issuecmd")) return;
    const cid = list[0].clientId, x = list.filter((s) => s.clientId === cid).map((s) => s.id), c = st.client(cid) || {}, r = c.recv || {}, debt = st.debtRub(x);
    App.tmp.iss = { ids: x, clientId: cid, recv: { name: r.name || c.person || "", phone: r.phone || c.phone || "", addr: r.addr || "" }, way: st.WAY[r.way] ? r.way : "pickup", tk: r.tk || st.TK[0], payer: "client", collect: debt > 0, collectRub: debt > 0 ? String(debt) : "", note: "", from: from || null, picked: false };
    issModal();
  }
  function issModal() {
    const d = App.tmp.iss; if (!d) return;
    d.ids = d.ids.filter((id) => { const s = st.ship(id); return s && s.status === "arrived" && s.sub === "store"; });
    if (!d.ids.length) { App.tmp.iss = null; if (App.tmp.mk === "iss") App.closeDesk(); return; }
    const ss = d.ids.map(st.ship), c = st.client(d.clientId) || { id: d.clientId, name: "" }, debt = st.debtRub(d.ids);
    K.show("iss", `<div class="mh"><div class="mi">${I("send")}</div><div><h2>Выдать</h2><div class="muted s13">${E(c.id)} ${E(c.name)} · ${st.tracksWord(ss.length)}, ${sumText(ss)}</div></div>${xBtn}</div>
      <div class="fld" data-hl="iss-tracks"><span>Треки в заказе: лишний можно убрать</span><div class="chips">${ss.map((s) => { const t = st.totals(s); return `<span class="chipx" data-ic="${E(s.id)}"><b class="mono">${E(s.id)}</b><small>${u.places(t.places)} · ${u.kg(t.weight)}</small><button type="button" data-act="issDrop" data-id="${E(s.id)}" aria-label="Убрать из заказа" ${ss.length > 1 ? "" : "disabled"}>${I("x")}</button></span>`; }).join("")}</div></div>
      <h3 class="h3 mt2">Получатель</h3>
      <div class="row2" data-hl="iss-recv"><label class="fld"><span>ФИО получателя</span><input class="inp" data-in="issRecv" data-k="name" value="${E(d.recv.name)}" placeholder="Кто принимает груз" autocomplete="off"></label><label class="fld"><span>Телефон</span><input class="inp" data-in="issRecv" data-k="phone" value="${E(d.recv.phone)}" placeholder="+7 900 000-00-00" inputmode="tel" autocomplete="off"></label></div>
      <div class="fld mt"><span class="row"><span class="grow">Адрес</span><span id="issCopy"${d.recv.addr ? "" : " hidden"}>${K.copyBtn(d.recv.addr)}</span></span><input class="inp" data-in="issRecv" data-k="addr" value="${E(d.recv.addr)}" placeholder="Город, улица, дом, как проехать" autocomplete="off"></div>
      <p class="muted s12 mt8 p0">Подставлено из карточки клиента, для этой выдачи можно исправить.</p>
      <div class="fld mt"><span>Способ выдачи</span><div class="choice cols3" data-hl="iss-way">${Object.keys(st.WAY).map((k) => `<button type="button" class="${d.way === k ? "on" : ""}" data-act="issWay" data-k="${k}" data-iw="${k}">${I(st.WAY[k].ic)}${st.WAY[k].t}</button>`).join("")}</div></div>
      ${d.way === "tk" ? `<div class="fld mt"><span>Транспортная компания</span><div class="choice cols3" data-hl="iss-tk">${st.TK.map((k) => `<button type="button" class="${d.tk === k ? "on" : ""}" data-act="issTk" data-k="${E(k)}">${E(k)}</button>`).join("")}</div></div>` : ""}
      <div class="fld mt"><span>Расходы при выдаче: погрузка, снять паллет, кара</span><div class="choice cols2" data-hl="iss-payer">${[["client", "Платит клиент", "прибавятся к стоимости груза"], ["us", "Платим мы", "за счёт компании"]].map(([k, t, s]) => `<button type="button" class="${d.payer === k ? "on" : ""}" data-act="issPayer" data-k="${k}" data-ip="${k}"><span>${t}<small>${s}</small></span></button>`).join("")}</div></div>
      <div class="iss-pay mt" data-hl="iss-collect"><div class="swr"><span><b>Получить оплату при выдаче</b><small>${debt ? "долг по выбранным трекам " + st.rub(debt) : "по выбранным трекам долга нет"}</small></span><button class="sw${d.collect ? " on" : ""}" type="button" data-act="issCollect" id="issCollect" aria-label="Получить оплату при выдаче"><i></i></button></div>
        ${d.collect ? `<label class="fld mt8"><span>Сумма, ₽</span><input class="inp" data-in="issIn" data-k="collectRub" id="issSum" inputmode="numeric" value="${E(d.collectRub)}" placeholder="0" data-enter="#btnIssueGo"></label>` : ""}</div>
      <label class="fld mt"><span>Примечание для склада</span><input class="inp" data-in="issIn" data-k="note" value="${E(d.note)}" placeholder="Например: позвонить за час до приезда" autocomplete="off"></label>
      <div class="found mt">${I("bell")}<span>Заказ уйдёт складу в Москве в раздел «Готов к выдаче»<small>клиент получит уведомление: способ выдачи${d.collect ? " и сумма к оплате" : ""}</small></span></div>
      <div class="mf"><button class="btn" type="button" data-act="issBack">Отмена</button><button class="btn pri" type="button" data-act="issGo" id="btnIssueGo">${I("check")}Готово</button></div>`, "wide");
  }

  // ---------- карточка заказа на выдачу ----------
  function issOpen(id) { const o = st.issueOrder(id); if (!o || !vis(o)) return; App.tmp.isc = id; ordModal(); }
  function ordModal() {
    const o = st.issueOrder(App.tmp.isc); if (!o) { App.tmp.isc = null; App.closeDesk(); return; }
    const ss = st.issueShips(o), c = st.client(o.clientId) || { id: o.clientId, name: "" }, due = st.issueDue(o), rest = st.issueRest(o), canI = can("issue");
    const left = ss.filter((s) => s.status === "arrived" && s.sub === "issuing");
    const rows = ss.map((s) => {
      const done = s.status === "done", act = !done && s.sub === "issuing" && canI ? `<button class="btn sm pri" type="button" data-act="repOpen" data-id="${E(s.id)}" data-rep="${E(s.id)}">${I("camera")}Фотоотчёт и выдача</button>` : "";
      return `<div class="io-tr" data-iot="${E(s.id)}"><button class="io-tb" type="button" data-act="openItem" data-t="ship" data-id="${E(s.id)}" title="Открыть карточку ${E(s.id)}"><span class="cgc-ph">${shPhoto(s) || I("camera")}</span><span class="cgc-t"><b class="mono">${E(s.id)}</b><small>${E(cg(s).name || "наименование не указано")}</small><span class="cgc-m">${sumText([s])}</span></span></button><span class="io-a">${done ? K.pill("done", false, K.issuedText(s)) : K.subPill(s)}${act}</span></div>`;
    }).join("");
    const steps = [["Заказ создан", o.at, o.by], ["Принят складом в работу", o.acceptedAt, o.acceptedBy], [o.gotRub ? "Получена оплата " + st.rub(o.gotRub) : "", o.gotAt, o.gotBy], [o.way === "tk" ? "Передан в ТК" : "Выдан", o.status === "done" ? o.doneAt : null, o.doneBy]].filter((x) => x[0] && x[1]);
    const next = o.status === "ready" ? "Склад в Москве: «Принят»" : o.status === "issuing" ? "Фотоотчёт и «Готово» по каждому треку" : "";
    const tl = steps.map((x) => `<li class="done"><b>${E(x[0])}</b><small>${u.dShort(x[1])} · ${u.hm(x[1])} · ${E(st.who(x[2]))}</small></li>`).join("") + (next ? `<li class="todo"><b>${E(next)}</b></li>` : "");
    const cl = K.allowed("clients") ? `<span class="lnk" data-act="d" data-s="client" data-p="${E(c.id)}">${E(c.name || c.id)}</span>` : E(c.name);
    K.show("issc", `<div class="mh"><div class="mi">${I("file")}</div><div><h2>Заказ на выдачу ${E(o.id)}</h2><div class="muted s13 io-s"><span class="tag code">${E(c.id)}</span>${cl} · ${st.tracksWord(ss.length)}, ${sumText(ss)}</div></div>${ordPill(o, true)}${xBtn}</div>
      <div class="io-l" data-hl="io-tracks">${rows}</div>
      <div class="io-g mt">
        <div class="box flat" data-hl="io-recv"><h3>${I("pin")}Получатель и выдача</h3><dl class="kv"><dt>Получатель</dt><dd>${E(o.recv.name) || '<span class="muted">не указан</span>'}</dd><dt>Телефон</dt><dd>${E(o.recv.phone) || '<span class="muted">не указан</span>'}</dd>
          <dt>Адрес</dt><dd class="tt-dd">${E(o.recv.addr) || '<span class="muted">не указан</span>'}${o.recv.addr ? K.copyBtn(o.recv.addr) : ""}</dd><dt>Способ выдачи</dt><dd>${E(K.wayText(o))}</dd><dt>Расходы при выдаче</dt><dd>${o.payer === "client" ? "платит клиент" : "платим мы"}</dd>
          <dt>Получить оплату</dt><dd>${o.collect ? st.rub(o.collectRub) : '<span class="muted">не нужно</span>'}${due > (o.collect ? o.collectRub : 0) ? `<span class="muted s12 blk">с расходами при выдаче ${st.rub(due)}</span>` : ""}</dd>${o.gotRub ? `<dt>Получено</dt><dd class="ok">${st.rub(o.gotRub)}, ${u.when(o.gotAt)}</dd>` : ""}
          ${o.note ? `<dt>Примечание</dt><dd>${E(o.note)}</dd>` : ""}</dl>
          ${rest > 0 && o.status !== "ready" && canI ? `<div class="found bad mt8">${I("wallet")}<span>Получить с клиента: ${st.rub(rest)}<small>отметьте, когда склад получит деньги</small></span><button class="btn sm" type="button" data-act="issPaid" data-id="${E(o.id)}" id="btnIssPaid">Получено</button></div>` : ""}</div>
        <div class="box flat"><h3>${I("history")}Статус заказа</h3><ol class="tl">${tl}</ol></div></div>
      <div class="mf">${o.status !== "done" && can("issuecmd") ? `<button class="btn ghost" type="button" data-act="issCancel" data-id="${E(o.id)}" id="btnIssCancel">${I("x")}Отменить заказ</button>` : ""}<span class="grow"></span>
        ${o.status === "ready" && canI ? `<button class="btn pri" type="button" data-act="issAccept" data-id="${E(o.id)}" id="btnIssAccept">${I("check")}Принять за склад</button>`
          : o.status === "issuing" && canI && left.length ? `<button class="btn pri" type="button" data-act="repOpen" data-id="${E(left[0].id)}" id="btnRepOpen">${I("camera")}Фотоотчёт и выдача</button>` : `<button class="btn" type="button" data-act="closeDesk">Закрыть</button>`}</div>`, "wide");
  }

  // ---------- фотоотчёт и выдача за склад в Москве: та же форма, что у склада. Ни одно поле не обязательно ----------
  function repStart(id, from) {
    const s = st.ship(id), o = st.issueOf(s); if (!s || !o || s.status !== "arrived" || s.sub !== "issuing" || !can("issue")) return;
    if (!App.tmp.rep || App.tmp.rep.id !== id) App.tmp.rep = { id, oid: o.id, photos: [], dmg: null, dmgText: "", exp: { load: "", pallet: "", fork: "", other: "" }, note: "", waybill: "", from: from || null };
    else App.tmp.rep.from = from || App.tmp.rep.from;
    repModal();
  }
  const repExpSum = (d) => st.REPX.reduce((a, [k]) => a + Math.max(0, Math.round(u.parse(d.exp[k]))), 0);
  const repSumText = (d, o) => { const x = repExpSum(d); return x ? `Расходы при выдаче: ${st.rub(x)}, ${o.payer === "client" ? "платит клиент: прибавятся к стоимости груза" : "платит компания"}` : "Расходов нет: оставьте поля пустыми"; };
  function repModal() {
    const d = App.tmp.rep, s = d && st.ship(d.id), o = s && st.issueOf(s);
    if (!s || !o || s.status !== "arrived" || s.sub !== "issuing") { App.tmp.rep = null; if (App.tmp.mk === "rep") App.closeDesk(); return; }
    const t = st.totals(s), c = cg(s), rest = st.issueRest(o), tk = o.way === "tk";
    K.show("rep", `<div class="mh"><div class="mi">${I("camera")}</div><div><h2>Фотоотчёт и выдача</h2><div class="muted s13"><span class="mono">${E(s.id)}</span> · ${E(s.clientId)} ${E(cname(s.clientId))} · заказ ${E(o.id)}</div></div>${xBtn}</div>
      <div class="rep-k"><div><small>Вес</small><b>${u.kg(t.weight)}</b></div><div><small>Объём</small><b>${u.vol(t.volume)}</b></div><div><small>Мест</small><b>${t.places}</b></div></div>
      <div class="note mt">${I(st.WAY[o.way].ic)}<b>${E(K.wayText(o))}</b>${o.recv.name ? ": " + E(o.recv.name) : ""}${o.recv.phone ? ", " + E(o.recv.phone) : ""}${o.recv.addr && o.way !== "pickup" ? ". " + E(o.recv.addr) : ""}${o.note ? `. Примечание: ${E(o.note)}` : ""}</div>
      <div class="fld mt"><span>Фото при выдаче</span><div class="cam sm" data-hl="rep-photo">${d.photos.map((p) => `<div class="shot">${u.photo(p, c.packType)}</div>`).join("")}${d.photos.length < 4 ? `<button class="add" type="button" data-act="repPhoto" id="btnRepPhoto">${I("camera")}<span>${d.photos.length ? "Ещё" : "Фото"}</span></button>` : ""}</div></div>
      <div class="fld mt"><span>Повреждение</span><div class="choice cols2" data-hl="rep-dmg"><button type="button" class="${d.dmg === "no" ? "on" : ""}" data-act="repDmg" data-k="no">Нет</button><button type="button" class="${d.dmg === "yes" ? "on" : ""}" data-act="repDmg" data-k="yes">Есть</button></div>${d.dmg === "yes" ? `<input class="inp mt8" data-in="repIn" data-k="dmgText" value="${E(d.dmgText)}" placeholder="Что повреждено" autocomplete="off">` : ""}</div>
      <div class="fld mt"><span>Расходы при выдаче, ₽</span><div class="tp-packs" data-hl="rep-exp">${st.REPX.map(([k, n]) => `<label><span>${n}</span><input class="inp" data-in="repExp" data-k="${k}" inputmode="numeric" value="${E(d.exp[k])}" placeholder="0"></label>`).join("")}</div><div class="req left" id="repSum">${repSumText(d, o)}</div></div>
      ${tk ? `<label class="fld mt"><span>Номер накладной ТК ${E(o.tk)}</span><input class="inp mono" data-in="repIn" data-k="waybill" value="${E(d.waybill)}" placeholder="Номер с накладной" autocomplete="off" data-hl="rep-waybill"></label>` : ""}
      <label class="fld mt"><span>Примечание</span><input class="inp" data-in="repIn" data-k="note" value="${E(d.note)}" placeholder="Необязательно" autocomplete="off"></label>
      ${rest > 0 ? `<div class="found bad mt">${I("wallet")}<span>Получить с клиента: ${st.rub(rest)}<small>оплата по заказу ещё не отмечена полученной</small></span><button class="btn sm" type="button" data-act="issPaid" data-id="${E(o.id)}" id="btnRepPaid">Получено</button></div>` : o.gotRub ? `<div class="found mt">${I("check")}<span>Оплата получена: ${st.rub(o.gotRub)}</span></div>` : ""}
      <div class="mf"><span class="muted s12 mf-l">Ни одно поле не обязательно</span><button class="btn" type="button" data-act="repBack">Отмена</button><button class="btn pri" type="button" data-act="repGo" id="btnRepGo">${I("check")}${tk ? "Готово: передан в ТК" : "Готово: выдан"}</button></div>`, "wide");
  }
  function repDo(paid) {
    App.closeOverlay();
    const d = App.tmp.rep; if (!d || !can("issue")) return;
    const exp = {}; st.REPX.forEach(([k]) => { exp[k] = u.parse(d.exp[k]); });
    const s = st.issueDone(d.id, { photos: d.photos.slice(), damage: d.dmg === "yes" ? d.dmgText.trim() || "Есть повреждение" : "", exp, note: d.note, waybill: d.waybill, by: actor() });
    if (!s) return;
    const o = st.issueOf(s), got = paid && o ? st.issueCollect(o.id, actor()) : 0, from = d.from;
    App.tmp.rep = null;
    if (from === "card") App.D.openItem("ship", s.id); else if (from === "issc" && o) issOpen(o.id); else App.closeDesk();
    App.toast(`Груз ${s.id} ${s.issue.type === "tk" ? "передан в ТК " + s.issue.tk + ", накладная " + s.issue.waybill : "выдан"}${got ? ", получено " + st.rub(got) : ""}. Клиент получил уведомление`, "check");
    scn("issued", s);
  }

  // ---------- действия ----------
  const back = (from, shipId, oid) => { if (from === "card" && st.ship(shipId)) App.D.openItem("ship", shipId); else if (from === "issc" && st.issueOrder(oid)) issOpen(oid); else App.closeDesk(); };
  const exportCons = () => {
    const tab = curTab(), r = K.seeRoute(), m = K.seeMoney(), day = K.today();
    if (tab === "way") return K.csvDl("otpravki_v_puti_" + day + ".csv", [["Трек-номер", "Код клиента", "Клиент", "Вид доставки"].concat(r ? ["Маршрут"] : []).concat(["Место назначения", "Мест", "Вес, кг", "Объём, м³", "Отправлен", "Прибытие"]).concat(m ? ["Стоимость, $", "Оплачено"] : [])]
      .concat(wayList().map((s) => { const t = st.totals(s); return [s.id, s.clientId, cname(s.clientId), K.TR(s.transport).t].concat(r ? [s.route] : []).concat([s.dest, t.places, Math.round(t.weight), u.num(t.volume, 2), u.dFull(s.sentAt), u.dFull(s.eta)]).concat(m ? [s.cost, st.isPaid(s) ? "да" : "нет"] : []); })));
    if (tab === "arr") return K.csvDl("pribyvshie_" + day + ".csv", [["Трек-номер", "Код клиента", "Клиент", "Наименование", "Подстатус", "Заказ на выдачу", "Мест", "Вес, кг", "Объём, м³"].concat(r ? ["Маршрут"] : []).concat(["Прибыл", "Дней на хранении"])]
      .concat(arrAll().sort((a, b) => a.clientId.localeCompare(b.clientId) || b.arrivedAt - a.arrivedAt).map((s) => { const t = st.totals(s), o = st.issueOf(s); return [s.id, s.clientId, cname(s.clientId), cg(s).name || "", st.SUB[s.sub] || "", o ? o.id : "", t.places, Math.round(t.weight), u.num(t.volume, 2)].concat(r ? [s.route] : []).concat([u.dFull(s.arrivedAt), st.storeDays(s)]); })));
    if (tab === "all") return K.csvDl("otpravki_vse_" + day + ".csv", [["Трек-номер", "Код клиента", "Клиент", "Статус", "Вид доставки"].concat(r ? ["Маршрут"] : []).concat(["Место назначения", "Мест", "Вес, кг", "Объём, м³", "Отправлен"]).concat(m ? ["Стоимость, $", "Оплачено"] : [])]
      .concat(allList().map((s) => { const t = st.totals(s); return [s.id, s.clientId, cname(s.clientId), (ALL_ST.find((x) => x[0] === stKey(s)) || ["", ""])[1], K.TR(s.transport).t].concat(r ? [s.route] : []).concat([s.dest, t.places, Math.round(t.weight), u.num(t.volume, 2), u.dFull(s.sentAt)]).concat(m ? [s.cost, st.isPaid(s) ? "да" : "нет"] : []); })));
    return K.csvDl("arhiv_vydachi_" + day + ".csv", [["Трек-номер", "Код клиента", "Клиент", "Способ выдачи", "Накладная", "Дата выдачи", "Расходы, ₽", "Кто платит расходы", "Выдал"]]
      .concat(archList().map((s) => { const o = st.issueOf(s); return [s.id, s.clientId, cname(s.clientId), wayDone(s), s.issue && s.issue.type === "tk" ? s.issue.waybill : "", u.dFull(s.doneAt), st.repSum(s.rep), o && o.payer === "client" ? "клиент" : "компания", st.who(s.doneBy)]; })));
  };
  Object.assign(App.acts, {
    ctab: (d) => { if (!tabOk(d.k)) return; App.tmp.ctab = d.k; App.go.desk("cons"); scn("ctab", d.k); },
    acode: (d) => { App.tmp.acode = d.c; App.tmp.asel = []; App.refresh(true); scn("acode", d.c); },
    asub: (d) => { App.tmp.asub = d.k; App.refresh(true); },
    aSel: (d) => { const s = st.ship(d.id); if (!s || s.sub !== "store" || !can("issuecmd")) return; const sel = App.tmp.asel || (App.tmp.asel = []), i = sel.indexOf(d.id); if (i >= 0) sel.splice(i, 1); else sel.push(d.id); App.refresh(true); },
    aAll: () => {
      const all = arrGroups()[App.tmp.acode] || [], sub = st.SUB[App.tmp.asub] ? App.tmp.asub : "all", ids = all.filter((s) => s.sub === "store" && (sub === "all" || s.sub === sub)).map((s) => s.id), sel = asel(all);
      App.tmp.asel = ids.every((id) => sel.includes(id)) ? sel.filter((id) => !ids.includes(id)) : [...new Set(sel.concat(ids))]; App.refresh(true);
    },
    cfClear: () => { App.tmp.cf = cfDef(); App.refresh(true); },
    afClear: () => { App.tmp.af = afDef(); App.refresh(true); },
    xfClear: () => { App.tmp.xf = xfDef(); App.refresh(true); },
    exportCons,
    // окно «Выдать»
    issNew: () => { const sel = (App.tmp.asel || []).slice(); if (sel.length) issStart(sel, null); },
    issOne: (d) => issStart([d.id], "card"),
    issDrop: (d) => { const x = App.tmp.iss; if (!x || x.ids.length < 2) return; x.ids = x.ids.filter((id) => id !== d.id); if (x.collect) x.collectRub = String(st.debtRub(x.ids) || ""); issModal(); },
    issWay: (d) => { const x = App.tmp.iss; if (!x) return; x.way = d.k; if (d.k === "tk" && !x.tk) x.tk = st.TK[0]; x.picked = true; issModal(); },
    issTk: (d) => { if (App.tmp.iss) { App.tmp.iss.tk = d.k; issModal(); } },
    issPayer: (d) => { if (App.tmp.iss) { App.tmp.iss.payer = d.k; issModal(); } },
    issCollect: () => { const x = App.tmp.iss; if (!x) return; x.collect = !x.collect; if (x.collect && !(u.parse(x.collectRub) > 0)) x.collectRub = String(st.debtRub(x.ids) || ""); issModal(); },
    issFill: () => {
      const x = App.tmp.iss; if (!x) return; const c = st.client(x.clientId) || {};
      x.recv.name = x.recv.name || c.person || "Андрей Ковалёв"; x.recv.phone = x.recv.phone || c.phone || "+7 900 000-00-11"; x.recv.addr = x.recv.addr || "Москва, ул. Лесная, 4, склад 1";
      x.collect = true; if (!(u.parse(x.collectRub) > 0)) x.collectRub = String(st.debtRub(x.ids) || 15000); x.note = x.note || "Позвонить за час до приезда"; x.picked = true; issModal();
    },
    issBack: () => { const x = App.tmp.iss; App.tmp.iss = null; back(x && x.from, x && x.ids[0]); },
    issGo: () => {
      const x = App.tmp.iss; if (!x || !can("issuecmd")) return;
      const o = st.issueCreate(x.ids.slice(), { recv: x.recv, way: x.way, tk: x.tk, payer: x.payer, collect: x.collect, collectRub: u.parse(x.collectRub), note: x.note, by: actor() });
      App.tmp.iss = null; App.tmp.asel = [];
      if (!o) { App.closeDesk(); return; }
      if (x.from === "card") App.D.openItem("ship", o.shipIds[0]); else App.closeDesk();
      App.toast(`Заказ ${o.id}: ${st.tracksWord(o.shipIds.length)} готовы к выдаче. Склад в Москве и клиент получили уведомления`, "send");
      scn("issuecmd", o);
    },
    // карточка заказа на выдачу
    issOpen: (d) => issOpen(d.id),
    issAccept: (d) => { if (!can("issue")) return; const o = st.issueAccept(d.id, actor()); if (!o) return; App.toast(`Заказ ${o.id} принят за склад: ${st.tracksWord(o.shipIds.length)} в работе, осталось заполнить фотоотчёт`, "check"); scn("issueacc", o); },
    issPaid: (d) => { if (!can("issue")) return; const x = st.issueCollect(d.id, actor()); if (x) App.toast(`Оплата ${st.rub(x)} получена: долг клиента уменьшен, сумма во взаиморасчётах со складом`, "wallet"); },
    issCancel: (d) => { if (!can("issuecmd")) return; K.confirmBox("Отменить заказ на выдачу?", `Заказ ${E(d.id)} будет отменён, невыданные треки вернутся на хранение. Клиент получит уведомление, запись появится в истории действий.`, "issCancelYes", d.id, "Отменить заказ"); },
    issCancelYes: (d) => { App.closeOverlay(); const o = st.issueCancel(d.id, actor()); if (o) App.toast(`Заказ ${o.id} отменён, треки снова на хранении`, "x"); },
    // фотоотчёт и выдача
    repOpen: (d) => repStart(d.id, App.tmp.mk === "card" ? "card" : App.tmp.mk === "issc" ? "issc" : null),
    repPhoto: () => { const x = App.tmp.rep; if (x && x.photos.length < 4) { x.photos.push(photoSeq++); repModal(); } },
    repDmg: (d) => { const x = App.tmp.rep; if (x) { x.dmg = x.dmg === d.k ? null : d.k; repModal(); } },
    repFill: () => {
      const x = App.tmp.rep, o = x && st.issueOrder(x.oid); if (!x) return;
      if (!x.photos.length) x.photos.push(photoSeq++, photoSeq++); if (!x.dmg) x.dmg = "no";
      if (!repExpSum(x)) x.exp = { load: "1500", pallet: "", fork: "800", other: "" };
      if (o && o.way === "tk" && !x.waybill) x.waybill = "1045 2231 7788"; repModal();
    },
    repBack: () => { const x = App.tmp.rep; back(x && x.from, x && x.id, x && x.oid); },
    repGo: () => {
      const x = App.tmp.rep, s = x && st.ship(x.id), o = s && st.issueOf(s); if (!o) return;
      const rest = st.issueRest(o);
      if (rest > 0) { App.overlay(`<span class="opt">${I("alert")}<span class="ol">Подтверждение</span></span><h2>Оплата не получена, всё равно выдать?</h2><p>По заказу ${E(o.id)} нужно получить с клиента ${st.rub(rest)}. Если деньги уже у склада, нажмите «Получено и выдать».</p><div class="of"><button class="btn pri lg" type="button" data-act="repGoPaid" id="btnRepPaidGo">${I("wallet")}Получено и выдать</button><button class="btn lg" type="button" data-act="repGoYes" id="btnRepForce">Выдать без оплаты</button><button class="btn lg ghost" type="button" data-act="ovClose">Отмена</button></div>`); return; }
      repDo(false);
    },
    repGoPaid: () => repDo(true),
    repGoYes: () => repDo(false),
    ovClose: () => App.closeOverlay(),
  });
  Object.assign(App.taPick, {
    aq: (v) => { App.tmp.aq = ""; if (!arrGroups()[v]) { App.toast(`У клиента ${v} сейчас нет прибывших грузов`, "info"); App.refresh(true); return; } App.tmp.acode = v; App.tmp.asel = []; App.refresh(true); scn("acode", v); },
  });
  Object.assign(App.taType, {
    aq: (v) => { App.tmp.aq = v; const l = $("arCodes"); if (l) l.innerHTML = arrCodes(arrGroups(), App.tmp.acode); },
  });
  Object.assign(App.ins, {
    cfQ: (v) => { cf().q = v; App.refresh(true); },
    cfDate: (v, el) => { cf()[el.dataset.k] = v; App.refresh(true); },
    afQ: (v) => { af().q = v; App.refresh(true); },
    afDate: (v, el) => { af()[el.dataset.k] = v; App.refresh(true); },
    xfQ: (v) => { xf().q = v; App.refresh(true); },
    xfDate: (v, el) => { xf()[el.dataset.k] = v; App.refresh(true); },
    issRecv: (v, el) => { const x = App.tmp.iss; if (!x) return; x.recv[el.dataset.k] = v; if (el.dataset.k !== "addr") return; const w = $("issCopy"), b = w && w.querySelector("[data-act=copy]"); if (w) w.hidden = !v.trim(); if (b) b.dataset.v = v.trim(); },
    issIn: (v, el) => { if (App.tmp.iss) App.tmp.iss[el.dataset.k] = v; },
    repIn: (v, el) => { if (App.tmp.rep) App.tmp.rep[el.dataset.k] = v; },
    repExp: (v, el) => { const x = App.tmp.rep; if (!x) return; x.exp[el.dataset.k] = v; const o = st.issueOrder(x.oid), m = $("repSum"); if (m && o) m.textContent = repSumText(x, o); },
  });
  Object.assign(App.chg, {
    cfRoute: (v) => { cf().route = v; App.refresh(true); },
    cfTr: (v) => { cf().tr = v; App.refresh(true); },
    afWay: (v) => { af().way = v; App.refresh(true); },
    xfSt: (v) => { xf().st = v; App.refresh(true); },
    xfRoute: (v) => { xf().route = v; App.refresh(true); },
    xfTr: (v) => { xf().tr = v; App.refresh(true); },
  });
  Object.assign(App.D.screens, { cons });
  Object.assign(App.D.modals, { iss: () => issModal(), issc: () => ordModal(), rep: () => repModal() });
  Object.assign(App.D, { issStart, issOpen, issModal, ordModal, repStart, repModal });
})(window.App);
