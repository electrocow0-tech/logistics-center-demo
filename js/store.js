/* Данные прототипа и действия: всё хранится в браузере, сервер не нужен.
   Модель: приход (одна доставка поставщика на склад) → груз (один или несколько приходов клиента после упаковки)
   → отправка (часть мест груза с трек-номером компании). */
(function (App) {
  "use strict";
  const u = App.u;
  const KEY = "cl-demo-v2", UIKEY = "cl-ui-v2", V = 2;
  const ME = "MSK-117"; // клиент, чей телефон показываем

  const WH = [
    { id: "yiwu", ru: "Иу", zh: "义乌", addr: "义乌市 福田街道 商城大道 88号 3号仓" },
    { id: "gz", ru: "Гуанчжоу", zh: "广州", addr: "广州市 白云区 石井街道 庆丰路 26号 B栋" },
    { id: "fs", ru: "Фошань", zh: "佛山", addr: "佛山市 南海区 桂城街道 夏南路 15号 2号仓" },
    { id: "sz", ru: "Шэньчжэнь", zh: "深圳", addr: "深圳市 宝安区 福永街道 凤塘大道 102号 A仓" },
  ];
  const PACK = ["box", "sack", "crate", "pallet"];
  const TRANSPORT = { auto: { days: 16, t: "Авто", label: "Авто, 14–18 дней" }, rail: { days: 24, t: "ЖД", label: "ЖД, 20–28 дней" } };
  const TK = ["СДЭК", "Деловые линии", "ПЭК"];
  // курс: сколько единиц валюты за 1 доллар
  const CUR = {
    RUB: { t: "Рубли", s: "₽", rate: 97.5 }, CNY: { t: "Юани", s: "¥", rate: 7.25 }, KGS: { t: "Сомы", s: "сом", rate: 87.4 },
    KZT: { t: "Тенге", s: "₸", rate: 498 }, USDT: { t: "USDT", s: "USDT", rate: 1 }, USD: { t: "Доллары", s: "$", rate: 1 },
  };
  const STAFF = {
    ramil: { ru: "Рамиль", zh: "拉米尔", role: "Администратор", where: "Москва", ava: "РМ" },
    olga: { ru: "Ольга Королёва", zh: "奥莉加", role: "Менеджер в России", where: "Москва", ava: "ОК" },
    timur: { ru: "Тимур Ахметов", zh: "铁木尔", role: "Менеджер по продажам", where: "Москва", ava: "ТА" },
    darya: { ru: "Дарья Власова", zh: "达里娅", role: "Менеджер по продажам", where: "Казань", ava: "ДВ" },
    natalia: { ru: "Наталья Сергеева", zh: "娜塔莉娅", role: "Бухгалтер", where: "Москва", ava: "НС" },
    sergey: { ru: "Сергей Никитин", zh: "谢尔盖", role: "Москва (выдача)", where: "Москва", ava: "СН" },
    wangtao: { ru: "Ван Тао", zh: "王涛", role: "Менеджер Китая", where: "Гуанчжоу", ava: "ВТ" },
    liwei: { ru: "Ли Вэй", zh: "李伟", role: "Склад в Китае", where: "Иу", ava: "ЛВ" },
    chenjie: { ru: "Чэнь Цзе", zh: "陈杰", role: "Склад в Китае", where: "Гуанчжоу", ava: "ЧЦ" },
    huanglei: { ru: "Хуан Лэй", zh: "黄磊", role: "Склад в Китае", where: "Фошань", ava: "ХЛ" },
    zhaoxin: { ru: "Чжао Синь", zh: "赵欣", role: "Склад в Китае", where: "Шэньчжэнь", ava: "ЧС" },
  };
  const WH_STAFF = { yiwu: "liwei", gz: "chenjie", fs: "huanglei", sz: "zhaoxin" };
  const who = (k, lang) => (STAFF[k] ? STAFF[k][lang === "zh" ? "zh" : "ru"] : k || "");
  // настройка этапов: кто какой этап отмечает
  const STAGES = [["accept", "Приёмка на складе"], ["pack", "Упаковка, готов к отгрузке"], ["send", "Отправка из Китая"], ["arrive", "Прибытие в Россию"], ["issue", "Выдача или передача в ТК"]];
  const SROLES = [["warehouse", "Склад в Китае"], ["cnmanager", "Менеджер Китая"], ["manager", "Менеджер в России"], ["moscow", "Москва (выдача)"], ["admin", "Администратор"]];
  const MATRIX0 = { accept: "11001", pack: "11001", send: "00101", arrive: "00101", issue: "00011" };
  // тарифы (этап 2): сетка по плотности, кг/м³
  const DENS = [[100, "m3", 330], [200, "kg", 2.6], [400, "kg", 2.2], [Infinity, "kg", 1.9]];
  const TARIFF_T = { kg: "за кг", m3: "за м³", density: "по плотности", custom: "индивидуальный" };

  function tariffCalc(c, weight, volume) {
    const t = (c && c.tariff) || { type: "kg", rate: 2.4 };
    let v;
    if (t.type === "m3") v = volume * t.rate;
    else if (t.type === "density") { const d = volume ? weight / volume : 0, row = DENS.find((r) => d < r[0]); v = row[1] === "m3" ? volume * row[2] : weight * row[2]; }
    else v = weight * t.rate;
    return Math.max(0, Math.round(v / 5) * 5);
  }
  function tariffLabel(c) {
    const t = c.tariff;
    if (t.type === "density") return "по плотности груза";
    return u.num(t.rate, 2) + " $ " + (t.type === "m3" ? "за м³" : "за кг") + (t.type === "custom" ? ", индивидуальный" : "");
  }

  function seed() {
    const now = Date.now(), D = u.DAY;
    let rs = 11;
    const rnd = () => { rs = (rs * 9301 + 49297) % 233280; return rs / 233280; };
    const PFX = ["YT", "SF", "JT", "ZT", "DP"];
    const track = () => { let d = ""; for (let i = 0; i < 13; i++) d += Math.floor(rnd() * 10); return PFX[Math.floor(rnd() * PFX.length)] + d; };
    const clients = [
      { id: "MSK-117", name: "ТехноДом", city: "Москва", person: "Андрей Ковалёв", phone: "+7 900 000-00-11", since: "2024", salesId: "timur", tariff: { type: "kg", rate: 2.4 } },
      { id: "KZN-042", name: "Камский текстиль", city: "Казань", person: "Ильдар Сафин", phone: "+7 900 000-00-12", since: "2023", salesId: "darya", tariff: { type: "density" } },
      { id: "EKB-215", name: "УралСтройСнаб", city: "Екатеринбург", person: "Олег Мартынов", phone: "+7 900 000-00-13", since: "2025", salesId: "darya", tariff: { type: "m3", rate: 330 } },
      { id: "SPB-088", name: "Северная мебель", city: "Санкт-Петербург", person: "Мария Лебедева", phone: "+7 900 000-00-14", since: "2024", salesId: "timur", tariff: { type: "m3", rate: 310 } },
      { id: "NSK-031", name: "Сибирь Авто", city: "Новосибирск", person: "Павел Орлов", phone: "+7 900 000-00-15", since: "2023", salesId: "timur", tariff: { type: "kg", rate: 2.2 } },
      { id: "KRD-064", name: "Южный дом", city: "Краснодар", person: "Елена Гаврилова", phone: "+7 900 000-00-16", since: "2025", salesId: "darya", tariff: { type: "density" } },
      { id: "MSK-203", name: "Игротека", city: "Москва", person: "Светлана Ким", phone: "+7 900 000-00-17", since: "2025", salesId: "timur", tariff: { type: "custom", rate: 2.0 } },
      { id: "SMR-019", name: "Волга Спорт", city: "Самара", person: "Артём Белов", phone: "+7 900 000-00-18", since: "2024", salesId: "darya", tariff: { type: "kg", rate: 2.5 } },
    ];
    const cl = (id) => clients.find((c) => c.id === id);
    const receipts = [], cargos = [], ships = [], payments = [];
    let rn = 300, gn = 100, phs = 1, pn = 1;
    function rec(wh, clientId, supplier, places, ago, damage, what) {
      const r = { id: "П-0" + ++rn, wh, clientId, track: track(), supplier, what: what || "", places, damage: damage || "", photos: [phs++, phs++], at: now - ago * D, by: WH_STAFF[wh], cargoId: null };
      receipts.push(r); return r;
    }
    function cargo(wh, clientId, packType, places, weight, volume, ago, recs) {
      const c = { id: "Г-0" + ++gn, wh, clientId, packType, places, weight, volume, photos: [phs++], at: now - ago * D, by: WH_STAFF[wh], sent: 0, receiptIds: [] };
      recs.forEach(([sup, pl, extra]) => { const r = rec(wh, clientId, sup, pl, ago + extra); r.cargoId = c.id; c.receiptIds.push(r.id); });
      cargos.push(c); return c;
    }
    // отправка: items = [[груз, мест]], o = {status, arr (дней назад прибыла), done, issue, paid (доля оплаты 0..1), cur}
    function ship(id, transport, sentAgo, items, o) {
      const c0 = items[0][0], client = cl(c0.clientId), sentAt = now - sentAgo * D;
      let w = 0, v = 0;
      const its = items.map(([c, pl]) => { c.sent += pl; w += (c.weight * pl) / c.places; v += (c.volume * pl) / c.places; return { cargoId: c.id, places: pl }; });
      const cost = tariffCalc(client, w, v);
      const packRate = { box: 0.5, sack: 1, crate: 12, pallet: 18 }[c0.packType];
      const s = { id, clientId: client.id, transport, items: its, sentAt, eta: sentAt + TRANSPORT[transport].days * D, status: o.status, by: "olga",
        arrivedAt: o.arr != null ? now - o.arr * D : null, arrBy: o.arr != null ? "olga" : null, doneAt: o.done != null ? now - o.done * D : null, doneBy: o.done != null ? "sergey" : null,
        issue: o.issue || null, cost, paidUsd: Math.round(cost * (o.paid || 0)),
        docs: [{ name: "Упаковочный лист " + id + ".pdf", at: sentAt, by: "olga" }],
        exp: { pack: Math.round(its.reduce((a, x) => a + x.places, 0) * packRate), carrier: Math.round(cost * (0.6 + rnd() * 0.12)), other: Math.round(cost * 0.02) } };
      if (o.docs) o.docs.forEach((n) => s.docs.push({ name: n + " " + id + ".pdf", at: sentAt + D, by: "olga" }));
      if (s.paidUsd) {
        const cur = o.cur || "RUB", rate = Math.round(CUR[cur].rate * (0.985 + rnd() * 0.03) * 100) / 100, at = (s.doneAt || s.arrivedAt || sentAt + 1.1 * D) - 0.6 * D;
        const big = cur === "RUB" || cur === "KZT" || cur === "KGS", fixed = cur === "USD" || cur === "USDT", raw = s.paidUsd * (fixed ? 1 : rate);
        payments.push({ id: pn++, clientId: client.id, at, amount: big ? Math.round(raw / 100) * 100 : Math.round(raw), cur, rate: fixed ? 1 : rate, usd: s.paidUsd, by: "natalia" });
      }
      ships.push(s); return s;
    }
    // выданные
    ship("ЦЛ-48160", "auto", 48, [[cargo("yiwu", "MSK-117", "box", 21, 300, 1.9, 50, [["Yiwu Hongda Trading", 21, 1]]), 21]], { status: "done", arr: 33, done: 32, issue: { type: "client" }, paid: 1, cur: "RUB" });
    ship("ЦЛ-48165", "rail", 45, [[cargo("yiwu", "KZN-042", "sack", 34, 690, 2.9, 47, [["Shaoxing Keqiao Fabric", 20, 2], ["Shaoxing Keqiao Fabric", 14, 1]]), 34]], { status: "done", arr: 22, done: 21, issue: { type: "tk", tk: "Деловые линии", waybill: "25-00418-331907" }, paid: 1, cur: "RUB" });
    ship("ЦЛ-48171", "auto", 42, [[cargo("gz", "KRD-064", "box", 30, 700, 3.9, 44, [["Dongguan Homeware", 30, 1]]), 30]], { status: "done", arr: 27, done: 26, issue: { type: "tk", tk: "СДЭК", waybill: "10087425516" }, paid: 1, cur: "USDT" });
    ship("ЦЛ-48177", "auto", 38, [[cargo("fs", "EKB-215", "crate", 12, 190, 1.0, 40, [["Foshan Mingde Lighting", 12, 1]]), 12]], { status: "done", arr: 23, done: 22, issue: { type: "tk", tk: "ПЭК", waybill: "МВЕК-7730412" }, paid: 1, cur: "RUB" });
    ship("ЦЛ-48184", "rail", 34, [[cargo("yiwu", "NSK-031", "box", 44, 980, 4.2, 36, [["Ningbo Autoparts Co.", 30, 2], ["Ningbo Autoparts Co.", 14, 1]]), 44]], { status: "done", arr: 11, done: 10, issue: { type: "tk", tk: "Деловые линии", waybill: "25-00431-118452" }, paid: 1, cur: "CNY" });
    ship("ЦЛ-48190", "auto", 31, [[cargo("sz", "MSK-117", "box", 16, 210, 1.3, 33, [["Shenzhen Brightway Electronics", 16, 1]]), 16]], { status: "done", arr: 16, done: 15, issue: { type: "client" }, paid: 1, cur: "USD" });
    // прибыли, ждут выдачи
    ship("ЦЛ-48198", "auto", 18, [[cargo("yiwu", "MSK-203", "box", 25, 160, 2.2, 20, [["Yiwu Joyful Toys", 25, 1]]), 25]], { status: "arrived", arr: 2, paid: 1, cur: "USDT" });
    ship("ЦЛ-48202", "auto", 17, [[cargo("yiwu", "SMR-019", "sack", 14, 240, 1.6, 19, [["Jinhua Sport Goods", 14, 1]]), 14]], { status: "arrived", arr: 0.5 });
    ship("ЦЛ-48205", "auto", 17, [[cargo("gz", "SPB-088", "pallet", 8, 410, 3.2, 20, [["Guangzhou Meitai Furniture", 8, 1]]), 8], [cargo("gz", "SPB-088", "box", 10, 150, 1.05, 19, [["Dongguan Homeware", 10, 1]]), 10]], { status: "arrived", arr: 1, paid: 0.4, cur: "RUB", docs: ["Инвойс"] });
    // в пути
    ship("ЦЛ-48213", "auto", 13, [[cargo("fs", "EKB-215", "crate", 14, 238, 1.12, 15, [["Foshan Mingde Lighting", 14, 1]]), 14]], { status: "way" });
    ship("ЦЛ-48217", "auto", 11, [[cargo("yiwu", "MSK-117", "box", 19, 264, 1.58, 13, [["Yiwu Hongda Trading", 12, 2], ["Jinhua Sport Goods", 7, 1]]), 19]], { status: "way", docs: ["Инвойс"] });
    ship("ЦЛ-48221", "rail", 9, [[cargo("yiwu", "KZN-042", "sack", 40, 820, 3.1, 11, [["Shaoxing Keqiao Fabric", 40, 1]]), 40]], { status: "way", paid: 1, cur: "KZT" });
    ship("ЦЛ-48226", "auto", 2, [[cargo("fs", "KRD-064", "crate", 8, 300, 1.6, 4, [["Foshan Hualong Ceramics", 8, 1]]), 3]], { status: "way" });
    // упакованы, готовы к отгрузке
    cargo("yiwu", "NSK-031", "box", 31, 655, 2.96, 3.4, [["Ningbo Autoparts Co.", 18, 2], ["Ningbo Autoparts Co.", 13, 1]]);
    cargo("gz", "SPB-088", "pallet", 6, 420, 2.8, 3.1, [["Guangzhou Meitai Furniture", 4, 1.5], ["Guangzhou Baiyun Leather", 2, 1]]);
    cargo("sz", "MSK-117", "box", 12, 140, 0.92, 2.6, [["Shenzhen Brightway Electronics", 12, 1]]);
    cargo("yiwu", "KZN-042", "sack", 30, 560, 2.3, 1.8, [["Shaoxing Keqiao Fabric", 18, 1.5], ["Shaoxing Keqiao Fabric", 12, 1]]);
    // приняты, ждут упаковки
    rec("fs", "EKB-215", "Foshan Hualong Ceramics", 10, 3.0);
    rec("gz", "SPB-088", "Guangzhou Meitai Furniture", 4, 2.6);
    rec("sz", "NSK-031", "Shenzhen Carlink Parts", 7, 2.3);
    rec("yiwu", "MSK-117", "Yiwu Hongda Trading", 5, 2.1, "", "Посуда, 5 коробок");
    rec("fs", "EKB-215", "Foshan Mingde Lighting", 14, 1.8);
    rec("yiwu", "MSK-203", "Yiwu Joyful Toys", 15, 1.4, { ru: "Помята одна коробка, содержимое целое", zh: "一箱外箱压扁，内物完好" });
    const unk1 = rec("yiwu", null, "", 3, 1.1); unk1.mark = "HD-55"; unk1.track = "";
    rec("yiwu", "SMR-019", "Jinhua Sport Goods", 9, 0.9);
    rec("yiwu", "KZN-042", "Shaoxing Keqiao Fabric", 22, 0.45);
    rec("gz", null, "", 1, 0.3);
    rec("gz", "KRD-064", "Dongguan Homeware", 11, 0.25);

    const matrix = {};
    STAGES.forEach(([k]) => { matrix[k] = {}; SROLES.forEach(([r], i) => { matrix[k][r] = MATRIX0[k][i] === "1"; }); });
    const mine = ships.find((s) => s.id === "ЦЛ-48217"), g17 = cargos.find((c) => c.clientId === ME && c.wh === "sz" && !c.sent);
    const thr = (ref, wh, msgs) => ({ id: "T-" + ref.id, ref, wh, msgs, read: { ru: 0, zh: msgs.length } });
    const kzn = cargos[cargos.length - 1], dmg = receipts.find((r) => r.damage);
    return {
      v: V, clients, receipts, cargos, ships, payments, matrix,
      expected: [
        { id: "E-34", clientId: "KRD-064", track: track(), supplier: "Foshan Hualong Ceramics", what: "Плитка, 2 паллеты", at: now - 0.8 * D },
        { id: "E-33", clientId: ME, track: "SF1420886375512", supplier: "Shenzhen Brightway Electronics", what: "Наушники, 3 коробки", at: now - 1.3 * D },
        { id: "E-32", clientId: "NSK-031", track: track(), supplier: "Ningbo Autoparts Co.", what: "Запчасти, около 30 мест", at: now - 2.2 * D },
        { id: "E-31", clientId: "SMR-019", track: track(), supplier: "Jinhua Sport Goods", what: "Спортинвентарь, 12 мест", at: now - 3.1 * D },
      ],
      notes: [
        { id: 3, clientId: ME, text: `Груз ${g17.id} упакован: коробка, ${u.places(g17.places)}, ${u.kg(g17.weight)}, ${u.vol(g17.volume)}. Готов к отгрузке.`, at: g17.at, read: true, ref: { t: "cargo", id: g17.id } },
        { id: 2, clientId: ME, text: `Груз принят на складе (Иу): 5 мест от Yiwu Hongda Trading. Фото уже в приложении.`, at: now - 2.1 * D, read: true, ref: null },
        { id: 1, clientId: ME, text: `Отправка ${mine.id} в пути: ${u.places(19)}, прибытие около ${u.dLong(mine.eta)}. Стоимость ${u.usd(mine.cost)}.`, at: mine.sentAt, read: true, ref: { t: "ship", id: mine.id } },
      ],
      chats: [
        thr({ t: "rec", id: dmg.id }, "yiwu", [{ side: "zh", by: "liwei", k: "z3", at: now - 1.35 * D }, { side: "ru", by: "olga", k: "r7", at: now - 1.3 * D }, { side: "zh", by: "liwei", k: "z2", at: now - 0.2 * D }]),
        thr({ t: "cargo", id: kzn.id }, "yiwu", [{ side: "ru", by: "olga", k: "r1", at: now - 1.1 * D }, { side: "zh", by: "liwei", k: "z1", at: now - 1.05 * D }, { side: "ru", by: "olga", k: "r4", at: now - 0.9 * D }, { side: "zh", by: "liwei", k: "z8", at: now - 0.88 * D }]),
        thr({ t: "rec", id: unk1.id }, "yiwu", [{ side: "zh", by: "liwei", k: "z4", at: now - 1.0 * D }]),
      ].map((t, i) => { t.read.ru = i === 1 ? t.msgs.length : t.msgs.length - 1; return t; }),
      seq: { rec: rn + 1, cargo: gn + 1, ship: 48231, note: 4, exp: 35, pay: pn, msg: 1 },
      tg: false, createdAt: now,
    };
  }

  let S = null;
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { const v = JSON.parse(raw); if (v && v.v === V && v.receipts) { S = v; return; } } } catch (e) { /* хранилище недоступно */ }
    S = seed();
  }
  let saveT = 0;
  function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* без сохранения */ } }, 120); }
  function reset() { try { localStorage.removeItem(KEY); localStorage.removeItem(UIKEY); } catch (e) { /* ок */ } S = seed(); }

  // шина событий
  const subs = {};
  const on = (ev, fn) => { (subs[ev] = subs[ev] || []).push(fn); };
  const emit = (ev, data) => { (subs[ev] || []).forEach((fn) => fn(data)); };
  const changed = () => { save(); emit("change"); };

  // ---------- выборки ----------
  const wh = (id) => WH.find((w) => w.id === id) || WH[0];
  const client = (id) => S.clients.find((c) => c.id === id);
  const rec = (id) => S.receipts.find((r) => r.id === id);
  const cargo = (id) => S.cargos.find((c) => c.id === id);
  const ship = (id) => S.ships.find((s) => s.id === id);
  const left = (c) => c.places - c.sent;
  const waiting = (whId) => S.receipts.filter((r) => r.clientId && !r.cargoId && (!whId || r.wh === whId));
  const unknown = (whId) => S.receipts.filter((r) => !r.clientId && (!whId || r.wh === whId));
  const ready = (whId) => S.cargos.filter((c) => left(c) > 0 && (!whId || c.wh === whId));
  const shipsOfCargo = (id) => S.ships.filter((s) => s.items.some((x) => x.cargoId === id));
  function totals(s) {
    let places = 0, weight = 0, volume = 0;
    s.items.forEach((x) => { const c = cargo(x.cargoId); if (!c) return; places += x.places; weight += (c.weight * x.places) / c.places; volume += (c.volume * x.places) / c.places; });
    return { places, weight, volume };
  }
  const isPaid = (s) => s.cost > 0 && s.paidUsd >= s.cost - 0.5;
  function money(clientId) {
    const list = S.ships.filter((s) => !clientId || s.clientId === clientId);
    const charged = list.reduce((a, s) => a + s.cost, 0), paid = list.reduce((a, s) => a + Math.min(s.cost, s.paidUsd), 0);
    return { charged, paid, debt: Math.max(0, charged - paid) };
  }
  const norm = (q) => String(q || "").trim().toUpperCase().replace(/[\s-]+/g, "");
  function findClient(q) {
    const s = norm(q); if (!s) return [];
    return S.clients.filter((c) => c.id.replace("-", "").includes(s) || c.name.toUpperCase().includes(String(q).trim().toUpperCase()));
  }
  // что ввёл склад при приёмке: трек ожидаемого заказа или код клиента
  function matchAccept(q) {
    const s = norm(q); if (!s) return null;
    const exp = S.expected.find((e) => norm(e.track) === s);
    if (exp) return { kind: "track", exp, client: client(exp.clientId) };
    const list = findClient(q), exact = list.find((c) => c.id.replace("-", "") === s);
    if (exact || list.length === 1) return { kind: "code", client: exact || list[0] };
    const like = S.expected.filter((e) => s.length >= 4 && norm(e.track).includes(s));
    if (like.length === 1) return { kind: "like", list: [like[0].track] };
    if (list.length > 1) return { kind: "like", list: list.slice(0, 3).map((c) => c.id) };
    return { kind: "none" };
  }
  const can = (stage, role) => !!(S.matrix[stage] && S.matrix[stage][role]);
  const dmgText = (r, lang) => (!r.damage ? "" : typeof r.damage === "string" ? r.damage : r.damage[lang === "zh" ? "zh" : "ru"]);

  function notify(clientId, text, ref) {
    const n = { id: S.seq.note++, clientId, text, at: Date.now(), read: false, ref: ref || null };
    S.notes.unshift(n);
    if (clientId === ME) emit("push", n);
    return n;
  }

  // ---------- действия этапа 1 ----------
  function addExpected(clientId, d) {
    const e = { id: "E-" + S.seq.exp++, clientId, track: String(d.track).trim().toUpperCase(), supplier: String(d.supplier || "").trim() || "Поставщик не указан", what: String(d.what || "").trim(), at: Date.now() };
    S.expected.unshift(e); changed(); emit("expected", e); return e;
  }
  function removeExpected(id) { S.expected = S.expected.filter((e) => e.id !== id); changed(); }
  function accept(d) {
    const c = client(d.clientId), now = Date.now();
    const r = { id: "П-0" + S.seq.rec++, wh: d.wh, clientId: c.id, track: String(d.track || "").trim().toUpperCase(), supplier: String(d.supplier || "").trim() || "Поставщик не указан", what: d.what || "",
      places: d.places, damage: d.damage || "", photos: d.photos.slice(), at: now, by: d.by || WH_STAFF[d.wh], cargoId: null, fresh: true, expAt: d.expAt || null };
    if (d.expId) S.expected = S.expected.filter((e) => e.id !== d.expId);
    S.receipts.push(r);
    notify(c.id, `Груз принят на складе (${wh(r.wh).ru}): ${u.places(r.places)} от ${r.supplier}. ${r.damage ? "Есть повреждения: " + dmgText(r) + ". " : ""}Фото уже в приложении.`, { t: "rec", id: r.id });
    changed(); emit("accepted", r);
    return r;
  }
  function toUnknown(d) {
    const r = { id: "П-0" + S.seq.rec++, wh: d.wh, clientId: null, track: String(d.track || "").trim().toUpperCase(), mark: String(d.mark || "").trim().toUpperCase(), supplier: "", what: "", places: d.places || 1, damage: d.damage || "",
      photos: d.photos.slice(), at: Date.now(), by: d.by || WH_STAFF[d.wh], cargoId: null, fresh: true };
    S.receipts.push(r); changed(); emit("unknown", r); return r;
  }
  function assignUnknown(recId, clientId) {
    const r = rec(recId), c = client(clientId); if (!r || !c || r.clientId) return null;
    r.clientId = c.id; r.fresh = true; if (!r.supplier) r.supplier = "Поставщик не указан";
    notify(c.id, `Груз принят на складе (${wh(r.wh).ru}): ${u.places(r.places)}. Фото уже в приложении.`, { t: "rec", id: r.id });
    changed(); emit("assigned", r);
    return r;
  }
  function pack(recIds, d) {
    const list = recIds.map(rec).filter((r) => r && r.clientId && !r.cargoId); if (!list.length) return null;
    const c = { id: "Г-0" + S.seq.cargo++, wh: list[0].wh, clientId: list[0].clientId, packType: d.packType, places: d.places, weight: d.weight, volume: d.volume, photos: d.photos.slice(),
      at: Date.now(), by: d.by || WH_STAFF[list[0].wh], sent: 0, receiptIds: list.map((r) => r.id), fresh: true };
    list.forEach((r) => { r.cargoId = c.id; r.fresh = false; });
    S.cargos.push(c);
    const PK = { box: "коробки", sack: "мешки", crate: "обрешётка", pallet: "паллеты" };
    notify(c.clientId, `Груз ${c.id} упакован${list.length > 1 ? " (объединили " + list.length + " " + u.plural(list.length, "приход", "прихода", "приходов") + ")" : ""}: ${PK[c.packType]}, ${u.places(c.places)}, ${u.kg(c.weight)}, ${u.vol(c.volume)}. Готов к отгрузке.`, { t: "cargo", id: c.id });
    changed(); emit("packed", c);
    return c;
  }
  // sel = {id груза: сколько мест уезжает}
  function dispatch(sel, d) {
    const items = Object.keys(sel).map((id) => ({ c: cargo(id), places: sel[id] })).filter((x) => x.c && x.places > 0 && x.places <= left(x.c));
    if (!items.length) return null;
    const now = Date.now(), cid = items[0].c.clientId;
    const s = { id: "ЦЛ-" + S.seq.ship++, clientId: cid, transport: d.transport, items: items.map((x) => ({ cargoId: x.c.id, places: x.places })), sentAt: now, eta: now + TRANSPORT[d.transport].days * u.DAY,
      status: "way", by: d.by || "olga", arrivedAt: null, arrBy: null, doneAt: null, doneBy: null, issue: null, cost: Math.max(0, Math.round(d.cost || 0)), paidUsd: 0, docs: [], exp: { pack: 0, carrier: 0, other: 0 }, fresh: true };
    items.forEach((x) => { x.c.sent += x.places; x.c.fresh = false; });
    const t = totals(s);
    s.exp = { pack: Math.round(t.places * 1.5), carrier: Math.round(s.cost * 0.64), other: Math.round(s.cost * 0.02) };
    S.ships.push(s);
    const rest = items.reduce((a, x) => a + left(x.c), 0);
    notify(cid, `Отправлено ${u.places(t.places)}${rest ? ", ещё " + u.places(rest) + " ждут следующей отправки" : ""}. Трек-номер ${s.id}, прибытие около ${u.dLong(s.eta)}.${s.cost ? " Стоимость " + u.usd(s.cost) + "." : ""}`, { t: "ship", id: s.id });
    if (d.paid && s.cost) { s.paidUsd = s.cost; S.payments.push({ id: S.seq.pay++, clientId: cid, at: now, amount: s.cost, cur: "USD", rate: 1, usd: s.cost, by: d.by || "olga", shipId: s.id }); }
    changed(); emit("dispatched", s);
    return s;
  }
  function arrive(id, by) {
    const s = ship(id); if (!s || s.status !== "way") return null;
    s.status = "arrived"; s.arrivedAt = Date.now(); s.arrBy = by || "olga"; s.fresh = true;
    notify(s.clientId, `Отправка ${s.id} прибыла в Россию. Готовим к выдаче в Москве.`, { t: "ship", id: s.id });
    changed(); emit("arrived", s);
    return s;
  }
  function issue(id, d) {
    const s = ship(id); if (!s || s.status !== "arrived") return null;
    s.status = "done"; s.doneAt = Date.now(); s.doneBy = d.by || "sergey"; s.fresh = false;
    s.issue = d.type === "tk" ? { type: "tk", tk: d.tk, waybill: String(d.waybill || "").trim() } : { type: "client" };
    notify(s.clientId, d.type === "tk" ? `Отправка ${s.id} передана в транспортную компанию ${d.tk}, накладная ${s.issue.waybill}.` : `Отправка ${s.id} выдана. Спасибо, что работаете с нами!`, { t: "ship", id: s.id });
    changed(); emit("issued", s);
    return s;
  }
  function setPaid(id, paid, by) {
    const s = ship(id); if (!s) return;
    if (paid && !isPaid(s)) {
      const rest = s.cost - s.paidUsd; s.paidUsd = s.cost;
      S.payments.push({ id: S.seq.pay++, clientId: s.clientId, at: Date.now(), amount: rest, cur: "USD", rate: 1, usd: rest, by: by || "olga", shipId: s.id });
      notify(s.clientId, `Оплата по отправке ${s.id} отмечена: ${u.usd(s.cost)}. Спасибо!`, { t: "ship", id: s.id });
    } else if (!paid) {
      s.paidUsd = 0; S.payments = S.payments.filter((p) => p.shipId !== s.id);
    }
    changed(); emit("paidFlag", s);
  }
  function addDoc(id, name, by) {
    const s = ship(id); if (!s) return;
    s.docs.push({ name: name + " " + s.id + ".pdf", at: Date.now(), by: by || "olga" });
    notify(s.clientId, `К отправке ${s.id} добавлен документ: ${name.toLowerCase()}.`, { t: "ship", id: s.id });
    changed();
  }
  function setStage(stage, role, v) { if (S.matrix[stage] && role !== "admin") { S.matrix[stage][role] = !!v; changed(); } }
  function setSales(clientId, salesId) { const c = client(clientId); if (c) { c.salesId = salesId; changed(); } }
  function readNotes() { let ch = false; S.notes.forEach((n) => { if (n.clientId === ME && !n.read) { n.read = true; ch = true; } }); if (ch) save(); }
  function setTg(v) { S.tg = v; changed(); }

  // ---------- этап 2: деньги ----------
  function pay(clientId, d) {
    const rate = d.cur === "USD" || d.cur === "USDT" ? 1 : d.rate, usd = Math.round((d.amount / rate) * 100) / 100;
    const p = { id: S.seq.pay++, clientId, at: Date.now(), amount: d.amount, cur: d.cur, rate, usd, by: d.by || "natalia" };
    S.payments.push(p);
    let rest = usd;
    S.ships.filter((s) => s.clientId === clientId && !isPaid(s)).sort((a, b) => a.sentAt - b.sentAt).forEach((s) => { const need = s.cost - s.paidUsd, x = Math.min(need, rest); s.paidUsd = Math.round((s.paidUsd + x) * 100) / 100; rest -= x; });
    notify(clientId, `Оплата получена: ${d.cur === "USD" ? u.usd(d.amount) : u.groups(Math.round(d.amount)) + " " + CUR[d.cur].s + " = " + u.usd(usd)}. ${money(clientId).debt > 0.5 ? "Остаток долга " + u.usd(money(clientId).debt) + "." : "Долга нет, спасибо!"}`, null);
    changed(); emit("paid", p);
    return p;
  }
  function setExp(id, exp) { const s = ship(id); if (s) { s.exp = { pack: Math.max(0, Math.round(exp.pack)), carrier: Math.max(0, Math.round(exp.carrier)), other: Math.max(0, Math.round(exp.other)) }; changed(); } }
  const expSum = (s) => s.exp.pack + s.exp.carrier + s.exp.other;
  function setTariff(clientId, t) { const c = client(clientId); if (c) { c.tariff = t.type === "density" ? { type: "density" } : { type: t.type, rate: t.rate }; changed(); } }

  // ---------- этап 3: чат с автопереводом ----------
  const thread = (id) => S.chats.find((t) => t.id === id);
  function threadFor(ref) {
    let t = S.chats.find((x) => x.ref.t === ref.t && x.ref.id === ref.id);
    if (!t) { const o = ref.t === "rec" ? rec(ref.id) : cargo(ref.id); t = { id: "T-" + ref.id, ref: { t: ref.t, id: ref.id }, wh: o ? o.wh : "yiwu", msgs: [], read: { ru: 0, zh: 0 } }; S.chats.push(t); save(); }
    return t;
  }
  const unread = (t, side) => Math.max(0, t.msgs.filter((m) => m.side !== side).length - t.msgs.slice(0, t.read[side]).filter((m) => m.side !== side).length);
  const unreadAll = (side, whId) => S.chats.filter((t) => !whId || t.wh === whId).reduce((a, t) => a + unread(t, side), 0);
  function chatSend(id, side, by, d) {
    const t = thread(id); if (!t) return null;
    const m = { side, by, at: Date.now() }; if (d.k) m.k = d.k; else m.text = String(d.text || "").trim().slice(0, 300);
    if (!m.k && !m.text) return null;
    t.msgs.push(m); t.read[side] = t.msgs.length;
    changed(); emit("chat", { t, m });
    return m;
  }
  function chatRead(id, side) { const t = thread(id); if (t && t.read[side] !== t.msgs.length) { t.read[side] = t.msgs.length; save(); return true; } return false; }

  load();
  App.store = {
    get S() { return S; }, ME, KEY, UIKEY, WH, PACK, TRANSPORT, TK, CUR, STAFF, WH_STAFF, STAGES, SROLES, DENS, TARIFF_T,
    on, emit, save, reset, who, wh, client, rec, cargo, ship, left, waiting, unknown, ready, shipsOfCargo, totals, isPaid, money, findClient, matchAccept, can, dmgText,
    tariffCalc, tariffLabel, addExpected, removeExpected, accept, toUnknown, assignUnknown, pack, dispatch, arrive, issue, setPaid, addDoc, setStage, setSales, readNotes, setTg,
    pay, setExp, expSum, setTariff, thread, threadFor, unread, unreadAll, chatSend, chatRead,
  };
})(window.App);
