/* Экраны компьютера: администратор, менеджер в России, менеджер по продажам, бухгалтер (этап 2). */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, I = u.icon, E = u.esc, L = App.i18n.of("ru"), $ = (id) => document.getElementById(id);
  const role = () => App.ui.deskRole;
  const SALES_ME = "timur";
  const seeMoney = () => role() !== "sales";
  const mine = (cid) => role() !== "sales" || (st.client(cid) || {}).salesId === SALES_ME;
  const ST_LONG = { pack: "Упакован, готов к отгрузке" };
  const pill = (s, lg, label) => `<span class="st${lg ? " lg" : ""}" data-st="${s}">${label || (lg && ST_LONG[s]) || L.t("st_" + s)}</span>`;
  const stg = (n) => `<em class="stg s${n}">Этап ${n}</em>`;
  const optBtn = (k, label) => `<button class="opt" type="button" data-act="opt" data-k="${k}">${I((App.OPT[k] || {}).icon || "spark")}<span class="ol">${E(label)}</span><i>опция</i></button>`;
  const cname = (id) => (st.client(id) || {}).name || "Не опознан";
  const whn = (id) => st.wh(id).ru;
  const pk = (k) => L.t("pk_" + k);
  const paidPill = (s) => (st.isPaid(s) ? '<span class="st" data-st="in">оплачено</span>' : s.paidUsd > 0 ? `<span class="st" data-st="pack">оплачено ${u.usd(s.paidUsd)}</span>` : '<span class="st" data-st="unk">не оплачено</span>');
  const xBtn = `<button class="x" type="button" data-act="closeDesk" aria-label="Закрыть">${I("x")}</button>`;
  const today = () => new Date().toISOString().slice(0, 10);

  const TITLES = { board: "Грузы", clients: "Клиенты", client: "Клиенты", cons: "Отправки", dispatch: "Отгрузка", reports: "Отчёты", stages: "Настройка этапов", staff: "Сотрудники", money: "Оплаты и долги", profit: "Расходы и прибыль", tariffs: "Тарифы клиентов", chat: "Чат со складом", included: "Что входит" };
  const NAV = {
    admin: [["board", "board", "Грузы"], ["clients", "users", "Клиенты"], ["cons", "truck", "Отправки"], ["reports", "chart", "Отчёты"], ["stages", "sliders", "Настройка этапов"], ["staff", "team", "Сотрудники"],
      [2, "Деньги и учёт"], ["money", "wallet", "Оплаты и долги"], ["profit", "scale", "Расходы и прибыль"], ["tariffs", "dollar", "Тарифы клиентов"], [3, "Чат с автопереводом"], ["chat", "lang", "Чат со складом"]],
    manager: [["dispatch", "layers", "Отгрузка"], ["board", "board", "Грузы"], ["cons", "truck", "Отправки"], ["clients", "users", "Клиенты"], [3, "Чат с автопереводом"], ["chat", "lang", "Чат со складом"]],
    sales: [["clients", "users", "Мои клиенты"], ["board", "board", "Грузы клиентов"]],
    accountant: [[2, "Деньги и учёт"], ["money", "wallet", "Оплаты и долги"], ["profit", "scale", "Расходы и прибыль"], ["tariffs", "dollar", "Тарифы клиентов"]],
  };
  const allowed = (r, s) => s === "included" || NAV[r].some((x) => x[0] === s) || (s === "client" && NAV[r].some((x) => x[0] === "clients"));

  function counts() {
    const S = st.S;
    return {
      board: st.waiting().filter((r) => mine(r.clientId)).length + st.ready().filter((c) => mine(c.clientId)).length + S.ships.filter((s) => s.status !== "done" && mine(s.clientId)).length,
      clients: S.clients.filter((c) => mine(c.id)).length,
      cons: S.ships.filter((s) => s.status !== "done").length,
      dispatch: st.ready().length,
      chat: st.unreadAll("ru") || null,
    };
  }
  function side(r, cur, R) {
    const c = counts(), curNav = cur === "client" ? "clients" : cur;
    const items = NAV[r].map((x) => (typeof x[0] === "number" ? `<div class="nav-g"><span>${x[1]}</span>${stg(x[0])}</div>`
      : `<a data-act="d" data-s="${x[0]}" class="${curNav === x[0] ? "on" : ""}" data-nav="${x[0]}">${I(x[1])}<span>${x[2]}</span>${c[x[0]] != null ? `<b${x[0] === "chat" ? ' class="hot"' : ""}>${c[x[0]]}</b>` : ""}</a>`)).join("");
    return `<div class="nav">${items}</div><div class="sep"></div>
      <div class="nav"><a data-act="d" data-s="included" class="${cur === "included" ? "on" : ""}" data-nav="included">${I("grid")}<span>Что входит</span></a></div>
      <div class="me"><span class="ava">${R.ava}</span><span>${E(R.name)}<small>${E(R.role)}</small></span></div>`;
  }

  // ---------- доска грузов ----------
  function recCard(r) {
    const c = st.client(r.clientId);
    return `<button class="sc${r.fresh ? " new" : ""}" type="button" data-act="openItem" data-t="rec" data-id="${r.id}" data-bc="rec:${r.id}">
      <span class="t"><span class="code">${E(c.id)}</span><span class="id">${E(r.id)}</span></span>
      <span class="nm">${E(c.name)}</span><span class="sp">${E(r.supplier)}</span>
      <span class="m"><span>${u.places(r.places)}</span>${r.damage ? '<span class="bad">есть повреждения</span>' : ""}</span>
      <span class="f"><span>${E(whn(r.wh))}</span><span>${u.when(r.at)}</span></span></button>`;
  }
  function cargoCard(c) {
    const cl = st.client(c.clientId), n = c.receiptIds.length;
    return `<button class="sc${c.fresh ? " new" : ""}" type="button" data-act="openItem" data-t="cargo" data-id="${c.id}" data-bc="cargo:${c.id}">
      <span class="t"><span class="code">${E(cl.id)}</span><span class="id">${E(c.id)}</span></span>
      <span class="nm">${E(cl.name)}</span><span class="sp">${pk(c.packType)} · ${n} ${u.plural(n, "приход", "прихода", "приходов")}</span>
      <span class="m"><span>${u.places(c.places)}</span><span>${u.kg(c.weight)}</span><span>${u.vol(c.volume)}</span></span>
      <span class="f"><span>${E(whn(c.wh))}</span><span>${c.sent ? "на складе " + st.left(c) + " из " + c.places : "готов к отгрузке"}</span></span></button>`;
  }
  function shipCard(s) {
    const cl = st.client(s.clientId), t = st.totals(s);
    return `<button class="sc${s.fresh ? " new" : ""}" type="button" data-act="openItem" data-t="ship" data-id="${s.id}" data-bc="ship:${s.id}">
      <span class="t"><span class="code">${E(cl.id)}</span><span class="id">${E(s.id)}</span></span>
      <span class="nm">${E(cl.name)}</span><span class="sp">${st.TRANSPORT[s.transport].t} · ${u.places(t.places)}</span>
      <span class="m"><span>${u.kg(t.weight)}</span><span>${u.vol(t.volume)}</span></span>
      <span class="f"><span>${s.status === "way" ? "прибытие ≈" + u.NB + u.dShort(s.eta) : "ждёт выдачи"}</span><span>${seeMoney() ? u.usd(s.cost) + (st.isPaid(s) ? " · опл." : "") : u.dShort(s.sentAt)}</span></span></button>`;
  }
  function boardData() {
    const S = st.S, q = App.tmp.q.trim().toUpperCase(), f = App.tmp.whF;
    const txt = (cid, a) => !q || [cid, cname(cid)].concat(a).some((x) => String(x || "").toUpperCase().includes(q));
    const shipWh = (s) => s.items.some((x) => (st.cargo(x.cargoId) || {}).wh === f);
    return {
      in: st.waiting().filter((r) => mine(r.clientId) && (f === "all" || r.wh === f) && txt(r.clientId, [r.id, r.supplier, r.track])).sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || b.at - a.at),
      pack: st.ready().filter((c) => mine(c.clientId) && (f === "all" || c.wh === f) && txt(c.clientId, [c.id])).sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || b.at - a.at),
      way: S.ships.filter((s) => s.status === "way" && mine(s.clientId) && (f === "all" || shipWh(s)) && txt(s.clientId, [s.id])).sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || a.eta - b.eta),
      arrived: S.ships.filter((s) => s.status === "arrived" && mine(s.clientId) && (f === "all" || shipWh(s)) && txt(s.clientId, [s.id])).sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || b.arrivedAt - a.arrivedAt),
    };
  }
  function board() {
    const S = st.S, d = boardData(), f = App.tmp.whF, all = App.tmp.laneAll || {};
    const render = { in: recCard, pack: cargoCard, way: shipCard, arrived: shipCard };
    const lanes = ["in", "pack", "way", "arrived"].map((k) => {
      const list = d[k], shown = all[k] ? list : list.slice(0, 4);
      return `<div class="lane" data-lane="${k}"><div class="lane-h">${pill(k)}<b>${list.length}</b></div>
        ${shown.map(render[k]).join("") || '<div class="lane-empty">Пусто</div>'}
        ${list.length > 4 ? `<button class="lane-more" type="button" data-act="laneAll" data-k="${k}">${all[k] ? "свернуть" : "показать ещё " + (list.length - 4)}</button>` : ""}</div>`;
    }).join("");
    const wait = st.waiting().filter((r) => mine(r.clientId)), rdy = st.ready().filter((c) => mine(c.clientId));
    const way = S.ships.filter((s) => s.status === "way" && mine(s.clientId)).sort((a, b) => a.eta - b.eta), arr = S.ships.filter((s) => s.status === "arrived" && mine(s.clientId));
    const unk = st.unknown().length, exp = S.expected.filter((e) => mine(e.clientId));
    const done = S.ships.filter((s) => s.status === "done" && mine(s.clientId)).length;
    const k4 = role() === "sales"
      ? `<button class="kpi" type="button" data-act="d" data-s="clients"><span>Мои клиенты</span><strong>${S.clients.filter((c) => mine(c.id)).length}</strong><small>закреплены за вами</small></button>`
      : `<button class="kpi${unk ? " bad" : ""}" type="button" data-act="unknown" data-hl="kpi-unk"><span>Неопознанные</span><strong>${unk}</strong><small>${unk ? "ждут привязки к клиенту" : "всё разобрано"}</small></button>`;
    return `<div class="pane">
      <div class="ph"><h1>${role() === "sales" ? "Грузы моих клиентов" : "Грузы"}</h1><label class="search">${I("search")}<input data-in="q" value="${E(App.tmp.q)}" placeholder="Код клиента, номер, поставщик, трек-номер"></label><span class="grow"></span><button class="btn" type="button" data-act="exportBoard">${I("download")}Выгрузить в Excel</button></div>
      <div class="kpis">
        <div class="kpi hero"><span>На складах в Китае</span><strong>${wait.length + rdy.length}</strong><small>ждут упаковки ${wait.length} · упакованы ${rdy.length}</small></div>
        <div class="kpi"><span>В пути</span><strong>${way.length}</strong><small>${way.length ? "ближайшая прибудет " + u.dShort(way[0].eta) : "нет отправок"}</small></div>
        <div class="kpi"><span>Ждут выдачи в Москве</span><strong>${arr.length}</strong><small>${u.places(arr.reduce((a, s) => a + st.totals(s).places, 0))}</small></div>
        ${k4}
      </div>
      <div class="fbar"><div class="seg light sm" data-hl="wh-filter">${[["all", "Все склады"]].concat(st.WH.map((w) => [w.id, w.ru])).map(([k, t]) => `<button type="button" class="${f === k ? "on" : ""}" data-act="whF" data-k="${k}">${t}</button>`).join("")}</div>
        ${exp.length ? `<div class="wait-strip">${I("clock")}<span>Ожидаются по трек-номерам:</span>${exp.slice(0, 3).map((e) => `<span class="chip"><b>${E(e.clientId)}</b>${E(e.track.slice(0, 6))}…</span>`).join("")}${exp.length > 3 ? `<span class="chip">+${exp.length - 3}</span>` : ""}</div>` : ""}</div>
      <div class="board">${lanes}</div>
      <p class="muted mt foot">Выдано за всё время: ${done} ${u.plural(done, "отправка", "отправки", "отправок")}. <span class="lnk" data-act="d" data-s="${role() === "sales" ? "clients" : "cons"}">${role() === "sales" ? "Мои клиенты" : "Все отправки"}</span></p>
    </div>`;
  }

  // ---------- карточки: приход, груз, отправка ----------
  const tlItem = (cls, title, at, by) => `<li class="${cls}"><b>${title}</b>${at ? `<small>${u.dShort(at)} · ${u.hm(at)}${by ? " · " + E(st.who(by)) : ""}</small>` : ""}</li>`;
  const clientRow = (c) => `<div class="row"><span class="tag code">${E(c.id)}</span>${allowed(role(), "clients") ? `<span class="lnk" data-act="d" data-s="client" data-p="${c.id}">${E(c.name)}</span>` : `<b>${E(c.name)}</b>`}<span class="muted">${E(c.city)}</span></div>`;
  const chatBtn = (t, id) => (allowed(role(), "chat") ? `<button class="btn" type="button" data-act="chatOpen" data-t="${t}" data-id="${id}">${I("lang")}Написать складу${stg(3)}</button>` : "");
  function recDrawer(r) {
    const c = r.clientId ? st.client(r.clientId) : null, cg = r.cargoId ? st.cargo(r.cargoId) : null;
    const status = !c ? "unk" : cg ? "pack" : "in";
    const ph = r.photos.map((p, i) => `<div class="ph-i">${u.photo(p)}<em>приёмка ${i + 1}</em></div>`).join("");
    const bind = !c && role() !== "sales" ? `<div class="box warn-box"><b>${I("alert")}Клиент не найден</b><p>${E(r.track ? L.t("unk_track", r.track) : r.mark ? L.t("unk_mark", r.mark) : L.t("unk_none"))}. Привяжите груз к клиенту, и он уйдёт в работу.</p>
      <div class="row"><select class="inp sm" id="unk-${r.id}">${st.S.clients.map((x) => `<option value="${x.id}">${x.id} ${E(x.name)}</option>`).join("")}</select><button class="btn pri" type="button" data-act="assignUnk" data-id="${r.id}">Привязать</button></div></div>` : "";
    return `<div class="dh"><div><small>Приход</small><h2>${E(r.id)}</h2></div>${pill(status, true)}${xBtn}</div>
      <div class="db">
        ${c ? clientRow(c) : bind}
        <div class="photos">${ph}</div>
        <dl class="kv"><dt>Склад</dt><dd>${E(whn(r.wh))}</dd><dt>Китайский трек-номер</dt><dd>${r.track ? E(r.track) : '<span class="muted">не указан</span>'}</dd>
          ${c ? `<dt>Поставщик</dt><dd>${E(r.supplier)}</dd>` : ""}${r.what ? `<dt>Что внутри</dt><dd>${E(r.what)}</dd>` : ""}<dt>Количество мест</dt><dd>${u.places(r.places)}</dd>
          <dt>Повреждения</dt><dd>${r.damage ? `<span class="bad">${E(st.dmgText(r))}</span>` : "нет"}</dd></dl>
        ${cg ? `<button class="linkrow" type="button" data-act="openItem" data-t="cargo" data-id="${cg.id}">${I("layers")}<span><b>Вошёл в груз ${E(cg.id)}</b><small>${pk(cg.packType)}, ${u.places(cg.places)}, ${u.kg(cg.weight)}, ${u.vol(cg.volume)}</small></span>${I("chevron")}</button>` : c ? '<div class="note">Вес и объём появятся после упаковки: склад измеряет их, когда собирает груз.</div>' : ""}
        <div><h3 class="h3">История</h3><ol class="tl">${r.expAt ? tlItem("done", "Клиент внёс трек-номер заранее", r.expAt) : ""}${tlItem(cg ? "done" : "cur", "Принят на складе (" + E(whn(r.wh)) + ")", r.at, r.by)}${cg ? tlItem("done", "Упакован в составе груза " + E(cg.id), cg.at, cg.by) : tlItem("todo", "Упаковка и консолидация")}</ol></div>
        <div class="row wrap">${chatBtn("rec", r.id)}</div>
      </div>`;
  }
  function cargoDrawer(c) {
    const cl = st.client(c.clientId), recs = c.receiptIds.map(st.rec).filter(Boolean), ships = st.shipsOfCargo(c.id), lf = st.left(c);
    const worst = ships.length ? (ships.some((s) => s.status === "way") ? "way" : ships.some((s) => s.status === "arrived") ? "arrived" : "done") : "pack";
    const ph = c.photos.map((p) => `<div class="ph-i">${u.photo(p, c.packType)}<em>упаковка</em></div>`).join("") + recs.slice(0, 2).map((r) => `<div class="ph-i">${u.photo(r.photos[0])}<em>приёмка</em></div>`).join("");
    return `<div class="dh"><div><small>Груз</small><h2>${E(c.id)}</h2></div>${lf ? pill("pack", true) : pill(worst, true, worst === "done" ? "Выдан" : "Отправлен полностью")}${xBtn}</div>
      <div class="db">
        ${clientRow(cl)}
        <div class="photos">${ph}</div>
        <dl class="kv"><dt>Склад</dt><dd>${E(whn(c.wh))}</dd><dt>Упаковка</dt><dd>${pk(c.packType)}</dd><dt>Мест после упаковки</dt><dd>${u.places(c.places)}</dd><dt>Вес</dt><dd>${u.kg(c.weight)}</dd><dt>Объём</dt><dd>${u.vol(c.volume)}</dd>
          <dt>Плотность</dt><dd>${Math.round(c.weight / c.volume)} кг/м³</dd><dt>Сейчас на складе</dt><dd>${lf ? `<b>${lf} из ${c.places}</b> мест` : "всё отправлено"}</dd></dl>
        <div><h3 class="h3">Приходы в составе груза</h3>${recs.map((r) => `<button class="linkrow" type="button" data-act="openItem" data-t="rec" data-id="${r.id}">${I("box")}<span><b>${E(r.id)} · ${E(r.supplier)}</b><small>${u.places(r.places)} · принят ${u.dShort(r.at)}${r.damage ? " · есть повреждения" : ""}</small></span>${I("chevron")}</button>`).join("")}</div>
        ${ships.length ? `<div><h3 class="h3">Отправки</h3>${ships.map((s) => { const x = s.items.find((y) => y.cargoId === c.id); return `<button class="linkrow" type="button" data-act="openItem" data-t="ship" data-id="${s.id}">${I("truck")}<span><b>${E(s.id)} · ${u.places(x.places)}</b><small>отправлена ${u.dShort(s.sentAt)} · ${L.t("st_" + s.status).toLowerCase()}</small></span>${I("chevron")}</button>`; }).join("")}</div>` : ""}
        <div><h3 class="h3">История</h3><ol class="tl">${recs.map((r) => tlItem("done", "Приход " + E(r.id) + " принят на складе", r.at, r.by)).join("")}${tlItem(ships.length ? "done" : "cur", "Упакован: " + pk(c.packType).toLowerCase() + ", " + u.places(c.places), c.at, c.by)}${ships.map((s) => tlItem("done", "Отправлено " + u.places(s.items.find((y) => y.cargoId === c.id).places) + ", трек " + E(s.id), s.sentAt, s.by)).join("")}${lf ? tlItem("todo", ships.length ? "Отправка остатка: " + u.places(lf) : "Отправка из Китая") : ""}</ol></div>
        <div class="row wrap">${chatBtn("cargo", c.id)}</div>
      </div>`;
  }
  const DOCS = ["Упаковочный лист", "Инвойс", "Накладная"];
  function shipDrawer(s) {
    const cl = st.client(s.clientId), t = st.totals(s), r = role(), edit = r === "admin" || r === "manager";
    const moneyBox = seeMoney() ? `<div class="box flat"><div class="row"><div class="grow"><small class="muted">Стоимость, $</small><div class="big">${u.usd(s.cost)}</div></div>${paidPill(s)}
        ${edit || r === "accountant" ? `<button class="sw${st.isPaid(s) ? " on" : ""}" type="button" data-act="togglePaid" data-id="${s.id}" aria-label="Оплачено" title="Отметка «Оплачено»"><i></i></button>` : ""}</div>
        ${r === "admin" || r === "accountant" ? `<div class="pline mini"><span>${stg(2)} Расходы ${u.usd(st.expSum(s))}, прибыль <b class="${s.cost - st.expSum(s) >= 0 ? "ok" : "bad"}">${u.usd(s.cost - st.expSum(s))}</b></span><span class="lnk" data-act="d" data-s="profit">Подробнее</span></div>` : ""}</div>` : "";
    const issue = s.issue ? (s.issue.type === "tk" ? "Передана в ТК " + E(s.issue.tk) + ", накладная " + E(s.issue.waybill) : "Выдана клиенту") : "";
    const has = (n) => s.docs.some((d) => d.name.indexOf(n) === 0);
    return `<div class="dh"><div><small>Отправка</small><h2>${E(s.id)}</h2></div>${pill(s.status, true)}${xBtn}</div>
      <div class="db">
        ${clientRow(cl)}
        <dl class="kv"><dt>Транспорт</dt><dd>${E(st.TRANSPORT[s.transport].label)}</dd><dt>Отправлена</dt><dd>${u.dLong(s.sentAt)}</dd><dt>${s.status === "way" ? "Прибытие" : "Прибыла"}</dt><dd>${s.status === "way" ? "около " + u.dLong(s.eta) : u.dLong(s.arrivedAt)}</dd>
          <dt>Мест</dt><dd>${u.places(t.places)}</dd><dt>Вес и объём</dt><dd>${u.kg(t.weight)} · ${u.vol(t.volume)}</dd></dl>
        ${moneyBox}
        <div><h3 class="h3">Состав отправки</h3>${s.items.map((x) => { const c = st.cargo(x.cargoId); return `<button class="linkrow" type="button" data-act="openItem" data-t="cargo" data-id="${c.id}">${I("layers")}<span><b>${E(c.id)} · ${x.places} из ${c.places} мест</b><small>${pk(c.packType)} · склад ${E(whn(c.wh))}${st.left(c) ? " · на складе осталось " + st.left(c) : ""}</small></span>${I("chevron")}</button>`; }).join("")}</div>
        <div><h3 class="h3">Документы</h3>${s.docs.map((d) => `<div class="docrow">${I("file")}<span><b>${E(d.name)}</b><small>${u.dShort(d.at)} · ${E(st.who(d.by))}</small></span><button class="btn sm" type="button" data-act="toast" data-t="В рабочей версии файл скачается: ${E(d.name)}" data-i="download">Скачать</button></div>`).join("") || '<p class="muted small0">Документов пока нет.</p>'}
          ${edit ? `<div class="row wrap attach"><span class="muted">Прикрепить:</span>${DOCS.filter((n) => !has(n)).map((n) => `<button class="btn sm" type="button" data-act="addDoc" data-id="${s.id}" data-n="${n}">${I("plus")}${n}</button>`).join("") || '<span class="muted">все документы на месте</span>'}</div>` : ""}</div>
        <div><h3 class="h3">История</h3><ol class="tl">${tlItem(s.status === "way" ? "cur" : "done", "Отправлена из Китая, присвоен трек " + E(s.id), s.sentAt, s.by)}${s.arrivedAt ? tlItem(s.status === "arrived" ? "cur" : "done", "Прибыла в Россию", s.arrivedAt, s.arrBy) : tlItem("todo", "Прибытие в Россию, около " + u.dLong(s.eta))}${s.doneAt ? tlItem("done", issue, s.doneAt, s.doneBy) : tlItem("todo", "Выдача клиенту или передача в ТК")}</ol></div>
        <div class="row wrap">${s.status === "way" && st.can("arrive", r) ? `<button class="btn pri" type="button" data-act="arrive" data-id="${s.id}">${I("pin")}Прибыла в Россию</button>` : ""}${s.status === "arrived" ? (st.can("issue", r) ? `<button class="btn dark" type="button" data-act="issueDesk" data-id="${s.id}">${I("check")}Выдать клиенту</button>` : '<span class="muted">Выдаёт сотрудник в Москве</span>') : ""}${r !== "sales" && r !== "accountant" ? optBtn("invoice", "Автоматическая накладная") : ""}</div>
      </div>`;
  }
  function openItem(t, id) {
    const o = t === "rec" ? st.rec(id) : t === "cargo" ? st.cargo(id) : st.ship(id); if (!o) return;
    App.drawer(t === "rec" ? recDrawer(o) : t === "cargo" ? cargoDrawer(o) : shipDrawer(o));
    App.tmp.drawer = { t, id };
    if (o.fresh && !(App.scenario && App.scenario.on())) { o.fresh = false; st.save(); }
    if (App.scenario) App.scenario.check("openItem", t + ":" + id);
  }
  const reopen = () => { const d = App.tmp.drawer; if (d && $("drawer").classList.contains("show")) { const o = d.t === "rec" ? st.rec(d.id) : d.t === "cargo" ? st.cargo(d.id) : st.ship(d.id); if (o) $("drawer").innerHTML = d.t === "rec" ? recDrawer(o) : d.t === "cargo" ? cargoDrawer(o) : shipDrawer(o); } };

  // ---------- клиенты ----------
  function clients() {
    const S = st.S, q = App.tmp.clientsQ.trim().toUpperCase(), m = seeMoney();
    const rows = S.clients.filter((c) => mine(c.id) && (!q || c.id.includes(q) || c.name.toUpperCase().includes(q) || c.city.toUpperCase().includes(q))).map((c) => {
      const a = st.waiting().filter((r) => r.clientId === c.id).length + st.ready().filter((x) => x.clientId === c.id).length + S.ships.filter((s) => s.clientId === c.id && s.status !== "done").length;
      const d = st.money(c.id).debt, e = S.expected.filter((x) => x.clientId === c.id).length;
      return `<tr class="click" data-act="d" data-s="client" data-p="${c.id}"><td class="code">${E(c.id)}</td><td><b>${E(c.name)}</b><div class="muted s12">${E(c.person)}</div></td><td class="muted">${E(c.city)}</td><td>${E(st.who(c.salesId))}</td><td class="r">${a}</td><td class="r">${e}</td>${m ? `<td class="r ${d > 0.5 ? "bad" : "ok"}">${d > 0.5 ? u.usd(d) : "нет"}</td>` : ""}</tr>`;
    }).join("");
    return `<div class="pane">
      <div class="ph"><div><h1>${role() === "sales" ? "Мои клиенты" : "Клиенты"}</h1><div class="sub">${role() === "sales" ? "Менеджер по продажам видит только клиентов, закреплённых за ним, и их грузы. Стоимость и оплаты ему не показываются." : "У каждого клиента постоянный код для маркировки грузов и свой менеджер по продажам"}</div></div><span class="grow"></span>${role() === "sales" ? "" : `<button class="btn pri" type="button" data-act="toast" data-t="В рабочей версии откроется карточка нового клиента" data-i="info">${I("plus")}Клиент</button>`}</div>
      <label class="search wide">${I("search")}<input data-in="clientsQ" value="${E(App.tmp.clientsQ)}" placeholder="Код, название или город"></label>
      <table class="tbl"><thead><tr><th>Код</th><th>Клиент</th><th>Город</th><th>Менеджер по продажам</th><th class="r">Активные грузы</th><th class="r">Ждёт посылок</th>${m ? '<th class="r">Не оплачено</th>' : ""}</tr></thead><tbody>${rows || `<tr><td colspan="${m ? 7 : 6}" class="muted">Никого не нашли</td></tr>`}</tbody></table>
    </div>`;
  }
  function client(id) {
    const c = st.client(id); if (!c || !mine(c.id)) return clients();
    const S = st.S, m = seeMoney(), mm = st.money(c.id), r = role();
    const rows = S.ships.filter((s) => s.clientId === c.id).sort((a, b) => b.sentAt - a.sentAt).map((s) => ({ t: "ship", id: s.id, at: s.sentAt, st: s.status, d: u.places(st.totals(s).places) + " · " + st.TRANSPORT[s.transport].t.toLowerCase(), cost: s }))
      .concat(st.ready().filter((x) => x.clientId === c.id).map((x) => ({ t: "cargo", id: x.id, at: x.at, st: "pack", d: pk(x.packType) + " · на складе " + st.left(x) + " из " + x.places + " мест" })))
      .concat(st.waiting().filter((x) => x.clientId === c.id).map((x) => ({ t: "rec", id: x.id, at: x.at, st: "in", d: x.supplier + " · " + u.places(x.places) })))
      .sort((a, b) => (a.st === "done" ? 1 : 0) - (b.st === "done" ? 1 : 0) || b.at - a.at);
    const exp = S.expected.filter((e) => e.clientId === c.id);
    return `<div class="pane">
      <div class="pback" data-act="d" data-s="clients">${I("back")}${r === "sales" ? "Мои клиенты" : "Клиенты"}</div>
      <div class="ph"><span class="tag code lg">${E(c.id)}</span><div><h1>${E(c.name)}</h1><div class="sub">${E(c.city)} · ${E(c.person)} · ${E(c.phone)} · клиент с ${E(c.since)} года</div></div></div>
      <div class="kpis">
        <div class="kpi"><span>На складах в Китае</span><strong>${st.waiting().filter((x) => x.clientId === c.id).length + st.ready().filter((x) => x.clientId === c.id).length}</strong><small>приходы и упакованные грузы</small></div>
        <div class="kpi"><span>В пути и на выдаче</span><strong>${S.ships.filter((s) => s.clientId === c.id && s.status !== "done").length}</strong><small>отправки с трек-номером</small></div>
        <div class="kpi"><span>Ждёт посылок</span><strong>${exp.length}</strong><small>трек-номера внесены заранее</small></div>
        ${m ? `<div class="kpi ${mm.debt > 0.5 ? "bad" : "hero"}"><span>Не оплачено</span><strong>${mm.debt > 0.5 ? u.usd(mm.debt) : "нет"}</strong><small>начислено всего ${u.usd(mm.charged)}</small></div>` : `<div class="kpi"><span>Менеджер</span><strong class="sm">${E(st.who(c.salesId))}</strong><small>ведёт клиента</small></div>`}
      </div>
      <div class="grid2">
        <div class="box tblbox"><table class="tbl bare"><thead><tr><th>Груз</th><th>Статус</th><th>Состав</th>${m ? '<th class="r">Стоимость</th>' : ""}</tr></thead><tbody>
          ${rows.map((x) => `<tr class="click" data-act="openItem" data-t="${x.t}" data-id="${x.id}"><td><b>${E(x.id)}</b><span class="muted s12 blk">${u.dShort(x.at)}</span></td><td>${pill(x.st)}</td><td class="muted">${E(x.d)}</td>${m ? `<td class="r">${x.cost ? u.usd(x.cost.cost) + `<span class="s12 blk ${st.isPaid(x.cost) ? "ok" : "bad"}">${st.isPaid(x.cost) ? "оплачено" : "не оплачено"}</span>` : '<span class="muted">при отправке</span>'}</td>` : ""}</tr>`).join("") || '<tr><td colspan="4" class="muted">Грузов пока нет</td></tr>'}
        </tbody></table></div>
        <div class="col">
          <div class="box"><h3>${I("users")}Менеджер по продажам</h3>${r === "admin" ? `<select class="inp sm" data-chg="sales" data-c="${c.id}">${["timur", "darya"].map((k) => `<option value="${k}"${c.salesId === k ? " selected" : ""}>${E(st.who(k))}</option>`).join("")}</select><p class="muted s12 mt8">Менеджер видит только закреплённых за ним клиентов.</p>` : `<p class="p0"><b>${E(st.who(c.salesId))}</b></p>`}
            ${r === "admin" || r === "accountant" ? `<div class="pline mini"><span>${stg(2)} Тариф: ${E(st.tariffLabel(c))}</span><span class="lnk" data-act="d" data-s="tariffs">Тарифы</span></div>` : ""}</div>
          <div class="box"><h3>${I("clock")}Ждёт посылок</h3>${exp.map((e) => `<div class="pline"><span><b>${E(e.track)}</b><small>${E(e.supplier)}${e.what ? " · " + E(e.what) : ""}</small></span><small class="muted">${u.when(e.at)}</small></div>`).join("") || '<p class="muted p0">Клиент пока не внёс ни одного трек-номера.</p>'}</div>
          <div class="box"><h3>${I("pin")}Адреса складов для поставщиков</h3><p class="s13 p0 mb8">Клиент отправляет адрес поставщику, тот пишет код на каждой коробке.</p>
            ${st.WH.map((w) => `<div class="addr"><b>${E(w.ru)}</b><span>${E(w.addr)} · 唛头 ${E(c.id)}</span></div>`).join("")}</div>
        </div>
      </div>
    </div>`;
  }

  // ---------- отправки ----------
  function consRows(list) {
    const r = role();
    return list.map((s) => {
      const t = st.totals(s);
      const action = s.status === "way" ? (st.can("arrive", r) ? `<button class="btn sm" type="button" data-act="arrive" data-id="${s.id}" data-arr="${s.id}">Прибыла</button>` : '<span class="muted s12">в пути</span>')
        : s.status === "arrived" ? (st.can("issue", r) ? `<button class="btn sm dark" type="button" data-act="issueDesk" data-id="${s.id}">Выдать</button>` : '<span class="muted s12">выдаёт Москва</span>')
        : `<span class="muted s12">${s.issue && s.issue.type === "tk" ? "ТК " + E(s.issue.tk) : "выдана клиенту"}</span>`;
      return `<tr class="click${s.fresh ? " fresh" : ""}" data-act="openItem" data-t="ship" data-id="${s.id}"><td><b>${E(s.id)}</b><div class="muted s12">${st.TRANSPORT[s.transport].t}</div></td><td><b>${E(s.clientId)}</b><div class="muted s12">${E(cname(s.clientId))}</div></td><td>${u.places(t.places)}<div class="muted s12">${u.kg(t.weight)} · ${u.vol(t.volume)}</div></td><td>${u.dShort(s.sentAt)}<div class="muted s12">${s.status === "way" ? "прибытие ≈" + u.NB + u.dShort(s.eta) : "прибыла " + u.dShort(s.arrivedAt)}</div></td><td class="r">${u.usd(s.cost)}<div class="s12 ${st.isPaid(s) ? "ok" : "bad"}">${st.isPaid(s) ? "оплачено" : "не оплачено"}</div></td><td>${pill(s.status)}</td><td class="r" data-stop="1">${action}</td></tr>`;
    }).join("");
  }
  function cons() {
    const S = st.S;
    const open = S.ships.filter((s) => s.status !== "done").sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || b.sentAt - a.sentAt);
    const done = S.ships.filter((s) => s.status === "done").sort((a, b) => b.doneAt - a.doneAt);
    const head = '<thead><tr><th>Трек-номер</th><th>Клиент</th><th>Груз</th><th>Отправлена</th><th class="r">Стоимость</th><th>Статус</th><th class="r"></th></tr></thead>';
    return `<div class="pane">
      <div class="ph"><div><h1>Отправки</h1><div class="sub">Груз уезжает целиком или частями. У каждой отправки свой трек-номер, стоимость в долларах и отметка об оплате.</div></div><span class="grow"></span>${optBtn("invoice", "Автоматическая накладная")}<button class="btn" type="button" data-act="exportCons">${I("download")}Выгрузить в Excel</button></div>
      <table class="tbl">${head}<tbody>${consRows(open) || '<tr><td colspan="7" class="muted">Нет активных отправок</td></tr>'}</tbody></table>
      <h3 class="h3 mt2">Выданы и переданы в транспортные компании</h3>
      <table class="tbl">${head}<tbody>${consRows(done)}</tbody></table>
    </div>`;
  }

  // ---------- отгрузка (менеджер в России) ----------
  function selState() {
    const sel = App.tmp.sel;
    Object.keys(sel).forEach((id) => { const c = st.cargo(id); if (!c || st.left(c) <= 0) delete sel[id]; else sel[id] = Math.max(1, Math.min(st.left(c), sel[id])); });
    const ids = Object.keys(sel), list = ids.map(st.cargo), cid = list.length ? list[0].clientId : null;
    let places = 0, weight = 0, volume = 0, rest = 0;
    list.forEach((c) => { const p = sel[c.id]; places += p; weight += (c.weight * p) / c.places; volume += (c.volume * p) / c.places; rest += st.left(c) - p; });
    return { sel, ids, list, cid, places, weight, volume, rest };
  }
  function dispatch() {
    const S = st.S, s = selState(), rdy = st.ready(), r = role();
    const groups = {};
    rdy.forEach((c) => (groups[c.clientId] = groups[c.clientId] || []).push(c));
    const order = Object.keys(groups).sort((a, b) => (groups[b].some((c) => c.fresh) ? 1 : 0) - (groups[a].some((c) => c.fresh) ? 1 : 0));
    const boxes = order.map((cid) => {
      const list = groups[cid];
      return `<div class="box grp" data-grp="${cid}"><h3><span class="tag code">${E(cid)}</span><span class="ell1">${E(cname(cid))}</span><span class="muted h3s">${list.length} ${u.plural(list.length, "груз", "груза", "грузов")} · ${u.places(list.reduce((a, c) => a + st.left(c), 0))}</span></h3>
        ${list.map((c) => {
          const on = s.sel[c.id] != null, dis = s.cid && s.cid !== cid, lf = st.left(c);
          return `<div class="crow${on ? " on" : ""}${dis ? " off" : ""}${c.fresh ? " new" : ""}" data-sel="${c.id}">
            <button class="cpick" type="button" data-act="selCargo" data-id="${c.id}" ${dis ? 'title="В одну отправку объединяются грузы одного клиента"' : ""}><span class="cb">${on ? I("check") : ""}</span><span class="ct"><b>${E(c.id)} · ${pk(c.packType)}</b><small>склад ${E(whn(c.wh))} · ${u.kg(c.weight)} · ${u.vol(c.volume)} · ${c.receiptIds.length} ${u.plural(c.receiptIds.length, "приход", "прихода", "приходов")}</small></span></button>
            ${on ? `<div class="cqty" data-hl="qty-${c.id}"><button type="button" data-act="selQty" data-id="${c.id}" data-d="-1" aria-label="Меньше мест">${I("minus")}</button><span><b>${s.sel[c.id]}</b> из ${lf}<small>мест уезжает</small></span><button type="button" data-act="selQty" data-id="${c.id}" data-d="1" aria-label="Больше мест">${I("plus")}</button></div>`
              : `<div class="cleft"><b>${u.places(lf)}</b>${c.sent ? `<small>из ${c.places}, часть уже уехала</small>` : "<small>на складе</small>"}</div>`}
          </div>`;
        }).join("")}</div>`;
    }).join("");
    const way = S.ships.filter((x) => x.status === "way").sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || a.eta - b.eta), arr = S.ships.filter((x) => x.status === "arrived");
    return `<div class="pane">
      <div class="ph"><div><h1>Отгрузка</h1><div class="sub">Упакованные грузы на складах в Китае. Отметьте грузы одного клиента и укажите, сколько мест уезжает сейчас: остаток останется на складе.</div></div></div>
      <div class="grid2">
        <div>${boxes || '<div class="box muted">Упакованных грузов нет. Как только склад упакует груз, он появится здесь.</div>'}</div>
        <div class="col">
          <div class="box" data-dispatch-box="1"><h3>${I("truck")}Новая отправка</h3>
            ${s.ids.length ? `<p class="p0 mb8"><b>${E(cname(s.cid))}</b></p>${s.list.map((c) => `<div class="pline mini"><span>${E(c.id)}</span><b>${s.sel[c.id]} из ${st.left(c)} мест</b></div>`).join("")}<p class="muted s13 sum">${u.places(s.places)} · ${u.kg(s.weight)} · ${u.vol(s.volume)}${s.rest ? " · на складе останется " + s.rest : ""}</p>` : '<p class="muted s13 sum">Отметьте слева один или несколько грузов клиента.</p>'}
            <button class="btn pri block" type="button" data-act="dispatchModal" ${s.ids.length ? "" : "disabled"} id="btnDispatch">${I("send")}Сформировать отправку</button></div>
          <div class="box"><h3>${I("clock")}В пути</h3>${way.map((x) => `<div class="pline"><span><b>${E(x.id)}</b><small>${E(x.clientId)} ${E(cname(x.clientId))} · ≈${u.NB}${u.dShort(x.eta)}</small></span>${st.can("arrive", r) ? `<button class="btn sm" type="button" data-act="arrive" data-id="${x.id}" data-arr="${x.id}">Прибыла</button>` : ""}</div>`).join("") || '<p class="muted p0">Нет</p>'}</div>
          <div class="box"><h3>${I("pin")}Ждут выдачи в Москве</h3>${arr.map((x) => `<div class="pline"><span><b>${E(x.id)}</b><small>${E(x.clientId)} ${E(cname(x.clientId))}</small></span>${paidPill(x)}</div>`).join("") || '<p class="muted p0">Нет</p>'}<p class="muted s12 mt8">Выдачу и передачу в транспортную компанию отмечает сотрудник в Москве с телефона.</p></div>
        </div>
      </div>
    </div>`;
  }
  function dispatchModal() {
    const s = selState(); if (!s.ids.length) return;
    const tr = App.tmp.tr, eta = Date.now() + st.TRANSPORT[tr].days * u.DAY, cl = st.client(s.cid), calc = st.tariffCalc(cl, s.weight, s.volume);
    if (App.tmp.dCost == null) App.tmp.dCost = String(calc);
    App.modal(`<div class="mh"><div class="mi">${I("truck")}</div><div><h2>Новая отправка</h2><div class="muted s13">${E(cl.id)} ${E(cl.name)} · ${s.list.map((c) => E(c.id)).join(", ")}</div></div>${xBtn}</div>
      <div class="fld"><span>Транспорт</span><div class="choice cols2">${Object.keys(st.TRANSPORT).map((k) => `<button type="button" class="${k === tr ? "on" : ""}" data-act="pickTr" data-k="${k}">${I(k === "auto" ? "truck" : "layers")}<span>${st.TRANSPORT[k].t}<small>${st.TRANSPORT[k].label.split(", ")[1]}</small></span></button>`).join("")}</div></div>
      <dl class="kv mt"><dt>Трек-номер</dt><dd><b>ЦЛ-${st.S.seq.ship}</b> <span class="muted">присваивается сам</span></dd><dt>Уезжает сейчас</dt><dd><b>${u.places(s.places)}</b> · ${u.kg(s.weight)} · ${u.vol(s.volume)}</dd><dt>Остаётся на складе</dt><dd>${s.rest ? u.places(s.rest) : "ничего, груз уезжает целиком"}</dd><dt>Прибытие</dt><dd>около ${u.dLong(eta)}</dd></dl>
      <div class="row2 mt">
        <label class="fld"><span>Стоимость, $</span><input class="inp" id="dCost" data-in="dCost" inputmode="numeric" value="${E(App.tmp.dCost)}" data-enter="#btnDispatchGo"></label>
        <div class="fld"><span>Оплата</span><button class="chk${App.tmp.dPaid ? " on" : ""}" type="button" data-act="dPaid"><span class="cb">${App.tmp.dPaid ? I("check") : ""}</span>Оплачено</button></div>
      </div>
      <div class="note mt">${stg(2)} Сумма подставлена по тарифу клиента (${E(st.tariffLabel(cl))}): ${u.usd(calc)}. На первом этапе стоимость вносится вручную.</div>
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="dispatchGo" id="btnDispatchGo">${I("send")}Отправить</button></div>`);
  }

  // ---------- настройка этапов ----------
  function stages() {
    const M = st.S.matrix;
    return `<div class="pane">
      <div class="ph"><div><h1>Настройка этапов</h1><div class="sub">Вы сами задаёте, кто какой этап отмечает. Один этап могут отмечать несколько ролей.</div></div></div>
      <table class="tbl perm" data-hl="stages"><thead><tr><th>Этап</th>${st.SROLES.map(([, t]) => `<th class="c">${t}</th>`).join("")}</tr></thead><tbody>
        ${st.STAGES.map(([k, t], i) => `<tr><td><span class="num">${i + 1}</span><b>${t}</b></td>${st.SROLES.map(([r]) => `<td class="c"><button class="sw${M[k][r] ? " on" : ""}${r === "admin" ? " lock" : ""}" type="button" data-act="stageToggle" data-k="${k}" data-r="${r}" aria-label="${t}: ${r}" ${r === "admin" ? 'title="Администратор может отметить любой этап"' : ""}><i></i></button></td>`).join("")}</tr>`).join("")}
      </tbody></table>
      <div class="grid2 mt2">
        <div class="box"><h3>${I("info")}Как это работает</h3><p class="p0 s13">Кнопка этапа появляется только у отмеченных ролей. Например, включите «Прибытие в Россию» для роли «Москва (выдача)», и сотрудник в Москве сам отметит, что машина пришла. Попробуйте: настройка сохраняется и сразу действует в прототипе.</p></div>
        <div class="box"><h3>${I("bell")}Уведомления клиенту</h3><p class="p0 s13">На каждый этап клиент получает уведомление в приложении и в Telegram: груз принят, упакован, отправлен, прибыл, выдан.</p></div>
      </div>
    </div>`;
  }

  // ---------- сотрудники ----------
  function staff() {
    const roles = ["Админ", "Менеджер РФ", "Менеджер Китая", "Склад", "Москва", "Продажи", "Бухгалтер", "Клиент"];
    const perm = [["Грузы и общая доска", "11110*00"], ["Приёмка и упаковка", "10110000"], ["Отправки и трек-номера", "11000000"], ["Выдача в России", "11001000"], ["Клиенты", "11000*10"], ["Стоимость и оплата", "11001011"], ["Деньги и учёт, этап 2", "10000010"], ["Настройка этапов и права", "10000000"], ["Свои грузы и документы", "00000001"]];
    const Y = `<span class="y">${I("check")}</span>`, N = `<span class="n">${I("minus")}</span>`, Own = '<span class="own">свои</span>';
    return `<div class="pane">
      <div class="ph"><div><h1>Сотрудники</h1><div class="sub">У каждой роли свой экран и свои права. Сотрудники в Китае не видят стоимость и оплаты.</div></div><span class="grow"></span><button class="btn pri" type="button" data-act="toast" data-t="В рабочей версии сотрудник получает приглашение по ссылке" data-i="info">${I("plus")}Сотрудник</button></div>
      <div class="grid2">
        <table class="tbl"><thead><tr><th>Сотрудник</th><th>Роль</th><th>Где</th><th>Язык</th></tr></thead><tbody>${Object.keys(st.STAFF).map((k) => { const p = st.STAFF[k], cn = /Кита/.test(p.role); return `<tr><td><span class="row"><span class="ava sm">${p.ava}</span><b>${E(p.ru)}</b></span></td><td>${E(p.role)}</td><td class="muted">${E(p.where)}</td><td class="muted">${cn ? "中文 / русский" : "русский"}</td></tr>`; }).join("")}</tbody></table>
        <div class="col"><div class="box"><h3>${I("bell")}Каналы уведомлений</h3>
          <div class="pline"><span><b>В приложении</b><small>на телефон и компьютер, всем ролям</small></span><span class="st" data-st="in">включено</span></div>
          <div class="pline"><span><b>Telegram</b><small>сотрудникам и клиентам в России</small></span><span class="st" data-st="in">включено</span></div>
          <div class="pline"><span><b>WeCom</b><small>складу и менеджеру Китая</small></span>${optBtn("wecom", "WeCom")}</div></div>
          <div class="box"><h3>${I("globe")}Два языка</h3><p class="p0 s13">Склад и менеджер Китая переключают интерфейс на китайский одной кнопкой. Один и тот же груз каждый видит на своём языке.</p></div></div>
      </div>
      <h3 class="h3 mt2">Права по ролям</h3>
      <table class="tbl perm"><thead><tr><th>Раздел</th>${roles.map((r) => `<th class="c">${r}</th>`).join("")}</tr></thead><tbody>${perm.map(([n, m]) => `<tr><td>${n}</td>${m.split("").map((x) => `<td class="c">${x === "1" ? Y : x === "*" ? Own : N}</td>`).join("")}</tr>`).join("")}</tbody></table>
    </div>`;
  }

  // ---------- отчёты ----------
  function weeksData() {
    const now = Date.now();
    return [...Array(8)].map((_, i) => 7 - i).map((w) => {
      const from = now - (w + 1) * 7 * u.DAY, to = now - w * 7 * u.DAY;
      return { v: st.S.cargos.filter((c) => c.at > from && c.at <= to).reduce((a, c) => a + c.volume, 0), label: u.dShort(from + u.DAY) };
    });
  }
  function reports() {
    const S = st.S, weeks = weeksData(), max = Math.max(...weeks.map((x) => x.v), 1);
    const byClient = S.clients.map((c) => ({ c, v: S.cargos.filter((x) => x.clientId === c.id).reduce((a, x) => a + x.volume, 0) })).sort((a, b) => b.v - a.v), vmax = byClient[0].v || 1;
    const stay = S.ships.map((s) => { const c = st.cargo(s.items[0].cargoId); return c ? (s.sentAt - c.at) / u.DAY : 0; }).filter((x) => x > 0);
    const avg = stay.length ? stay.reduce((a, x) => a + x, 0) / stay.length : 0;
    const byWh = st.WH.map((w) => ({ w, n: st.waiting(w.id).length + st.ready(w.id).length }));
    return `<div class="pane">
      <div class="ph"><h1>Отчёты</h1><span class="grow"></span>${optBtn("analytics", "Расширенная аналитика")}<button class="btn" type="button" data-act="exportRep">${I("download")}Выгрузить в Excel</button></div>
      <div class="kpis">
        <div class="kpi hero"><span>Упаковано за 8 недель</span><strong>${u.vol(weeks.reduce((a, x) => a + x.v, 0))}</strong><small>${S.cargos.length} ${u.plural(S.cargos.length, "груз", "груза", "грузов")} из ${S.receipts.length} приходов</small></div>
        <div class="kpi"><span>От упаковки до отправки</span><strong>${u.num(avg, 1)} дн.</strong><small>в среднем по отправкам</small></div>
        <div class="kpi"><span>Отправок в пути</span><strong>${S.ships.filter((s) => s.status === "way").length}</strong><small>авто и ЖД</small></div>
        <div class="kpi"><span>Сейчас на складах</span><strong>${byWh.reduce((a, x) => a + x.n, 0)}</strong><small>${byWh.map((x) => x.w.ru + " " + x.n).join(" · ")}</small></div>
      </div>
      <div class="grid2">
        <div class="box"><h3>${I("chart")}Объём упакованных грузов по неделям, м³</h3><div class="bars">${weeks.map((x, i) => `<div class="bcol"><div class="b${i === 7 ? " cur" : ""}" style="height:${Math.max(4, (x.v / max) * 100)}%"><span>${u.num(x.v, 1)}</span></div><small>${x.label}</small></div>`).join("")}</div></div>
        <div class="box"><h3>${I("users")}Клиенты по объёму</h3>${byClient.map((x) => `<div class="hbar"><span class="ell1">${E(x.c.name)}</span><i><b style="width:${(x.v / vmax) * 100}%"></b></i><span class="muted">${u.vol(x.v)}</span></div>`).join("")}</div>
      </div>
    </div>`;
  }

  // ---------- этап 2: оплаты и долги ----------
  const curAmt = (p) => (p.cur === "USD" ? u.usd(p.amount) : u.groups(Math.round(p.amount)) + u.NB + st.CUR[p.cur].s);
  function money() {
    const S = st.S, rows = S.clients.map((c) => ({ c, m: st.money(c.id) })).sort((a, b) => b.m.debt - a.m.debt);
    const T = st.money(), pays = S.payments.slice().sort((a, b) => b.at - a.at), now = Date.now();
    const p30 = pays.filter((p) => now - p.at < 30 * u.DAY), curs = [...new Set(p30.map((p) => p.cur))];
    return `<div class="pane">
      <div class="ph"><div><h1>Оплаты и долги${stg(2)}</h1><div class="sub">Клиент платит в любой валюте, долг ведётся в долларах по курсу на день оплаты.</div></div><span class="grow"></span><button class="btn" type="button" data-act="exportMoney">${I("download")}Выгрузить в Excel</button></div>
      <div class="kpis">
        <div class="kpi"><span>Начислено</span><strong>${u.usd(T.charged)}</strong><small>по ${S.ships.length} отправкам</small></div>
        <div class="kpi hero"><span>Оплачено</span><strong>${u.usd(T.paid)}</strong><small>${S.payments.length} ${u.plural(S.payments.length, "оплата", "оплаты", "оплат")}</small></div>
        <div class="kpi bad"><span>Долг клиентов</span><strong>${u.usd(T.debt)}</strong><small>${rows.filter((r) => r.m.debt > 0.5).length} ${u.plural(rows.filter((r) => r.m.debt > 0.5).length, "должник", "должника", "должников")}</small></div>
        <div class="kpi"><span>Оплаты за 30 дней</span><strong>${u.usd(p30.reduce((a, p) => a + p.usd, 0))}</strong><small>валюты: ${curs.map((k) => st.CUR[k].s).join(", ") || "нет"}</small></div>
      </div>
      <table class="tbl"><thead><tr><th>Клиент</th><th>Тариф</th><th class="r">Начислено</th><th class="r">Оплачено</th><th class="r">Долг</th><th class="r"></th></tr></thead><tbody>
        ${rows.map((r) => `<tr data-fin="${r.c.id}"><td><b>${E(r.c.id)}</b> ${E(r.c.name)}</td><td class="muted">${E(st.tariffLabel(r.c))}</td><td class="r">${u.usd(r.m.charged)}</td><td class="r">${u.usd(r.m.paid)}</td><td class="r ${r.m.debt > 0.5 ? "bad" : "ok"}">${r.m.debt > 0.5 ? u.usd(r.m.debt) : "нет"}</td><td class="r"><span class="btns">${r.m.debt > 0.5 ? `<button class="btn sm pri" type="button" data-act="payModal" data-c="${r.c.id}" data-pay="${r.c.id}">Принять оплату</button><button class="btn sm" type="button" data-act="invoiceModal" data-c="${r.c.id}">Счёт</button>` : ""}<button class="btn sm" type="button" data-act="reconModal" data-c="${r.c.id}">Сверка</button></span></td></tr>`).join("")}
      </tbody><tfoot><tr><td>Итого</td><td></td><td class="r">${u.usd(T.charged)}</td><td class="r">${u.usd(T.paid)}</td><td class="r">${u.usd(T.debt)}</td><td></td></tr></tfoot></table>
      <h3 class="h3 mt2">Последние оплаты</h3>
      <table class="tbl"><thead><tr><th>Дата</th><th>Клиент</th><th class="r">Сумма в валюте</th><th class="r">Курс за 1 $</th><th class="r">В долларах</th><th>Принял</th></tr></thead><tbody>
        ${pays.slice(0, 8).map((p) => `<tr><td>${u.dFull(p.at)}</td><td><b>${E(p.clientId)}</b> ${E(cname(p.clientId))}</td><td class="r"><b>${curAmt(p)}</b></td><td class="r muted">${p.cur === "USD" || p.cur === "USDT" ? "1" : u.num(p.rate, 2)}</td><td class="r">${u.usd(p.usd)}</td><td class="muted">${E(st.who(p.by))}</td></tr>`).join("")}
      </tbody></table>
    </div>`;
  }
  function payModal(cid) {
    const c = st.client(cid), d = st.money(cid).debt;
    if (!App.tmp.pay || App.tmp.pay.c !== cid) App.tmp.pay = { c: cid, cur: "RUB", rate: String(st.CUR.RUB.rate).replace(".", ","), amount: String(Math.round((d * st.CUR.RUB.rate) / 100) * 100) };
    const p = App.tmp.pay, fixed = p.cur === "USD" || p.cur === "USDT";
    App.modal(`<div class="mh"><div class="mi">${I("wallet")}</div><div><h2>Оплата от клиента${stg(2)}</h2><div class="muted s13">${E(c.id)} ${E(c.name)} · долг ${u.usd(d)}</div></div>${xBtn}</div>
      <div class="fld"><span>Валюта оплаты</span><div class="choice cols3" data-hl="pay-cur">${Object.keys(st.CUR).map((k) => `<button type="button" class="${k === p.cur ? "on" : ""}" data-act="payCur" data-k="${k}"><span>${st.CUR[k].t}<small>${st.CUR[k].s}</small></span></button>`).join("")}</div></div>
      <div class="row2 mt">
        <label class="fld"><span>Сумма, ${st.CUR[p.cur].s}</span><input class="inp" id="payAmt" data-in="payAmt" inputmode="decimal" value="${E(p.amount)}" data-enter="#btnPayGo"></label>
        <label class="fld"><span>Курс, ${st.CUR[p.cur].s} за 1 $</span><input class="inp" id="payRate" data-in="payRate" inputmode="decimal" value="${fixed ? "1" : E(p.rate)}" ${fixed ? "disabled" : ""}></label>
      </div>
      <div class="found mt" id="payUsd">${payUsdHtml()}</div>
      <dl class="kv mt"><dt>Дата</dt><dd>${u.dLong(Date.now())}</dd><dt>Принял</dt><dd>${E(App.DROLES[role()].name)}</dd></dl>
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="payGo" id="btnPayGo">${I("check")}Сохранить оплату</button></div>`);
  }
  function payCalc() { const p = App.tmp.pay, rate = p.cur === "USD" || p.cur === "USDT" ? 1 : u.parse(p.rate), amt = u.parse(p.amount); return { amt, rate, usd: rate > 0 ? Math.round((amt / rate) * 100) / 100 : 0 }; }
  function payUsdHtml() { const p = App.tmp.pay, x = payCalc(), d = st.money(p.c).debt, rest = Math.max(0, d - x.usd); return `${I("dollar")}<span>Зачтётся в долларах: <b>${u.usd(x.usd)}</b><small>${rest > 0.5 ? "останется долг " + u.usd(rest) : "долг будет закрыт полностью"}</small></span>`; }
  function reconData(cid) {
    const ops = st.S.ships.filter((s) => s.clientId === cid).map((s) => ({ at: s.sentAt, t: "Отправка " + s.id + ", " + u.places(st.totals(s).places), ch: s.cost, pay: 0 }))
      .concat(st.S.payments.filter((p) => p.clientId === cid).map((p) => ({ at: p.at, t: "Оплата " + curAmt(p) + (p.cur === "USD" || p.cur === "USDT" ? "" : " по курсу " + u.num(p.rate, 2)), ch: 0, pay: p.usd }))).sort((a, b) => a.at - b.at);
    let bal = 0; ops.forEach((o) => { bal += o.ch - o.pay; o.bal = bal; });
    return ops;
  }
  function reconModal(cid) {
    const c = st.client(cid), ops = reconData(cid), T = ops.reduce((a, o) => ({ ch: a.ch + o.ch, pay: a.pay + o.pay }), { ch: 0, pay: 0 });
    App.modal(`<div class="mh"><div class="mi">${I("scale")}</div><div><h2>Сверка с клиентом${stg(2)}</h2><div class="muted s13">${E(c.id)} ${E(c.name)} · ${ops.length ? u.dFull(ops[0].at) : ""} – ${u.dFull(Date.now())}</div></div>${xBtn}</div>
      <div class="tscroll"><table class="tbl bare recon"><thead><tr><th>Дата</th><th>Операция</th><th class="r">Начислено</th><th class="r">Оплачено</th><th class="r">Долг</th></tr></thead><tbody>
        ${ops.map((o) => `<tr><td>${u.dFull(o.at)}</td><td>${E(o.t)}</td><td class="r">${o.ch ? u.usd(o.ch) : ""}</td><td class="r ok">${o.pay ? u.usd(o.pay) : ""}</td><td class="r">${u.usd(Math.max(0, o.bal))}</td></tr>`).join("")}
      </tbody><tfoot><tr><td colspan="2">Итого на ${u.dFull(Date.now())}</td><td class="r">${u.usd(T.ch)}</td><td class="r">${u.usd(T.pay)}</td><td class="r">${u.usd(Math.max(0, T.ch - T.pay))}</td></tr></tfoot></table></div>
      <div class="mf"><button class="btn" type="button" data-act="toast" data-t="Сверка отправлена клиенту в приложение и в Telegram" data-i="send">${I("send")}Отправить клиенту</button><button class="btn pri" type="button" data-act="reconDl" data-c="${cid}">${I("download")}Скачать</button></div>`, true);
  }
  function invoiceModal(cid) {
    const c = st.client(cid), list = st.S.ships.filter((s) => s.clientId === cid && !st.isPaid(s)).sort((a, b) => a.sentAt - b.sentAt), sum = list.reduce((a, s) => a + s.cost - s.paidUsd, 0);
    const no = c.id.replace(/\D/g, "") + "-" + u.pad(new Date().getDate()) + u.pad(new Date().getMonth() + 1);
    App.modal(`<div class="mh"><div class="mi">${I("file")}</div><div><h2>Счёт на оплату${stg(2)}</h2><div class="muted s13">№ ${no} от ${u.dFull(Date.now())}</div></div>${xBtn}</div>
      <div class="inv"><div class="inv-h"><div><small>Поставщик услуг</small><b>Центр логистики</b><span>здесь будут реквизиты вашей компании</span></div><div><small>Плательщик</small><b>${E(c.name)}</b><span>код клиента ${E(c.id)} · ${E(c.city)}</span></div></div>
        <table class="tbl bare"><thead><tr><th>Услуга</th><th class="r">Мест</th><th class="r">Вес</th><th class="r">Сумма</th></tr></thead><tbody>
          ${list.map((s) => { const t = st.totals(s); return `<tr><td>Доставка из Китая, отправка ${E(s.id)} от ${u.dShort(s.sentAt)}</td><td class="r">${t.places}</td><td class="r">${u.kg(t.weight)}</td><td class="r">${u.usd(s.cost - s.paidUsd)}</td></tr>`; }).join("")}
        </tbody><tfoot><tr><td colspan="3">К оплате</td><td class="r">${u.usd(sum)}</td></tr></tfoot></table>
        <p class="muted s12 p0">Оплатить можно в рублях, юанях, сомах, тенге, USDT или долларах по курсу на день оплаты.</p></div>
      <div class="mf"><button class="btn" type="button" data-act="toast" data-t="В рабочей версии счёт скачивается в PDF" data-i="download">${I("download")}Скачать PDF</button><button class="btn pri" type="button" data-act="invoiceSend" data-c="${cid}" data-sum="${Math.round(sum)}" data-no="${no}">${I("send")}Отправить клиенту</button></div>`, true);
  }

  // ---------- этап 2: расходы и прибыль ----------
  function profit() {
    const now = Date.now(), per = App.tmp.period;
    const list = st.S.ships.filter((s) => now - s.sentAt < per * u.DAY).sort((a, b) => b.sentAt - a.sentAt);
    const T = list.reduce((a, s) => ({ rev: a.rev + s.cost, exp: a.exp + st.expSum(s) }), { rev: 0, exp: 0 }), pr = T.rev - T.exp;
    const byC = {}; list.forEach((s) => { byC[s.clientId] = (byC[s.clientId] || 0) + s.cost - st.expSum(s); });
    const top = Object.keys(byC).map((k) => ({ k, v: byC[k] })).sort((a, b) => b.v - a.v), tmax = Math.max(1, ...top.map((x) => x.v));
    return `<div class="pane">
      <div class="ph"><div><h1>Расходы и прибыль${stg(2)}</h1><div class="sub">По каждой отправке: сколько взяли с клиента, сколько потратили на упаковку и перевозчика, что осталось.</div></div><span class="grow"></span><div class="seg light sm">${[[30, "30 дней"], [90, "90 дней"]].map(([k, t]) => `<button type="button" class="${per === k ? "on" : ""}" data-act="period" data-k="${k}">${t}</button>`).join("")}</div></div>
      <div class="kpis">
        <div class="kpi"><span>Выручка</span><strong>${u.usd(T.rev)}</strong><small>${list.length} ${u.plural(list.length, "отправка", "отправки", "отправок")}</small></div>
        <div class="kpi"><span>Себестоимость</span><strong>${u.usd(T.exp)}</strong><small>упаковка, перевозчик, прочее</small></div>
        <div class="kpi hero"><span>Прибыль</span><strong>${u.usd(pr)}</strong><small>за ${per} дней</small></div>
        <div class="kpi"><span>Маржа</span><strong>${T.rev ? Math.round((pr / T.rev) * 100) : 0}%</strong><small>прибыль к выручке</small></div>
      </div>
      <div class="grid2 wide-l">
        <table class="tbl"><thead><tr><th>Отправка</th><th class="r">Выручка</th><th class="r">Упаковка</th><th class="r">Перевозчик</th><th class="r">Прочее</th><th class="r">Прибыль</th><th></th></tr></thead><tbody>
          ${list.map((s) => { const p = s.cost - st.expSum(s); return `<tr class="click" data-act="expModal" data-id="${s.id}" data-exp="${s.id}"><td><b>${E(s.id)}</b><div class="muted s12">${E(s.clientId)} · ${u.dShort(s.sentAt)}</div></td><td class="r">${u.usd(s.cost)}</td><td class="r muted">${u.usd(s.exp.pack)}</td><td class="r muted">${u.usd(s.exp.carrier)}</td><td class="r muted">${u.usd(s.exp.other)}</td><td class="r ${p >= 0 ? "ok" : "bad"}">${u.usd(p)}</td><td class="r muted">${I("chevron")}</td></tr>`; }).join("") || '<tr><td colspan="7" class="muted">За период отправок нет</td></tr>'}
        </tbody></table>
        <div class="box"><h3>${I("users")}Прибыль по клиентам</h3>${top.map((x) => `<div class="hbar"><span class="ell1">${E(cname(x.k))}</span><i><b style="width:${Math.max(0, (x.v / tmax) * 100)}%"></b></i><span class="muted">${u.usd(x.v)}</span></div>`).join("") || '<p class="muted p0">Нет данных</p>'}</div>
      </div>
    </div>`;
  }
  function expModal(id) {
    const s = st.ship(id); if (!s) return;
    App.tmp.exp = { id, pack: String(s.exp.pack), carrier: String(s.exp.carrier), other: String(s.exp.other) };
    App.modal(`<div class="mh"><div class="mi">${I("scale")}</div><div><h2>Расходы по отправке${stg(2)}</h2><div class="muted s13">${E(s.id)} · ${E(s.clientId)} ${E(cname(s.clientId))} · выручка ${u.usd(s.cost)}</div></div>${xBtn}</div>
      <div class="row3"><label class="fld"><span>Упаковка, $</span><input class="inp" data-in="expIn" data-k="pack" inputmode="numeric" value="${s.exp.pack}"></label><label class="fld"><span>Перевозчик, $</span><input class="inp" data-in="expIn" data-k="carrier" inputmode="numeric" value="${s.exp.carrier}"></label><label class="fld"><span>Прочее, $</span><input class="inp" data-in="expIn" data-k="other" inputmode="numeric" value="${s.exp.other}"></label></div>
      <div class="found mt" id="expSum">${expHtml()}</div>
      <div class="note mt">Стоимость машины делится между клиентами по весу или объёму их грузов. Здесь показана доля этой отправки.</div>
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="expGo" id="btnExpGo">${I("check")}Сохранить</button></div>`);
  }
  function expHtml() { const e = App.tmp.exp, s = st.ship(e.id), sum = u.parse(e.pack) + u.parse(e.carrier) + u.parse(e.other), p = s.cost - sum; return `${I("dollar")}<span>Себестоимость ${u.usd(sum)}, прибыль <b>${u.usd(p)}</b><small>маржа ${s.cost ? Math.round((p / s.cost) * 100) : 0}%</small></span>`; }

  // ---------- этап 2: тарифы ----------
  const EX = { w: 240, v: 1.6 };
  function tariffs() {
    return `<div class="pane">
      <div class="ph"><div><h1>Тарифы клиентов${stg(2)}</h1><div class="sub">У каждого клиента свой тариф: за килограмм, за кубометр, по плотности или индивидуальный. Стоимость груза считается сама.</div></div></div>
      <div class="grid2 wide-l">
        <table class="tbl"><thead><tr><th>Клиент</th><th>Тип тарифа</th><th>Ставка</th><th class="r">Пример: ${u.kg(EX.w)}, ${u.vol(EX.v)}</th><th></th></tr></thead><tbody>
          ${st.S.clients.map((c) => `<tr class="click" data-act="tariffModal" data-c="${c.id}" data-tar="${c.id}"><td><b>${E(c.id)}</b> ${E(c.name)}</td><td><span class="st" data-st="${{ kg: "in", m3: "arrived", density: "way", custom: "pack" }[c.tariff.type]}">${st.TARIFF_T[c.tariff.type]}</span></td><td>${c.tariff.type === "density" ? "по сетке плотности" : u.num(c.tariff.rate, 2) + " $ " + (c.tariff.type === "m3" ? "за м³" : "за кг")}</td><td class="r"><b>${u.usd(st.tariffCalc(c, EX.w, EX.v))}</b></td><td class="r muted">${I("chevron")}</td></tr>`).join("")}
        </tbody></table>
        <div class="box"><h3>${I("scale")}Сетка по плотности</h3><p class="s13 p0 mb8">Лёгкий объёмный груз считается по кубометрам, плотный по килограммам.</p>
          ${st.DENS.map((r, i) => `<div class="pline mini"><span>${i === 0 ? "до " + r[0] : r[0] === Infinity ? "от " + st.DENS[i - 1][0] : st.DENS[i - 1][0] + "–" + r[0]} кг/м³</span><b>${u.num(r[2], r[1] === "m3" ? 0 : 2)} $ ${r[1] === "m3" ? "за м³" : "за кг"}</b></div>`).join("")}</div>
      </div>
    </div>`;
  }
  function tariffModal(cid) {
    const c = st.client(cid);
    if (!App.tmp.tar || App.tmp.tar.c !== cid) App.tmp.tar = { c: cid, type: c.tariff.type, rate: String(c.tariff.rate || 2.4).replace(".", ",") };
    const t = App.tmp.tar;
    App.modal(`<div class="mh"><div class="mi">${I("dollar")}</div><div><h2>Тариф клиента${stg(2)}</h2><div class="muted s13">${E(c.id)} ${E(c.name)}</div></div>${xBtn}</div>
      <div class="fld"><span>Как считаем</span><div class="choice cols2">${Object.keys(st.TARIFF_T).map((k) => `<button type="button" class="${k === t.type ? "on" : ""}" data-act="tarType" data-k="${k}"><span>${{ kg: "За килограмм", m3: "За кубометр", density: "По плотности", custom: "Индивидуальный" }[k]}<small>${{ kg: "плотные грузы", m3: "лёгкие и объёмные", density: "сетка, ставка выбирается сама", custom: "договорная ставка за кг" }[k]}</small></span></button>`).join("")}</div></div>
      ${t.type === "density" ? "" : `<label class="fld mt"><span>Ставка, $ ${t.type === "m3" ? "за м³" : "за кг"}</span><input class="inp" id="tarRate" data-in="tarRate" inputmode="decimal" value="${E(t.rate)}" data-enter="#btnTarGo"></label>`}
      <div class="found mt" id="tarEx">${tarHtml()}</div>
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="tarGo" id="btnTarGo">${I("check")}Сохранить тариф</button></div>`);
  }
  function tarHtml() { const t = App.tmp.tar, c = { tariff: { type: t.type, rate: u.parse(t.rate) } }; return `${I("dollar")}<span>Груз ${u.kg(EX.w)}, ${u.vol(EX.v)}: <b>${u.usd(st.tariffCalc(c, EX.w, EX.v))}</b><small>стоимость подставится в отправку сама</small></span>`; }

  // ---------- этап 3: чат с автопереводом ----------
  // сообщение глазами одной из сторон: side = чья сторона смотрит (ru или zh)
  function bubble(m, side) {
    const T = App.i18n.of(side), ph = m.k ? App.i18n.PHRASE[m.k] : null, own = m.side === side, other = side === "ru" ? "zh" : "ru";
    const main = ph ? ph[side] : m.text;
    const sub = !ph ? T.t("ch_asis") : own ? T.t(side === "ru" ? "ch_see_zh" : "ch_see_ru", E(ph[other])) : T.t(m.side === "ru" ? "ch_from_ru" : "ch_from_zh") + " · " + T.t("ch_orig", E(ph[other]));
    return `<div class="msg${own ? " me" : ""}"><div class="bub${own ? " me" : ""}">${E(main)}<small>${sub}</small></div><span class="meta">${E(st.who(m.by, side))} · ${T.when(m.at)}</span></div>`;
  }
  const phrases = (side, tid) => App.i18n.CHAT[side].map((p) => `<button type="button" data-act="chatPhrase" data-k="${p.k}" data-tid="${tid}" data-side="${side}">${E(p[side])}</button>`).join("");
  function threadTitle(t, side) {
    const T = App.i18n.of(side), o = t.ref.t === "rec" ? st.rec(t.ref.id) : st.cargo(t.ref.id), c = o && o.clientId ? st.client(o.clientId) : null;
    return { id: t.ref.id, kind: T.t("ch_ref_" + t.ref.t), code: c ? c.id : T.t("st_unk"), name: c ? c.name : "", wh: T.wh(st.wh(t.wh)) };
  }
  function lastText(t, side) { const m = t.msgs[t.msgs.length - 1]; if (!m) return ""; return m.k ? App.i18n.PHRASE[m.k][side] : m.text; }
  const threadsSorted = (whId) => st.S.chats.filter((t) => !whId || t.wh === whId).sort((a, b) => ((b.msgs[b.msgs.length - 1] || {}).at || 0) - ((a.msgs[a.msgs.length - 1] || {}).at || 0));
  App.chatUI = { bubble, phrases, threadTitle, lastText, threadsSorted };
  function chat(p) {
    const list = threadsSorted(), cur = (p && st.thread(p)) || list[0];
    if (cur && App.ui.mode === "desk") st.chatRead(cur.id, "ru");
    const tt = cur ? threadTitle(cur, "ru") : null;
    return `<div class="pane">
      <div class="ph"><div><h1>Чат со складом${stg(3)}</h1><div class="sub">Вы пишете по-русски, склад читает по-китайски, и наоборот. Переписка привязана к грузу и не теряется при смене сотрудника.</div></div></div>
      <div class="chat">
        <div class="chat-l">${list.map((t) => { const x = threadTitle(t, "ru"), n = t === cur ? 0 : st.unread(t, "ru"); return `<button type="button" class="thr${t === cur ? " on" : ""}" data-act="d" data-s="chat" data-p="${t.id}" data-thr="${t.id}"><span class="tt"><b>${E(x.id)}</b><span class="muted">${E(x.code)}</span>${n ? `<i>${n}</i>` : ""}</span><span class="tl1">${E(lastText(t, "ru"))}</span><span class="tw">склад ${E(x.wh)}</span></button>`; }).join("")}</div>
        ${cur ? `<div class="chat-r"><div class="chat-h"><div><b>${E(tt.kind)} ${E(tt.id)}</b><span class="muted"> · ${E(tt.code)} ${E(tt.name)} · склад ${E(tt.wh)}</span></div><button class="btn sm" type="button" data-act="openItem" data-t="${cur.ref.t}" data-id="${cur.ref.id}">Карточка груза</button></div>
          <div class="chat-m" id="chatMsgs">${cur.msgs.map((m) => bubble(m, "ru")).join("") || `<p class="muted center">${L.t("ch_empty")}</p>`}</div>
          <div class="chat-q" data-hl="chat-q">${phrases("ru", cur.id)}</div>
          <div class="chat-i"><input class="inp" data-in="chatText" id="chatText" placeholder="Сообщение складу" value="${E(App.tmp.chatText)}" data-enter="#btnChatSend" autocomplete="off"><button class="btn pri" type="button" id="btnChatSend" data-act="chatSend" data-tid="${cur.id}" data-side="ru">${I("send")}Отправить</button></div></div>` : '<div class="chat-r"><p class="muted">Переписки пока нет.</p></div>'}
      </div>
    </div>`;
  }

  // ---------- что входит ----------
  const ST1 = ["Роли и права: администратор, менеджер в России, менеджер Китая, склад в Китае, сотрудник в Москве, менеджер по продажам, клиент", "Несколько складов в Китае, у каждого свои сотрудники и свои грузы", "Приёмка: код клиента, китайский трек-номер, фото, количество мест, поставщик, повреждения",
    "Клиент заранее вносит трек-номера своих заказов, склад опознаёт груз по треку", "Неопознанные грузы отдельным списком, менеджер привязывает их к клиенту", "Упаковка: вид, вес, объём, количество мест после упаковки, фото", "Консолидация: приходы от разных поставщиков собираются в заказ клиента",
    "Отправка частями с трек-номером вашей компании", "Этапы настраиваются: вы сами задаёте, кто какой этап отмечает", "Общая доска грузов по статусам и карточка каждого груза с историей", "Прибытие и выдача в России: сотрудник в Москве отмечает выдачу или передачу в транспортную компанию",
    "Кабинет клиента на телефоне: статусы, фото, вес и объём, трек-номер, история, документы", "Уведомления в приложении и в Telegram", "Русский и китайский интерфейс, переключение одной кнопкой", "Стоимость по грузу в долларах и отметка об оплате, клиент видит сумму в кабинете", "Работает везде: компьютер, iPhone, Android, без установки из магазинов. Выгрузка списков в Excel"];
  const ST2 = ["Тарифы клиента: за кг, за кубометр, по плотности, индивидуальные. Стоимость считается сама", "Оплаты в любой валюте: рубли, юани, сомы, тенге, USDT, доллары. Долг ведётся в долларах по курсу", "Расходы, себестоимость и прибыль по грузам, клиентам и периодам", "Сверка с клиентом за период и счета на оплату", "Кабинет бухгалтера, отчёты и выгрузки"];
  const ST3 = ["Общение сотрудников России и Китая в системе вместо WeChat", "Автоперевод: каждый пишет на своём языке, собеседник читает на своём", "Сообщения привязаны к грузу, можно отправлять фото", "История не теряется при смене сотрудника"];
  const li = (a) => a.map((t) => `<li><span class="ck">${I("check")}</span><span>${t}</span></li>`).join("");
  function included() {
    const r = role();
    return `<div class="pane">
      <div class="ph"><div><h1>Что входит</h1><div class="sub">Три этапа из предложения и шесть дополнительных опций. Этапы независимы: после первого у вас уже рабочая система.</div></div></div>
      <div class="box stage-card s1"><div class="sc-h"><span class="stg s1 lg">Этап 1</span><div><h2>Движение груза</h2><p>Всё, чтобы вести груз от склада в Китае до клиента без таблиц.</p></div><button class="btn" type="button" data-act="d" data-s="board" ${r === "accountant" ? "hidden" : ""}>Открыть доску грузов</button></div><ul class="inc-list two">${li(ST1)}</ul></div>
      <div class="grid-e">
        <div class="box stage-card"><div class="sc-h"><span class="stg s2 lg">Этап 2</span><div><h2>Деньги и учёт</h2><p>Когда захотите.</p></div>${allowed(r, "money") ? '<button class="btn" type="button" data-act="d" data-s="money">Посмотреть</button>' : ""}</div><ul class="inc-list">${li(ST2)}</ul></div>
        <div class="box stage-card"><div class="sc-h"><span class="stg s3 lg">Этап 3</span><div><h2>Чат с автопереводом</h2><p>Когда захотите.</p></div>${allowed(r, "chat") ? '<button class="btn" type="button" data-act="d" data-s="chat">Посмотреть</button>' : ""}</div><ul class="inc-list">${li(ST3)}</ul></div>
      </div>
      <h3 class="h3 mt2">Дополнительно, по желанию</h3>
      <div class="opt-grid">${Object.keys(App.OPT).map((k) => { const o = App.OPT[k]; return `<button class="opt-card" type="button" data-act="opt" data-k="${k}"><span class="oi">${I(o.icon)}</span><span><b>${E(o.t)}</b><small>${E(o.s)}</small></span></button>`; }).join("")}</div>
      <p class="muted s13 mt">Опции отмечены в интерфейсе меткой «опция» на своих местах: в карточке отправки, на приёмке, в отчётах, в сотрудниках и в кабинете клиента.</p>
    </div>`;
  }

  // ---------- неопознанные ----------
  function unknownModal() {
    const list = st.unknown().sort((a, b) => b.at - a.at);
    App.modal(`<div class="mh"><div class="mi alert">${I("alert")}</div><div><h2>Неопознанные грузы</h2><div class="muted s13">Склад принял, но клиента по трек-номеру или коду не нашёл</div></div>${xBtn}</div>
      ${list.length ? list.map((x) => `<div class="unk"><div class="ph-i">${u.photo(x.photos[0])}</div><div><b>${E(x.id)}</b> <span class="muted s12">склад ${E(whn(x.wh))} · ${u.when(x.at)}</span><p>${E(x.track ? L.t("unk_track", x.track) : x.mark ? L.t("unk_mark", x.mark) : L.t("unk_none"))}. ${u.places(x.places)}.</p>
        <div class="row"><select class="inp sm" id="unk-${x.id}">${st.S.clients.map((c) => `<option value="${c.id}">${c.id} ${E(c.name)}</option>`).join("")}</select><button class="btn sm pri" type="button" data-act="assignUnk" data-id="${x.id}">Привязать</button></div></div></div>`).join("") : '<p class="muted">Все грузы разобраны.</p>'}`);
  }

  // ---------- действия ----------
  const csvDl = (name, rows, okText) => App.toast(u.download(name, u.csv(rows)) ? okText || "Файл " + name + " скачан, открывается в Excel" : "Браузер не дал скачать файл", "download");
  Object.assign((App.acts = App.acts || {}), {
    openItem: (d, el, e) => { if (e && e.target && e.target.closest && e.target.closest("[data-stop]")) return; openItem(d.t, d.id); },
    whF: (d) => { App.tmp.whF = d.k; App.refresh(true); },
    laneAll: (d) => { App.tmp.laneAll = App.tmp.laneAll || {}; App.tmp.laneAll[d.k] = !App.tmp.laneAll[d.k]; App.refresh(true); },
    arrive: (d) => { const s = st.arrive(d.id, role() === "admin" ? "ramil" : "olga"); App.closeDesk(); if (s) { App.toast(`Отправка ${d.id} прибыла в Россию. Клиент и сотрудник в Москве получили уведомление`, "bell"); if (App.scenario) App.scenario.check("arrived", s); } },
    issueDesk: (d) => { const s = st.issue(d.id, { type: "client", by: role() === "admin" ? "ramil" : "olga" }); App.closeDesk(); if (s) App.toast(`Отправка ${d.id} выдана клиенту`, "check"); },
    togglePaid: (d) => { const s = st.ship(d.id); st.setPaid(d.id, !st.isPaid(s), role() === "admin" ? "ramil" : role() === "accountant" ? "natalia" : "olga"); reopen(); App.toast(st.isPaid(s) ? "Отмечено: оплачено. Клиент видит это в кабинете" : "Отметка об оплате снята", "wallet"); },
    addDoc: (d) => { st.addDoc(d.id, d.n, role() === "admin" ? "ramil" : "olga"); reopen(); App.toast("Документ прикреплён, клиент видит его в кабинете", "file"); },
    selCargo: (d) => {
      const c = st.cargo(d.id), s = selState();
      if (s.cid && s.cid !== c.clientId) { App.toast("В одну отправку объединяются грузы одного клиента", "info"); return; }
      if (s.sel[d.id] != null) delete s.sel[d.id]; else s.sel[d.id] = st.left(c);
      App.tmp.dCost = null; App.refresh(true);
    },
    selQty: (d) => { const c = st.cargo(d.id), sel = App.tmp.sel; if (sel[d.id] == null) return; sel[d.id] = Math.max(1, Math.min(st.left(c), sel[d.id] + parseInt(d.d, 10))); App.tmp.dCost = null; App.refresh(true); },
    selPart: (d) => { const c = st.cargo(d.id); if (!c) return; App.tmp.sel[d.id] = Math.max(1, st.left(c) - 2); App.tmp.dCost = null; App.refresh(true); },
    dispatchModal: () => dispatchModal(),
    pickTr: (d) => { App.tmp.tr = d.k; dispatchModal(); },
    dPaid: () => { App.tmp.dPaid = !App.tmp.dPaid; dispatchModal(); },
    dispatchGo: () => {
      const s = selState(); if (!s.ids.length) return;
      const sh = st.dispatch(Object.assign({}, s.sel), { transport: App.tmp.tr, cost: u.parse(App.tmp.dCost), paid: !!App.tmp.dPaid, by: role() === "admin" ? "ramil" : "olga" });
      App.tmp.sel = {}; App.tmp.dCost = null; App.tmp.dPaid = false; App.closeDesk();
      if (sh) { App.toast(`Отправка ${sh.id} создана, клиент получил трек-номер`, "send"); if (App.scenario) App.scenario.check("dispatched", sh); }
    },
    stageToggle: (d) => { if (d.r === "admin") { App.toast("Администратор может отметить любой этап", "info"); return; } st.setStage(d.k, d.r, !st.S.matrix[d.k][d.r]); },
    period: (d) => { App.tmp.period = +d.k; App.refresh(true); },
    payModal: (d) => { App.tmp.pay = null; payModal(d.c); },
    payCur: (d) => { const p = App.tmp.pay, debt = st.money(p.c).debt, r = st.CUR[d.k].rate, big = d.k === "RUB" || d.k === "KZT" || d.k === "KGS"; p.cur = d.k; p.rate = String(r).replace(".", ","); p.amount = String(big ? Math.round((debt * r) / 100) * 100 : Math.round(debt * r)); payModal(p.c); },
    payGo: () => {
      const p = App.tmp.pay, x = payCalc();
      if (!(x.amt > 0) || !(x.rate > 0)) { App.toast("Укажите сумму и курс", "info"); return; }
      const pay = st.pay(p.c, { amount: x.amt, cur: p.cur, rate: x.rate, by: role() === "admin" ? "ramil" : "natalia" });
      App.tmp.pay = null; App.closeDesk(); App.toast(`Оплата ${curAmt(pay)} сохранена: ${u.usd(pay.usd)}. Клиент получил уведомление`, "wallet");
    },
    reconModal: (d) => reconModal(d.c),
    reconDl: (d) => csvDl("sverka_" + d.c + "_" + today() + ".csv", [["Дата", "Операция", "Начислено, $", "Оплачено, $", "Долг, $"]].concat(reconData(d.c).map((o) => [u.dFull(o.at), o.t, o.ch || "", o.pay || "", Math.max(0, Math.round(o.bal * 100) / 100)]))),
    invoiceModal: (d) => invoiceModal(d.c),
    invoiceSend: (d) => { st.S.notes.unshift({ id: st.S.seq.note++, clientId: d.c, text: `Выставлен счёт № ${d.no} на ${u.usd(+d.sum)}. Оплатить можно в любой валюте по курсу на день оплаты.`, at: Date.now(), read: false, ref: null }); if (d.c === st.ME) st.emit("push", st.S.notes[0]); st.save(); st.emit("change"); App.closeDesk(); App.toast("Счёт отправлен клиенту в приложение и в Telegram", "send"); },
    expModal: (d) => expModal(d.id),
    expGo: () => { const e = App.tmp.exp; st.setExp(e.id, { pack: u.parse(e.pack), carrier: u.parse(e.carrier), other: u.parse(e.other) }); App.closeDesk(); App.toast("Расходы сохранены, прибыль пересчитана", "check"); },
    tariffModal: (d) => { App.tmp.tar = null; tariffModal(d.c); },
    tarType: (d) => { App.tmp.tar.type = d.k; if (d.k === "m3" && u.parse(App.tmp.tar.rate) < 50) App.tmp.tar.rate = "320"; if (d.k !== "m3" && d.k !== "density" && u.parse(App.tmp.tar.rate) >= 50) App.tmp.tar.rate = "2,4"; tariffModal(App.tmp.tar.c); },
    tarGo: () => { const t = App.tmp.tar; if (t.type !== "density" && !(u.parse(t.rate) > 0)) { App.toast("Укажите ставку", "info"); return; } st.setTariff(t.c, { type: t.type, rate: u.parse(t.rate) }); App.tmp.tar = null; App.closeDesk(); App.toast("Тариф сохранён, новые отправки посчитаются по нему", "check"); },
    chatOpen: (d) => { const t = st.threadFor({ t: d.t, id: d.id }); App.go.desk("chat", t.id); },
    chatPhrase: (d, el) => { chatSendFrom(el, d.tid, d.side, { k: d.k }); },
    chatSend: (d, el) => { const inPhone = el.closest(".pslot"), text = inPhone ? (App.tmp.ptext[App.cur] || "") : App.tmp.chatText; if (!text.trim()) return; if (inPhone) App.tmp.ptext[App.cur] = ""; else App.tmp.chatText = ""; chatSendFrom(el, d.tid, d.side, { text }); },
    unknown: () => unknownModal(),
    assignUnk: (d) => { const sel = $("unk-" + d.id); const r = st.assignUnknown(d.id, sel.value); App.closeDesk(); if (r) App.toast(`Груз ${r.id} привязан к клиенту ${cname(r.clientId)}. Клиент получил уведомление`, "check"); },
    exportBoard: () => { const d = boardData(); csvDl("gruzy_" + today() + ".csv", [["Статус", "Номер", "Код клиента", "Клиент", "Склад", "Мест", "Вес, кг", "Объём, м³", "Трек-номер"]].concat(d.in.map((r) => ["Принят на складе", r.id, r.clientId, cname(r.clientId), whn(r.wh), r.places, "", "", r.track])).concat(d.pack.map((c) => ["Упакован", c.id, c.clientId, cname(c.clientId), whn(c.wh), st.left(c), c.weight, c.volume, ""])).concat(d.way.concat(d.arrived).map((s) => { const t = st.totals(s); return [L.t("st_" + s.status), s.id, s.clientId, cname(s.clientId), "", t.places, Math.round(t.weight), u.num(t.volume, 2), s.id]; }))); },
    exportCons: () => csvDl("otpravki_" + today() + ".csv", [["Трек-номер", "Код клиента", "Клиент", "Транспорт", "Мест", "Вес, кг", "Объём, м³", "Отправлена", "Статус", "Стоимость, $", "Оплачено"]].concat(st.S.ships.map((s) => { const t = st.totals(s); return [s.id, s.clientId, cname(s.clientId), st.TRANSPORT[s.transport].t, t.places, Math.round(t.weight), u.num(t.volume, 2), u.dFull(s.sentAt), L.t("st_" + s.status), s.cost, st.isPaid(s) ? "да" : "нет"]; }))),
    exportRep: () => csvDl("otchet_" + today() + ".csv", [["Неделя с", "Упаковано, м³"]].concat(weeksData().map((w) => [w.label, u.num(w.v, 2)]))),
    exportMoney: () => csvDl("oplaty_" + today() + ".csv", [["Код", "Клиент", "Начислено, $", "Оплачено, $", "Долг, $"]].concat(st.S.clients.map((c) => { const m = st.money(c.id); return [c.id, c.name, Math.round(m.charged), Math.round(m.paid), Math.round(m.debt)]; }))),
  });
  function chatSendFrom(el, tid, side, d) {
    const inPhone = el && el.closest(".pslot"), slot = inPhone ? App.ui.slots[App.cur] : null;
    const by = side === "ru" ? (slot ? "ramil" : role() === "admin" ? "ramil" : "olga") : slot && slot.role === "cnmanager" ? "wangtao" : st.WH_STAFF[(st.thread(tid) || {}).wh] || "liwei";
    st.chatSend(tid, side, by, d);
  }
  App.ins = Object.assign(App.ins || {}, {
    q: (v) => { App.tmp.q = v; App.refresh(true); },
    clientsQ: (v) => { App.tmp.clientsQ = v; App.refresh(true); },
    dCost: (v) => { App.tmp.dCost = v; },
    payAmt: (v) => { App.tmp.pay.amount = v; $("payUsd").innerHTML = payUsdHtml(); },
    payRate: (v) => { App.tmp.pay.rate = v; $("payUsd").innerHTML = payUsdHtml(); },
    expIn: (v, el) => { App.tmp.exp[el.dataset.k] = v; $("expSum").innerHTML = expHtml(); },
    tarRate: (v) => { App.tmp.tar.rate = v; $("tarEx").innerHTML = tarHtml(); },
    chatText: (v) => { App.tmp.chatText = v; },
  });
  document.addEventListener("change", (e) => { const el = e.target.closest && e.target.closest('[data-chg="sales"]'); if (el) { st.setSales(el.dataset.c, el.value); App.toast("Клиент закреплён за менеджером: " + st.who(el.value), "users"); } });

  App.D = {
    side, allowed, title: (k) => TITLES[k] || "",
    screens: { board, clients, client, cons, dispatch, stages, staff, reports, money, profit, tariffs, chat, included },
    after() { const m = $("chatMsgs"); if (m) m.scrollTop = m.scrollHeight; },
    payModal, reconModal, invoiceModal, expModal, tariffModal, unknownModal, dispatchModal, openItem,
  };
})(window.App);
