/* Экраны компьютера, вторая часть: отчёты и деньги (оплаты и долги, расходы и прибыль, тарифы, взаиморасчёты со складом в Москве). */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, I = u.icon, E = u.esc, $ = (id) => document.getElementById(id);
  const K = App.DK, cname = K.cname, xBtn = K.xBtn, today = K.today, csvDl = K.csvDl, actor = K.actor;

  // ---------- отчёты (версия 3.3): период «Сегодня / Месяц / Период», объём и вес везде, график с переключателем «м³ / кг», таблица по маршрутам ----------
  const rf = () => App.tmp.rf || (App.tmp.rf = { per: "month", from: "", to: "", unit: "m3", cunit: "m3" });
  // границы периода: сегодня с полуночи, месяц (30 дней) или свои даты «с» и «по» включительно
  function perRange(f) {
    const now = Date.now(), d0 = new Date(now); d0.setHours(0, 0, 0, 0);
    if (f.per === "all") return { from: 0, to: now + u.DAY, label: "за всё время", short: "за всё время" };
    if (f.per === "today") return { from: d0.getTime(), to: now, label: "за сегодня", short: "сегодня" };
    if (f.per === "range") {
      const a = K.fromISO(f.from), b = K.fromISO(f.to), from = a ? a - 12 * 3600e3 : now - 30 * u.DAY, to = b ? b + 12 * 3600e3 - 1 : now;
      return { from, to: Math.max(from + 1, to), label: `с ${u.dShort(from + 12 * 3600e3)} по ${u.dShort(Math.min(to, now))}`, short: "за период" };
    }
    return { from: now - 30 * u.DAY, to: now, label: "за месяц", short: "за месяц" };
  }
  const repRange = () => perRange(rf());
  // общий фильтр периода для денежных разделов: кнопки и даты «с» и «по» (как в «Финансах» склада в Москве)
  const perBar = (f, act, inp, opts, hl) => `<div class="seg light sm"${hl ? ` data-hl="${hl}"` : ""}>${opts.map(([k, t]) => `<button type="button" class="${String(f.per) === String(k) ? "on" : ""}" data-act="${act}" data-k="${k}" data-per="${act}:${k}">${t}</button>`).join("")}</div>
    ${f.per === "range" ? `<label class="dt"><span>с</span><input class="inp sm" type="date" data-in="${inp}" data-k="from" value="${u.esc(f.from || "")}" aria-label="Период с"></label><label class="dt"><span>по</span><input class="inp sm" type="date" data-in="${inp}" data-k="to" value="${u.esc(f.to || "")}" aria-label="Период по"></label>` : ""}`;
  const rangeInit = (f) => { if (!f.from) { f.from = K.dISO(Date.now() - 60 * u.DAY); f.to = K.dISO(Date.now()); } };
  const inR = (t, r) => t >= r.from && t <= r.to;
  // столбики: сегодня по 3 часа, до 31 дня по дням, дольше по неделям
  function buckets(r) {
    const f = rf(), out = [], span = (r.to - r.from) / u.DAY;
    if (f.per === "today") { for (let h = 0; h < 24; h += 3) { const a = r.from + h * 3600e3; out.push({ from: a, to: a + 3 * 3600e3 - 1, label: u.pad(h) + ":00", cur: Date.now() >= a && Date.now() < a + 3 * 3600e3 }); } }
    else if (span <= 31.5) { const d0 = new Date(r.from); d0.setHours(0, 0, 0, 0); for (let a = d0.getTime(); a <= r.to; a += u.DAY) out.push({ from: a, to: a + u.DAY - 1, label: u.dShort(a), cur: u.dayDiff(a) === 0 }); }
    else { for (let a = r.from; a <= r.to; a += 7 * u.DAY) out.push({ from: a, to: a + 7 * u.DAY - 1, label: u.dShort(a), cur: Date.now() >= a && Date.now() < a + 7 * u.DAY }); }
    return { list: out, kind: f.per === "today" ? "по 3 часа" : span <= 31.5 ? "по дням" : "по неделям" };
  }
  function repData() {
    const r = repRange(), cs = st.S.cargos.filter((c) => inR(c.at, r)), b = buckets(r);
    const bars = b.list.map((x) => { const l = cs.filter((c) => c.at >= x.from && c.at <= x.to); return Object.assign(x, { v: l.reduce((a, c) => a + c.volume, 0), w: l.reduce((a, c) => a + c.weight, 0), n: l.length }); });
    return { r, cs, bars, kind: b.kind, vol: cs.reduce((a, c) => a + c.volume, 0), w: cs.reduce((a, c) => a + c.weight, 0) };
  }
  // кратко для подписи на столбике
  const shortN = (v, unit) => (unit === "kg" ? (v >= 1000 ? u.num(v / 1000, 1) + "т" : String(Math.round(v))) : u.num(v, 1));
  function reports() {
    const S = st.S, f = rf(), D = repData(), unit = f.unit === "kg" ? "kg" : "m3", cu = f.cunit === "kg" ? "kg" : "m3", r = D.r;
    const val = (x) => (unit === "kg" ? x.w : x.v), max = Math.max(...D.bars.map(val), unit === "kg" ? 1 : 0.1), many = D.bars.length > 12;
    const byClient = S.clients.map((c) => { const l = D.cs.filter((x) => x.clientId === c.id); return { c, v: l.reduce((a, x) => a + x.volume, 0), w: l.reduce((a, x) => a + x.weight, 0) }; }).filter((x) => x.v || x.w).sort((a, b) => (cu === "kg" ? b.w - a.w : b.v - a.v));
    const cmax = Math.max(1e-9, ...byClient.map((x) => (cu === "kg" ? x.w : x.v)));
    const sent = S.ships.filter((s) => inR(s.sentAt, r)), stay = sent.map((s) => { const c = st.cargo(s.items[0].cargoId); return c ? (s.sentAt - c.at) / u.DAY : 0; }).filter((x) => x > 0.01);
    const avg = stay.length ? stay.reduce((a, x) => a + x, 0) / stay.length : 0;
    const recs = S.receipts.filter((x) => inR(x.at, r)), byWh = st.WH.map((w) => ({ w, n: recs.filter((x) => x.wh === w.id).length }));
    // по маршрутам: упакованные за период, отправленные по маршруту или ещё не отправленные
    const seeR = K.seeRoute(), rows = {};
    D.cs.forEach((c) => { const s = st.ship(c.id), k = s ? (seeR ? s.route : K.TR(s.transport).t) : "_wait"; const x = rows[k] || (rows[k] = { n: 0, v: 0, w: 0 }); x.n++; x.v += c.volume; x.w += c.weight; });
    const keys = Object.keys(rows).sort((a, b) => (a === "_wait") - (b === "_wait") || rows[b].v - rows[a].v);
    const segU = (act, cur) => `<div class="seg light sm">${[["m3", "м³"], ["kg", "кг"]].map(([k, t]) => `<button type="button" class="${cur === k ? "on" : ""}" data-act="${act}" data-k="${k}" data-ru="${act}:${k}">${t}</button>`).join("")}</div>`;
    return `<div class="pane">
      <div class="ph"><h1>Отчёты</h1><span class="grow"></span><button class="btn" type="button" data-act="exportRep">${I("download")}Выгрузить в Excel</button></div>
      <div class="fbar rep-f" data-hl="rep-per"><div class="seg light sm">${[["today", "Сегодня"], ["month", "Месяц"], ["range", "Период"]].map(([k, t]) => `<button type="button" class="${f.per === k ? "on" : ""}" data-act="rfPer" data-k="${k}" data-rp="${k}">${t}</button>`).join("")}</div>
        ${f.per === "range" ? `<label class="dt"><span>с</span><input class="inp sm" type="date" data-in="rfDate" data-k="from" value="${E(f.from)}" aria-label="Отчёт с"></label><label class="dt"><span>по</span><input class="inp sm" type="date" data-in="rfDate" data-k="to" value="${E(f.to)}" aria-label="Отчёт по"></label>` : ""}
        <span class="grow"></span><span class="muted s13" id="repLbl">${E(r.label)}: ${D.cs.length} ${u.plural(D.cs.length, "груз", "груза", "грузов")}</span></div>
      <div class="kpis rep-kp">
        <div class="kpi hero" data-hl="rep-packed"><span>Упаковано ${E(r.label)}</span><strong>${u.vol(D.vol)}</strong><b class="kpi-2">${u.kg(D.w)}</b><small>${D.cs.length} ${u.plural(D.cs.length, "груз", "груза", "грузов")}</small></div>
        <div class="kpi"><span>От упаковки до отправки</span><strong>${u.num(avg, 1)} дн.</strong><small>в среднем по ${sent.length} ${u.plural(sent.length, "отправке", "отправкам", "отправкам")} ${E(r.short)}</small></div>
        <div class="kpi"><span>Отправлено ${E(r.label)}</span><strong>${sent.length}</strong><small>${u.vol(sent.reduce((a, s) => a + st.totals(s).volume, 0))} · ${u.kg(sent.reduce((a, s) => a + st.totals(s).weight, 0))}</small></div>
        <div class="kpi"><span>Принято на складах</span><strong>${recs.length}</strong><small class="ell1">${byWh.map((x) => x.w.ru + " " + x.n).join(" · ")}</small></div>
      </div>
      <div class="grid2 rep-g">
        <div class="rep-l">
          <div class="box" data-hl="rep-chart"><div class="row rep-h"><h3 class="grow">${I("chart")}${unit === "kg" ? "Вес упакованных грузов, кг" : "Объём упакованных грузов, м³"}<small class="muted"> ${E(D.kind)}</small></h3>${segU("rfUnit", unit)}</div>
            <div class="bars${many ? " many" : ""}" data-bars="${D.bars.length}">${D.bars.map((x, i) => `<div class="bcol" title="${E(x.label)}: ${E(u.vol(x.v))}, ${E(u.kg(x.w))}"><div class="b${x.cur ? " cur" : ""}${val(x) ? "" : " z"}" style="height:${val(x) ? Math.max(3, (val(x) / max) * 100) : 0}%">${many ? "" : `<span>${shortN(val(x), unit)}</span>`}</div><small>${many && i % Math.ceil(D.bars.length / 6) ? "" : E(x.label)}</small></div>`).join("")}</div></div>
          <div class="box mt" data-hl="rep-routes"><h3>${I("route")}${seeR ? "По маршрутам" : "По видам доставки"}</h3><div class="tbx flat"><table class="tbl bare"><thead><tr><th>${seeR ? "Маршрут" : "Доставка"}</th><th class="r">Грузов</th><th class="r">м³</th><th class="r">кг</th></tr></thead><tbody>
            ${keys.map((k) => `<tr data-rr="${E(k)}"><td><b>${k === "_wait" ? "ещё не отправлены" : E(k)}</b>${seeR && k !== "_wait" && st.agentOf(k) ? `<span class="muted s12"> ${E(st.agentOf(k).name)}</span>` : ""}</td><td class="r">${rows[k].n}</td><td class="r">${u.num(rows[k].v, 2)}</td><td class="r">${u.groups(Math.round(rows[k].w))}</td></tr>`).join("") || '<tr><td colspan="4" class="muted">За этот период грузов нет</td></tr>'}
            ${keys.length ? `<tr class="tot"><td>Итого</td><td class="r">${D.cs.length}</td><td class="r">${u.num(D.vol, 2)}</td><td class="r">${u.groups(Math.round(D.w))}</td></tr>` : ""}</tbody></table></div></div>
        </div>
        <div class="box" data-hl="rep-clients"><div class="row rep-h"><h3 class="grow">${I("users")}${cu === "kg" ? "Клиенты по весу" : "Клиенты по объёму"}</h3>${segU("rfCUnit", cu)}</div>
          ${byClient.map((x) => `<div class="hbar" data-rc="${E(x.c.id)}"><span class="ell1">${E(x.c.name)}</span><i><b style="width:${((cu === "kg" ? x.w : x.v) / cmax) * 100}%"></b></i><span class="muted nw">${cu === "kg" ? u.kg(x.w) : u.vol(x.v)}</span></div>`).join("") || '<p class="muted p0">За этот период грузов нет</p>'}</div>
      </div>
    </div>`;
  }

  // ---------- оплаты и долги ----------
  const curAmt = (p) => (p.cur === "USD" ? u.usd(p.amount) : u.groups(Math.round(p.amount)) + u.NB + st.CUR[p.cur].s);
  // «Оплаты клиентов»: по трекам (поиск, фильтры, галочки, карточка груза) или по клиентам (счёт и сверка)
  function money() {
    const S = st.S, rows = S.clients.filter((c) => K.mine(c.id)).map((c) => ({ c, m: st.money(c.id) })).sort((a, b) => b.m.debt - a.m.debt);
    const T = st.money(), pays = S.payments.slice().sort((a, b) => b.at - a.at), view = App.tmp.pview === "clients" ? "clients" : "tracks";
    const over = S.ships.filter((x) => K.vis(x) && st.overC(x)), overSum = over.reduce((a, x) => a + st.debtOf(x), 0), of = (App.tmp.pf || {}).over;
    return `<div class="pane">
      <div class="ph"><div><h1>Оплаты клиентов</h1><div class="sub">Клиент платит в любой валюте, долг ведётся в долларах по курсу на день оплаты. Нажмите на трек: откроется карточка груза со всеми суммами.</div></div><span class="grow"></span>
        <div class="seg light sm" data-hl="pview">${[["tracks", "По трекам"], ["clients", "По клиентам"]].map(([k, t]) => `<button type="button" class="${view === k ? "on" : ""}" data-act="pview" data-k="${k}" data-pv="${k}">${t}</button>`).join("")}</div>
        <button class="btn" type="button" data-act="exportMoney">${I("download")}<span class="hide-n">Excel</span></button></div>
      <div class="kpis">
        <div class="kpi"><span>Начислено</span><strong>${u.usd(T.charged)}</strong><small>по ${S.ships.length} отправкам</small></div>
        <div class="kpi hero"><span>Оплачено</span><strong>${u.usd(T.paid)}</strong><small>${S.payments.length} ${u.plural(S.payments.length, "оплата", "оплаты", "оплат")}</small></div>
        <div class="kpi bad"><span>Долг клиентов</span><strong>${u.usd(T.debt)}</strong><small>${rows.filter((r) => r.m.debt > 0.5).length} ${u.plural(rows.filter((r) => r.m.debt > 0.5).length, "должник", "должника", "должников")}</small></div>
        <button class="kpi bad kpib${of ? " on" : ""}" type="button" data-act="pOver" data-hl="p-over" id="kpiOver"><span>Долг дольше ${st.OVER_C} дней</span><strong>${u.usd(overSum)}</strong><small>${over.length} ${u.plural(over.length, "трек", "трека", "треков")} · ${of ? "показаны только они" : "нажмите, чтобы показать"}</small></button>
      </div>
      ${view === "tracks" && App.D.payTracks ? App.D.payTracks() : clientsTable(rows, T)}
      <h3 class="h3 mt2">Последние оплаты</h3>
      <div class="tbx"><table class="tbl" data-hl="pay-hist"><thead><tr><th>Дата</th><th>Клиент</th><th>За какие грузы</th><th class="r">Сумма в валюте</th><th class="r">Курс за 1 $</th><th class="r">В долларах</th><th>Принял</th></tr></thead><tbody>
        ${pays.filter((p) => K.mine(p.clientId)).slice(0, 8).map((p) => `<tr data-payrow="${p.id}"><td>${u.dFull(p.at)}</td><td><b>${E(p.clientId)}</b> ${E(cname(p.clientId))}</td><td class="pay-ids">${payFor(p)}</td><td class="r"><b>${curAmt(p)}</b></td><td class="r muted">${p.cur === "USD" || p.cur === "USDT" ? "1" : u.num(p.rate, 2)}</td><td class="r">${u.usd(p.usd)}</td><td class="muted">${E(st.who(p.by))}${p.src === "issue" ? '<div class="s12">при выдаче</div>' : ""}</td></tr>`).join("")}
      </tbody></table></div>
    </div>`;
  }
  function clientsTable(rows, T) {
    return `<div class="tbx"><table class="tbl" data-hl="pay-clients"><thead><tr><th>Клиент</th><th>Тариф</th><th class="r">Начислено</th><th class="r">Оплачено</th><th class="r">Долг</th><th class="r"></th></tr></thead><tbody>
        ${rows.map((r) => `<tr data-fin="${E(r.c.id)}"><td><b>${E(r.c.id)}</b> ${E(r.c.name)}</td><td class="muted">${E(st.tariffLabel(r.c))}</td><td class="r">${u.usd(r.m.charged)}</td><td class="r">${u.usd(r.m.paid)}</td><td class="r ${r.m.debt > 0.5 ? "bad" : "ok"}">${r.m.debt > 0.5 ? u.usd(r.m.debt) : "нет"}</td><td class="r"><span class="btns">${r.m.debt > 0.5 ? `<button class="btn sm pri" type="button" data-act="payModal" data-c="${E(r.c.id)}" data-pay="${E(r.c.id)}">Принять оплату</button><button class="btn sm" type="button" data-act="invoiceModal" data-c="${E(r.c.id)}">Счёт</button>` : ""}<button class="btn sm" type="button" data-act="reconModal" data-c="${E(r.c.id)}">Сверка</button></span></td></tr>`).join("")}
      </tbody><tfoot><tr><td>Итого</td><td></td><td class="r">${u.usd(T.charged)}</td><td class="r">${u.usd(T.paid)}</td><td class="r">${u.usd(T.debt)}</td><td></td></tr></tfoot></table></div>`;
  }
  // за какие грузы пришла оплата: одна оплата может закрыть несколько треков
  const payFor = (p) => { const ids = p.shipIds || (p.shipId ? [p.shipId] : []); return ids.length ? ids.slice(0, 3).map((x) => `<span class="mono">${E(x)}</span>`).join(", ") + (ids.length > 3 ? ` и ещё ${ids.length - 3}` : "") : '<span class="muted">в счёт долга</span>'; };
  const unpaid = (cid) => st.S.ships.filter((s) => s.clientId === cid && st.debtOf(s) > 0.5).sort((a, b) => a.sentAt - b.sentAt);
  const payDebt = (p) => p.ids.map(st.ship).filter(Boolean).reduce((a, s) => a + st.debtOf(s), 0);
  // сумма считается по отмеченным трекам в выбранной валюте, её можно исправить
  function payAuto(p) { const fixed = p.cur === "USD" || p.cur === "USDT", v = payDebt(p) * (p.cur === "USD" ? 1 : u.parse(p.rate)); p.amount = fixed ? String(Math.round(v * 100) / 100).replace(".", ",") : String(Math.round(v)); }
  function payModal(cid, pre) {
    const c = st.client(cid), d = st.money(cid).debt, list = unpaid(cid);
    if (!App.tmp.pay || App.tmp.pay.c !== cid) { App.tmp.pay = { c: cid, cur: "RUB", rate: String(st.CUR.RUB.rate).replace(".", ","), ids: pre && pre.length ? pre.filter((id) => list.some((s) => s.id === id)) : list.map((s) => s.id), amount: "" }; payAuto(App.tmp.pay); }
    // курс подставляется итоговый из «Настроек → Курсы валют» (ЦБ с надбавкой или ручной), USDT тоже по своему курсу
    const p = App.tmp.pay, fixed = p.cur === "USD";
    p.ids = p.ids.filter((id) => list.some((s) => s.id === id));
    K.show("pay", `<div class="mh"><div class="mi">${I("wallet")}</div><div><h2>Оплата от клиента</h2><div class="muted s13">${E(c.id)} ${E(c.name)} · долг ${u.usd(d)}</div></div>${xBtn}</div>
      <div class="fld" data-hl="pay-tracks"><span class="row"><span class="grow">Неоплаченные грузы: отметьте, за какие пришла оплата</span><button class="lnkb" type="button" data-act="payAll" id="btnPayAll">${p.ids.length === list.length ? "Снять все" : "Выбрать все"}</button></span>
        <div class="pay-l">${list.map((s) => { const on = p.ids.includes(s.id); return `<button type="button" class="prow${on ? " on" : ""}" data-act="paySel" data-id="${E(s.id)}" data-ps="${E(s.id)}"><span class="cb">${on ? I("check") : ""}</span><span class="ct"><b class="mono">${E(s.id)}</b><small>${E((st.cargo(s.id) || {}).name || "груз")} · отправлен ${u.dShort(s.sentAt)}${s.paidUsd > 0 ? " · уже оплачено " + u.usd(s.paidUsd) : ""}</small></span><b class="nw">${u.usd(st.debtOf(s))}</b></button>`; }).join("") || '<p class="muted s13 p0">Неоплаченных грузов нет.</p>'}</div></div>
      <div class="fld mt"><span>Валюта оплаты</span><div class="choice cols3" data-hl="pay-cur">${Object.keys(st.CUR).map((k) => `<button type="button" class="${k === p.cur ? "on" : ""}" data-act="payCur" data-k="${k}"><span>${st.CUR[k].t}<small>${st.CUR[k].s}</small></span></button>`).join("")}</div></div>
      <div class="row2 mt">
        <label class="fld"><span>Сумма, ${st.CUR[p.cur].s}</span><input class="inp" id="payAmt" data-in="payAmt" inputmode="decimal" value="${E(p.amount)}" data-enter="#btnPayGo"></label>
        <label class="fld"><span>Курс, ${st.CUR[p.cur].s} за 1 $</span><input class="inp" id="payRate" data-in="payRate" inputmode="decimal" value="${fixed ? "1" : E(p.rate)}" ${fixed ? "disabled" : ""}></label>
      </div>
      <div class="found mt" id="payUsd">${payUsdHtml()}</div>
      <div class="mf"><span class="muted s12 grow mf-l">${u.dLong(Date.now())} · принял ${E(st.who(actor()))}</span><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="payGo" id="btnPayGo">${I("check")}Сохранить оплату</button></div>`, "wide");
  }
  function payCalc() { const p = App.tmp.pay, rate = p.cur === "USD" ? 1 : u.parse(p.rate), amt = u.parse(p.amount); return { amt, rate, usd: rate > 0 ? Math.round((amt / rate) * 100) / 100 : 0 }; }
  function payUsdHtml() { const p = App.tmp.pay, x = payCalc(), sel = payDebt(p), d = st.money(p.c).debt, rest = Math.max(0, d - x.usd), n = p.ids.length; return `${I("dollar")}<span>Зачтётся в долларах: <b>${u.usd(x.usd)}</b><small>${n ? (x.usd >= sel - 0.5 ? `закроет ${n > 1 ? "отмеченные грузы: " + n : "отмеченный груз"}` : "по отмеченным грузам нужно " + u.usd(sel)) + ", " : ""}${rest > 0.5 ? "останется долг " + u.usd(rest) : "долг клиента будет закрыт полностью"}</small></span>`; }
  function reconData(cid) {
    const ops = st.S.ships.filter((s) => s.clientId === cid).map((s) => ({ at: s.sentAt, t: "Отправка " + s.id + ", " + u.places(st.totals(s).places), ch: s.cost, pay: 0 }))
      .concat(st.S.payments.filter((p) => p.clientId === cid).map((p) => ({ at: p.at, t: "Оплата " + curAmt(p) + (p.cur === "USD" ? "" : " по курсу " + u.num(p.rate, 2)), ch: 0, pay: p.usd }))).sort((a, b) => a.at - b.at);
    let bal = 0; ops.forEach((o) => { bal += o.ch - o.pay; o.bal = bal; });
    return ops;
  }
  function reconModal(cid) {
    const c = st.client(cid), ops = reconData(cid), T = ops.reduce((a, o) => ({ ch: a.ch + o.ch, pay: a.pay + o.pay }), { ch: 0, pay: 0 });
    App.modal(`<div class="mh"><div class="mi">${I("scale")}</div><div><h2>Сверка с клиентом</h2><div class="muted s13">${E(c.id)} ${E(c.name)} · ${ops.length ? u.dFull(ops[0].at) : ""} – ${u.dFull(Date.now())}</div></div>${xBtn}</div>
      <div class="tscroll"><table class="tbl bare recon"><thead><tr><th>Дата</th><th>Операция</th><th class="r">Начислено</th><th class="r">Оплачено</th><th class="r">Долг</th></tr></thead><tbody>
        ${ops.map((o) => `<tr><td>${u.dFull(o.at)}</td><td>${E(o.t)}</td><td class="r">${o.ch ? u.usd(o.ch) : ""}</td><td class="r ok">${o.pay ? u.usd(o.pay) : ""}</td><td class="r">${u.usd(Math.max(0, o.bal))}</td></tr>`).join("")}
      </tbody><tfoot><tr><td colspan="2">Итого на ${u.dFull(Date.now())}</td><td class="r">${u.usd(T.ch)}</td><td class="r">${u.usd(T.pay)}</td><td class="r">${u.usd(Math.max(0, T.ch - T.pay))}</td></tr></tfoot></table></div>
      <div class="mf"><button class="btn" type="button" data-act="toast" data-t="Сверка отправлена клиенту в приложение и в Telegram" data-i="send">${I("send")}Отправить клиенту</button><button class="btn pri" type="button" data-act="reconDl" data-c="${cid}">${I("download")}Скачать</button></div>`, true);
  }
  function invoiceModal(cid) {
    const c = st.client(cid), list = st.S.ships.filter((s) => s.clientId === cid && !st.isPaid(s)).sort((a, b) => a.sentAt - b.sentAt), sum = list.reduce((a, s) => a + s.cost - s.paidUsd, 0);
    const no = c.id.replace(/\D/g, "") + "-" + u.pad(new Date().getDate()) + u.pad(new Date().getMonth() + 1);
    App.modal(`<div class="mh"><div class="mi">${I("file")}</div><div><h2>Счёт на оплату</h2><div class="muted s13">№ ${no} от ${u.dFull(Date.now())}</div></div>${xBtn}</div>
      <div class="inv"><div class="inv-h"><div><small>Поставщик услуг</small><b>Центр логистики</b><span>здесь будут реквизиты вашей компании</span></div><div><small>Плательщик</small><b>${E(c.name)}</b><span>код клиента ${E(c.id)} · ${E(c.city)}</span></div></div>
        <table class="tbl bare"><thead><tr><th>Услуга</th><th class="r">Мест</th><th class="r">Вес</th><th class="r">Сумма</th></tr></thead><tbody>
          ${list.map((s) => { const t = st.totals(s); return `<tr><td>Доставка из Китая, отправка ${E(s.id)} от ${u.dShort(s.sentAt)}</td><td class="r">${t.places}</td><td class="r">${u.kg(t.weight)}</td><td class="r">${u.usd(s.cost - s.paidUsd)}</td></tr>`; }).join("")}
        </tbody><tfoot><tr><td colspan="3">К оплате</td><td class="r">${u.usd(sum)}</td></tr></tfoot></table>
        <p class="muted s12 p0">Оплатить можно в рублях, юанях, сомах, тенге, USDT или долларах по курсу на день оплаты.</p></div>
      <div class="mf"><button class="btn" type="button" data-act="toast" data-t="В рабочей версии счёт скачивается в PDF" data-i="download">${I("download")}Скачать PDF</button><button class="btn pri" type="button" data-act="invoiceSend" data-c="${cid}" data-sum="${Math.round(sum)}" data-no="${no}">${I("send")}Отправить клиенту</button></div>`, true);
  }

  // ---------- расходы и прибыль ----------
  // период «Расходов и прибыли»: 30 или 90 дней или свои даты «с» и «по»
  function profitList() {
    const per = App.tmp.period, f = App.tmp.prf || (App.tmp.prf = { from: "", to: "" });
    const r = per === "range" ? perRange({ per: "range", from: f.from, to: f.to }) : { from: Date.now() - (+per || 90) * u.DAY, to: Date.now() + u.DAY, label: "за " + (+per || 90) + " дней" };
    return { r, list: st.S.ships.filter((s) => s.sentAt >= r.from && s.sentAt <= r.to).sort((a, b) => b.sentAt - a.sentAt) };
  }
  function profit() {
    const pl = profitList(), list = pl.list, per = App.tmp.period;
    const T = list.reduce((a, s) => ({ rev: a.rev + s.cost, exp: a.exp + st.expSum(s) }), { rev: 0, exp: 0 }), pr = T.rev - T.exp;
    const byC = {}; list.forEach((s) => { byC[s.clientId] = (byC[s.clientId] || 0) + s.cost - st.expSum(s); });
    const top = Object.keys(byC).map((k) => ({ k, v: byC[k] })).sort((a, b) => b.v - a.v), tmax = Math.max(1, ...top.map((x) => x.v));
    const r = K.seeRoute();
    return `<div class="pane">
      <div class="ph"><div><h1>Расходы и прибыль</h1><div class="sub">По каждой отправке: сколько взяли с клиента, сколько потратили на упаковку и перевозчика, что осталось. Нажмите на трек: откроется карточка груза, суммы правятся там.</div></div><span class="grow"></span><button class="btn" type="button" data-act="exportProfit">${I("download")}Выгрузить в Excel</button></div>
      <div class="fbar pf-per" data-hl="profit-per">${perBar({ per, from: (App.tmp.prf || {}).from, to: (App.tmp.prf || {}).to }, "period", "prfDate", [[30, "30 дней"], [90, "90 дней"], ["range", "Период"]])}<span class="grow"></span><span class="muted s13" id="profitLbl">${E(pl.r.label)}: ${list.length} ${u.plural(list.length, "отправка", "отправки", "отправок")}</span></div>
      <div class="kpis">
        <div class="kpi"><span>Выручка</span><strong>${u.usd(T.rev)}</strong><small>${list.length} ${u.plural(list.length, "отправка", "отправки", "отправок")}</small></div>
        <div class="kpi"><span>Себестоимость</span><strong>${u.usd(T.exp)}</strong><small>упаковка, перевозчик, прочее</small></div>
        <div class="kpi hero"><span>Прибыль</span><strong>${u.usd(pr)}</strong><small>${E(pl.r.label)}</small></div>
        <div class="kpi"><span>Маржа</span><strong>${T.rev ? Math.round((pr / T.rev) * 100) : 0}%</strong><small>прибыль к выручке</small></div>
      </div>
      <div class="tbx"><table class="tbl" data-hl="profit-t"><thead><tr><th>Отправка</th>${r ? "<th>Маршрут</th>" : ""}<th class="r">Стоимость груза</th><th class="r">Страховка</th><th class="r">Выручка</th><th class="r">Упаковка</th><th class="r">Перевозчик</th><th class="r">Прочее</th><th class="r">Прибыль</th><th></th></tr></thead><tbody>
          ${list.map((s) => { const p = s.cost - st.expSum(s); return `<tr class="click" data-act="openItem" data-t="ship" data-id="${E(s.id)}" data-exp="${E(s.id)}"><td><b class="mono">${E(s.id)}</b><div class="muted s12">${E(s.clientId)} · ${u.dShort(s.sentAt)}</div></td>${r ? `<td><b>${E(s.route)}</b><div class="muted s12">${E(K.TR(s.transport).t)}</div></td>` : ""}<td class="r">${s.value ? u.usd(s.value) : '<span class="muted">не указана</span>'}</td><td class="r">${s.insUsd ? u.usd(s.insUsd) : '<span class="muted">нет</span>'}</td><td class="r"><b>${u.usd(s.cost)}</b></td><td class="r muted">${u.usd(s.exp.pack)}</td><td class="r muted">${u.usd(s.exp.carrier)}</td><td class="r muted">${u.usd(s.exp.other + (s.exp.dlv || 0))}${s.exp.dlv ? `<div class="s12" data-pdlv="${E(s.id)}">доставка ${u.usd(s.exp.dlv)}</div>` : ""}</td><td class="r ${p >= 0 ? "ok" : "bad"}"><b>${u.usd(p)}</b></td><td class="r muted">${I("chevron")}</td></tr>`; }).join("") || `<tr><td colspan="${r ? 10 : 9}" class="muted">За период отправок нет</td></tr>`}
        </tbody></table></div>
      <div class="grid2 mt2">
        <div class="box"><h3>${I("users")}Прибыль по клиентам</h3>${top.map((x) => `<div class="hbar"><span class="ell1">${E(cname(x.k))}</span><i><b style="width:${Math.max(0, (x.v / tmax) * 100)}%"></b></i><span class="muted">${u.usd(x.v)}</span></div>`).join("") || '<p class="muted p0">Нет данных</p>'}</div>
        <div class="box"><h3>${I("route")}По маршрутам</h3>${st.ROUTES.filter(() => r).map((k) => { const l = list.filter((s) => s.route === k), v = l.reduce((a, s) => a + s.cost - st.expSum(s), 0); return `<div class="pline mini"><span>${E(k)} · ${E((st.agentOf(k) || {}).name || "")}<small>${l.length} ${u.plural(l.length, "отправка", "отправки", "отправок")}, выручка ${u.usd(l.reduce((a, s) => a + s.cost, 0))}</small></span><b class="${v >= 0 ? "ok" : "bad"}">${u.usd(v)}</b></div>`; }).join("") || '<p class="muted p0">Маршрут вам не показывается.</p>'}</div>
      </div>
    </div>`;
  }
  function expModal(id) {
    const s = st.ship(id); if (!s) return;
    App.tmp.exp = { id, pack: String(s.exp.pack), carrier: String(s.exp.carrier), other: String(s.exp.other) };
    App.modal(`<div class="mh"><div class="mi">${I("scale")}</div><div><h2>Расходы по отправке</h2><div class="muted s13">${E(s.id)} · ${E(s.clientId)} ${E(cname(s.clientId))} · выручка ${u.usd(s.cost)}</div></div>${xBtn}</div>
      <div class="row3"><label class="fld"><span>Упаковка, $</span><input class="inp" data-in="expIn" data-k="pack" inputmode="numeric" value="${s.exp.pack}"></label><label class="fld"><span>Перевозчик, $</span><input class="inp" data-in="expIn" data-k="carrier" inputmode="numeric" value="${s.exp.carrier}"></label><label class="fld"><span>Прочее, $</span><input class="inp" data-in="expIn" data-k="other" inputmode="numeric" value="${s.exp.other}"></label></div>
      <div class="found mt" id="expSum">${expHtml()}</div>
      <div class="note mt">Стоимость машины делится между клиентами по весу или объёму их грузов. Здесь показана доля этой отправки.</div>
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="expGo" id="btnExpGo">${I("check")}Сохранить</button></div>`);
  }
  function expHtml() { const e = App.tmp.exp, s = st.ship(e.id), sum = u.parse(e.pack) + u.parse(e.carrier) + u.parse(e.other), p = s.cost - sum; return `${I("dollar")}<span>Себестоимость ${u.usd(sum)}, прибыль <b>${u.usd(p)}</b><small>маржа ${s.cost ? Math.round((p / s.cost) * 100) : 0}%</small></span>`; }

  // ---------- тарифы ----------
  const EX = { w: 240, v: 1.6 };
  function tariffs() {
    return `<div class="pane">
      <div class="ph"><div><h1>Тарифы клиентов</h1><div class="sub">У каждого клиента свой тариф: за килограмм, за кубометр, по плотности или индивидуальный. Стоимость груза считается сама.</div></div></div>
      <div class="grid2 wide-l">
        <table class="tbl"><thead><tr><th>Клиент</th><th>Тип тарифа</th><th>Ставка</th><th class="r">Пример: ${u.kg(EX.w)}, ${u.vol(EX.v)}</th><th></th></tr></thead><tbody>
          ${st.S.clients.map((c) => `<tr class="click" data-act="tariffModal" data-c="${E(c.id)}" data-tar="${E(c.id)}"><td><b>${E(c.id)}</b> ${E(c.name)}</td><td><span class="st" data-st="${{ kg: "in", m3: "arrived", density: "way", custom: "pack" }[c.tariff.type]}">${st.TARIFF_T[c.tariff.type]}</span></td><td>${c.tariff.type === "density" ? "по сетке плотности" : u.num(c.tariff.rate, 2) + " $ " + (c.tariff.type === "m3" ? "за м³" : "за кг")}</td><td class="r"><b>${u.usd(st.tariffCalc(c, EX.w, EX.v))}</b></td><td class="r muted">${I("chevron")}</td></tr>`).join("")}
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
    App.modal(`<div class="mh"><div class="mi">${I("dollar")}</div><div><h2>Тариф клиента</h2><div class="muted s13">${E(c.id)} ${E(c.name)}</div></div>${xBtn}</div>
      <div class="fld"><span>Как считаем</span><div class="choice cols2">${Object.keys(st.TARIFF_T).map((k) => `<button type="button" class="${k === t.type ? "on" : ""}" data-act="tarType" data-k="${k}"><span>${{ kg: "За килограмм", m3: "За кубометр", density: "По плотности", custom: "Индивидуальный" }[k]}<small>${{ kg: "плотные грузы", m3: "лёгкие и объёмные", density: "сетка, ставка выбирается сама", custom: "договорная ставка за кг" }[k]}</small></span></button>`).join("")}</div></div>
      ${t.type === "density" ? "" : `<label class="fld mt"><span>Ставка, $ ${t.type === "m3" ? "за м³" : "за кг"}</span><input class="inp" id="tarRate" data-in="tarRate" inputmode="decimal" value="${E(t.rate)}" data-enter="#btnTarGo"></label>`}
      <div class="found mt" id="tarEx">${tarHtml()}</div>
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="tarGo" id="btnTarGo">${I("check")}Сохранить тариф</button></div>`);
  }
  function tarHtml() { const t = App.tmp.tar, c = { tariff: { type: t.type, rate: u.parse(t.rate) } }; return `${I("dollar")}<span>Груз ${u.kg(EX.w)}, ${u.vol(EX.v)}: <b>${u.usd(st.tariffCalc(c, EX.w, EX.v))}</b><small>стоимость подставится в отправку сама</small></span>`; }

  // ---------- взаиморасчёты со складом в Москве: та же страница, что у склада на телефоне ----------
  const wf = (f) => ({ per: f.per, from: K.fromISO(f.from), to: K.fromISO(f.to) });
  const sgn = (n, cur) => (n < 0 ? "−" : n > 0 ? "+" : "") + st.wamt(Math.abs(n), cur);
  const two = (o) => `${st.wamt(o.RUB, "RUB")} · ${st.wamt(o.USD, "USD")}`;
  function mskfin() {
    const f = App.tmp.wf, list = st.wopList(wf(f)), T = st.wopTotals(list), B = st.wopBalance();
    const bal = (cur, t) => `<div class="kpi ${B[cur] < 0 ? "bad" : "good"}" data-bal="${cur}"><span>${t}</span><strong>${sgn(B[cur], cur)}</strong><small>${B[cur] < 0 ? "компания должна складу" : "деньги компании у склада"}</small></div>`;
    return `<div class="pane">
      <div class="ph"><div><h1>Склад в Москве</h1><div class="sub">Взаиморасчёты с московским складом в рублях и долларах. Плюс: оплаты клиентов при выдаче и пополнения от компании. Минус: плата за куб, маршрут с растаможкой, расходы при выдаче.</div></div><span class="grow"></span><button class="btn" type="button" data-act="wopOpen" data-k="exp" id="btnWopExp">${I("minus")}Добавить расход</button><button class="btn pri" type="button" data-act="wopOpen" data-k="topup" id="btnWopTop">${I("plus")}Пополнить баланс</button></div>
      <div class="kpis">${bal("RUB", "Баланс в рублях")}${bal("USD", "Баланс в долларах")}
        <div class="kpi"><span>Поступило за период</span><strong class="sm">${two(T.in)}</strong><small>оплаты клиентов и пополнения</small></div>
        <div class="kpi"><span>Списано за период</span><strong class="sm">${two(T.out)}</strong><small>за куб оплачено ${u.vol(T.vol)}</small></div></div>
      <div class="fbar wop-f"><div class="seg light sm" data-hl="wop-per">${[["today", "Сегодня"], ["month", "Месяц"], ["range", "Период"]].map(([k, t]) => `<button type="button" class="${f.per === k ? "on" : ""}" data-act="wfPer" data-k="${k}">${t}</button>`).join("")}</div>
        ${f.per === "range" ? `<label class="dt"><span>с</span><input class="inp sm" type="date" data-in="wfDate" data-k="from" value="${E(f.from)}" aria-label="Операции с"></label><label class="dt"><span>по</span><input class="inp sm" type="date" data-in="wfDate" data-k="to" value="${E(f.to)}" aria-label="Операции по"></label>` : ""}
        <span class="grow"></span><span class="muted s13">${list.length} ${u.plural(list.length, "операция", "операции", "операций")}</span><button class="btn sm" type="button" data-act="exportWops">${I("download")}Excel</button></div>
      <table class="tbl" data-hl="wop-t"><thead><tr><th>Дата</th><th>Операция</th><th>Подробности</th><th>Кто внёс</th><th class="r">Рубли</th><th class="r">Доллары</th></tr></thead><tbody>
        ${list.map((w) => { const x = st.wopText(w), a = `<b class="${w.amount < 0 ? "bad" : "ok"}">${sgn(w.amount, w.cur)}</b>`; return `<tr data-wop="${w.id}"><td class="nw">${u.dFull(w.at)} <span class="muted">${u.hm(w.at)}</span></td><td><b>${E(x.t)}</b></td><td class="muted">${E(K.rt(x.s))}</td><td class="muted">${E(st.who(w.by))}</td><td class="r">${w.cur === "RUB" ? a : ""}</td><td class="r">${w.cur === "USD" ? a : ""}</td></tr>`; }).join("") || '<tr><td colspan="6" class="muted">За этот период операций нет</td></tr>'}
      </tbody></table>
    </div>`;
  }
  // окно «Пополнить баланс» и «Добавить расход»: одна форма для администратора (окно) и для склада в Москве (шторка телефона)
  const WK = [["cube", "За куб", "объём × ставка"], ["route", "Маршрут с растаможкой", "сумма перевозчику"], ["other", "Другое", "прочий расход"]];
  const wopSum = (d) => (d.mode !== "topup" && d.kind === "cube" ? Math.round(u.parse(d.vol) * u.parse(d.rate) * 100) / 100 : u.parse(d.amount));
  const wopSumHtml = (d) => `${I("dollar")}<span>${d.mode === "topup" ? "Баланс вырастет на" : "Спишется с баланса"}: <b>${st.wamt(wopSum(d), d.cur)}</b><small>баланс сейчас ${sgn(st.wopBalance()[d.cur], d.cur)}</small></span>`;
  function wopHtml(d) {
    const top = d.mode === "topup", close = d.slot == null ? "closeDesk" : "closeSheet";
    return `<div class="mh"><div class="mi">${I(top ? "plus" : "minus")}</div><div><h2>${top ? "Пополнить баланс" : "Добавить расход"}</h2><div class="muted s13">Взаиморасчёты со складом в Москве</div></div><button class="x" type="button" data-act="${close}" aria-label="Закрыть">${I("x")}</button></div>
      ${top ? "" : `<div class="fld"><span>Вид расхода</span><div class="choice cols3" data-hl="wop-kind">${WK.map(([k, t, sub]) => `<button type="button" class="${d.kind === k ? "on" : ""}" data-act="wopKind" data-k="${k}"><span>${t}<small>${sub}</small></span></button>`).join("")}</div></div>`}
      ${!top && d.kind === "cube" ? `<div class="row2 mt"><label class="fld"><span>Объём, м³</span><input class="inp" data-in="wopIn" data-k="vol" inputmode="decimal" value="${E(d.vol)}" placeholder="0"></label><label class="fld"><span>Ставка за куб, ${st.WCUR[d.cur]}</span><input class="inp" data-in="wopIn" data-k="rate" inputmode="decimal" value="${E(d.rate)}" placeholder="0"></label></div><div class="req left">${d.volAuto ? "Объём подставлен из грузов, которые приехали сегодня: " + u.vol(d.volAuto) + ". Сумма считается сама." : "Сумма считается сама: объём × ставка."}</div>`
        : `<label class="fld${top ? "" : " mt"}"><span>Сумма, ${st.WCUR[d.cur]}</span><input class="inp" data-in="wopIn" data-k="amount" inputmode="decimal" value="${E(d.amount)}" placeholder="0" data-enter="#btnWopGo" data-hl="wop-amount"></label>`}
      <div class="fld mt"><span>Валюта</span><div class="choice cols2">${Object.keys(st.WCUR).map((k) => `<button type="button" class="${d.cur === k ? "on" : ""}" data-act="wopCur" data-k="${k}">${k === "RUB" ? "Рубли, ₽" : "Доллары, $"}</button>`).join("")}</div></div>
      ${top ? "" : `${K.seeRoute() ? `<div class="fld mt"><span>Маршрут</span><div class="choice cols4">${st.ROUTES.map((k) => `<button type="button" class="${d.route === k ? "on" : ""}" data-act="wopRoute" data-k="${k}">${k}</button>`).join("")}</div></div>` : ""}
      <label class="fld mt"><span>Агент</span><input class="inp" data-in="wopIn" data-k="agent" value="${E(d.agent)}" placeholder="Кому платим: имя или компания" autocomplete="off"></label>`}
      <label class="fld mt"><span>Примечание</span><input class="inp" data-in="wopIn" data-k="note" value="${E(d.note)}" placeholder="${top ? "Например: на выдачи этой недели" : "Необязательно"}" autocomplete="off"></label>
      <div class="found mt" id="wopSum">${wopSumHtml(d)}</div>
      ${d.slot == null ? `<div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="wopGo" id="btnWopGo">${I("check")}${top ? "Пополнить" : "Добавить расход"}</button></div>` : `<button class="btn pri lg block mt" type="button" data-act="wopGo" id="btnWopGo" data-f="wopGo">${I("check")}Добавить расход</button>`}`;
  }
  function wopDraw() { const d = App.tmp.wop; if (!d) return; if (d.slot == null) K.show("wop", wopHtml(d)); else if (App.sheetOpen(d.slot)) App.sheetSet(d.slot, wopHtml(d)); else App.sheet(d.slot, wopHtml(d)); }
  function wopOpen(mode, slot, by) {
    const v = Math.round(st.sumShips(st.arrivedToday()).volume * 100) / 100;
    App.tmp.wop = { mode: mode === "topup" ? "topup" : "exp", kind: "cube", vol: v ? String(v).replace(".", ",") : "", volAuto: v, rate: "1500", amount: "", route: "", agent: "", cur: "RUB", note: "", slot: slot == null ? null : slot, by: by || actor() };
    wopDraw();
  }

  // ---------- действия ----------
  Object.assign(App.acts, {
    period: (d) => { App.tmp.period = d.k === "range" ? "range" : +d.k; if (d.k === "range") rangeInit(App.tmp.prf || (App.tmp.prf = { from: "", to: "" })); App.refresh(true); },
    exportProfit: () => { const pl = profitList(); csvDl("raskhody_pribyl_" + today() + ".csv", [["Расходы и прибыль", pl.r.label], [], ["Отправка", "Клиент", "Отправлена"].concat(K.seeRoute() ? ["Маршрут"] : []).concat(["Выручка, $", "Упаковка, $", "Перевозчик, $", "Прочее, $", "Прибыль, $"])]
      .concat(pl.list.map((s) => [s.id, s.clientId, u.dFull(s.sentAt)].concat(K.seeRoute() ? [s.route] : []).concat([Math.round(s.cost), s.exp.pack, s.exp.carrier, s.exp.other + (s.exp.dlv || 0), Math.round(s.cost - st.expSum(s))])))); },
    payModal: (d) => { App.tmp.pay = null; payModal(d.c); },
    pview: (d) => { App.tmp.pview = d.k; App.tmp.psel2 = []; App.refresh(true); },
    payCur: (d) => { const p = App.tmp.pay; p.cur = d.k; p.rate = String(st.CUR[d.k].rate).replace(".", ","); payAuto(p); payModal(p.c); },
    paySel: (d) => { const p = App.tmp.pay, i = p.ids.indexOf(d.id); if (i >= 0) p.ids.splice(i, 1); else p.ids.push(d.id); payAuto(p); payModal(p.c); },
    payAll: () => { const p = App.tmp.pay, list = unpaid(p.c); p.ids = p.ids.length === list.length ? [] : list.map((s) => s.id); payAuto(p); payModal(p.c); },
    payGo: () => {
      const p = App.tmp.pay, x = payCalc();
      if (!(x.amt > 0) || !(x.rate > 0)) { App.toast("Укажите сумму и курс", "info"); return; }
      const pay = st.pay(p.c, { amount: x.amt, cur: p.cur, rate: x.rate, shipIds: p.ids.slice(), by: actor() }), n = pay.shipIds.length;
      App.tmp.pay = null; App.closeDesk(); App.toast(`Оплата ${curAmt(pay)} сохранена: ${u.usd(pay.usd)}${n ? ", за " + n + " " + u.plural(n, "груз", "груза", "грузов") : ""}. Клиент получил уведомление`, "wallet");
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
    // взаиморасчёты со складом в Москве
    wfPer: (d) => { App.tmp.wf.per = d.k; App.refresh(true); },
    wopOpen: (d) => wopOpen(d.k, null, actor()),
    wopKind: (d) => { const x = App.tmp.wop; if (x) { x.kind = d.k; wopDraw(); } },
    wopCur: (d) => { const x = App.tmp.wop; if (!x) return; if (x.cur !== d.k && x.kind === "cube") x.rate = d.k === "USD" ? "15" : "1500"; x.cur = d.k; wopDraw(); },
    wopRoute: (d) => { const x = App.tmp.wop; if (x) { x.route = x.route === d.k ? "" : d.k; wopDraw(); } },
    wopFill: () => { const x = App.tmp.wop; if (!x) return; if (x.mode === "topup") x.amount = x.amount || "200000"; else if (x.kind === "cube") { x.vol = x.vol || "8,4"; x.rate = x.rate || "1500"; x.route = x.route || "88G"; } else { x.amount = x.amount || "2000"; x.route = x.route || "88G"; x.agent = x.agent || "Нурлан, Алматы"; } wopDraw(); },
    wopGo: () => {
      const x = App.tmp.wop; if (!x) return;
      if (!(wopSum(x) > 0)) { App.toast(x.mode !== "topup" && x.kind === "cube" ? "Укажите объём и ставку" : "Укажите сумму", "info"); return; }
      const w = st.wopAdd({ kind: x.mode === "topup" ? "topup" : x.kind, cur: x.cur, amount: u.parse(x.amount), vol: u.parse(x.vol), rate: u.parse(x.rate), route: x.route, agent: x.agent, note: x.note, by: x.by });
      const slot = x.slot; App.tmp.wop = null; if (slot == null) App.closeDesk(); else App.closeSheet(slot);
      if (w) App.toast(`${st.WOPK[w.kind][1]}: ${sgn(w.amount, w.cur)}. Баланс ${sgn(st.wopBalance()[w.cur], w.cur)}`, "wallet");
      if (w && App.scenario) App.scenario.check("wop", w);
    },
    exportWops: () => csvDl("sklad_moskva_" + today() + ".csv", [["Дата", "Время", "Операция", "Подробности", "Кто внёс", "Сумма", "Валюта"]].concat(st.wopList(wf(App.tmp.wf)).map((w) => { const x = st.wopText(w); return [u.dFull(w.at), u.hm(w.at), x.t, x.s, st.who(w.by), w.amount, w.cur]; }))),
    exportRep: () => { const D = repData(); csvDl("otchet_" + today() + ".csv", [["Отчёт", D.r.label], [], [D.kind === "по 3 часа" ? "Время" : D.kind === "по дням" ? "День" : "Неделя с", "Упаковано, м³", "Упаковано, кг", "Грузов"]].concat(D.bars.map((w) => [w.label, u.num(w.v, 2), Math.round(w.w), w.n]), [["Итого", u.num(D.vol, 2), Math.round(D.w), D.cs.length]])); },
    rfPer: (d) => { const f = rf(); f.per = d.k; if (d.k === "range" && !f.from) { f.from = K.dISO(Date.now() - 60 * u.DAY); f.to = K.dISO(Date.now()); } App.refresh(true); },
    rfUnit: (d) => { rf().unit = d.k; App.refresh(true); },
    rfCUnit: (d) => { rf().cunit = d.k; App.refresh(true); },
    exportMoney: () => (App.tmp.pview !== "clients" && App.D.payTracksCsv ? App.D.payTracksCsv() : csvDl("oplaty_" + today() + ".csv", [["Код", "Клиент", "Начислено, $", "Оплачено, $", "Долг, $"]].concat(st.S.clients.filter((c) => K.mine(c.id)).map((c) => { const m = st.money(c.id); return [c.id, c.name, Math.round(m.charged), Math.round(m.paid), Math.round(m.debt)]; })))),
  });

  Object.assign(App.ins, {
    payAmt: (v) => { App.tmp.pay.amount = v; $("payUsd").innerHTML = payUsdHtml(); },
    payRate: (v) => { App.tmp.pay.rate = v; $("payUsd").innerHTML = payUsdHtml(); },
    expIn: (v, el) => { App.tmp.exp[el.dataset.k] = v; $("expSum").innerHTML = expHtml(); },
    tarRate: (v) => { App.tmp.tar.rate = v; $("tarEx").innerHTML = tarHtml(); },
    wfDate: (v, el) => { App.tmp.wf[el.dataset.k] = v; App.refresh(true); },
    rfDate: (v, el) => { rf()[el.dataset.k] = v; App.refresh(true); },
    prfDate: (v, el) => { (App.tmp.prf || (App.tmp.prf = { from: "", to: "" }))[el.dataset.k] = v; App.refresh(true); },
    wopIn: (v, el) => { const x = App.tmp.wop; if (!x) return; x[el.dataset.k] = v; const o = (x.slot == null ? document : App.slotEl(x.slot)).querySelector("#wopSum"); if (o) o.innerHTML = wopSumHtml(x); },
  });
  Object.assign(App.D, { perRange, perBar, rangeInit });
  Object.assign(App.D.screens, { reports, money, profit, tariffs, mskfin });
  Object.assign(App.D.modals, { pay: () => { if (App.tmp.pay) payModal(App.tmp.pay.c); }, wop: () => wopDraw() });
  Object.assign(App.D, { payModal, reconModal, invoiceModal, expModal, tariffModal, wopOpen, sgn });
})(window.App);
