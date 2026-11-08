/* Экраны компьютера: администратор и менеджер в России. */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, I = u.icon, E = u.esc;
  const ACTIVE = ["in", "pack", "way", "arrived"];
  const pill = (s, lg) => `<span class="st${lg ? " lg" : ""}" data-st="${s}">${st.STATUS[s].t}</span>`;
  const optBtn = (k, label) => `<button class="opt" type="button" data-act="opt" data-k="${k}">${I(App.OPT ? (App.OPT[k] || {}).icon || "spark" : "spark")}<span class="ol">${E(label)}</span><i>опция</i></button>`;
  const cname = (id) => (st.client(id) || {}).name || id;

  const TITLES = { board: "поставки", clients: "клиенты", client: "клиенты", cons: "отправки", dispatch: "отгрузка", finance: "финансы", reports: "отчёты", staff: "сотрудники", included: "что входит" };
  const NAV = {
    admin: [["board", "board", "Поставки"], ["clients", "users", "Клиенты"], ["cons", "truck", "Отправки"], ["finance", "wallet", "Финансы"], ["reports", "chart", "Отчёты"], ["staff", "team", "Сотрудники"]],
    manager: [["dispatch", "layers", "Отгрузка"], ["board", "board", "Поставки"], ["cons", "truck", "Отправки"], ["clients", "users", "Клиенты"]],
  };

  function counts() {
    const S = st.S;
    return {
      board: S.shipments.filter((s) => ACTIVE.includes(s.status)).length,
      clients: S.clients.length,
      cons: S.consignments.filter((c) => c.status !== "done").length,
      dispatch: S.shipments.filter((s) => s.status === "pack").length,
    };
  }
  function side(role, cur, R) {
    const c = counts(), curNav = cur === "client" ? "clients" : cur;
    const items = NAV[role].map(([k, ic, t]) => `<a data-act="d" data-s="${k}" class="${curNav === k ? "on" : ""}" data-nav="${k}">${I(ic)}${t}${c[k] != null ? `<b>${c[k]}</b>` : ""}</a>`).join("");
    return `<div class="nav">${items}</div><div class="sep"></div>
      <div class="nav"><a data-act="d" data-s="included" class="${cur === "included" ? "on" : ""}">${I("grid")}Что входит</a><a class="optn" data-act="opt" data-k="chat">${I("chat")}Чат-переводчик<i>опция</i></a><a class="optn" data-act="opt" data-k="clientChat">${I("users")}Чат с клиентами<i>опция</i></a></div>
      <div class="me"><span class="ava">${R.ava}</span><span>${E(R.name)}<small>${E(R.role)}</small></span></div>`;
  }

  // ---------- доска поставок ----------
  function shipCard(s) {
    const c = st.client(s.clientId);
    let foot;
    if (s.status === "in") foot = `<span>${s.photos.length} фото</span><span>${u.when(s.createdAt)}</span>`;
    else if (s.status === "pack") foot = `<span>${E(s.packType || "")}</span><span>${u.money(s.cost)}</span>`;
    else if (s.status === "way") { const cs = st.cons(s.consId); foot = `<span>${E(s.consId)}</span><span>≈${u.NB}${u.dShort(cs.eta)}</span>`; }
    else foot = `<span>можно забирать</span><span>${E(s.consId)}</span>`;
    return `<button class="sc${s.fresh ? " new" : ""}" type="button" data-act="openShip" data-id="${s.id}" data-sc="${s.id}">
      <span class="t"><span class="code">${E(c.id)}</span><span class="id">${E(s.id)}</span></span>
      <span class="nm">${E(c.name)}</span><span class="sp">${E(s.supplier)}</span>
      <span class="m"><span>${u.places(s.places)}</span><span>${u.kg(s.weight)}</span><span>${u.vol(s.volume)}</span></span>
      <span class="f">${foot}</span></button>`;
  }
  function board() {
    const S = st.S, q = App.tmp.q.trim().toUpperCase();
    const match = (s) => !q || s.id.toUpperCase().includes(q) || s.clientId.includes(q) || cname(s.clientId).toUpperCase().includes(q) || s.supplier.toUpperCase().includes(q) || (s.consId || "").toUpperCase().includes(q);
    const act = S.shipments.filter((s) => ACTIVE.includes(s.status));
    const wh = act.filter((s) => s.status === "in" || s.status === "pack");
    const way = act.filter((s) => s.status === "way");
    const wayCons = S.consignments.filter((c) => c.status === "way").sort((a, b) => a.eta - b.eta);
    const m = st.money(), debtors = S.clients.filter((c) => st.money(c.id).debt > 0).length;
    const lanes = ["in", "pack", "way", "arrived"].map((k) => {
      const list = act.filter((s) => s.status === k && match(s)).sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || b.createdAt - a.createdAt);
      const shown = list.slice(0, 4);
      return `<div class="lane" data-lane="${k}"><div class="lane-h">${pill(k)}<b>${list.length}</b></div>
        ${shown.map(shipCard).join("") || '<div class="lane-empty">Пусто</div>'}
        ${list.length > 4 ? `<div class="lane-more" data-act="toast" data-t="В рабочей версии колонка прокручивается, здесь показаны первые 4">ещё ${list.length - 4}</div>` : ""}</div>`;
    }).join("");
    const done30 = S.shipments.filter((s) => s.status === "done").length;
    return `<div class="pane">
      <div class="ph"><h1>Поставки</h1><label class="search">${I("search")}<input data-in="q" value="${E(App.tmp.q)}" placeholder="Код клиента, номер, поставщик, трек…"></label><span class="grow"></span><button class="btn pri" type="button" data-act="newShip">${I("plus")}Поставка</button></div>
      <div class="kpis">
        <div class="kpi hero"><span>На складе в Иу</span><strong>${wh.length}</strong><small>${u.vol(wh.reduce((a, s) => a + s.volume, 0))} · ${u.kg(wh.reduce((a, s) => a + s.weight, 0))}</small></div>
        <div class="kpi"><span>В пути</span><strong>${way.length}</strong><small>${wayCons.length ? "ближайшая " + u.dShort(wayCons[0].eta) : "нет отправок"}</small></div>
        <button class="kpi" type="button" data-act="d" data-s="finance"><span>Долг клиентов</span><strong>${u.moneyShort(m.debt)}</strong><small>${debtors} ${u.plural(debtors, "клиент", "клиента", "клиентов")}</small></button>
        <button class="kpi${S.unknown.length ? " bad" : ""}" type="button" data-act="unknown"><span>Неопознанные</span><strong>${S.unknown.length}</strong><small>${S.unknown.length ? "ждут разбора" : "всё разобрано"}</small></button>
      </div>
      ${S.expected.length ? `<div class="wait-strip">${I("clock")}Ожидаются:${S.expected.map((e) => `<span class="chip"><b>${E(e.clientId)}</b>${E(e.note)}</span>`).join("")}</div>` : ""}
      <div class="board">${lanes}</div>
      <p class="muted mt" style="font-size:12.5px">Выдано за месяц: ${done30} ${u.plural(done30, "поставка", "поставки", "поставок")}. <span class="lnk" data-act="d" data-s="cons">Все отправки</span></p>
    </div>`;
  }

  function tl(s) {
    const order = ["in", "pack", "way", "arrived", "done"];
    const idx = order.indexOf(s.status);
    return `<ol class="tl">${order.map((k, i) => {
      const h = s.history.find((x) => x.st === k);
      const cls = i < idx ? "done" : i === idx ? (k === "done" ? "done" : "cur") : "todo";
      const label = k === "in" ? "Принят на складе в Иу" : k === "pack" ? "Упакован" : k === "way" ? "Отправлен из Китая" : k === "arrived" ? "Прибыл в Москву" : "Выдан клиенту";
      return `<li class="${cls}"><b>${label}</b>${h ? `<small>${u.dShort(h.at)} · ${u.hm(h.at)} · ${E(h.by)}</small>` : ""}</li>`;
    }).join("")}</ol>`;
  }
  function shipDrawer(id) {
    const s = st.ship(id); if (!s) return "";
    const c = st.client(s.clientId), cs = s.consId ? st.cons(s.consId) : null;
    const ph = s.photos.map((p, i) => `<div class="ph-i">${u.photo(p)}<em>приёмка ${i + 1}</em></div>`).join("") + (s.packPhotos || []).map((p) => `<div class="ph-i">${u.photo(p, u.packKind(s.packType))}<em>упаковка</em></div>`).join("");
    return `<div class="dh"><div><h2>${E(s.id)}</h2></div>${pill(s.status, true)}<button class="x" type="button" data-act="closeDesk" aria-label="Закрыть">${I("x")}</button></div>
      <div class="db">
        <div class="row"><span class="tag code">${E(c.id)}</span><span class="lnk" data-act="d" data-s="client" data-p="${c.id}">${E(c.name)}</span><span class="muted">${E(c.city)}</span></div>
        <div class="photos">${ph}</div>
        <dl class="kv"><dt>Поставщик</dt><dd>${E(s.supplier)}</dd><dt>Места</dt><dd>${u.places(s.places)}</dd><dt>Вес</dt><dd>${u.kg(s.weight)}</dd><dt>Объём</dt><dd>${u.vol(s.volume)}</dd>
          <dt>Упаковка</dt><dd>${E(s.packType || "ещё не упакован")}</dd><dt>Стоимость</dt><dd>${s.cost ? u.money(s.cost) : "посчитается при упаковке"}</dd>
          ${cs ? `<dt>Отправка</dt><dd>${E(cs.id)} · ${E(st.TRANSPORT[cs.transport].label)}</dd><dt>Прибытие</dt><dd>${cs.status === "way" ? "около " + u.dLong(cs.eta) : u.dLong(cs.arrivedAt)}</dd>` : ""}</dl>
        <div><h3 style="margin:0 0 10px;font-size:14px">История</h3>${tl(s)}</div>
        <div class="row wrap"><button class="btn" type="button" data-act="toast" data-t="Этикетки отправлены на принтер склада" data-i="printer">${I("qr")}Печать QR-этикеток</button>${cs ? optBtn("invoice", "Накладная") : ""}</div>
      </div>`;
  }

  // ---------- клиенты ----------
  function clients() {
    const S = st.S, q = App.tmp.clientsQ.trim().toUpperCase(), now = Date.now();
    const rows = S.clients.filter((c) => !q || c.id.includes(q) || c.name.toUpperCase().includes(q) || c.city.toUpperCase().includes(q)).map((c) => {
      const mine = st.shipsOf(c.id), a = mine.filter((s) => ACTIVE.includes(s.status)).length;
      const v30 = mine.filter((s) => now - s.createdAt < 30 * u.DAY).reduce((x, s) => x + s.volume, 0);
      const d = st.money(c.id).debt;
      return `<tr class="click" data-act="d" data-s="client" data-p="${c.id}"><td class="code">${E(c.id)}</td><td><b>${E(c.name)}</b><div class="muted" style="font-size:12px">${E(c.person)}</div></td><td class="muted">${E(c.city)}</td><td class="r">${a}</td><td class="r">${u.vol(v30)}</td><td class="r ${d ? "bad" : "ok"}">${d ? u.money(d) : "нет долга"}</td></tr>`;
    }).join("");
    return `<div class="pane">
      <div class="ph"><div><h1>Клиенты</h1><div class="sub">${S.clients.length} клиентов, у каждого свой код для маркировки грузов</div></div><span class="grow"></span>${optBtn("import", "Импорт из Excel")}<button class="btn pri" type="button" data-act="toast" data-t="В рабочей версии откроется карточка нового клиента" data-i="info">${I("plus")}Клиент</button></div>
      <label class="search" style="max-width:none;margin-bottom:14px">${I("search")}<input data-in="clientsQ" value="${E(App.tmp.clientsQ)}" placeholder="Код, название или город"></label>
      <table class="tbl"><thead><tr><th>Код</th><th>Клиент</th><th>Город</th><th class="r">Активные грузы</th><th class="r">Объём за 30 дней</th><th class="r">Долг</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="muted">Никого не нашли</td></tr>'}</tbody></table>
    </div>`;
  }
  function client(id) {
    const c = st.client(id); if (!c) return clients();
    const mine = st.shipsOf(c.id).sort((a, b) => b.createdAt - a.createdAt), m = st.money(c.id), now = Date.now();
    const last30 = mine.filter((s) => now - s.createdAt < 30 * u.DAY);
    const pays = st.S.payments.filter((p) => p.clientId === c.id).sort((a, b) => b.at - a.at);
    return `<div class="pane">
      <div class="pback" data-act="d" data-s="clients">${I("back")}Клиенты</div>
      <div class="ph"><span class="tag code" style="height:32px;font-size:14px">${E(c.id)}</span><div><h1>${E(c.name)}</h1><div class="sub">${E(c.city)} · ${E(c.person)} · ${E(c.phone)} · клиент с ${E(c.since)} года</div></div></div>
      <div class="kpis">
        <div class="kpi"><span>Поставок за 30 дней</span><strong>${last30.length}</strong><small>всего ${mine.length}</small></div>
        <div class="kpi"><span>Объём за 30 дней</span><strong>${u.vol(last30.reduce((a, s) => a + s.volume, 0))}</strong><small>${u.kg(last30.reduce((a, s) => a + s.weight, 0))}</small></div>
        <div class="kpi"><span>Начислено всего</span><strong>${u.moneyShort(m.charged)}</strong><small>оплачено ${u.moneyShort(m.paid)}</small></div>
        <div class="kpi ${m.debt ? "bad" : "hero"}"><span>Долг</span><strong>${m.debt ? u.money(m.debt) : "нет"}</strong><small>${m.debt ? '<span class="lnk" data-act="payModal" data-c="' + c.id + '">Отметить оплату</span>' : "всё оплачено"}</small></div>
      </div>
      <div class="grid2">
        <div class="box" style="padding:0;overflow:hidden"><table class="tbl" style="box-shadow:none;border-radius:0"><thead><tr><th>Поставка</th><th>Статус</th><th class="r">Объём</th><th class="r">Стоимость</th></tr></thead><tbody>
          ${mine.map((s) => `<tr class="click" data-act="openShip" data-id="${s.id}"><td><b>${E(s.id)}</b><span class="muted ell" style="font-size:12px">${u.dShort(s.createdAt)} · ${E(s.supplier)}</span></td><td>${pill(s.status)}</td><td class="r">${u.vol(s.volume)}</td><td class="r">${s.cost ? u.money(s.cost) : "—"}</td></tr>`).join("")}
        </tbody></table></div>
        <div style="display:grid;gap:14px">
          <div class="box"><h3>${I("pin")}Адрес склада для поставщиков</h3><p style="margin:0 0 8px;font-size:13px">Клиент отправляет этот адрес своим поставщикам в Китае, они пишут код на каждой коробке.</p>
            <div class="note" style="color:var(--ink-2)">义乌市 福田街道 商城大道 88号 3号仓<br>收货人: 中心物流 · 电话: 仓库电话<br><b style="color:var(--ink)">唛头: ${E(c.id)}</b></div></div>
          <div class="box"><h3>${I("wallet")}Оплаты</h3>${pays.length ? pays.slice(0, 5).map((p) => `<div class="pline"><span>${u.dLong(p.at)}</span><b>${u.money(p.amount)}</b></div>`).join("") : '<p class="muted" style="margin:0">Оплат пока нет</p>'}</div>
        </div>
      </div>
    </div>`;
  }

  // ---------- отправки ----------
  function consRows(list, role) {
    return list.map((c) => {
      const ships = c.shipIds.map(st.ship).filter(Boolean);
      const pl = ships.reduce((a, s) => a + s.places, 0), w = ships.reduce((a, s) => a + s.weight, 0), v = ships.reduce((a, s) => a + s.volume, 0);
      const action = c.status === "way" ? `<button class="btn sm" type="button" data-act="arrive" data-id="${c.id}">Прибыла</button>` : c.status === "arrived" ? `<button class="btn sm dark" type="button" data-act="issue" data-id="${c.id}">Выдать</button>` : `<span class="muted">${u.dShort(c.arrivedAt)}</span>`;
      return `<tr class="click" data-act="openCons" data-id="${c.id}"><td><b>${E(c.id)}</b><div class="muted" style="font-size:12px">${E(c.transport)} · ${c.shipIds.length} ${u.plural(c.shipIds.length, "поставка", "поставки", "поставок")}</div></td><td><b>${E(c.clientId)}</b><div class="muted" style="font-size:12px">${E(cname(c.clientId))}</div></td><td>${u.places(pl)}<div class="muted" style="font-size:12px">${u.kg(w)} · ${u.vol(v)}</div></td><td>${u.dShort(c.sentAt)}<div class="muted" style="font-size:12px">${c.status === "way" ? "прибытие ≈" + u.NB + u.dShort(c.eta) : c.arrivedAt ? "прибыла " + u.dShort(c.arrivedAt) : ""}</div></td><td>${pill(c.status === "way" ? "way" : c.status)}</td><td class="r" data-stop="1">${action}</td></tr>`;
    }).join("");
  }
  function cons() {
    const S = st.S;
    const open = S.consignments.filter((c) => c.status !== "done").sort((a, b) => b.sentAt - a.sentAt);
    const done = S.consignments.filter((c) => c.status === "done").sort((a, b) => b.sentAt - a.sentAt);
    const head = '<thead><tr><th>Трек-номер</th><th>Клиент</th><th>Груз</th><th>Отправлена</th><th>Статус</th><th class="r"></th></tr></thead>';
    return `<div class="pane">
      <div class="ph"><div><h1>Отправки</h1><div class="sub">Поставки, объединённые в одну отправку с трек-номером компании</div></div><span class="grow"></span>${optBtn("invoice", "Накладная")}</div>
      <table class="tbl">${head}<tbody>${consRows(open) || '<tr><td colspan="6" class="muted">Нет активных отправок</td></tr>'}</tbody></table>
      <h3 class="mt2" style="font-size:15px;margin-bottom:10px">Выданы</h3>
      <table class="tbl">${head}<tbody>${consRows(done)}</tbody></table>
    </div>`;
  }
  function consDrawer(id) {
    const c = st.cons(id); if (!c) return "";
    const ships = c.shipIds.map(st.ship).filter(Boolean);
    return `<div class="dh"><h2>${E(c.id)}</h2>${pill(c.status, true)}<button class="x" type="button" data-act="closeDesk" aria-label="Закрыть">${I("x")}</button></div>
      <div class="db"><div class="row"><span class="tag code">${E(c.clientId)}</span><b>${E(cname(c.clientId))}</b></div>
      <dl class="kv"><dt>Транспорт</dt><dd>${E(st.TRANSPORT[c.transport].label)}</dd><dt>Отправлена</dt><dd>${u.dLong(c.sentAt)}</dd><dt>${c.status === "way" ? "Ожидается" : "Прибыла"}</dt><dd>${c.status === "way" ? "около " + u.dLong(c.eta) : u.dLong(c.arrivedAt)}</dd><dt>Стоимость</dt><dd>${u.money(ships.reduce((a, s) => a + s.cost, 0))}</dd></dl>
      <div>${ships.map((s) => `<div class="pline"><span><b>${E(s.id)}</b><small>${E(s.supplier)} · ${E(s.packType || "")}</small></span><span>${u.places(s.places)} · ${u.vol(s.volume)}</span></div>`).join("")}</div>
      <div class="row wrap">${c.status === "way" ? `<button class="btn pri" type="button" data-act="arrive" data-id="${c.id}">Отметить прибытие</button>` : c.status === "arrived" ? `<button class="btn dark" type="button" data-act="issue" data-id="${c.id}">Выдать клиенту</button>` : ""}${optBtn("invoice", "Накладная")}</div></div>`;
  }

  // ---------- отгрузка (менеджер) ----------
  function dispatch() {
    const S = st.S, sel = App.tmp.sel;
    const packed = S.shipments.filter((s) => s.status === "pack");
    const groups = {};
    packed.forEach((s) => (groups[s.clientId] = groups[s.clientId] || []).push(s));
    const order = Object.keys(groups).sort((a, b) => (groups[b].some((s) => s.fresh) ? 1 : 0) - (groups[a].some((s) => s.fresh) ? 1 : 0));
    const selShips = sel.map(st.ship).filter((s) => s && s.status === "pack");
    const selClient = selShips.length ? selShips[0].clientId : null;
    const boxes = order.map((cid) => {
      const list = groups[cid];
      return `<div class="box" data-grp="${cid}" style="margin-bottom:12px"><h3><span class="tag code">${E(cid)}</span>${E(cname(cid))}<span class="muted" style="font-weight:500;font-size:12.5px;margin-left:auto">${list.length} ${u.plural(list.length, "поставка", "поставки", "поставок")} · ${u.vol(list.reduce((a, s) => a + s.volume, 0))}</span></h3>
        <div class="choice">${list.map((s) => {
          const on = sel.includes(s.id), dis = selClient && selClient !== cid;
          return `<button type="button" class="${on ? "on" : ""}${dis ? " off" : ""}" data-act="selShip" data-id="${s.id}" ${dis ? 'title="В одну отправку объединяются грузы одного клиента"' : ""} data-sel="${s.id}">${I(on ? "check" : "box")}<span style="flex:1">${E(s.id)} · ${E(s.supplier)}<small>${u.places(s.places)} · ${u.kg(s.weight)} · ${u.vol(s.volume)} · ${E(s.packType)}</small></span><b>${u.money(s.cost)}</b></button>`;
        }).join("")}</div></div>`;
    }).join("");
    const way = S.consignments.filter((c) => c.status === "way").sort((a, b) => a.eta - b.eta);
    const arr = S.consignments.filter((c) => c.status === "arrived");
    const tot = { p: selShips.reduce((a, s) => a + s.places, 0), v: selShips.reduce((a, s) => a + s.volume, 0), c: selShips.reduce((a, s) => a + s.cost, 0) };
    return `<div class="pane">
      <div class="ph"><div><h1>Отгрузка</h1><div class="sub">Упакованные грузы на складе в Иу. Отметьте поставки одного клиента и соберите отправку.</div></div></div>
      <div class="grid2">
        <div>${boxes || '<div class="box muted">Упакованных грузов нет. Как только склад упакует поставку, она появится здесь.</div>'}</div>
        <div style="display:grid;gap:14px">
          <div class="box" data-dispatch-box="1"><h3>${I("truck")}Новая отправка</h3>
            ${selShips.length ? `<p style="margin:0 0 6px"><b>${E(cname(selClient))}</b>: ${selShips.map((s) => E(s.id)).join(", ")}</p><p class="muted" style="margin:0 0 12px;font-size:13px">${u.places(tot.p)} · ${u.vol(tot.v)} · ${u.money(tot.c)}</p>` : '<p class="muted" style="margin:0 0 12px;font-size:13px">Отметьте слева одну или несколько поставок клиента.</p>'}
            <button class="btn pri block" type="button" data-act="dispatchModal" ${selShips.length ? "" : "disabled"} id="btnDispatch">${I("send")}Сформировать отправку${selShips.length ? " (" + selShips.length + ")" : ""}</button></div>
          <div class="box"><h3>${I("clock")}В пути</h3>${way.map((c) => `<div class="pline"><span><b>${E(c.id)}</b><small>${E(c.clientId)} ${E(cname(c.clientId))} · ≈${u.NB}${u.dShort(c.eta)}</small></span><button class="btn sm" type="button" data-act="arrive" data-id="${c.id}">Прибыла</button></div>`).join("") || '<p class="muted" style="margin:0">Нет</p>'}</div>
          <div class="box"><h3>${I("pin")}Можно забирать</h3>${arr.map((c) => `<div class="pline"><span><b>${E(c.id)}</b><small>${E(c.clientId)} ${E(cname(c.clientId))}</small></span><button class="btn sm dark" type="button" data-act="issue" data-id="${c.id}">Выдать</button></div>`).join("") || '<p class="muted" style="margin:0">Нет</p>'}</div>
        </div>
      </div>
    </div>`;
  }
  function dispatchModal() {
    const ships = App.tmp.sel.map(st.ship).filter((s) => s && s.status === "pack"); if (!ships.length) return;
    App.tmp.transport = App.tmp.transport || "Авто";
    const tr = App.tmp.transport, eta = Date.now() + st.TRANSPORT[tr].days * u.DAY;
    App.modal(`<div class="mh"><div class="mi">${I("truck")}</div><div><h2>Отправка из Иу</h2><div class="muted" style="font-size:13px">${E(cname(ships[0].clientId))} · ${ships.map((s) => E(s.id)).join(", ")}</div></div><button class="x" type="button" data-act="closeDesk" aria-label="Закрыть">${I("x")}</button></div>
      <div class="fld"><span>Транспорт</span><div class="choice cols2">${Object.keys(st.TRANSPORT).map((k) => `<button type="button" class="${k === tr ? "on" : ""}" data-act="pickTr" data-k="${k}">${I(k === "Авто" ? "truck" : "layers")}<span>${k}<small>${st.TRANSPORT[k].label.split(", ")[1]}</small></span></button>`).join("")}</div></div>
      <dl class="kv mt"><dt>Трек-номер</dt><dd><b>ЦЛ-${st.S.seq.cons}</b> <span class="muted">присваивается автоматически</span></dd><dt>Прибытие</dt><dd>около ${u.dLong(eta)}</dd><dt>Итого</dt><dd>${u.places(ships.reduce((a, s) => a + s.places, 0))} · ${u.kg(ships.reduce((a, s) => a + s.weight, 0))} · ${u.vol(ships.reduce((a, s) => a + s.volume, 0))}</dd></dl>
      <div class="note mt">Клиент сразу получит уведомление с трек-номером.</div>
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="dispatchGo" id="btnDispatchGo">${I("send")}Отправить</button></div>`);
  }

  // ---------- финансы ----------
  const PERIODS = { m: ["Этот месяц", 0, 30], p: ["Прошлый месяц", 30, 60], q: ["Квартал", 0, 90] };
  function finRows(per) {
    const [, from, to] = PERIODS[per], now = Date.now();
    const inP = (t) => t <= now - from * u.DAY && t > now - to * u.DAY;
    return st.S.clients.map((c) => {
      const charged = st.shipsOf(c.id).filter((s) => s.cost && inP((s.history.find((h) => h.st === "pack") || {}).at || 0)).reduce((a, s) => a + s.cost, 0);
      const paid = st.S.payments.filter((p) => p.clientId === c.id && inP(p.at)).reduce((a, p) => a + p.amount, 0);
      return { c, charged, paid, debt: st.money(c.id).debt };
    });
  }
  function finance() {
    const per = App.tmp.period, rows = finRows(per);
    const T = rows.reduce((a, r) => ({ ch: a.ch + r.charged, pa: a.pa + r.paid, d: a.d + r.debt }), { ch: 0, pa: 0, d: 0 });
    return `<div class="pane">
      <div class="ph"><h1>Финансы</h1><span class="grow"></span>${optBtn("tariff", "Расчёт по тарифам")}<button class="btn" type="button" data-act="exportFin">${I("download")}Выгрузить в Excel</button></div>
      <div class="seg" style="margin:-4px 0 16px">${Object.entries(PERIODS).map(([k, v]) => `<button type="button" class="${k === per ? "on" : ""}" data-act="period" data-k="${k}">${v[0]}</button>`).join("")}</div>
      <div class="kpis">
        <div class="kpi"><span>Начислено за период</span><strong>${u.moneyShort(T.ch)}</strong><small>по ставке ${u.money(st.RATE)} за м³ + упаковка</small></div>
        <div class="kpi hero"><span>Оплачено за период</span><strong>${u.moneyShort(T.pa)}</strong><small>${st.S.payments.length} платежей всего</small></div>
        <div class="kpi bad"><span>Долг клиентов сейчас</span><strong>${u.moneyShort(T.d)}</strong><small>${rows.filter((r) => r.debt).length} должников</small></div>
        <div class="kpi"><span>Средний чек отправки</span><strong>${u.moneyShort(st.S.consignments.length ? st.S.consignments.reduce((a, c) => a + c.shipIds.map(st.ship).reduce((x, s) => x + (s ? s.cost : 0), 0), 0) / st.S.consignments.length : 0)}</strong><small>по всем отправкам</small></div>
      </div>
      <table class="tbl"><thead><tr><th>Клиент</th><th class="r">Начислено</th><th class="r">Оплачено</th><th class="r">Долг сейчас</th><th class="r"></th></tr></thead><tbody>
        ${rows.sort((a, b) => b.debt - a.debt).map((r) => `<tr data-fin="${r.c.id}"><td><b>${E(r.c.id)}</b> ${E(r.c.name)}</td><td class="r">${u.money(r.charged)}</td><td class="r">${u.money(r.paid)}</td><td class="r ${r.debt ? "bad" : "ok"}">${r.debt ? u.money(r.debt) : "нет"}</td><td class="r">${r.debt ? `<button class="btn sm" type="button" data-act="payModal" data-c="${r.c.id}" data-pay="${r.c.id}">Отметить оплату</button>` : ""}</td></tr>`).join("")}
      </tbody><tfoot><tr><td>Итого</td><td class="r">${u.money(T.ch)}</td><td class="r">${u.money(T.pa)}</td><td class="r">${u.money(T.d)}</td><td></td></tr></tfoot></table>
    </div>`;
  }
  function payModal(cid) {
    const c = st.client(cid), d = st.money(cid).debt;
    App.modal(`<div class="mh"><div class="mi">${I("wallet")}</div><div><h2>Оплата от клиента</h2><div class="muted" style="font-size:13px">${E(c.id)} ${E(c.name)} · долг ${u.money(d)}</div></div><button class="x" type="button" data-act="closeDesk" aria-label="Закрыть">${I("x")}</button></div>
      <label class="fld"><span>Сумма, ₽</span><input class="inp" id="payAmt" inputmode="numeric" value="${d}" data-enter="#btnPayGo"></label>
      <dl class="kv mt"><dt>Дата</dt><dd>${u.dLong(Date.now())}</dd><dt>Способ</dt><dd>безналичный перевод</dd></dl>
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="payGo" data-c="${cid}" id="btnPayGo">${I("check")}Сохранить оплату</button></div>`);
  }

  // ---------- отчёты ----------
  function reports() {
    const S = st.S, now = Date.now();
    const weeks = [...Array(8)].map((_, i) => 7 - i).map((w) => {
      const from = now - (w + 1) * 7 * u.DAY, to = now - w * 7 * u.DAY;
      return { w, v: S.shipments.filter((s) => s.createdAt > from && s.createdAt <= to).reduce((a, s) => a + s.volume, 0), label: u.dShort(from + u.DAY) };
    });
    const max = Math.max(...weeks.map((x) => x.v), 1);
    const byClient = S.clients.map((c) => ({ c, v: st.shipsOf(c.id).reduce((a, s) => a + s.volume, 0) })).sort((a, b) => b.v - a.v);
    const vmax = byClient[0].v || 1;
    const stay = S.shipments.filter((s) => s.history.find((h) => h.st === "way")).map((s) => (s.history.find((h) => h.st === "way").at - s.createdAt) / u.DAY);
    const avgStay = stay.length ? stay.reduce((a, x) => a + x, 0) / stay.length : 0;
    return `<div class="pane">
      <div class="ph"><h1>Отчёты</h1><span class="grow"></span>${optBtn("analytics", "Расширенная аналитика")}<button class="btn" type="button" data-act="toast" data-t="Отчёт сформирован: otchet_po_obemam.xlsx" data-i="download">${I("download")}Выгрузить</button></div>
      <div class="kpis">
        <div class="kpi hero"><span>Принято за 8 недель</span><strong>${u.vol(weeks.reduce((a, x) => a + x.v, 0))}</strong><small>${S.shipments.length} поставок всего</small></div>
        <div class="kpi"><span>Груз на складе в среднем</span><strong>${avgStay.toFixed(1).replace(".", ",")} дн.</strong><small>от приёмки до отправки</small></div>
        <div class="kpi"><span>Отправок в пути</span><strong>${S.consignments.filter((c) => c.status === "way").length}</strong><small>авто и ЖД</small></div>
        <div class="kpi"><span>Активных клиентов</span><strong>${S.clients.length}</strong><small>за последние 60 дней</small></div>
      </div>
      <div class="grid2">
        <div class="box"><h3>${I("chart")}Объём приёмки по неделям, м³</h3><div class="bars">${weeks.map((x, i) => `<div class="bcol"><div class="b${i === 7 ? " cur" : ""}" style="height:${Math.max(4, (x.v / max) * 100)}%"><span>${x.v.toFixed(1).replace(".", ",")}</span></div><small>${x.label}</small></div>`).join("")}</div></div>
        <div class="box"><h3>${I("users")}Клиенты по объёму</h3>${byClient.map((x) => `<div class="hbar"><span>${E(x.c.name)}</span><i><b style="width:${(x.v / vmax) * 100}%"></b></i><span class="muted">${u.vol(x.v)}</span></div>`).join("")}</div>
      </div>
    </div>`;
  }

  // ---------- сотрудники ----------
  function staff() {
    const people = [["Рамиль", "Администратор", "Москва", "РМ"], ["Ольга Королёва", "Менеджер в России", "Москва", "ОК"], ["Наталья Сергеева", "Бухгалтер", "Москва", "НС"], ["Ли Вэй", "Склад в Китае", "Иу", "ЛВ"], ["Чжан Мин", "Склад в Китае", "Иу", "ЧМ"], ["Ван Тао", "Склад в Китае", "Иу", "ВТ"]];
    const roles = ["Администратор", "Менеджер", "Склад", "Бухгалтер", "Клиент"];
    const perm = [["Поставки и доска", "11101"], ["Приёмка и упаковка", "10100"], ["Отправки и трек-номера", "11000"], ["Финансы и оплаты", "10010"], ["Клиенты", "11010"], ["Отчёты", "11010"], ["Сотрудники и права", "10000"], ["Свои грузы и оплаты", "00001"]];
    const Y = `<span class="y">${I("check")}</span>`, N = `<span class="n">${I("minus")}</span>`;
    return `<div class="pane">
      <div class="ph"><div><h1>Сотрудники</h1><div class="sub">У каждой роли свой экран и свои права</div></div><span class="grow"></span><button class="btn pri" type="button" data-act="toast" data-t="В рабочей версии откроется приглашение сотрудника по ссылке" data-i="info">${I("plus")}Сотрудник</button></div>
      <div class="grid2">
        <table class="tbl"><thead><tr><th>Сотрудник</th><th>Роль</th><th>Где</th><th>Уведомления</th></tr></thead><tbody>${people.map(([n, r, w, a]) => `<tr><td><span class="row"><span class="ava" style="width:30px;height:30px;font-size:11px">${a}</span><b>${E(n)}</b></span></td><td>${E(r)}</td><td class="muted">${E(w)}</td><td class="muted">${w === "Иу" ? "в приложении" : "приложение, Telegram"}</td></tr>`).join("")}</tbody></table>
        <div class="box"><h3>${I("bell")}Каналы уведомлений</h3>
          <div class="pline"><span><b>В приложении</b><small>push на телефон и компьютер</small></span><span class="st" data-st="in">включено</span></div>
          <div class="pline"><span><b>Telegram</b><small>для сотрудников и клиентов в России</small></span><span class="st" data-st="in">включено</span></div>
          <div class="pline"><span><b>WhatsApp</b><small>клиентам, через провайдера</small></span>${optBtn("whatsapp", "WhatsApp")}</div></div>
      </div>
      <table class="tbl perm mt2"><thead><tr><th>Раздел</th>${roles.map((r) => `<th class="r" style="text-align:center">${r}</th>`).join("")}</tr></thead><tbody>${perm.map(([n, m]) => `<tr><td>${n}</td>${m.split("").map((x) => `<td class="c">${x === "1" ? Y : N}</td>`).join("")}</tr>`).join("")}</tbody></table>
    </div>`;
  }

  // ---------- что входит ----------
  const V1 = [
    ["Роли и права", "администратор, менеджер в России, склад в Китае, бухгалтер, клиент"],
    ["Приёмка на складе", "код клиента, фото, места, вес, объём; без обязательных полей дальше не пройти"],
    ["QR-этикетки", "на каждое место, дальше груз сканируют телефоном"],
    ["Неопознанные грузы", "отдельный список и привязка к клиенту"],
    ["Упаковка", "вид упаковки, вес и объём после упаковки, фото"],
    ["Доска поставок", "все грузы по статусам и карточка каждой поставки с историей"],
    ["Клиенты", "коды, контакты, адрес склада для поставщиков, статистика за период"],
    ["Отправки", "объединение поставок, трек-номер, статусы в пути, прибыл, выдан"],
    ["Финансы", "стоимость, оплаты, долги, отчёты за период, выгрузка в Excel"],
    ["Кабинет клиента", "на телефоне: статусы, фото, трек-номер, оплаты"],
    ["Уведомления", "в приложении и в Telegram"],
    ["Два языка", "интерфейс на русском и китайском, переключение на лету"],
    ["Везде", "компьютер, iPhone и Android, без установки из магазинов"],
  ];
  function included() {
    return `<div class="pane">
      <div class="ph"><div><h1>Что входит</h1><div class="sub">Первая версия системы и дополнительные модули на выбор</div></div></div>
      <div class="inc">
        <div class="box"><h3>${I("check")}Первая версия</h3><ul class="inc-list">${V1.map(([b, t]) => `<li><span class="ck">${I("check")}</span><span><b>${b}:</b> ${t}</span></li>`).join("")}</ul></div>
        <div class="box"><h3>${I("spark")}Опции</h3><p class="muted" style="margin:-4px 0 12px;font-size:13px">Добавляются сразу или следующим этапом, по вашему выбору.</p>
          ${Object.entries(App.OPT).map(([k, o]) => `<button class="opt-card" type="button" data-act="opt" data-k="${k}"><span class="oi">${I(o.icon)}</span><span><b>${E(o.t)}</b><small>${E(o.d.split(". ")[0])}.</small></span></button>`).join("")}</div>
      </div>
    </div>`;
  }

  // ---------- неопознанные ----------
  function unknownModal() {
    const list = st.S.unknown;
    App.modal(`<div class="mh"><div class="mi" style="background:var(--alert-soft);color:var(--alert)">${I("alert")}</div><div><h2>Неопознанные грузы</h2><div class="muted" style="font-size:13px">Склад принял, но клиента по маркировке не нашёл</div></div><button class="x" type="button" data-act="closeDesk" aria-label="Закрыть">${I("x")}</button></div>
      ${list.length ? list.map((x) => `<div class="box" style="margin-bottom:10px;display:grid;grid-template-columns:96px 1fr;gap:12px;align-items:start"><div class="ph-i">${u.photo(x.photo)}</div><div><b>${E(x.id)}</b> <span class="muted" style="font-size:12px">${u.when(x.at)}</span><p style="margin:4px 0 8px;font-size:13px">${E(x.note)}</p><div class="muted" style="font-size:12px;margin-bottom:8px">${u.places(x.places)} · ${u.kg(x.weight)} · ${u.vol(x.volume)}</div>
        <div class="row"><select class="inp" style="height:36px;font-size:13px" id="unk-${x.id}">${st.S.clients.map((c) => `<option value="${c.id}">${c.id} ${E(c.name)}</option>`).join("")}</select><button class="btn sm pri" type="button" data-act="assignUnk" data-id="${x.id}">Привязать</button></div></div></div>`).join("") : '<p class="muted">Все грузы разобраны.</p>'}`);
  }
  function newShipModal() {
    App.modal(`<div class="mh"><div class="mi">${I("plus")}</div><div><h2>Новая поставка</h2><div class="muted" style="font-size:13px">Если клиент предупредил о грузе заранее</div></div><button class="x" type="button" data-act="closeDesk" aria-label="Закрыть">${I("x")}</button></div>
      <label class="fld"><span>Клиент</span><select class="inp" id="nsClient">${st.S.clients.map((c) => `<option value="${c.id}">${c.id} ${E(c.name)}</option>`).join("")}</select></label>
      <label class="fld mt"><span>Поставщик</span><input class="inp" id="nsSup" placeholder="Например, Yiwu Hongda Trading"></label>
      <label class="fld mt"><span>Что ждём</span><input class="inp" id="nsNote" placeholder="Например, 10 коробок, посуда"></label>
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="newShipGo">Добавить в ожидаемые</button></div>`);
  }

  // ---------- действия ----------
  Object.assign((App.acts = App.acts || {}), {
    openShip: (d) => { App.drawer(shipDrawer(d.id)); const s = st.ship(d.id); if (s && s.fresh) { s.fresh = false; st.save(); } if (App.scenario) App.scenario.check("openShip", d.id); },
    openCons: (d, el, e) => { if (e.target.closest("[data-stop]")) return; App.drawer(consDrawer(d.id)); },
    arrive: (d) => { st.arrive(d.id); App.closeDesk(); App.toast(`Отправка ${d.id} прибыла, клиент получил уведомление`, "bell"); },
    issue: (d) => { st.issue(d.id); App.closeDesk(); App.toast(`Отправка ${d.id} выдана клиенту`, "check"); },
    selShip: (d) => {
      const s = st.ship(d.id), sel = App.tmp.sel;
      const cur = sel.map(st.ship).filter(Boolean);
      if (cur.length && cur[0].clientId !== s.clientId) { App.toast("В одну отправку объединяются грузы одного клиента", "info"); return; }
      const i = sel.indexOf(d.id); i >= 0 ? sel.splice(i, 1) : sel.push(d.id);
      App.refresh(true);
    },
    dispatchModal: () => dispatchModal(),
    pickTr: (d) => { App.tmp.transport = d.k; dispatchModal(); },
    dispatchGo: () => {
      const c = st.dispatch(App.tmp.sel, App.tmp.transport || "Авто");
      App.tmp.sel = []; App.closeDesk();
      if (c) { App.toast(`Отправка ${c.id} создана, клиент получил трек-номер`, "send"); if (App.scenario) App.scenario.check("dispatched", c); }
    },
    period: (d) => { App.tmp.period = d.k; App.refresh(true); },
    payModal: (d) => payModal(d.c),
    payGo: (d) => {
      const v = parseInt(String(document.getElementById("payAmt").value).replace(/\D/g, ""), 10);
      if (!v) { App.toast("Укажите сумму", "info"); return; }
      st.pay(d.c, v); App.closeDesk(); App.toast(`Оплата ${u.money(v)} сохранена, клиент получил уведомление`, "wallet");
    },
    exportFin: () => {
      const rows = finRows(App.tmp.period);
      const csv = ["Код;Клиент;Начислено;Оплачено;Долг"].concat(rows.map((r) => [r.c.id, r.c.name, r.charged, r.paid, r.debt].join(";"))).join("\r\n");
      const name = "finansy_" + new Date().toISOString().slice(0, 10) + ".csv";
      App.toast(u.download(name, csv) ? "Файл " + name + " скачан, открывается в Excel" : "Браузер не дал скачать файл", "download");
    },
    unknown: () => unknownModal(),
    assignUnk: (d) => { const sel = document.getElementById("unk-" + d.id); const sh = st.assignUnknown(d.id, sel.value); App.closeDesk(); if (sh) App.toast(`Груз привязан: ${sh.id}, ${cname(sh.clientId)}. Клиент получил уведомление`, "check"); },
    newShip: () => newShipModal(),
    newShipGo: () => {
      const cid = document.getElementById("nsClient").value, sup = document.getElementById("nsSup").value.trim(), note = document.getElementById("nsNote").value.trim();
      st.S.expected.unshift({ id: "E-" + Date.now(), clientId: cid, supplier: sup || "Поставщик не указан", note: note || "груз ожидается", at: Date.now() });
      st.save(); st.emit("change"); App.closeDesk(); App.toast("Поставка добавлена в ожидаемые, склад её увидит", "check");
    },
  });
  App.ins = Object.assign(App.ins || {}, {
    q: (v) => { App.tmp.q = v; const el = document.querySelector('[data-in="q"]'); const pos = el.selectionStart; App.refresh(true); const n = document.querySelector('[data-in="q"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } },
    clientsQ: (v) => { App.tmp.clientsQ = v; const el = document.querySelector('[data-in="clientsQ"]'); const pos = el.selectionStart; App.refresh(true); const n = document.querySelector('[data-in="clientsQ"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } },
  });

  App.D = {
    side, title: (k) => TITLES[k] || "",
    screens: { board, clients, client, cons, dispatch, finance, reports, staff, included },
  };
})(window.App);
