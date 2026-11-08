/* Экраны телефона: сотрудник склада в Китае и клиент. */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, I = u.icon, E = u.esc;
  const pill = (s, lg) => `<span class="st${lg ? " lg" : ""}" data-st="${s}">${st.STATUS[s].t}</span>`;
  const optBtn = (k, label) => `<button class="opt" type="button" data-act="opt" data-k="${k}">${I((App.OPT[k] || {}).icon || "spark")}${E(label)}<i>опция</i></button>`;
  const ME = st.ME;
  let photoSeq = 500;

  function tabs(role, cur) {
    const map = role === "client"
      ? [["ships", "box", "Грузы"], ["pay", "wallet", "Оплаты"], ["profile", "user", "Профиль"]]
      : [["home", "list", "Задачи"], ["accept", "plus", "Приёмка"], ["pack", "layers", "Упаковка"]];
    const curTab = { ship: "ships", accepted: "accept", packForm: "pack", unk: "home" }[cur] || cur;
    const badge = role === "warehouse" ? { pack: st.S.shipments.filter((s) => s.status === "in").length } : { pay: st.money(ME).debt ? 1 : 0 };
    return map.map(([k, ic, t]) => `<button type="button" class="${curTab === k ? "on" : ""}" data-act="p" data-s="${k}" data-tab="${k}">${I(ic)}${t}<i class="${badge[k] ? "show" : ""}">${badge[k] || ""}</i></button>`).join("");
  }

  // ================= СКЛАД =================
  const head = (t, small, right) => `<div class="phead"><div><small>${small}</small><h2>${t}</h2></div>${right || ""}</div>`;
  const lang = `<div class="lang"><button type="button" class="on">RU</button><button type="button" data-act="toast" data-t="В рабочей версии склад работает на китайском, переключение одной кнопкой" data-i="globe">中文</button></div>`;

  function home() {
    const S = st.S, toPack = S.shipments.filter((s) => s.status === "in");
    return `<div class="pp">${head("Склад в Иу", "Ли Вэй · кладовщик", lang)}
      <button class="tile hero" type="button" data-act="p" data-s="accept" data-hl="accept-tile"><span class="ti">${I("plus")}</span><span><b>Принять груз</b><small>код, фото, вес и объём</small></span>${I("chevron")}</button>
      <button class="tile" type="button" data-act="p" data-s="pack"><span class="ti">${I("layers")}</span><span><b>Упаковать</b><small>принятые грузы ждут упаковки</small></span><span class="n">${toPack.length}</span></button>
      <button class="tile" type="button" data-act="p" data-s="unk"><span class="ti" style="background:var(--alert-soft);color:var(--alert)">${I("alert")}</span><span><b>Неопознанные</b><small>менеджер разберёт и привяжет</small></span><span class="n">${S.unknown.length}</span></button>
      <div class="phead" style="padding-top:14px"><div><small>клиенты предупредили заранее</small><h2 style="font-size:18px">Ожидаются</h2></div></div>
      ${S.expected.map((e) => `<div class="pcard"><div class="t"><span class="id">${E(e.clientId)}</span>${pill("wait")}</div><div class="sub" style="color:var(--ink-2)">${E((st.client(e.clientId) || {}).name || "")} · ${E(e.supplier)}</div><div class="sub">${E(e.note)} · сообщили ${u.when(e.at)}</div></div>`).join("") || '<p class="muted" style="font-size:13px">Сейчас никого не ждём.</p>'}
    </div>`;
  }

  function draft() {
    if (!App.tmp.draft) App.tmp.draft = { code: "", photos: [], places: 1, weight: "", volume: "" };
    return App.tmp.draft;
  }
  function foundBox(code) {
    const c = code.trim();
    if (!c) return `<div class="found idle" id="found">${I("search")}<span>Введите код с коробки, система найдёт клиента</span></div>`;
    const list = st.findClient(c), exact = list.find((x) => x.id.replace("-", "") === c.toUpperCase().replace(/[\s-]/g, ""));
    const hit = exact || (list.length === 1 ? list[0] : null);
    if (hit) {
      const e = st.S.expected.find((x) => x.clientId === hit.id);
      return `<div class="found" id="found">${I("check")}<span>${E(hit.id)} · ${E(hit.name)}, ${E(hit.city)}<small>${e ? "ожидается: " + E(e.note) : "клиент найден"}</small></span></div>`;
    }
    if (list.length > 1) return `<div class="found idle" id="found">${I("search")}<span>Похоже на: ${list.slice(0, 3).map((x) => E(x.id)).join(", ")}</span></div>`;
    return `<div class="found bad" id="found">${I("alert")}<span>Клиент с кодом «${E(c.toUpperCase())}» не найден<small>Груз можно принять в неопознанные</small></span></div>`;
  }
  function hitClient(code) {
    const c = String(code || "").trim(); if (!c) return null;
    const list = st.findClient(c), exact = list.find((x) => x.id.replace("-", "") === c.toUpperCase().replace(/[\s-]/g, ""));
    return exact || (list.length === 1 ? list[0] : null);
  }
  function missing(d) {
    const m = [];
    if (!hitClient(d.code)) m.push("код клиента");
    if (!d.photos.length) m.push("фото");
    if (!(d.places > 0)) m.push("места");
    if (!(parseFloat(String(d.weight).replace(",", ".")) > 0)) m.push("вес");
    if (!(parseFloat(String(d.volume).replace(",", ".")) > 0)) m.push("объём");
    return m;
  }
  function camHtml(list, actAdd) {
    return `<div class="cam">${list.map((p) => `<div class="shot">${u.photo(p)}</div>`).join("")}${list.length < 3 ? `<button class="add" type="button" data-act="${actAdd}">${I("camera")}<span>${list.length ? "Ещё фото" : "Сфотографировать"}</span></button>` : ""}</div>`;
  }
  function accept() {
    const d = draft(), miss = missing(d), unknownCode = d.code.trim() && !hitClient(d.code) && st.findClient(d.code).length === 0;
    const scn = App.scenario && App.scenario.isStep("accept");
    return `<div class="pp">${head("Приёмка груза", "склад в Иу", lang)}
      <label class="fld"><span>Код клиента с коробки <b>*</b></span><input class="inp big" id="accCode" data-in="accCode" value="${E(d.code)}" placeholder="Например, MSK-117" autocomplete="off" autocapitalize="characters" data-hl="acc-code"></label>
      <div class="mt" style="margin-top:8px">${foundBox(d.code)}</div>
      ${scn && !d.code ? `<div class="sug"><button type="button" data-act="accSample">Пример: MSK-117</button></div>` : ""}
      <div class="row wrap" style="margin-top:10px;gap:6px">${optBtn("ocr", "Код по фото")}${optBtn("voice", "Голосом")}</div>
      <div class="fld mt"><span>Фото груза <b>*</b></span><div id="accCam" data-hl="acc-cam">${camHtml(d.photos, "accPhoto")}</div></div>
      <div class="fld mt"><span>Мест <b>*</b></span><div class="stepper"><button type="button" data-act="accPlaces" data-d="-1" aria-label="Меньше">${I("minus")}</button><input class="inp" id="accPlaces" data-in="accPlacesIn" inputmode="numeric" value="${d.places}"><button type="button" data-act="accPlaces" data-d="1" aria-label="Больше">${I("plus")}</button></div></div>
      <div class="row mt" style="gap:8px;align-items:start">
        <label class="fld" style="flex:1"><span>Вес, кг <b>*</b></span><input class="inp" id="accW" data-in="accW" inputmode="decimal" value="${E(d.weight)}" placeholder="0"></label>
        <label class="fld" style="flex:1"><span>Объём, м³ <b>*</b></span><input class="inp" id="accV" data-in="accV" inputmode="decimal" value="${E(d.volume)}" placeholder="0,00"></label>
      </div>
      <div class="mt"><button class="btn pri lg block" type="button" id="btnAccept" data-act="accGo" ${miss.length ? "disabled" : ""} data-hl="acc-go">${I("check")}Принять груз</button>
      <div class="req" id="accReq">${miss.length ? "Заполните: " + miss.join(", ") : "Всё заполнено, можно принимать"}</div>
      <button class="btn ghost block" type="button" id="btnUnk" data-act="accUnk" ${unknownCode ? "" : "hidden"}>${I("alert")}Принять в неопознанные</button>
      ${scn ? `<p class="center" style="margin:6px 0 0"><span class="lnk" data-act="accFill" style="font-size:12.5px">Заполнить примером</span></p>` : ""}</div>
    </div>`;
  }
  function syncAccept() {
    const d = draft(), miss = missing(d), b = document.getElementById("btnAccept"), r = document.getElementById("accReq");
    if (b) b.disabled = miss.length > 0;
    if (r) r.textContent = miss.length ? "Заполните: " + miss.join(", ") : "Всё заполнено, можно принимать";
    const f = document.getElementById("found"); if (f) f.outerHTML = foundBox(d.code);
    const un = document.getElementById("btnUnk"); if (un) un.hidden = !(d.code.trim() && !hitClient(d.code) && st.findClient(d.code).length === 0);
    if (App.scenario) App.scenario.decorate();
  }
  function accepted(id) {
    const s = st.ship(id); if (!s) return home();
    const c = st.client(s.clientId);
    return `<div class="pp center"><div class="okmark">${I("check")}</div><h2 style="margin:0;font-size:22px;letter-spacing:-.02em">Груз принят</h2>
      <p class="muted" style="margin:4px 0 14px;font-size:13px">${E(s.id)} · ${E(c.name)} · клиент уже получил уведомление</p>
      <div class="label" style="text-align:left"><div class="q">${u.qr(parseInt(s.id.replace(/\D/g, ""), 10))}</div><div><b>${E(c.id)}</b><small>${E(s.id)} · место 1/${s.places}</small><small>${u.kg(s.weight / s.places)} · ${u.vol(s.volume / s.places)}</small><small>Иу · ${u.dShort(s.createdAt)}</small></div></div>
      <p class="muted" style="font-size:12px;margin:8px 0 12px">QR-код клеится на каждое место. Дальше груз находят, просто отсканировав его телефоном.</p>
      <button class="btn pri lg block" type="button" data-act="toast" data-t="${s.places} ${u.plural(s.places, "этикетка", "этикетки", "этикеток")} отправлено на принтер" data-i="printer">${I("printer")}Печать ${s.places} ${u.plural(s.places, "этикетки", "этикеток", "этикеток")}</button>
      <button class="btn lg block" type="button" style="margin-top:8px" data-act="p" data-s="home">Готово</button></div>`;
  }

  function packList() {
    const list = st.S.shipments.filter((s) => s.status === "in").sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || b.createdAt - a.createdAt);
    return `<div class="pp">${head("Упаковка", "принятые грузы", lang)}
      ${list.map((s) => `<button class="pcard" type="button" data-act="p" data-s="packForm" data-p="${s.id}" data-pk="${s.id}"><span class="t"><span class="id">${E(s.clientId)} · ${E(s.id)}</span>${s.fresh ? '<span class="st" data-st="in">новый</span>' : I("chevron")}</span><span class="m"><span>${u.places(s.places)}</span><span>${u.kg(s.weight)}</span><span>${u.vol(s.volume)}</span></span><span class="sub">${E((st.client(s.clientId) || {}).name)} · принят ${u.when(s.createdAt)}</span></button>`).join("") || '<p class="muted" style="font-size:13px">Всё упаковано.</p>'}
    </div>`;
  }
  function packDraft(id) {
    const s = st.ship(id);
    if (!App.tmp.pack[id]) App.tmp.pack[id] = { packType: "", weight: String(s.weight), volume: String(s.volume).replace(".", ","), photos: [] };
    return App.tmp.pack[id];
  }
  function packMissing(d) {
    const m = [];
    if (!d.packType) m.push("вид упаковки");
    if (!(parseFloat(String(d.weight).replace(",", ".")) > 0)) m.push("вес");
    if (!(parseFloat(String(d.volume).replace(",", ".")) > 0)) m.push("объём");
    if (!d.photos.length) m.push("фото упаковки");
    return m;
  }
  function packCost(s, d) {
    const v = parseFloat(String(d.volume).replace(",", ".")) || 0;
    return d.packType ? st.costOf({ volume: v, places: s.places, packType: d.packType }) : 0;
  }
  function packForm(id) {
    const s = st.ship(id); if (!s || s.status !== "in") return packList();
    const d = packDraft(id), miss = packMissing(d), c = st.client(s.clientId), cost = packCost(s, d);
    const hints = { "Коробка": "без доплаты", "Мешок": "150 ₽ за место", "Обрешётка": "2 500 ₽ за м³", "Паллета": "1 200 ₽ за место" };
    return `<div class="pp"><div class="pback" data-act="p" data-s="pack">${I("back")}Упаковка</div>
      ${head(E(s.id), E(c.id) + " · " + E(c.name))}
      <div class="photos" style="margin-bottom:12px">${s.photos.slice(0, 3).map((p) => `<div class="ph-i">${u.photo(p)}</div>`).join("")}</div>
      <div class="fld"><span>Вид упаковки <b>*</b></span><div class="choice cols2" data-hl="pack-type">${Object.keys(st.PACK).map((k) => `<button type="button" class="${d.packType === k ? "on" : ""}" data-act="packType" data-id="${id}" data-k="${k}"><span>${k}<small>${hints[k]}</small></span></button>`).join("")}</div></div>
      <div class="row mt" style="gap:8px;align-items:start">
        <label class="fld" style="flex:1"><span>Вес после, кг <b>*</b></span><input class="inp" data-in="packW" data-id="${id}" inputmode="decimal" value="${E(d.weight)}"></label>
        <label class="fld" style="flex:1"><span>Объём после, м³ <b>*</b></span><input class="inp" data-in="packV" data-id="${id}" inputmode="decimal" value="${E(d.volume)}"></label>
      </div>
      <div class="fld mt"><span>Фото упаковки <b>*</b></span><div id="packCam" data-hl="pack-cam">${camHtml(d.photos, "packPhoto")}</div></div>
      <div class="found idle mt" id="packCost">${I("wallet")}<span>${cost ? "Стоимость для клиента: <b>" + u.money(cost) + "</b>" : "Стоимость посчитается после выбора упаковки"}<small>по ставке ${u.money(st.RATE)} за м³ + упаковка</small></span></div>
      <div class="mt"><button class="btn pri lg block" type="button" id="btnPack" data-act="packGo" data-id="${id}" ${miss.length ? "disabled" : ""} data-hl="pack-go">${I("check")}Упаковано</button>
      <div class="req" id="packReq">${miss.length ? "Заполните: " + miss.join(", ") : "Всё заполнено"}</div></div>
    </div>`;
  }
  function syncPack(id) {
    const s = st.ship(id), d = packDraft(id), miss = packMissing(d), b = document.getElementById("btnPack"), r = document.getElementById("packReq"), c = document.getElementById("packCost");
    if (b) b.disabled = miss.length > 0;
    if (r) r.textContent = miss.length ? "Заполните: " + miss.join(", ") : "Всё заполнено";
    const cost = packCost(s, d);
    if (c) c.innerHTML = `${I("wallet")}<span>${cost ? "Стоимость для клиента: <b>" + u.money(cost) + "</b>" : "Стоимость посчитается после выбора упаковки"}<small>по ставке ${u.money(st.RATE)} за м³ + упаковка</small></span>`;
    if (App.scenario) App.scenario.decorate();
  }
  function unk() {
    return `<div class="pp"><div class="pback" data-act="p" data-s="home">${I("back")}Задачи</div>${head("Неопознанные", "клиент не найден по маркировке")}
      ${st.S.unknown.map((x) => `<div class="pcard"><div class="t"><span class="id">${E(x.id)}</span><span class="st" data-st="unk">не найден</span></div><div class="photos"><div class="ph-i">${u.photo(x.photo)}</div></div><div class="sub" style="color:var(--ink-2)">${E(x.note)}</div><div class="sub">${u.places(x.places)} · ${u.kg(x.weight)} · ${u.when(x.at)}</div></div>`).join("") || '<p class="muted" style="font-size:13px">Всё разобрано.</p>'}
      <p class="muted" style="font-size:12px">Менеджер в России видит этот список и привязывает груз к клиенту, после этого груз уходит в работу.</p></div>`;
  }

  // ================= КЛИЕНТ =================
  function clientHead(t, right) { const c = st.client(ME); return head(t, E(c.name) + " · " + E(c.id), right); }
  function subLine(s) {
    const cs = s.consId ? st.cons(s.consId) : null;
    if (s.status === "in") return "Принят " + u.when(s.createdAt) + ", готовим к упаковке";
    if (s.status === "pack") return "Упакован, стоимость " + u.money(s.cost) + ". Ждёт отправки";
    if (s.status === "way") return "Трек " + cs.id + " · прибытие около " + u.dLong(cs.eta);
    if (s.status === "arrived") return "Можно забирать: Москва, Южнопортовая, 7, склад 4";
    return "Выдан " + u.dShort((s.history.find((h) => h.st === "done") || {}).at || s.createdAt);
  }
  function shipsScreen(p) {
    const tab = p === "archive" ? "archive" : "active";
    const mine = st.shipsOf(ME).sort((a, b) => b.createdAt - a.createdAt);
    const act = mine.filter((s) => s.status !== "done"), arc = mine.filter((s) => s.status === "done");
    const list = tab === "active" ? act : arc, debt = st.money(ME).debt;
    const bell = `<button class="x" type="button" data-act="notes" aria-label="Уведомления" style="background:var(--white);box-shadow:var(--sh-1)">${I("bell")}</button>`;
    return `<div class="pp">${clientHead("Мои грузы", bell)}
      ${debt ? `<button class="pcard" type="button" data-act="p" data-s="pay" style="background:var(--warn-soft);box-shadow:none"><span class="t"><span style="font-weight:600;font-size:13px">К оплате ${u.money(debt)}</span>${I("chevron")}</span></button>` : ""}
      <div class="pseg"><button type="button" class="${tab === "active" ? "on" : ""}" data-act="p" data-s="ships">Активные · ${act.length}</button><button type="button" class="${tab === "archive" ? "on" : ""}" data-act="p" data-s="ships" data-p="archive">Архив · ${arc.length}</button></div>
      ${list.map((s) => `<button class="pcard" type="button" data-act="p" data-s="ship" data-p="${s.id}" data-cs="${s.id}"><span class="t"><span class="id">${E(s.id)}</span>${pill(s.status)}</span>
        <span class="photos">${s.photos.slice(0, 2).concat(s.packPhotos || []).slice(0, 3).map((x, i) => `<span class="ph-i">${u.photo(x, i >= s.photos.slice(0, 2).length ? (s.packType === "Обрешётка" ? "crate" : s.packType === "Мешок" ? "sack" : "box") : null)}</span>`).join("")}</span>
        <span class="m"><span>${u.places(s.places)}</span><span>${u.kg(s.weight)}</span><span>${u.vol(s.volume)}</span></span><span class="sub">${E(subLine(s))}</span></button>`).join("") || '<p class="muted" style="font-size:13px">Здесь пока пусто.</p>'}
    </div>`;
  }
  function shipScreen(id) {
    const s = st.ship(id); if (!s || s.clientId !== ME) return shipsScreen();
    const cs = s.consId ? st.cons(s.consId) : null;
    const order = ["in", "pack", "way", "arrived", "done"], idx = order.indexOf(s.status);
    const labels = { in: "Принят на складе в Иу", pack: "Упакован", way: "Отправлен из Китая", arrived: "Прибыл в Москву, можно забирать", done: "Выдан" };
    return `<div class="pp"><div class="pback" data-act="p" data-s="ships">${I("back")}Мои грузы</div>
      <div class="phead"><div><small>${E(s.supplier)}</small><h2>${E(s.id)}</h2></div>${pill(s.status, true)}</div>
      <div class="photos" style="margin-bottom:10px">${s.photos.map((p) => `<div class="ph-i">${u.photo(p)}<em>склад</em></div>`).join("")}${(s.packPhotos || []).map((p) => `<div class="ph-i">${u.photo(p, s.packType === "Обрешётка" ? "crate" : s.packType === "Мешок" ? "sack" : "box")}<em>упаковка</em></div>`).join("")}</div>
      ${cs ? `<div class="pcard" data-hl="client-track"><div class="t"><span style="font-size:12px;color:var(--muted)">Трек-номер</span><span class="muted" style="font-size:12px">${E(st.TRANSPORT[cs.transport].label)}</span></div><div class="t" style="margin-top:2px"><span class="id" style="font-size:18px">${E(cs.id)}</span><span style="font-size:12.5px;font-weight:600">${cs.status === "way" ? "≈" + u.NB + u.dLong(cs.eta) : "прибыл"}</span></div></div>` : ""}
      <div class="pcard"><ol class="tl">${order.map((k, i) => { const h = s.history.find((x) => x.st === k); return `<li class="${i < idx ? "done" : i === idx ? (k === "done" ? "done" : "cur") : "todo"}"><b>${labels[k]}</b><small>${h ? u.dShort(h.at) + " · " + u.hm(h.at) : k === "arrived" && cs && cs.status === "way" ? "ожидается " + u.dLong(cs.eta) : ""}</small></li>`; }).join("")}</ol></div>
      <div class="pcard"><div class="pline"><span>Места</span><b>${u.places(s.places)}</b></div><div class="pline"><span>Вес</span><b>${u.kg(s.weight)}</b></div><div class="pline"><span>Объём</span><b>${u.vol(s.volume)}</b></div>${s.packType ? `<div class="pline"><span>Упаковка</span><b>${E(s.packType)}</b></div>` : ""}<div class="pline"><span>Стоимость</span><b>${s.cost ? u.money(s.cost) : "после упаковки"}</b></div></div>
    </div>`;
  }
  function payScreen() {
    const m = st.money(ME);
    // распределяем оплаты по начислениям от старых к новым
    let left = m.paid;
    const charges = st.shipsOf(ME).filter((s) => s.cost).sort((a, b) => a.createdAt - b.createdAt).map((s) => { const paid = left >= s.cost; left = Math.max(0, left - s.cost); return { s, paid }; }).reverse();
    const pays = st.S.payments.filter((p) => p.clientId === ME).sort((a, b) => b.at - a.at);
    return `<div class="pp">${clientHead("Оплаты")}
      <div class="pay-hero" data-hl="client-pay"><span>${m.debt ? "К оплате" : "Долга нет"}</span><strong>${u.money(m.debt)}</strong><button class="btn sm" type="button" data-act="reqs">${I("file")}Реквизиты для оплаты</button></div>
      <div class="pcard"><div style="font-weight:700;margin-bottom:2px">Начисления</div>${charges.map((x) => `<div class="pline"><span>${E(x.s.id)}<small>${u.dShort(x.s.createdAt)} · ${u.vol(x.s.volume)}</small></span><span style="text-align:right"><b>${u.money(x.s.cost)}</b><small style="color:${x.paid ? "var(--accent-d)" : "var(--warn)"}">${x.paid ? "оплачено" : "к оплате"}</small></span></div>`).join("") || '<p class="muted">Начислений нет</p>'}</div>
      <div class="pcard"><div style="font-weight:700;margin-bottom:2px">История оплат</div>${pays.map((p) => `<div class="pline"><span>${u.dLong(p.at)}</span><b>${u.money(p.amount)}</b></div>`).join("") || '<p class="muted" style="font-size:13px;margin:6px 0 0">Оплат пока не было</p>'}</div>
    </div>`;
  }
  function profile() {
    const c = st.client(ME);
    return `<div class="pp">${clientHead("Профиль")}
      <div class="pcard"><div style="font-weight:700">Адрес склада для ваших поставщиков</div><p class="muted" style="font-size:12.5px;margin:4px 0 8px">Отправьте его поставщикам в Китае и попросите писать ваш код на каждой коробке.</p>
        <div class="note" style="color:var(--ink-2);font-size:12.5px">义乌市 福田街道 商城大道 88号 3号仓<br>收货人: 中心物流 · 电话: 仓库电话<br><b style="color:var(--ink)">唛头: ${E(c.id)}</b></div>
        <button class="btn sm mt" type="button" data-act="toast" data-t="Адрес скопирован, отправьте его поставщику" data-i="check" style="margin-top:10px">Скопировать адрес</button></div>
      <div class="pcard"><div style="font-weight:700;margin-bottom:2px">Уведомления</div>
        <div class="pline"><span>В приложении<small>статусы, фото, оплаты</small></span><span class="st" data-st="in">включено</span></div>
        <div class="pline"><span>Telegram<small>${st.S.tg ? "подключён" : "дублировать уведомления в Telegram"}</small></span>${st.S.tg ? '<span class="st" data-st="in">включено</span>' : '<button class="btn sm" type="button" data-act="tgOn">Подключить</button>'}</div>
        <div class="pline"><span>WhatsApp</span>${optBtn("whatsapp", "WhatsApp")}</div></div>
      <div class="pcard"><div class="pline"><span>Компания</span><b>${E(c.name)}</b></div><div class="pline"><span>Контакт</span><b>${E(c.person)}</b></div><div class="pline"><span>Ваш код</span><b>${E(c.id)}</b></div></div>
    </div>`;
  }

  // ---------- действия ----------
  Object.assign(App.acts, {
    accPhoto: () => { const d = draft(); d.photos.push(photoSeq++); document.getElementById("accCam").innerHTML = camHtml(d.photos, "accPhoto"); syncAccept(); },
    accPlaces: (x) => { const d = draft(); d.places = Math.max(1, (parseInt(d.places, 10) || 1) + parseInt(x.d, 10)); document.getElementById("accPlaces").value = d.places; syncAccept(); },
    accSample: () => { const d = draft(); d.code = "MSK-117"; const el = document.getElementById("accCode"); if (el) el.value = d.code; syncAccept(); const s = el && el.parentNode.parentNode.querySelector(".sug"); if (s) s.remove(); },
    accFill: () => { App.tmp.draft = { code: "MSK-117", photos: [photoSeq++, photoSeq++], places: 8, weight: "96", volume: "0,64" }; App.refresh(true); },
    accGo: () => {
      const d = draft(), c = hitClient(d.code); if (!c || missing(d).length) return;
      const sh = st.accept({ clientId: c.id, places: d.places, weight: parseFloat(String(d.weight).replace(",", ".")), volume: parseFloat(String(d.volume).replace(",", ".")), photos: d.photos });
      App.tmp.draft = null; App.go.phone("accepted", sh.id);
      if (App.scenario) App.scenario.check("accepted", sh);
    },
    accUnk: () => {
      const d = draft();
      const n = st.toUnknown({ code: d.code.trim().toUpperCase(), places: d.places, weight: parseFloat(String(d.weight).replace(",", ".")) || 0, volume: parseFloat(String(d.volume).replace(",", ".")) || 0, photos: d.photos.length ? d.photos : [photoSeq++] });
      App.tmp.draft = null; App.toast(`Груз ${n.id} принят в неопознанные, менеджер разберёт`, "alert"); App.go.phone("unk");
    },
    packType: (x) => { const d = packDraft(x.id); d.packType = x.k; document.querySelectorAll('[data-act="packType"]').forEach((b) => b.classList.toggle("on", b.dataset.k === x.k)); syncPack(x.id); },
    packPhoto: () => { const id = App.ui.phoneP, s = st.ship(id), d = packDraft(id); d.photos.push(photoSeq++); const kind = d.packType === "Обрешётка" ? "crate" : d.packType === "Мешок" ? "sack" : "box"; document.getElementById("packCam").innerHTML = `<div class="cam">${d.photos.map((p) => `<div class="shot">${u.photo(p, kind)}</div>`).join("")}${d.photos.length < 3 ? `<button class="add" type="button" data-act="packPhoto">${I("camera")}<span>Ещё фото</span></button>` : ""}</div>`; syncPack(id); void s; },
    packGo: (x) => {
      const d = packDraft(x.id); if (packMissing(d).length) return;
      st.pack(x.id, { packType: d.packType, weight: parseFloat(String(d.weight).replace(",", ".")), volume: parseFloat(String(d.volume).replace(",", ".")), photos: d.photos });
      delete App.tmp.pack[x.id];
      App.toast("Упаковано. Клиент получил уведомление со стоимостью", "check"); App.go.phone("pack");
      if (App.scenario) App.scenario.check("packed", x.id);
    },
    notes: () => {
      const list = st.S.notes.filter((n) => n.clientId === ME).slice(0, 8);
      App.sheet(`<h3>Уведомления</h3>${list.map((n) => `<div class="pline" style="align-items:flex-start"><span>${E(n.text)}<small>${u.when(n.at)}</small></span></div>`).join("")}`);
    },
    reqs: () => App.sheet(`<h3>Реквизиты для оплаты</h3><p>Здесь будут реквизиты вашей компании: название, ИНН, расчётный счёт и БИК. Назначение платежа подставляется само: оплата доставки, код ${ME}.</p><button class="btn pri block" type="button" data-act="toast" data-t="Реквизиты скопированы" data-i="check">Скопировать</button>`),
    tgOn: () => App.sheet(`<h3>Подключить Telegram</h3><p>Откройте нашего бота в Telegram и отправьте ему код привязки. Уведомления будут приходить и в приложение, и в Telegram.</p><div class="note center" style="font-size:24px;font-weight:700;letter-spacing:.2em;color:var(--ink)">4821</div><button class="btn pri block mt" type="button" data-act="tgDone">${I("tg")}Я отправил код</button>`),
    tgDone: () => { st.setTg(true); App.closeSheet(); App.toast("Telegram подключён", "tg"); },
  });
  Object.assign(App.ins, {
    accCode: (v) => { draft().code = v; syncAccept(); },
    accPlacesIn: (v) => { draft().places = Math.max(0, parseInt(v, 10) || 0); syncAccept(); },
    accW: (v) => { draft().weight = v; syncAccept(); },
    accV: (v) => { draft().volume = v; syncAccept(); },
    packW: (v, el) => { packDraft(el.dataset.id).weight = v; syncPack(el.dataset.id); },
    packV: (v, el) => { packDraft(el.dataset.id).volume = v; syncPack(el.dataset.id); },
  });

  App.P = { tabs, screens: { home, accept, accepted, pack: packList, packForm, unk, ships: shipsScreen, ship: shipScreen, pay: payScreen, profile } };
})(window.App);
