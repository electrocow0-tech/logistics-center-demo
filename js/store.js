/* Данные прототипа и действия: всё хранится в браузере, сервер не нужен. */
(function (App) {
  "use strict";
  const u = App.u;
  const KEY = "cl-demo-v1";
  const ME = "MSK-117"; // клиент, чей телефон показываем

  const STATUS = {
    wait: { t: "Ожидается", c: "#8a97a8" },
    in: { t: "Принят на складе", c: "#05946d" },
    pack: { t: "Упакован", c: "#d97706" },
    way: { t: "В пути", c: "#7c3aed" },
    arrived: { t: "Прибыл в Россию", c: "#2563eb" },
    done: { t: "Выдан", c: "#0f1b2d" },
  };
  const PACK = {
    "Коробка": { per: "place", rate: 0 },
    "Мешок": { per: "place", rate: 150 },
    "Обрешётка": { per: "m3", rate: 2500 },
    "Паллета": { per: "place", rate: 1200 },
  };
  const RATE = 24000; // ₽ за м³, авто
  const TRANSPORT = {
    "Авто": { days: 16, label: "Авто, 14–18 дней" },
    "ЖД": { days: 24, label: "ЖД, 20–28 дней" },
  };
  function costOf(sh) {
    const p = PACK[sh.packType] || PACK["Коробка"];
    const extra = p.per === "m3" ? p.rate * sh.volume : p.rate * sh.places;
    return Math.round((sh.volume * RATE + extra) / 100) * 100;
  }

  function seed() {
    const now = Date.now(), D = u.DAY;
    const clients = [
      { id: "MSK-117", name: "ТехноДом", city: "Москва", person: "Андрей Ковалёв", phone: "+7 900 000-00-11", since: "2024" },
      { id: "KZN-042", name: "Камский текстиль", city: "Казань", person: "Ильдар Сафин", phone: "+7 900 000-00-12", since: "2023" },
      { id: "EKB-215", name: "УралСтройСнаб", city: "Екатеринбург", person: "Олег Мартынов", phone: "+7 900 000-00-13", since: "2025" },
      { id: "SPB-088", name: "Северная мебель", city: "Санкт-Петербург", person: "Мария Лебедева", phone: "+7 900 000-00-14", since: "2024" },
      { id: "NSK-031", name: "Сибирь Авто", city: "Новосибирск", person: "Павел Орлов", phone: "+7 900 000-00-15", since: "2023" },
      { id: "KRD-064", name: "Южный дом", city: "Краснодар", person: "Елена Гаврилова", phone: "+7 900 000-00-16", since: "2025" },
      { id: "MSK-203", name: "Игротека", city: "Москва", person: "Светлана Ким", phone: "+7 900 000-00-17", since: "2025" },
      { id: "SMR-019", name: "Волга Спорт", city: "Самара", person: "Артём Белов", phone: "+7 900 000-00-18", since: "2024" },
    ];
    // [id, клиент, поставщик, мест, кг, м³, статус, дней назад, упаковка, отправка]
    const rows = [
      ["П-0351", "KRD-064", "Dongguan Homeware", 11, 186, 1.2, "in", 0.25],
      ["П-0350", "KZN-042", "Shaoxing Keqiao Fabric", 22, 410, 1.85, "in", 0.45],
      ["П-0349", "SMR-019", "Jinhua Sport Goods", 9, 132, 0.9, "in", 1.1],
      ["П-0348", "MSK-203", "Yiwu Joyful Toys", 15, 98, 1.36, "in", 1.4],
      ["П-0347", "EKB-215", "Foshan Mingde Lighting", 14, 238, 1.12, "pack", 2.2, "Обрешётка"],
      ["П-0346", "SPB-088", "Guangzhou Meitai Furniture", 6, 312, 2.4, "pack", 3.1, "Паллета"],
      ["П-0345", "NSK-031", "Ningbo Autoparts Co.", 31, 655, 2.96, "pack", 3.4, "Коробка"],
      ["П-0344", "MSK-117", "Shenzhen Brightway Electronics", 12, 140, 0.92, "pack", 4.2, "Коробка"],
      ["П-0338", "KRD-064", "Dongguan Homeware", 28, 640, 3.7, "way", 14, "Коробка", "ЦЛ-48213"],
      ["П-0336", "KRD-064", "Foshan Mingde Lighting", 20, 480, 2.6, "way", 15, "Обрешётка", "ЦЛ-48213"],
      ["П-0335", "KZN-042", "Shaoxing Keqiao Fabric", 40, 820, 3.1, "way", 13, "Мешок", "ЦЛ-48205"],
      ["П-0334", "KZN-042", "Shaoxing Keqiao Fabric", 18, 360, 1.4, "way", 13, "Мешок", "ЦЛ-48205"],
      ["П-0333", "MSK-117", "Yiwu Hongda Trading", 19, 264, 1.58, "way", 17, "Коробка", "ЦЛ-48197"],
      ["П-0322", "SPB-088", "Dongguan Homeware", 10, 150, 1.05, "arrived", 24, "Коробка", "ЦЛ-48170"],
      ["П-0321", "SPB-088", "Guangzhou Meitai Furniture", 8, 410, 3.2, "arrived", 24, "Паллета", "ЦЛ-48170"],
      ["П-0310", "MSK-117", "Shenzhen Brightway Electronics", 16, 210, 1.3, "done", 34, "Коробка", "ЦЛ-48121"],
      ["П-0311", "NSK-031", "Ningbo Autoparts Co.", 44, 980, 4.2, "done", 36, "Коробка", "ЦЛ-48118"],
      ["П-0305", "EKB-215", "Foshan Mingde Lighting", 12, 190, 1.0, "done", 40, "Обрешётка", "ЦЛ-48102"],
      ["П-0302", "MSK-203", "Yiwu Joyful Toys", 25, 160, 2.2, "done", 42, "Коробка", "ЦЛ-48099"],
      ["П-0298", "SMR-019", "Jinhua Sport Goods", 14, 240, 1.6, "done", 45, "Мешок", "ЦЛ-48090"],
      ["П-0296", "KRD-064", "Dongguan Homeware", 30, 700, 3.9, "done", 47, "Коробка", "ЦЛ-48088"],
      ["П-0292", "MSK-117", "Yiwu Hongda Trading", 21, 300, 1.9, "done", 52, "Коробка", "ЦЛ-48071"],
    ];
    const staff = { in: "Ли Вэй, склад", pack: "Чжан Мин, склад", way: "Ольга, менеджер", arrived: "Ольга, менеджер", done: "Ольга, менеджер" };
    const order = ["in", "pack", "way", "arrived", "done"];
    const shipments = rows.map(([id, clientId, supplier, places, weight, volume, status, ago, packType, consId], i) => {
      const at0 = now - ago * D;
      const sh = { id, clientId, supplier, places, weight, volume, status, packType: packType || null, consId: consId || null,
        photos: [i * 3 + 1, i * 3 + 2], packPhotos: packType ? [i * 3 + 3] : [], createdAt: at0, history: [], cost: 0 };
      const steps = order.slice(0, order.indexOf(status) + 1);
      steps.forEach((st, k) => {
        const at = Math.min(now - 0.05 * D, at0 + [0, 1.2, 2.6, 18, 19.5][k] * D);
        sh.history.push({ st, at, by: staff[st] });
      });
      if (packType) sh.cost = costOf(sh);
      return sh;
    });
    const cons = [
      ["ЦЛ-48213", "KRD-064", "Авто", 9, "way"], ["ЦЛ-48205", "KZN-042", "ЖД", 10, "way"], ["ЦЛ-48197", "MSK-117", "Авто", 12, "way"],
      ["ЦЛ-48170", "SPB-088", "Авто", 20, "arrived"], ["ЦЛ-48121", "MSK-117", "Авто", 30, "done"], ["ЦЛ-48118", "NSK-031", "ЖД", 32, "done"],
      ["ЦЛ-48102", "EKB-215", "Авто", 36, "done"], ["ЦЛ-48099", "MSK-203", "Авто", 38, "done"], ["ЦЛ-48090", "SMR-019", "Авто", 41, "done"],
      ["ЦЛ-48088", "KRD-064", "Авто", 43, "done"], ["ЦЛ-48071", "MSK-117", "Авто", 48, "done"],
    ].map(([id, clientId, transport, ago, status]) => {
      const sentAt = now - ago * D;
      return { id, clientId, transport, sentAt, eta: sentAt + TRANSPORT[transport].days * D, status,
        arrivedAt: status !== "way" ? sentAt + (TRANSPORT[transport].days - 1) * D : null,
        shipIds: shipments.filter((s) => s.consId === id).map((s) => s.id) };
    });
    // оплаты: выданное оплачено полностью, у части клиентов есть долг по текущим грузам
    const paidShare = { "KRD-064": 0.5, "KZN-042": 1, "MSK-117": 0, "SPB-088": 0, "NSK-031": 0, "EKB-215": 0, "MSK-203": 1, "SMR-019": 1 };
    const payments = [];
    clients.forEach((c) => {
      const mine = shipments.filter((s) => s.clientId === c.id && s.cost);
      const doneSum = mine.filter((s) => s.status === "done").reduce((a, s) => a + s.cost, 0);
      const openSum = mine.filter((s) => s.status === "way" || s.status === "arrived").reduce((a, s) => a + s.cost, 0);
      if (doneSum) payments.push({ clientId: c.id, amount: doneSum, at: now - (20 + Math.random() * 10) * D });
      const part = Math.round((openSum * paidShare[c.id]) / 100) * 100;
      if (part) payments.push({ clientId: c.id, amount: part, at: now - (2 + Math.random() * 5) * D });
    });
    return {
      v: 1, clients, shipments, consignments: cons, payments,
      expected: [
        { id: "E-21", clientId: "MSK-117", supplier: "Yiwu Hongda Trading", note: "8 коробок, светильники", at: now - 1.2 * D },
        { id: "E-20", clientId: "NSK-031", supplier: "Ningbo Autoparts Co.", note: "около 30 мест, запчасти", at: now - 2.3 * D },
      ],
      unknown: [
        { id: "Н-08", places: 1, weight: 18, volume: 0.09, note: "Маркировки нет, только номер китайской доставки YT7781023", at: now - 0.3 * D, photo: 901 },
        { id: "Н-07", places: 3, weight: 41, volume: 0.22, note: "На коробках «HD-55», клиента с таким кодом нет", at: now - 1.1 * D, photo: 907 },
      ],
      notes: [
        { id: 1, clientId: ME, text: "Груз П-0344 упакован. Стоимость доставки " + u.money(shipments.find((s) => s.id === "П-0344").cost), at: now - 3.4 * D, read: true },
        { id: 2, clientId: ME, text: "Отправка ЦЛ-48197 в пути, прибытие около " + u.dLong(now + 4 * D), at: now - 12 * D, read: true },
      ],
      seq: { ship: 352, cons: 48231, note: 3, unk: 9 },
      tg: false,
      createdAt: now,
    };
  }

  let S = null;
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { const v = JSON.parse(raw); if (v && v.v === 1) { S = v; return; } } } catch (e) { /* хранилище недоступно */ }
    S = seed();
  }
  let saveT = 0;
  function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* без сохранения */ } }, 120); }
  function reset() { try { localStorage.removeItem(KEY); localStorage.removeItem("cl-ui-v1"); } catch (e) { /* ок */ } S = seed(); }

  // шина событий
  const subs = {};
  const on = (ev, fn) => { (subs[ev] = subs[ev] || []).push(fn); };
  const emit = (ev, data) => { (subs[ev] || []).forEach((fn) => fn(data)); (subs["*"] || []).forEach((fn) => fn(ev, data)); };

  // выборки
  const client = (id) => S.clients.find((c) => c.id === id);
  const ship = (id) => S.shipments.find((s) => s.id === id);
  const cons = (id) => S.consignments.find((c) => c.id === id);
  const shipsOf = (clientId) => S.shipments.filter((s) => s.clientId === clientId);
  function money(clientId) {
    const charged = S.shipments.filter((s) => (!clientId || s.clientId === clientId) && s.cost).reduce((a, s) => a + s.cost, 0);
    const paid = S.payments.filter((p) => !clientId || p.clientId === clientId).reduce((a, p) => a + p.amount, 0);
    return { charged, paid, debt: Math.max(0, charged - paid) };
  }
  function findClient(q) {
    const s = String(q || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!s) return [];
    return S.clients.filter((c) => c.id.replace("-", "").includes(s.replace("-", "")) || c.name.toUpperCase().includes(s));
  }

  function notify(clientId, text) {
    const n = { id: S.seq.note++, clientId, text, at: Date.now(), read: false };
    S.notes.unshift(n);
    if (clientId === ME) emit("push", n);
    return n;
  }

  // действия
  function accept(d) {
    const c = client(d.clientId);
    const sh = { id: "П-0" + S.seq.ship++, clientId: c.id, supplier: d.supplier || "Поставщик не указан", places: d.places, weight: d.weight, volume: d.volume,
      status: "in", packType: null, consId: null, photos: d.photos.slice(), packPhotos: [], createdAt: Date.now(), cost: 0,
      history: [{ st: "in", at: Date.now(), by: "Ли Вэй, склад" }], fresh: true };
    const exp = S.expected.findIndex((e) => e.clientId === c.id);
    if (exp >= 0) { sh.supplier = S.expected[exp].supplier; S.expected.splice(exp, 1); }
    S.shipments.unshift(sh);
    notify(c.id, `Груз принят на складе в Иу: ${u.places(sh.places)}, ${u.kg(sh.weight)}. Фото уже в приложении.`);
    save(); emit("accepted", sh); emit("change");
    return sh;
  }
  function toUnknown(d) {
    const n = { id: "Н-" + String(S.seq.unk++).padStart(2, "0"), places: d.places || 1, weight: d.weight || 0, volume: d.volume || 0, note: d.code ? `На коробках «${d.code}», клиента с таким кодом нет` : "Код не указан", at: Date.now(), photo: (d.photos && d.photos[0]) || 950 };
    S.unknown.unshift(n); save(); emit("unknown", n); emit("change"); return n;
  }
  function assignUnknown(unkId, clientId) {
    const i = S.unknown.findIndex((x) => x.id === unkId); if (i < 0) return null;
    const x = S.unknown[i]; S.unknown.splice(i, 1);
    const sh = accept({ clientId, places: x.places, weight: x.weight, volume: x.volume, photos: [x.photo], supplier: "Поставщик не указан" });
    return sh;
  }
  function pack(id, d) {
    const sh = ship(id); if (!sh) return;
    Object.assign(sh, { status: "pack", packType: d.packType, weight: d.weight, volume: d.volume, packPhotos: d.photos.slice() });
    sh.cost = costOf(sh);
    sh.history.push({ st: "pack", at: Date.now(), by: "Чжан Мин, склад" });
    notify(sh.clientId, `Груз ${sh.id} упакован (${d.packType.toLowerCase()}). Стоимость доставки ${u.money(sh.cost)}.`);
    save(); emit("packed", sh); emit("change");
  }
  function dispatch(shipIds, transport) {
    const list = shipIds.map(ship).filter(Boolean); if (!list.length) return null;
    const now = Date.now();
    const c = { id: "ЦЛ-" + S.seq.cons++, clientId: list[0].clientId, transport, sentAt: now, eta: now + TRANSPORT[transport].days * u.DAY, status: "way", arrivedAt: null, shipIds: list.map((s) => s.id) };
    S.consignments.unshift(c);
    list.forEach((s) => { s.status = "way"; s.consId = c.id; s.history.push({ st: "way", at: now, by: "Ольга, менеджер" }); });
    notify(c.clientId, `Отправлено из Китая: ${list.map((s) => s.id).join(", ")}. Трек-номер ${c.id}, прибытие около ${u.dLong(c.eta)}.`);
    save(); emit("dispatched", c); emit("change");
    return c;
  }
  function arrive(consId) {
    const c = cons(consId); if (!c) return;
    c.status = "arrived"; c.arrivedAt = Date.now();
    c.shipIds.map(ship).forEach((s) => { s.status = "arrived"; s.history.push({ st: "arrived", at: Date.now(), by: "Ольга, менеджер" }); });
    notify(c.clientId, `Отправка ${c.id} прибыла в Москву. Груз можно забирать.`);
    save(); emit("arrived", c); emit("change");
  }
  function issue(consId) {
    const c = cons(consId); if (!c) return;
    c.status = "done";
    c.shipIds.map(ship).forEach((s) => { s.status = "done"; s.history.push({ st: "done", at: Date.now(), by: "Ольга, менеджер" }); });
    notify(c.clientId, `Отправка ${c.id} выдана. Спасибо, что работаете с нами!`);
    save(); emit("issued", c); emit("change");
  }
  function pay(clientId, amount) {
    S.payments.push({ clientId, amount, at: Date.now() });
    notify(clientId, `Оплата ${u.money(amount)} получена. Спасибо!`);
    save(); emit("paid", { clientId, amount }); emit("change");
  }
  function readNotes() { S.notes.forEach((n) => { if (n.clientId === ME) n.read = true; }); save(); }
  function setTg(v) { S.tg = v; save(); emit("change"); }

  load();
  App.store = {
    get S() { return S; }, ME, STATUS, PACK, RATE, TRANSPORT, costOf,
    on, emit, save, reset, client, ship, cons, shipsOf, money, findClient,
    accept, toUnknown, assignUnknown, pack, dispatch, arrive, issue, pay, readNotes, setTg,
  };
})(window.App);
