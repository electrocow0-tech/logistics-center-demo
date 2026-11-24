/* Данные прототипа и действия: всё хранится в браузере, сервер не нужен.
   Модель: приход (одна доставка поставщика на склад) → администратор организует упаковку: заказ с нашим трек-номером TT-<код клиента><номер>
   → склад собирает грузы и упаковывает (виды упаковки с количеством, размеры, вес) → груз под тем же трек-номером → отправка (вид доставки, маршрут, место назначения).
   Заказ, груз и отправка носят один и тот же номер TT. Номер подставляется сам, администратор может вписать свой и исправить его позже.
   После прибытия в Москву груз лежит на хранении, пока администратор не даст команду «Выдать»: заказ на выдачу (один или несколько треков одного клиента)
   → склад в Москве нажимает «Принят» → по каждому треку фотоотчёт и «Готово» → архив. Взаиморасчёты со складом в Москве ведутся в рублях и долларах.
   Каждое действие пишется в историю: кто, когда, что сделал. */
(function (App) {
  "use strict";
  const u = App.u;
  const KEY = "cl-demo-v3", UIKEY = "cl-ui-v3", V = 7;
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
  // подстатусы прибывшего груза и способы выдачи
  const SUB = { store: "Хранение", ready: "Готов к выдаче", issuing: "Выдают" };
  const WAY = { door: { t: "До двери", low: "доставка до двери", ic: "truck" }, tk: { t: "Передать в ТК", low: "передача в транспортную компанию", ic: "send" }, pickup: { t: "Самовывоз", low: "самовывоз", ic: "user" } };
  // расходы склада в Москве при выдаче, рубли
  const REPX = [["load", "Погрузка"], ["pallet", "Снять паллет"], ["fork", "Кара"], ["other", "Другие"]];
  // взаиморасчёты со складом в Москве: виды операций, знак и подпись
  const WOPK = { topup: [1, "Пополнение от компании"], client: [1, "Оплата клиента при выдаче"], cube: [-1, "За куб"], dlv: [-1, "Доставка до двери или ТК"], route: [-1, "Маршрут с растаможкой"], issueexp: [-1, "Расходы при выдаче"], other: [-1, "Прочий расход"] };
  const WCUR = { RUB: "₽", USD: "$" };
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
    sergey: { ru: "Сергей Никитин", zh: "谢尔盖", role: "Склад в Москве", where: "Москва", ava: "СН", login: "sergey.nikitin", kind: "office" },
    liwei: { ru: "Ли Вэй", zh: "李伟", role: "Склад в Китае", where: "Иу", ava: "ЛВ", login: "li.wei", kind: "wh" },
    chenjie: { ru: "Чэнь Цзе", zh: "陈杰", role: "Склад в Китае", where: "Гуанчжоу", ava: "ЧЦ", login: "chen.jie", kind: "wh" },
    huanglei: { ru: "Хуан Лэй", zh: "黄磊", role: "Склад в Китае", where: "Фошань", ava: "ХЛ", login: "huang.lei", kind: "wh" },
    zhaoxin: { ru: "Чжао Синь", zh: "赵欣", role: "Склад в Китае", where: "Шэньчжэнь", ava: "ЧС", login: "zhao.xin", kind: "wh" },
  };
  const WH_STAFF = { yiwu: "liwei", gz: "chenjie", fs: "huanglei", sz: "zhaoxin" };
  // разделы и функции, которые администратор открывает сотрудникам. Пункты группы «Деньги» открываются по отдельности
  const SECTIONS = [["cargo", "Грузы", "доска и рабочая страница грузов"], ["clients", "Клиенты", "список и карточки клиентов"], ["ships", "Отправки", "в пути, прибывшие, архив, все"],
    ["money", "Оплаты клиентов", "оплаты и долги по трекам и по клиентам"], ["profit", "Расходы и прибыль", "по каждой отправке: выручка, расходы, прибыль"], ["agents", "Агенты", "оплаты перевозчикам по маршрутам, сверка"],
    ["mskfin", "Склад в Москве", "взаиморасчёты со складом в рублях и долларах"], ["chwh", "Склады в Китае", "расходы складов на упаковку"], ["tariffs", "Тарифы клиентов", "ставки за кг, за м³, по плотности"],
    ["reports", "Отчёты", "объёмы, сроки, выгрузки"], ["news", "Новости и рассылки", "объявления и поздравления клиентам"], ["history", "История действий", "кто, когда, что сделал"]];
  const MONEY_SECS = ["money", "profit", "agents", "mskfin", "chwh", "tariffs"];
  const FUNCS = [["accept", "Принимать груз", "вносить приход с компьютера"], ["bind", "Привязывать клиента", "разбирать «Неизвестные»"], ["packcmd", "Организовать упаковку", "выбрать грузы клиента, наш трек-номер, задача складу"],
    ["dispatch", "Отправлять грузы", "вид доставки, маршрут, место назначения"], ["arrive", "Отмечать прибытие", "груз прибыл в Москву"], ["issuecmd", "Давать команду на выдачу", "кнопка «Выдать» для прибывших грузов"], ["issue", "Принимать и выдавать", "«Принят», фотоотчёт, выдача или передача в ТК"],
    ["cost", "Видеть стоимость и оплаты", "суммы в долларах, отметка «Оплачено»"], ["route", "Показывать маршрут", "3G, 88G, 89G, 81G в карточках, списках, фильтрах и окнах"], ["way", "Видеть грузы в пути", "вкладка «В пути» в отправках"]];
  // что видно без набора прав: маршрут и грузы в пути показываются, пока администратор их не скрыл
  const FN_ON = ["route", "way"];
  // готовые наборы прав: одной кнопкой, дальше правится вручную. Четвёртое значение: каких клиентов видит (own: только тех, где он указан менеджером)
  const PRESETS = { wh: ["как кладовщик", "cargo", "accept route way"], manager: ["как менеджер", "cargo clients ships", "accept bind packcmd dispatch arrive issuecmd issue cost way"], sales: ["как менеджер по продажам", "cargo clients", "packcmd", "own"],
    acc: ["как бухгалтер", "ships money profit agents mskfin chwh tariffs reports", "cost route way"], mskwh: ["как склад в Москве", "ships", "issue route", "all"] };
  const ACCESS0 = {
    olga: { s: "cargo clients ships", f: "accept bind packcmd dispatch arrive issuecmd cost route way", scope: "all" },
    timur: { s: "cargo clients", f: "packcmd", scope: "own", preset: "sales" },
    darya: { s: "cargo clients", f: "packcmd", scope: "own", preset: "sales" },
    natalia: { s: "ships money profit agents mskfin chwh tariffs reports", f: "cost route way", scope: "all" },
    sergey: { s: "ships", f: "issue route", scope: "all", preset: "mskwh" },
  };
  // тарифы: сетка по плотности, кг/м³
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
  // ---------- справочники (версия 3.2): агенты по маршрутам, цены упаковки, страховка, склады в Китае, ТК, курсы валют ----------
  // агент = маршрут: перевозчик, который везёт груз. Ставка за кг или за м³, растаможка за кг, срок в пути. Названия вымышленные
  const BASIS_T = { kg: "за кг", m3: "за м³" };
  const WH_RU = { yiwu: ["Иу, провинция Чжэцзян", "Иу, район Футянь, проспект Шанчэн, 88, склад 3"], gz: ["Гуанчжоу, провинция Гуандун", "Гуанчжоу, район Байюнь, улица Цинфэн, 26, корпус B"],
    fs: ["Фошань, провинция Гуандун", "Фошань, район Наньхай, улица Сянань, 15, склад 2"], sz: ["Шэньчжэнь, провинция Гуандун", "Шэньчжэнь, район Баоань, проспект Фэнтан, 102, склад A"] };
  // этапы пути по умолчанию: через сколько дней после отправки груз на границе и на таможне
  const STG = (b, c) => [{ name: "На границе", day: b }, { name: "Таможенное оформление", day: c }];
  function dir0() {
    return {
      agents: [
        { route: "3G", name: "Хоргос Карго Лайн", basis: "kg", rate: 1.2, customs: 0.25, days: 16, contact: "+7 900 000-00-51", stages: STG(4, 12), spread: 2, grow: 2 },
        { route: "88G", name: "Алтын Жол Логистик", basis: "kg", rate: 1.1, customs: 0.25, days: 18, contact: "+7 900 000-00-52", stages: STG(4, 14), spread: 3, grow: 1.5 },
        { route: "89G", name: "Сибирский Мост", basis: "m3", rate: 180, customs: 0.2, days: 17, contact: "+7 900 000-00-53", stages: STG(5, 13), spread: 2, grow: 1.5 },
        { route: "81G", name: "Шёлковый Путь Транс", basis: "m3", rate: 165, customs: 0.2, days: 24, contact: "+7 900 000-00-54", stages: STG(7, 18), spread: 3, grow: 1 },
      ],
      // версия 3.3: видит ли клиент маршрут (агента) в своём кабинете; по умолчанию нет
      clientRoute: false,
      pack: { bag: 1, wbox: 8, crate: 15, pallet: 25 },
      // версия 3.3: наша цена упаковки на складе в Китае, юани за единицу; у склада может быть своя цена (whPack)
      packCny: { bag: 4, crate: 70, pallet: 150, wbox: 40 }, whPack: {},
      insPct: 2,
      whs: WH.map((w) => ({ id: w.id, ru: w.ru, zh: w.zh, city: WH_RU[w.id][0], addrRu: WH_RU[w.id][1], addr: w.addr })),
      tks: [{ name: "СДЭК", contact: "+7 900 000-00-61", note: "посылки и небольшие партии" }, { name: "Деловые линии", contact: "+7 900 000-00-62", note: "сборные грузы по России" }, { name: "ПЭК", contact: "+7 900 000-00-63", note: "крупные партии, паллеты" }],
      // курсы: каждый день автоматически по ЦБ РФ (в прототипе зашитые демо-значения, без запросов в сеть), надбавка в процентах, ручной курс перекрывает ЦБ. USDT только вручную
      rates: { cbAt: Date.now(), at: Date.now() - 0.6 * u.DAY, by: "natalia", items: { RUB: { cb: 96.53, markup: 1, manual: null }, CNY: { cb: 7.25, markup: 0, manual: null }, KZT: { cb: 488, markup: 2, manual: null }, KGS: { cb: 86.5, markup: 1, manual: null }, USDT: { cb: null, markup: 0, manual: 1 } } },
    };
  }
  const RATE_K = ["RUB", "CNY", "KZT", "KGS", "USDT"];
  // итоговый курс: ручной, если задан, иначе курс ЦБ с надбавкой
  const rateOf = (x) => (x.manual > 0 ? x.manual : x.cb > 0 ? Math.round(x.cb * (1 + (x.markup || 0) / 100) * 100) / 100 : 1);
  const rateSrc = (x) => (x.manual > 0 ? "manual" : "cb");
  // справочник применяется к спискам, которые читают экраны: маршруты, транспортные компании, курсы
  function applyDir(d) {
    ROUTES.length = 0; d.agents.forEach((a) => ROUTES.push(a.route));
    TK.length = 0; d.tks.forEach((t) => TK.push(t.name));
    RATE_K.forEach((k) => { if (d.rates.items[k]) CUR[k].rate = rateOf(d.rates.items[k]); });
  }
  const agentOf = (route, d) => ((d || S.dir).agents.find((a) => a.route === route) || null);
  const r2 = (n) => Math.round(n * 100) / 100;
  // сумма агенту по треку: ставка за кг или за м³ плюс растаможка за кг
  function agentCalc(route, weight, volume, d) { const a = agentOf(route, d); if (!a) return 0; return Math.round((a.basis === "m3" ? volume * a.rate : weight * a.rate) + (a.customs || 0) * weight); }
  // упаковка для клиента: цена за место по видам упаковки
  const packCost = (packs, d) => Math.round(PACK.reduce((a, k) => a + (+(packs || {})[k] || 0) * ((d || S.dir).pack[k] || 0), 0) * 100) / 100;
  // наши расходы на упаковку груза: количество по видам × цена склада в юанях, в долларах по курсу из настроек
  const packCnyOf = (whId, k, d) => { d = d || S.dir; const o = (d.whPack || {})[whId]; return o && o[k] != null ? o[k] : (d.packCny || {})[k] || 0; };
  const packExpCny = (c, d) => PACK.reduce((a, k) => a + (+(c.packs || {})[k] || 0) * packCnyOf(c.wh, k, d), 0);
  const packExpUsd = (c, d) => Math.round(packExpCny(c, d) / CUR.CNY.rate);
  const insCalc = (value, d) => Math.round(((+value || 0) * (d || S.dir).insPct) / 100);
  // ожидаемый срок в пути: у агента свой срок, авиа быстрее
  const etaDays = (route, transport, d) => { const a = agentOf(route, d); return transport === "air" || !a || !a.days ? TRANSPORT[transport].days : a.days; };
  // стоимость для клиента складывается из доставки по тарифу, упаковки, страховки, расходов в Китае и расходов при выдаче за счёт клиента
  const recost = (s) => { s.cost = r2((s.deliv || 0) + (s.packUsd || 0) + (s.insUsd || 0) + (s.doorUsd || 0) + (s.issueExpUsd || 0) + (s.dlvUsd || 0)); return s; };
  const cnyUsd = (cny) => Math.round(cny / CUR.CNY.rate);
  // ---------- версия 3.3: шкала пути ----------
  // После отправки шкала сама идёт по дням: этапы агента (через сколько дней после отправки) меняют промежуточный статус,
  // внутри этапа шкала подрастает на «прирост в день» агента. Потолок до отметки «Прибыл в Москву» 95%, после неё 100%.
  // Начало этапов: отправка 5%, последний этап (обычно таможня) 85%, промежуточные по дням между ними.
  const TRIP_CEIL = 95, TRIP_P0 = 5, TRIP_PL = 85;
  const SENT_T = "Отправлен из Китая";
  function trip(s, at) {
    at = at || Date.now();
    const a = agentOf(s.route) || {}, dd = Math.max(1, (s.eta - s.sentAt) / u.DAY), base = a.days > 0 ? a.days : dd, k = dd / base, grow = a.grow > 0 ? +a.grow : 0;
    const list = [{ name: SENT_T, day: 0 }].concat((a.stages || []).filter((x) => x && String(x.name || "").trim() && +x.day > 0).map((x) => ({ name: String(x.name).trim(), day: +x.day * k })).sort((x, y) => x.day - y.day));
    const last = list[list.length - 1].day;
    list.forEach((x, i) => { x.pct = i === 0 ? TRIP_P0 : TRIP_P0 + ((TRIP_PL - TRIP_P0) * x.day) / last; x.at = s.sentAt + x.day * u.DAY; });
    const spread = Math.max(0, +a.spread || 0), from = s.eta - spread * u.DAY, to = s.eta + spread * u.DAY;
    const arrived = s.status !== "way" && s.arrivedAt && s.arrivedAt <= at + 1;
    if (arrived) { list.forEach((x) => { x.done = true; }); return { pct: 100, idx: list.length - 1, name: "Прибыл в Москву", stages: list, from, to, arrived: true, auto: false }; }
    const el = Math.max(0, (at - s.sentAt) / u.DAY);
    let idx = 0; list.forEach((x, i) => { if (x.day <= el) idx = i; });
    let pct;
    if (list.length === 1) pct = Math.max(TRIP_P0 + grow * el, TRIP_P0 + ((TRIP_CEIL - TRIP_P0) * el) / dd);
    else pct = list[idx].pct + grow * (el - list[idx].day);
    const cap = idx < list.length - 1 ? list[idx + 1].pct - 2 : TRIP_CEIL;
    pct = Math.max(list[idx].pct, Math.min(pct, cap, TRIP_CEIL));
    list.forEach((x, i) => { x.done = i <= idx; });
    return { pct: Math.round(pct * 10) / 10, idx, name: list[idx].name, stages: list, from, to, arrived: false, auto: true };
  }
  // диапазон даты прибытия: «10-15 декабря» или «28 ноября - 3 декабря»
  function rangeText(from, to) {
    const a = new Date(from), b = new Date(to);
    if (u.dLong(from) === u.dLong(to)) return u.dLong(from);
    return a.getMonth() === b.getMonth() ? a.getDate() + "-" + u.dLong(to) : u.dLong(from) + " - " + u.dLong(to);
  }
  // маршрут в кабинете клиента: по умолчанию скрыт настройкой «Клиент видит маршрут»
  const clientRoute = () => !!(S && S.dir && S.dir.clientRoute);
  const cText = (t) => (clientRoute() ? String(t) : String(t).replace(new RegExp(",?\\s*маршрут (" + ROUTES.join("|") + ")(?![A-Za-z0-9])", "g"), ""));
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
    arrive: (s) => `Прибытие: груз ${s.id} прибыл в Москву, лежит на хранении`,
    issuecmd: (o) => `Заказ на выдачу: ${o.id}, клиент ${o.clientId}, ${tracksWord(o.shipIds.length)}, ${WAY[o.way].low}${o.way === "tk" && o.tk ? " " + o.tk : ""}${o.collect ? ", получить оплату " + rub(o.collectRub) : ""}, расходы платит ${o.payer === "client" ? "клиент" : "компания"}${o.dlv ? ", " + dlvText(o).toLowerCase() : ""}`,
    issueacc: (o) => `Принят складом в Москве: заказ ${o.id}, ${tracksWord(o.shipIds.length)} в работе`,
    issue: (s) => (s.issue.type === "tk" ? `Передача в ТК: груз ${s.id}, ${s.issue.tk}, накладная ${s.issue.waybill}` : `Выдача: груз ${s.id} выдан клиенту ${s.clientId}${s.issue.way === "door" ? ", доставка до двери" : ""}`) + (repSum(s.rep) ? `, расходы ${rub(repSum(s.rep))}` : "") + (s.rep && s.rep.damage ? ", есть повреждение" : ""),
    collect: (o, sum) => `Оплата при выдаче: заказ ${o.id}, клиент ${o.clientId}, получено ${rub(sum)}`,
    apay: (p, a) => `Оплата агенту ${p.route}${a ? " " + a.name : ""}: ${u.usd(p.amount)}, ${String(p.method || "перевод").toLowerCase()}, ${tracksWord(p.shipIds.length)}: ${p.shipIds.join(", ")}${p.note ? ", " + p.note : ""}`,
    wop: (w) => `${WOPK[w.kind][1]}: ${w.amount > 0 ? "+" : "−"}${wamt(Math.abs(w.amount), w.cur)}${w.kind === "cube" ? `, ${u.vol(w.vol)} × ${wamt(w.rate, w.cur)}` : ""}${w.route ? ", маршрут " + w.route : ""}${w.agent ? ", агент " + w.agent : ""}${w.note ? ", " + w.note : ""}`,
  };
  const rub = (n) => u.groups(Math.round(n)) + u.NB + "₽";
  const wamt = (n, cur) => (cur === "USD" ? "$" + u.NB + u.groups(Math.round(n)) : rub(n));
  const tracksWord = (n) => n + " " + u.plural(n, "трек", "трека", "треков");
  const partsWord = (n) => n + " " + u.plural(n, "партия", "партии", "партий");
  const repSum = (r) => (r && r.exp ? REPX.reduce((a, [k]) => a + (+r.exp[k] || 0), 0) : 0);
  const rubUsd = (n) => Math.round((n / CUR.RUB.rate) * 100) / 100;

  function seed() {
    const dir = dir0(); applyDir(dir);
    const now = Date.now(), D = u.DAY, d0 = new Date(now); d0.setHours(0, 0, 0, 0);
    const today = d0.getTime() + (now - d0.getTime()) / 2; // «сегодня, уже случилось»: середина между полуночью и текущим временем
    let rs = 11;
    const rnd = () => { rs = (rs * 9301 + 49297) % 233280; return rs / 233280; };
    const PFX = ["YT", "SF", "JT", "ZT", "DP"];
    const track = () => { let d = ""; for (let i = 0; i < 13; i++) d += Math.floor(rnd() * 10); return PFX[Math.floor(rnd() * PFX.length)] + d; };
    // получатель: кому и куда выдавать груз в России, способ выдачи по умолчанию
    const R = (name, phone, addr, way, tk) => ({ name, phone, addr, way, tk: tk || "" });
    const clients = [
      { id: "D051", name: "ТехноДом", city: "Москва", person: "Андрей Ковалёв", phone: "+7 900 000-00-11", birth: "1986-04-12", since: "2024", salesId: "timur", tariff: { type: "kg", rate: 2.4 }, recv: R("Андрей Ковалёв", "+7 900 000-00-11", "Москва, ул. Складская, 12, стр. 3, въезд 2", "pickup") },
      { id: "W001", name: "Камский текстиль", city: "Казань", person: "Ильдар Сафин", phone: "+7 900 000-00-12", birth: "1979-09-03", since: "2023", salesId: "darya", tariff: { type: "density" }, recv: R("Ильдар Сафин", "+7 900 000-00-12", "Казань, ул. Товарная, 5, склад 2", "tk", "Деловые линии") },
      { id: "W006", name: "УралСтройСнаб", city: "Екатеринбург", person: "Олег Мартынов", phone: "+7 900 000-00-13", birth: "1982-01-27", since: "2025", salesId: "darya", tariff: { type: "m3", rate: 330 }, recv: R("Олег Мартынов", "+7 900 000-00-13", "Екатеринбург, ул. Заводская, 21, база 1", "tk", "ПЭК") },
      { id: "K014", name: "Северная мебель", city: "Санкт-Петербург", person: "Мария Лебедева", phone: "+7 900 000-00-14", birth: "1990-06-18", since: "2024", salesId: "timur", tariff: { type: "m3", rate: 310 }, recv: R("Виктор Лебедев", "+7 900 000-00-24", "Санкт-Петербург, ул. Портовая, 8, ворота 4", "tk", "Деловые линии") },
      { id: "A023", name: "Сибирь Авто", city: "Новосибирск", person: "Павел Орлов", phone: "+7 900 000-00-15", birth: "1984-11-05", since: "2023", salesId: "timur", tariff: { type: "kg", rate: 2.2 }, recv: R("Павел Орлов", "+7 900 000-00-15", "Новосибирск, ул. Станционная, 30, бокс 6", "tk", "Деловые линии") },
      { id: "M112", name: "Южный дом", city: "Краснодар", person: "Елена Гаврилова", phone: "+7 900 000-00-16", birth: "1988-03-22", since: "2025", salesId: "darya", tariff: { type: "density" }, recv: R("Елена Гаврилова", "+7 900 000-00-16", "Краснодар, ул. Южная, 14, офис 3", "tk", "СДЭК") },
      { id: "S007", name: "Игротека", city: "Москва", person: "Светлана Ким", phone: "+7 900 000-00-17", birth: "1992-08-09", since: "2025", salesId: "timur", tariff: { type: "custom", rate: 2.0 }, recv: R("Светлана Ким", "+7 900 000-00-17", "Москва, ул. Весенняя, 7, магазин на первом этаже", "door") },
      { id: "T045", name: "Волга Спорт", city: "Самара", person: "Артём Белов", phone: "+7 900 000-00-18", birth: "1981-12-14", since: "2024", salesId: "darya", tariff: { type: "kg", rate: 2.5 }, recv: R("Артём Белов", "+7 900 000-00-18", "Самара, ул. Речная, 3, склад во дворе", "tk", "ПЭК") },
    ];
    const cl = (id) => clients.find((c) => c.id === id);
    const receipts = [], tasks = [], cargos = [], ships = [], payments = [], issues = [], wops = [];
    let rn = 300, tt = 2703, phs = 1, pn = 1, flip = 0, on = 100;
    const boss = () => (flip++ % 3 === 0 ? "ramil" : "olga");
    const ago = (x) => (x === "today" ? today : now - x * D);
    function rec(whId, clientId, supplier, places, daysAgo, o) {
      o = o || {};
      const r = { id: "П-0" + ++rn, wh: whId, clientId, track: track(), supplier, what: o.what || "", places, photos: [phs++, phs++], dpay: o.deliv ? "wh" : o.dpay || null, deliv: o.deliv || 0, extra: o.extra || 0, damage: o.damage || "", note: o.note || "", at: now - daysAgo * D, by: WH_STAFF[whId], taskId: null, cargoId: null };
      receipts.push(r); return r;
    }
    // заказ на упаковку: наш трек-номер TT-<код клиента><номер> присваивается в этот момент
    function task(recs, name, packPlan, transport, note, daysAgo, status) {
      const t = { id: "TT-" + recs[0].clientId + ++tt, wh: recs[0].wh, clientId: recs[0].clientId, receiptIds: recs.map((r) => r.id), name, packPlan, transport: transport || "", note: note || "", date: now - daysAgo * D, at: now - daysAgo * D, by: boss(),
        status, collectedAt: status === "collect" ? null : now - (daysAgo - 0.15) * D, collectedBy: status === "collect" ? null : WH_STAFF[recs[0].wh], doneAt: null, doneBy: null };
      recs.forEach((r) => { r.taskId = t.id; });
      tasks.push(t); return t;
    }
    function cargo(whId, clientId, name, packs, weight, vol, daysAgo, recs, transport) {
      const rr = recs.map(([sup, pl, extra]) => rec(whId, clientId, sup, pl, daysAgo + extra));
      const t = task(rr, name, PACK.filter((k) => packs[k]), transport || "auto", "", daysAgo + 0.4, "done");
      const n = packsSum(packs), h = Math.max(20, Math.round((vol * 1e6) / (n * 60 * 40))), dims = [{ l: 60, w: 40, h, n }];
      const c = { id: t.id, wh: whId, clientId, taskId: t.id, name, packs, packType: PACK.filter((k) => packs[k]).sort((a, b) => packs[b] - packs[a])[0], dims, places: n, weight, volume: dimsVolume(dims), photos: [phs++], note: "", transport: t.transport, at: now - daysAgo * D, by: WH_STAFF[whId], sent: 0, receiptIds: rr.map((r) => r.id), value: Math.round((weight * 13) / 100) * 100 };
      rr.forEach((r) => { r.cargoId = c.id; r.charged = true; });
      t.doneAt = c.at; t.doneBy = c.by;
      cargos.push(c); return c;
    }
    // заказ на выдачу: один или несколько прибывших треков одного клиента. o = {status, at, way, tk, payer, collect (сумма в рублях), got, acc (когда принят складом), note}
    function order(list, o) {
      const c = cl(list[0].clientId), r = c.recv, way = o.way || r.way;
      const x = { id: "В-0" + ++on, clientId: c.id, shipIds: list.map((s) => s.id), recv: { name: r.name, phone: r.phone, addr: r.addr }, way, tk: way === "tk" ? o.tk || r.tk || TK[0] : "", payer: o.payer || "us",
        collect: !!o.collect, collectRub: o.collect || 0, gotRub: o.got || 0, gotAt: o.got ? o.done : null, gotBy: o.got ? "sergey" : null, note: o.note || "", status: o.status, at: o.at, by: o.by || "ramil",
        acceptedAt: o.acc || null, acceptedBy: o.acc ? "sergey" : null, doneAt: o.done || null, doneBy: o.done ? "sergey" : null };
      list.forEach((s) => { s.issueId = x.id; if (s.status === "arrived") s.sub = x.status === "issuing" ? "issuing" : "ready"; });
      issues.push(x); return x;
    }
    // отправка: груз уезжает целиком под своим трек-номером; o = {status, arr (дней назад прибыл или "today"), done, issue, paid (доля оплаты 0..1), cur, exp (расходы при выдаче, ₽), payer, got (оплату взял склад при выдаче)}
    function ship(c, transport, route, sentAgo, o) {
      const client = cl(c.clientId), sentAt = now - sentAgo * D, by = boss();
      c.sent = c.places;
      const base = tariffCalc(client, c.weight, c.volume), packRate = { bag: 0.5, wbox: 6, crate: 12, pallet: 18 }[c.packType];
      const done = o.status === "done", expRub = done && o.exp ? REPX.reduce((a, [k]) => a + (o.exp[k] || 0), 0) : 0, expUsd = o.payer === "client" ? Math.round(rubUsd(expRub)) : 0;
      // версия 3.2: стоимость груза (объявленная) и страховка, упаковка по ценам справочника, сумма агенту по ставке маршрута
      const value = c.value || Math.round((c.weight * (o.vk || 13)) / 100) * 100, packUsd = packCost(c.packs, dir), insUsd = insCalc(value, dir), agentUsd = agentCalc(route, c.weight, c.volume, dir); rnd();
      const cost = base + packUsd + insUsd + expUsd;
      const s = { id: c.id, clientId: client.id, transport, route, dest: client.city, items: [{ cargoId: c.id, places: c.places }], sentAt, eta: sentAt + etaDays(route, transport, dir) * D, status: o.status, sub: o.status === "arrived" ? "store" : null, issueId: null, by,
        arrivedAt: o.arr != null ? ago(o.arr) : null, arrBy: o.arr != null ? by : null, doneAt: o.done != null ? now - o.done * D : null, doneBy: o.done != null ? "sergey" : null,
        issue: null, rep: null, cost, deliv: base, packUsd, insUsd, value, insManual: false, agentUsd, agentManual: false, agentPaid: 0, doorUsd: 0, doorCny: 0, issueExpRub: expUsd ? expRub : 0, issueExpUsd: expUsd, paidUsd: Math.round(cost * (o.paid || 0)),
        docs: [{ name: "Упаковочный лист " + c.id + ".pdf", at: sentAt, by }],
        exp: { pack: packExpUsd(c, dir), carrier: agentUsd, other: Math.round(base * 0.02) } };
      if (o.docs) o.docs.forEach((n) => s.docs.push({ name: n + " " + c.id + ".pdf", at: sentAt + D, by }));
      if (done) {
        const tk = o.issue && o.issue.type === "tk", way = tk ? "tk" : client.recv.way === "door" ? "door" : "pickup", got = o.got ? Math.round((cost * CUR.RUB.rate) / 10) * 10 : 0;
        s.issue = tk ? { type: "tk", tk: o.issue.tk, waybill: o.issue.waybill, way } : { type: "client", way };
        s.rep = { photos: [phs++, phs++], damage: "", exp: Object.assign({ load: 0, pallet: 0, fork: 0, other: 0 }, o.exp || {}), note: "", waybill: tk ? o.issue.waybill : "", at: s.doneAt, by: "sergey" };
        order([s], { status: "done", at: s.arrivedAt + 0.35 * D, way, tk: tk ? o.issue.tk : "", payer: o.payer || "us", collect: got, got, acc: s.doneAt - 0.2 * D, done: s.doneAt });
        if (expRub) wops.push({ at: s.doneAt, kind: "issueexp", cur: "RUB", amount: -expRub, shipId: s.id, clientId: client.id, by: "sergey" });
        if (got) { wops.push({ at: s.doneAt, kind: "client", cur: "RUB", amount: got, orderId: s.issueId, clientId: client.id, by: "sergey" }); payments.push({ id: pn++, clientId: client.id, at: s.doneAt, amount: got, cur: "RUB", rate: CUR.RUB.rate, usd: s.paidUsd, by: "sergey", shipIds: [s.id], src: "issue" }); }
      }
      if (s.paidUsd && !o.got) {
        const cur = o.cur || "RUB", rate = Math.round(CUR[cur].rate * (0.985 + rnd() * 0.03) * 100) / 100, at = (s.doneAt || s.arrivedAt || sentAt + 1.1 * D) - 0.6 * D;
        const big = cur === "RUB" || cur === "KZT" || cur === "KGS", fixed = cur === "USD" || cur === "USDT", raw = s.paidUsd * (fixed ? 1 : rate);
        payments.push({ id: pn++, clientId: client.id, at, amount: big ? Math.round(raw / 100) * 100 : Math.round(raw), cur, rate: fixed ? 1 : rate, usd: s.paidUsd, by: "natalia", shipIds: [s.id] });
      }
      ships.push(s); return s;
    }
    // выданные: архив с фотоотчётом, расходами и историей
    ship(cargo("yiwu", "D051", "Посуда и текстиль", { bag: 21 }, 300, 1.9, 50, [["Yiwu Hongda Trading", 21, 1]]), "auto", "3G", 48, { status: "done", arr: 33, done: 32, issue: { type: "client" }, paid: 1, cur: "RUB", exp: { load: 1500 } });
    ship(cargo("yiwu", "W001", "Ткани", { bag: 34 }, 690, 2.9, 47, [["Shaoxing Keqiao Fabric", 20, 2], ["Shaoxing Keqiao Fabric", 14, 1]], "rail"), "rail", "88G", 45, { status: "done", arr: 22, done: 21, issue: { type: "tk", tk: "Деловые линии", waybill: "25-00418-331907" }, paid: 1, cur: "RUB", exp: { load: 2000, fork: 1500 }, payer: "client" });
    ship(cargo("gz", "M112", "Товары для дома", { bag: 30 }, 700, 3.9, 44, [["Dongguan Homeware", 30, 1]]), "auto", "3G", 42, { status: "done", arr: 27, done: 26, issue: { type: "tk", tk: "СДЭК", waybill: "10087425516" }, paid: 1, cur: "USDT", exp: { load: 1800 } });
    ship(cargo("fs", "W006", "Светильники", { crate: 12 }, 190, 1.0, 40, [["Foshan Mingde Lighting", 12, 1]]), "auto", "89G", 38, { status: "done", arr: 23, done: 22, issue: { type: "tk", tk: "ПЭК", waybill: "МВЕК-7730412" }, paid: 1, cur: "RUB", exp: { load: 1500, pallet: 1200 } });
    ship(cargo("yiwu", "A023", "Автозапчасти", { bag: 40, wbox: 4 }, 980, 4.2, 36, [["Ningbo Autoparts Co.", 30, 2], ["Ningbo Autoparts Co.", 14, 1]], "rail"), "rail", "81G", 34, { status: "done", arr: 11, done: 10, issue: { type: "tk", tk: "Деловые линии", waybill: "25-00431-118452" }, paid: 1, exp: { load: 2500, fork: 2000 }, payer: "client", got: true });
    ship(cargo("sz", "D051", "Электроника", { wbox: 16 }, 210, 1.3, 23, [["Shenzhen Brightway Electronics", 16, 1]], "air"), "air", "3G", 21, { status: "done", arr: 16, done: 15, issue: { type: "client" }, paid: 1, got: true });
    // прибыли в Москву: хранение, готов к выдаче, выдают
    const toys = ship(cargo("yiwu", "S007", "Игрушки", { bag: 25 }, 160, 2.2, 20, [["Yiwu Joyful Toys", 25, 1]]), "auto", "3G", 18, { status: "arrived", arr: 2, paid: 1, cur: "USDT" });
    ship(cargo("yiwu", "T045", "Спортинвентарь", { bag: 14 }, 240, 1.6, 19, [["Jinhua Sport Goods", 14, 1]]), "auto", "88G", 17, { status: "arrived", arr: "today" });
    const furn = ship(cargo("gz", "K014", "Мебель", { pallet: 8 }, 410, 3.2, 20, [["Guangzhou Meitai Furniture", 8, 1]]), "auto", "89G", 17, { status: "arrived", arr: 1, paid: 0.4, cur: "RUB", docs: ["Инвойс"] });
    const fitt = ship(cargo("gz", "K014", "Фурнитура", { bag: 10 }, 150, 1.05, 19, [["Dongguan Homeware", 10, 1]]), "auto", "89G", 17, { status: "arrived", arr: 1 });
    ship(cargo("fs", "D051", "Светильники", { crate: 10 }, 170, 0.9, 24, [["Foshan Mingde Lighting", 10, 1]]), "auto", "88G", 22, { status: "arrived", arr: 5, paid: 1, cur: "RUB" });
    ship(cargo("yiwu", "D051", "Посуда", { bag: 18 }, 260, 1.5, 22, [["Yiwu Hongda Trading", 18, 1]]), "auto", "3G", 20, { status: "arrived", arr: 3 });
    ship(cargo("sz", "D051", "Электроника", { wbox: 14 }, 190, 1.1, 11, [["Shenzhen Brightway Electronics", 14, 1]], "air"), "air", "3G", 9, { status: "arrived", arr: "today", docs: ["Инвойс"] });
    order([furn, fitt], { status: "ready", at: now - 0.4 * D, payer: "client", collect: Math.round(((furn.cost - furn.paidUsd + fitt.cost) * CUR.RUB.rate) / 10) * 10, note: "Позвонить получателю за час до сдачи в ТК" });
    order([toys], { status: "issuing", at: now - 1.1 * D, by: "olga", acc: now - 0.3 * D, note: "Магазин принимает с 10 до 19" });
    // в пути
    ship(cargo("fs", "W006", "Светильники", { crate: 14 }, 238, 1.12, 15, [["Foshan Mingde Lighting", 14, 1]]), "auto", "89G", 13, { status: "way" });
    ship(cargo("yiwu", "D051", "Посуда и спорттовары", { bag: 19 }, 264, 1.58, 13, [["Yiwu Hongda Trading", 12, 2], ["Jinhua Sport Goods", 7, 1]]), "auto", "3G", 11, { status: "way", docs: ["Инвойс"] });
    ship(cargo("yiwu", "W001", "Ткани", { bag: 40 }, 820, 3.1, 11, [["Shaoxing Keqiao Fabric", 40, 1]], "rail"), "rail", "88G", 9, { status: "way", paid: 1, cur: "KZT" });
    ship(cargo("fs", "M112", "Керамика", { crate: 8 }, 300, 1.6, 4, [["Foshan Hualong Ceramics", 8, 1]]), "auto", "3G", 2, { status: "way" });
    // оплаты агентам: часть треков оплачена, два старых трека (88G и 81G) не оплачены дольше 30 дней
    const apays = [];
    [[[0, 2], 40, "Перевод", ""], [[3], 30, "Перевод", ""], [[10], 15, "USDT", "через обменник"], [[5, 6], 12, "Перевод", "две партии одним платежом"]].forEach(([idx, daysAgo, method, note], i) => {
      const list = idx.map((k) => ships[k]), amount = list.reduce((a, s) => a + s.agentUsd, 0);
      list.forEach((s) => { s.agentPaid = s.agentUsd; });
      apays.push({ id: i + 1, route: list[0].route, at: now - daysAgo * D, amount, shipIds: list.map((s) => s.id), method, note, by: "natalia" });
    });
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

    // версия 3.3: ещё три груза клиента D051 в пути с разными датами отправки, чтобы шкала пути стояла в разных местах:
    // только отправлен, на таможне, почти полная (плюс груз на границе выше). Номера и счётчики не сдвигают остальные данные демо
    const keep = { tt, rn, rs };
    tt = 2680; rn = 280;
    ship(cargo("yiwu", "D051", "Кабели и зарядки", { bag: 12 }, 150, 0.8, 2, [["Yiwu Hongda Trading", 12, 1]]), "auto", "3G", 1, { status: "way" });
    ship(cargo("fs", "D051", "Настольные лампы", { crate: 6 }, 180, 1.2, 17, [["Foshan Mingde Lighting", 6, 1]]), "auto", "88G", 15, { status: "way", paid: 1, cur: "RUB" });
    ship(cargo("yiwu", "D051", "Чайники и блендеры", { wbox: 10 }, 220, 1.4, 17, [["Yiwu Hongda Trading", 10, 1]]), "auto", "3G", 15, { status: "way", docs: ["Инвойс"] });
    tt = keep.tt; rn = keep.rn; rs = keep.rs;

    // взаиморасчёты со складом в Москве за месяц: рубли в плюсе, доллары в минусе
    const W = (at, kind, cur, amount, x) => wops.push(Object.assign({ at: typeof at === "number" ? now - at * D : today, kind, cur, amount: WOPK[kind][0] * amount, by: kind === "topup" ? "ramil" : "sergey" }, x || {}));
    W(27, "topup", "RUB", 300000, { note: "на расходы склада" });
    W(26, "topup", "USD", 3000);
    W(24, "route", "USD", 2400, { route: "88G", agent: "Нурлан, Алматы" });
    W(22.5, "cube", "RUB", 10200, { vol: 6.8, rate: 1500, route: "89G" });
    W(14, "route", "USD", 1850, { route: "3G", agent: "Бекзат, Хоргос" });
    W(10.5, "cube", "RUB", 18600, { vol: 12.4, rate: 1500, route: "81G" });
    W(8, "topup", "USD", 2000);
    W(6, "other", "RUB", 4500, { note: "плёнка и скотч для переупаковки" });
    W(5, "cube", "RUB", 14400, { vol: 9.6, rate: 1500, route: "88G" });
    W(4, "route", "USD", 2100, { route: "89G", agent: "Нурлан, Алматы" });
    W(1, "cube", "RUB", 12300, { vol: 8.2, rate: 1500, route: "89G" });
    W("today", "topup", "RUB", 150000, { note: "на выдачи этой недели" });
    wops.sort((a, b) => a.at - b.at); wops.forEach((w, i) => { w.id = i + 1; w.note = w.note || ""; });

    const access = {}, staff = JSON.parse(JSON.stringify(STAFF0));
    Object.keys(staff).forEach((k) => { staff[k].pass = "demo"; });
    Object.keys(ACCESS0).forEach((k) => {
      const a = ACCESS0[k], s = a.s.split(" "), f = a.f.split(" ");
      access[k] = { sec: {}, fn: {}, scope: a.scope, clients: [] };
      if (a.preset) access[k].preset = a.preset;
      SECTIONS.forEach(([id]) => { access[k].sec[id] = s.includes(id); });
      FUNCS.forEach(([id]) => { access[k].fn[id] = f.includes(id); });
    });

    // история действий по исходным данным
    const log = [];
    const L = (at, by, k, t, ids, c) => log.push({ at, by, k, t, ids, c: c || null });
    const chain = (s) => [s.id].concat(cargos.find((c) => c.id === s.id).receiptIds);
    receipts.forEach((r) => L(r.at, r.by, r.clientId ? "accept" : "unknown", r.clientId ? LT.accept(r) : LT.unknown(r), [r.id], r.clientId));
    tasks.forEach((t) => { const ids = [t.id].concat(t.receiptIds); L(t.at, t.by, "packcmd", LT.packcmd(t), ids, t.clientId); if (t.collectedAt) L(t.collectedAt, t.collectedBy, "collected", LT.collected(t, t.receiptIds.length), ids, t.clientId); });
    cargos.forEach((c) => L(c.at, c.by, "packed", LT.packed(c), [c.id].concat(c.receiptIds), c.clientId));
    ships.forEach((s) => {
      const ids = chain(s);
      L(s.sentAt, s.by, "dispatch", LT.dispatch(s), ids, s.clientId);
      if (s.arrivedAt) L(s.arrivedAt, s.arrBy, "arrive", LT.arrive(s), ids, s.clientId);
      if (s.doneAt) L(s.doneAt, s.doneBy, "issue", LT.issue(s), ids.concat(s.issueId), s.clientId);
    });
    issues.forEach((o) => {
      const ids = o.shipIds.concat(o.id);
      L(o.at, o.by, "issuecmd", LT.issuecmd(o), ids, o.clientId);
      if (o.acceptedAt) L(o.acceptedAt, o.acceptedBy, "issueacc", LT.issueacc(o), ids, o.clientId);
      if (o.gotRub) L(o.gotAt - 60e3, o.gotBy, "pay", LT.collect(o, o.gotRub), ids, o.clientId);
    });
    payments.filter((p) => p.src !== "issue").forEach((p) => L(p.at, p.by, "pay", `Оплата: клиент ${p.clientId}, ${p.cur === "USD" ? u.usd(p.amount) : u.groups(Math.round(p.amount)) + " " + CUR[p.cur].s + " = " + u.usd(p.usd)}, за груз ${p.shipIds.join(", ")}`, p.shipIds, p.clientId));
    wops.filter((w) => w.kind !== "issueexp" && w.kind !== "client").forEach((w) => L(w.at, w.by, "wop", LT.wop(w), [], null));
    apays.forEach((p) => L(p.at, p.by, "apay", LT.apay(p, agentOf(p.route, dir)), p.shipIds, null));
    L(now - 1.6 * D, "natalia", "dir", "Настройки: курсы валют: надбавка к курсу ЦБ: рубли 1%, тенге 2%, сомы 1%; USDT вручную 1", [], null);
    L(now - 26 * D, "ramil", "access", "Доступ: Наталье Сергеевой открыт раздел «Отчёты»", [], null);
    L(now - 14 * D, "ramil", "access", "Доступ: Дарья Власова видит только своих клиентов", [], null);
    L(now - 6.2 * D, "ramil", "access", "Доступ: Сергей Никитин, применён набор прав «как склад в Москве»", [], null);
    L(now - 1.3 * D, "c:" + ME, "expected", "Трек клиента: SF1420886375512, наушники, 3 коробки", [], ME);
    log.sort((a, b) => a.at - b.at); log.forEach((e, i) => { e.id = i + 1; });

    const mine = ships.find((s) => s.clientId === ME && s.status === "way"), g17 = cargos.find((c) => c.clientId === ME && !c.sent), arr = ships.filter((s) => s.clientId === ME && s.status === "arrived").sort((a, b) => b.arrivedAt - a.arrivedAt);
    const notes = arr.map((s) => ({ clientId: ME, text: `Груз ${s.id} прибыл в Москву и лежит на хранении. Сообщим, когда он будет готов к выдаче.`, at: s.arrivedAt, read: true, ref: { t: "ship", id: s.id } })).concat([
      { clientId: ME, text: `Груз ${g17.id} упакован: ${packsText(g17.packs)}, ${u.kg(g17.weight)}, ${u.vol(g17.volume)}. Ждёт отправки.`, at: g17.at, read: true, ref: { t: "cargo", id: g17.id } },
      { clientId: ME, text: `Груз принят на складе (Иу): 5 мест от Yiwu Hongda Trading. Фото уже в приложении.`, at: now - 2.1 * D, read: true, ref: null },
      { clientId: ME, text: `Груз ${mine.id} отправлен: авто, маршрут ${mine.route}, ${mine.dest}. Прибытие около ${u.dLong(mine.eta)}. Стоимость ${u.usd(mine.cost)}.`, at: mine.sentAt, read: true, ref: { t: "ship", id: mine.id } },
    ]).sort((a, b) => b.at - a.at);
    notes.forEach((n, i) => { n.id = notes.length - i; });
    // версия 3.3: новости и рассылки. Прочитали: часть клиентов; у клиента D051 одна новость не прочитана
    const allC = clients.map((c) => c.id), rd = (ids, at) => Object.assign({}, ...ids.map((id, i) => ({ [id]: at + (i + 1) * 3600e3 })));
    const ny = new Date(now); ny.setMonth(11, 30); ny.setHours(10, 0, 0, 0); if (ny.getTime() < now + D) ny.setFullYear(ny.getFullYear() + 1);
    const news = [
      { id: 1, kind: "greet", title: "Спасибо, что вы с нами!", text: "Сегодня нашей компании пять лет. Спасибо, что доверяете нам свои грузы. Впереди новые маршруты и удобный кабинет, где видно каждый груз от склада в Китае до выдачи.", img: null, to: "all", clients: [], status: "sent", at: now - 20 * D, by: "ramil", reads: rd(allC.filter((c) => c !== "M112"), now - 20 * D) },
      { id: 2, kind: "info", title: "График работы складов в праздники", text: "Склады в Китае не работают с 1 по 17 февраля: Праздник весны. Грузы, принятые до 25 января, отправим до праздников. Склад в Москве работает без перерыва. Пожалуйста, планируйте заказы заранее.", img: { p: 1, kind: "pallet" }, to: "all", clients: [], status: "sent", at: now - 6 * D, by: "olga", reads: rd(["D051", "W001", "K014", "A023", "T045"], now - 6 * D) },
      { id: 3, kind: "important", title: "Важно: тарифы с 1 декабря", text: "С 1 декабря для лёгких грузов (плотность меньше 100 кг/м³) авто доставка стоит 340 $ за м³ вместо 330 $. Для остальных грузов тарифы прежние. Грузы, отправленные до 1 декабря, считаются по старым тарифам.", img: null, to: "all", clients: [], status: "sent", at: now - 0.3 * D, by: "ramil", reads: rd(["W006", "K014"], now - 0.3 * D) },
      { id: 4, kind: "greet", title: "С наступающим Новым годом!", text: "Поздравляем с Новым годом! Спасибо за доверие в этом году. Склад в Москве 1 и 2 января не работает, склады в Китае работают в обычном режиме.", img: null, to: "all", clients: [], status: "sched", at: ny.getTime(), by: "ramil", reads: {} },
    ];
    return {
      v: V, clients, receipts, tasks, cargos, ships, payments, issues, wops, staff, access, hide: {}, log, dir, apays,
      expected: [
        { id: "E-34", clientId: "M112", track: track(), supplier: "Foshan Hualong Ceramics", what: "Плитка, 2 паллета", at: now - 0.8 * D },
        { id: "E-33", clientId: ME, track: "SF1420886375512", supplier: "Shenzhen Brightway Electronics", what: "Наушники, 3 коробки", at: now - 1.3 * D },
        { id: "E-32", clientId: "A023", track: track(), supplier: "Ningbo Autoparts Co.", what: "Запчасти, около 30 мест", at: now - 2.2 * D },
        { id: "E-31", clientId: "T045", track: track(), supplier: "Jinhua Sport Goods", what: "Спортинвентарь, 12 мест", at: now - 3.1 * D },
      ],
      notes,
      seq: { rec: rn + 1, tt: tt + 1, note: notes.length + 1, exp: 35, pay: pn, log: log.length + 1, staff: 1, iss: on + 1, wop: wops.length + 1, apay: apays.length + 1, wh: 1, news: 5 },
      news, tg: false, createdAt: now,
    };
  }

  let S = null;
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { const v = JSON.parse(raw); if (v && v.v === V && v.receipts && v.tasks && v.log && v.staff && v.hide && v.issues && v.wops && v.dir && v.apays && v.news && v.seq && v.seq.tt && v.seq.iss) { S = v; applyDir(S.dir); return; } } } catch (e) { /* хранилище недоступно */ }
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
  // наш трек-номер: автоматический TT-<код клиента><номер> или вписанный администратором вручную
  const ttNorm = (v) => String(v == null ? "" : v).trim().toUpperCase();
  const ttOwner = (id) => task(id) || cargo(id) || ship(id) || null;
  const ttFree = (clientId) => { let n = S.seq.tt; while (ttOwner("TT-" + clientId + n)) n++; return n; };
  const nextTT = (clientId) => "TT-" + clientId + ttFree(clientId);
  // проверка номера перед сохранением: пустой, недопустимые знаки, занят другим грузом. self: номер груза, который исправляют
  function ttCheck(v, self) {
    const id = ttNorm(v);
    if (!id) return "Впишите трек-номер или подставьте автоматический";
    if (id.length > 24) return "Слишком длинный номер: не больше 24 знаков";
    if (!/^[\p{L}\p{N}][\p{L}\p{N}._\/-]*$/u.test(id)) return "Только буквы, цифры, дефис, точка и косая черта, без пробелов";
    if (self && id === self) return "";
    const o = ttOwner(id);
    if (o) return `Такой номер уже есть у другого груза (клиент ${o.clientId})`;
    if (rec(id) || /^П-0\d+$/.test(id)) return "Такой номер занят приходом, выберите другой";
    return "";
  }
  // «Подставить автоматически» при исправлении: свой автоматический номер груз сохраняет, после ручного выдаётся следующий свободный
  const ttAutoFor = (id) => { const o = ttOwner(id); return !o ? "" : (task(id) || {}).manual ? nextTT(o.clientId) : id; };
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
  const debtOf = (s) => Math.max(0, Math.round((s.cost - s.paidUsd) * 100) / 100);
  // прибывшие грузы и заказы на выдачу
  const arrived = (sub) => S.ships.filter((s) => s.status === "arrived" && (!sub || s.sub === sub));
  const issueOrder = (id) => S.issues.find((o) => o.id === id) || null;
  const issueOf = (s) => (s && s.issueId ? issueOrder(s.issueId) : null);
  const openIssues = (status) => S.issues.filter((o) => o.status !== "done" && (!status || o.status === status));
  const issueShips = (o) => o.shipIds.map(ship).filter(Boolean);
  // сколько склад должен получить с клиента: сумма по команде администратора плюс расходы при выдаче, если их платит клиент
  const issueDue = (o) => (o.collect ? o.collectRub : 0) + (o.payer === "client" ? issueShips(o).reduce((a, s) => a + (s.status === "done" ? repSum(s.rep) : 0), 0) : 0);
  const issueRest = (o) => Math.max(0, issueDue(o) - (o.gotRub || 0));
  const sumShips = (list) => list.reduce((a, s) => { const t = totals(s); return { places: a.places + t.places, weight: a.weight + t.weight, volume: a.volume + t.volume }; }, { places: 0, weight: 0, volume: 0 });
  const isToday = (t) => u.dayDiff(t) === 0;
  const arrivedToday = () => S.ships.filter((s) => s.arrivedAt && isToday(s.arrivedAt));
  const storeDays = (s) => Math.max(0, Math.round(((s.doneAt || Date.now()) - s.arrivedAt) / u.DAY));
  // долг по выбранным трекам в рублях по текущему курсу: подставляется в «Получить оплату при выдаче»
  const debtRub = (ids) => Math.round((ids.map(ship).filter(Boolean).reduce((a, s) => a + debtOf(s), 0) * CUR.RUB.rate) / 10) * 10;
  // история груза после прибытия: прибытие, хранение, заказ на выдачу, расходы, деньги, выдача
  function issueStory(s) {
    const o = issueOf(s), out = [];
    if (!s.arrivedAt) return out;
    out.push(["Прибыл в Москву", s.arrivedAt, who(s.arrBy)]);
    out.push(["Хранение: " + (storeDays(s) ? storeDays(s) + " " + u.plural(storeDays(s), "день", "дня", "дней") : "меньше дня"), null, s.status === "done" ? "до выдачи" : "лежит на складе"]);
    if (o) {
      out.push([`Команда на выдачу: ${WAY[o.way].low}${o.way === "tk" && o.tk ? " " + o.tk : ""}`, o.at, who(o.by) + " · заказ " + o.id]);
      if (o.acceptedAt) out.push(["Принят складом в работу", o.acceptedAt, who(o.acceptedBy)]);
    }
    if (s.status === "done") {
      const x = repSum(s.rep);
      if (x) out.push([`Расходы при выдаче: ${rub(x)}`, s.doneAt, o && o.payer === "client" ? "платит клиент" : "платит компания"]);
      if (o && o.gotRub) out.push([`Получены деньги: ${rub(o.gotRub)}`, o.gotAt, who(o.gotBy)]);
      out.push([s.issue.type === "tk" ? `Передан в ТК ${s.issue.tk}, накладная ${s.issue.waybill}` : s.issue.way === "door" ? "Выдан: доставлен до двери" : "Выдан: клиент забрал сам", s.doneAt, who(s.doneBy)]);
    }
    return out;
  }
  function money(clientId) {
    const list = S.ships.filter((s) => !clientId || s.clientId === clientId);
    const charged = list.reduce((a, s) => a + s.cost, 0), paid = list.reduce((a, s) => a + Math.min(s.cost, s.paidUsd), 0);
    // долг считается по грузам: переплата по одному грузу не гасит другой
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

  // ---------- движение груза ----------
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
  // организовать упаковку: грузы одного клиента на одном складе; в этот момент присваивается наш трек-номер, автоматический или вписанный вручную (d.tt)
  function organize(recIds, d) {
    const list = recIds.map(rec).filter((r) => r && r.clientId && !r.cargoId && !r.taskId); if (!list.length) return null;
    const rs = list.filter((r) => r.clientId === list[0].clientId && r.wh === list[0].wh), now = Date.now();
    const n = ttFree(rs[0].clientId), auto = "TT-" + rs[0].clientId + n, want = ttNorm(d.tt), manual = !!want && want !== auto;
    if (manual && ttCheck(want)) return null;
    if (!manual) S.seq.tt = n + 1;
    const t = { id: manual ? want : auto, manual, wh: rs[0].wh, clientId: rs[0].clientId, receiptIds: rs.map((r) => r.id), name: String(d.name || "").trim().slice(0, 80), packPlan: (d.packPlan || []).filter((k) => PACK.includes(k)),
      transport: TRANSPORT[d.transport] ? d.transport : "", note: String(d.note || "").trim().slice(0, 200), value: Math.max(0, Math.round(+d.value || 0)), date: d.date || now, at: now, by: d.by || "ramil", status: "collect", collectedAt: null, collectedBy: null, doneAt: null, doneBy: null, fresh: true };
    rs.forEach((r) => { r.taskId = t.id; r.fresh = false; r.lost = false; (S.hide[r.id] || []).forEach((k) => { (S.hide[t.id] = S.hide[t.id] || []).includes(k) || S.hide[t.id].push(k); }); });
    S.tasks.push(t);
    notify(t.clientId, `Ваш груз готовят к упаковке. Трек-номер ${t.id}: по нему можно следить за грузом.`, { t: "rec", id: rs[0].id });
    logAdd("packcmd", t.by, LT.packcmd(t), chainIds("task", t), t.clientId);
    if (manual) logAdd("tt", t.by, `Трек-номер: задан вручную, ${t.id} вместо автоматического ${auto}`, chainIds("task", t), t.clientId);
    changed(); emit("packcmd", t);
    return t;
  }
  // исправление трек-номера: он общий у заказа, груза и отправки, поэтому меняется во всей цепочке, в истории, документах и уведомлениях
  function setTT(oldId, v, by) {
    const id = ttNorm(v), t = task(oldId), c = cargo(oldId), s = ship(oldId), o = s || c || t;
    if (!o || id === oldId || ttCheck(id, oldId)) return null;
    const n = ttFree(o.clientId), auto = id === "TT-" + o.clientId + n, ren = (x) => (x === oldId ? id : x);
    if (auto) S.seq.tt = n + 1;
    if (t) { t.id = id; t.manual = !auto; }
    if (c) { c.id = id; c.taskId = ren(c.taskId); }
    if (s) { s.id = id; s.docs.forEach((x) => { x.name = x.name.split(oldId).join(id); }); }
    S.ships.forEach((x) => x.items.forEach((y) => { y.cargoId = ren(y.cargoId); }));
    S.receipts.forEach((r) => { r.taskId = ren(r.taskId); r.cargoId = ren(r.cargoId); });
    if (S.hide[oldId]) { S.hide[id] = S.hide[oldId]; delete S.hide[oldId]; }
    S.log.forEach((e) => { e.ids = e.ids.map(ren); });
    S.notes.forEach((x) => { if (x.ref && x.ref.t !== "rec" && x.ref.id === oldId) x.ref.id = id; });
    S.issues.forEach((x) => { x.shipIds = x.shipIds.map(ren); });
    S.wops.forEach((x) => { if (x.shipId === oldId) x.shipId = id; });
    S.payments.forEach((x) => { if (x.shipIds) x.shipIds = x.shipIds.map(ren); if (x.shipId === oldId) x.shipId = id; });
    S.apays.forEach((x) => { x.shipIds = x.shipIds.map(ren); });
    logAdd("tt", by, `Трек-номер: изменён, был ${oldId}, стал ${id}${auto ? ", автоматический" : ", задан вручную"}`, chainIds(s ? "ship" : c ? "cargo" : "task", o), o.clientId);
    notify(o.clientId, `Трек-номер вашего груза изменён: был ${oldId}, теперь ${id}. Следите за грузом по новому номеру.`, s ? { t: "ship", id } : c ? { t: "cargo", id } : { t: "rec", id: t.receiptIds[0] });
    emit("renamed", { from: oldId, to: id }); changed();
    return id;
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
      weight: Math.max(0, +d.weight || 0), volume: +d.volume > 0 ? r2(+d.volume) : dimsVolume(dims), volManual: +d.volume > 0, photos: (d.photos || []).slice(), note: String(d.note || "").trim().slice(0, 200), transport: t.transport, at: Date.now(), by: d.by || WH_STAFF[t.wh], sent: 0, receiptIds: t.receiptIds.slice(), value: t.value || 0, fresh: true };
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
      // стоимость груза: из окна отправки или из организации упаковки; страховка, упаковка и сумма агенту считаются по справочникам
      const vv = d.values && d.values[c.id] != null && d.values[c.id] !== "" ? +d.values[c.id] : c.value || 0, value = Math.max(0, Math.round(vv || 0)), agentUsd = agentCalc(route, c.weight, c.volume);
      const s = { id: c.id, clientId: c.clientId, transport: tr, route, dest: String(d.dest || cl.city).trim() || cl.city, items: [{ cargoId: c.id, places: c.places }], sentAt, eta: sentAt + etaDays(route, tr) * u.DAY,
        status: "way", sub: null, issueId: null, by: d.by || "ramil", arrivedAt: null, arrBy: null, doneAt: null, doneBy: null, issue: null, rep: null, cost: 0, deliv: tariffCalc(cl, c.weight, c.volume), packUsd: packCost(c.packs), insUsd: insCalc(value), value, insManual: false,
        agentUsd, agentManual: false, agentPaid: 0, doorCny, doorUsd, issueExpRub: 0, issueExpUsd: 0, paidUsd: 0, docs: [], exp: { pack: 0, carrier: 0, other: 0 }, fresh: true };
      recost(s);
      c.sent = c.places; c.fresh = false; c.value = value; c.receiptIds.forEach((id) => { const r = rec(id); if (r) r.charged = true; });
      s.exp = { pack: packExpUsd(c), carrier: agentUsd, other: Math.round(s.cost * 0.02) };
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
    if (ROUTES.includes(d.route) && d.route !== s.route) { s.route = d.route; ch.push("маршрут " + s.route); if (!s.agentManual && !(s.agentPaid > 0)) { s.agentUsd = agentCalc(s.route, totals(s).weight, totals(s).volume); s.exp.carrier = s.agentUsd; } }
    if (d.dest && String(d.dest).trim() !== s.dest) { s.dest = String(d.dest).trim(); ch.push("место назначения " + s.dest); }
    if (d.date && Math.abs(d.date - s.sentAt) > 12 * 3600e3) { s.sentAt = d.date; ch.push("дата " + u.dShort(s.sentAt)); }
    // общая стоимость правится через доставку: остальные части (упаковка, страховка, расходы) не меняются
    if (d.cost != null && Math.round(d.cost) !== Math.round(s.cost) && d.cost >= 0) { s.deliv = Math.max(0, r2(s.deliv + Math.round(d.cost) - s.cost)); s.dmode = "sum"; recost(s); ch.push("стоимость " + u.usd(s.cost)); }
    if (!ch.length) return s;
    s.eta = s.sentAt + etaDays(s.route, s.transport) * u.DAY;
    logAdd("edit", by, `Изменение отправки: ${s.id}, ${ch.join(", ")}`, chainIds("ship", s), s.clientId);
    changed(); emit("edited", s);
    return s;
  }
  // прибытие в Москву: груз ложится на хранение и ждёт команды «Выдать»
  function arrive(id, by) {
    const s = ship(id); if (!s || s.status !== "way") return null;
    s.status = "arrived"; s.sub = "store"; s.arrivedAt = Date.now(); s.arrBy = by || "ramil"; s.fresh = true;
    notify(s.clientId, `Груз ${s.id} прибыл в Москву и лежит на хранении. Сообщим, когда он будет готов к выдаче.`, { t: "ship", id: s.id });
    logAdd("arrive", s.arrBy, LT.arrive(s), chainIds("ship", s), s.clientId);
    changed(); emit("arrived", s);
    return s;
  }
  // ---------- выдача: команда администратора, «Принят» у склада в Москве, фотоотчёт и «Готово» ----------
  const issueIds = (o) => issueShips(o).reduce((a, s) => a.concat(chainIds("ship", s)), []).concat(o.id);
  // заказ на выдачу: один или несколько треков одного клиента, которые лежат на хранении
  // ---------- версия 3.3: доставка до двери или транспортной компанией в заказе на выдачу ----------
  // платит клиент: сумма прибавляется к стоимости треков (делится по весу) и к оплате при выдаче;
  // платим мы: наш расход по грузу, а если платит склад в Москве, операция во взаиморасчётах после выдачи
  const dlvLabel = (o) => (o.way === "tk" ? "Доставка ТК" : "Доставка до двери");
  const dlvText = (o) => (o.dlv ? `${dlvLabel(o)}: платит ${o.dlv.payer === "client" ? "клиент" : o.dlv.wh ? "склад в Москве за нас" : "компания"}, ${o.dlv.rub ? rub(o.dlv.rub) : "сумма будет позже"}` : "");
  function dlvSpread(o, list) {
    const ss = list || issueShips(o), sum = o.dlv ? o.dlv.rub : 0, W = ss.reduce((a, s) => a + (totals(s).weight || 1), 0) || 1;
    let left = sum;
    ss.forEach((s, i) => {
      const part = !o.dlv ? 0 : i === ss.length - 1 ? left : Math.round((sum * (totals(s).weight || 1)) / W); left -= part;
      const cl = o.dlv && o.dlv.payer === "client";
      s.dlvRub = cl ? part : 0; s.dlvUsd = cl ? Math.round(rubUsd(part)) : 0; s.dlvWay = o.dlv ? o.way : null;
      s.exp.dlv = !cl && o.dlv ? Math.round(rubUsd(part)) : 0; recost(s);
    });
  }
  // уточнить сумму доставки (в фотоотчёте или позже): пересчёт стоимости треков и оплаты при выдаче
  function setDlv(id, v, by, quiet) {
    const o = issueOrder(id); if (!o || !o.dlv) return null;
    const nv = Math.max(0, Math.round(+v || 0)), was = o.dlv.rub; if (nv === was) return o;
    o.dlv.rub = nv;
    if (o.dlv.payer === "client" && o.collect && !o.gotRub) o.collectRub = Math.max(0, o.collectRub + nv - was);
    dlvSpread(o, issueShips(o).filter((s) => s.issueId === o.id));
    logAdd("issuecmd", by || "sergey", `${dlvLabel(o)}: заказ ${o.id}, было ${was ? rub(was) : "не указано"}, стало ${rub(nv)}, платит ${o.dlv.payer === "client" ? "клиент" : "компания"}`, issueIds(o), o.clientId);
    if (o.dlv.payer === "client") notify(o.clientId, `${dlvLabel(o)} по ${o.shipIds.length > 1 ? "грузам " + o.shipIds.join(", ") : "грузу " + o.shipIds[0]}: ${rub(nv)}, добавлено к стоимости.`, { t: "ship", id: o.shipIds[0] });
    if (!quiet) changed();
    return o;
  }
  // блок выдачи одним текстом для кнопки «Копировать»: способ выдачи, получатель, адрес, доставка
  function issueText(x) {
    const r = x.recv || {}, way = WAY[x.way] ? x.way : "pickup", lines = [`Способ выдачи: ${WAY[way].t}${way === "tk" && x.tk ? ": " + x.tk : ""}`];
    lines.push(`Получатель: ${[String(r.name || "").trim() || "не указан", String(r.phone || "").trim()].filter(Boolean).join(", ")}`);
    if (way !== "pickup" && String(r.addr || "").trim()) lines.push(`Адрес: ${String(r.addr).trim()}`);
    if (way !== "pickup" && x.dlv && x.dlv.rub > 0) lines.push(dlvText(Object.assign({}, x, { way })));
    return lines.join("\n");
  }
  function issueCreate(shipIds, d) {
    const list = shipIds.map(ship).filter((s) => s && s.status === "arrived" && s.sub === "store"); if (!list.length) return null;
    const ss = list.filter((s) => s.clientId === list[0].clientId), c = client(ss[0].clientId), r = c.recv || {}, x = d.recv || {}, way = WAY[d.way] ? d.way : WAY[r.way] ? r.way : "pickup", now = Date.now();
    const o = { id: "В-0" + S.seq.iss++, clientId: c.id, shipIds: ss.map((s) => s.id), recv: { name: String(x.name || "").trim().slice(0, 60), phone: String(x.phone || "").trim().slice(0, 30), addr: String(x.addr || "").trim().slice(0, 160) },
      way, tk: way === "tk" ? String(d.tk || r.tk || TK[0]).trim().slice(0, 40) : "", payer: d.payer === "client" ? "client" : "us", collect: !!d.collect && (+d.collectRub > 0 || (way !== "pickup" && !!d.dlv && d.dlv.payer !== "us" && +d.dlv.rub > 0)), collectRub: d.collect ? Math.max(0, Math.round(+d.collectRub || 0)) : 0, gotRub: 0, gotAt: null, gotBy: null,
      note: String(d.note || "").trim().slice(0, 200), status: "ready", at: now, by: d.by || "ramil", acceptedAt: null, acceptedBy: null, doneAt: null, doneBy: null, fresh: true,
      dlv: way !== "pickup" && d.dlv ? { payer: d.dlv.payer === "us" ? "us" : "client", rub: Math.max(0, Math.round(+d.dlv.rub || 0)), wh: d.dlv.payer === "us" && d.dlv.wh !== false } : null };
    if (o.dlv && o.dlv.payer === "client" && o.collect) o.collectRub += o.dlv.rub;
    ss.forEach((s) => { s.sub = "ready"; s.issueId = o.id; s.fresh = false; });
    if (o.dlv) dlvSpread(o, ss);
    S.issues.push(o);
    notify(c.id, `${ss.length > 1 ? "Грузы " + o.shipIds.join(", ") + " готовы" : "Груз " + o.shipIds[0] + " готов"} к выдаче: ${WAY[way].low}${way === "tk" ? " " + o.tk : ""}${o.recv.addr && way !== "pickup" ? ", " + o.recv.addr : ""}.${o.dlv && o.dlv.payer === "client" && o.dlv.rub ? " " + dlvLabel(o) + " " + rub(o.dlv.rub) + " добавлена к стоимости." : ""}${o.collect ? " К оплате при выдаче " + rub(o.collectRub) + "." : ""}`, { t: "ship", id: o.shipIds[0] });
    logAdd("issuecmd", o.by, LT.issuecmd(o), issueIds(o), c.id);
    changed(); emit("issuecmd", o);
    return o;
  }
  // «Принят»: склад в Москве взял выдачу в работу, треки появляются в «Фотоотчёте»
  function issueAccept(id, by) {
    const o = issueOrder(id); if (!o || o.status !== "ready") return null;
    o.status = "issuing"; o.acceptedAt = Date.now(); o.acceptedBy = by || "sergey"; o.fresh = false;
    issueShips(o).forEach((s) => { if (s.status === "arrived") s.sub = "issuing"; });
    logAdd("issueacc", o.acceptedBy, LT.issueacc(o), issueIds(o), o.clientId);
    changed(); emit("issueacc", o);
    return o;
  }
  // отмена заказа на выдачу: невыданные треки возвращаются на хранение
  function issueCancel(id, by) {
    const o = issueOrder(id); if (!o || o.status === "done") return null;
    const ids = issueIds(o), back = issueShips(o).filter((s) => s.status === "arrived"), kept = issueShips(o).filter((s) => s.status === "done");
    back.forEach((s) => { s.sub = "store"; s.issueId = null; if (s.dlvRub || (s.exp && s.exp.dlv)) { s.dlvRub = 0; s.dlvUsd = 0; s.exp.dlv = 0; s.dlvWay = null; recost(s); } });
    if (kept.length) { o.shipIds = kept.map((s) => s.id); o.status = "done"; o.doneAt = Math.max(...kept.map((s) => s.doneAt)); o.doneBy = kept[kept.length - 1].doneBy; }
    else S.issues = S.issues.filter((x) => x.id !== id);
    logAdd("delete", by, `Отмена заказа на выдачу: ${o.id}, ${tracksWord(back.length)} снова на хранении`, ids, o.clientId);
    if (back.length) notify(o.clientId, `Выдача ${back.length > 1 ? "грузов " : "груза "}${back.map((s) => s.id).join(", ")} отложена, ${back.length > 1 ? "грузы остаются" : "груз остаётся"} на хранении.`, { t: "ship", id: back[0].id });
    changed(); emit("issuecancel", o);
    return o;
  }
  // зачесть оплату клиента по грузам: сначала выбранные, потом остальные от старых к новым
  function payApply(clientId, usd, first) {
    let rest = usd; const got = [], ids = first || [];
    S.ships.filter((s) => s.clientId === clientId && debtOf(s) > 0.005).sort((a, b) => (ids.includes(b.id) ? 1 : 0) - (ids.includes(a.id) ? 1 : 0) || a.sentAt - b.sentAt).forEach((s) => {
      if (rest <= 0.005) return;
      const x = Math.min(debtOf(s), rest); s.paidUsd = Math.round((s.paidUsd + x) * 100) / 100; rest -= x; got.push(s.id);
    });
    return got;
  }
  // «Получено»: склад в Москве взял с клиента оплату при выдаче. Сумма попадает во взаиморасчёты и гасит долг клиента
  function issueCollect(id, by) {
    const o = issueOrder(id), sum = o ? issueRest(o) : 0; if (!o || sum <= 0) return 0;
    const p = by || "sergey", usd = rubUsd(sum), now = Date.now();
    o.gotRub = (o.gotRub || 0) + sum; o.gotAt = now; o.gotBy = p;
    const got = payApply(o.clientId, usd, o.shipIds);
    S.payments.push({ id: S.seq.pay++, clientId: o.clientId, at: now, amount: sum, cur: "RUB", rate: CUR.RUB.rate, usd, by: p, shipIds: got, src: "issue" });
    wopPush({ kind: "client", cur: "RUB", amount: sum, orderId: o.id, clientId: o.clientId, by: p });
    notify(o.clientId, `Оплата получена при выдаче: ${rub(sum)}. ${money(o.clientId).debt > 0.5 ? "Остаток долга " + u.usd(money(o.clientId).debt) + "." : "Долга нет, спасибо!"}`, { t: "ship", id: o.shipIds[0] });
    logAdd("pay", p, LT.collect(o, sum), issueIds(o), o.clientId);
    changed(); emit("issuepaid", o);
    return sum;
  }
  // фотоотчёт по треку и «Готово»: груз выдан или передан в ТК и уходит в архив. Ни одно поле не обязательно
  function issueDone(shipId, d) {
    const s = ship(shipId), o = issueOf(s); if (!s || !o || s.status !== "arrived" || s.sub !== "issuing") return null;
    const p = d.by || "sergey", exp = {}, now = Date.now();
    if (o.dlv && d.dlvRub != null && String(d.dlvRub) !== "") setDlv(o.id, d.dlvRub, p, true);
    REPX.forEach(([k]) => { exp[k] = Math.max(0, Math.round(+(d.exp || {})[k] || 0)); });
    s.rep = { photos: (d.photos || []).slice(), damage: d.damage ? String(d.damage).trim().slice(0, 200) : "", exp, note: String(d.note || "").trim().slice(0, 200), waybill: o.way === "tk" ? String(d.waybill || "").trim().slice(0, 40) || "без номера" : "", at: now, by: p };
    s.status = "done"; s.sub = null; s.doneAt = now; s.doneBy = p; s.fresh = false;
    s.issue = o.way === "tk" ? { type: "tk", tk: o.tk || TK[0], waybill: s.rep.waybill, way: "tk" } : { type: "client", way: o.way };
    const x = repSum(s.rep);
    if (x) {
      wopPush({ kind: "issueexp", cur: "RUB", amount: -x, shipId: s.id, clientId: s.clientId, by: p });
      // расходы за счёт клиента прибавляются к стоимости груза: клиент видит их в кабинете
      if (o.payer === "client") { s.issueExpRub = x; s.issueExpUsd = Math.round(rubUsd(x)); recost(s); }
    }
    if (issueShips(o).every((y) => y.status === "done")) {
      o.status = "done"; o.doneAt = now; o.doneBy = p;
      // доставку оплатил склад в Москве за нас: расход во взаиморасчётах
      if (o.dlv && o.dlv.payer === "us" && o.dlv.wh && o.dlv.rub > 0) wopPush({ kind: "dlv", cur: "RUB", amount: -o.dlv.rub, orderId: o.id, clientId: o.clientId, by: p, note: o.way === "tk" ? o.tk : "" });
    }
    notify(s.clientId, (s.issue.type === "tk" ? `Груз ${s.id} передан в транспортную компанию ${s.issue.tk}, накладная ${s.issue.waybill}.` : `Груз ${s.id} выдан${o.way === "door" ? ": доставлен до двери" : ""}. Спасибо, что работаете с нами!`) + (x && o.payer === "client" ? ` Расходы при выдаче ${rub(x)} добавлены к стоимости.` : ""), { t: "ship", id: s.id });
    logAdd("issue", p, LT.issue(s), chainIds("ship", s).concat(o.id), s.clientId);
    changed(); emit("issued", s);
    return s;
  }
  // ---------- взаиморасчёты со складом в Москве: рубли и доллары, каждый баланс может быть в плюсе и в минусе ----------
  function wopPush(d) { const w = Object.assign({ id: S.seq.wop++, at: Date.now(), note: "" }, d); S.wops.push(w); return w; }
  // пополнение от компании или расход: за куб (объём × ставка), перевозчику за маршрут с растаможкой, прочий
  function wopAdd(d) {
    const kind = WOPK[d.kind] && d.kind !== "client" && d.kind !== "issueexp" && d.kind !== "dlv" ? d.kind : "other", cur = d.cur === "USD" ? "USD" : "RUB";
    const vol = kind === "cube" ? Math.max(0, +d.vol || 0) : 0, rate = kind === "cube" ? Math.max(0, +d.rate || 0) : 0, sum = Math.round((kind === "cube" ? vol * rate : Math.max(0, +d.amount || 0)) * 100) / 100;
    if (!(sum > 0)) return null;
    const w = wopPush({ kind, cur, amount: WOPK[kind][0] * sum, by: d.by || "sergey", note: String(d.note || "").trim().slice(0, 120) });
    if (kind === "cube") { w.vol = Math.round(vol * 100) / 100; w.rate = rate; }
    if (kind !== "topup" && ROUTES.includes(d.route)) w.route = d.route;
    if (kind !== "topup" && String(d.agent || "").trim()) w.agent = String(d.agent).trim().slice(0, 40);
    logAdd("wop", w.by, LT.wop(w), [], null);
    changed(); emit("wop", w);
    return w;
  }
  const wopBalance = () => S.wops.reduce((a, w) => { a[w.cur] += w.amount; return a; }, { RUB: 0, USD: 0 });
  // операции за период: сегодня, месяц (30 дней) или свои даты «с» и «по»
  function wopList(f) {
    f = f || {}; const now = Date.now();
    return S.wops.filter((w) => (f.per === "today" ? isToday(w.at) : f.per === "range" ? (!f.from || w.at >= f.from - 12 * 3600e3) && (!f.to || w.at <= f.to + 12 * 3600e3) : f.per === "all" ? true : now - w.at < 30 * u.DAY)).sort((a, b) => b.at - a.at);
  }
  const wopTotals = (list) => list.reduce((a, w) => { if (w.amount > 0) a.in[w.cur] += w.amount; else a.out[w.cur] -= w.amount; if (w.kind === "cube") a.vol += w.vol || 0; return a; }, { in: { RUB: 0, USD: 0 }, out: { RUB: 0, USD: 0 }, vol: 0 });
  // подпись операции: что это и к чему относится
  function wopText(w) {
    const t = WOPK[w.kind][1];
    if (w.kind === "cube") return { t, s: `${u.vol(w.vol)} × ${wamt(w.rate, w.cur)}${w.route ? " · маршрут " + w.route : ""}${w.agent ? " · " + w.agent : ""}${w.note ? " · " + w.note : ""}` };
    if (w.kind === "client") return { t, s: `${w.clientId} ${(client(w.clientId) || {}).name || ""} · заказ ${w.orderId}` };
    if (w.kind === "issueexp") return { t, s: `груз ${w.shipId} · ${w.clientId}` };
    if (w.kind === "dlv") return { t, s: `заказ ${w.orderId} · ${w.clientId}${w.note ? " · " + w.note : ""}` };
    return { t, s: [w.route ? "маршрут " + w.route : "", w.agent ? "агент " + w.agent : "", w.note].filter(Boolean).join(" · ") };
  }
  function setPaid(id, paid, by) {
    const s = ship(id); if (!s) return;
    if (paid && !isPaid(s)) {
      const rest = s.cost - s.paidUsd; s.paidUsd = s.cost;
      S.payments.push({ id: S.seq.pay++, clientId: s.clientId, at: Date.now(), amount: rest, cur: "USD", rate: 1, usd: rest, by: by || "ramil", shipId: s.id, shipIds: [s.id] });
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
  // доступы сотрудника: раздел, функция, каких клиентов видит (все, свои или выбранные) и отдельные клиенты
  const SCOPE_T = { all: "всех клиентов", own: "только своих клиентов: тех, где он указан менеджером", sel: "только выбранных клиентов" };
  function setAccess(staffId, kind, key, v) {
    const a = S.access[staffId], p = S.staff[staffId]; if (!a || !p) return;
    let t;
    if (kind === "scope") { if (a.scope === v) return; a.scope = SCOPE_T[v] ? v : "all"; t = `Доступ: ${p.ru}, видит ${SCOPE_T[a.scope]}`; }
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
    if (pr[3]) a.scope = pr[3];
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
    SECTIONS.forEach(([k]) => { S.access[id].sec[k] = false; }); FUNCS.forEach(([k]) => { S.access[id].fn[k] = FN_ON.includes(k); });
    logAdd("access", "ramil", `Сотрудник добавлен: ${name}, логин ${login}`, [], null);
    changed(); emit("staff", id);
    if (d.preset && PRESETS[d.preset]) applyPreset(id, d.preset);
    const a = S.access[id];
    if (d.sec) SECTIONS.forEach(([k]) => { a.sec[k] = !!d.sec[k]; });
    if (SCOPE_T[d.scope]) a.scope = d.scope;
    const list = (d.clients || []).filter((x) => client(x));
    if (a.scope === "sel") a.clients = list;
    // «свои клиенты»: сотрудник становится менеджером отмеченных клиентов
    if (a.scope === "own") list.forEach((x) => { client(x).salesId = id; });
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
  function setSales(clientId, salesId) { const c = client(clientId); if (c && c.salesId !== salesId) { c.salesId = salesId || null; logAdd("client", "ramil", salesId ? `Клиент ${c.id} закреплён за менеджером: ${who(salesId)}` : `Клиент ${c.id}: менеджер снят`, [], c.id); changed(); } }
  // карточка клиента: обязателен только код (буква и три цифры), остальное можно заполнить позже
  const clientCodeCheck = (v) => { const id = String(v || "").trim().toUpperCase(); return !id ? "Впишите код клиента" : !/^[A-ZА-ЯЁ]\d{3}$/.test(id) ? "Код: одна буква и три цифры, например D052" : client(id) ? `Код ${id} уже занят: ${client(id).name || "клиент без названия"}` : ""; };
  function saveClient(d, by) {
    const t = (v, n) => String(v == null ? "" : v).trim().slice(0, n || 60), isNew = !d.id || !client(d.id), id = isNew ? t(d.code).toUpperCase() : d.id;
    if (isNew && clientCodeCheck(id)) return null;
    const c = isNew ? { id, since: String(new Date().getFullYear()), tariff: { type: "kg", rate: 2.4 } } : client(id), r = d.recv || {}, way = WAY[r.way] ? r.way : "pickup";
    Object.assign(c, { name: t(d.name), person: t(d.person), phone: t(d.phone, 30), city: t(d.city, 40), birth: /^\d{4}-\d{2}-\d{2}$/.test(d.birth || "") ? d.birth : "", salesId: S.staff[d.salesId] ? d.salesId : null,
      recv: { name: t(r.name), phone: t(r.phone, 30), addr: t(r.addr, 160), way, tk: way === "tk" ? t(r.tk, 40) || TK[0] : "" } });
    if (isNew) S.clients.push(c);
    logAdd("client", by, `${isNew ? "Клиент добавлен" : "Карточка клиента изменена"}: ${c.id}${c.name ? " " + c.name : ""}${c.salesId ? ", менеджер " + who(c.salesId) : ""}`, [], c.id);
    changed(); emit("client", c);
    return c;
  }
  function readNotes() { let ch = false; S.notes.forEach((n) => { if (n.clientId === ME && !n.read) { n.read = true; ch = true; } }); if (ch) save(); }
  function setTg(v) { S.tg = v; changed(); }

  // ---------- деньги ----------
  // оплата от клиента: одна оплата может закрыть несколько грузов (d.shipIds), в истории видно, за какие
  function pay(clientId, d) {
    const rate = d.cur === "USD" ? 1 : d.rate, usd = Math.round((d.amount / rate) * 100) / 100;
    const got = payApply(clientId, usd, d.shipIds || []);
    const p = { id: S.seq.pay++, clientId, at: Date.now(), amount: d.amount, cur: d.cur, rate, usd, by: d.by || "ramil", shipIds: got };
    S.payments.push(p);
    const amt = d.cur === "USD" ? u.usd(d.amount) : u.groups(Math.round(d.amount)) + " " + CUR[d.cur].s + " = " + u.usd(usd), forT = got.length ? `, за ${got.length > 1 ? "грузы" : "груз"} ${got.join(", ")}` : "";
    notify(clientId, `Оплата получена: ${amt}${forT}. ${money(clientId).debt > 0.5 ? "Остаток долга " + u.usd(money(clientId).debt) + "." : "Долга нет, спасибо!"}`, null);
    logAdd("pay", p.by, `Оплата: клиент ${clientId}, ${amt}${forT}`, got, clientId);
    changed(); emit("paid", p);
    return p;
  }
  function setExp(id, exp) { const s = ship(id); if (s) { s.exp = { pack: Math.max(0, Math.round(exp.pack)), carrier: Math.max(0, Math.round(exp.carrier)), other: Math.max(0, Math.round(exp.other)), dlv: s.exp.dlv || 0 }; if (s.exp.carrier !== Math.round(s.agentUsd)) { s.agentUsd = s.exp.carrier; s.agentManual = true; } changed(); } }
  const expSum = (s) => s.exp.pack + s.exp.carrier + s.exp.other + (s.exp.dlv || 0);

  // ---------- версия 3.2: деньги по треку, просрочки, оплаты агентам, справочники ----------
  const OVER_C = 14, OVER_A = 30;
  const ageDays = (s) => Math.max(0, Math.floor((Date.now() - s.sentAt) / u.DAY));
  // долг клиента по треку дольше 14 дней с отправки
  const overC = (s) => debtOf(s) > 0.5 && ageDays(s) > OVER_C;
  const agentDebt = (s) => Math.max(0, r2((s.agentUsd || 0) - (s.agentPaid || 0)));
  const agentIsPaid = (s) => (s.agentUsd || 0) > 0 && agentDebt(s) < 0.5;
  // долг агенту по треку дольше 30 дней с отправки
  const overA = (s) => agentDebt(s) >= 0.5 && ageDays(s) > OVER_A;
  function agentStats(route) {
    const list = S.ships.filter((s) => (!route || s.route === route) && s.agentUsd > 0);
    const charged = r2(list.reduce((a, s) => a + s.agentUsd, 0)), paid = r2(list.reduce((a, s) => a + Math.min(s.agentUsd, s.agentPaid || 0), 0));
    return { charged, paid, debt: Math.max(0, r2(charged - paid)), n: list.length, open: list.filter((s) => agentDebt(s) >= 0.5).length, over: list.filter(overA).length };
  }
  // правка денег в карточке груза: каждая изменённая сумма пишется в историю действий
  const MONEYK = [["deliv", "доставка клиенту"], ["packUsd", "упаковка"], ["insUsd", "страховка"], ["value", "стоимость груза"], ["doorUsd", "расходы в Китае"], ["agentUsd", "сумма агенту"], ["expPack", "наши расходы на упаковку"], ["expOther", "прочие расходы"]];
  // доставка клиенту считается тремя способами: по тарифу клиента, своей ставкой ($ за м³ или за кг) или суммой
  const DMODE_T = { tariff: "по тарифу клиента", rate: "своя ставка", sum: "суммой" };
  const delivCalc = (s, mode, rate, basis) => { const t = totals(s); return mode === "tariff" ? tariffCalc(client(s.clientId), t.weight, t.volume) : mode === "rate" ? Math.round((basis === "kg" ? t.weight : t.volume) * Math.max(0, +rate || 0)) : null; };
  const delivText = (s) => (s.dmode === "rate" ? `своя ставка ${u.num(s.drate, s.drate % 1 ? 2 : 0)} $ ${BASIS_T[s.dbasis === "kg" ? "kg" : "m3"]}` : s.dmode === "sum" ? "сумма вписана вручную" : (client(s.clientId) ? "по тарифу: " + tariffLabel(client(s.clientId)) : "по тарифу клиента"));
  // сумма агенту тоже тремя способами: по ставке агента из настроек, своей ставкой ($ за кг или за м³) или суммой
  const AMODE_T = { agent: "по ставке агента", rate: "своя ставка", sum: "суммой" };
  const agentByMode = (s, mode, rate, basis) => { const t = totals(s); return mode === "agent" ? agentCalc(s.route, t.weight, t.volume) : mode === "rate" ? Math.round((basis === "m3" ? t.volume : t.weight) * Math.max(0, +rate || 0)) : null; };
  const agentModeText = (s) => (s.amode === "rate" ? `своя ставка ${u.num(s.arate, s.arate % 1 ? 2 : 0)} $ ${BASIS_T[s.abasis === "m3" ? "m3" : "kg"]}` : s.amode === "sum" || (!s.amode && s.agentManual) ? "сумма вписана вручную" : "по ставке агента");
  // цена, по которой посчитана сумма агенту по треку: ставка агента с растаможкой, своя ставка груза или сумма вручную
  function agentPrice(s) {
    const n = (v) => u.num(v, v % 1 ? 2 : 0);
    if (s.amode === "rate") return { t: `${n(s.arate)} $ ${BASIS_T[s.abasis === "m3" ? "m3" : "kg"]}`, mark: "своя" };
    if (s.amode === "sum" || (!s.amode && s.agentManual)) return { t: "вручную", mark: "вручную" };
    const a = agentOf(s.route); if (!a) return { t: "агент не найден", mark: "" };
    return { t: `${n(a.rate)} $ ${BASIS_T[a.basis]}${a.customs ? " + " + u.num(a.customs, 2) + " $ за кг" : ""}`, mark: "" };
  }
  function setMoney(id, d, by) {
    const s = ship(id); if (!s) return null;
    const ch = [], was = s.cost, cur = (k) => (k === "expPack" ? s.exp.pack : k === "expOther" ? s.exp.other : s[k] || 0);
    // способ расчёта доставки: «было, стало» в историю, сумма доставки считается сама (кроме «суммой»)
    if (d.dmode && DMODE_T[d.dmode]) {
      const before = delivText(s), m0 = s.dmode || "tariff", r0 = s.drate || 0, b0 = s.dbasis || "m3";
      const nm = d.dmode, nr = nm === "rate" ? Math.max(0, r2(+d.drate || 0)) : 0, nb = nm === "rate" ? (d.dbasis === "kg" ? "kg" : "m3") : "m3";
      if (nm !== m0 || (nm === "rate" && (Math.abs(nr - r0) >= 0.005 || nb !== b0))) { s.dmode = nm; s.drate = nr; s.dbasis = nb; ch.push(`доставка: было ${before}, стало ${delivText(s)}`); }
      const v = delivCalc(s, nm, nr, nb); if (v != null) d.deliv = v;
    }
    if (d.amode && AMODE_T[d.amode]) {
      const before = agentModeText(s), m0 = s.amode || (s.agentManual ? "sum" : "agent"), r0 = s.arate || 0, b0 = s.abasis || "kg";
      const nm = d.amode, nr = nm === "rate" ? Math.max(0, r2(+d.arate || 0)) : 0, nb = nm === "rate" ? (d.abasis === "m3" ? "m3" : "kg") : "kg";
      if (nm !== m0 || (nm === "rate" && (Math.abs(nr - r0) >= 0.005 || nb !== b0))) { s.amode = nm; s.arate = nr; s.abasis = nb; ch.push(`сумма агенту: было ${before}, стало ${agentModeText(s)}`); }
      const v = agentByMode(s, nm, nr, nb); if (v != null) d.agentUsd = v;
    }
    MONEYK.forEach(([k, t]) => {
      if (k === "deliv" && s.dmode && s.dmode !== "sum" && d.dmode == null) return; // доставка по тарифу или ставке не правится суммой
      if (d[k] == null || d[k] === "" || isNaN(+d[k])) return;
      const v = k === "value" ? Math.max(0, Math.round(+d[k])) : Math.max(0, r2(+d[k])), old = cur(k);
      if (Math.abs(v - old) < 0.005) return;
      ch.push(`${t} было ${u.usd(old)}, стало ${u.usd(v)}`);
      if (k === "expPack") { s.exp.pack = Math.round(v); s.expPackManual = true; } else if (k === "expOther") s.exp.other = Math.round(v); else s[k] = v;
      if (k === "agentUsd") { s.agentManual = (s.amode || "sum") !== "agent"; s.exp.carrier = Math.round(v); }
    });
    if (d.amode === "agent") { s.agentManual = false; s.exp.carrier = Math.round(s.agentUsd); }
    if (!ch.length) return s;
    s.insManual = Math.round(s.insUsd) !== insCalc(s.value);
    recost(s);
    logAdd("money", by, `Деньги по грузу ${s.id}: ${ch.join("; ")}`, chainIds("ship", s), s.clientId);
    if (Math.abs(s.cost - was) >= 0.5) notify(s.clientId, `Стоимость груза ${s.id} изменена: ${u.usd(s.cost)} вместо ${u.usd(was)}.${debtOf(s) > 0.5 ? " К оплате " + u.usd(debtOf(s)) + "." : ""}`, { t: "ship", id: s.id });
    changed(); emit("money", s);
    return s;
  }
  // оплата агенту за один или несколько треков одного маршрута: сначала закрываются выбранные треки по порядку
  function agentPay(route, shipIds, d) {
    const a = agentOf(route), list = shipIds.map(ship).filter((s) => s && s.route === route && agentDebt(s) >= 0.005); if (!a || !list.length) return null;
    const due = r2(list.reduce((x, s) => x + agentDebt(s), 0)), amount = +d.amount > 0 ? r2(+d.amount) : due;
    let rest = amount; const got = [];
    list.forEach((s) => { if (rest <= 0.005) return; const x = Math.min(agentDebt(s), rest); s.agentPaid = r2((s.agentPaid || 0) + x); rest -= x; got.push(s.id); });
    const p = { id: S.seq.apay++, route, at: d.at || Date.now(), amount, shipIds: got, method: String(d.method || "Перевод").slice(0, 30), note: String(d.note || "").trim().slice(0, 120), by: d.by || "ramil" };
    S.apays.push(p);
    logAdd("apay", p.by, LT.apay(p, a), got.reduce((x, id) => x.concat(chainIds("ship", ship(id))), []), null);
    changed(); emit("agentpaid", p);
    return p;
  }
  // сверка с агентом за период: долг на начало, начислено за треки, оплачено, долг на конец
  function agentRecon(route, from, to) {
    const t0 = from || 0, t1 = to || Date.now(), a = agentOf(route);
    const all = S.ships.filter((s) => s.route === route && s.agentUsd > 0).map((s) => { const t = totals(s); return { at: s.sentAt, t: `Трек ${s.id}, ${s.clientId}, ${u.kg(t.weight)}, ${u.vol(t.volume)}`, price: agentPrice(s).t + (agentPrice(s).mark === "своя" ? ", своя" : ""), ch: s.agentUsd, pay: 0, id: s.id }; })
      .concat(S.apays.filter((p) => p.route === route).map((p) => ({ at: p.at, t: `Оплата: ${String(p.method).toLowerCase()}, ${tracksWord(p.shipIds.length)}${p.note ? ", " + p.note : ""}`, ch: 0, pay: p.amount }))).sort((x, y) => x.at - y.at);
    const open = r2(all.filter((o) => o.at < t0 - 12 * 3600e3).reduce((x, o) => x + o.ch - o.pay, 0));
    const ops = all.filter((o) => o.at >= t0 - 12 * 3600e3 && o.at <= t1 + 12 * 3600e3);
    let bal = open; ops.forEach((o) => { bal = r2(bal + o.ch - o.pay); o.bal = bal; });
    return { agent: a, open, ops, ch: r2(ops.reduce((x, o) => x + o.ch, 0)), pay: r2(ops.reduce((x, o) => x + o.pay, 0)), close: bal };
  }
  // ---------- справочники: изменения сразу влияют на расчёты новых отправок и пишутся в историю ----------
  const dirLog = (by, t) => logAdd("dir", by || "ramil", "Настройки: " + t, [], null);
  const agentText = (a) => `${u.num(a.rate, a.basis === "m3" ? 0 : 2)} $ ${BASIS_T[a.basis]}${a.customs ? ", растаможка " + u.num(a.customs, 2) + " $ за кг" : ""}${a.days ? ", " + a.days + " " + u.plural(a.days, "день", "дня", "дней") + " в пути" : ""}`;
  // этапы пути агента одной строкой: «на границе через 4 дня, таможенное оформление через 14 дней»
  const stagesText = (a) => (a.stages || []).map((x) => x.name.charAt(0).toLowerCase() + x.name.slice(1) + " через " + u.num(x.day, x.day % 1 ? 1 : 0) + " " + u.plural(Math.ceil(x.day), "день", "дня", "дней")).join(", ");
  // настройка «Клиент видит маршрут»
  function routeSave(v, by) { v = !!v; if (S.dir.clientRoute === v) return false; S.dir.clientRoute = v; dirLog(by, `клиент ${v ? "видит" : "не видит"} маршрут в своём кабинете`); changed(); emit("dir", "route"); return true; }
  function agentCheck(route, isNew) {
    const r = String(route || "").trim().toUpperCase();
    if (!r) return "Впишите маршрут, например 92G";
    if (!/^[A-Z0-9-]{1,8}$/.test(r)) return "Маршрут: латинские буквы и цифры, до 8 знаков";
    if (isNew && agentOf(r)) return `Маршрут ${r} уже есть: ${agentOf(r).name}`;
    return "";
  }
  function agentSave(d, by) {
    const isNew = !d.id, route = isNew ? String(d.route || "").trim().toUpperCase() : d.id;
    if (agentCheck(route, isNew)) return null;
    const a = isNew ? { route } : agentOf(route); if (!a) return null;
    Object.assign(a, { name: String(d.name || "").trim().slice(0, 40) || "Агент " + route, basis: d.basis === "m3" ? "m3" : "kg", rate: Math.max(0, r2(+d.rate || 0)), customs: Math.max(0, r2(+d.customs || 0)), days: Math.max(0, Math.round(+d.days || 0)), contact: String(d.contact || "").trim().slice(0, 40) });
    // версия 3.3: этапы пути (название, через сколько дней после отправки), разброс даты прибытия ± дней, прирост шкалы в день
    if (d.stages) a.stages = d.stages.map((x) => ({ name: String(x.name || "").trim().slice(0, 40), day: Math.max(0, r2(+x.day || 0)) })).filter((x) => x.name && x.day > 0).sort((x, y) => x.day - y.day).slice(0, 8);
    if (d.spread != null) a.spread = Math.max(0, Math.min(30, Math.round(+d.spread || 0)));
    if (d.grow != null) a.grow = Math.max(0, Math.min(10, r2(+d.grow || 0)));
    if (!a.stages) a.stages = [];
    if (isNew) S.dir.agents.push(a);
    applyDir(S.dir);
    dirLog(by, `${isNew ? "агент добавлен" : "агент изменён"}: ${a.route} ${a.name}, ${agentText(a)}${a.stages.length ? ", этапы: " + stagesText(a) : ""}, дата ± ${a.spread || 0} дн., шкала +${u.num(a.grow || 0, (a.grow || 0) % 1 ? 1 : 0)}% в день`);
    changed(); emit("dir", "agents");
    return a;
  }
  function packSave(prices, by) {
    const ch = [];
    PACK.forEach((k) => { const v = Math.max(0, r2(+prices[k] || 0)); if (prices[k] != null && prices[k] !== "" && Math.abs(v - S.dir.pack[k]) >= 0.005) { ch.push(`${PACK_RU[k]} ${u.num(v, 2)} $ за место`); S.dir.pack[k] = v; } });
    if (ch.length) { dirLog(by, "цены упаковки для клиента: " + ch.join(", ")); changed(); emit("dir", "pack"); }
    return ch.length;
  }
  // «Склады в Китае»: наша цена упаковки в юанях, общая (whId "all") или своя у склада; расходы по грузам пересчитываются
  function chwPriceSave(whId, prices, by) {
    const all = !whId || whId === "all", ch = [];
    if (!all) S.dir.whPack[whId] = S.dir.whPack[whId] || {};
    PACK.forEach((k) => {
      if (prices[k] == null || prices[k] === "" || isNaN(+prices[k])) return;
      const v = Math.max(0, r2(+prices[k])), was = all ? S.dir.packCny[k] || 0 : packCnyOf(whId, k);
      if (Math.abs(v - was) < 0.005) return;
      if (all) S.dir.packCny[k] = v; else S.dir.whPack[whId][k] = v;
      ch.push(`${PACK_RU[k]} ${u.num(v, v % 1 ? 2 : 0)} ¥ (было ${u.num(was, was % 1 ? 2 : 0)} ¥)`);
    });
    if (!ch.length) return 0;
    S.ships.forEach((s) => { if (s.expPackManual) return; const c = cargo(s.id); if (c && (all || c.wh === whId)) s.exp.pack = packExpUsd(c); });
    dirLog(by, `наша цена упаковки, ${all ? "все склады в Китае" : "склад " + wh(whId).ru}: ${ch.join(", ")}`);
    changed(); emit("dir", "packCny"); return ch.length;
  }
  function insSave(pct, by) {
    const v = Math.max(0, Math.min(100, r2(+pct || 0))); if (Math.abs(v - S.dir.insPct) < 0.005) return false;
    S.dir.insPct = v; dirLog(by, `страховка ${u.num(v, v % 1 ? 1 : 0)}% от стоимости груза`); changed(); emit("dir", "ins"); return true;
  }
  function whSave(d, by) {
    const isNew = !d.id, w = isNew ? { id: "w" + S.seq.wh++ } : S.dir.whs.find((x) => x.id === d.id); if (!w) return null;
    Object.assign(w, { ru: String(d.ru || "").trim().slice(0, 30) || "Новый склад", zh: String(d.zh || "").trim().slice(0, 30), city: String(d.city || "").trim().slice(0, 60), addrRu: String(d.addrRu || "").trim().slice(0, 160), addr: String(d.addr || "").trim().slice(0, 160) });
    if (isNew) S.dir.whs.push(w);
    dirLog(by, `${isNew ? "склад в Китае добавлен" : "склад в Китае изменён"}: ${w.ru}${w.city ? ", " + w.city : ""}`);
    changed(); emit("dir", "whs"); return w;
  }
  function tkSave(d, by) {
    const name = String(d.name || "").trim().slice(0, 40); if (!name) return null;
    const i = d.i == null || d.i === "" ? -1 : +d.i, old = i >= 0 ? S.dir.tks[i] : null;
    if (S.dir.tks.some((t, j) => j !== i && t.name.toLowerCase() === name.toLowerCase())) return null;
    const t = old || {}; Object.assign(t, { name, contact: String(d.contact || "").trim().slice(0, 40), note: String(d.note || "").trim().slice(0, 80) });
    if (!old) S.dir.tks.push(t);
    applyDir(S.dir);
    dirLog(by, `${old ? "транспортная компания изменена" : "транспортная компания добавлена"}: ${name}`);
    changed(); emit("dir", "tks"); return t;
  }
  // r = {RUB: {markup, manual}, ...}: надбавка к курсу ЦБ в процентах и ручной курс (пусто или 0: по ЦБ). У USDT только ручной курс
  function ratesSave(r, by) {
    const ch = [];
    RATE_K.forEach((k) => {
      const x = S.dir.rates.items[k], d = r[k]; if (!x || !d) return;
      const was = rateOf(x), mk = x.cb ? Math.max(-50, Math.min(100, r2(+d.markup || 0))) : 0, mn = r2(+d.manual || 0) > 0 ? r2(+d.manual) : x.cb ? null : x.manual;
      if (mk === (x.markup || 0) && mn === x.manual) return;
      x.markup = mk; x.manual = mn;
      ch.push(`${CUR[k].t.toLowerCase()} ${u.num(rateOf(x), 2)} ${CUR[k].s}${x.manual ? " вручную" : ", ЦБ" + (x.markup ? " + " + u.num(x.markup, x.markup % 1 ? 1 : 0) + "%" : "")}${Math.abs(rateOf(x) - was) >= 0.005 ? " (было " + u.num(was, 2) + ")" : ""}`);
    });
    if (!ch.length) return 0;
    S.dir.rates.at = Date.now(); S.dir.rates.by = by || "ramil"; applyDir(S.dir);
    dirLog(by, "курсы валют: " + ch.join("; ")); changed(); emit("dir", "rates"); return ch.length;
  }
  // «Вернуть курс ЦБ»: ручной курс снимается, действует курс ЦБ с надбавкой
  function rateCb(k, by) {
    const x = S.dir.rates.items[k]; if (!x || !x.cb || !(x.manual > 0)) return false;
    x.manual = null; S.dir.rates.at = Date.now(); S.dir.rates.by = by || "ramil"; applyDir(S.dir);
    dirLog(by, `курс ${CUR[k].t.toLowerCase()}: возвращён курс ЦБ, ${u.num(rateOf(x), 2)} ${CUR[k].s} за 1 $`); changed(); emit("dir", "rates"); return true;
  }
  // ---------- версия 3.3: новости и рассылки ----------
  // новость: заголовок, текст, картинка по желанию, кому (все клиенты или выбранные), сейчас или отложенно.
  // Публикация приходит каждому получателю уведомлением; у новости видно, сколько клиентов прочитали
  const NEWS_K = { greet: "Поздравление", info: "Объявление", important: "Важно" };
  const newsTo = (n) => (n.to === "sel" ? n.clients.filter((id) => client(id)) : S.clients.map((c) => c.id));
  const newsFor = (cid) => S.news.filter((n) => n.status === "sent" && newsTo(n).includes(cid)).sort((a, b) => b.at - a.at);
  const newsUnread = (cid) => newsFor(cid).filter((n) => !n.reads[cid]).length;
  const newsReadN = (n) => newsTo(n).filter((id) => n.reads[id]).length;
  const newsWho = (n) => (n.to === "sel" ? `выбранные клиенты (${newsTo(n).length}): ${newsTo(n).join(", ")}` : `все клиенты (${newsTo(n).length})`);
  function newsPub(n, by) {
    n.status = "sent"; n.at = Date.now(); n.pubBy = by || n.by;
    newsTo(n).forEach((cid) => notify(cid, `${NEWS_K[n.kind] || "Новость"}: ${n.title}`, { t: "news", id: n.id }));
    logAdd("news", by || n.by, `Новость опубликована: «${n.title}», ${newsWho(n)}`, [], null);
  }
  function newsAdd(d, by) {
    const title = String(d.title || "").trim().slice(0, 80), text = String(d.text || "").trim().slice(0, 1200); if (!title || !text) return null;
    const clients = (d.clients || []).filter((id) => client(id)); if (d.to === "sel" && !clients.length) return null;
    const n = { id: S.seq.news++, kind: NEWS_K[d.kind] ? d.kind : "info", title, text, img: d.img && d.img.kind ? { p: +d.img.p || 0, kind: d.img.kind } : null, to: d.to === "sel" ? "sel" : "all", clients: d.to === "sel" ? clients : [], status: "sched", at: +d.at || Date.now(), by: by || "ramil", reads: {} };
    S.news.push(n);
    if (d.when === "later" && n.at > Date.now() + 60e3) logAdd("news", n.by, `Новость запланирована на ${u.dLong(n.at)} ${u.hm(n.at)}: «${n.title}», ${newsWho(n)}`, [], null);
    else newsPub(n, by);
    changed(); emit("news", n);
    return n;
  }
  function newsPublish(id, by) { const n = S.news.find((x) => x.id === +id); if (!n || n.status !== "sched") return null; newsPub(n, by); changed(); emit("news", n); return n; }
  // отложенные новости публикуются сами, когда подошло время
  function newsTick() { let ch = false; S.news.forEach((n) => { if (n.status === "sched" && n.at <= Date.now()) { newsPub(n, n.by); ch = true; } }); if (ch) changed(); return ch; }
  function newsRead(id, cid) { const n = S.news.find((x) => x.id === +id); if (!n || n.reads[cid]) return; n.reads[cid] = Date.now(); changed(); }

  function setTariff(clientId, t) { const c = client(clientId); if (c) { c.tariff = t.type === "density" ? { type: "density" } : { type: t.type, rate: t.rate }; changed(); } }

  load();
  App.store = {
    get S() { return S; }, get STAFF() { return S.staff; }, ME, KEY, UIKEY, WH, PACK, PACK_RU, ROUTES, DEST, TRANSPORT, TK, CUR, WH_STAFF, SECTIONS, FUNCS, PRESETS, DENS, TARIFF_T, SUB, WAY, REPX, WOPK, WCUR,
    on, emit, save, reset, who, wh, client, rec, task, cargo, ship, left, waiting, unknown, openTasks, ready, shipsOfCargo, taskPlaces, nextTT, ttNorm, ttCheck, ttAutoFor, setTT, totals, chainIds, isPaid, debtOf, money, findClient, expectedByTrack, noteText, doorOpen, cnyUsd,
    packsSum, packsText, dimsVolume, dimsPlaces, tariffCalc, tariffLabel, addExpected, removeExpected, accept, assignUnknown, organize, collect, pack, send, editShip, removeRec, cancelTask, arrive, setPaid, addDoc, setAccess, applyPreset, createStaff, loginCheck, hidden, setHide, setSales, readNotes, setTg,
    arrived, issueOrder, issueOf, openIssues, issueShips, issueDue, issueRest, sumShips, arrivedToday, storeDays, debtRub, issueStory, issueCreate, issueAccept, issueCancel, issueCollect, issueDone, repSum, rub, wamt, tracksWord, partsWord, rubUsd,
    wopAdd, wopBalance, wopList, wopTotals, wopText, clientCodeCheck, saveClient, pay, setExp, expSum, setTariff,
    MONEY_SECS, BASIS_T, RATE_K, OVER_C, OVER_A, agentOf, agentCalc, packCost, insCalc, etaDays, recost, ageDays, overC, overA, agentDebt, agentIsPaid, agentStats, MONEYK, setMoney, agentPay, agentRecon,
    agentText, agentCheck, agentSave, packSave, insSave, whSave, tkSave, ratesSave, rateCb, rateOf, rateSrc, r2,
    agentPrice, AMODE_T, agentByMode, agentModeText, dlvLabel, dlvText, setDlv, issueText, packCnyOf, packExpCny, packExpUsd, chwPriceSave, trip, rangeText, clientRoute, cText, stagesText, routeSave, SENT_T, TRIP_CEIL, DMODE_T, delivCalc, delivText, NEWS_K, newsTo, newsFor, newsUnread, newsReadN, newsWho, newsAdd, newsPublish, newsTick, newsRead,
  };
})(window.App);
