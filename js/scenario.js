/* Сценарий: ведёт по пути груза от трек-номера клиента до выдачи в Москве.
   Затемняет экран, подсвечивает нужный элемент и показывает рядом подсказку «что сделать сейчас».
   Сам переключает режим «Компьютер / Телефон» и нужную роль. Из сценария можно выйти в любой момент. */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, I = u.icon, E = u.esc;
  const $ = (id) => document.getElementById(id);
  const sc = () => App.ui.scn;
  // элемент считается найденным, только если он есть на экране
  const qv = (sel) => { const el = document.querySelector(sel); return el && el.getClientRects().length ? el : null; };
  const ROLE_T = { warehouse: "Склад в Китае", cnmanager: "Менеджер Китая", moscow: "Москва (выдача)", client: "Клиент", admin: "Администратор" };
  const slotOf = (role) => App.slotFor(role);
  const ps = (role, sel) => `#ps${slotOf(role)} ${sel}`;
  const mob = () => App.isMobile();
  function goPhone(role, screen, p) { App.closeDesk(); App.setMode("phone"); App.go.phone(slotOf(role), screen, p, role); }
  function goDesk(screen, p, role) { App.closeSheet(); App.setMode("desk"); App.go.desk(screen, p, role); }
  // общие проверки: режим, роль, экран
  function needPhone(role, screens, tab, tabName) {
    if (App.ui.mode !== "phone") return { sel: '#modeSeg [data-mode="phone"]', tip: "Переключитесь в режим «Телефон»." };
    const i = slotOf(role), s = App.ui.slots[i];
    if (s.role !== role) return { sel: `#ps${i} .prole [data-role="${role}"]`, tip: `Выберите над телефоном роль «${ROLE_T[role]}».` };
    if (!screens.includes(s.screen)) return { sel: `#ps${i} [data-tab="${tab}"]`, tip: `Откройте вкладку «${tabName}».` };
    return null;
  }
  function needDesk(role, screen, navName) {
    if (App.ui.mode !== "desk") return { sel: '#modeSeg [data-mode="desk"]', tip: "Переключитесь в режим «Компьютер»." };
    if (App.ui.deskRole !== role) return { sel: `#deskRoles [data-role="${role}"]`, tip: `Выберите роль «${App.DROLES[role].t}».` };
    if (App.ui.desk !== screen) return { sel: `[data-nav="${screen}"]`, tip: `Откройте раздел «${navName}».` };
    return null;
  }

  // Каждый шаг: что показать (go) и подсказка для текущего состояния (hint → {sel, tip, act, actLabel, slot, data})
  const STEPS = [
    { k: "track", who: ["user", "Клиент"], t: "Клиент вносит трек-номер заказа",
      p: "Клиент заказал товар у поставщика в Китае и получил трек-номер доставки до склада. Он заранее вносит его в приложении.",
      go: () => goPhone("client", "await"),
      hint: () => {
        const n = needPhone("client", ["await"], "await", "Жду посылку"); if (n) return n;
        const i = slotOf("client"), d = App.tmp.aw || { track: "" };
        if (d.track.replace(/\s/g, "").length < 6) return { sel: ps("client", '[data-hl="aw-track"]'), tip: "Это телефон клиента. Введите трек-номер китайской доставки, который прислал поставщик.", act: "awFill", actLabel: "Заполнить за меня", slot: i };
        return { sel: ps("client", '[data-hl="aw-go"]'), tip: "Можно дописать поставщика и что внутри. Нажмите «Добавить»: склад увидит трек заранее." };
      } },
    { k: "accept", who: ["box", "Склад в Китае"], t: "Склад принимает груз по трек-номеру",
      p: "Коробка приехала на склад в Иу. Кладовщик вводит трек с наклейки, клиент и поставщик находятся сами. Вес и объём здесь не нужны: их измеряют при упаковке.",
      go: () => { App.ui.slots[slotOf("warehouse")].wh = "yiwu"; goPhone("warehouse", "accept"); },
      hint: () => {
        const n = needPhone("warehouse", ["accept"], "accept", "Приёмка"); if (n) return n;
        const i = slotOf("warehouse"), d = App.tmp.acc || { q: "", photos: [], places: 1, dmg: null, dmgText: "" }, m = st.matchAccept(d.q), tr = sc().track || "MSK-117";
        const fill = { act: "accFill", actLabel: "Заполнить за меня", slot: i, data: { v: tr } }, zh = App.ui.slots[i].lang === "zh";
        if (!d.q.trim()) return { sel: ps("warehouse", '[data-hl="acc-q"]'), tip: "Это телефон кладовщика. Введите трек-номер с коробки. Интерфейс склада переключается на китайский кнопкой 中文 вверху.", act: "accSample", actLabel: "Ввести трек клиента", slot: i, data: { v: tr } };
        if (!m || (m.kind !== "track" && m.kind !== "code")) return Object.assign({ sel: ps("warehouse", '[data-hl="acc-q"]'), tip: "Такого трек-номера в системе нет. Введите трек, который внёс клиент." }, fill);
        if (!d.photos.length) return Object.assign({ sel: ps("warehouse", '[data-hl="acc-cam"]'), tip: "Клиент и поставщик нашлись сами. Сфотографируйте груз: фото сразу увидит клиент." }, fill);
        if (d.places < 2) return Object.assign({ sel: ps("warehouse", '[data-hl="acc-places"]'), tip: "Укажите, сколько мест пришло. Например, 8." }, fill);
        if (!d.dmg) return Object.assign({ sel: ps("warehouse", '[data-hl="acc-dmg"]'), tip: "Отметьте, есть ли повреждения. Если есть, склад опишет их, и клиент увидит это в карточке." }, fill);
        if (d.dmg === "yes" && !d.dmgText.trim()) return { sel: ps("warehouse", '[data-f="dmgText"]'), tip: "Коротко опишите, что повреждено." };
        return { sel: ps("warehouse", '[data-hl="acc-go"]'), tip: zh ? "Всё заполнено. Нажмите «确认收货» (принять груз)." : "Всё заполнено. Нажмите «Принять груз»." };
      } },
    { k: "client", who: ["user", "Клиент"], t: "Клиент сразу видит свой груз",
      p: "Клиенту пришло уведомление: груз принят, фото со склада уже в приложении. Не нужно писать менеджеру «дошла ли посылка».",
      go: () => goPhone("client", "ships"),
      hint: () => {
        const n = needPhone("client", ["ships"], "ships", "Грузы"); if (n) return n;
        return { sel: ps("client", `[data-ci="rec:${sc().recId}"]`), tip: "Клиенту пришло уведомление. Новый груз уже в списке, с фото со склада. Откройте его." };
      } },
    { k: "board", who: ["board", "Администратор"], t: "Груз виден администратору",
      p: "Администратор видит все склады сразу. Новый приход уже в списке «Принят на складе»: кто принял, когда, с какими фото.",
      go: () => { App.tmp.whF = "all"; App.tmp.q = ""; App.tmp.laneAll = {}; if (mob()) goPhone("admin", "aships", "all|in"); else goDesk("board", null, "admin"); },
      hint: () => {
        const id = sc().recId;
        if (mob()) { const n = needPhone("admin", ["aships"], "aships", "Грузы"); if (n) return n; return { sel: ps("admin", `[data-act="itemSheet"][data-id="${id}"]`), tip: "Это телефон администратора. Новый приход уже в списке. Откройте его." }; }
        const n = needDesk("admin", "board", "Грузы"); if (n) return n;
        return { sel: `[data-bc="rec:${id}"]`, tip: "Это компьютер администратора. Новый приход подсвечен. Откройте карточку: трек, поставщик, фото, история." };
      } },
    { k: "pack", who: ["layers", "Склад в Китае"], t: "Склад объединяет приходы и упаковывает",
      p: "У ТехноДома на складе два прихода от разных поставщиков. Кладовщик объединяет их в один груз, упаковывает и вносит вес и объём.",
      go: () => { App.ui.slots[slotOf("warehouse")].wh = "yiwu"; goPhone("warehouse", "pack"); },
      hint: () => {
        const n = needPhone("warehouse", ["pack", "packForm"], "pack", "Упаковка"); if (n) return n;
        const i = slotOf("warehouse"), s = App.ui.slots[i], id = sc().recId;
        if (s.screen === "pack") {
          const sel = App.tmp.packSel, other = st.waiting("yiwu").find((r) => r.clientId === st.ME && r.id !== id);
          if (!sel.includes(id)) return { sel: ps("warehouse", `[data-pk="${id}"]`), tip: "Отметьте новый приход ТехноДома." };
          if (other && !sel.includes(other.id)) return { sel: ps("warehouse", `[data-pk="${other.id}"]`), tip: "И второй приход того же клиента, от другого поставщика." };
          return { sel: ps("warehouse", '[data-hl="pack-merge"]'), tip: "Нажмите «Объединить и упаковать»: два прихода станут одним грузом." };
        }
        const d = App.tmp.pack[s.p] || {}, fill = { act: "packFill", actLabel: "Заполнить за меня", slot: i };
        if (!d.packType) return Object.assign({ sel: ps("warehouse", '[data-hl="pack-type"]'), tip: "Выберите вид упаковки." }, fill);
        if (!(u.parse(d.weight) > 0)) return Object.assign({ sel: ps("warehouse", '[data-hl="pack-w"]'), tip: "После упаковки груз взвешивают. Укажите вес, например 142 кг." }, fill);
        if (!(u.parse(d.volume) > 0)) return Object.assign({ sel: ps("warehouse", '[data-hl="pack-v"]'), tip: "И объём, например 0,86 м³." }, fill);
        if (!(d.photos || []).length) return Object.assign({ sel: ps("warehouse", '[data-hl="pack-cam"]'), tip: "Сфотографируйте упакованный груз." }, fill);
        return { sel: ps("warehouse", '[data-hl="pack-go"]'), tip: "Проверьте количество мест после упаковки и нажмите кнопку: груз готов к отгрузке." };
      } },
    { k: "ship", who: ["truck", "Менеджер в России"], t: "Менеджер отправляет часть мест",
      p: "Машина уходит сегодня, но весь груз не помещается. Менеджер отправляет часть мест, остальное остаётся на складе. Трек-номер присваивается сам.",
      go: () => goDesk("dispatch", null, "manager"),
      hint: () => {
        const n = needDesk("manager", "dispatch", "Отгрузка"); if (n) return n;
        if (App.modalOpen()) return { sel: "#btnDispatchGo", tip: "Трек-номер присвоен, стоимость в долларах подставлена. Нажмите «Отправить»." };
        const id = sc().cargoId, c = st.cargo(id), sel = App.tmp.sel;
        if (sel[id] == null) return { sel: `[data-sel="${id}"] .cpick`, tip: "Это компьютер менеджера в России. Груз ТехноДома упакован и ждёт отгрузки. Отметьте его." };
        if (c && st.left(c) > 2 && sel[id] >= st.left(c)) return { sel: `[data-hl="qty-${id}"]`, tip: "В машину помещается не всё. Уменьшите число мест кнопкой «−»: остаток уедет следующей отправкой.", act: "selPart", actLabel: "Оставить 2 места на складе", data: { id } };
        return { sel: "#btnDispatch", tip: "Нажмите «Сформировать отправку».", side: "b" };
      } },
    { k: "seen", who: ["user", "Клиент"], t: "У клиента трек-номер и стоимость",
      p: "Клиент получил уведомление: сколько мест уехало и сколько осталось на складе, трек-номер, дата прибытия и стоимость в долларах.",
      go: () => goPhone("client", "citem", "ship:" + sc().shipId), manual: true,
      hint: () => {
        const n = needPhone("client", ["citem", "ships"], "ships", "Грузы"); if (n) return n;
        const s = App.ui.slots[slotOf("client")], id = sc().shipId;
        if (s.screen === "citem" && s.p === "ship:" + id) return { sel: ps("client", '[data-hl="client-track"]'), tip: "Трек-номер, дата прибытия и сколько мест ещё на складе. Ниже стоимость в долларах и документы.", act: "scnNext", actLabel: "Дальше", pri: true };
        return { sel: ps("client", `[data-ci="ship:${id}"]`), tip: "Откройте новую отправку." };
      } },
    { k: "arrive", who: ["pin", "Прибытие"], t: "Груз прибыл в Россию",
      p: "Прошло две недели, машина пришла. Менеджер или администратор отмечает прибытие: клиент получает уведомление, а отправка появляется у сотрудника в Москве.",
      go: () => { st.setStage("arrive", "manager", true); if (mob()) goPhone("admin", "acons"); else goDesk("cons", null, "manager"); },
      hint: () => {
        const id = sc().shipId;
        if (mob()) { const n = needPhone("admin", ["acons"], "acons", "Отправки"); if (n) return n; return { sel: ps("admin", `[data-arr="${id}"]`), tip: "Это телефон администратора. Машина пришла: нажмите «Прибыла в Россию»." }; }
        const n = needDesk("manager", "cons", "Отправки"); if (n) return n;
        return { sel: `#deskView [data-arr="${id}"]`, tip: "Машина пришла. Нажмите «Прибыла» у новой отправки." };
      } },
    { k: "issue", who: ["check", "Москва (выдача)"], t: "Сотрудник в Москве выдаёт груз",
      p: "У сотрудника в Москве свой экран: прибывшие грузы. Он выдаёт груз клиенту или передаёт в транспортную компанию с номером накладной.",
      go: () => { st.setStage("issue", "moscow", true); goPhone("moscow", "mlist"); },
      hint: () => {
        const n = needPhone("moscow", ["mlist", "mship"], "mlist", "Выдача"); if (n) return n;
        const i = slotOf("moscow"), s = App.ui.slots[i], id = sc().shipId;
        if (s.screen === "mlist") return { sel: ps("moscow", `[data-ms="${id}"]`), tip: "Это телефон сотрудника в Москве. Прибывшая отправка уже у него. Откройте её." };
        if (App.sheetOpen(i)) {
          if (qv(ps("moscow", '[data-f="giveGo"]'))) return { sel: ps("moscow", '[data-f="giveGo"]'), tip: "Подтвердите выдачу: клиент получит уведомление." };
          const d = App.tmp.issue, fill = { act: "tkFill", actLabel: "Заполнить за меня", slot: i };
          if (!d) return null;
          if (!d.tk) return Object.assign({ sel: ps("moscow", '[data-hl="tk-pick"]'), tip: "Выберите транспортную компанию." }, fill);
          if (!d.waybill.trim()) return Object.assign({ sel: ps("moscow", '[data-hl="tk-wb"]'), tip: "Введите номер накладной с квитанции." }, fill);
          return { sel: ps("moscow", '[data-f="tkGo"]'), tip: "Нажмите «Передать»: клиент получит номер накладной." };
        }
        return { sel: ps("moscow", '[data-hl="ms-actions"]'), tip: "Выдайте груз клиенту или передайте в транспортную компанию. Подойдёт любой вариант." };
      } },
    { k: "end", who: ["spark", "Готово"], t: "Это первый этап целиком",
      p: "Вы прошли путь груза от трек-номера до выдачи, клиент всё это время видел статус в телефоне. В «Что входит» собраны три этапа и опции. Этапы 2 и 3 помечены в меню, их тоже можно открыть.",
      go: () => goDesk("included", null, "admin"), final: true, hint: () => null },
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
    if (mob()) return;
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
    if (k === "accept" && ev === "accepted" && data.clientId === st.ME) { s.recId = data.id; App.saveUI(); next(1600); return; }
    if (k === "client" && ev === "nav") { const sl = App.ui.slots[slotOf("client")]; if (App.ui.mode === "phone" && sl.role === "client" && sl.screen === "citem" && sl.p === "rec:" + s.recId) { next(1800); return; } }
    if (k === "board" && ev === "openItem" && data === "rec:" + s.recId) { next(2100); return; }
    if (k === "pack" && ev === "packed" && data.receiptIds.includes(s.recId)) { s.cargoId = data.id; App.saveUI(); next(1600); return; }
    if (k === "ship" && ev === "dispatched" && data.items.some((x) => x.cargoId === s.cargoId)) { s.shipId = data.id; App.saveUI(); next(1300); return; }
    if (k === "arrive" && ev === "arrived" && data.id === s.shipId) { next(1500); return; }
    if (k === "issue" && ev === "issued" && data.id === s.shipId) { next(1700); return; }
    setTimeout(decorate, 60);
  }
  // после любого клика или ввода пересчитываем подсказку (новое поле, открытое окно)
  document.addEventListener("click", () => { if (!App.ui || !sc().on) return; setTimeout(decorate, 40); setTimeout(() => sc().on && decorate(), 400); }, true);
  document.addEventListener("input", () => { if (App.ui && sc().on) setTimeout(decorate, 30); }, true);

  function start() {
    App.closeOverlay(); App.ui.introSeen = true;
    const s = sc(); s.on = true; s.step = 0; s.track = null; s.recId = null; s.cargoId = null; s.shipId = null;
    App.tmp.acc = null; App.tmp.aw = null; App.tmp.sel = {}; App.tmp.packSel = []; scrolledFor = ""; pending = false;
    App.saveUI(); goStep(0);
  }
  function stop(silent) {
    clearTimeout(advT); pending = false; const s = sc(); s.on = false; App.saveUI(); dock(); hide();
    if (!silent) App.toast(mob() ? "Сценарий закрыт. Запустить снова можно из меню" : "Сценарий закрыт. Запустить снова можно кнопкой «Сценарий» вверху", "info");
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

  App.scenario = {
    init() { if (sc().on && sc().step > 1 && !st.rec(sc().recId || "")) sc().on = false; dock(); setTimeout(decorate, 300); requestAnimationFrame(loop); },
    render: dock, decorate, check, on: () => sc().on,
    onNav() { check("nav"); },
    isStep: (k) => sc().on && STEPS[sc().step] && STEPS[sc().step].k === k,
  };
})(window.App);
