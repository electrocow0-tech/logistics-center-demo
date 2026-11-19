/* Данные прототипа и действия: всё хранится в браузере, сервер не нужен.
   Модель: приход (одна доставка поставщика на склад) → администратор организует упаковку: заказ с нашим трек-номером TT-<код клиента><номер>
   → склад собирает грузы и упаковывает (виды упаковки с количеством, размеры, вес) → груз под тем же трек-номером → отправка (вид доставки, маршрут, место назначения).
   Заказ, груз и отправка носят один и тот же номер TT. Каждое действие пишется в историю: кто, когда, что сделал. */
(function (App) {
  "use strict";
  const u = App.u;
  const KEY = "cl-demo-v3", UIKEY = "cl-ui-v3", V = 4;
  const ME = "D051"; // клиент, чей телефон показываем

  const WH = [
    { id: "yiwu", ru: "Иу", zh: "义乌", addr: "义乌市 福田街道 商城大道 88号 3号仓" },
    { id: "gz", ru: "Гуанчжоу", zh: "广州", addr: "广州市 白云区 石井街道 庆丰路 26号 B栋" },
    { id: "fs", ru: "Фошань", zh: "佛山", addr: "佛山市 南海区 桂城街道 夏南路 15号 2号仓" },
    { id: "sz", ru: "Шэньчжэнь", zh: "深圳", addr: "深圳市 宝安区 福永街道 凤塘大道 102号 A仓" },
  ];
  // четыре вида упаковки из ТЗ заказчика, у одного груза может быть несколько видов с количеством
  const PACK = ["bag", "crate", "pallet", "wbox"];
  const PACK_RU = { bag: "мешок и скотч", crate: "обрешётка", pallet: "паллет", wbox: "ящик" };
  const ROUTES = ["3G", "88G", "89G", "81G"];
  const DEST = ["Москва", "Санкт-Петербург", "Казань", "Екатеринбург", "Новосибирск", "Краснодар", "Самара", "Алматы", "Бишкек"];
  const TRANSPORT = {
    auto: { days: 16, t: "Авто", low: "авто", label: "Авто, 14–18 дней", ic: "truck" },
    rail: { days: 24, t: "ЖД", low: "ЖД", label: "ЖД, 20–28 дней", ic: "train" },
    air: { days: 7, t: "Авиа", low: "авиа", label: "Авиа, 5–9 дней", ic: "plane" },
  };
  const TK = ["СДЭК", "Деловые линии", "ПЭК"];
  // курс: сколько единиц валюты за 1 доллар
  const CUR = {
    RUB: { t: "Рубли", s: "₽", rate: 97.5 }, CNY: { t: "Юани", s: "¥", rate: 7.25 }, KGS: { t: "Сомы", s: "сом", rate: 87.4 },
    KZT: { t: "Тенге", s: "₸", rate: 498 }, USDT: { t: "USDT", s: "USDT", rate: 1 }, USD: { t: "Доллары", s: "$", rate: 1 },
  };
  // сотрудники: kind admin (владелец, полный доступ), office (доступ настраивает администратор), wh (склад, работает с телефона)
  const STAFF0 = {
    ramil: { ru: "Рамиль", zh: "拉米尔", role: "Администратор", where: "Москва", ava: "РМ", login: "ramil", kind: "admin" },
    olga: { ru: "Ольга Королёва", zh: "奥莉加", role: "Логист", where: "Москва", ava: "ОК", login: "olga.koroleva", kind: "office" },
    timur: { ru: "Тимур Ахметов", zh: "铁木尔", role: "Менеджер по продажам", where: "Москва", ava: "ТА", login: "timur.akhmetov", kind: "office" },
    darya: { ru: "Дарья Власова", zh: "达里娅", role: "Менеджер по продажам", where: "Казань", ava: "ДВ", login: "darya.vlasova", kind: "office" },
    natalia: { ru: "Наталья Сергеева", zh: "娜塔莉娅", role: "Бухгалтер", where: "Москва", ava: "НС", login: "natalia.sergeeva", kind: "office" },
    sergey: { ru: "Сергей Никитин", zh: "谢尔盖", role: "Выдача в Москве", where: "Москва", ava: "СН", login: "sergey.nikitin", kind: "office" },
    liwei: { ru: "Ли Вэй", zh: "李伟", role: "Склад в Китае", where: "Иу", ava: "ЛВ", login: "li.wei", kind: "wh" },
    chenjie: { ru: "Чэнь Цзе", zh: "陈杰", role: "Склад в Китае", where: "Гуанчжоу", ava: "ЧЦ", login: "chen.jie", kind: "wh" },
    huanglei: { ru: "Хуан Лэй", zh: "黄磊", role: "Склад в Китае", where: "Фошань", ava: "ХЛ", login: "huang.lei", kind: "wh" },
    zhaoxin: { ru: "Чжао Синь", zh: "赵欣", role: "Склад в Китае", where: "Шэньчжэнь", ava: "ЧС", login: "zhao.xin", kind: "wh" },
  };
  const WH_STAFF = { yiwu: "liwei", gz: "chenjie", fs: "huanglei", sz: "zhaoxin" };
  // разделы и функции, которые администратор открывает сотрудникам
  const SECTIONS = [["cargo", "Грузы", "воронка и карточки грузов"], ["clients", "Клиенты", "список и карточки клиентов"], ["ships", "Отправки", "трек-номера, прибытие, документы"],
    ["money", "Деньги", "оплаты, долги, расходы, тарифы", 2], ["chat", "Чат со складом", "переписка с автопереводом", 3], ["reports", "Отчёты", "объёмы, сроки, выгрузки"], ["history", "История действий", "кто, когда, что сделал"]];
  const FUNCS = [["accept", "Принимать груз", "вносить приход с компьютера"], ["bind", "Привязывать клиента", "разбирать «Неизвестные»"], ["packcmd", "Организовать упаковку", "выбрать грузы клиента, наш трек-номер, задача складу"],
    ["dispatch", "Отправлять грузы", "вид доставки, маршрут, место назначения"], ["arrive", "Отмечать прибытие", "отправка прибыла в Россию"], ["issue", "Выдавать и передавать в ТК", "выдача клиенту, накладная ТК"], ["cost", "Видеть стоимость и оплаты", "суммы в долларах, отметка «Оплачено»"]];
  // готовые наборы прав: одной кнопкой, дальше правится вручную
  const PRESETS = { wh: ["как кладовщик", "cargo", "accept"], manager: ["как менеджер", "cargo clients ships chat", "accept bind packcmd dispatch arrive issue cost"], acc: ["как бухгалтер", "ships money reports", "cost"] };
  const ACCESS0 = {
    olga: { s: "cargo clients ships chat", f: "accept bind packcmd dispatch arrive cost", scope: "all" },
    timur: { s: "cargo clients", f: "", scope: "sel" },
    darya: { s: "cargo clients", f: "", scope: "sel" },
    natalia: { s: "ships money reports", f: "cost", scope: "all" },
    sergey: { s: "cargo ships", f: "arrive issue", scope: "all" },
  };
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
  const cnyUsd = (cny) => Math.round(cny / CUR.CNY.rate);
  const recsWord = (n) => n + " " + u.plural(n, "приход", "прихода", "приходов");

  const packsSum = (p) => PACK.reduce((a, k) => a + (p[k] || 0), 0);
  const packsText = (p) => PACK.filter((k) => p[k] > 0).map((k) => PACK_RU[k] + " " + p[k]).join(", ") || "не указана";
  // объём считается сам по размерам: строки «длина × ширина × высота × мест», сантиметры
  const dimsVolume = (dims) => Math.round((dims || []).reduce((a, d) => a + ((+d.l || 0) * (+d.w || 0) * (+d.h || 0) * (+d.n || 0)) / 1e6, 0) * 100) / 100;
  const dimsPlaces = (dims) => (dims || []).reduce((a, d) => a + (parseInt(d.n, 10) || 0), 0);

  // тексты истории действий: одни и те же для исходных данных и для действий в прототипе
  const LT = {
    accept: (r) => `Приёмка: ${r.id}, ${u.places(r.places)}, клиент ${r.clientId}, склад ${wh(r.wh).ru}${r.deliv ? ", доставка до склада " + u.cny(r.deliv) : ""}${r.extra ? ", доп. расходы " + u.cny(r.extra) : ""}${r.damage ? ", есть повреждение" : ""}`,
    unknown: (r) => `Приёмка без кода клиента: ${r.id}, ${u.places(r.places)}, склад ${wh(r.wh).ru}. Груз в «Неизвестных»`,
    bind: (r) => `Клиент привязан: ${r.id} теперь у клиента ${r.clientId}`,
    packcmd: (t) => `Упаковка организована: ${t.id}, ${recsWord(t.receiptIds.length)} клиента ${t.clientId}${t.name ? ", " + t.name.charAt(0).toLowerCase() + t.name.slice(1) : ""}`,
    collected: (t, all) => `Сборка: ${t.id}, найдено ${t.receiptIds.length} из ${all}, груз передан на упаковку`,
    lost: (r, t) => `Не найден при сборке: ${r.id} из ${t.id}, груз остаётся на складе`,
    packed: (c) => `Упаковка: ${c.id}, ${packsText(c.packs)}, ${u.kg(c.weight)}, ${u.vol(c.volume)}`,
    dispatch: (s) => `Отправка: ${s.id}, ${TRANSPORT[s.transport].low}, маршрут ${s.route}, ${s.dest}${s.cost ? ", " + u.usd(s.cost) : ""}`,
    arrive: (s) => `Прибытие: груз ${s.id} прибыл в Россию`,
    issue: (s) => (s.issue.type === "tk" ? `Передача в ТК: груз ${s.id}, ${s.issue.tk}, накладная ${s.issue.waybill}` : `Выдача: груз ${s.id} выдан клиенту ${s.clientId}`),
  };

  function seed() {
    const now = Date.now(), D = u.DAY;
    let rs = 11;
    const rnd = () => { rs = (rs * 9301 + 49297) % 233280; return rs / 233280; };
    const PFX = ["YT", "SF", "JT", "ZT", "DP"];
    const track = () => { let d = ""; for (let i = 0; i < 13; i++) d += Math.floor(rnd() * 10); return PFX[Math.floor(rnd() * PFX.length)] + d; };
    const clients = [
      { id: "D051", name: "ТехноДом", city: "Москва", person: "Андрей Ковалёв", phone: "+7 900 000-00-11", since: "2024", salesId: "timur", tariff: { type: "kg", rate: 2.4 } },
      { id: "W001", name: "Камский текстиль", city: "Казань", person: "Ильдар Сафин", phone: "+7 900 000-00-12", since: "2023", salesId: "darya", tariff: { type: "density" } },
      { id: "W006", name: "УралСтройСнаб", city: "Екатеринбург", person: "Олег Мартынов", phone: "+7 900 000-00-13", since: "2025", salesId: "darya", tariff: { type: "m3", rate: 330 } },
      { id: "K014", name: "Северная мебель", city: "Санкт-Петербург", person: "Мария Лебедева", phone: "+7 900 000-00-14", since: "2024", salesId: "timur", tariff: { type: "m3", rate: 310 } },
      { id: "A023", name: "Сибирь Авто", city: "Новосибирск", person: "Павел Орлов", phone: "+7 900 000-00-15", since: "2023", salesId: "timur", tariff: { type: "kg", rate: 2.2 } },
      { id: "M112", name: "Южный дом", city: "Краснодар", person: "Елена Гаврилова", phone: "+7 900 000-00-16", since: "2025", salesId: "darya", tariff: { type: "density" } },
      { id: "S007", name: "Игротека", city: "Москва", person: "Светлана Ким", phone: "+7 900 000-00-17", since: "2025", salesId: "timur", tariff: { type: "custom", rate: 2.0 } },
      { id: "T045", name: "Волга Спорт", city: "Самара", person: "Артём Белов", phone: "+7 900 000-00-18", since: "2024", salesId: "darya", tariff: { type: "kg", rate: 2.5 } },
    ];
    const cl = (id) => clients.find((c) => c.id === id);
    const receipts = [], tasks = [], cargos = [], ships = [], payments = [];
    let rn = 300, tt = 2706, phs = 1, pn = 1, flip = 0;
    const boss = () => (flip++ % 3 === 0 ? "ramil" : "olga");
    function rec(whId, clientId, supplier, places, ago, o) {
      o = o || {};
      const r = { id: "П-0" + ++rn, wh: whId, clientId, track: track(), supplier, what: o.what || "", places, photos: [phs++, phs++], dpay: o.deliv ? "wh" : o.dpay || null, deliv: o.deliv || 0, extra: o.extra || 0, damage: o.damage || "", note: o.note || "", at: now - ago * D, by: WH_STAFF[whId], taskId: null, cargoId: null };
      receipts.push(r); return r;
    }
    // заказ на упаковку: наш трек-номер TT-<код клиента><номер> присваивается в этот момент
    function task(recs, name, packPlan, transport, note, ago, status) {
      const t = { id: "TT-" + recs[0].clientId + ++tt, wh: recs[0].wh, clientId: recs[0].clientId, receiptIds: recs.map((r) => r.id), name, packPlan, transport: transport || "", note: note || "", date: now - ago * D, at: now - ago * D, by: boss(),
        status, collectedAt: status === "collect" ? null : now - (ago - 0.15) * D, collectedBy: status === "collect" ? null : WH_STAFF[recs[0].wh], doneAt: null, doneBy: null };
      recs.forEach((r) => { r.taskId = t.id; });
      tasks.push(t); return t;
    }
    function cargo(whId, clientId, name, packs, weight, vol, ago, recs, transport) {
      const rr = recs.map(([sup, pl, extra]) => rec(whId, clientId, sup, pl, ago + extra));
      const t = task(rr, name, PACK.filter((k) => packs[k]), transport || "auto", "", ago + 0.4, "done");
      const n = packsSum(packs), h = Math.max(20, Math.round((vol * 1e6) / (n * 60 * 40))), dims = [{ l: 60, w: 40, h, n }];
      const c = { id: t.id, wh: whId, clientId, taskId: t.id, name, packs, packType: PACK.filter((k) => packs[k]).sort((a, b) => packs[b] - packs[a])[0], dims, places: n, weight, volume: dimsVolume(dims), photos: [phs++], note: "", transport: t.transport, at: now - ago * D, by: WH_STAFF[whId], sent: 0, receiptIds: rr.map((r) => r.id) };
      rr.forEach((r) => { r.cargoId = c.id; r.charged = true; });
      t.doneAt = c.at; t.doneBy = c.by;
      cargos.push(c); return c;
    }
    // отправка: груз уезжает целиком под своим трек-номером; o = {status, arr (дней назад прибыл), done, issue, paid (доля оплаты 0..1), cur}
    function ship(c, transport, route, sentAgo, o) {
      const client = cl(c.clientId), sentAt = now - sentAgo * D, by = boss();
      c.sent = c.places;
      const cost = tariffCalc(client, c.weight, c.volume), packRate = { bag: 0.5, wbox: 6, crate: 12, pallet: 18 }[c.packType];
      const s = { id: c.id, clientId: client.id, transport, route, dest: client.city, items: [{ cargoId: c.id, places: c.places }], sentAt, eta: sentAt + TRANSPORT[transport].days * D, status: o.status, by,
        arrivedAt: o.arr != null ? now - o.arr * D : null, arrBy: o.arr != null ? by : null, doneAt: o.done != null ? now - o.done * D : null, doneBy: o.done != null ? "sergey" : null,
        issue: o.issue || null, cost, doorUsd: 0, doorCny: 0, paidUsd: Math.round(cost * (o.paid || 0)),
        docs: [{ name: "Упаковочный лист " + c.id + ".pdf", at: sentAt, by }],
        exp: { pack: Math.round(c.places * packRate), carrier: Math.round(cost * (0.6 + rnd() * 0.12)), other: Math.round(cost * 0.02) } };
      if (o.docs) o.docs.forEach((n) => s.docs.push({ name: n + " " + c.id + ".pdf", at: sentAt + D, by }));
      if (s.paidUsd) {
        const cur = o.cur || "RUB", rate = Math.round(CUR[cur].rate * (0.985 + rnd() * 0.03) * 100) / 100, at = (s.doneAt || s.arrivedAt || sentAt + 1.1 * D) - 0.6 * D;
        const big = cur === "RUB" || cur === "KZT" || cur === "KGS", fixed = cur === "USD" || cur === "USDT", raw = s.paidUsd * (fixed ? 1 : rate);
        payments.push({ id: pn++, clientId: client.id, at, amount: big ? Math.round(raw / 100) * 100 : Math.round(raw), cur, rate: fixed ? 1 : rate, usd: s.paidUsd, by: "natalia", shipId: null });
      }
      ships.push(s); return s;
    }
    // выданные
    ship(cargo("yiwu", "D051", "Посуда и текстиль", { bag: 21 }, 300, 1.9, 50, [["Yiwu Hongda Trading", 21, 1]]), "auto", "3G", 48, { status: "done", arr: 33, done: 32, issue: { type: "client" }, paid: 1, cur: "RUB" });
    ship(cargo("yiwu", "W001", "Ткани", { bag: 34 }, 690, 2.9, 47, [["Shaoxing Keqiao Fabric", 20, 2], ["Shaoxing Keqiao Fabric", 14, 1]], "rail"), "rail", "88G", 45, { status: "done", arr: 22, done: 21, issue: { type: "tk", tk: "Деловые линии", waybill: "25-00418-331907" }, paid: 1, cur: "RUB" });
    ship(cargo("gz", "M112", "Товары для дома", { bag: 30 }, 700, 3.9, 44, [["Dongguan Homeware", 30, 1]]), "auto", "3G", 42, { status: "done", arr: 27, done: 26, issue: { type: "tk", tk: "СДЭК", waybill: "10087425516" }, paid: 1, cur: "USDT" });
    ship(cargo("fs", "W006", "Светильники", { crate: 12 }, 190, 1.0, 40, [["Foshan Mingde Lighting", 12, 1]]), "auto", "89G", 38, { status: "done", arr: 23, done: 22, issue: { type: "tk", tk: "ПЭК", waybill: "МВЕК-7730412" }, paid: 1, cur: "RUB" });
    ship(cargo("yiwu", "A023", "Автозапчасти", { bag: 40, wbox: 4 }, 980, 4.2, 36, [["Ningbo Autoparts Co.", 30, 2], ["Ningbo Autoparts Co.", 14, 1]], "rail"), "rail", "81G", 34, { status: "done", arr: 11, done: 10, issue: { type: "tk", tk: "Деловые линии", waybill: "25-00431-118452" }, paid: 1, cur: "CNY" });
    ship(cargo("sz", "D051", "Электроника", { wbox: 16 }, 210, 1.3, 23, [["Shenzhen Brightway Electronics", 16, 1]], "air"), "air", "3G", 21, { status: "done", arr: 16, done: 15, issue: { type: "client" }, paid: 1, cur: "USD" });
    // прибыли, ждут выдачи
    ship(cargo("yiwu", "S007", "Игрушки", { bag: 25 }, 160, 2.2, 20, [["Yiwu Joyful Toys", 25, 1]]), "auto", "3G", 18, { status: "arrived", arr: 2, paid: 1, cur: "USDT" });
    ship(cargo("yiwu", "T045", "Спортинвентарь", { bag: 14 }, 240, 1.6, 19, [["Jinhua Sport Goods", 14, 1]]), "auto", "88G", 17, { status: "arrived", arr: 0.5 });
    ship(cargo("gz", "K014", "Мебель", { pallet: 8 }, 410, 3.2, 20, [["Guangzhou Meitai Furniture", 8, 1]]), "auto", "89G", 17, { status: "arrived", arr: 1, paid: 0.4, cur: "RUB", docs: ["Инвойс"] });
    ship(cargo("gz", "K014", "Фурнитура", { bag: 10 }, 150, 1.05, 19, [["Dongguan Homeware", 10, 1]]), "auto", "89G", 17, { status: "arrived", arr: 1 });
    // в пути
    ship(cargo("fs", "W006", "Светильники", { crate: 14 }, 238, 1.12, 15, [["Foshan Mingde Lighting", 14, 1]]), "auto", "89G", 13, { status: "way" });
    ship(cargo("yiwu", "D051", "Посуда и спорттовары", { bag: 19 }, 264, 1.58, 13, [["Yiwu Hongda Trading", 12, 2], ["Jinhua Sport Goods", 7, 1]]), "auto", "3G", 11, { status: "way", docs: ["Инвойс"] });
    ship(cargo("yiwu", "W001", "Ткани", { bag: 40 }, 820, 3.1, 11, [["Shaoxing Keqiao Fabric", 40, 1]], "rail"), "rail", "88G", 9, { status: "way", paid: 1, cur: "KZT" });
    ship(cargo("fs", "M112", "Керамика", { crate: 8 }, 300, 1.6, 4, [["Foshan Hualong Ceramics", 8, 1]]), "auto", "3G", 2, { status: "way" });
    // упакованы, ждут отправки
    cargo("yiwu", "A023", "Автозапчасти", { bag: 31 }, 655, 2.96, 3.4, [["Ningbo Autoparts Co.", 18, 2], ["Ningbo Autoparts Co.", 13, 1]]);
    cargo("gz", "K014", "Мебель и кожа", { pallet: 4, bag: 2 }, 420, 2.8, 3.1, [["Guangzhou Meitai Furniture", 4, 1.5], ["Guangzhou Baiyun Leather", 2, 1]]);
    cargo("sz", "D051", "Наушники", { wbox: 12 }, 140, 0.92, 2.6, [["Shenzhen Brightway Electronics", 12, 1]], "air");
    cargo("yiwu", "W001", "Ткани", { bag: 30 }, 560, 2.3, 1.8, [["Shaoxing Keqiao Fabric", 18, 1.5], ["Shaoxing Keqiao Fabric", 12, 1]], "rail");
    // упаковка организована: один заказ склад уже собрал и пакует, второй только получил
    task([rec("fs", "W006", "Foshan Hualong Ceramics", 10, 3.0, { deliv: 60 }), rec("fs", "W006", "Foshan Mingde Lighting", 14, 1.8)], "Плитка и светильники", ["crate"], "auto", "Плитка хрупкая, обрешётка обязательна", 1.2, "packing");
    task([rec("sz", "A023", "Shenzhen Carlink Parts", 7, 2.3, { deliv: 40 })], "Автозапчасти", ["bag"], "rail", "", 0.6, "collect");
    // приняты, лежат на складе
    rec("gz", "K014", "Guangzhou Meitai Furniture", 4, 2.6);
    rec("yiwu", "D051", "Yiwu Hongda Trading", 5, 2.1, { what: "Посуда, 5 коробок", deliv: 45 });
    rec("yiwu", "W001", "Yiwu Textile City", 9, 1.9);
    rec("yiwu", "S007", "Yiwu Joyful Toys", 15, 1.4, { dpay: "supplier", damage: { ru: "Помята одна коробка, содержимое целое", zh: "一箱外箱压扁，内物完好" } });
    const unk1 = rec("yiwu", null, "", 3, 1.1, { note: { ru: "На коробке маркировка HD-55", zh: "箱上唛头 HD-55" } }); unk1.track = "";
    rec("yiwu", "T045", "Jinhua Sport Goods", 9, 0.9);
    rec("gz", "K014", "Guangzhou Baiyun Leather", 3, 0.8, { deliv: 30, extra: 15 });
    rec("yiwu", "W001", "Shaoxing Keqiao Fabric", 22, 0.45, { deliv: 120 });
    rec("gz", null, "", 1, 0.3);
    rec("yiwu", "W001", "Hangzhou Silk Road", 6, 0.28);
    rec("gz", "M112", "Dongguan Homeware", 11, 0.25);

    const access = {}, staff = JSON.parse(JSON.stringify(STAFF0));
    Object.keys(staff).forEach((k) => { staff[k].pass = "demo"; });
    Object.keys(ACCESS0).forEach((k) => {
      const a = ACCESS0[k], s = a.s.split(" "), f = a.f.split(" ");
      access[k] = { sec: {}, fn: {}, scope: a.scope, clients: a.scope === "sel" ? clients.filter((c) => c.salesId === k).map((c) => c.id) : [] };
      SECTIONS.forEach(([id]) => { access[k].sec[id] = s.includes(id); });
      FUNCS.forEach(([id]) => { access[k].fn[id] = f.includes(id); });
    });

    // история действий по исходным данным
    const log = [];
    const L = (at, by, k, t, ids, c) => log.push({ at, by, k, t, ids, c: c || null });
    receipts.forEach((r) => L(r.at, r.by, r.clientId ? "accept" : "unknown", r.clientId ? LT.accept(r) : LT.unknown(r), [r.id], r.clientId));
    tasks.forEach((t) => { const ids = [t.id].concat(t.receiptIds); L(t.at, t.by, "packcmd", LT.packcmd(t), ids, t.clientId); if (t.collectedAt) L(t.collectedAt, t.collectedBy, "collected", LT.collected(t, t.receiptIds.length), ids, t.clientId); });
    cargos.forEach((c) => L(c.at, c.by, "packed", LT.packed(c), [c.id].concat(c.receiptIds), c.clientId));
    ships.forEach((s) => {
      const ids = [s.id].concat(cargos.find((c) => c.id === s.id).receiptIds);
      L(s.sentAt, s.by, "dispatch", LT.dispatch(s), ids, s.clientId);
      if (s.arrivedAt) L(s.arrivedAt, s.arrBy, "arrive", LT.arrive(s), ids, s.clientId);
      if (s.doneAt) L(s.doneAt, s.doneBy, "issue", LT.issue(s), ids, s.clientId);
    });
    payments.forEach((p) => L(p.at, p.by, "pay", `Оплата: клиент ${p.clientId}, ${p.cur === "USD" ? u.usd(p.amount) : u.groups(Math.round(p.amount)) + " " + CUR[p.cur].s + " = " + u.usd(p.usd)}`, [], p.clientId));
    L(now - 26 * D, "ramil", "access", "Доступ: Наталье Сергеевой открыт раздел «Отчёты»", [], null);
    L(now - 14 * D, "ramil", "access", "Доступ: Дарья Власова видит только своих клиентов", [], null);
    L(now - 6.2 * D, "ramil", "access", "Доступ: Сергею Никитину открыта функция «Отмечать прибытие»", [], null);
    L(now - 1.3 * D, "c:" + ME, "expected", "Трек клиента: SF1420886375512, наушники, 3 коробки", [], ME);
    log.sort((a, b) => a.at - b.at); log.forEach((e, i) => { e.id = i + 1; });

    const mine = ships.find((s) => s.clientId === ME && s.status === "way"), g17 = cargos.find((c) => c.clientId === ME && !c.sent);
    const thr = (ref, whId, msgs) => ({ id: "T-" + ref.id, ref, wh: whId, msgs, read: { ru: 0, zh: msgs.length } });
    const kzn = cargos[cargos.length - 1], dmg = receipts.find((r) => r.clientId === "S007" && !r.taskId);
    return {
      v: V, clients, receipts, tasks, cargos, ships, payments, staff, access, hide: {}, log,
      expected: [
        { id: "E-34", clientId: "M112", track: track(), supplier: "Foshan Hualong Ceramics", what: "Плитка, 2 паллета", at: now - 0.8 * D },
        { id: "E-33", clientId: ME, track: "SF1420886375512", supplier: "Shenzhen Brightway Electronics", what: "Наушники, 3 коробки", at: now - 1.3 * D },
        { id: "E-32", clientId: "A023", track: track(), supplier: "Ningbo Autoparts Co.", what: "Запчасти, около 30 мест", at: now - 2.2 * D },
        { id: "E-31", clientId: "T045", track: track(), supplier: "Jinhua Sport Goods", what: "Спортинвентарь, 12 мест", at: now - 3.1 * D },
      ],
      notes: [
        { id: 3, clientId: ME, text: `Груз ${g17.id} упакован: ${packsText(g17.packs)}, ${u.kg(g17.weight)}, ${u.vol(g17.volume)}. Ждёт отправки.`, at: g17.at, read: true, ref: { t: "cargo", id: g17.id } },
        { id: 2, clientId: ME, text: `Груз принят на складе (Иу): 5 мест от Yiwu Hongda Trading. Фото уже в приложении.`, at: now - 2.1 * D, read: true, ref: null },
        { id: 1, clientId: ME, text: `Груз ${mine.id} отправлен: авто, маршрут ${mine.route}, ${mine.dest}. Прибытие около ${u.dLong(mine.eta)}. Стоимость ${u.usd(mine.cost)}.`, at: mine.sentAt, read: true, ref: { t: "ship", id: mine.id } },
      ],
      chats: [
        thr({ t: "rec", id: dmg.id }, "yiwu", [{ side: "zh", by: "liwei", k: "z3", at: now - 1.35 * D }, { side: "ru", by: "olga", k: "r7", at: now - 1.3 * D }, { side: "zh", by: "liwei", k: "z2", at: now - 0.2 * D }]),
        thr({ t: "cargo", id: kzn.id }, "yiwu", [{ side: "ru", by: "olga", k: "r1", at: now - 1.1 * D }, { side: "zh", by: "liwei", k: "z1", at: now - 1.05 * D }, { side: "ru", by: "olga", k: "r4", at: now - 0.9 * D }, { side: "zh", by: "liwei", k: "z8", at: now - 0.88 * D }]),
        thr({ t: "rec", id: unk1.id }, "yiwu", [{ side: "zh", by: "liwei", k: "z4", at: now - 1.0 * D }]),
      ].map((t, i) => { t.read.ru = i === 1 ? t.msgs.length : t.msgs.length - 1; return t; }),
      seq: { rec: rn + 1, tt: tt + 1, note: 4, exp: 35, pay: pn, msg: 1, log: log.length + 1, staff: 1 },
      tg: false, createdAt: now,
    };
  }

  let S = null;
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { const v = JSON.parse(raw); if (v && v.v === V && v.receipts && v.tasks && v.log && v.staff && v.hide && v.seq && v.seq.tt) { S = v; return; } } } catch (e) { /* хранилище недоступно */ }
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
  const task = (id) => S.tasks.find((t) => t.id === id);
  const cargo = (id) => S.cargos.find((c) => c.id === id);
  const ship = (id) => S.ships.find((s) => s.id === id);
  const who = (k, lang) => { if (String(k).indexOf("c:") === 0) { const c = client(String(k).slice(2)); return c ? c.name + ", клиент" : "Клиент"; } const p = S.staff[k]; return p ? (lang === "zh" && p.zh) || p.ru : k || ""; };
  const left = (c) => c.places - c.sent;
  const inWh = (o, whId) => !whId || o.wh === whId;
  const waiting = (whId) => S.receipts.filter((r) => r.clientId && !r.cargoId && !r.taskId && inWh(r, whId)); // приняты, лежат на складе
  const unknown = (whId) => S.receipts.filter((r) => !r.clientId && inWh(r, whId));
  const openTasks = (whId, status) => S.tasks.filter((t) => t.status !== "done" && (!status || t.status === status) && inWh(t, whId)); // сборка и упаковка у склада
  const ready = (whId) => S.cargos.filter((c) => left(c) > 0 && inWh(c, whId)); // упакованы, ждут отправки
  const shipsOfCargo = (id) => S.ships.filter((s) => s.items.some((x) => x.cargoId === id));
  const taskPlaces = (t) => t.receiptIds.reduce((a, id) => a + ((rec(id) || {}).places || 0), 0);
  const nextTT = (clientId) => "TT-" + clientId + S.seq.tt;
  function totals(s) {
    let places = 0, weight = 0, volume = 0;
    s.items.forEach((x) => { const c = cargo(x.cargoId); if (!c) return; places += x.places; weight += (c.weight * x.places) / c.places; volume += (c.volume * x.places) / c.places; });
    return { places, weight, volume };
  }
  // все номера цепочки груза: наш трек-номер и приходы, из которых он собран
  function chainIds(t, o) {
    if (t === "rec") return [o.id];
    if (t === "task" || t === "cargo") return [o.id].concat(o.receiptIds);
    const c = cargo(o.id);
    return [o.id].concat(c ? c.receiptIds : []);
  }
  const isPaid = (s) => s.cost > 0 && s.paidUsd >= s.cost - 0.5;
  function money(clientId) {
    const list = S.ships.filter((s) => !clientId || s.clientId === clientId);
    const charged = list.reduce((a, s) => a + s.cost, 0), paid = list.reduce((a, s) => a + Math.min(s.cost, s.paidUsd), 0);
    return { charged, paid, debt: Math.max(0, charged - paid) };
  }
  const norm = (q) => String(q || "").trim().toUpperCase().replace(/[\s-]+/g, "");
  function findClient(q) {
    const s = norm(q); if (!s) return S.clients.slice();
    return S.clients.filter((c) => c.id.includes(s) || c.name.toUpperCase().includes(String(q).trim().toUpperCase()));
  }
  // трек-номер, который клиент внёс заранее
  const expectedByTrack = (q) => { const s = norm(q); return s ? S.expected.find((e) => norm(e.track) === s) || null : null; };
  const noteText = (r, lang) => (!r.note ? "" : typeof r.note === "string" ? r.note : r.note[lang === "zh" ? "zh" : "ru"]);
  // расходы в Китае: доставка до склада и доп. расходы, которые склад заплатил и которые потом собирают с клиента
  const doorOpen = (c) => c.receiptIds.map(rec).filter((r) => r && !r.charged).reduce((a, r) => a + (r.deliv || 0) + (r.extra || 0), 0);

  function logAdd(k, by, t, ids, c) { const e = { id: S.seq.log++, at: Date.now(), by: by || "ramil", k, t, ids: ids || [], c: c || null }; S.log.push(e); return e; }
  function notify(clientId, text, ref) {
    const n = { id: S.seq.note++, clientId, text, at: Date.now(), read: false, ref: ref || null };
    S.notes.unshift(n);
    if (clientId === ME) emit("push", n);
    return n;
  }

  // ---------- действия этапа 1 ----------
  function addExpected(clientId, d) {
    const e = { id: "E-" + S.seq.exp++, clientId, track: String(d.track).trim().toUpperCase(), supplier: String(d.supplier || "").trim() || "Поставщик не указан", what: String(d.what || "").trim(), at: Date.now() };
    S.expected.unshift(e);
    logAdd("expected", "c:" + clientId, `Трек клиента: ${e.track}${e.what ? ", " + e.what.charAt(0).toLowerCase() + e.what.slice(1) : ""}`, [], clientId);
    changed(); emit("expected", e); return e;
  }
  function removeExpected(id) { S.expected = S.expected.filter((e) => e.id !== id); changed(); }
  // приёмка: ни одно поле не обязательно; без клиента приход уходит в «Неизвестные»
  function accept(d) {
    const c = d.clientId ? client(d.clientId) : null, now = Date.now(), places = Math.max(1, parseInt(d.places, 10) || 1);
    const r = { id: "П-0" + S.seq.rec++, wh: d.wh, clientId: c ? c.id : null, track: String(d.track || "").trim().toUpperCase(), supplier: String(d.supplier || "").trim() || (c ? "Поставщик не указан" : ""), what: d.what || "",
      places, photos: (d.photos || []).slice(), dpay: d.dpay === "supplier" || d.dpay === "wh" ? d.dpay : null, deliv: d.dpay === "supplier" ? 0 : Math.max(0, Math.round(d.deliv || 0)), extra: Math.max(0, Math.round(d.extra || 0)), damage: d.damage || "", dmgPhotos: d.damage ? (d.dmgPhotos || []).slice() : [], note: typeof d.note === "string" ? d.note.trim().slice(0, 200) : d.note || "",
      at: now, by: d.by || WH_STAFF[d.wh], taskId: null, cargoId: null, fresh: true, expAt: d.expAt || null };
    if (d.expId) S.expected = S.expected.filter((e) => e.id !== d.expId);
    S.receipts.push(r);
    if (c) {
      const sum = r.deliv + r.extra;
      notify(c.id, `Груз принят на складе (${wh(r.wh).ru}): ${u.places(r.places)}${r.supplier !== "Поставщик не указан" ? " от " + r.supplier : ""}. ${r.damage ? "Есть повреждение: " + noteText({ note: r.damage }) + ". " : ""}${r.photos.length ? "Фото уже в приложении." : ""}${sum ? " Расходы в Китае: " + u.cny(sum) + ", сумма войдёт в стоимость." : ""}`, { t: "rec", id: r.id });
      logAdd("accept", r.by, LT.accept(r), [r.id], c.id);
    } else logAdd("unknown", r.by, LT.unknown(r), [r.id], null);
    changed(); emit(c ? "accepted" : "unknown", r);
    return r;
  }
  function assignUnknown(recId, clientId, by) {
    const r = rec(recId), c = client(clientId); if (!r || !c || r.clientId) return null;
    r.clientId = c.id; r.fresh = true; if (!r.supplier) r.supplier = "Поставщик не указан";
    notify(c.id, `Груз принят на складе (${wh(r.wh).ru}): ${u.places(r.places)}. ${r.photos.length ? "Фото уже в приложении." : ""}`, { t: "rec", id: r.id });
    logAdd("bind", by, LT.bind(r), [r.id], c.id);
    changed(); emit("assigned", r);
    return r;
  }
  // организовать упаковку: грузы одного клиента на одном складе; в этот момент присваивается наш трек-номер
  function organize(recIds, d) {
    const list = recIds.map(rec).filter((r) => r && r.clientId && !r.cargoId && !r.taskId); if (!list.length) return null;
    const rs = list.filter((r) => r.clientId === list[0].clientId && r.wh === list[0].wh), now = Date.now();
    const t = { id: "TT-" + rs[0].clientId + S.seq.tt++, wh: rs[0].wh, clientId: rs[0].clientId, receiptIds: rs.map((r) => r.id), name: String(d.name || "").trim().slice(0, 80), packPlan: (d.packPlan || []).filter((k) => PACK.includes(k)),
      transport: TRANSPORT[d.transport] ? d.transport : "", note: String(d.note || "").trim().slice(0, 200), date: d.date || now, at: now, by: d.by || "ramil", status: "collect", collectedAt: null, collectedBy: null, doneAt: null, doneBy: null, fresh: true };
    rs.forEach((r) => { r.taskId = t.id; r.fresh = false; r.lost = false; (S.hide[r.id] || []).forEach((k) => { (S.hide[t.id] = S.hide[t.id] || []).includes(k) || S.hide[t.id].push(k); }); });
    S.tasks.push(t);
    notify(t.clientId, `Ваш груз готовят к упаковке. Трек-номер ${t.id}: по нему можно следить за грузом.`, { t: "rec", id: rs[0].id });
    logAdd("packcmd", t.by, LT.packcmd(t), chainIds("task", t), t.clientId);
    changed(); emit("packcmd", t);
    return t;
  }
  // сборка: склад отмечает найденные грузы; ненайденный остаётся на складе, это видно в истории
  function collect(taskId, foundIds, by) {
    const t = task(taskId); if (!t || t.status !== "collect") return null;
    const found = t.receiptIds.filter((id) => foundIds.includes(id)); if (!found.length) return null;
    const all = t.receiptIds.length, who2 = by || WH_STAFF[t.wh];
    t.receiptIds.filter((id) => !found.includes(id)).forEach((id) => { const r = rec(id); if (!r) return; r.taskId = null; r.lost = true; logAdd("lost", who2, LT.lost(r, t), [r.id, t.id], t.clientId); });
    t.receiptIds = found; t.status = "packing"; t.collectedAt = Date.now(); t.collectedBy = who2; t.fresh = true;
    logAdd("collected", who2, LT.collected(t, all), chainIds("task", t), t.clientId);
    changed(); emit("collected", t);
    return t;
  }
  // упаковка: количество по видам, размеры, вес, фото; объём считается по размерам
  function pack(taskId, d) {
    const t = task(taskId); if (!t || t.status === "done") return null;
    const packs = {}; PACK.forEach((k) => { packs[k] = Math.max(0, parseInt((d.packs || {})[k], 10) || 0); });
    const dims = (d.dims || []).map((x) => ({ l: +x.l || 0, w: +x.w || 0, h: +x.h || 0, n: parseInt(x.n, 10) || 0 })).filter((x) => x.l && x.w && x.h && x.n);
    const places = dimsPlaces(dims) || packsSum(packs) || taskPlaces(t);
    const c = { id: t.id, wh: t.wh, clientId: t.clientId, taskId: t.id, name: t.name, packs, packType: PACK.filter((k) => packs[k]).sort((a, b) => packs[b] - packs[a])[0] || t.packPlan[0] || "bag", dims, places,
      weight: Math.max(0, +d.weight || 0), volume: dimsVolume(dims), photos: (d.photos || []).slice(), note: String(d.note || "").trim().slice(0, 200), transport: t.transport, at: Date.now(), by: d.by || WH_STAFF[t.wh], sent: 0, receiptIds: t.receiptIds.slice(), fresh: true };
    t.receiptIds.forEach((id) => { const r = rec(id); if (r) { r.cargoId = c.id; r.fresh = false; } });
    t.status = "done"; t.doneAt = c.at; t.doneBy = c.by; t.fresh = false;
    // склад указывает, во что упаковал на самом деле; расхождение с заказанным видно администратору и пишется в историю
    const fact = PACK.filter((k) => packs[k] > 0);
    c.packPlan = t.packPlan.slice(); c.packDiff = t.packPlan.length > 0 && fact.length > 0 && (fact.some((k) => !t.packPlan.includes(k)) || t.packPlan.some((k) => !fact.includes(k)));
    S.cargos.push(c);
    notify(c.clientId, `Груз ${c.id} упакован: ${packsText(c.packs)}${c.weight ? ", " + u.kg(c.weight) : ""}${c.volume ? ", " + u.vol(c.volume) : ""}. Ждёт отправки.`, { t: "cargo", id: c.id });
    logAdd("packed", c.by, LT.packed(c), chainIds("cargo", c), c.clientId);
    if (c.packDiff) logAdd("packdiff", c.by, `Упаковано иначе: ${c.id}, заказано ${t.packPlan.map((k) => PACK_RU[k]).join(", ")}, фактически ${packsText(c.packs)}`, chainIds("cargo", c), c.clientId);
    changed(); emit("packed", c);
    return c;
  }
  // отправка: каждый выбранный груз уезжает целиком под своим трек-номером
  function send(cargoIds, d) {
    const now = Date.now(), tr = TRANSPORT[d.transport] ? d.transport : "auto", route = ROUTES.includes(d.route) ? d.route : ROUTES[0], out = [];
    cargoIds.map(cargo).filter((c) => c && left(c) > 0).forEach((c) => {
      const cl = client(c.clientId), doorCny = doorOpen(c), doorUsd = cnyUsd(doorCny), sentAt = d.date || now;
      const s = { id: c.id, clientId: c.clientId, transport: tr, route, dest: String(d.dest || cl.city).trim() || cl.city, items: [{ cargoId: c.id, places: c.places }], sentAt, eta: sentAt + TRANSPORT[tr].days * u.DAY,
        status: "way", by: d.by || "ramil", arrivedAt: null, arrBy: null, doneAt: null, doneBy: null, issue: null, cost: tariffCalc(cl, c.weight, c.volume) + doorUsd, doorCny, doorUsd, paidUsd: 0, docs: [], exp: { pack: 0, carrier: 0, other: 0 }, fresh: true };
      c.sent = c.places; c.fresh = false; c.receiptIds.forEach((id) => { const r = rec(id); if (r) r.charged = true; });
      s.exp = { pack: Math.round(c.places * 1.5), carrier: Math.round(s.cost * 0.64), other: Math.round(s.cost * 0.02) };
      S.ships.push(s);
      notify(c.clientId, `Груз ${s.id} отправлен: ${TRANSPORT[tr].low}, маршрут ${s.route}, ${s.dest}. Прибытие около ${u.dLong(s.eta)}.${s.cost ? " Стоимость " + u.usd(s.cost) + (doorUsd ? ", включая расходы в Китае " + u.usd(doorUsd) : "") + "." : ""}`, { t: "ship", id: s.id });
      logAdd("dispatch", s.by, LT.dispatch(s), chainIds("ship", s), c.clientId);
      out.push(s);
    });
    if (out.length) { changed(); out.forEach((s) => emit("dispatched", s)); }
    return out;
  }
  // удаление прихода и отмена заказа на упаковку: только администратор, с записью в историю
  function removeRec(id, by) {
    const r = rec(id); if (!r || r.taskId || r.cargoId) return null;
    S.receipts = S.receipts.filter((x) => x.id !== id);
    logAdd("delete", by, `Удаление: приход ${r.id}${r.clientId ? ", клиент " + r.clientId : ", без клиента"}, ${u.places(r.places)}`, [r.id], r.clientId);
    changed(); emit("removed", r);
    return r;
  }
  function cancelTask(id, by) {
    const t = task(id); if (!t || t.status === "done") return null;
    t.receiptIds.forEach((x) => { const r = rec(x); if (r) { r.taskId = null; r.fresh = true; } });
    S.tasks = S.tasks.filter((x) => x.id !== id);
    logAdd("delete", by, `Отмена заказа на упаковку: ${t.id}, ${recsWord(t.receiptIds.length)} снова на складе`, [t.id].concat(t.receiptIds), t.clientId);
    changed(); emit("cancelled", t);
    return t;
  }
  // исправление данных отправки: вид доставки, маршрут, место назначения, дата, стоимость
  function editShip(id, d, by) {
    const s = ship(id); if (!s) return null;
    const ch = [];
    if (TRANSPORT[d.transport] && d.transport !== s.transport) { s.transport = d.transport; ch.push("доставка " + TRANSPORT[s.transport].low); }
    if (ROUTES.includes(d.route) && d.route !== s.route) { s.route = d.route; ch.push("маршрут " + s.route); }
    if (d.dest && String(d.dest).trim() !== s.dest) { s.dest = String(d.dest).trim(); ch.push("место назначения " + s.dest); }
    if (d.date && Math.abs(d.date - s.sentAt) > 12 * 3600e3) { s.sentAt = d.date; ch.push("дата " + u.dShort(s.sentAt)); }
    if (d.cost != null && Math.round(d.cost) !== s.cost && d.cost >= 0) { s.cost = Math.round(d.cost); ch.push("стоимость " + u.usd(s.cost)); }
    if (!ch.length) return s;
    s.eta = s.sentAt + TRANSPORT[s.transport].days * u.DAY;
    logAdd("edit", by, `Изменение отправки: ${s.id}, ${ch.join(", ")}`, chainIds("ship", s), s.clientId);
    changed(); emit("edited", s);
    return s;
  }
  function arrive(id, by) {
    const s = ship(id); if (!s || s.status !== "way") return null;
    s.status = "arrived"; s.arrivedAt = Date.now(); s.arrBy = by || "ramil"; s.fresh = true;
    notify(s.clientId, `Груз ${s.id} прибыл в Россию. Готовим к выдаче.`, { t: "ship", id: s.id });
    logAdd("arrive", s.arrBy, LT.arrive(s), chainIds("ship", s), s.clientId);
    changed(); emit("arrived", s);
    return s;
  }
  function issue(id, d) {
    const s = ship(id); if (!s || s.status !== "arrived") return null;
    s.status = "done"; s.doneAt = Date.now(); s.doneBy = d.by || "ramil"; s.fresh = false;
    s.issue = d.type === "tk" ? { type: "tk", tk: d.tk || TK[0], waybill: String(d.waybill || "").trim() || "без номера" } : { type: "client" };
    notify(s.clientId, d.type === "tk" ? `Груз ${s.id} передан в транспортную компанию ${s.issue.tk}, накладная ${s.issue.waybill}.` : `Груз ${s.id} выдан. Спасибо, что работаете с нами!`, { t: "ship", id: s.id });
    logAdd("issue", s.doneBy, LT.issue(s), chainIds("ship", s), s.clientId);
    changed(); emit("issued", s);
    return s;
  }
  function setPaid(id, paid, by) {
    const s = ship(id); if (!s) return;
    if (paid && !isPaid(s)) {
      const rest = s.cost - s.paidUsd; s.paidUsd = s.cost;
      S.payments.push({ id: S.seq.pay++, clientId: s.clientId, at: Date.now(), amount: rest, cur: "USD", rate: 1, usd: rest, by: by || "ramil", shipId: s.id });
      notify(s.clientId, `Оплата по грузу ${s.id} отмечена: ${u.usd(s.cost)}. Спасибо!`, { t: "ship", id: s.id });
      logAdd("pay", by, `Оплата отмечена: груз ${s.id}, ${u.usd(s.cost)}`, chainIds("ship", s), s.clientId);
    } else if (!paid) {
      s.paidUsd = 0; S.payments = S.payments.filter((p) => p.shipId !== s.id);
      logAdd("pay", by, `Отметка об оплате снята: груз ${s.id}`, chainIds("ship", s), s.clientId);
    }
    changed(); emit("paidFlag", s);
  }
  function addDoc(id, name, by) {
    const s = ship(id); if (!s) return;
    s.docs.push({ name: name + " " + s.id + ".pdf", at: Date.now(), by: by || "ramil" });
    notify(s.clientId, `К грузу ${s.id} добавлен документ: ${name.toLowerCase()}.`, { t: "ship", id: s.id });
    logAdd("doc", by, `Документ прикреплён: ${name.toLowerCase()}, груз ${s.id}`, chainIds("ship", s), s.clientId);
    changed();
  }
  // доступы сотрудника: раздел, функция, область видимости (все клиенты или выбранные) и отдельные клиенты
  function setAccess(staffId, kind, key, v) {
    const a = S.access[staffId], p = S.staff[staffId]; if (!a || !p) return;
    let t;
    if (kind === "scope") { if (a.scope === v) return; a.scope = v === "sel" ? "sel" : "all"; t = `Доступ: ${p.ru}, видит ${a.scope === "sel" ? "только выбранных клиентов" : "всех клиентов"}`; }
    else if (kind === "client") { const i = a.clients.indexOf(key); if (v && i < 0) a.clients.push(key); if (!v && i >= 0) a.clients.splice(i, 1); t = `Доступ: ${p.ru}, клиент ${key} ${v ? "открыт" : "закрыт"}`; }
    else {
      const list = kind === "sec" ? SECTIONS : FUNCS, row = list.find((x) => x[0] === key); if (!row) return;
      a[kind][key] = !!v; t = `Доступ: ${p.ru}, ${v ? "открыт" : "закрыт"} ${kind === "sec" ? "раздел" : "доступ к функции"} «${row[1]}»`;
    }
    logAdd("access", "ramil", t, [], null);
    changed(); emit("access", { staffId, kind, key, v });
  }
  function applyPreset(staffId, key) {
    const a = S.access[staffId], p = S.staff[staffId], pr = PRESETS[key]; if (!a || !p || !pr) return;
    const sec = pr[1].split(" "), fn = pr[2].split(" ");
    SECTIONS.forEach(([id]) => { a.sec[id] = sec.includes(id); }); FUNCS.forEach(([id]) => { a.fn[id] = fn.includes(id); });
    a.preset = key;
    logAdd("access", "ramil", `Доступ: ${p.ru}, применён набор прав «${pr[0]}»`, [], null);
    changed(); emit("access", { staffId, kind: "preset", key });
  }
  // новый сотрудник: имя, логин, пароль; доступы можно выдать позже
  function createStaff(d) {
    const name = String(d.name || "").trim().slice(0, 40) || "Новый сотрудник", id = "u" + S.seq.staff++, parts = name.split(/\s+/);
    const login = (String(d.login || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "") || "user" + S.seq.staff).slice(0, 24);
    S.staff[id] = { ru: name, zh: "", role: String(d.role || "").trim().slice(0, 30) || "Сотрудник", where: "Москва", ava: ((parts[0] || "?").charAt(0) + (parts[1] ? parts[1].charAt(0) : (parts[0] || "").charAt(1))).toUpperCase(), login, pass: String(d.pass || "") || "demo", kind: "office" };
    S.access[id] = { sec: {}, fn: {}, scope: "all", clients: [] };
    SECTIONS.forEach(([k]) => { S.access[id].sec[k] = false; }); FUNCS.forEach(([k]) => { S.access[id].fn[k] = false; });
    logAdd("access", "ramil", `Сотрудник добавлен: ${name}, логин ${login}`, [], null);
    changed(); emit("staff", id);
    if (d.preset && PRESETS[d.preset]) applyPreset(id, d.preset);
    const a = S.access[id];
    if (d.sec) SECTIONS.forEach(([k]) => { a.sec[k] = !!d.sec[k]; });
    if (d.scope === "sel") { a.scope = "sel"; a.clients = (d.clients || []).filter((x) => client(x)); }
    save();
    return id;
  }
  const loginCheck = (login, pass) => Object.keys(S.staff).find((k) => S.staff[k].login === String(login || "").trim().toLowerCase() && S.staff[k].pass === String(pass || "")) || null;
  // «кто видит» отдельную поставку: администратор может скрыть груз от конкретного сотрудника
  const hidden = (id, staffId) => (S.hide[id] || []).includes(staffId);
  function setHide(id, staffId, v) {
    const list = (S.hide[id] = S.hide[id] || []), i = list.indexOf(staffId), p = S.staff[staffId]; if (!p) return;
    if (v && i < 0) list.push(staffId); if (!v && i >= 0) list.splice(i, 1);
    logAdd("access", "ramil", `Доступ: груз ${id} ${v ? "скрыт от сотрудника" : "снова виден сотруднику"}: ${p.ru}`, [id], null);
    changed();
  }
  function setSales(clientId, salesId) { const c = client(clientId); if (c) { c.salesId = salesId; logAdd("access", "ramil", `Клиент ${c.id} закреплён за сотрудником: ${who(salesId)}`, [], c.id); changed(); } }
  function readNotes() { let ch = false; S.notes.forEach((n) => { if (n.clientId === ME && !n.read) { n.read = true; ch = true; } }); if (ch) save(); }
  function setTg(v) { S.tg = v; changed(); }

  // ---------- этап 2: деньги ----------
  function pay(clientId, d) {
    const rate = d.cur === "USD" || d.cur === "USDT" ? 1 : d.rate, usd = Math.round((d.amount / rate) * 100) / 100;
    const p = { id: S.seq.pay++, clientId, at: Date.now(), amount: d.amount, cur: d.cur, rate, usd, by: d.by || "ramil" };
    S.payments.push(p);
    let rest = usd;
    S.ships.filter((s) => s.clientId === clientId && !isPaid(s)).sort((a, b) => a.sentAt - b.sentAt).forEach((s) => { const need = s.cost - s.paidUsd, x = Math.min(need, rest); s.paidUsd = Math.round((s.paidUsd + x) * 100) / 100; rest -= x; });
    const amt = d.cur === "USD" ? u.usd(d.amount) : u.groups(Math.round(d.amount)) + " " + CUR[d.cur].s + " = " + u.usd(usd);
    notify(clientId, `Оплата получена: ${amt}. ${money(clientId).debt > 0.5 ? "Остаток долга " + u.usd(money(clientId).debt) + "." : "Долга нет, спасибо!"}`, null);
    logAdd("pay", p.by, `Оплата: клиент ${clientId}, ${amt}`, [], clientId);
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
    get S() { return S; }, get STAFF() { return S.staff; }, ME, KEY, UIKEY, WH, PACK, PACK_RU, ROUTES, DEST, TRANSPORT, TK, CUR, WH_STAFF, SECTIONS, FUNCS, PRESETS, DENS, TARIFF_T,
    on, emit, save, reset, who, wh, client, rec, task, cargo, ship, left, waiting, unknown, openTasks, ready, shipsOfCargo, taskPlaces, nextTT, totals, chainIds, isPaid, money, findClient, expectedByTrack, noteText, doorOpen, cnyUsd,
    packsSum, packsText, dimsVolume, dimsPlaces, tariffCalc, tariffLabel, addExpected, removeExpected, accept, assignUnknown, organize, collect, pack, send, editShip, removeRec, cancelTask, arrive, issue, setPaid, addDoc, setAccess, applyPreset, createStaff, loginCheck, hidden, setHide, setSales, readNotes, setTg,
    pay, setExp, expSum, setTariff, thread, threadFor, unread, unreadAll, chatSend, chatRead,
  };
})(window.App);
