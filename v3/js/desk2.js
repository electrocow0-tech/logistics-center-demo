/* Экраны компьютера, вторая часть: отчёты, этап 2 (деньги и учёт), этап 3 (чат с автопереводом). */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, I = u.icon, E = u.esc, L = App.i18n.of("ru"), $ = (id) => document.getElementById(id);
  const K = App.DK, stg = K.stg, optBtn = K.optBtn, cname = K.cname, xBtn = K.xBtn, today = K.today, csvDl = K.csvDl, actor = K.actor;
  // раздел «Деньги» в меню один, внутри три экрана
  const moneyTabs = (cur) => `<div class="seg light sm mtabs">${[["money", "Оплаты и долги"], ["profit", "Расходы и прибыль"], ["tariffs", "Тарифы клиентов"]].map(([k, t]) => `<button type="button" class="${cur === k ? "on" : ""}" data-act="d" data-s="${k}">${t}</button>`).join("")}</div>`;

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
    const stay = S.ships.map((s) => { const c = st.cargo(s.items[0].cargoId); return c ? (s.sentAt - c.at) / u.DAY : 0; }).filter((x) => x > 0.01);
    const avg = stay.length ? stay.reduce((a, x) => a + x, 0) / stay.length : 0;
    const byWh = st.WH.map((w) => ({ w, n: st.waiting(w.id).length + st.openTasks(w.id).length + st.ready(w.id).length }));
    return `<div class="pane">
      <div class="ph"><h1>Отчёты</h1><span class="grow"></span>${optBtn("analytics", "Расширенная аналитика")}<button class="btn" type="button" data-act="exportRep">${I("download")}Выгрузить в Excel</button></div>
      <div class="kpis">
        <div class="kpi hero"><span>Упаковано за 8 недель</span><strong>${u.vol(weeks.reduce((a, x) => a + x.v, 0))}</strong><small>${S.cargos.length} ${u.plural(S.cargos.length, "груз", "груза", "грузов")} из ${S.receipts.length} приходов</small></div>
        <div class="kpi"><span>От упаковки до отправки</span><strong>${u.num(avg, 1)} дн.</strong><small>в среднем по отправкам</small></div>
        <div class="kpi"><span>Отправок в пути</span><strong>${S.ships.filter((s) => s.status === "way").length}</strong><small>авто, ЖД и авиа</small></div>
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
    return `<div class="pane">${moneyTabs("money")}
      <div class="ph"><div><h1>Оплаты и долги${stg(2)}</h1><div class="sub">Клиент платит в любой валюте, долг ведётся в долларах по курсу на день оплаты.</div></div><span class="grow"></span><button class="btn" type="button" data-act="exportMoney">${I("download")}Выгрузить в Excel</button></div>
      <div class="kpis">
        <div class="kpi"><span>Начислено</span><strong>${u.usd(T.charged)}</strong><small>по ${S.ships.length} отправкам</small></div>
        <div class="kpi hero"><span>Оплачено</span><strong>${u.usd(T.paid)}</strong><small>${S.payments.length} ${u.plural(S.payments.length, "оплата", "оплаты", "оплат")}</small></div>
        <div class="kpi bad"><span>Долг клиентов</span><strong>${u.usd(T.debt)}</strong><small>${rows.filter((r) => r.m.debt > 0.5).length} ${u.plural(rows.filter((r) => r.m.debt > 0.5).length, "должник", "должника", "должников")}</small></div>
        <div class="kpi"><span>Оплаты за 30 дней</span><strong>${u.usd(p30.reduce((a, p) => a + p.usd, 0))}</strong><small>валюты: ${curs.map((k) => st.CUR[k].s).join(", ") || "нет"}</small></div>
      </div>
      <table class="tbl"><thead><tr><th>Клиент</th><th>Тариф</th><th class="r">Начислено</th><th class="r">Оплачено</th><th class="r">Долг</th><th class="r"></th></tr></thead><tbody>
        ${rows.map((r) => `<tr data-fin="${E(r.c.id)}"><td><b>${E(r.c.id)}</b> ${E(r.c.name)}</td><td class="muted">${E(st.tariffLabel(r.c))}</td><td class="r">${u.usd(r.m.charged)}</td><td class="r">${u.usd(r.m.paid)}</td><td class="r ${r.m.debt > 0.5 ? "bad" : "ok"}">${r.m.debt > 0.5 ? u.usd(r.m.debt) : "нет"}</td><td class="r"><span class="btns">${r.m.debt > 0.5 ? `<button class="btn sm pri" type="button" data-act="payModal" data-c="${E(r.c.id)}" data-pay="${E(r.c.id)}">Принять оплату</button><button class="btn sm" type="button" data-act="invoiceModal" data-c="${E(r.c.id)}">Счёт</button>` : ""}<button class="btn sm" type="button" data-act="reconModal" data-c="${E(r.c.id)}">Сверка</button></span></td></tr>`).join("")}
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
      <dl class="kv mt"><dt>Дата</dt><dd>${u.dLong(Date.now())}</dd><dt>Принял</dt><dd>${E(st.who(actor()))}</dd></dl>
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
    return `<div class="pane">${moneyTabs("profit")}
      <div class="ph"><div><h1>Расходы и прибыль${stg(2)}</h1><div class="sub">По каждой отправке: сколько взяли с клиента, сколько потратили на упаковку и перевозчика, что осталось.</div></div><span class="grow"></span><div class="seg light sm">${[[30, "30 дней"], [90, "90 дней"]].map(([k, t]) => `<button type="button" class="${per === k ? "on" : ""}" data-act="period" data-k="${k}">${t}</button>`).join("")}</div></div>
      <div class="kpis">
        <div class="kpi"><span>Выручка</span><strong>${u.usd(T.rev)}</strong><small>${list.length} ${u.plural(list.length, "отправка", "отправки", "отправок")}</small></div>
        <div class="kpi"><span>Себестоимость</span><strong>${u.usd(T.exp)}</strong><small>упаковка, перевозчик, прочее</small></div>
        <div class="kpi hero"><span>Прибыль</span><strong>${u.usd(pr)}</strong><small>за ${per} дней</small></div>
        <div class="kpi"><span>Маржа</span><strong>${T.rev ? Math.round((pr / T.rev) * 100) : 0}%</strong><small>прибыль к выручке</small></div>
      </div>
      <div class="grid2 wide-l">
        <table class="tbl"><thead><tr><th>Отправка</th><th class="r">Выручка</th><th class="r">Упаковка</th><th class="r">Перевозчик</th><th class="r">Прочее</th><th class="r">Прибыль</th><th></th></tr></thead><tbody>
          ${list.map((s) => { const p = s.cost - st.expSum(s); return `<tr class="click" data-act="expModal" data-id="${E(s.id)}" data-exp="${E(s.id)}"><td><b>${E(s.id)}</b><div class="muted s12">${E(s.clientId)} · ${u.dShort(s.sentAt)}</div></td><td class="r">${u.usd(s.cost)}</td><td class="r muted">${u.usd(s.exp.pack)}</td><td class="r muted">${u.usd(s.exp.carrier)}</td><td class="r muted">${u.usd(s.exp.other)}</td><td class="r ${p >= 0 ? "ok" : "bad"}">${u.usd(p)}</td><td class="r muted">${I("chevron")}</td></tr>`; }).join("") || '<tr><td colspan="7" class="muted">За период отправок нет</td></tr>'}
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
    return `<div class="pane">${moneyTabs("tariffs")}
      <div class="ph"><div><h1>Тарифы клиентов${stg(2)}</h1><div class="sub">У каждого клиента свой тариф: за килограмм, за кубометр, по плотности или индивидуальный. Стоимость груза считается сама.</div></div></div>
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
  const phrases = (side, tid) => App.i18n.CHAT[side].map((p) => `<button type="button" data-act="chatPhrase" data-k="${p.k}" data-tid="${E(tid)}" data-side="${side}">${E(p[side])}</button>`).join("");
  function threadTitle(t, side) {
    const T = App.i18n.of(side), o = t.ref.t === "rec" ? st.rec(t.ref.id) : st.cargo(t.ref.id), c = o && o.clientId ? st.client(o.clientId) : null;
    return { id: t.ref.id, kind: T.t("ch_ref_" + t.ref.t), code: c ? c.id : T.t("st_unk"), name: c ? c.name : "", wh: T.wh(st.wh(t.wh)) };
  }
  function lastText(t, side) { const m = t.msgs[t.msgs.length - 1]; if (!m) return ""; return m.k ? App.i18n.PHRASE[m.k][side] : m.text; }
  const threadsSorted = (whId) => st.S.chats.filter((t) => !whId || t.wh === whId).sort((a, b) => ((b.msgs[b.msgs.length - 1] || {}).at || 0) - ((a.msgs[a.msgs.length - 1] || {}).at || 0));
  App.chatUI = { bubble, phrases, threadTitle, lastText, threadsSorted };
  function chat(p) {
    const list = threadsSorted(), cur = (p && st.thread(p)) || list[0];
    if (cur && App.ui.mode === "admin") st.chatRead(cur.id, "ru");
    const tt = cur ? threadTitle(cur, "ru") : null;
    return `<div class="pane">
      <div class="ph"><div><h1>Чат со складом${stg(3)}</h1><div class="sub">Вы пишете по-русски, склад читает по-китайски, и наоборот. Переписка привязана к грузу и не теряется при смене сотрудника.</div></div></div>
      <div class="chat">
        <div class="chat-l">${list.map((t) => { const x = threadTitle(t, "ru"), n = t === cur ? 0 : st.unread(t, "ru"); return `<button type="button" class="thr${t === cur ? " on" : ""}" data-act="d" data-s="chat" data-p="${E(t.id)}" data-thr="${E(t.id)}"><span class="tt"><b>${E(x.id)}</b><span class="muted">${E(x.code)}</span>${n ? `<i>${n}</i>` : ""}</span><span class="tl1">${E(lastText(t, "ru"))}</span><span class="tw">склад ${E(x.wh)}</span></button>`; }).join("")}</div>
        ${cur ? `<div class="chat-r"><div class="chat-h"><div><b>${E(tt.kind)} ${E(tt.id)}</b><span class="muted"> · ${E(tt.code)} ${E(tt.name)} · склад ${E(tt.wh)}</span></div><button class="btn sm" type="button" data-act="openItem" data-t="${cur.ref.t}" data-id="${E(cur.ref.id)}">Карточка груза</button></div>
          <div class="chat-m" id="chatMsgs">${cur.msgs.map((m) => bubble(m, "ru")).join("") || `<p class="muted center">${L.t("ch_empty")}</p>`}</div>
          <div class="chat-q" data-hl="chat-q">${phrases("ru", cur.id)}</div>
          <div class="chat-i"><input class="inp" data-in="chatText" id="chatText" placeholder="Сообщение складу" value="${E(App.tmp.chatText)}" data-enter="#btnChatSend" autocomplete="off"><button class="btn pri" type="button" id="btnChatSend" data-act="chatSend" data-tid="${E(cur.id)}" data-side="ru">${I("send")}Отправить</button></div></div>` : '<div class="chat-r"><p class="muted">Переписки пока нет.</p></div>'}
      </div>
    </div>`;
  }

  // ---------- действия ----------
  Object.assign(App.acts, {
    period: (d) => { App.tmp.period = +d.k; App.refresh(true); },
    payModal: (d) => { App.tmp.pay = null; payModal(d.c); },
    payCur: (d) => { const p = App.tmp.pay, debt = st.money(p.c).debt, r = st.CUR[d.k].rate, big = d.k === "RUB" || d.k === "KZT" || d.k === "KGS"; p.cur = d.k; p.rate = String(r).replace(".", ","); p.amount = String(big ? Math.round((debt * r) / 100) * 100 : Math.round(debt * r)); payModal(p.c); },
    payGo: () => {
      const p = App.tmp.pay, x = payCalc();
      if (!(x.amt > 0) || !(x.rate > 0)) { App.toast("Укажите сумму и курс", "info"); return; }
      const pay = st.pay(p.c, { amount: x.amt, cur: p.cur, rate: x.rate, by: actor() });
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
    exportRep: () => csvDl("otchet_" + today() + ".csv", [["Неделя с", "Упаковано, м³"]].concat(weeksData().map((w) => [w.label, u.num(w.v, 2)]))),
    exportMoney: () => csvDl("oplaty_" + today() + ".csv", [["Код", "Клиент", "Начислено, $", "Оплачено, $", "Долг, $"]].concat(st.S.clients.map((c) => { const m = st.money(c.id); return [c.id, c.name, Math.round(m.charged), Math.round(m.paid), Math.round(m.debt)]; }))),
  });

  function chatSendFrom(el, tid, side, d) {
    const inPhone = el && el.closest(".pslot");
    const by = side === "ru" ? (inPhone ? "ramil" : actor()) : st.WH_STAFF[(st.thread(tid) || {}).wh] || "liwei";
    st.chatSend(tid, side, by, d);
  }
  Object.assign(App.ins, {
    payAmt: (v) => { App.tmp.pay.amount = v; $("payUsd").innerHTML = payUsdHtml(); },
    payRate: (v) => { App.tmp.pay.rate = v; $("payUsd").innerHTML = payUsdHtml(); },
    expIn: (v, el) => { App.tmp.exp[el.dataset.k] = v; $("expSum").innerHTML = expHtml(); },
    tarRate: (v) => { App.tmp.tar.rate = v; $("tarEx").innerHTML = tarHtml(); },
    chatText: (v) => { App.tmp.chatText = v; },
  });
  Object.assign(App.D.screens, { reports, money, profit, tariffs, chat });
  Object.assign(App.D, { payModal, reconModal, invoiceModal, expModal, tariffModal });
})(window.App);
