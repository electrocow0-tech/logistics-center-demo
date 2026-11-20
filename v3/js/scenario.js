/* Сценарий: ведёт по пути груза от трек-номера клиента до выдачи, потом показывает сотрудников и историю действий.
   Затемняет экран, подсвечивает нужный элемент и показывает рядом подсказку «что сделать сейчас».
   Сам переключает четыре вкладки: «Администратор», «Склад в Китае», «Склад в Москве», «Клиент». Из сценария можно выйти в любой момент. */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, I = u.icon, E = u.esc;
  const $ = (id) => document.getElementById(id);
  const sc = () => App.ui.scn;
  // элемент считается найденным, только если он есть на экране
  const qv = (sel) => { const el = document.querySelector(sel); return el && el.getClientRects().length ? el : null; };
  const TAB_T = { admin: "Администратор", wh: "Склад в Китае", msk: "Склад в Москве", client: "Клиент" };
  const slotOf = (role) => App.slotFor(role);
  const modeOf = (role) => (role === "client" ? "client" : role === "msk" ? "msk" : "wh");
  const ps = (role, sel) => `#ps${slotOf(role)} ${sel}`;
  const tabSel = (m) => `#${App.isMobile() ? "msRoles" : "modeSeg"} [data-mode="${m}"]`;
  function goPhone(role, screen, p) { App.closeDesk(); App.setMode(modeOf(role)); App.go.phone(slotOf(role), screen, p); }
  function goDesk(screen, p) { App.closeSheet(); App.ui.viewAs = null; App.setMode("admin"); App.go.desk(screen, p); }
  // общие проверки: вкладка и экран
  function needPhone(role, screens, tab, tabName) {
    const m = modeOf(role);
    if (App.ui.mode !== m) return { sel: tabSel(m), tip: `Откройте вкладку «${TAB_T[m]}».`, side: "b" };
    const i = slotOf(role), s = App.ui.slots[i];
    if (!screens.includes(s.screen)) return { sel: `#ps${i} [data-tab="${tab}"]`, tip: `Откройте вкладку «${tabName}».` };
    return null;
  }
  function needDesk(screen, navName) {
    if (App.ui.mode !== "admin") return { sel: tabSel("admin"), tip: "Откройте вкладку «Администратор».", side: "b" };
    if (App.ui.viewAs) return { sel: "#btnViewBack", tip: "Вернитесь к администратору.", side: "b" };
    if (App.ui.desk !== screen) return { sel: `[data-nav="${screen}"]`, tip: `Откройте раздел «${navName}».` };
    return null;
  }
  const closeTip = () => ({ sel: "#modal .x", tip: "Закройте это окно." });
  const cardOf = (id) => App.modalOpen() && App.tmp.mk === "card" && App.tmp.card && App.tmp.card.id === id;
  const other = () => st.waiting("yiwu").find((x) => x.clientId === st.ME && x.id !== sc().recId);

  // Каждый шаг: что показать (go) и подсказка для текущего состояния (hint → {sel, tip, act, actLabel, slot, data})
  const STEPS = [
    { k: "track", who: ["user", "Клиент"], t: "Клиент вносит трек-номер заказа",
      p: "Клиент заказал товар у поставщика в Китае и получил трек-номер доставки до склада. Он заранее вносит его в приложении.",
      go: () => goPhone("client", "await"),
      hint: () => {
        const n = needPhone("client", ["await"], "await", "Жду"); if (n) return n;
        const d = App.tmp.aw || { track: "" };
        if (d.track.replace(/\s/g, "").length < 6) return { sel: ps("client", '[data-hl="aw-track"]'), tip: "Это телефон клиента. Введите трек-номер китайской доставки, который прислал поставщик.", act: "awFill", actLabel: "Заполнить за меня", slot: 1 };
        return { sel: ps("client", '[data-hl="aw-go"]'), tip: "Можно дописать поставщика и что внутри. Нажмите «Добавить»: склад увидит трек заранее." };
      } },
    { k: "accept", who: ["scan", "Склад в Китае"], t: "Склад сканирует трек и принимает груз",
      p: "Коробка приехала на склад в Иу. Кладовщик сканирует трек камерой телефона, клиент находится сам. Ни одно поле не обязательно: пустое поле не блокирует приёмку.",
      go: () => { App.ui.slots[0].wh = "yiwu"; goPhone("warehouse", "accept"); },
      hint: () => {
        const n = needPhone("warehouse", ["accept"], "accept", "Приёмка"); if (n) return n;
        const d = App.tmp.acc || { track: "", photos: [], places: 1, dpay: null, deliv: "" };
        if (document.querySelector("#ps0 .scan.show")) return null;
        const fill = { act: "accFill", actLabel: "Заполнить за меня", slot: 0 };
        if (!d.track) return { sel: ps("warehouse", '[data-hl="acc-scan"]'), tip: "Это телефон кладовщика. Нажмите «Сканировать трек»: камера прочитает штрих-код с коробки, отдельный сканер не нужен. Интерфейс переключается на китайский кнопкой 中文." };
        if (!d.clientId) return Object.assign({ sel: ps("warehouse", '[data-hl="acc-client"]'), tip: "Этого трека в системе нет. Начните вводить код или название клиента: появятся подсказки." }, fill);
        if (!d.photos.length) return Object.assign({ sel: ps("warehouse", '[data-hl="acc-cam"]'), tip: "Код клиента подставился сам: клиент заранее внёс этот трек. Сфотографируйте груз, фото сразу увидит клиент." }, fill);
        if (d.places < 2) return Object.assign({ sel: ps("warehouse", '[data-hl="acc-places"]'), tip: "Укажите, сколько мест пришло. Например, 8." }, fill);
        if (!d.dpay) return Object.assign({ sel: ps("warehouse", '[data-hl="acc-door"]'), tip: "Доставка до склада: отметьте, кто заплатил курьеру за доставку по Китаю." }, fill);
        if (d.dpay === "wh" && !(u.parse(d.deliv) > 0)) return Object.assign({ sel: ps("warehouse", '[data-hl="acc-door-sum"]'), tip: "Сколько юаней склад заплатил курьеру. Эту сумму потом увидят администратор и клиент." }, fill);
        return { sel: ps("warehouse", '[data-hl="acc-go"]'), tip: "Нажмите «Принять». Без кода клиента груз ушёл бы в «Неизвестные», и администратор привязал бы его позже." };
      } },
    { k: "client", who: ["user", "Клиент"], t: "Клиент сразу видит свой груз",
      p: "Клиенту пришло уведомление: груз принят, фото со склада уже в приложении. На вкладке «Клиент» появилась отметка.",
      go: () => goPhone("client", "ships"),
      hint: () => {
        const n = needPhone("client", ["ships"], "ships", "Грузы"); if (n) return n;
        return { sel: ps("client", `[data-ci="rec:${sc().recId}"]`), tip: "Клиенту пришло уведомление. Новый груз уже в списке, с фото со склада. Откройте его." };
      } },
    { k: "org", who: ["layers", "Администратор"], t: "Администратор организует упаковку",
      p: "На странице «Грузы» слева коды клиентов, справа все грузы клиента на складе. Администратор отмечает нужные и организует упаковку: в этот момент присваивается наш трек-номер, автоматический или свой.",
      go: () => { App.tmp.wtab = "stock"; App.tmp.wq = ""; App.tmp.wsort = "new"; goDesk("work"); },
      hint: () => {
        const n = needDesk("work", "Грузы"); if (n) return n;
        const id = sc().recId, o = other();
        if (App.modalOpen()) {
          if (App.tmp.mk !== "org") return closeTip();
          if (!(App.tmp.org || {}).picked) return { sel: '#modal [data-hl="org-pack"]', tip: "Наш трек-номер подставлен сам, он вверху окна. Его можно стереть и вписать свой. Выберите вид упаковки, например обрешётку: груз хрупкий.", act: "orgFill", actLabel: "Заполнить за меня" };
          if (st.ttCheck((App.tmp.org || {}).tt)) return { sel: '#modal [data-hl="org-tt"]', tip: "Такой трек-номер не подойдёт: причина написана под полем. Впишите другой или верните автоматический.", act: "ttAuto", actLabel: "Подставить автоматически", data: { k: "org" } };
          return { sel: "#btnOrgGo", tip: "Нажмите «Готово»: склад в Иу получит задачу, клиент узнает свой трек-номер. Номер можно вписать свой, а позже исправить в карточке груза." };
        }
        if (App.tmp.wtab !== "stock") return { sel: '[data-wtab="stock"]', tip: "Откройте вкладку «На складе»." };
        if (App.tmp.wcode !== st.ME) return { sel: `[data-wc="${st.ME}"]`, tip: "Слева коды клиентов, чьи грузы лежат на складе. Нажмите на D051: это ТехноДом." };
        const sel = App.tmp.csel || [];
        if (!sel.includes(id)) return { sel: `[data-gc="${id}"] .gc-b`, tip: "Справа все грузы клиента карточками с фото. Отметьте новый приход." };
        if (o && !sel.includes(o.id)) return { sel: `[data-gc="${o.id}"] .gc-b`, tip: "И второй груз того же клиента, от другого поставщика: упакуем их вместе." };
        return { sel: "#btnOrg", tip: "Внизу видно, сколько грузов и мест выбрано. Нажмите «Организовать упаковку»." };
      } },
    { k: "collect", who: ["list", "Склад в Китае"], t: "Склад собирает груз по задаче",
      p: "Команда администратора пришла складу как задача с нашим трек-номером. Кладовщик находит грузы на полках и отмечает их. Если один пропал, можно продолжить без него.",
      go: () => { App.ui.slots[0].wh = "yiwu"; goPhone("warehouse", "tasks"); },
      hint: () => {
        const n = needPhone("warehouse", ["tasks", "task"], "tasks", "Задачи"); if (n) return n;
        const s = App.ui.slots[0], id = sc().ttId, t = st.task(id);
        if (s.screen === "tasks") return { sel: ps("warehouse", `[data-tk="${id}"]`), tip: "Это телефон кладовщика. Задача пришла с нашим трек-номером. Откройте её." };
        if (s.p !== id || !t) return null;
        const f = App.tmp.col[id] || [], miss = t.receiptIds.find((x) => !f.includes(x));
        if (miss) return { sel: ps("warehouse", `[data-pk="${miss}"]`), tip: "Внутри видно, что и как упаковать, и карточки грузов. Отметьте найденный груз галочкой." };
        return { sel: ps("warehouse", '[data-hl="col-go"]'), tip: "Все грузы найдены. Нажмите «Готово»: груз перейдёт на страницу «Упаковка»." };
      } },
    { k: "pack", who: ["layers", "Склад в Китае"], t: "Склад упаковывает и вносит размеры",
      p: "Кладовщик указывает, во что упаковал на самом деле, размеры строками и вес. Объём считается сам по размерам, вручную его не вводят.",
      go: () => { App.ui.slots[0].wh = "yiwu"; goPhone("warehouse", "packs"); },
      hint: () => {
        const n = needPhone("warehouse", ["packs", "packf"], "packs", "Упаковка"); if (n) return n;
        const s = App.ui.slots[0], id = sc().ttId;
        if (s.screen === "packs") return { sel: ps("warehouse", `[data-tk="${id}"]`), tip: "Груз собран и ждёт упаковки. Откройте его." };
        if (s.p !== id) return null;
        const d = App.tmp.pack[id] || { packs: {}, dims: [], photos: [] }, fill = { act: "packFill", actLabel: "Заполнить за меня", slot: 0 };
        if (!st.packsSum(d.packs || {})) return Object.assign({ sel: ps("warehouse", '[data-hl="pack-types"]'), tip: "Укажите, во что упаковали: количество по каждому из четырёх видов. Заказанный вид подсвечен." }, fill);
        if (!st.dimsVolume(d.dims)) return Object.assign({ sel: ps("warehouse", '[data-hl="pack-dims"]'), tip: "Размеры строками: длина, ширина, высота и число мест. Коробки разные, поэтому есть «Добавить ещё». Объём считается сам." }, fill);
        if (!(u.parse(d.weight) > 0)) return Object.assign({ sel: ps("warehouse", '[data-hl="pack-w"]'), tip: "Укажите вес, например 142 кг." }, fill);
        if (!(d.photos || []).length) return Object.assign({ sel: ps("warehouse", '[data-hl="pack-cam"]'), tip: "Сфотографируйте упакованный груз." }, fill);
        return { sel: ps("warehouse", '[data-hl="pack-go"]'), tip: "Нажмите «Готово»: упаковка завершена, груз появится у администратора во вкладке «Упакован»." };
      } },
    { k: "send", who: ["truck", "Администратор"], t: "Администратор отправляет груз",
      p: "Во вкладке «Упакован» грузы по нашим трек-номерам со всеми данными упаковки. Администратор отмечает один или несколько и отправляет: вид доставки, маршрут, место назначения.",
      go: () => { App.tmp.wtab = "packed"; goDesk("work"); },
      hint: () => {
        const n = needDesk("work", "Грузы"); if (n) return n;
        const id = sc().ttId;
        if (App.modalOpen()) {
          if (App.tmp.mk !== "send") return closeTip();
          if (!(App.tmp.snd || {}).picked) return { sel: '#modal [data-hl="snd-route"]', tip: "Вид доставки и место назначения подставлены. Выберите маршрут, например 88G.", act: "sndFill", actLabel: "Выбрать 88G за меня" };
          return { sel: "#btnSendGo", tip: "Нажмите «Отправить»: склад увидит маршрут у этого груза, клиент получит уведомление." };
        }
        if (App.tmp.wtab !== "packed") return { sel: '[data-wtab="packed"]', tip: "Откройте вкладку «Упакован»." };
        if (!(App.tmp.psel || []).includes(id)) return { sel: `[data-wp="${id}"]`, tip: "Склад упаковал груз: видны виды упаковки, места, вес и объём. Отметьте его." };
        return { sel: "#btnSend", tip: "Нажмите «Отправить». Можно отметить сразу несколько грузов." };
      } },
    { k: "seen", who: ["user", "Клиент"], t: "Клиент видит трек-номер и маршрут",
      p: "Клиент следит за грузом по нашему трек-номеру: маршрут, дата прибытия и стоимость в долларах вместе с доставкой до склада.",
      go: () => goPhone("client", "citem", "ship:" + sc().ttId), manual: true,
      hint: () => {
        const n = needPhone("client", ["citem", "ships"], "ships", "Грузы"); if (n) return n;
        const s = App.ui.slots[1], id = sc().ttId;
        if (s.screen === "citem" && s.p === "ship:" + id) return { sel: ps("client", '[data-hl="client-track"]'), tip: "Наш трек-номер, маршрут и дата прибытия. Ниже стоимость в долларах: в неё вошла доставка до склада.", act: "scnNext", actLabel: "Дальше", pri: true };
        return { sel: ps("client", `[data-ci="ship:${id}"]`), tip: "Откройте отправленный груз." };
      } },
    { k: "arrive", who: ["pin", "Администратор"], t: "Груз прибыл в Москву",
      p: "Груз пришёл на склад в Москве. Администратор в «Отправках» отмечает прибытие: груз ложится на хранение, клиент получает уведомление.",
      go: () => { App.tmp.ctab = "way"; goDesk("cons"); },
      hint: () => {
        const n = needDesk("cons", "Отправки"); if (n) return n;
        const id = sc().ttId, sh = st.ship(id); if (!sh) return null;
        if (cardOf(id) && sh.status === "way") return { sel: "#btnCardNext", tip: "Нажмите «Прибыл в Москву»: груз ляжет на хранение, клиент получит уведомление." };
        if (App.modalOpen()) return closeTip();
        if (App.tmp.ctab !== "way") return { sel: '[data-ctab="way"]', tip: "Откройте вкладку «В пути»." };
        return { sel: `[data-sh="${id}"] [data-arr]`, tip: "Во вкладке «В пути» поиск и фильтры. Наш груз пришёл: нажмите «Прибыл»." };
      } },
    { k: "issue", who: ["send", "Администратор"], t: "Команда «Выдать» на несколько треков",
      p: "Во вкладке «Прибывшие» слева коды клиентов, справа партии карточками: фото упаковки, вес, объём, подстатус. Администратор отмечает треки одного клиента и даёт команду «Выдать»: получатель, способ выдачи, получить оплату.",
      go: () => { App.tmp.ctab = "arr"; App.tmp.acode = st.ME; App.tmp.asub = "all"; goDesk("cons"); },
      hint: () => {
        const n = needDesk("cons", "Отправки"); if (n) return n;
        const id = sc().ttId, o = st.arrived("store").find((x) => x.clientId === st.ME && x.id !== id);
        if (App.modalOpen()) {
          if (App.tmp.mk !== "iss") return closeTip();
          if (!(App.tmp.iss || {}).picked) return { sel: '#modal [data-hl="iss-collect"]', tip: "Получатель и адрес подставились из карточки клиента, адрес можно скопировать. Сумма к получению при выдаче подставлена по долгу за выбранные треки.", act: "issFill", actLabel: "Заполнить за меня" };
          return { sel: "#btnIssueGo", tip: "Нажмите «Готово»: заказ на выдачу уйдёт складу в Москве, клиент получит уведомление." };
        }
        if (App.tmp.ctab !== "arr") return { sel: '[data-ctab="arr"]', tip: "Откройте вкладку «Прибывшие»." };
        if (App.tmp.acode !== st.ME) return { sel: `[data-acode="${st.ME}"]`, tip: "Слева коды клиентов с числом партий. Нажмите на D051." };
        const sel = App.tmp.asel || [];
        if (!sel.includes(id)) return { sel: `[data-ag="${id}"] [data-act="aSel"]`, tip: "Сверху общий вес и объём партий клиента. Отметьте наш груз, он на хранении." };
        if (o && !sel.includes(o.id)) return { sel: `[data-ag="${o.id}"] [data-act="aSel"]`, tip: "И ещё одну партию этого клиента: выдадим их вместе." };
        return { sel: "#btnIssue", tip: "Внизу итог по выбранным трекам. Нажмите «Выдать»." };
      } },
    { k: "maccept", who: ["wh", "Склад в Москве"], t: "Склад в Москве принимает выдачу",
      p: "Это телефон склада в Москве. В разделе «Готов к выдаче» коды клиентов с заказами: получатель, адрес, способ выдачи, сколько получить с клиента.",
      go: () => { App.tmp.mtab = "ready"; goPhone("msk", "mcode", "ready:" + st.ME); },
      hint: () => {
        const n = needPhone("msk", ["mgoods", "mcode"], "mgoods", "Грузы"); if (n) return n;
        const s = App.ui.slots[2], oid = sc().issId;
        if (s.screen === "mgoods") {
          if (App.tmp.mtab !== "ready") return { sel: ps("msk", '[data-act="mTab"][data-k="ready"]'), tip: "Откройте раздел «Готов к выдаче»." };
          return { sel: ps("msk", `[data-mcode="${st.ME}"]`), tip: "Сверху сводка: что приехало сегодня. Нажмите на D051: для него есть команда «Выдать»." };
        }
        return { sel: ps("msk", `[data-act="mAccept"][data-id="${oid}"]`), tip: "Видно получателя, адрес с кнопкой «копировать», способ выдачи и сумму к получению. Нажмите «Принят»: выдача перейдёт в работу." };
      } },
    { k: "mrep", who: ["camera", "Склад в Москве"], t: "Фотоотчёт и выдача",
      p: "Во вкладке «Фотоотчёт» треки в работе по заказам. Склад отмечает полученную оплату, по треку делает фото, отмечает повреждения и расходы и нажимает «Готово». Груз уходит в архив.",
      go: () => goPhone("msk", "mrep"),
      hint: () => {
        const n = needPhone("msk", ["mrep", "mtrack"], "mrep", "Фотоотчёт"); if (n) return n;
        const s = App.ui.slots[2], id = sc().ttId, o = st.issueOrder(sc().issId || "");
        if (App.sheetOpen(2)) return { sel: "#mPaidDone", tip: "Оплата ещё не отмечена. Нажмите «Получено, выдать»." };
        if (s.screen === "mrep") {
          if (o && st.issueRest(o) > 0) return { sel: ps("msk", `[data-rord="${o.id}"] [data-hl="m-paid"]`), tip: "Клиент заплатил при выдаче. Нажмите «Получено»: сумма попадёт в «Финансы» и закроет долг клиента." };
          return { sel: ps("msk", `[data-mtr="${id}"]`), tip: "Откройте наш трек." };
        }
        if (s.p !== id) return { sel: ps("msk", '[data-tab="mrep"]'), tip: "Вернитесь к списку «Фотоотчёт»." };
        const d = (App.tmp.mrep || {})[id] || { photos: [] };
        if (!(d.photos || []).length) return { sel: ps("msk", '[data-act="mrepPhoto"]'), tip: "Сфотографируйте груз при выдаче, отметьте повреждение и расходы в рублях. Ни одно поле не обязательно.", act: "mrepFill", actLabel: "Заполнить за меня", slot: 2 };
        return { sel: ps("msk", '[data-hl="m-done"]'), tip: "Нажмите «Готово»: груз выдан, клиент получит уведомление. Вторую партию склад выдаст так же." };
      } },
    { k: "cdone", who: ["user", "Клиент"], t: "Клиент видит, что груз выдан",
      p: "Клиенту пришли уведомления на каждом шаге: прибыл в Москву, готов к выдаче, выдан. В карточке груза способ выдачи и фотоотчёт склада.",
      go: () => goPhone("client", "citem", "ship:" + sc().ttId), manual: true,
      hint: () => {
        const n = needPhone("client", ["citem", "ships"], "ships", "Грузы"); if (n) return n;
        const s = App.ui.slots[1], id = sc().ttId;
        // после выдачи карточка выдачи сменяется фотоотчётом склада
        if (s.screen === "citem" && s.p === "ship:" + id) return { sel: ps("client", (st.ship(id) || {}).status === "done" ? '[data-hl="client-rep"]' : '[data-hl="client-issue"]'), tip: "Груз выдан: видно, как и когда, и фото склада при выдаче.", act: "scnNext", actLabel: "Дальше", pri: true };
        return { sel: ps("client", `[data-ci="ship:${id}"]`), tip: "Откройте выданный груз." };
      } },
    { k: "mfin", who: ["wallet", "Склад в Москве"], t: "Финансы склада в Москве", manual: true,
      p: "Взаиморасчёты компании со складом в Москве в рублях и долларах. Оплата клиента при выдаче уже в операциях, баланс пересчитан. Расходы за куб и маршрут склад добавляет сам.",
      go: () => goPhone("msk", "mfin"),
      hint: () => {
        const n = needPhone("msk", ["mfin"], "mfin", "Финансы"); if (n) return n;
        return { sel: ps("msk", '[data-mbal="RUB"]'), tip: "Два баланса: в рублях и в долларах, каждый может быть в плюсе или в минусе. Ниже фильтр по периоду и все операции, сверху оплата клиента при выдаче.", act: "scnNext", actLabel: "Дальше", pri: true };
      } },
    { k: "staff", who: ["shield", "Администратор"], t: "Менеджер по продажам и его доступ",
      p: "Администратор сам создаёт сотрудника и выбирает набор прав. Менеджер по продажам видит только своих клиентов, может организовать упаковку их грузов, маршрут ему не показывается.",
      go: () => goDesk("staff"),
      hint: () => {
        if (App.ui.mode === "admin" && App.ui.viewAs) return { sel: "#btnViewBack", tip: "Так систему видит менеджер по продажам: только свои клиенты, без маршрута и без «Отправок». Полоса сверху напоминает, под кем вы вошли. Нажмите «Вернуться к администратору».", side: "b" };
        const n = needDesk("staff", "Сотрудники и доступы"); if (n) return n;
        if (App.modalOpen()) {
          if (App.tmp.mk !== "staff") return closeTip();
          const d = App.tmp.nst || {};
          if (!String(d.name || "").trim()) return { sel: '#modal [data-hl="nst-name"]', tip: "Введите имя, логин и пароль нового сотрудника.", act: "nstFill", actLabel: "Заполнить за меня" };
          if (d.preset !== "sales") return { sel: '#modal [data-hl="nst-preset"]', tip: "Выберите набор «как менеджер по продажам». Разделы ниже можно поправить вручную." };
          return { sel: "#btnNstGo", tip: "Нажмите «Создать»." };
        }
        if (!sc().staffId) return { sel: "#btnNewStaff", tip: "Вы сами создаёте сотрудника и задаёте, что он видит. Нажмите «Новый сотрудник»." };
        if (App.tmp.staffSel !== sc().staffId) return { sel: `[data-stf="${sc().staffId}"]`, tip: "Выберите нового сотрудника в списке." };
        return { sel: "#btnViewAs", tip: "Ниже простым текстом написано, что он видит. Нажмите «Войти под этим сотрудником»." };
      } },
    { k: "history", who: ["history", "Администратор"], t: "История действий", manual: true,
      p: "Кто что добавил, изменил и удалил: приёмка, упаковка, отправка, прибытие, команда на выдачу, выдача, оплаты, доступы. Лента фильтруется по сотруднику и по грузу.",
      go: () => { if (App.ui.desk !== "history") App.tmp.hist = { who: "all", q: "", all: false }; goDesk("history"); },
      hint: () => {
        const n = needDesk("history", "История действий"); if (n) return n;
        const id = sc().ttId;
        if (App.tmp.hist.q !== id) return { sel: '[data-hl="hist-q"]', tip: "Каждое действие записано: кто, когда, что сделал. Отфильтруем ленту по нашему грузу.", act: "histCargo", actLabel: "Показать историю груза", data: { q: id }, side: "b" };
        return { sel: '[data-hl="hist-t"]', tip: "Весь путь одного груза: приёмка, упаковка, отправка, прибытие в Москву, команда «Выдать», «Принят», оплата, выдача. И видно, кто это сделал.", act: "scnNext", actLabel: "Дальше", pri: true };
      } },
    { k: "end", who: ["spark", "Готово"], t: "Путь груза пройден целиком",
      p: "Вы прошли путь груза от трек-номера клиента до выдачи в Москве. Дальше можно свободно осматривать все четыре вкладки: «Сбросить демо» вернёт данные к исходным.",
      go: () => goDesk("board"), final: true, hint: () => null },
  ];
  const N = STEPS.length - 1;

  // ---------- нижняя панель и полоса на телефоне ----------
  function dock() {
    const s = sc(), el = $("dock"), ms = $("msScn");
    document.body.dataset.scn = s.on ? "on" : "off";
    let h;
    if (!s.on) {
      h = `<div class="free"><span>Прототип для обсуждения. Данные вымышленные.</span><button class="btn sm" type="button" data-act="scnStart">${I("play")}Пройти сценарий</button></div>`;
      ms.innerHTML = "";
    } else {
      const step = STEPS[s.step], pct = Math.round((Math.min(s.step, N) / N) * 100);
      h = `<div class="stp" style="--p:${pct}"><span>${step.final ? I("check") : s.step + 1 + "/" + N}</span></div>
        <div class="txt"><h4><span class="ell1">${E(step.t)}</span><span class="who">${I(step.who[0])}${E(step.who[1])}</span></h4><p>${E(step.p)}</p></div>
        <div class="acts">${step.final ? `<button class="btn pri" type="button" data-act="scnEnd">${I("check")}Завершить</button>` : `<button class="btn" type="button" data-act="scnShow">Показать, где</button>`}
          ${step.manual ? `<button class="btn pri" type="button" data-act="scnNext">Дальше</button>` : ""}
          ${step.final ? "" : `<button class="btn ghost" type="button" data-act="scnEnd" title="Выйти из сценария">${I("exit")}Выйти</button>`}</div>`;
      ms.innerHTML = `<div class="stp" style="--p:${pct}"><span>${step.final ? I("check") : s.step + 1}</span></div><div class="mt"><b>${E(step.t)}</b><small>${step.final ? "сценарий пройден" : "шаг " + (s.step + 1) + " из " + N + " · " + E(step.who[1])}</small></div>
        ${step.final ? `<button class="btn sm pri" type="button" data-act="scnEnd">Готово</button>` : `<button class="btn sm" type="button" data-act="scnShow">Где?</button><button class="x" type="button" data-act="scnEnd" aria-label="Выйти из сценария">${I("x")}</button>`}`;
    }
    if (el.dataset.k === (s.on ? "s" + s.step : "off")) { el.innerHTML = h; return; }
    el.dataset.k = s.on ? "s" + s.step : "off";
    el.classList.add("out");
    setTimeout(() => { el.innerHTML = h; el.classList.remove("out"); el.classList.add("pre"); void el.offsetHeight; el.classList.remove("pre"); }, 130);
  }

  // ---------- подсветка и подсказка ----------
  const spot = document.createElement("div"); spot.className = "spot";
  const coach = document.createElement("div"); coach.className = "coach"; coach.setAttribute("role", "status");
  document.body.append(spot, coach);
  let cur = null, curKey = "", curHtml = "", curSide = "", coachMode = "", scrolledFor = "", pending = false;

  // ближайший прокручиваемый контейнер элемента (телефон, окно, шторка) или вся страница
  function scrollBox(el) {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 2) return p;
    }
    return null;
  }
  function reveal(el) {
    const box = scrollBox(el), r = el.getBoundingClientRect();
    if (box) {
      const c = box.getBoundingClientRect();
      if (r.top < c.top + 16 || r.bottom > c.bottom - 16) box.scrollTo({ top: box.scrollTop + (r.top - c.top) - c.height * 0.3, behavior: "smooth" });
    }
    if (App.isMobile()) return;
    const r2 = el.getBoundingClientRect();
    if (r2.top < 70 || r2.bottom > innerHeight - 100) window.scrollTo({ top: scrollY + r2.top - innerHeight * 0.35, behavior: "smooth" });
  }
  function scrollToTarget(el, key) { if (scrolledFor === key) return; scrolledFor = key; reveal(el); }

  // видимая часть элемента: обрезаем по всем предкам с overflow и по окну браузера
  function visible(el) {
    const r = el.getBoundingClientRect();
    let t = r.top, b = r.bottom, l = r.left, rt = r.right, box = null;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowY !== "visible" || cs.overflowX !== "visible") {
        const c = p.getBoundingClientRect();
        if (!box) box = c;
        t = Math.max(t, c.top); b = Math.min(b, c.bottom); l = Math.max(l, c.left); rt = Math.min(rt, c.right);
      }
    }
    t = Math.max(t, 0); b = Math.min(b, innerHeight);
    // видна только узкая полоска или ничего: считаем, что элемент за краем
    if (b - t < Math.min(28, r.height * 0.5) || rt - l < 8) {
      const c = box || { top: 0, bottom: innerHeight, left: 0, right: innerWidth };
      const clip = { top: Math.max(c.top, 0), bottom: Math.min(c.bottom, innerHeight), left: c.left, right: c.right };
      const dir = r.top + r.height / 2 < (clip.top + clip.bottom) / 2 ? "up" : "down";
      return { off: true, dir, clip };
    }
    return { off: false, r: { left: l, top: t, right: rt, bottom: b, width: rt - l, height: b - t } };
  }
  function setCoach(mode, dir) {
    const key = mode + (dir || "");
    if (coachMode === key) return;
    coachMode = key;
    coach.innerHTML = mode === "on" ? curHtml
      : `<i class="arw"></i><small>Шаг ${sc().step + 1} из ${N}</small><p>Нужный элемент ${dir === "up" ? "выше" : "ниже"}. Прокрутите ${dir === "up" ? "вверх" : "вниз"} или нажмите «Показать».</p><div class="ca"><button class="btn sm pri" type="button" data-act="scnFocus">${I("down")}Показать</button></div>`;
    const a = coach.querySelector(".ca .ic"); if (a && mode !== "on" && dir === "up") a.style.transform = "rotate(180deg)";
  }
  function hide() { spot.classList.remove("show"); coach.classList.remove("show"); cur = null; curKey = ""; coachMode = ""; }
  function decorate() {
    const s = sc();
    if (!s.on || pending || $("ov").classList.contains("show")) { hide(); return; }
    const step = STEPS[s.step], h = step && step.hint && step.hint();
    const el = h && qv(h.sel);
    if (!el) { hide(); return; }
    const key = s.step + "|" + h.sel + "|" + h.tip;
    cur = el;
    if (key !== curKey) {
      curKey = key; coachMode = ""; curSide = h.side || "";
      const data = Object.keys(h.data || {}).map((k) => ` data-${k}="${E(h.data[k])}"`).join("") + (h.slot != null ? ` data-slot="${h.slot}"` : "");
      curHtml = `<i class="arw"></i><small>Шаг ${s.step + 1} из ${N} · ${E(step.who[1])}</small><p>${E(h.tip)}</p>${h.act ? `<div class="ca"><button class="btn sm${h.pri ? " pri" : ""}" type="button" data-act="${h.act}"${data}>${E(h.actLabel)}</button></div>` : ""}`;
      scrollToTarget(el, s.step + "|" + h.sel);
    }
    place(true);
  }
  let last = "";
  function place(force) {
    if (!cur || !cur.isConnected) { if (cur) decorate(); return; }
    const v = visible(cur);
    const sig = v.off ? "off" + v.dir + Math.round(v.clip.top) + Math.round(v.clip.left) : [v.r.left, v.r.top, v.r.width, v.r.height].map(Math.round).join(",");
    if (!force && sig === last) return;
    last = sig;
    const W = innerWidth, H = innerHeight, cw = Math.min(300, W - 24), gap = 16;
    coach.style.width = cw + "px";
    let side, x, y, ax, ay;
    if (v.off) {
      // элемент прокручен за край: снимаем затемнение, подсказка у края контейнера
      spot.classList.remove("show");
      setCoach("off", v.dir);
      const ch = coach.offsetHeight || 110, c = v.clip;
      x = (c.left + c.right) / 2 - cw / 2;
      if (v.dir === "up") { side = "b"; y = c.top + 12; } else { side = "t"; y = c.bottom - ch - 12; }
      ax = (c.left + c.right) / 2; ay = null;
    } else {
      setCoach("on");
      const r = v.r, pad = 6;
      Object.assign(spot.style, { transform: `translate3d(${r.left - pad}px,${r.top - pad}px,0)`, width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
      spot.classList.add("show");
      const ch = coach.offsetHeight || 110, fitL = r.left - cw - gap > 8, fitR = r.right + cw + gap < W - 8, rightHalf = r.left + r.width / 2 > W / 2;
      // подсказку ставим с внешней стороны, чтобы не закрывать соседний телефон
      const fitB = r.bottom + ch + gap < H - 8;
      if (curSide === "b" && fitB) { side = "b"; x = r.left + r.width / 2 - cw / 2; y = r.bottom + gap; }
      else if (fitL && (!rightHalf || !fitR)) { side = "l"; x = r.left - cw - gap; y = r.top + r.height / 2 - ch / 2; }
      else if (fitR) { side = "r"; x = r.right + gap; y = r.top + r.height / 2 - ch / 2; }
      else if (fitB) { side = "b"; x = r.left + r.width / 2 - cw / 2; y = r.bottom + gap; }
      else { side = "t"; x = r.left + r.width / 2 - cw / 2; y = r.top - ch - gap; }
      ax = r.left + r.width / 2; ay = r.top + r.height / 2;
    }
    const ch = coach.offsetHeight || 110;
    x = Math.max(8, Math.min(W - cw - 8, x)); y = Math.max(8, Math.min(H - ch - 8, y));
    coach.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`; coach.dataset.side = side;
    const arw = coach.querySelector(".arw");
    if (arw) {
      if (side === "l" || side === "r") { arw.style.top = Math.max(14, Math.min(ch - 26, ay - y - 6)) + "px"; arw.style.left = ""; }
      else { arw.style.left = Math.max(14, Math.min(cw - 26, ax - x - 6)) + "px"; arw.style.top = ""; }
    }
    coach.classList.add("show");
  }
  function loop() { if (App.ui && sc().on) place(false); requestAnimationFrame(loop); }
  addEventListener("resize", () => place(true));

  // ---------- шаги ----------
  let advT = 0;
  function goStep(i, delay) {
    clearTimeout(advT);
    const run = () => { pending = false; sc().step = Math.min(i, N); App.saveUI(); dock(); STEPS[sc().step].go(); setTimeout(decorate, 460); };
    if (delay) { pending = true; hide(); advT = setTimeout(run, delay); } else run();
  }
  function check(ev, data) {
    const s = sc(); if (!s.on || pending) return;
    const k = STEPS[s.step].k, next = (d) => goStep(s.step + 1, d);
    if (k === "track" && ev === "expected" && data.clientId === st.ME) { s.track = data.track; App.saveUI(); next(1300); return; }
    if (k === "accept" && ev === "accepted" && data.clientId === st.ME) { s.recId = data.id; App.saveUI(); next(1700); return; }
    if (k === "client" && ev === "nav") { const sl = App.ui.slots[1]; if (App.ui.mode === "client" && sl.screen === "citem" && sl.p === "rec:" + s.recId) { next(1900); return; } }
    if (k === "org" && ev === "packcmd" && data.receiptIds.includes(s.recId)) { s.ttId = data.id; App.saveUI(); next(1900); return; }
    if (k === "collect" && ev === "collected" && data.id === s.ttId) { next(1700); return; }
    if (k === "pack" && ev === "packed" && data.id === s.ttId) { next(1900); return; }
    if (k === "send" && ev === "dispatched" && data.id === s.ttId) { next(2000); return; }
    if (k === "arrive" && ev === "arrived" && data.id === s.ttId) { next(1900); return; }
    if (k === "issue" && ev === "issuecmd" && data.shipIds.includes(s.ttId)) { s.issId = data.id; App.saveUI(); next(1900); return; }
    if (k === "maccept" && ev === "issueacc" && data.id === s.issId) { next(1700); return; }
    if (k === "mrep" && ev === "issued" && data.id === s.ttId) { next(2000); return; }
    if (k === "staff" && ev === "staffNew") { s.staffId = data; App.saveUI(); }
    if (k === "staff" && ev === "viewAs") { s.seen = true; App.saveUI(); }
    if (k === "staff" && ev === "viewBack" && s.seen) { next(900); return; }
    setTimeout(decorate, 60);
  }
  // после любого клика или ввода пересчитываем подсказку (новое поле, открытое окно)
  document.addEventListener("click", () => { if (!App.ui || !sc().on) return; setTimeout(decorate, 40); setTimeout(() => sc().on && decorate(), 400); }, true);
  document.addEventListener("input", () => { if (App.ui && sc().on) setTimeout(decorate, 30); }, true);

  function start() {
    App.closeOverlay(); App.ui.introSeen = true;
    const s = sc(); s.on = true; s.step = 0; s.track = null; s.recId = null; s.ttId = null; s.staffId = null; s.issId = null; s.seen = false; App.ui.viewAs = null;
    App.tmp.acc = null; App.tmp.aw = null; App.tmp.csel = []; App.tmp.psel = []; App.tmp.org = null; App.tmp.snd = null; App.tmp.nst = null; App.tmp.wq = ""; App.tmp.asel = []; App.tmp.iss = null; App.tmp.mrep = {}; scrolledFor = ""; pending = false;
    App.saveUI(); goStep(0);
  }
  function stop(silent) {
    clearTimeout(advT); pending = false; const s = sc(); s.on = false; App.saveUI(); dock(); hide();
    if (!silent) App.toast(App.isMobile() ? "Сценарий закрыт. Запустить снова можно из меню" : "Сценарий закрыт. Запустить снова можно кнопкой «Сценарий» вверху", "info");
  }
  const show = () => { scrolledFor = ""; STEPS[sc().step].go(); setTimeout(decorate, 460); };

  Object.assign(App.acts, {
    scnStart: () => start(),
    scnOpen: () => { if (sc().on) show(); else start(); },
    scnShow: () => show(),
    scnFocus: () => { if (cur) reveal(cur); },
    scnNext: () => goStep(sc().step + 1),
    scnEnd: () => { const fin = STEPS[sc().step].final; stop(fin); if (fin) App.toast("Спасибо! Дальше можно осматриваться самостоятельно", "check"); },
  });

  // события прибытия и выдачи берём прямо из данных: кто бы ни нажал кнопку (администратор или склад), шаг засчитывается
  ["arrived", "issuecmd", "issueacc", "issued"].forEach((ev) => st.on(ev, (x) => setTimeout(() => check(ev, x), 0)));

  App.scenario = {
    init() { if (sc().on && sc().step > 1 && !st.rec(sc().recId || "")) sc().on = false; dock(); setTimeout(decorate, 300); requestAnimationFrame(loop); },
    render: dock, decorate, check, on: () => sc().on,
    onNav() { check("nav"); },
    isStep: (k) => sc().on && STEPS[sc().step] && STEPS[sc().step].k === k,
  };
})(window.App);
