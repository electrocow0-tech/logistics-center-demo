/* Экраны компьютера, пятая часть (версия 3.3): шкала пути (общая для карточки отправки и кабинета клиента)
   и раздел «Новости и рассылки»: создать новость (вид, заголовок, текст, картинка), кому (все или выбранные клиенты),
   сейчас или отложенно; список отправленных с числом прочитавших. Публикация приходит клиенту уведомлением. */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, I = u.icon, E = u.esc, $ = (id) => document.getElementById(id);
  const K = App.DK, xBtn = K.xBtn, actor = K.actor;
  const scn = (ev, x) => { if (App.scenario) App.scenario.check(ev, x); };

  // ---------- шкала пути ----------
  // анимация заполнения только при первом показе груза; при перерисовке того же экрана шкала стоит на месте
  const seen = new Set();
  function tripHtml(s, o) {
    o = o || {};
    const t = st.trip(s), key = (o.key || "c") + ":" + s.id, anim = !seen.has(key), p = Math.round(t.pct);
    seen.add(key);
    const ticks = t.stages.slice(1).map((x) => `<em class="${x.done ? "on" : ""}" style="left:${x.pct.toFixed(1)}%"></em>`).join("");
    return `<div class="trip${anim ? " anim" : ""}${t.arrived ? " full" : ""}" data-hl="${o.hl || "trip"}" data-trip="${E(s.id)}" data-pct="${p}">
      <div class="trip-h"><span class="trip-n">${E(t.name)}${o.auto && t.auto ? '<span class="st" data-st="in">авто</span>' : ""}</span><b class="trip-p">${p}%</b></div>
      <div class="trip-bar"><i style="transform:scaleX(${(t.pct / 100).toFixed(3)})"></i>${ticks}</div>
      <div class="trip-f"><span>отправлен ${u.dLong(s.sentAt)}</span><span>${t.arrived ? "прибыл " + u.dLong(s.arrivedAt) : "прибытие ориентировочно " + st.rangeText(t.from, t.to)}</span></div></div>`;
  }
  App.trip = { html: tripHtml, reset: () => seen.clear() };

  // ---------- «Новости и рассылки» ----------
  const KIND_ST = { greet: "pack", info: "in", important: "unk" };
  const kindPill = (k) => `<span class="st" data-st="${KIND_ST[k] || "in"}">${E(st.NEWS_K[k] || "Новость")}</span>`;
  // картинки для новости: свои фото из прототипа, в рабочей версии загружается любая
  const IMGS = [null, { p: 1, kind: "pallet" }, { p: 2, kind: "recv" }, { p: 0, kind: "crate" }];
  const imgOf = (n) => (n.img ? u.photo(n.img.p, n.img.kind) : "");
  const whenText = (n) => u.dLong(n.at) + " в " + u.hm(n.at);
  function news() {
    st.newsTick();
    const list = st.S.news.slice().sort((a, b) => (a.status === "sched" ? 0 : 1) - (b.status === "sched" ? 0 : 1) || b.at - a.at);
    const sent = list.filter((n) => n.status === "sent"), sched = list.length - sent.length;
    const reach = sent.reduce((a, n) => a + st.newsTo(n).length, 0), rd = sent.reduce((a, n) => a + st.newsReadN(n), 0);
    const rows = list.map((n) => {
      const to = st.newsTo(n).length, r = st.newsReadN(n);
      return `<tr class="click" data-act="nwOpen" data-id="${n.id}" data-nw="${n.id}"><td><div class="nw-t"><span class="nw-ph">${n.img ? imgOf(n) : I("news")}</span><span class="ct"><b class="ell1">${E(n.title)}</b><small class="ell1">${E(n.text)}</small></span></div></td>
        <td>${kindPill(n.kind)}</td><td>${n.to === "sel" ? "выбранные клиенты" : "все клиенты"}<div class="muted s12 ell1">${n.to === "sel" ? E(st.newsTo(n).join(", ")) : to + " " + u.plural(to, "получатель", "получателя", "получателей")}</div></td>
        <td class="nw">${n.status === "sched" ? `<span class="st" data-st="wait">запланирована</span><div class="muted s12">${whenText(n)}</div>` : `${u.dShort(n.at)} <span class="muted">${u.hm(n.at)}</span><div class="muted s12">${E(st.who(n.pubBy || n.by))}</div>`}</td>
        <td class="r">${n.status === "sent" ? `<b data-nwr="${n.id}">${r} из ${to}</b><div class="nw-bar"><i style="transform:scaleX(${to ? (r / to).toFixed(3) : 0})"></i></div>` : `<button class="btn sm" type="button" data-act="nwPub" data-id="${n.id}" data-nwp="${n.id}">${I("send")}Опубликовать сейчас</button>`}</td></tr>`;
    }).join("");
    return `<div class="pane">
      <div class="ph"><div><h1>Новости и рассылки</h1><div class="sub">Объявления, поздравления с праздниками и важные сообщения клиентам. Новость появляется у клиента во вкладке «Новости» и приходит уведомлением на телефон.</div></div><span class="grow"></span><button class="btn pri" type="button" data-act="nwNew" id="btnNewsNew" data-hl="news-new">${I("plus")}Новая новость</button></div>
      <div class="kpis"><div class="kpi"><span>Опубликовано</span><strong>${sent.length}</strong><small>${sent.length ? "последняя " + u.dShort(sent.reduce((a, n) => Math.max(a, n.at), 0)) : "пока нет"}</small></div>
        <div class="kpi"><span>Запланировано</span><strong>${sched}</strong><small>опубликуются сами в своё время</small></div>
        <div class="kpi hero"><span>Прочитали</span><strong>${reach ? Math.round((rd / reach) * 100) : 0}%</strong><small>${rd} из ${reach} доставленных</small></div>
        <div class="kpi"><span>Клиентов</span><strong>${st.S.clients.length}</strong><small>получают новости в приложении</small></div></div>
      <div class="tbx"><table class="tbl" data-hl="news-t"><thead><tr><th>Новость</th><th>Вид</th><th>Кому</th><th>Когда</th><th class="r">Прочитали</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="muted">Новостей пока нет</td></tr>'}</tbody></table></div>
      <p class="muted s12 mt8">Нажмите на новость: видно, кто из клиентов прочитал. Отложенная новость публикуется сама в указанное время, её можно опубликовать раньше.</p>
    </div>`;
  }
  // окно «Новая новость»
  const pad = u.pad, isoLocal = (t) => { const d = new Date(t); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  const nwDef = () => ({ kind: "info", title: "", text: "", img: 0, to: "all", clients: [], when: "now", at: isoLocal(Date.now() + 86400e3 - (Date.now() % 3600e3)) });
  const nwOk = (d) => !!String(d.title).trim() && !!String(d.text).trim() && (d.to !== "sel" || d.clients.length > 0) && (d.when !== "later" || new Date(d.at).getTime() > Date.now());
  const nwReach = (d) => (d.to === "sel" ? d.clients.length : st.S.clients.length);
  const nwSum = (d) => `${I("bell")}<span>${nwReach(d) ? `Получат ${nwReach(d)} ${u.plural(nwReach(d), "клиент", "клиента", "клиентов")}` : "Отметьте хотя бы одного клиента"}${d.when === "later" ? ", " + (new Date(d.at).getTime() > Date.now() ? "публикация " + whenText({ at: new Date(d.at).getTime() }) : "укажите время в будущем") : ", сразу"}<small>каждому придёт уведомление, новость появится во вкладке «Новости»</small></span>`;
  function nwModal() {
    const d = App.tmp.nwd; if (!d) return;
    K.show("nwd", `<div class="mh"><div class="mi">${I("news")}</div><div><h2>Новая новость</h2><div class="muted s13">Объявление, поздравление или важное сообщение клиентам</div></div>${xBtn}</div>
      <div class="fld"><span>Вид</span><div class="choice cols3" data-hl="nwd-kind">${Object.keys(st.NEWS_K).map((k) => `<button type="button" class="${d.kind === k ? "on" : ""}" data-act="nwKind" data-k="${k}">${E(st.NEWS_K[k])}</button>`).join("")}</div></div>
      <label class="fld mt"><span>Заголовок <b>*</b></span><input class="inp" data-in="nwIn" data-k="title" value="${E(d.title)}" maxlength="80" placeholder="Например: График работы склада в праздники" autocomplete="off" data-hl="nwd-title"></label>
      <label class="fld mt"><span>Текст <b>*</b></span><textarea class="inp" data-in="nwIn" data-k="text" rows="4" maxlength="1200" placeholder="Что важно знать клиентам">${E(d.text)}</textarea></label>
      <div class="fld mt"><span>Картинка по желанию</span><div class="nw-img" data-hl="nwd-img">${IMGS.map((x, i) => `<button type="button" class="${d.img === i ? "on" : ""}" data-act="nwImg" data-k="${i}" aria-label="${x ? "Картинка " + i : "Без картинки"}">${x ? u.photo(x.p, x.kind) : `<span>${I("x")}Без картинки</span>`}</button>`).join("")}</div></div>
      <div class="fld mt"><span>Кому</span><div class="choice cols2" data-hl="nwd-to"><button type="button" class="${d.to === "all" ? "on" : ""}" data-act="nwTo" data-k="all">Все клиенты</button><button type="button" class="${d.to === "sel" ? "on" : ""}" data-act="nwTo" data-k="sel">Выбранные клиенты</button></div>
        ${d.to === "sel" ? `<div class="nw-cl" data-hl="nwd-clients">${st.S.clients.map((c) => { const on = d.clients.includes(c.id); return `<button type="button" class="prow${on ? " on" : ""}" data-act="nwCl" data-id="${E(c.id)}" data-nwc="${E(c.id)}"><span class="cb">${on ? I("check") : ""}</span><span class="ct"><b>${E(c.id)}</b><small class="ell1">${E(c.name)}</small></span></button>`; }).join("")}</div>` : ""}</div>
      <div class="fld mt"><span>Когда</span><div class="choice cols2" data-hl="nwd-when"><button type="button" class="${d.when === "now" ? "on" : ""}" data-act="nwWhen" data-k="now">Опубликовать сейчас</button><button type="button" class="${d.when === "later" ? "on" : ""}" data-act="nwWhen" data-k="later">Отложить</button></div>
        ${d.when === "later" ? `<input class="inp mt8" type="datetime-local" data-in="nwIn" data-k="at" value="${E(d.at)}" aria-label="Дата и время публикации" id="nwAt">` : ""}</div>
      <div class="found mt" id="nwSum">${nwSum(d)}</div>
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="nwGo" id="btnNwGo" ${nwOk(d) ? "" : "disabled"}>${I(d.when === "later" ? "clock" : "send")}${d.when === "later" ? "Запланировать" : "Опубликовать"}</button></div>`, "wide");
  }
  const nwSync = () => { const d = App.tmp.nwd, b = $("btnNwGo"), o = $("nwSum"); if (!d) return; if (b) b.disabled = !nwOk(d); if (o) o.innerHTML = nwSum(d); };
  // окно новости: текст и кто из клиентов прочитал
  function nwView() {
    const n = st.S.news.find((x) => x.id === App.tmp.nwv); if (!n) return;
    const to = st.newsTo(n), r = st.newsReadN(n);
    K.show("nwv", `<div class="mh"><div class="mi">${I("news")}</div><div><h2>${E(n.title)}</h2><div class="muted s13">${kindPill(n.kind)} ${n.status === "sched" ? "запланирована на " + whenText(n) : "опубликована " + whenText(n) + " · " + E(st.who(n.pubBy || n.by))}</div></div>${xBtn}</div>
      ${n.img ? `<div class="nw-big">${imgOf(n)}</div>` : ""}<p class="nw-txt">${E(n.text)}</p>
      <h3 class="h3 mt2">${n.status === "sent" ? `Прочитали ${r} из ${to.length}` : `Получат ${to.length} ${u.plural(to.length, "клиент", "клиента", "клиентов")}`}</h3>
      <div class="nw-rd" data-hl="nwv-reads">${to.map((id) => { const c = st.client(id), at = n.reads[id]; return `<div class="pline mini"><span><b>${E(id)}</b> ${E(c ? c.name : "")}</span>${n.status === "sent" ? (at ? `<span class="st" data-st="in">прочитано ${u.dShort(at)}</span>` : '<span class="st" data-st="wait">не прочитано</span>') : ""}</div>`; }).join("")}</div>
      <div class="mf">${n.status === "sched" ? `<button class="btn" type="button" data-act="nwPub" data-id="${n.id}">${I("send")}Опубликовать сейчас</button>` : ""}<button class="btn pri" type="button" data-act="closeDesk">Готово</button></div>`, "wide");
  }

  Object.assign(App.acts, {
    nwNew: () => { App.tmp.nwd = nwDef(); nwModal(); scn("nwOpen"); },
    nwKind: (d) => { const x = App.tmp.nwd; if (x) { x.kind = d.k; nwModal(); } },
    nwImg: (d) => { const x = App.tmp.nwd; if (x) { x.img = +d.k; nwModal(); } },
    nwTo: (d) => { const x = App.tmp.nwd; if (x) { x.to = d.k; nwModal(); } },
    nwCl: (d) => { const x = App.tmp.nwd; if (!x) return; const i = x.clients.indexOf(d.id); if (i >= 0) x.clients.splice(i, 1); else x.clients.push(d.id); nwModal(); },
    nwWhen: (d) => { const x = App.tmp.nwd; if (x) { x.when = d.k; nwModal(); } },
    nwFill: () => { const x = App.tmp.nwd; if (!x) return; Object.assign(x, { kind: "info", title: x.title || "Склад в Москве 31 декабря работает до 15:00", text: x.text || "31 декабря склад в Москве выдаёт грузы до 15:00. 1 и 2 января выходные, с 3 января работаем как обычно. Заберите грузы заранее, чтобы не платить за хранение в праздники.", img: x.img || 1 }); nwModal(); },
    nwGo: () => {
      const x = App.tmp.nwd; if (!x || !nwOk(x)) return;
      const n = st.newsAdd({ kind: x.kind, title: x.title, text: x.text, img: IMGS[x.img], to: x.to, clients: x.clients, when: x.when, at: x.when === "later" ? new Date(x.at).getTime() : Date.now() }, actor());
      if (!n) return;
      App.tmp.nwd = null; App.closeDesk(); App.refresh(true);
      App.toast(n.status === "sent" ? `Новость опубликована: ${st.newsTo(n).length} ${u.plural(st.newsTo(n).length, "клиент получил", "клиента получили", "клиентов получили")} уведомление` : `Новость запланирована на ${whenText(n)}`, n.status === "sent" ? "news" : "clock");
      scn("news", n);
    },
    nwPub: (d) => { const n = st.newsPublish(d.id, actor()); if (!n) return; App.closeDesk(); App.refresh(true); App.toast(`Новость опубликована: ${st.newsTo(n).length} ${u.plural(st.newsTo(n).length, "клиент получил", "клиента получили", "клиентов получили")} уведомление`, "news"); scn("news", n); },
    nwOpen: (d) => { App.tmp.nwv = +d.id; nwView(); },
  });
  Object.assign(App.ins, {
    nwIn: (v, el) => { const x = App.tmp.nwd; if (!x) return; x[el.dataset.k] = v; nwSync(); },
  });
  // ---------- «Склады в Китае» (группа «Деньги»): расходы складов на упаковку ----------
  // количество упаковок каждого вида за период (как в отчёте склада), наша цена за единицу в юанях, сумма в юанях и долларах.
  // Цена правится здесь: при «Все склады» общая, при выбранном складе своя цена склада. Сумма уходит в «Расходы и прибыль» (упаковка, наши расходы)
  const cwf = () => App.tmp.cwf || (App.tmp.cwf = { per: "month", from: "", to: "", wh: "all", k: null, p: null });
  const cnyF = (v) => u.groups(Math.round(v)) + u.NB + "¥";
  function chwData() {
    const f = cwf(), r = App.D.perRange(f), list = st.S.cargos.filter((c) => c.at >= r.from && c.at <= r.to && (f.wh === "all" || c.wh === f.wh));
    const rate = st.CUR.CNY.rate, p = chwPrices();
    const rows = st.PACK.map((k) => {
      const cs = list.filter((c) => (c.packs[k] || 0) > 0), n = cs.reduce((a, c) => a + c.packs[k], 0);
      // сумма: при выбранном складе по цене в поле; при «Все склады» общая цена (из поля), а у складов со своей ценой их цена
      const pr = (c) => (f.wh !== "all" ? u.parse(p[k]) : own(c.wh, k) ? st.packCnyOf(c.wh, k) : f.p ? u.parse(f.p[k]) : st.packCnyOf(c.wh, k));
      const cny = cs.reduce((a, c) => a + c.packs[k] * pr(c), 0);
      return { k, cs, n, cny, usd: cny / rate };
    });
    return { r, list, rows, rate, cny: rows.reduce((a, x) => a + x.cny, 0), n: rows.reduce((a, x) => a + x.n, 0) };
  }
  // цены в полях: черновик правки или сохранённые (общие или своего склада)
  function chwPrices() {
    const f = cwf(); if (f.p) return f.p;
    return Object.assign({}, ...st.PACK.map((k) => ({ [k]: String(f.wh === "all" ? st.S.dir.packCny[k] || 0 : st.packCnyOf(f.wh, k)).replace(".", ",") })));
  }
  const own = (wh, k) => wh !== "all" && st.S.dir.whPack[wh] && st.S.dir.whPack[wh][k] != null;
  function chwh() {
    const f = cwf(), d = chwData(), p = chwPrices(), whs = [["all", "Все склады"]].concat(st.WH.map((w) => [w.id, w.ru]));
    const rowsH = d.rows.map((x) => `<tr class="click${f.k === x.k ? " sel" : ""}" data-act="cwKind" data-k="${x.k}" data-cwk="${x.k}"><td><b>${E(K.cap(st.PACK_RU[x.k]))}</b><div class="muted s12">${x.cs.length} ${u.plural(x.cs.length, "груз", "груза", "грузов")}${own(f.wh, x.k) ? ' · <span class="ok">своя цена склада</span>' : ""}</div></td>
      <td class="r"><b data-cwn="${x.k}">${x.n}</b></td><td class="r"><label class="dir-in cw-in"><input class="inp sm" data-in="cwP" data-k="${x.k}" inputmode="decimal" value="${E(p[x.k])}" aria-label="Наша цена: ${E(st.PACK_RU[x.k])}" data-enter="#btnCwSave"><em>¥</em></label></td>
      <td class="r" data-cwc="${x.k}">${cnyF(x.cny)}</td><td class="r" data-cwu="${x.k}">${u.usd(x.usd)}</td><td class="r muted">${I(f.k === x.k ? "down" : "chevron")}</td></tr>`).join("");
    const sel = f.k ? d.rows.find((x) => x.k === f.k) : null;
    const det = sel ? `<div class="box mt" data-hl="cw-list"><h3>${I("list")}${E(K.cap(st.PACK_RU[sel.k]))}: грузы ${E(d.r.label)}</h3>${sel.cs.length ? `<div class="tbx flat"><table class="tbl bare cw-l"><thead><tr><th>Трек</th><th>Клиент</th><th>Наименование</th><th>Склад</th><th class="r">Кол-во</th><th class="r">Сумма</th><th>Упакован</th></tr></thead><tbody>${sel.cs.sort((a, b) => b.at - a.at).map((c) => `<tr class="click" data-act="openItem" data-t="${st.ship(c.id) ? "ship" : "cargo"}" data-id="${E(c.id)}" data-cwt="${E(c.id)}"><td><b class="mono">${E(c.id)}</b></td><td>${E(c.clientId)} <span class="muted">${E(K.cname(c.clientId))}</span></td><td>${E(c.name || "не указано")}</td><td>${E(st.wh(c.wh).ru)}</td><td class="r">${c.packs[sel.k]}</td><td class="r">${cnyF(c.packs[sel.k] * (f.wh === "all" ? st.packCnyOf(c.wh, sel.k) : u.parse(p[sel.k])))}</td><td class="nw">${u.dShort(c.at)}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted p0">За этот период таких упаковок нет</p>'}</div>` : "";
    return `<div class="pane">
      <div class="ph"><div><h1>Склады в Китае</h1><div class="sub">Расходы складов на упаковку: сколько упаковок каждого вида за период (как в отчёте склада), наша цена за единицу в юанях, сумма в юанях и в долларах по курсу. Эта сумма идёт в «Расходы и прибыль» как «упаковка, наши расходы».</div></div><span class="grow"></span><button class="btn" type="button" data-act="cwExport">${I("download")}Выгрузить в Excel</button></div>
      <div class="fbar cw-f" data-hl="cw-f"><div class="seg light sm">${[["today", "Сегодня"], ["month", "Месяц"], ["range", "Период"]].map(([k, t]) => `<button type="button" class="${f.per === k ? "on" : ""}" data-act="cwPer" data-k="${k}" data-cwp="${k}">${t}</button>`).join("")}</div>
        ${f.per === "range" ? `<label class="dt"><span>с</span><input class="inp sm" type="date" data-in="cwDate" data-k="from" value="${E(f.from)}" aria-label="Период с"></label><label class="dt"><span>по</span><input class="inp sm" type="date" data-in="cwDate" data-k="to" value="${E(f.to)}" aria-label="Период по"></label>` : ""}
        <div class="seg light sm" data-hl="cw-wh">${whs.map(([k, t]) => `<button type="button" class="${f.wh === k ? "on" : ""}" data-act="cwWh" data-k="${k}" data-cww="${k}">${E(t)}</button>`).join("")}</div></div>
      <div class="kpis"><div class="kpi hero"><span>Упаковок ${E(d.r.label)}</span><strong id="cwN">${d.n}</strong><small>${d.list.length} ${u.plural(d.list.length, "груз", "груза", "грузов")} · ${f.wh === "all" ? "все склады" : E(st.wh(f.wh).ru)}</small></div>
        <div class="kpi"><span>Расходы на упаковку, ¥</span><strong id="cwCny">${cnyF(d.cny)}</strong><small>по нашим ценам склада</small></div>
        <div class="kpi"><span>Расходы на упаковку, $</span><strong id="cwUsd">${u.usd(d.cny / d.rate)}</strong><small>курс ${u.num(d.rate, 2)} ¥ за 1 $ из настроек</small></div>
        <div class="kpi"><span>Клиентам за упаковку</span><strong>${u.usd(d.list.reduce((a, c) => a + st.packCost(c.packs), 0))}</strong><small>по ценам для клиента из настроек</small></div></div>
      <div class="tbx"><table class="tbl cw-t" data-hl="cw-t"><thead><tr><th>Вид упаковки</th><th class="r">Количество</th><th class="r">Наша цена за ед.</th><th class="r">Сумма, ¥</th><th class="r">Сумма, $</th><th></th></tr></thead><tbody>${rowsH}
        <tr class="tot"><td>Итого</td><td class="r">${d.n}</td><td></td><td class="r" id="cwTotC">${cnyF(d.cny)}</td><td class="r" id="cwTotU">${u.usd(d.cny / d.rate)}</td><td></td></tr></tbody></table></div>
      <div class="dir-f cw-s"><span class="muted s12">${f.wh === "all" ? "Общая цена для всех складов: по умолчанию из «Настройки → Упаковка». Выберите склад, чтобы задать его цену." : "Цена склада " + E(st.wh(f.wh).ru) + ": своя, отдельно от общей."} Изменение пересчитает наши расходы на упаковку в «Расходах и прибыли» и попадёт в историю.</span><button class="btn pri" type="button" data-act="cwSave" id="btnCwSave">${I("check")}Сохранить цены</button></div>
      ${det}
    </div>`;
  }
  // пересчёт сумм при наборе цены, без перерисовки поля
  function cwSync() {
    const d = chwData(); d.rows.forEach((x) => { const a = document.querySelector(`[data-cwc="${x.k}"]`), b = document.querySelector(`[data-cwu="${x.k}"]`); if (a) a.textContent = cnyF(x.cny); if (b) b.textContent = u.usd(x.usd); });
    [["cwTotC", cnyF(d.cny)], ["cwTotU", u.usd(d.cny / d.rate)], ["cwCny", cnyF(d.cny)], ["cwUsd", u.usd(d.cny / d.rate)]].forEach(([id, t]) => { const o = $(id); if (o) o.textContent = t; });
  }
  Object.assign(App.acts, {
    cwPer: (d) => { const f = cwf(); f.per = d.k; if (d.k === "range" && !f.from) { f.from = K.dISO(Date.now() - 60 * u.DAY); f.to = K.dISO(Date.now()); } App.refresh(true); },
    cwWh: (d) => { const f = cwf(); f.wh = d.k; f.p = null; App.refresh(true); },
    cwKind: (d, el, e) => { if (e && e.target && e.target.closest("input")) return; const f = cwf(); f.k = f.k === d.k ? null : d.k; App.refresh(true); },
    cwSave: () => { const f = cwf(); const n = st.chwPriceSave(f.wh, Object.assign({}, ...st.PACK.map((k) => ({ [k]: u.parse(chwPrices()[k]) }))), actor()); f.p = null; App.refresh(true); App.toast(n ? "Цены упаковки сохранены: расходы в «Расходах и прибыли» пересчитаны" : "Цены не изменились", n ? "check" : "info"); },
    cwExport: () => { const f = cwf(), d = chwData(), p = chwPrices(); K.csvDl("sklady_kitay_" + K.today() + ".csv", [["Склады в Китае, расходы на упаковку", d.r.label, f.wh === "all" ? "все склады" : st.wh(f.wh).ru], [], ["Вид упаковки", "Количество", "Цена за ед., ¥", "Сумма, ¥", "Сумма, $"]]
      .concat(d.rows.map((x) => [st.PACK_RU[x.k], x.n, f.wh === "all" ? "по складам" : u.parse(p[x.k]), Math.round(x.cny), Math.round(x.usd)]), [["Итого", d.n, "", Math.round(d.cny), Math.round(d.cny / d.rate)], [], ["Трек", "Клиент", "Наименование", "Склад", "Вид упаковки", "Количество", "Сумма, ¥", "Упакован"]],
        d.rows.reduce((a, x) => a.concat(x.cs.map((c) => [c.id, c.clientId, c.name || "", st.wh(c.wh).ru, st.PACK_RU[x.k], c.packs[x.k], Math.round(c.packs[x.k] * (f.wh === "all" ? st.packCnyOf(c.wh, x.k) : u.parse(p[x.k]))), u.dFull(c.at)])), [])), "Расходы складов на упаковку скачаны, открываются в Excel"); },
  });
  Object.assign(App.ins, {
    cwP: (v, el) => { const f = cwf(); f.p = Object.assign({}, chwPrices(), { [el.dataset.k]: v }); cwSync(); },
    cwDate: (v, el) => { cwf()[el.dataset.k] = v; App.refresh(true); },
  });
  Object.assign(App.D.screens, { chwh });
  Object.assign(App.D.screens, { news });
  Object.assign(App.D.modals, { nwd: () => nwModal(), nwv: () => nwView() });
  Object.assign(App.D, { tripHtml });
})(window.App);
