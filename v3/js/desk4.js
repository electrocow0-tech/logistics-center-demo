/* Экраны компьютера, четвёртая часть (версия 3.2): «Оплаты клиентов» по трекам, блок «Деньги» в карточке груза и окно правки сумм,
   «Агенты» (карточки по агентам, треки, оплата агенту за несколько треков, сверка с агентом), «Настройки» со справочниками
   (агенты, упаковка, страховка, склады в Китае, транспортные компании, курсы валют), быстрый поиск груза в шапке рабочего места. */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, I = u.icon, E = u.esc, $ = (id) => document.getElementById(id);
  const K = App.DK, can = K.can, vis = K.vis, cname = K.cname, actor = K.actor, xBtn = K.xBtn;
  const scn = (ev, x) => { if (App.scenario) App.scenario.check(ev, x); };
  const cg = (s) => st.cargo(s.id) || {};
  const daysW = (n) => n + " " + u.plural(n, "день", "дня", "дней");
  const fx = (n) => u.num(n, Math.abs(n % 1) > 0.001 ? 2 : 0); // число без лишних нулей: 1,25 или 180
  const isoDay = (t) => K.dISO(t);
  const cbx = (act, id, on, label) => `<button class="cbb" type="button" data-act="${act}" data-id="${E(id)}" aria-label="${label}" aria-pressed="${on ? "true" : "false"}"><span class="cb${on ? " on" : ""}">${on ? I("check") : ""}</span></button>`;
  const recTracks = (s) => (cg(s).receiptIds || []).map((id) => (st.rec(id) || {}).track).filter(Boolean);
  // правит деньги администратор или сотрудник, которому открыты стоимость и «Оплаты клиентов»
  const canMoney = () => !K.asId() || (can("cost") && K.sec("money"));

  // ---------- «Оплаты клиентов» по трекам ----------
  const pfDef = () => ({ q: "", c: "all", st: "all", over: false, per: "all", from: "", to: "" });
  // период по дате отправки: всё время, месяц или свои даты (общий фильтр денежных разделов)
  const PER_O = [["all", "Всё время"], ["month", "Месяц"], ["range", "Период"]];
  const inPer = (f, t) => { if (!f.per || f.per === "all") return true; const r = App.D.perRange(f); return t >= r.from && t <= r.to; };
  const pf = () => App.tmp.pf || (App.tmp.pf = pfDef());
  function payList() {
    const f = pf(), q = f.q.trim().toUpperCase();
    return st.S.ships.filter((s) => vis(s) && inPer(f, s.sentAt) && (f.c === "all" || s.clientId === f.c) && (f.st === "all" || (f.st === "debt" ? st.debtOf(s) > 0.5 : st.isPaid(s))) && (!f.over || st.overC(s))
      && (!q || [s.id, s.clientId, cname(s.clientId), cg(s).name].concat(recTracks(s)).some((x) => String(x || "").toUpperCase().includes(q)))).sort((a, b) => b.sentAt - a.sentAt);
  }
  // отмеченные треки: только с долгом и только одного клиента
  function ptSel() { const x = (App.tmp.psel2 || []).filter((id) => { const s = st.ship(id); return s && st.debtOf(s) > 0.5 && vis(s); }), c = x.length ? st.ship(x[0]).clientId : null; App.tmp.psel2 = x.filter((id) => st.ship(id).clientId === c); return App.tmp.psel2; }
  const overPill = (s) => `<span class="st" data-st="unk" data-ov="c">долг ${daysW(st.ageDays(s))}</span>`;
  function payTracks() {
    const f = pf(), list = payList(), sel = ptSel(), r = K.seeRoute(), dirty = f.q || f.c !== "all" || f.st !== "all" || f.over || (f.per && f.per !== "all");
    const chosen = sel.map(st.ship), sum = chosen.reduce((a, s) => a + st.debtOf(s), 0);
    const rows = list.map((s) => {
      const t = st.totals(s), c = st.client(s.clientId), d = st.debtOf(s), on = sel.includes(s.id), o = st.overC(s);
      return `<tr class="click${on ? " sel" : ""}" data-act="openItem" data-t="ship" data-id="${E(s.id)}" data-pt="${E(s.id)}"><td class="cbc">${d > 0.5 ? cbx("ptSel", s.id, on, "Отметить трек " + s.id) : ""}</td>
        <td><b class="mono">${E(s.id)}</b><div class="muted s12">отправлен ${u.dShort(s.sentAt)}</div></td><td><b>${E(s.clientId)}</b><div class="muted s12 ell1">${E(cname(s.clientId))}</div></td>
        <td>${E(K.TR(s.transport).t)}${r ? ` · <b>${E(s.route)}</b>` : ""}<div class="muted s12">${E(s.dest)}</div></td><td class="nw">${u.kg(t.weight)}<div class="muted s12">${u.vol(t.volume)}</div></td>
        <td>${E(cg(s).name || "не указано")}<div class="muted s12">${u.places(t.places)}</div></td><td class="muted s12">${E(c ? st.tariffLabel(c) : "")}</td>
        <td class="r">${u.usd(s.cost)}</td><td class="r">${u.usd(Math.min(s.cost, s.paidUsd))}</td><td class="r ${d > 0.5 ? "bad" : "ok"}">${d > 0.5 ? u.usd(d) : "нет"}${o ? `<div>${overPill(s)}</div>` : ""}</td><td class="r muted">${I("chevron")}</td></tr>`;
    }).join("");
    const opts = st.S.clients.filter((c) => K.mine(c.id)).map((c) => `<option value="${E(c.id)}"${f.c === c.id ? " selected" : ""}>${E(c.id)} ${E(c.name)}</option>`).join("");
    return `<div class="fbar pay-per" data-hl="pay-per">${App.D.perBar(f, "pfPer", "pfDate", PER_O)}<span class="grow"></span><span class="muted s13">по дате отправки</span></div>
      <div class="fbar pay-f" data-hl="pay-f"><label class="search">${I("search")}<input data-in="pfQ" value="${E(f.q)}" placeholder="Трек, китайский трек, клиент, наименование" data-hl="pay-q"></label>
        <select class="inp sm" data-chg="pfC" aria-label="Клиент"><option value="all">Все клиенты</option>${opts}</select>
        <select class="inp sm" data-chg="pfSt" aria-label="Оплата"><option value="all">Все треки</option><option value="debt"${f.st === "debt" ? " selected" : ""}>С долгом</option><option value="paid"${f.st === "paid" ? " selected" : ""}>Оплачены</option></select>
        <button class="chipb${f.over ? " bad" : ""}" type="button" data-act="pOver" id="chipOver" aria-pressed="${f.over ? "true" : "false"}">${I("clock")}Долг дольше ${st.OVER_C} дней</button>
        ${dirty ? `<button class="btn sm ghost" type="button" data-act="pfClear">${I("x")}Сбросить</button>` : ""}<span class="grow"></span><span class="muted s13" id="payCnt">${list.length} ${u.plural(list.length, "трек", "трека", "треков")}</span></div>
      <div class="tbx"><table class="tbl pay-t" data-hl="pay-t"><thead><tr><th class="cbc"></th><th>Трек</th><th>Клиент</th><th>Вид доставки</th><th>Вес и объём</th><th>Наименование</th><th>Тариф</th><th class="r">Начислено</th><th class="r">Оплачено</th><th class="r">Долг</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="11" class="muted">${dirty ? "По этим фильтрам треков нет" : "Отправок пока нет"}</td></tr>`}</tbody></table></div>
      <div class="wk-foot pay-foot" data-hl="pay-foot"><span class="wk-n">${sel.length ? `Выбрано ${st.tracksWord(sel.length)} клиента ${E(chosen[0].clientId)}: долг ${u.usd(sum)}` : "Отметьте неоплаченные треки одного клиента: одна оплата закроет несколько"}</span><span class="grow"></span>
        <button class="btn pri" type="button" data-act="ptPay" id="btnPayTracks" ${sel.length ? "" : "disabled"}>${I("wallet")}Принять оплату${sel.length > 1 ? " · " + sel.length : ""}</button></div>`;
  }
  const payTracksCsv = () => K.csvDl("oplaty_treki_" + K.today() + ".csv", [["Трек", "Код клиента", "Клиент", "Вид доставки"].concat(K.seeRoute() ? ["Маршрут"] : []).concat(["Вес, кг", "Объём, м³", "Наименование", "Тариф", "Начислено, $", "Оплачено, $", "Долг, $", "Дней с отправки"])]
    .concat(payList().map((s) => { const t = st.totals(s), c = st.client(s.clientId); return [s.id, s.clientId, cname(s.clientId), K.TR(s.transport).t].concat(K.seeRoute() ? [s.route] : []).concat([Math.round(t.weight), u.num(t.volume, 2), cg(s).name || "", c ? st.tariffLabel(c) : "", s.cost, Math.min(s.cost, s.paidUsd), st.debtOf(s), st.ageDays(s)]); })));

  // ---------- блок «Деньги» в карточке груза: из чего складывается стоимость, страховка, сумма агенту, прибыль ----------
  // версия 3.3: суммы правятся только в «Расходах и прибыли». В «Отправках» блок только для просмотра, без агента и прибыли.
  // В остальных местах вместо кнопки ссылка «Изменить в «Расходах и прибыли»». Агент и прибыль видны только в разделах «Денег»
  const MONEY_SCR = ["money", "profit", "agents"];
  function moneyBox(o) {
    const c = st.client(o.clientId), x = cg(o), a = st.agentOf(o.route), pct = st.S.dir.insPct, from = App.ui.desk;
    const edit = from === "profit" && canMoney(), link = !edit && from !== "cons" && canMoney() && K.allowed("profit"), inMoney = MONEY_SCR.includes(from);
    const line = (t, sub, v, k) => `<div class="pline mini"${k ? ` data-ml="${k}"` : ""}><span>${t}${sub ? `<small>${sub}</small>` : ""}</span><b>${v}</b></div>`;
    const ag = inMoney && (!K.asId() || K.sec("agents"));
    const head = edit ? `<button class="btn sm" type="button" data-act="monOpen" data-id="${E(o.id)}" id="btnMonEdit">${I("edit")}Изменить</button>`
      : link ? `<button class="lnkb" type="button" data-act="monProfit" data-id="${E(o.id)}" id="btnMonProfit">${I("edit")}Изменить в «Расходах и прибыли»</button>` : `<span class="muted s12" id="monRo">только просмотр</span>`;
    return `<div class="box flat mbox" data-hl="card-money"><div class="row"><h3 class="grow">${I("dollar")}Деньги</h3>${head}</div>
      ${line("Доставка", E(st.delivText(o)), u.usd(o.deliv || 0), "deliv")}
      ${line("Упаковка", E(st.packsText(x.packs || {})), u.usd(o.packUsd || 0), "pack")}
      ${line("Страховка", o.value ? `${fx(pct)}% от стоимости груза ${u.usd(o.value)}${o.insManual ? ", сумма исправлена вручную" : ""}` : "стоимость груза не указана", o.insUsd ? u.usd(o.insUsd) : "нет", "ins")}
      ${o.doorUsd ? line("Расходы в Китае", "доставка до склада и доп. расходы" + (o.doorCny ? ", " + u.cny(o.doorCny) : ""), u.usd(o.doorUsd), "door") : ""}
      ${o.issueExpUsd ? line("Расходы при выдаче за счёт клиента", st.rub(o.issueExpRub), u.usd(o.issueExpUsd), "iexp") : ""}
      ${o.dlvUsd ? line(o.dlvWay === "tk" ? "Доставка ТК за счёт клиента" : "Доставка до двери за счёт клиента", st.rub(o.dlvRub), u.usd(o.dlvUsd), "dlv") : ""}
      <div class="row mb-tot"><div class="grow"><small class="muted">Итого клиенту</small><div class="big" data-ml="cost">${u.usd(o.cost)}</div></div>${K.paidPill(o)}${edit ? `<button class="sw${st.isPaid(o) ? " on" : ""}" type="button" data-act="togglePaid" data-id="${E(o.id)}" aria-label="Оплачено" title="Отметка «Оплачено»"><i></i></button>` : ""}</div>
      ${line("Стоимость груза, объявленная", "для страховки, указывается при упаковке или отправке", o.value ? u.usd(o.value) : '<span class="muted">не указана</span>', "value")}
      ${ag ? line(`Агенту${K.seeRoute() ? " " + E(o.route) : ""}${a ? ", " + E(a.name) : ""}`, (o.amode === "rate" || o.amode === "sum" || o.agentManual ? E(st.agentModeText(o)) : a ? E(st.agentText(a)) : "агент не найден") + (st.agentIsPaid(o) ? " · оплачено агенту" : o.agentPaid > 0 ? " · оплачено " + u.usd(o.agentPaid) : " · агенту не оплачено"), u.usd(o.agentUsd || 0), "agent") : ""}
      ${inMoney && K.sec("profit") ? `<div class="pline mini" data-ml="profit"><span>Расходы ${u.usd(st.expSum(o))}, прибыль <b class="${o.cost - st.expSum(o) >= 0 ? "ok" : "bad"}">${u.usd(o.cost - st.expSum(o))}</b></span>${from !== "profit" ? '<span class="lnk" data-act="d" data-s="profit">Подробнее</span>' : ""}</div>` : ""}</div>`;
  }
  // окно «Деньги по грузу»: все суммы правятся, каждая правка пишется в историю действий.
  // Доставка клиенту и сумма агенту считаются одним из трёх способов (версия 3.3)
  const MON_F = [["deliv", "Доставка клиенту, $"], ["packUsd", "Упаковка, $"], ["doorUsd", "Расходы в Китае, $"], ["value", "Стоимость груза, $"], ["insUsd", "Страховка, $"], ["agentUsd", "Сумма агенту, $"], ["expPack", "Упаковка, наши расходы, $"], ["expOther", "Прочие расходы, $"]];
  const v2 = (n) => String(Math.round((n || 0) * 100) / 100).replace(".", ",");
  function monStart(id) {
    const s = st.ship(id); if (!s || !canMoney()) return;
    App.tmp.mon = { id, deliv: v2(s.deliv), packUsd: v2(s.packUsd), doorUsd: v2(s.doorUsd), value: String(s.value || ""), insUsd: v2(s.insUsd), agentUsd: v2(s.agentUsd), expPack: v2(s.exp.pack), expOther: v2(s.exp.other),
      dmode: s.dmode || "tariff", drate: s.drate ? v2(s.drate) : "", dbasis: s.dbasis || "m3", amode: s.amode || (s.agentManual ? "sum" : "agent"), arate: s.arate ? v2(s.arate) : "", abasis: s.abasis || "kg" };
    monModal();
  }
  // сумма по выбранному способу: по тарифу или ставке считается сама, «суммой» берётся из поля
  const monDeliv = (m) => { const s = st.ship(m.id), v = st.delivCalc(s, m.dmode, u.parse(m.drate), m.dbasis); return v == null ? u.parse(m.deliv) : v; };
  const monAgent = (m) => { const s = st.ship(m.id), v = st.agentByMode(s, m.amode, u.parse(m.arate), m.abasis); return v == null ? u.parse(m.agentUsd) : v; };
  function monCalc(m) {
    const p = (k) => u.parse(m[k]), cost = monDeliv(m) + p("packUsd") + p("doorUsd") + p("insUsd") + (st.ship(m.id).issueExpUsd || 0) + (st.ship(m.id).dlvUsd || 0), exp = monAgent(m) + p("expPack") + p("expOther") + (st.ship(m.id).exp.dlv || 0);
    return { cost, exp, profit: cost - exp };
  }
  const monSum = (m) => { const x = monCalc(m); return `${I("dollar")}<span>Итого клиенту <b>${u.usd(x.cost)}</b>, расходы ${u.usd(x.exp)}, прибыль <b class="${x.profit >= 0 ? "ok" : "bad"}">${u.usd(x.profit)}</b><small>клиент увидит новую стоимость в кабинете, изменения попадут в историю действий</small></span>`; };
  // подпись расчёта: «1,11 м³ × 330 $ = 366 $» или «812 кг × 1 $ = 812 $»
  const calcText = (s, rate, basis, sum) => { const t = st.totals(s), q = basis === "kg" ? u.kg(t.weight) : u.vol(t.volume); return `${q} × ${fx(u.parse(rate))} $ = ${u.usd(sum)}`; };
  const modeCalc = (m, w) => { const s = st.ship(m.id); if (w === "d") return m.dmode === "tariff" ? `${E(st.tariffLabel(st.client(s.clientId)))}: <b>${u.usd(monDeliv(m))}</b>` : m.dmode === "rate" ? calcText(s, m.drate, m.dbasis, monDeliv(m)) : "сумма вписана вручную";
    const a = st.agentOf(s.route); return m.amode === "agent" ? `${a ? E(st.agentText(a)) : "агент не найден"}: <b>${u.usd(monAgent(m))}</b>` : m.amode === "rate" ? calcText(s, m.arate, m.abasis, monAgent(m)) : "сумма вписана вручную"; };
  // блок способа расчёта: три кнопки, поле ставки с выбором «за м³ / за кг» или поле суммы, подпись расчёта
  function modeBlock(m, w) {
    const D = w === "d", mode = D ? m.dmode : m.amode, rk = D ? "drate" : "arate", bk = D ? "dbasis" : "abasis", sk = D ? "deliv" : "agentUsd";
    const opts = D ? [["tariff", "По тарифу клиента"], ["rate", "Своя ставка"], ["sum", "Суммой"]] : [["agent", "По ставке агента"], ["rate", "Своя ставка"], ["sum", "Суммой"]];
    const bases = D ? [["m3", "$ за м³"], ["kg", "$ за кг"]] : [["kg", "$ за кг"], ["m3", "$ за м³"]];
    const ctl = mode === "rate" ? `<div class="mm-r"><input class="inp" data-in="monIn" data-k="${rk}" inputmode="decimal" value="${E(m[rk])}" placeholder="Ставка, $" aria-label="Своя ставка" data-enter="#btnMonGo" data-hl="mon-${w}rate"><div class="seg sm light">${bases.map(([k, t]) => `<button type="button" class="${m[bk] === k ? "on" : ""}" data-act="monBasis" data-w="${w}" data-k="${k}" data-mb="${w}${k}">${t}</button>`).join("")}</div></div>`
      : mode === "sum" ? `<div class="mm-r"><input class="inp" data-in="monIn" data-k="${sk}" inputmode="decimal" value="${E(m[sk])}" aria-label="${D ? "Доставка клиенту" : "Сумма агенту"}, $" data-enter="#btnMonGo"></div>` : "";
    return `<div class="fld mmode" data-hl="mon-${w}mode"><span>${D ? "Доставка клиенту" : "Сумма агенту"}</span><div class="choice cols3">${opts.map(([k, t]) => `<button type="button" class="${mode === k ? "on" : ""}" data-act="monMode" data-w="${w}" data-k="${k}" data-mm="${w}${k}">${t}</button>`).join("")}</div>
      ${ctl}<div class="mm-c" id="monCalc${w}">${modeCalc(m, w)}</div></div>`;
  }
  function monModal() {
    const m = App.tmp.mon, s = m && st.ship(m.id); if (!s) return;
    const f = (k, t, hl) => `<label class="fld"${hl ? ` data-hl="${hl}"` : ""}><span>${t}</span><input class="inp" data-in="monIn" data-k="${k}" inputmode="decimal" value="${E(m[k])}" data-enter="#btnMonGo"></label>`, pct = st.S.dir.insPct;
    K.show("mon", `<div class="mh"><div class="mi">${I("dollar")}</div><div><h2>Деньги по грузу</h2><div class="muted s13"><span class="mono">${E(s.id)}</span> · ${E(s.clientId)} ${E(cname(s.clientId))}${K.seeRoute() ? " · маршрут " + E(s.route) : ""}</div></div>${xBtn}</div>
      <h3 class="h3">Клиенту</h3>
      ${modeBlock(m, "d")}
      <div class="row2 mt">${f("packUsd", MON_F[1][1])}${f("doorUsd", MON_F[2][1])}</div>
      <div class="row2 mt">${f("value", MON_F[3][1], "mon-value")}<div class="fld"><span>Страховка, $</span><div class="ttf-r"><input class="inp" data-in="monIn" data-k="insUsd" inputmode="decimal" value="${E(m.insUsd)}" data-enter="#btnMonGo" aria-label="Страховка"><button class="btn sm" type="button" data-act="monIns" id="btnMonIns">${I("refresh")}${fx(pct)}% от стоимости</button></div></div></div>
      <h3 class="h3 mt2">Наши расходы</h3>
      ${modeBlock(m, "a")}
      <div class="row2 mt">${f("expPack", MON_F[6][1])}${f("expOther", MON_F[7][1])}</div>
      <div class="found mt" id="monSum">${monSum(m)}</div>
      <div class="mf"><button class="btn" type="button" data-act="monBack">Отмена</button><button class="btn pri" type="button" data-act="monGo" id="btnMonGo">${I("check")}Сохранить</button></div>`, "wide");
  }

  // ---------- окно «Отправить»: стоимость груза и расчёт для клиента по справочникам ----------
  function svText(c, d) {
    const cl = st.client(c.clientId), deliv = st.tariffCalc(cl, c.weight, c.volume), pack = st.packCost(c.packs), ins = st.insCalc(u.parse((d.values || {})[c.id])), door = st.cnyUsd(st.doorOpen(c));
    return `доставка ${u.usd(deliv)} + упаковка ${u.usd(pack)} + страховка ${u.usd(ins)}${door ? " + расходы в Китае " + u.usd(door) : ""} = <b>${u.usd(deliv + pack + ins + door)}</b>`;
  }
  function sendCalc(d, cs) {
    return `<div class="fld mt" data-hl="snd-money"><span>Стоимость груза и расчёт для клиента: упаковка по ценам из настроек, страховка ${fx(st.S.dir.insPct)}%</span><div class="sv-l">${cs.map((c) => `<div class="sv-r" data-sv="${E(c.id)}"><span class="sv-t"><b class="mono">${E(c.id)}</b><small data-svc="${E(c.id)}">${svText(c, d)}</small></span>
      <input class="inp sm" data-in="sndVal" data-k="${E(c.id)}" inputmode="numeric" value="${E((d.values || {})[c.id] || "")}" placeholder="Стоимость груза, $" aria-label="Стоимость груза ${E(c.id)}"></div>`).join("")}</div></div>`;
  }

  // ---------- «Агенты»: карточки по агентам, треки с галочками, оплата за несколько треков, история оплат ----------
  const agfDef = () => ({ route: "all", st: "all", over: false, q: "", per: "all", from: "", to: "" });
  const agf = () => App.tmp.agf || (App.tmp.agf = agfDef());
  const agName = (r) => (st.agentOf(r) || {}).name || "";
  function agList() {
    const f = agf(), q = f.q.trim().toUpperCase();
    return st.S.ships.filter((s) => (s.agentUsd || 0) > 0 && inPer(f, s.sentAt) && (f.route === "all" || s.route === f.route) && (f.st === "all" || (f.st === "open" ? st.agentDebt(s) >= 0.5 : st.agentIsPaid(s))) && (!f.over || st.overA(s))
      && (!q || [s.id, s.clientId, cname(s.clientId), cg(s).name].some((x) => String(x || "").toUpperCase().includes(q))))
      .sort((a, b) => (st.agentDebt(b) >= 0.5 ? 1 : 0) - (st.agentDebt(a) >= 0.5 ? 1 : 0) || a.sentAt - b.sentAt);
  }
  function agSel() { const x = (App.tmp.asel2 || []).filter((id) => { const s = st.ship(id); return s && st.agentDebt(s) >= 0.5; }), r = x.length ? st.ship(x[0]).route : null; App.tmp.asel2 = x.filter((id) => st.ship(id).route === r); return App.tmp.asel2; }
  const agPill = (s) => (st.agentIsPaid(s) ? '<span class="st" data-st="in">оплачено</span>' : s.agentPaid > 0 ? `<span class="st" data-st="pack">оплачено ${u.usd(s.agentPaid)}</span>` : '<span class="st" data-st="wait">не оплачено</span>');
  // колонка «Цена»: по какой ставке посчитана сумма агенту, с пометкой «своя» или «вручную»
  const priceHtml = (s) => { const p = st.agentPrice(s); return p.mark === "вручную" ? '<span class="st" data-st="pack">вручную</span>' : `${E(p.t)}${p.mark ? ' <span class="st" data-st="pack">своя</span>' : ""}`; };
  function agents() {
    const f = agf(), list = agList(), sel = agSel(), T = st.agentStats(), dirty = f.route !== "all" || f.st !== "all" || f.over || f.q;
    const cards = st.S.dir.agents.map((a) => { const x = st.agentStats(a.route);
      return `<button class="kpi agc${f.route === a.route ? " on" : ""}" type="button" data-act="agF" data-k="${E(a.route)}" data-agc="${E(a.route)}"><span><b class="agr">${E(a.route)}</b> ${E(a.name)}</span><strong class="${x.debt >= 0.5 ? "bad" : "okc"}">${x.debt >= 0.5 ? u.usd(x.debt) : "нет долга"}</strong>
        <small>начислено ${u.usd(x.charged)} · оплачено ${u.usd(x.paid)}</small>${x.over ? `<em class="agw">${x.over} ${u.plural(x.over, "трек не оплачен", "трека не оплачены", "треков не оплачены")} дольше ${st.OVER_A} дней</em>` : `<em class="agw ok0">${x.open ? st.tracksWord(x.open) + " ждут оплаты" : "все треки оплачены"}</em>`}</button>`; }).join("");
    const chosen = sel.map(st.ship), sum = chosen.reduce((a, s) => a + st.agentDebt(s), 0), r0 = chosen.length ? chosen[0].route : null;
    const rows = list.map((s) => {
      const t = st.totals(s), on = sel.includes(s.id), open = st.agentDebt(s) >= 0.5;
      return `<tr class="click${on ? " sel" : ""}" data-act="openItem" data-t="ship" data-id="${E(s.id)}" data-at="${E(s.id)}"><td class="cbc">${open ? cbx("agSel", s.id, on, "Отметить трек " + s.id) : ""}</td>
        <td><b>${E(s.route)}</b><div class="muted s12 ell1">${E(agName(s.route))}</div></td><td><b class="mono">${E(s.id)}</b><div class="muted s12">${E(s.clientId)} · отправлен ${u.dShort(s.sentAt)}</div></td>
        <td class="r">${u.kg(t.weight)}</td><td class="r">${u.vol(t.volume)}</td><td class="r">${t.volume ? Math.round(t.weight / t.volume) : 0} кг/м³</td>
        <td class="nw" data-apr="${E(s.id)}">${priceHtml(s)}</td><td class="r"><b>${u.usd(s.agentUsd)}</b>${s.agentPaid > 0 && open ? `<div class="muted s12">долг ${u.usd(st.agentDebt(s))}</div>` : ""}</td><td>${agPill(s)}${st.overA(s) ? ` <span class="st" data-st="unk" data-ov="a">${daysW(st.ageDays(s))}</span>` : ""}</td><td class="r muted">${I("chevron")}</td></tr>`;
    }).join("");
    const pays = st.S.apays.filter((p) => f.route === "all" || p.route === f.route).slice().sort((a, b) => b.at - a.at);
    return `<div class="pane">
      <div class="ph"><div><h1>Агенты</h1><div class="sub">Агент: перевозчик по маршруту. Сумма по треку считается по ставке агента из настроек. Отметьте треки и оплатите одним платежом. Долг агентам всего ${u.usd(T.debt)}.</div></div><span class="grow"></span>
        <button class="btn" type="button" data-act="agRecon" id="btnAgRecon">${I("scale")}Сверка с агентом</button><button class="btn" type="button" data-act="agExport">${I("download")}<span class="hide-n">Excel</span></button></div>
      <div class="kpis agcs" data-hl="ag-cards">${cards}</div>
      <div class="fbar ag-per" data-hl="ag-per">${App.D.perBar(f, "agPer", "agDate", PER_O)}<span class="grow"></span><span class="muted s13">по дате отправки</span></div>
      <div class="fbar ag-f" data-hl="ag-f"><div class="seg light sm" data-hl="ag-route">${[["all", "Все агенты"]].concat(st.ROUTES.map((k) => [k, k])).map(([k, t]) => `<button type="button" class="${f.route === k ? "on" : ""}" data-act="agF" data-k="${E(k)}" data-agf="${E(k)}">${E(t)}</button>`).join("")}</div>
        <select class="inp sm" data-chg="agSt" aria-label="Статус оплаты"><option value="all">Все треки</option><option value="open"${f.st === "open" ? " selected" : ""}>Не оплачено</option><option value="paid"${f.st === "paid" ? " selected" : ""}>Оплачено</option></select>
        <button class="chipb${f.over ? " bad" : ""}" type="button" data-act="agOver" id="chipAgOver" aria-pressed="${f.over ? "true" : "false"}">${I("clock")}Старше ${st.OVER_A} дней</button>
        <label class="search">${I("search")}<input data-in="agQ" value="${E(f.q)}" placeholder="Трек, клиент, наименование"></label>
        ${dirty ? `<button class="btn sm ghost" type="button" data-act="agClear">${I("x")}Сбросить</button>` : ""}<span class="grow"></span><span class="muted s13">${list.length} ${u.plural(list.length, "трек", "трека", "треков")}</span></div>
      <div class="tbx"><table class="tbl ag-t" data-hl="ag-t"><thead><tr><th class="cbc"></th><th>Агент</th><th>Трек</th><th class="r">Вес</th><th class="r">Объём</th><th class="r">Плотность</th><th>Цена</th><th class="r">Сумма, USD</th><th>Статус</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="10" class="muted">${dirty ? "По этим фильтрам треков нет" : "Треков пока нет"}</td></tr>`}</tbody></table></div>
      <div class="wk-foot ag-foot" data-hl="ag-foot"><span class="wk-n">${sel.length ? `Выбрано ${st.tracksWord(sel.length)} агента ${E(r0)}: ${u.usd(sum)}` : "Отметьте неоплаченные треки одного агента"}</span><span class="grow"></span>
        <button class="btn pri" type="button" data-act="agPayOpen" id="btnAgPay" ${sel.length ? "" : "disabled"}>${I("wallet")}Оплатить${sel.length > 1 ? " · " + sel.length : ""}</button></div>
      <h3 class="h3 mt2">Оплаты агентам: сколько, кому и за что</h3>
      <div class="tbx"><table class="tbl" data-hl="ag-hist"><thead><tr><th>Дата</th><th>Агент</th><th>За какие треки</th><th class="r">Сумма</th><th>Способ</th><th>Кто внёс</th></tr></thead><tbody>
        ${pays.slice(0, 10).map((p) => `<tr data-apay="${p.id}"><td class="nw">${u.dFull(p.at)}</td><td><b>${E(p.route)}</b> <span class="muted">${E(agName(p.route))}</span></td><td class="pay-ids">${p.shipIds.map((x) => `<span class="mono">${E(x)}</span>`).join(", ")}</td><td class="r"><b>${u.usd(p.amount)}</b></td><td class="muted">${E(p.method)}${p.note ? `<div class="s12">${E(p.note)}</div>` : ""}</td><td class="muted">${E(st.who(p.by))}</td></tr>`).join("") || '<tr><td colspan="6" class="muted">Оплат пока не было</td></tr>'}
      </tbody></table></div>
    </div>`;
  }
  // окно «Оплатить агенту»: неоплаченные треки агента с галочками, сумма по отмеченным, дата, способ, примечание
  const AG_WAYS = ["Перевод", "Наличные", "USDT"];
  function agPayStart(route, ids) {
    const open = st.S.ships.filter((s) => s.route === route && st.agentDebt(s) >= 0.5); if (!open.length) return;
    App.tmp.agp = { route, ids: ids.filter((id) => open.some((s) => s.id === id)), amount: "", auto: true, date: isoDay(Date.now()), method: AG_WAYS[0], note: "" };
    agAuto(); agPayModal();
  }
  const agOpen = (route) => st.S.ships.filter((s) => s.route === route && st.agentDebt(s) >= 0.5).sort((a, b) => a.sentAt - b.sentAt);
  const agDue = (x) => x.ids.map(st.ship).filter(Boolean).reduce((a, s) => a + st.agentDebt(s), 0);
  function agAuto() { const x = App.tmp.agp; if (x && x.auto) x.amount = String(Math.round(agDue(x) * 100) / 100).replace(".", ","); }
  const agSumHtml = (x) => { const amt = u.parse(x.amount), due = agDue(x), d = st.agentStats(x.route).debt; return `${I("dollar")}<span>Оплата агенту <b>${u.usd(amt)}</b><small>${x.ids.length ? (amt >= due - 0.5 ? "закроет " + st.tracksWord(x.ids.length) : "по отмеченным трекам нужно " + u.usd(due)) + ", " : ""}${d - amt > 0.5 ? "останется долг агенту " + u.usd(d - amt) : "долг агенту будет закрыт"}</small></span>`; };
  function agPayModal() {
    const x = App.tmp.agp; if (!x) return;
    const a = st.agentOf(x.route), list = agOpen(x.route);
    K.show("agp", `<div class="mh"><div class="mi">${I("wallet")}</div><div><h2>Оплатить агенту</h2><div class="muted s13">${E(x.route)} ${E(a ? a.name : "")} · долг ${u.usd(st.agentStats(x.route).debt)}</div></div>${xBtn}</div>
      <div class="fld" data-hl="agp-tracks"><span class="row"><span class="grow">Неоплаченные треки агента: отметьте, за какие платим</span><button class="lnkb" type="button" data-act="agpAll" id="btnAgpAll">${x.ids.length === list.length ? "Снять все" : "Выбрать все"}</button></span>
        <div class="pay-l">${list.map((s) => { const on = x.ids.includes(s.id), t = st.totals(s); return `<button type="button" class="prow${on ? " on" : ""}" data-act="agpSel" data-id="${E(s.id)}" data-agp="${E(s.id)}"><span class="cb">${on ? I("check") : ""}</span><span class="ct"><b class="mono">${E(s.id)}</b><small>${E(s.clientId)} · ${u.kg(t.weight)} · ${u.vol(t.volume)} · отправлен ${u.dShort(s.sentAt)}${s.agentPaid > 0 ? " · уже оплачено " + u.usd(s.agentPaid) : ""}</small></span><b class="nw">${u.usd(st.agentDebt(s))}</b></button>`; }).join("")}</div></div>
      <div class="row2 mt"><label class="fld"><span>Сумма, $</span><input class="inp" id="agpAmt" data-in="agpIn" data-k="amount" inputmode="decimal" value="${E(x.amount)}" data-enter="#btnAgPayGo"></label><label class="fld"><span>Дата оплаты</span><input class="inp" type="date" data-in="agpIn" data-k="date" value="${E(x.date)}"></label></div>
      <div class="fld mt"><span>Способ оплаты</span><div class="choice cols3">${AG_WAYS.map((k) => `<button type="button" class="${x.method === k ? "on" : ""}" data-act="agpWay" data-k="${k}">${k}</button>`).join("")}</div></div>
      <label class="fld mt"><span>Примечание</span><input class="inp" data-in="agpIn" data-k="note" value="${E(x.note)}" placeholder="Например: две партии одним платежом" autocomplete="off"></label>
      <div class="found mt" id="agpSum">${agSumHtml(x)}</div>
      <div class="mf"><span class="muted s12 grow mf-l">внёс ${E(st.who(actor()))}</span><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="agpGo" id="btnAgPayGo" ${x.ids.length ? "" : "disabled"}>${I("check")}Оплатить</button></div>`, "wide");
  }
  // сверка с агентом: период, долг на начало и конец, выгрузка в Excel
  function agrStart(route) {
    const r = route && st.agentOf(route) ? route : agf().route !== "all" ? agf().route : st.ROUTES[0];
    App.tmp.agr = { route: r, from: isoDay(Date.now() - 30 * u.DAY), to: isoDay(Date.now()) };
    agrModal();
  }
  const agrData = () => { const x = App.tmp.agr; return st.agentRecon(x.route, K.fromISO(x.from), K.fromISO(x.to)); };
  function agrModal() {
    const x = App.tmp.agr; if (!x) return;
    const d = agrData(), a = d.agent || {};
    K.show("agr", `<div class="mh"><div class="mi">${I("scale")}</div><div><h2>Сверка с агентом</h2><div class="muted s13">${E(x.route)} ${E(a.name || "")}${a.contact ? " · " + E(a.contact) : ""}</div></div>${xBtn}</div>
      <div class="fbar agr-f"><div class="seg light sm" data-hl="agr-route">${st.ROUTES.map((k) => `<button type="button" class="${x.route === k ? "on" : ""}" data-act="agrRoute" data-k="${E(k)}">${E(k)}</button>`).join("")}</div>
        <label class="dt"><span>с</span><input class="inp sm" type="date" data-in="agrDate" data-k="from" value="${E(x.from)}" aria-label="Сверка с"></label><label class="dt"><span>по</span><input class="inp sm" type="date" data-in="agrDate" data-k="to" value="${E(x.to)}" aria-label="Сверка по"></label></div>
      <div class="ar-tot agr-tot" data-hl="agr-tot"><div><small>Долг на начало</small><b>${u.usd(d.open)}</b></div><div><small>Начислено</small><b>${u.usd(d.ch)}</b></div><div><small>Оплачено</small><b class="ok">${u.usd(d.pay)}</b></div><div><small>Долг на конец</small><b class="${d.close > 0.5 ? "bad" : "ok"}">${u.usd(d.close)}</b></div></div>
      <div class="tscroll mt"><table class="tbl bare recon"><thead><tr><th>Дата</th><th>Операция</th><th>Цена</th><th class="r">Начислено</th><th class="r">Оплачено</th><th class="r">Долг</th></tr></thead><tbody>
        <tr class="muted"><td>${E(x.from ? u.dFull(K.fromISO(x.from)) : "")}</td><td>Долг на начало периода</td><td></td><td></td><td></td><td class="r">${u.usd(d.open)}</td></tr>
        ${d.ops.map((o) => `<tr><td>${u.dFull(o.at)}</td><td>${E(o.t)}</td><td class="nw" data-rpr="${E(o.id || "")}">${E(o.price || "")}</td><td class="r">${o.ch ? u.usd(o.ch) : ""}</td><td class="r ok">${o.pay ? u.usd(o.pay) : ""}</td><td class="r">${u.usd(o.bal)}</td></tr>`).join("") || '<tr><td colspan="6" class="muted">За период операций нет</td></tr>'}
      </tbody><tfoot><tr><td colspan="3">Итого на ${E(x.to ? u.dFull(K.fromISO(x.to)) : u.dFull(Date.now()))}</td><td class="r">${u.usd(d.ch)}</td><td class="r">${u.usd(d.pay)}</td><td class="r">${u.usd(d.close)}</td></tr></tfoot></table></div>
      <div class="mf"><button class="btn" type="button" data-act="toast" data-t="Сверка отправлена агенту ${E(x.route)}" data-i="send">${I("send")}Отправить агенту</button><button class="btn pri" type="button" data-act="agrDl" id="btnAgrDl">${I("download")}Скачать в Excel</button></div>`, "wide");
  }

  // ---------- «Настройки»: вкладки со справочниками ----------
  const STABS = [["staff", "Сотрудники и доступы"], ["agents", "Агенты"], ["pack", "Упаковка"], ["ins", "Страховка"], ["whs", "Склады в Китае"], ["tk", "Транспортные компании"], ["rates", "Курсы валют"]];
  const setTabs = (cur) => `<div class="stabs-w"><div class="seg light sm stabs" data-hl="stabs">${STABS.map(([k, t]) => `<button type="button" class="${cur === k ? "on" : ""}" data-act="stab" data-k="${k}" data-stab="${k}">${t}</button>`).join("")}</div></div>`;
  const staffPane = App.D.screens.staff;
  const stab = () => (STABS.some((x) => x[0] === App.tmp.stab) ? App.tmp.stab : "staff");
  const SBTN = { agents: ["agNew", "btnAgNew", "Добавить агента"], whs: ["whNew", "btnWhNew", "Добавить склад"], tk: ["tkNew", "btnTkNew", "Добавить ТК"] };
  function settings() {
    const tab = stab(); if (tab === "staff") return staffPane();
    const b = SBTN[tab], body = { agents: dirAgents, pack: dirPack, ins: dirIns, whs: dirWhs, tk: dirTk, rates: dirRates }[tab]();
    return `<div class="pane"><div class="ph"><div><h1>Настройки</h1></div><span class="grow"></span>${b ? `<button class="btn pri" type="button" data-act="${b[0]}" id="${b[1]}">${I("plus")}${b[2]}</button>` : ""}</div>${setTabs(tab)}${body}</div>`;
  }
  const note = (t) => `<div class="note acc-note">${I("info")}${t}</div>`;
  function dirAgents() {
    const rows = st.S.dir.agents.map((a) => { const x = st.agentStats(a.route);
      return `<tr data-dag="${E(a.route)}"><td><b>${E(a.route)}</b></td><td><b>${E(a.name)}</b><div class="muted s12">${E(a.contact || "контакт не указан")}</div></td><td class="nw">${fx(a.rate)} $ ${st.BASIS_T[a.basis]}</td><td class="nw">${a.customs ? fx(a.customs) + " $ за кг" : '<span class="muted">нет</span>'}</td>
        <td class="nw">${a.days ? daysW(a.days) : '<span class="muted">по виду доставки</span>'}</td><td class="stg-t" data-dstg="${E(a.route)}">${(a.stages || []).length ? E(st.stagesText(a)) : '<span class="muted">этапы не заданы</span>'}<div class="muted s12">дата ± ${daysW(a.spread || 0)}, шкала +${u.num(a.grow || 0, (a.grow || 0) % 1 ? 1 : 0)}% в день</div></td><td class="r">${x.n}<div class="muted s12">${x.debt >= 0.5 ? "долг " + u.usd(x.debt) : "долга нет"}</div></td><td class="r"><button class="btn sm" type="button" data-act="agEdit" data-k="${E(a.route)}">${I("edit")}Изменить</button></td></tr>`; }).join("");
    const cr = st.S.dir.clientRoute;
    return `${note("Агент: перевозчик по маршруту. Новый агент сразу появляется в выборе маршрута при отправке и в разделе «Агенты». Сумма агенту по треку = ставка за кг или за м³ плюс растаможка за кг. Срок в пути подставляет ожидаемую дату прибытия. Этапы пути двигают шкалу в кабинете клиента сами, по дням после отправки.")}
      <div class="box dir-box mb12" data-hl="dir-croute"><div class="dir-r"><span><b>Клиент видит маршрут</b><small id="crTxt">${cr ? "маршрут (агент) показывается в кабинете клиента" : "в кабинете клиента маршрут (агент) нигде не показывается"}</small></span><button class="sw${cr ? " on" : ""}" type="button" data-act="crToggle" id="swClientRoute" aria-pressed="${cr ? "true" : "false"}" aria-label="Клиент видит маршрут"><i></i></button></div>
        <p class="muted s12 p0">Сотрудникам маршрут открывается отдельно: «Сотрудники и доступы», переключатель «Показывать маршрут».</p></div>
      <div class="tbx"><table class="tbl" data-hl="dir-agents"><thead><tr><th>Маршрут</th><th>Агент</th><th>Ставка</th><th>Растаможка</th><th>Срок в пути</th><th>Этапы пути для шкалы</th><th class="r">Треков</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function dirPack() {
    const d = App.tmp.dpk || (App.tmp.dpk = Object.assign({}, ...st.PACK.map((k) => ({ [k]: String(st.S.dir.pack[k]).replace(".", ","), ["cny_" + k]: String(st.S.dir.packCny[k] || 0).replace(".", ",") })))), ex = { bag: 20, wbox: 10, crate: 6, pallet: 4 };
    return `${note("Цена упаковки для клиента за одно место ($) и наша цена на складе в Китае за единицу (¥, своя цена склада задаётся в «Складах в Китае»). Стоимость упаковки в отправке считается сама: количество мест каждого вида × цена. Сумму по отдельному грузу можно исправить в его карточке.")}
      <div class="box dir-box" data-hl="dir-pack">${st.PACK.map((k) => `<div class="dir-r"><span><b>${E(st.PACK_RU[k].charAt(0).toUpperCase() + st.PACK_RU[k].slice(1))}</b><small>пример: ${ex[k]} мест = ${u.usd(ex[k] * u.parse(d[k]))}</small></span><span class="dir-2"><label class="dir-in"><input class="inp sm" data-in="dpkIn" data-k="${k}" inputmode="decimal" value="${E(d[k])}" aria-label="Цена для клиента: ${E(st.PACK_RU[k])}" data-enter="#btnPackSave"><em>$ клиенту</em></label><label class="dir-in"><input class="inp sm" data-in="dpkIn" data-k="cny_${k}" inputmode="decimal" value="${E(d["cny_" + k])}" aria-label="Наша цена: ${E(st.PACK_RU[k])}" data-enter="#btnPackSave" data-dpc="${k}"><em>¥ наша цена</em></label></span></div>`).join("")}
        <div class="dir-f"><span class="muted s12">Новые цены применятся к следующим отправкам</span><button class="btn pri" type="button" data-act="packSave" id="btnPackSave">${I("check")}Сохранить цены</button></div></div>`;
  }
  function dirIns() {
    const v = App.tmp.dins != null ? App.tmp.dins : String(st.S.dir.insPct).replace(".", ","), p = u.parse(v);
    return `${note("Страховка: процент от объявленной стоимости груза. Стоимость груза вносится при организации упаковки или отправке, сумма страховки считается сама и правится в карточке груза.")}
      <div class="box dir-box" data-hl="dir-ins"><div class="dir-r"><span><b>Процент страховки</b><small id="insEx">груз стоимостью $ 5 000: страховка ${u.usd((5000 * p) / 100)}</small></span><label class="dir-in"><input class="inp sm" data-in="dinsIn" inputmode="decimal" value="${E(v)}" aria-label="Процент страховки" data-enter="#btnInsSave"><em>% от стоимости</em></label></div>
        <div class="dir-f"><span class="muted s12">Новый процент применится к следующим отправкам</span><button class="btn pri" type="button" data-act="insSave" id="btnInsSave">${I("check")}Сохранить</button></div></div>`;
  }
  function dirWhs() {
    return `${note("Адреса складов для поставщиков: клиент копирует адрес и отправляет поставщику, тот пишет код клиента на каждой коробке. Адреса видны в карточке клиента и в его приложении.")}
      <div class="whs" data-hl="dir-whs">${st.S.dir.whs.map((w) => `<div class="box whc" data-dwh="${E(w.id)}"><div class="row"><h3 class="grow">${I("wh")}${E(w.ru)}${w.zh ? ` <span class="muted">${E(w.zh)}</span>` : ""}</h3><button class="btn sm" type="button" data-act="whEdit" data-k="${E(w.id)}">${I("edit")}Изменить</button></div>
        <p class="muted s12 p0 mb8">${E(w.city || "город не указан")}</p>
        <div class="addr"><b>По-русски</b><span>${E(w.addrRu || "не указан")}</span>${w.addrRu ? K.copyBtn(w.addrRu, "Адрес") : ""}</div><div class="addr"><b>По-китайски</b><span>${E(w.addr || "не указан")}</span>${w.addr ? K.copyBtn(w.addr, "Адрес") : ""}</div></div>`).join("")}</div>`;
  }
  function dirTk() {
    return `${note("Транспортные компании для выдачи: их выбирают в окне «Выдать» и в карточке клиента. Новая компания появляется в выборе сразу.")}
      <div class="tbx"><table class="tbl" data-hl="dir-tk"><thead><tr><th>Компания</th><th>Контакт</th><th>Примечание</th><th class="r">Выдач</th><th></th></tr></thead><tbody>
        ${st.S.dir.tks.map((t, i) => `<tr data-dtk="${i}"><td><b>${E(t.name)}</b></td><td class="nw">${E(t.contact || "")}</td><td class="muted">${E(t.note || "")}</td><td class="r">${st.S.ships.filter((s) => s.issue && s.issue.tk === t.name).length}</td><td class="r"><button class="btn sm" type="button" data-act="tkEdit" data-k="${i}">${I("edit")}Изменить</button></td></tr>`).join("")}
      </tbody></table></div>`;
  }
  // курсы: ЦБ на дату (обновляется автоматически каждый день), надбавка в процентах, ручной курс перекрывает ЦБ, итоговый курс и источник
  const drtDraft = () => App.tmp.drt || (App.tmp.drt = Object.assign({}, ...st.RATE_K.map((k) => { const x = st.S.dir.rates.items[k]; return { [k]: { markup: String(x.markup || 0).replace(".", ","), manual: x.manual > 0 && x.cb ? String(x.manual).replace(".", ",") : x.cb ? "" : String(x.manual || 1).replace(".", ",") } }; })));
  const drtCalc = (k) => { const x = st.S.dir.rates.items[k], d = drtDraft()[k]; return { rate: st.rateOf({ cb: x.cb, markup: x.cb ? u.parse(d.markup) : 0, manual: u.parse(d.manual) > 0 ? u.parse(d.manual) : x.cb ? null : x.manual }), manual: !x.cb || u.parse(d.manual) > 0 }; };
  const srcPill = (m) => (m ? '<span class="st" data-st="pack">вручную</span>' : '<span class="st" data-st="in">ЦБ</span>');
  function dirRates() {
    const d = drtDraft(), r = st.S.dir.rates;
    const rows = st.RATE_K.map((k) => { const x = r.items[k], c = drtCalc(k), sv = st.rateSrc(x) === "manual";
      return `<tr data-rate="${k}"><td><b>${E(st.CUR[k].t)}</b><div class="muted s12">${E(st.CUR[k].s)} за 1 $</div></td>
        <td class="nw">${x.cb ? `<b>${u.num(x.cb, 2)}</b><div class="muted s12">ЦБ на ${u.dFull(r.cbAt)}</div>` : '<span class="muted">нет, только вручную</span>'}</td>
        <td>${x.cb ? `<label class="dir-in"><input class="inp sm" data-in="drtIn" data-k="${k}" data-f="markup" inputmode="decimal" value="${E(d[k].markup)}" aria-label="Надбавка: ${E(st.CUR[k].t)}" data-enter="#btnRatesSave"><em>%</em></label>` : '<span class="muted">нет</span>'}</td>
        <td><input class="inp sm rt-man" data-in="drtIn" data-k="${k}" data-f="manual" inputmode="decimal" value="${E(d[k].manual)}" placeholder="${x.cb ? "не задан" : "обязательно"}" aria-label="Ручной курс: ${E(st.CUR[k].t)}" data-enter="#btnRatesSave"></td>
        <td class="r"><b data-rf="${k}">${u.num(c.rate, 2)}</b></td><td data-rs="${k}">${srcPill(c.manual)}</td>
        <td class="r">${x.cb && sv ? `<button class="btn sm" type="button" data-act="rateCb" data-k="${k}" data-rcb="${k}">${I("refresh")}Вернуть курс ЦБ</button>` : ""}</td></tr>`; }).join("");
    return `${note(`Курс доллара обновляется автоматически каждый день по ЦБ РФ. К курсу ЦБ можно добавить свою надбавку в процентах или задать курс вручную: ручной курс перекрывает ЦБ, пока его не вернуть кнопкой «Вернуть курс ЦБ». У USDT курс только ручной. Итоговый курс подставляется в окно оплаты и в оплату при выдаче.`)}
      <div class="tbx"><table class="tbl" data-hl="dir-rates"><thead><tr><th>Валюта</th><th>Курс ЦБ</th><th>Надбавка</th><th>Ручной курс</th><th class="r">Итоговый курс</th><th>Источник</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="dir-f rates-f"><span class="muted s12" id="ratesAt">Курс ЦБ на ${u.dFull(r.cbAt)}, обновляется автоматически. Изменено ${u.dFull(r.at)} в ${u.hm(r.at)} · ${E(st.who(r.by))}</span><button class="btn pri" type="button" data-act="ratesSave" id="btnRatesSave">${I("check")}Сохранить курсы</button></div>`;
  }
  // окна справочников: агент, склад, транспортная компания
  function agModal() {
    const d = App.tmp.agd; if (!d) return;
    const err = d.id ? "" : st.agentCheck(d.route, true);
    K.show("agd", `<div class="mh"><div class="mi">${I("route")}</div><div><h2>${d.id ? "Изменить агента" : "Новый агент"}</h2><div class="muted s13">Маршрут и ставка. Изменения применятся к следующим отправкам и попадут в историю действий.</div></div>${xBtn}</div>
      <div class="row2"><div class="fld"><span>Маршрут <b>*</b></span>${d.id ? `<div class="inp ro">${E(d.id)}</div>` : `<div class="ttf${err && d.route ? " err" : ""}"><input class="inp mono" data-in="agdIn" data-k="route" value="${E(d.route)}" maxlength="8" placeholder="Например: 92G" autocomplete="off" autocapitalize="characters" spellcheck="false" data-hl="agd-route"><div class="ttf-m" id="agdMsg" role="status">${E(err || "Маршрут свободен")}</div></div>`}</div>
        <label class="fld"><span>Название компании</span><input class="inp" data-in="agdIn" data-k="name" value="${E(d.name)}" placeholder="Например: Восточный Экспресс" autocomplete="off"></label></div>
      <div class="fld mt"><span>Как считаем</span><div class="choice cols2">${[["kg", "За килограмм"], ["m3", "За кубометр"]].map(([k, t]) => `<button type="button" class="${d.basis === k ? "on" : ""}" data-act="agdBasis" data-k="${k}">${t}</button>`).join("")}</div></div>
      <div class="row3 mt"><label class="fld"><span>Ставка, $ ${st.BASIS_T[d.basis]}</span><input class="inp" data-in="agdIn" data-k="rate" inputmode="decimal" value="${E(d.rate)}" placeholder="0"></label><label class="fld"><span>Растаможка, $ за кг</span><input class="inp" data-in="agdIn" data-k="customs" inputmode="decimal" value="${E(d.customs)}" placeholder="0"></label><label class="fld"><span>Срок в пути, дней</span><input class="inp" data-in="agdIn" data-k="days" inputmode="numeric" value="${E(d.days)}" placeholder="0"></label></div>
      <label class="fld mt"><span>Контакт</span><input class="inp" data-in="agdIn" data-k="contact" value="${E(d.contact)}" placeholder="+7 900 000-00-00" autocomplete="off"></label>
      <div class="found mt" id="agdEx">${agdEx(d)}</div>
      <h3 class="h3 mt2">Шкала пути в кабинете клиента</h3>
      <p class="muted s12 p0 mb8">После отправки шкала сама идёт по дням: в нужный день меняется этап, внутри этапа шкала подрастает каждый день. До отметки «Прибыл в Москву» она не заполняется до конца (не больше ${st.TRIP_CEIL}%).</p>
      <div class="fld"><span>Этапы: название и через сколько дней после отправки</span><div class="stgs" data-hl="agd-stages">${d.stages.map((x, i) => `<div class="stg-r" data-stg="${i}"><input class="inp" data-in="agdStg" data-i="${i}" data-k="name" value="${E(x.name)}" placeholder="Например: На границе" aria-label="Название этапа" autocomplete="off"><label class="stg-d"><input class="inp" data-in="agdStg" data-i="${i}" data-k="day" inputmode="decimal" value="${E(x.day)}" placeholder="0" aria-label="Через сколько дней"><em>дн.</em></label><button class="x sm" type="button" data-act="agdStgDel" data-i="${i}" aria-label="Убрать этап">${I("x")}</button></div>`).join("") || '<p class="muted s12 p0">Этапов нет: шкала идёт равномерно по сроку в пути.</p>'}</div>
        <button class="btn sm mt8" type="button" data-act="agdStgAdd" id="btnStgAdd">${I("plus")}Добавить этап</button></div>
      <div class="row2 mt"><label class="fld"><span>Дата прибытия диапазоном, ± дней</span><input class="inp" data-in="agdIn" data-k="spread" inputmode="numeric" value="${E(d.spread)}" placeholder="0"></label><label class="fld"><span>Шкала подрастает, % в день</span><input class="inp" data-in="agdIn" data-k="grow" inputmode="decimal" value="${E(d.grow)}" placeholder="0"></label></div>
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="agdGo" id="btnAgdGo" ${err ? "disabled" : ""}>${I("check")}${d.id ? "Сохранить" : "Добавить агента"}</button></div>`, "wide");
  }
  const agdEx = (d) => { const w = 240, v = 1.6, sum = (d.basis === "m3" ? v * u.parse(d.rate) : w * u.parse(d.rate)) + u.parse(d.customs) * w; return `${I("dollar")}<span>Груз ${u.kg(w)}, ${u.vol(v)}: агенту <b>${u.usd(sum)}</b><small>${u.parse(d.days) > 0 ? "прибытие через " + daysW(Math.round(u.parse(d.days))) + " после отправки" : "срок в пути по виду доставки"}</small></span>`; };
  function whModal() {
    const d = App.tmp.whd; if (!d) return;
    const f = (k, t, ph) => `<label class="fld mt"><span>${t}</span><input class="inp" data-in="whdIn" data-k="${k}" value="${E(d[k])}" placeholder="${ph}" autocomplete="off"></label>`;
    K.show("whd", `<div class="mh"><div class="mi">${I("wh")}</div><div><h2>${d.id ? "Изменить склад" : "Новый склад в Китае"}</h2><div class="muted s13">Адрес для поставщиков на русском и китайском</div></div>${xBtn}</div>
      <div class="row2"><label class="fld"><span>Название</span><input class="inp" data-in="whdIn" data-k="ru" value="${E(d.ru)}" placeholder="Например: Иу" autocomplete="off" data-hl="whd-ru"></label><label class="fld"><span>Название по-китайски</span><input class="inp" data-in="whdIn" data-k="zh" value="${E(d.zh)}" placeholder="义乌" autocomplete="off"></label></div>
      ${f("city", "Город и провинция", "Иу, провинция Чжэцзян")}${f("addrRu", "Адрес по-русски", "Город, район, улица, дом, склад")}${f("addr", "Адрес по-китайски", "市 区 街道 号 仓")}
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="whdGo" id="btnWhdGo">${I("check")}${d.id ? "Сохранить" : "Добавить склад"}</button></div>`, "wide");
  }
  function tkModal() {
    const d = App.tmp.tkd; if (!d) return;
    const dup = st.S.dir.tks.some((t, j) => String(j) !== String(d.i) && t.name.toLowerCase() === String(d.name).trim().toLowerCase());
    K.show("tkd", `<div class="mh"><div class="mi">${I("truck")}</div><div><h2>${d.i !== "" ? "Изменить транспортную компанию" : "Новая транспортная компания"}</h2><div class="muted s13">Появится в выборе при выдаче и в карточке клиента</div></div>${xBtn}</div>
      <label class="fld"><span>Название <b>*</b></span><input class="inp" data-in="tkdIn" data-k="name" value="${E(d.name)}" placeholder="Например: Байкал Сервис" autocomplete="off" data-hl="tkd-name"></label>
      <div class="ttf-m${dup ? " bad" : ""}" id="tkdMsg">${dup ? "Такая компания уже есть" : "Обязательно только название"}</div>
      <div class="row2 mt"><label class="fld"><span>Контакт</span><input class="inp" data-in="tkdIn" data-k="contact" value="${E(d.contact)}" placeholder="+7 900 000-00-00" autocomplete="off"></label><label class="fld"><span>Примечание</span><input class="inp" data-in="tkdIn" data-k="note" value="${E(d.note)}" placeholder="Например: сборные грузы" autocomplete="off"></label></div>
      <div class="mf"><button class="btn" type="button" data-act="closeDesk">Отмена</button><button class="btn pri" type="button" data-act="tkdGo" id="btnTkdGo" ${!String(d.name).trim() || dup ? "disabled" : ""}>${I("check")}Сохранить</button></div>`);
  }

  // ---------- быстрый поиск груза в шапке рабочего места: наш трек, китайский трек, код клиента, наименование ----------
  const qsHtml = () => `<div class="qs ta" data-hl="qs"><span class="ta-i">${I("search")}</span><input class="inp" id="qsIn" data-in="qsQ" value="" placeholder="Найти груз: трек, китайский трек, код, наименование" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-label="Быстрый поиск груза"><div class="ta-l" id="qsL" hidden></div></div>`;
  const ST_T = (s) => (s.status === "way" ? "в пути" : s.status === "arrived" ? (st.SUB[s.sub] || "прибыл").toLowerCase() : K.issuedText(s).toLowerCase());
  function qsFind(q) {
    const s = String(q || "").trim().toUpperCase(); if (s.length < 2) return [];
    const out = [], has = (list) => list.some((x) => String(x || "").toUpperCase().includes(s)), score = (id) => (String(id).toUpperCase().indexOf(s) === 0 ? 0 : String(id).toUpperCase().includes(s) ? 1 : 2);
    st.S.ships.filter(vis).forEach((x) => { if (has([x.id, x.clientId, cname(x.clientId), cg(x).name].concat(recTracks(x)))) out.push({ t: "ship", id: x.id, sc: score(x.id), sub: `${x.clientId} · ${cg(x).name || "груз"} · ${ST_T(x)}`, tr: recTracks(x).find((y) => y.toUpperCase().includes(s)) }); });
    st.ready().filter(vis).forEach((x) => { const tr = x.receiptIds.map((id) => (st.rec(id) || {}).track).filter(Boolean); if (has([x.id, x.clientId, cname(x.clientId), x.name].concat(tr))) out.push({ t: "cargo", id: x.id, sc: score(x.id), sub: `${x.clientId} · ${x.name || "груз"} · упакован`, tr: tr.find((y) => y.toUpperCase().includes(s)) }); });
    st.openTasks().filter(vis).forEach((x) => { const tr = x.receiptIds.map((id) => (st.rec(id) || {}).track).filter(Boolean); if (has([x.id, x.clientId, cname(x.clientId), x.name].concat(tr))) out.push({ t: "task", id: x.id, sc: score(x.id), sub: `${x.clientId} · ${x.name || "заказ на упаковку"} · на упаковке`, tr: tr.find((y) => y.toUpperCase().includes(s)) }); });
    st.S.receipts.filter((r) => !r.taskId && !r.cargoId && vis(r)).forEach((r) => { if (has([r.id, r.track, r.clientId, r.clientId ? cname(r.clientId) : "", r.what, r.supplier])) out.push({ t: "rec", id: r.id, sc: score(r.track || r.id), title: r.track || r.id, sub: `${r.clientId || "без кода"} · ${r.supplier || "поставщик не указан"} · на складе ${K.whn(r.wh)}` }); });
    return out.sort((a, b) => a.sc - b.sc).slice(0, 8);
  }
  function qsPaint(v) {
    const l = $("qsL"); if (!l) return;
    const list = qsFind(v);
    l.innerHTML = String(v || "").trim().length < 2 ? '<p class="muted s13">Начните вводить: трек TT, китайский трек, код клиента или наименование</p>'
      : list.map((x, i) => `<button type="button" class="${i === 0 ? "hl" : ""}" data-act="qsGo" data-t="${x.t}" data-id="${E(x.id)}" data-qs="${E(x.id)}" tabindex="-1"><b class="mono">${E(x.title || x.id)}</b><span>${E(x.sub)}${x.tr ? " · китайский трек " + E(x.tr) : ""}</span></button>`).join("") || '<p class="muted s13">Ничего не нашли</p>';
    l.hidden = false;
  }
  const qsHide = () => { const l = $("qsL"); if (l) l.hidden = true; };
  document.addEventListener("focusin", (e) => { if (e.target && e.target.id === "qsIn") qsPaint(e.target.value); });
  document.addEventListener("focusout", (e) => { if (e.target && e.target.id === "qsIn") setTimeout(() => { if (document.activeElement !== e.target) qsHide(); }, 180); });
  document.addEventListener("keydown", (e) => {
    if (!e.target || e.target.id !== "qsIn") return;
    const l = $("qsL"), items = l ? [...l.querySelectorAll("button")] : [], i = items.findIndex((b) => b.classList.contains("hl"));
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (l.hidden) { qsPaint(e.target.value); return; } if (!items.length) return; const n = (i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length; items.forEach((b, j) => b.classList.toggle("hl", j === n)); }
    else if (e.key === "Enter") { e.preventDefault(); const b = items[Math.max(0, i)]; if (b && !l.hidden) b.click(); }
    else if (e.key === "Escape") { e.stopPropagation(); qsHide(); }
  }, true);

  // ---------- действия ----------
  Object.assign(App.acts, {
    // оплаты клиентов по трекам
    ptSel: (d) => {
      const s = st.ship(d.id); if (!s || st.debtOf(s) <= 0.5) return;
      const sel = ptSel();
      if (sel.length && st.ship(sel[0]).clientId !== s.clientId) { App.tmp.psel2 = [s.id]; App.toast("В одну оплату идут треки одного клиента: выбор начат заново", "info"); }
      else { const i = sel.indexOf(s.id); if (i >= 0) sel.splice(i, 1); else sel.push(s.id); }
      App.refresh(true);
    },
    ptPay: () => { const sel = ptSel(); if (!sel.length) return; App.tmp.pay = null; App.D.payModal(st.ship(sel[0]).clientId, sel.slice()); },
    pOver: () => { const f = pf(); f.over = !f.over; App.tmp.pview = "tracks"; App.refresh(true); },
    pfClear: () => { App.tmp.pf = pfDef(); App.refresh(true); },
    pfPer: (d) => { const f = pf(); f.per = d.k; if (d.k === "range") App.D.rangeInit(f); App.tmp.pview = "tracks"; App.refresh(true); },
    agPer: (d) => { const f = agf(); f.per = d.k; if (d.k === "range") App.D.rangeInit(f); App.refresh(true); },
    // деньги по грузу
    monOpen: (d) => monStart(d.id),
    monIns: () => { const m = App.tmp.mon; if (!m) return; m.insUsd = String(st.insCalc(u.parse(m.value))); monModal(); },
    monBack: () => { const m = App.tmp.mon; App.tmp.mon = null; if (m && st.ship(m.id)) App.D.openItem("ship", m.id); else App.closeDesk(); },
    // смена способа: текущая сумма переносится в поле «Суммой», чтобы её было удобно поправить
    monMode: (d) => { const m = App.tmp.mon; if (!m) return; if (d.w === "d") { m.deliv = v2(monDeliv(m)); m.dmode = d.k; } else { m.agentUsd = v2(monAgent(m)); m.amode = d.k; } monModal(); },
    monBasis: (d) => { const m = App.tmp.mon; if (!m) return; m[d.w === "d" ? "dbasis" : "abasis"] = d.k; monModal(); },
    // ссылка из карточки: открыть «Расходы и прибыль» с этим грузом, там суммы правятся
    monProfit: (d) => { const s = st.ship(d.id); if (!s) return; App.tmp.period = Math.max(App.tmp.period || 90, st.ageDays(s) + 2); App.go.desk("profit"); setTimeout(() => { App.D.openItem("ship", s.id); scn("monProfit", s.id); }, 320); },
    monGo: () => {
      const m = App.tmp.mon; if (!m || !canMoney()) return;
      const x = { dmode: m.dmode, drate: u.parse(m.drate), dbasis: m.dbasis, amode: m.amode, arate: u.parse(m.arate), abasis: m.abasis }; MON_F.forEach(([k]) => { x[k] = u.parse(m[k]); });
      const s = st.setMoney(m.id, x, actor()); App.tmp.mon = null;
      if (s) { App.D.openItem("ship", s.id); App.toast(`Деньги по грузу ${s.id} сохранены: итого клиенту ${u.usd(s.cost)}. Запись в истории`, "dollar"); scn("money", s); }
    },
    // агенты
    agF: (d) => { const f = agf(); f.route = f.route === d.k && d.k !== "all" ? "all" : d.k; App.refresh(true); scn("agf", f.route); },
    agOver: () => { const f = agf(); f.over = !f.over; App.refresh(true); },
    agClear: () => { App.tmp.agf = agfDef(); App.refresh(true); },
    agSel: (d) => {
      const s = st.ship(d.id); if (!s || st.agentDebt(s) < 0.5) return;
      const sel = agSel();
      if (sel.length && st.ship(sel[0]).route !== s.route) { App.tmp.asel2 = [s.id]; App.toast("В одну оплату идут треки одного агента: выбор начат заново", "info"); }
      else { const i = sel.indexOf(s.id); if (i >= 0) sel.splice(i, 1); else sel.push(s.id); }
      App.refresh(true);
    },
    agPayOpen: () => { const sel = agSel(); if (sel.length) agPayStart(st.ship(sel[0]).route, sel.slice()); },
    agpSel: (d) => { const x = App.tmp.agp; if (!x) return; const i = x.ids.indexOf(d.id); if (i >= 0) x.ids.splice(i, 1); else x.ids.push(d.id); x.auto = true; agAuto(); agPayModal(); },
    agpAll: () => { const x = App.tmp.agp; if (!x) return; const l = agOpen(x.route); x.ids = x.ids.length === l.length ? [] : l.map((s) => s.id); x.auto = true; agAuto(); agPayModal(); },
    agpWay: (d) => { const x = App.tmp.agp; if (x) { x.method = d.k; agPayModal(); } },
    agpFill: () => { const x = App.tmp.agp; if (!x) return; x.note = x.note || "две партии одним платежом"; agPayModal(); },
    agpGo: () => {
      const x = App.tmp.agp; if (!x || !x.ids.length) return;
      const amt = u.parse(x.amount); if (!(amt > 0)) { App.toast("Укажите сумму", "info"); return; }
      const at = K.fromISO(x.date), p = st.agentPay(x.route, x.ids.slice(), { amount: amt, at: at && K.dISO(at) !== K.dISO(Date.now()) ? at : Date.now(), method: x.method, note: x.note, by: actor() });
      App.tmp.agp = null; App.tmp.asel2 = []; App.closeDesk();
      if (p) { App.toast(`Оплата агенту ${p.route}: ${u.usd(p.amount)} за ${st.tracksWord(p.shipIds.length)}. Карточки агентов пересчитаны`, "wallet"); scn("agentpaid", p); }
    },
    agRecon: () => agrStart(null),
    agrRoute: (d) => { const x = App.tmp.agr; if (x) { x.route = d.k; agrModal(); } },
    agrDl: () => { const x = App.tmp.agr, d = agrData(); K.csvDl("sverka_agent_" + x.route + "_" + K.today() + ".csv", [["Сверка с агентом", x.route + " " + ((d.agent || {}).name || "")], ["Период", u.dFull(K.fromISO(x.from)) + " – " + u.dFull(K.fromISO(x.to))], [], ["Дата", "Операция", "Цена", "Начислено, $", "Оплачено, $", "Долг, $"], ["", "Долг на начало периода", "", "", "", d.open]]
      .concat(d.ops.map((o) => [u.dFull(o.at), o.t, o.price || "", o.ch || "", o.pay || "", o.bal])).concat([["", "Итого", "", d.ch, d.pay, d.close]]), "Сверка с агентом " + x.route + " скачана, открывается в Excel"); },
    agExport: () => K.csvDl("agenty_" + K.today() + ".csv", [["Агент", "Название", "Трек", "Клиент", "Вес, кг", "Объём, м³", "Плотность, кг/м³", "Цена", "Сумма, $", "Оплачено, $", "Статус", "Дней с отправки"]]
      .concat(agList().map((s) => { const t = st.totals(s); return [s.route, agName(s.route), s.id, s.clientId, Math.round(t.weight), u.num(t.volume, 2), t.volume ? Math.round(t.weight / t.volume) : 0, st.agentPrice(s).t + (st.agentPrice(s).mark === "своя" ? " (своя)" : ""), s.agentUsd, s.agentPaid || 0, st.agentIsPaid(s) ? "оплачено" : "не оплачено", st.ageDays(s)]; }))),
    // настройки
    stab: (d) => { App.tmp.stab = d.k; App.tmp.dpk = null; App.tmp.dins = null; App.tmp.drt = null; App.refresh(true); scn("stab", d.k); },
    agNew: () => { App.tmp.agd = { id: null, route: "", name: "", basis: "kg", rate: "", customs: "", days: "", contact: "", stages: [{ name: "На границе", day: "" }, { name: "Таможенное оформление", day: "" }], spread: "2", grow: "1,5" }; agModal(); },
    agEdit: (d) => { const a = st.agentOf(d.k); if (!a) return; App.tmp.agd = { id: a.route, route: a.route, name: a.name, basis: a.basis, rate: String(a.rate).replace(".", ","), customs: String(a.customs || "").replace(".", ","), days: String(a.days || ""), contact: a.contact || "",
      stages: (a.stages || []).map((x) => ({ name: x.name, day: String(x.day).replace(".", ",") })), spread: String(a.spread || 0), grow: String(a.grow || 0).replace(".", ",") }; agModal(); },
    agdStgAdd: () => { const x = App.tmp.agd; if (x && x.stages.length < 8) { x.stages.push({ name: "", day: "" }); agModal(); } },
    agdStgDel: (d) => { const x = App.tmp.agd; if (x) { x.stages.splice(+d.i, 1); agModal(); } },
    crToggle: () => { const v = !st.S.dir.clientRoute; st.routeSave(v, actor()); App.refresh(true); App.toast(v ? "Клиенты видят маршрут в своём кабинете" : "Маршрут скрыт из кабинета клиентов", "route"); scn("croute", v); },
    agdBasis: (d) => { const x = App.tmp.agd; if (x) { x.basis = d.k; agModal(); } },
    agdFill: () => { const x = App.tmp.agd; if (!x) return; if (!x.id && st.agentCheck(x.route, true)) x.route = ["92G", "93G", "95G"].find((r) => !st.agentOf(r)) || x.route; x.name = x.name || "Восточный Экспресс"; x.rate = x.rate || "1,3"; x.customs = x.customs || "0,25"; x.days = x.days || "15"; x.contact = x.contact || "+7 900 000-00-55"; x.stages.forEach((y, i) => { if (!y.day) y.day = i ? "12" : "4"; }); agModal(); },
    agdGo: () => {
      const x = App.tmp.agd; if (!x || (!x.id && st.agentCheck(x.route, true))) return;
      const a = st.agentSave({ id: x.id, route: x.route, name: x.name, basis: x.basis, rate: u.parse(x.rate), customs: u.parse(x.customs), days: u.parse(x.days), contact: x.contact, stages: x.stages.map((y) => ({ name: y.name, day: u.parse(y.day) })), spread: u.parse(x.spread), grow: u.parse(x.grow) }, actor());
      App.tmp.agd = null; App.closeDesk(); if (a) App.toast(`${x.id ? "Агент изменён" : "Агент добавлен"}: ${a.route} ${a.name}. Маршрут есть в окне «Отправить»`, "route");
    },
    packSave: () => { const n = st.packSave(Object.assign({}, ...st.PACK.map((k) => ({ [k]: u.parse((App.tmp.dpk || {})[k]) }))), actor()) + st.chwPriceSave("all", Object.assign({}, ...st.PACK.map((k) => ({ [k]: u.parse((App.tmp.dpk || {})["cny_" + k]) }))), actor()); App.tmp.dpk = null; App.refresh(true); App.toast(n ? "Цены упаковки сохранены: применятся к следующим отправкам" : "Цены не изменились", n ? "check" : "info"); },
    insSave: () => { const ok = st.insSave(u.parse(App.tmp.dins != null ? App.tmp.dins : st.S.dir.insPct), actor()); App.tmp.dins = null; App.refresh(true); App.toast(ok ? `Страховка ${fx(st.S.dir.insPct)}% сохранена: применится к следующим отправкам` : "Процент не изменился", ok ? "check" : "info"); },
    ratesSave: () => { const d = drtDraft(), n = st.ratesSave(Object.assign({}, ...st.RATE_K.map((k) => ({ [k]: { markup: u.parse(d[k].markup), manual: u.parse(d[k].manual) } }))), actor()); App.tmp.drt = null; App.refresh(true); App.toast(n ? "Курсы валют сохранены: итоговый курс подставится в оплату" : "Курсы не изменились", n ? "check" : "info"); },
    rateCb: (d) => { const ok = st.rateCb(d.k, actor()); App.tmp.drt = null; App.refresh(true); if (ok) App.toast(`${st.CUR[d.k].t}: снова курс ЦБ с надбавкой, ${u.num(st.CUR[d.k].rate, 2)} ${st.CUR[d.k].s} за 1 $`, "refresh"); },
    whNew: () => { App.tmp.whd = { id: null, ru: "", zh: "", city: "", addrRu: "", addr: "" }; whModal(); },
    whEdit: (d) => { const w = st.S.dir.whs.find((x) => x.id === d.k); if (!w) return; App.tmp.whd = Object.assign({}, w); whModal(); },
    whdGo: () => { const x = App.tmp.whd; if (!x) return; const w = st.whSave(x, actor()); App.tmp.whd = null; App.closeDesk(); if (w) App.toast(`Склад ${w.ru} сохранён, адрес виден в карточках клиентов`, "wh"); },
    tkNew: () => { App.tmp.tkd = { i: "", name: "", contact: "", note: "" }; tkModal(); },
    tkEdit: (d) => { const t = st.S.dir.tks[+d.k]; if (!t) return; App.tmp.tkd = Object.assign({ i: String(d.k) }, t); tkModal(); },
    tkdGo: () => { const x = App.tmp.tkd; if (!x) return; const t = st.tkSave(x, actor()); if (!t) { App.toast("Укажите название, без повторов", "info"); return; } App.tmp.tkd = null; App.closeDesk(); App.toast(`Транспортная компания ${t.name} сохранена: она есть в окне «Выдать»`, "truck"); },
    // быстрый поиск
    qsGo: (d) => { const inp = $("qsIn"); qsHide(); if (inp) { inp.value = ""; inp.blur(); } App.D.openItem(d.t, d.id); scn("qs", d.id); },
  });
  Object.assign(App.ins, {
    pfQ: (v) => { pf().q = v; App.refresh(true); },
    monIn: (v, el) => { const m = App.tmp.mon; if (!m) return; m[el.dataset.k] = v; const o = $("monSum"); if (o) o.innerHTML = monSum(m); ["d", "a"].forEach((w) => { const c = $("monCalc" + w); if (c) c.innerHTML = modeCalc(m, w); }); },
    sndVal: (v, el) => { const d = App.tmp.snd; if (!d) return; (d.values = d.values || {})[el.dataset.k] = v; const c = st.cargo(el.dataset.k), o = document.querySelector(`[data-svc="${el.dataset.k}"]`); if (c && o) o.innerHTML = svText(c, d); },
    agQ: (v) => { agf().q = v; App.refresh(true); },
    pfDate: (v, el) => { pf()[el.dataset.k] = v; App.refresh(true); },
    agDate: (v, el) => { agf()[el.dataset.k] = v; App.refresh(true); },
    agpIn: (v, el) => { const x = App.tmp.agp; if (!x) return; x[el.dataset.k] = v; if (el.dataset.k === "amount") x.auto = false; const o = $("agpSum"); if (o) o.innerHTML = agSumHtml(x); },
    agrDate: (v, el) => { const x = App.tmp.agr; if (!x) return; x[el.dataset.k] = v; agrModal(); },
    dpkIn: (v, el) => { const d = App.tmp.dpk; if (d) d[el.dataset.k] = v; },
    dinsIn: (v) => { App.tmp.dins = v; const o = $("insEx"); if (o) o.textContent = "груз стоимостью $ 5 000: страховка " + u.usd((5000 * u.parse(v)) / 100); },
    drtIn: (v, el) => { const d = drtDraft(), k = el.dataset.k; d[k][el.dataset.f] = v; const c = drtCalc(k), f = document.querySelector(`[data-rf="${k}"]`), sr = document.querySelector(`[data-rs="${k}"]`); if (f) f.textContent = u.num(c.rate, 2); if (sr) sr.innerHTML = srcPill(c.manual); },
    agdIn: (v, el) => { const x = App.tmp.agd; if (!x) return; x[el.dataset.k] = v; const ex = $("agdEx"); if (ex) ex.innerHTML = agdEx(x); if (el.dataset.k !== "route" || x.id) return; const err = st.agentCheck(v, true), box = el.closest(".ttf"), msg = $("agdMsg"), b = $("btnAgdGo"); if (box) box.classList.toggle("err", !!err && !!v); if (msg) msg.textContent = err || "Маршрут свободен"; if (b) b.disabled = !!err; },
    whdIn: (v, el) => { if (App.tmp.whd) App.tmp.whd[el.dataset.k] = v; },
    agdStg: (v, el) => { const x = App.tmp.agd; if (x && x.stages[+el.dataset.i]) x.stages[+el.dataset.i][el.dataset.k] = v; },
    tkdIn: (v, el) => { const x = App.tmp.tkd; if (!x) return; x[el.dataset.k] = v; if (el.dataset.k !== "name") return; const dup = st.S.dir.tks.some((t, j) => String(j) !== String(x.i) && t.name.toLowerCase() === v.trim().toLowerCase()), m = $("tkdMsg"), b = $("btnTkdGo"); if (m) { m.textContent = dup ? "Такая компания уже есть" : "Обязательно только название"; m.classList.toggle("bad", dup); } if (b) b.disabled = dup || !v.trim(); },
    qsQ: (v) => qsPaint(v),
  });
  Object.assign(App.chg, {
    pfC: (v) => { pf().c = v; App.refresh(true); },
    pfSt: (v) => { pf().st = v; App.refresh(true); },
    agSt: (v) => { agf().st = v; App.refresh(true); },
  });
  Object.assign(App.D.screens, { agents, staff: settings });
  Object.assign(App.D.modals, { mon: () => monModal(), agp: () => agPayModal(), agr: () => agrModal(), agd: () => agModal(), whd: () => whModal(), tkd: () => tkModal() });
  Object.assign(App.D, { payTracks, payTracksCsv, moneyBox, sendCalc, setTabs, qsHtml, qsFind, monStart, agPayStart, agrStart });
})(window.App);
