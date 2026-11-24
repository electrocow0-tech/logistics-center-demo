/* Телефон склада в Москве (слот 2, только русский): «Грузы», «Фотоотчёт», «Архив», «Финансы».
   Экраны подключаются к phone.js через App.PX.msk: phone.js сам отдаёт им отрисовку, вкладки и проверку экранов. */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, I = u.icon, E = u.esc, K = App.P.kit, SLOT = 2, BY = "sergey";
  const go = (s, p) => App.go.phone(SLOT, s, p == null ? null : p);
  // перерисовать экран на месте, не теряя прокрутку
  const rr = () => { const v = App.sq(SLOT, ".pview"), top = v.scrollTop; App.renderSlot(SLOT, false); v.scrollTop = top; };
  const q = (sel) => App.sq(SLOT, sel);
  const chk = (ev, d) => { if (App.scenario) App.scenario.check(ev, d); };
  const dec = () => { if (App.scenario) App.scenario.decorate(); };
  const line = K.line, empty = K.empty;
  const pill = (s, label) => `<span class="st" data-st="${s}">${label}</span>`;
  const SUB_ST = { store: "wait", ready: "in", issuing: "pack" };
  const subPill = (s) => pill(SUB_ST[s.sub] || "arrived", E(st.SUB[s.sub] || "Прибыл"));
  const ordPill = (o) => (o.status === "issuing" ? pill("pack", "Выдают") : pill("in", "Готов к выдаче"));
  const wayT = (o) => st.WAY[o.way].t + (o.way === "tk" && o.tk ? ": " + o.tk : "");
  const cn = (id) => (st.client(id) || {}).name || "";
  const cgOf = (s) => (s && s.items && s.items[0] ? st.cargo(s.items[0].cargoId) : null);
  const thumb = (s) => { const c = cgOf(s); return `<span class="ph-i">${c && c.photos.length ? u.photo(c.photos[0], c.packType) : ""}</span>`; };
  const daysTxt = (n) => (n ? n + u.NB + u.plural(n, "день", "дня", "дней") : "меньше дня");
  const sumTxt = (x) => `${u.places(x.places)} · ${u.kg(x.weight)} · ${u.vol(x.volume)}`;
  const two = (o) => `${st.wamt(o.RUB, "RUB")} · ${st.wamt(o.USD, "USD")}`;
  const sgn = (n, cur) => (n < 0 ? "−" : n > 0 ? "+" : "") + st.wamt(Math.abs(n), cur);
  const mhead = (t, right) => K.head(t, "Склад в Москве · " + E(st.who(BY)), right);
  const back = (s, t, p) => `<div class="pback" data-act="p" data-s="${s}"${p ? ` data-p="${E(p)}"` : ""}>${I("back")}${t}</div>`;
  // блок выдачи: «Копировать» в правом верхнем углу копирует весь блок одним текстом, адрес на всю ширину
  const issBlock = (o) => `<div class="ib" data-ib="${E(o.id)}"><div class="ib-h"><span>Способ выдачи</span><button class="lnkb" type="button" data-act="copyIss" data-id="${E(o.id)}" data-ibc="${E(o.id)}">${I("copy")}Копировать</button></div><b class="ib-w">${E(wayT(o))}</b></div>`
    + line("Получатель", (E(o.recv.name) || "не указан") + (o.recv.phone ? "<small>" + E(o.recv.phone) + "</small>" : ""))
    + (o.recv.addr && o.way !== "pickup" ? `<div class="pline ib-a"><span>Адрес</span><b>${E(o.recv.addr)}</b></div>` : "");
  let photoSeq = 700;

  // ================= 1. ГРУЗЫ: «Готов к выдаче» и «Хранение» по кодам клиентов =================
  const secShips = (k) => (k === "ready" ? st.arrived().filter((s) => s.sub === "ready" || s.sub === "issuing") : st.arrived("store"));
  function groups(k) { const g = {}; secShips(k).forEach((s) => (g[s.clientId] = g[s.clientId] || []).push(s)); return g; }
  const lastAt = (k, list) => Math.max(...list.map((s) => (k === "ready" ? (st.issueOf(s) || {}).at || 0 : s.arrivedAt)));
  function codeRow(k, cid, list) {
    const x = st.sumShips(list), ords = [...new Set(list.map((s) => s.issueId).filter(Boolean))].map(st.issueOrder).filter(Boolean), rdy = ords.some((o) => o.status === "ready");
    const tags = k === "ready" ? ords.map((o) => `${ordPill(o)}`).join("") : `<span class="muted s12">на хранении до ${daysTxt(Math.max(...list.map(st.storeDays)))}</span>`;
    return `<button class="pcard stk${rdy ? " new" : ""}" type="button" data-act="mCode" data-p="${k}:${E(cid)}" data-mcode="${E(cid)}"><span class="t"><span class="id">${E(cid)} · ${E(cn(cid))}</span><span class="n">${list.length}</span></span>
      <span class="thumbs">${list.slice(0, 4).map(thumb).join("")}</span><span class="sub">${st.partsWord(list.length)} · ${sumTxt(x)}</span><span class="mtags">${tags}</span></button>`;
  }
  function mgoods() {
    const k = App.tmp.mtab === "store" ? "store" : "ready", g = groups(k), codes = Object.keys(g).sort((a, b) => lastAt(k, g[b]) - lastAt(k, g[a]));
    const td = st.arrivedToday(), x = st.sumShips(td), nR = secShips("ready").length, nS = secShips("store").length;
    return `<div class="pp">${mhead("Грузы")}
      <div class="pcard msum" data-hl="m-today"><div class="plabel">${I("truck")}Сегодня приехало</div>
        <div class="msum-g"><span><b>${td.length}</b><small>${u.plural(td.length, "партия", "партии", "партий")}</small></span><span><b>${x.places}</b><small>${u.plural(x.places, "место", "места", "мест")}</small></span><span><b>${u.groups(Math.round(x.weight))}</b><small>кг</small></span><span><b>${u.num(x.volume, 2)}</b><small>м³</small></span></div></div>
      <div class="pseg two" data-hl="m-seg"><button type="button" class="${k === "ready" ? "on" : ""}" data-act="mTab" data-k="ready" data-mtab="ready">Готов к выдаче<b class="mn">${nR}</b></button><button type="button" class="${k === "store" ? "on" : ""}" data-act="mTab" data-k="store" data-mtab="store">Хранение<b class="mn">${nS}</b></button></div>
      <div class="mlist" data-hl="m-codes">${codes.map((cid) => codeRow(k, cid, g[cid])).join("") || empty(k === "ready" ? "Команд на выдачу пока нет. Их даёт администратор кнопкой «Выдать»." : "На хранении пусто.")}</div>
      <p class="phint">${k === "ready" ? "Готов к выдаче: администратор дал команду. Откройте код клиента, проверьте получателя и нажмите «Принят»." : "Хранение: грузы прибыли и ждут команды администратора на выдачу."}</p>
    </div>`;
  }
  // карточка трека: фото упакованного груза, мест, вес, объём; по нажатию шторка с данными упаковки
  function shipCard(s) {
    const c = cgOf(s), t = st.totals(s);
    return `<button class="pcard mship" type="button" data-act="mShip" data-id="${E(s.id)}" data-msh="${E(s.id)}"><span class="t"><span class="id mono">${E(s.id)}</span>${subPill(s)}</span>
      <span class="mship-b">${thumb(s)}<span class="mship-d"><span class="strong">${E(c && c.name ? c.name : "Груз")}</span><span class="m">${sumTxt(t)}</span><span class="sub">${E(c ? st.packsText(c.packs) : "")} · прибыл ${u.dShort(s.arrivedAt)}, хранение ${daysTxt(st.storeDays(s))}</span></span></span></button>`;
  }
  function orderCard(o) {
    const due = st.issueRest(o);
    return `<div class="pcard cmd mord" data-ord="${E(o.id)}" data-hl="m-order"><div class="t"><span class="plabel">${I("bell")}Заказ ${E(o.id)}</span>${ordPill(o)}</div>
      ${issBlock(o)}${o.dlv ? `<div class="pline" data-mdlv="${E(o.id)}"><span>${E(st.dlvLabel(o))}</span><b>${E(st.dlvText(o).replace(/^[^:]+: /, ""))}</b></div>` : ""}${line("Расходы склада при выдаче", o.payer === "client" ? "платит клиент" : "платим мы")}
      ${line("Получить оплату", due > 0 ? `<span class="bad">${st.rub(due)}</span>` : o.gotRub ? `<span class="ok">получено ${st.rub(o.gotRub)}</span>` : "не нужно")}
      ${o.note ? `<div class="mnote">${I("info")}<span><small>Примечание администратора</small>${E(o.note)}</span></div>` : ""}
      <span class="sub">Команду дал ${E(st.who(o.by))}, ${u.when(o.at)}</span></div>`;
  }
  function mcode(p) {
    const i = String(p || "").indexOf(":"), k = String(p).slice(0, i) === "store" ? "store" : "ready", cid = String(p).slice(i + 1);
    const list = (groups(k)[cid] || []).sort((a, b) => b.arrivedAt - a.arrivedAt); if (!list.length) return mgoods();
    App.tmp.mtab = k;
    const x = st.sumShips(list);
    let body = "";
    if (k === "store") body = list.map(shipCard).join("");
    else {
      const ords = [...new Set(list.map((s) => s.issueId))].map(st.issueOrder).filter(Boolean).sort((a, b) => (a.status === "ready" ? 0 : 1) - (b.status === "ready" ? 0 : 1) || b.at - a.at);
      body = ords.map((o) => `<div class="mgrp">${orderCard(o)}${list.filter((s) => s.issueId === o.id).map(shipCard).join("")}
        ${o.status === "ready" ? `<button class="btn pri lg block" type="button" data-act="mAccept" data-id="${E(o.id)}" data-hl="m-accept">${I("check")}Принят</button><div class="req">Выдача перейдёт в работу, треки появятся в «Фотоотчёте»</div>`
          : `<div class="found">${I("camera")}<span>Выдают: треки в «Фотоотчёте»<small>По каждому заполните отчёт и нажмите «Готово»</small></span></div><button class="btn lg block mt8" type="button" data-act="p" data-s="mrep" data-hl="m-torep">Открыть фотоотчёт</button>`}</div>`).join("");
    }
    return `<div class="pp">${back("mgoods", k === "ready" ? "Готов к выдаче" : "Хранение")}
      ${K.head(E(cid), E(cn(cid)) + " · " + st.partsWord(list.length), `<span class="tag">${u.places(x.places)}</span>`)}
      <div class="pcard mtot" data-hl="m-total"><div class="duo2"><span><small>Общий вес</small><b>${u.kg(x.weight)}</b></span><span><small>Общий объём</small><b>${u.vol(x.volume)}</b></span></div></div>
      ${body}
      <p class="phint">Нажмите на трек, чтобы увидеть фото упакованного груза и данные упаковки.</p>
    </div>`;
  }
  function shipSheet(id) {
    const s = st.ship(id); if (!s) return;
    const c = cgOf(s), t = st.totals(s), o = st.issueOf(s);
    App.sheet(SLOT, `<h3 class="mono">${E(s.id)}</h3><p>${E(s.clientId)} · ${E(cn(s.clientId))}${c && c.name ? " · " + E(c.name) : ""}</p>
      ${c && c.photos.length ? `<div class="mph">${c.photos.slice(0, 1).map((p) => `<div class="ph-i">${u.photo(p, c.packType)}<em>упаковка</em></div>`).join("")}</div>` : `<div class="ph-none">${I("camera")}без фото</div>`}
      <div class="pcard">${c ? line("Упаковка", E(st.packsText(c.packs))) + (c.dims.length ? line("Размеры, см", c.dims.map((d) => `${E(d.l)} × ${E(d.w)} × ${E(d.h)} · ${u.places(d.n)}`).join("<br>")) : "") : ""}${line("Мест", u.places(t.places))}${line("Вес", u.kg(t.weight))}${line("Объём", u.vol(t.volume))}
        ${line("Маршрут", E(s.route))}${line("Прибыл", u.dShort(s.arrivedAt) + " · " + u.hm(s.arrivedAt))}${line("Хранение", daysTxt(st.storeDays(s)))}${o ? line("Заказ на выдачу", E(o.id) + "<small>" + E(wayT(o)) + "</small>") : ""}</div>
      <button class="btn lg block" type="button" data-act="closeSheet">Закрыть</button>`);
  }

  // ================= 2. ФОТООТЧЁТ: треки в работе по заказам =================
  function payBox(o) {
    const due = st.issueRest(o);
    if (due > 0) return `<div class="mpay" data-hl="m-pay"><span>Получить оплату<b>${st.rub(due)}</b></span><button class="btn pri sm" type="button" data-act="mPaid" data-id="${E(o.id)}" data-hl="m-paid">${I("check")}Получено</button></div>`;
    if (o.gotRub) return `<div class="mpay ok"><span>Оплата получена<b>${st.rub(o.gotRub)}</b></span>${I("check")}</div>`;
    return `<div class="mpay idle"><span>Оплату при выдаче брать не нужно</span></div>`;
  }
  function trackRow(s) {
    const t = st.totals(s);
    if (s.status === "done") return `<div class="mtr done">${thumb(s)}<span><b class="mono">${E(s.id)}</b><small>${s.issue && s.issue.type === "tk" ? "передан в ТК" : "выдан"} ${u.when(s.doneAt)}</small></span>${I("check")}</div>`;
    const d = (App.tmp.mrep || {})[s.id];
    return `<button class="mtr" type="button" data-act="p" data-s="mtrack" data-p="${E(s.id)}" data-mtr="${E(s.id)}">${thumb(s)}<span><b class="mono">${E(s.id)}</b><small>${sumTxt(t)}</small></span>${d && d.photos.length ? `<span class="muted s12">${I("camera")}</span>` : I("chevron")}</button>`;
  }
  function mrep() {
    const ords = st.openIssues("issuing").sort((a, b) => (b.acceptedAt || 0) - (a.acceptedAt || 0));
    return `<div class="pp">${mhead("Фотоотчёт")}
      <p class="phint">Треки, которые склад взял в работу. По каждому заполните отчёт и нажмите «Готово»: груз уйдёт в архив, клиент получит уведомление.</p>
      <div class="mlist" data-hl="m-rep">${ords.map((o) => `<div class="pcard mrord" data-rord="${E(o.id)}"><div class="t"><span class="id">${E(o.clientId)} · ${E(cn(o.clientId))}</span><span class="tag">${E(o.id)}</span></div>
        <span class="sub strong">${E(o.recv.name) || "Получатель не указан"}${o.recv.phone ? " · " + E(o.recv.phone) : ""}</span><span class="sub">${E(wayT(o))}${o.recv.addr && o.way !== "pickup" ? " · " + E(o.recv.addr) : ""}</span>
        ${payBox(o)}<div class="mtr-l">${st.issueShips(o).map(trackRow).join("")}</div></div>`).join("") || empty("Сейчас в работе ничего нет. Откройте «Грузы», раздел «Готов к выдаче», и нажмите «Принят».")}</div>
    </div>`;
  }
  // черновик фотоотчёта по треку: ни одно поле не обязательно
  function mdraft(id) {
    const m = App.tmp.mrep || (App.tmp.mrep = {});
    if (!m[id]) { const o = st.issueOf(st.ship(id)); m[id] = { photos: [], dmg: null, dmgText: "", exp: { load: "", pallet: "", fork: "", other: "" }, note: "", waybill: "", dlvRub: o && o.dlv && o.dlv.rub ? String(o.dlv.rub) : "" }; }
    return m[id];
  }
  const expSum = (d) => st.REPX.reduce((a, [k]) => a + u.parse(d.exp[k]), 0);
  const expHint = (d, o) => `${expSum(d) ? "Итого " + st.rub(expSum(d)) + ". " : ""}${o.payer === "client" ? "Платит клиент: сумма добавится к стоимости груза и к оплате при выдаче." : "Платим мы: сумма спишется с баланса склада."}`;
  function mtrack(p) {
    const s = st.ship(p), o = st.issueOf(s); if (!s || !o || s.status !== "arrived" || s.sub !== "issuing") return mrep();
    const d = mdraft(s.id), c = cgOf(s), t = st.totals(s), kind = c ? c.packType : undefined, due = st.issueRest(o);
    return `<div class="pp">${back("mrep", "Фотоотчёт")}
      ${K.head(`<span class="mono">${E(s.id)}</span>`, E(s.clientId) + " · " + E(cn(s.clientId)) + " · заказ " + E(o.id), pill("pack", "Выдают"))}
      <div class="pcard">${c && c.photos.length ? `<div class="photos">${c.photos.slice(0, 3).map((x) => `<button class="ph-i" type="button" data-act="zoom" data-p="${x}" data-kind="${kind}">${u.photo(x, kind)}</button>`).join("")}</div>` : ""}${line("Вес", u.kg(t.weight))}${line("Объём", u.vol(t.volume))}${line("Мест", u.places(t.places))}${c ? line("Упаковка", E(st.packsText(c.packs))) : ""}</div>
      <div class="pcard cmd">${issBlock(o)}${o.dlv ? `<div class="pline"><span>${E(st.dlvLabel(o))}</span><b>${E(st.dlvText(o).replace(/^[^:]+: /, ""))}</b></div>` : ""}</div>
      <div class="fld mt"><span>Фото выдачи</span><div data-f="mcam" data-hl="m-cam">${K.camHtml(d.photos, "mrepPhoto", kind)}</div></div>
      <div class="fld mt"><span>Повреждение</span><div class="choice cols2" data-hl="m-dmg"><button type="button" class="${d.dmg === "no" ? "on" : ""}" data-act="mrepDmg" data-k="no">Нет</button><button type="button" class="${d.dmg === "yes" ? "on" : ""}" data-act="mrepDmg" data-k="yes">Есть</button></div>
        <div class="doorbox" data-f="mdmgBox" ${d.dmg === "yes" ? "" : "hidden"}><input class="inp" data-in="mrepIn" data-k="dmgText" value="${E(d.dmgText)}" placeholder="Что повреждено" autocomplete="off"></div></div>
      ${o.dlv ? `<label class="fld mt" data-hl="m-dlv"><span>${E(st.dlvLabel(o))}, ₽: платит ${o.dlv.payer === "client" ? "клиент" : "компания"}</span><input class="inp" data-in="mrepIn" data-k="dlvRub" inputmode="numeric" value="${E(d.dlvRub)}" placeholder="сумму можно уточнить" id="mDlv"></label>` : ""}
      <div class="fld mt"><span>Расходы склада при выдаче (погрузка, снять паллет, кара), ₽</span><div class="mexp" data-hl="m-exp">${st.REPX.map(([k, tt]) => `<label class="fld"><span>${tt}</span><input class="inp" data-in="mrepExp" data-k="${k}" inputmode="numeric" value="${E(d.exp[k])}" placeholder="0"></label>`).join("")}</div>
        <div class="req left" data-f="mexpSum">${expHint(d, o)}</div></div>
      ${o.way === "tk" ? `<label class="fld mt"><span>Номер накладной${o.tk ? " " + E(o.tk) : " ТК"}</span><input class="inp mono" data-in="mrepIn" data-k="waybill" value="${E(d.waybill)}" placeholder="Например, 25-00418-331907" autocomplete="off" spellcheck="false" data-hl="m-waybill"></label>` : ""}
      <label class="fld mt"><span>Примечание</span><input class="inp" data-in="mrepIn" data-k="note" value="${E(d.note)}" placeholder="${o.way === "tk" ? "Например: забрал водитель ТК" : "Всё, что важно знать о выдаче"}" autocomplete="off"></label>
      ${due > 0 ? `<div class="mpay mt" data-hl="m-pay"><span>Оплата не отмечена<b>${st.rub(due)}</b></span><button class="btn pri sm" type="button" data-act="mPaid" data-id="${E(o.id)}">${I("check")}Получено</button></div>` : ""}
      <div class="mt"><button class="btn pri lg block" type="button" data-act="mDone" data-id="${E(s.id)}" data-hl="m-done" id="mDone">${I("check")}${o.way === "tk" ? "Готово: передан в ТК" : "Готово: выдан"}</button>
      <div class="req">Все поля необязательные: заполните, что есть.</div></div>
    </div>`;
  }
  function doneGo(id) {
    const s = st.ship(id); if (!s) return;
    const d = mdraft(id), exp = {};
    st.REPX.forEach(([k]) => { exp[k] = u.parse(d.exp[k]); });
    const r = st.issueDone(id, { photos: d.photos, damage: d.dmg === "yes" ? d.dmgText.trim() || "Есть повреждение" : "", exp, note: d.note, waybill: d.waybill, dlvRub: d.dlvRub, by: BY });
    App.closeSheet(SLOT); if (!r) return;
    delete App.tmp.mrep[id];
    App.toast(r.issue.type === "tk" ? `Груз ${r.id} передан в ${r.issue.tk}, накладная ${r.issue.waybill}. Клиент получил уведомление` : `Груз ${r.id} выдан, клиент получил уведомление`, "check");
    go("mrep"); chk("mdone", r);
  }

  // ================= 3. АРХИВ: все выданные, поиск, даты, способ выдачи =================
  const wayOf = (s) => (s.issue ? s.issue.way || (s.issue.type === "tk" ? "tk" : "pickup") : "pickup");
  function marList() {
    const f = App.tmp.mar, qs = f.q.trim().toUpperCase(), now = Date.now(), days = { today: 1, d7: 7, d30: 30 }[f.per];
    return st.S.ships.filter((s) => {
      if (s.status !== "done" || !s.issue) return false;
      if (f.way !== "all" && wayOf(s) !== f.way) return false;
      if (days && (days === 1 ? u.dayDiff(s.doneAt) !== 0 : now - s.doneAt >= days * u.DAY)) return false;
      const c = cgOf(s);
      return !qs || [s.id, s.clientId, cn(s.clientId), c ? c.name : "", s.issue.waybill || "", s.issue.tk || ""].some((v) => String(v).toUpperCase().includes(qs));
    }).sort((a, b) => b.doneAt - a.doneAt);
  }
  const marRows = () => marList().map((s) => { const c = cgOf(s), t = st.totals(s), tk = s.issue.type === "tk"; return `<button class="pcard" type="button" data-act="p" data-s="mitem" data-p="${E(s.id)}" data-mar="${E(s.id)}"><span class="t"><span class="id mono">${E(s.id)}</span>${pill("done", tk ? "Передан в ТК" : "Выдан")}</span>
    <span class="sub strong">${E(s.clientId)} · ${E(cn(s.clientId))}${c && c.name ? ", " + E(c.name) : ""}</span><span class="m"><span>${u.places(t.places)}</span><span>${u.kg(t.weight)}</span><span>${u.vol(t.volume)}</span><span>${u.dShort(s.doneAt)}</span></span>
    <span class="sub">${tk ? E(s.issue.tk) + ", накладная " + E(s.issue.waybill) : E(st.WAY[wayOf(s)].t)}${s.issueExpRub || st.repSum(s.rep) ? " · расходы " + st.rub(st.repSum(s.rep)) : ""}</span></button>`; }).join("") || empty("Ничего не нашли.");
  function march() {
    const f = App.tmp.mar;
    return `<div class="pp">${mhead("Архив")}
      <label class="search psearch" data-hl="m-arq">${I("search")}<input data-in="marQ" data-f="marQ" value="${E(f.q)}" placeholder="Трек, клиент или накладная" autocomplete="off"></label>
      <div class="pchips" data-hl="m-arper">${[["all", "Все даты"], ["today", "Сегодня"], ["d7", "7 дней"], ["d30", "30 дней"]].map(([k, t]) => `<button type="button" class="${f.per === k ? "on" : ""}" data-act="marPer" data-k="${k}">${t}</button>`).join("")}</div>
      <div class="pchips" data-hl="m-arway">${[["all", "Все способы"]].concat(Object.keys(st.WAY).map((k) => [k, st.WAY[k].t])).map(([k, t]) => `<button type="button" class="${f.way === k ? "on" : ""}" data-act="marWay" data-k="${k}">${t}</button>`).join("")}</div>
      <div class="mlist" data-f="marList">${marRows()}</div>
    </div>`;
  }
  function mitem(p) {
    const s = st.ship(p); if (!s || s.status !== "done") return march();
    const c = cgOf(s), t = st.totals(s), o = st.issueOf(s), r = s.rep, tk = s.issue && s.issue.type === "tk", kind = c ? c.packType : undefined;
    const xs = r ? st.REPX.filter(([k]) => r.exp[k] > 0) : [];
    return `<div class="pp">${back("march", "Архив")}
      ${K.head(`<span class="mono">${E(s.id)}</span>`, E(s.clientId) + " · " + E(cn(s.clientId)), pill("done", tk ? "Передан в ТК" : "Выдан"))}
      ${r && r.photos.length ? `<div class="photos">${r.photos.slice(0, 3).map((x) => `<button class="ph-i" type="button" data-act="zoom" data-p="${x}" data-kind="${kind || ""}">${u.photo(x, kind)}<em>выдача</em></button>`).join("")}</div>` : `<div class="ph-none">${I("camera")}Фото не приложили</div>`}
      <div class="pcard">${c && c.name ? line("Наименование", E(c.name)) : ""}${line("Мест", u.places(t.places))}${line("Вес", u.kg(t.weight))}${line("Объём", u.vol(t.volume))}${line("Маршрут", E(s.route))}</div>
      <div class="pcard" data-hl="m-story"><div class="plabel">${I("history")}История груза</div>${App.DK.storyHtml(s)}</div>
      ${r ? `<div class="pcard" data-hl="m-itemrep"><div class="plabel">${I("camera")}Фотоотчёт</div>${line("Способ выдачи", o ? E(wayT(o)) : tk ? "Передать в ТК: " + E(s.issue.tk) : "Выдан клиенту")}${tk ? line("Накладная", `<span class="mono">${E(s.issue.waybill)}</span>`) : ""}
        ${o ? line("Получатель", (E(o.recv.name) || "не указан") + (o.recv.phone ? "<small>" + E(o.recv.phone) + "</small>" : "")) : ""}${line("Повреждение", r.damage ? `<span class="bad">${E(r.damage)}</span>` : "нет")}
        ${line("Расходы при выдаче", xs.length ? xs.map(([k, tt]) => tt.toLowerCase() + " " + st.rub(r.exp[k])).join("<br>") + (o ? "<small>платит " + (o.payer === "client" ? "клиент" : "компания") + "</small>" : "") : "нет")}
        ${o && o.gotRub ? line("Получено с клиента", `<span class="ok">${st.rub(o.gotRub)}</span>`) : ""}${r.note ? line("Примечание", E(r.note)) : ""}${line(tk ? "Передал" : "Выдал", E(st.who(r.by)) + "<small>" + u.dShort(r.at) + " · " + u.hm(r.at) + "</small>")}</div>` : ""}
    </div>`;
  }

  // ================= 4. ФИНАНСЫ: взаиморасчёты со складом в рублях и долларах =================
  function mfin() {
    const f = App.tmp.mwf, list = st.wopList({ per: f.per, from: App.DK.fromISO(f.from), to: App.DK.fromISO(f.to) }), T = st.wopTotals(list), B = st.wopBalance();
    return `<div class="pp">${mhead("Финансы")}
      <div class="duo mbal" data-hl="m-bal">${["RUB", "USD"].map((cur) => `<div class="pcard" data-mbal="${cur}"><span class="muted s12">${cur === "RUB" ? "Баланс в рублях" : "Баланс в долларах"}</span><span class="num ${B[cur] < 0 ? "bad" : "ok"}">${sgn(B[cur], cur)}</span><span class="sub">${B[cur] < 0 ? "компания должна складу" : "деньги компании у склада"}</span></div>`).join("")}</div>
      <div class="pseg" data-hl="m-wper">${[["today", "Сегодня"], ["month", "Месяц"], ["range", "Период"]].map(([k, t]) => `<button type="button" class="${f.per === k ? "on" : ""}" data-act="mwfPer" data-k="${k}">${t}</button>`).join("")}</div>
      ${f.per === "range" ? `<div class="row2 mb8"><label class="fld"><span>с</span><input class="inp" type="date" data-in="mwfDate" data-k="from" value="${E(f.from)}" aria-label="Операции с"></label><label class="fld"><span>по</span><input class="inp" type="date" data-in="mwfDate" data-k="to" value="${E(f.to)}" aria-label="Операции по"></label></div>` : ""}
      <div class="pcard" data-hl="m-wtot">${line("Поступило", two(T.in))}${line("Списано", two(T.out))}${line("Кубов оплачено", u.vol(T.vol))}</div>
      <button class="btn pri lg block" type="button" data-act="mWopExp" id="mWopAdd" data-hl="m-wop-add">${I("minus")}Добавить расход</button>
      <div class="phead sub"><div><small>${list.length} ${u.plural(list.length, "операция", "операции", "операций")} за период</small><h2>История операций</h2></div></div>
      <div class="pcard mlist" data-hl="m-wops">${list.map((w) => { const x = st.wopText(w); return `<div class="pline top" data-mwop="${w.id}"><span>${E(x.t)}${x.s ? `<small>${E(x.s)}</small>` : ""}<small>${u.dShort(w.at)} · ${u.hm(w.at)} · ${E(st.who(w.by))}</small></span><b class="${w.amount < 0 ? "bad" : "ok"}">${sgn(w.amount, w.cur)}</b></div>`; }).join("") || '<p class="muted s13 p0">За этот период операций нет.</p>'}</div>
    </div>`;
  }

  const S_ = { mgoods, mcode, mrep, mtrack, march, mitem, mfin };
  function tabs(i, slot) {
    const map = [["mgoods", "box", "Грузы"], ["mrep", "camera", "Фотоотчёт"], ["march", "history", "Архив"], ["mfin", "wallet", "Финансы"]];
    const curTab = { mcode: "mgoods", mtrack: "mrep", mitem: "march" }[slot.screen] || slot.screen;
    return K.tabBtns(map, curTab, { mgoods: st.openIssues("ready").length, mrep: st.arrived("issuing").length });
  }
  const render = (i, slot) => (S_[slot.screen] || S_.mgoods)(slot.p);
  App.PX = Object.assign(App.PX || {}, { msk: { screens: Object.keys(S_), tabs, render } });

  // ---------- действия ----------
  const acts = {
    mTab: (d) => { App.tmp.mtab = d.k === "store" ? "store" : "ready"; go("mgoods"); chk("mtab", App.tmp.mtab); },
    mCode: (d) => { go("mcode", d.p); chk("mcode", String(d.p).slice(String(d.p).indexOf(":") + 1)); },
    mShip: (d) => shipSheet(d.id),
    mAccept: (d) => {
      const o = st.issueAccept(d.id, BY); if (!o) return;
      App.toast(`Заказ ${o.id} принят: ${st.tracksWord(o.shipIds.length)} в «Фотоотчёте»`, "check");
      chk("maccept", o);
    },
    mPaid: (d) => {
      const o = st.issueOrder(d.id), sum = st.issueCollect(d.id, BY); if (!sum) return;
      App.toast(`Получено ${st.rub(sum)}: оплата в «Финансах», долг клиента уменьшен`, "wallet");
      chk("mpaid", o);
    },
    mDone: (d) => {
      const s = st.ship(d.id), o = st.issueOf(s); if (!s || !o) return;
      const due = st.issueRest(o);
      if (due > 0) {
        App.sheet(SLOT, `<h3>Оплата не отмечена</h3><p>По заказу ${E(o.id)} нужно получить с клиента ${st.rub(due)}. Отметьте получение или выдайте груз без оплаты: долг клиента останется, администратор увидит его в оплатах.</p>
          <button class="btn pri lg block" type="button" data-act="mPaidDone" data-id="${E(s.id)}" id="mPaidDone">${I("check")}Получено, выдать</button>
          <button class="btn lg block mt8" type="button" data-act="mDoneYes" data-id="${E(s.id)}" id="mDoneYes">Выдать без оплаты</button>
          <button class="btn lg block mt8" type="button" data-act="closeSheet">Отмена</button>`);
        return;
      }
      doneGo(s.id);
    },
    mDoneYes: (d) => doneGo(d.id),
    mPaidDone: (d) => { const o = st.issueOf(st.ship(d.id)); if (o && st.issueCollect(o.id, BY)) chk("mpaid", o); doneGo(d.id); },
    mrepPhoto: () => { const id = App.ui.slots[SLOT].p, s = st.ship(id); if (!s) return; const d = mdraft(id), c = cgOf(s); d.photos.push(photoSeq++); const box = q('[data-f="mcam"]'); if (box) box.innerHTML = K.camHtml(d.photos, "mrepPhoto", c ? c.packType : undefined); dec(); },
    mrepDmg: (x) => { const d = mdraft(App.ui.slots[SLOT].p); d.dmg = d.dmg === x.k ? null : x.k; App.slotEl(SLOT).querySelectorAll('[data-act="mrepDmg"]').forEach((b) => b.classList.toggle("on", b.dataset.k === d.dmg)); const box = q('[data-f="mdmgBox"]'); if (box) box.hidden = d.dmg !== "yes"; dec(); },
    // «Заполнить за меня» для сценария: фото, без повреждений, погрузка, накладная для ТК
    mrepFill: () => {
      const id = App.ui.slots[SLOT].p, s = st.ship(id), o = st.issueOf(s); if (!s || !o) return;
      const d = mdraft(id);
      if (!d.photos.length) d.photos.push(photoSeq++, photoSeq++);
      if (!d.dmg) d.dmg = "no";
      if (!expSum(d)) d.exp.load = "1500";
      if (o.way === "tk" && !d.waybill) d.waybill = "25-00" + String(Date.now()).slice(-3) + "-" + String(Date.now()).slice(-9, -3);
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      rr();
    },
    marPer: (x) => { App.tmp.mar.per = x.k; rr(); },
    marWay: (x) => { App.tmp.mar.way = x.k; rr(); },
    mwfPer: (x) => { App.tmp.mwf.per = x.k; rr(); },
    mWopExp: () => App.D.wopOpen("exp", SLOT, BY),
  };
  Object.keys(acts).forEach((k) => { App.acts[k] = (d, el, e) => { K.ctx(SLOT); return acts[k](d, el, e); }; });
  const ins = {
    mrepIn: (v, el) => { const id = App.ui.slots[SLOT].p; if (st.ship(id)) mdraft(id)[el.dataset.k] = v; dec(); },
    mrepExp: (v, el) => { const id = App.ui.slots[SLOT].p, s = st.ship(id), o = st.issueOf(s); if (!o) return; const d = mdraft(id); d.exp[el.dataset.k] = v; const n = q('[data-f="mexpSum"]'); if (n) n.innerHTML = expHint(d, o); dec(); },
    marQ: (v) => { App.tmp.mar.q = v; const l = q('[data-f="marList"]'); if (l) l.innerHTML = marRows(); },
    mwfDate: (v, el) => { App.tmp.mwf[el.dataset.k] = v; rr(); },
  };
  Object.keys(ins).forEach((k) => { App.ins[k] = (v, el, e) => { K.ctx(SLOT); return ins[k](v, el, e); }; });

  // ---------- уведомления: новая команда «Выдать» и прибытие груза ----------
  // если открыта другая вкладка, на вкладке «Склад в Москве» загорается точка (поверх кнопки, без сдвига вёрстки)
  function mark(on) {
    document.querySelectorAll('#modeSeg [data-mode="msk"], #msRoles [data-mode="msk"]').forEach((b) => {
      let d = b.querySelector(".mdot");
      if (!d) { d = document.createElement("span"); d.className = "mdot"; b.appendChild(d); }
      d.classList.toggle("show", on);
    });
  }
  st.on("issuecmd", (o) => {
    if (App.ui.mode === "msk") App.showPush(SLOT, "Новая команда на выдачу", `${o.id} · ${o.clientId} ${cn(o.clientId)} · ${st.tracksWord(o.shipIds.length)} · ${st.WAY[o.way].low}`, ["mcode", "ready:" + o.clientId]);
    else mark(true);
  });
  st.on("arrived", (s) => {
    if (App.ui.mode === "msk") App.showPush(SLOT, "Груз прибыл на склад", `${s.id} · ${s.clientId} ${cn(s.clientId)} · ${u.places(st.totals(s).places)}`, ["mcode", "store:" + s.clientId]);
  });
  document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest('[data-act="mode"][data-mode="msk"]'); if (b) mark(false); }, true);
})(window.App);
