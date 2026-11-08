/* Сценарий: ведёт по пути груза от склада до оплаты.
   Затемняет экран, подсвечивает нужный элемент и показывает рядом подсказку «что сделать сейчас».
   Из сценария можно выйти в любой момент. */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, I = u.icon, E = u.esc;
  const $ = (id) => document.getElementById(id);
  const sc = () => App.ui.scn;
  const newId = () => sc().newId;
  const q = (sel) => document.querySelector(sel);
  const modalOpen = () => $("modal").classList.contains("show");
  const num = (v) => parseFloat(String(v || "").replace(",", ".")) || 0;

  // Каждый шаг: что показать (go) и подсказка для текущего состояния (hint → {sel, tip, act, actLabel})
  const STEPS = [
    { k: "accept", who: ["box", "Склад в Китае"], t: "Примите груз на складе",
      p: "Вы кладовщик в Иу. Пришли коробки с кодом MSK-117. Введите код, сделайте фото, укажите места, вес и объём.",
      go: () => App.go.phone("accept", null, "warehouse"),
      hint: () => {
        if (App.ui.phoneRole !== "warehouse") return { sel: '#phoneRoles [data-role="warehouse"]', tip: "Переключите телефон на склад в Китае" };
        if (App.ui.phone !== "accept") return { sel: '[data-tab="accept"]', tip: "Откройте «Приёмку»" };
        const d = App.tmp.draft || { code: "", photos: [], places: 1 };
        const fill = { act: "accFill", actLabel: "Заполнить за меня" };
        if (!d.code.trim()) return Object.assign({ sel: '[data-hl="acc-code"]', tip: "Введите код клиента с коробки. Для примера возьмите MSK-117.", act: "accSample", actLabel: "Ввести MSK-117" });
        if (q("#found.bad")) return Object.assign({ sel: '[data-hl="acc-code"]', tip: "Клиента с таким кодом нет. Попробуйте MSK-117." }, fill);
        if (!d.photos.length) return Object.assign({ sel: '[data-hl="acc-cam"]', tip: "Сфотографируйте груз: нажмите на камеру. Фото сразу увидит клиент." }, fill);
        if (!(num(d.weight) > 0)) return Object.assign({ sel: "#accW", tip: "Укажите вес, например 96 кг." }, fill);
        if (!(num(d.volume) > 0)) return Object.assign({ sel: "#accV", tip: "Укажите объём, например 0,64 м³." }, fill);
        return { sel: '[data-hl="acc-go"]', tip: "Всё заполнено. Нажмите «Принять груз»." };
      } },
    { k: "client", who: ["user", "Клиент"], t: "Клиенту уже пришло уведомление",
      p: "Это телефон клиента. Он сразу видит, что груз принят, и фото со склада.",
      go: () => App.go.phone("ships", null, "client"),
      hint: () => {
        if (App.ui.phoneRole !== "client") return { sel: '#phoneRoles [data-role="client"]', tip: "Переключите телефон на клиента" };
        if (App.ui.phone !== "ships") return { sel: '[data-tab="ships"]', tip: "Откройте «Грузы»" };
        return { sel: `[data-cs="${newId()}"]`, tip: "Новый груз уже здесь, с фото со склада. Нажмите на него." };
      } },
    { k: "board", who: ["board", "Администратор"], t: "Груз на общей доске",
      p: "Слева компьютер администратора. Новая поставка уже в колонке «Принят на складе».",
      go: () => App.go.desk("board", null, "admin"),
      hint: () => {
        if (App.ui.deskRole !== "admin") return { sel: '#deskRoles [data-role="admin"]', tip: "Переключите компьютер на администратора" };
        if (App.ui.desk !== "board") return { sel: '[data-nav="board"]', tip: "Откройте «Поставки»" };
        return { sel: `[data-sc="${newId()}"]`, tip: "Вот новая поставка. Откройте карточку: фото, история, кто и когда принял." };
      } },
    { k: "pack", who: ["layers", "Склад в Китае"], t: "Упакуйте груз",
      p: "Склад выбирает упаковку, указывает вес и объём после упаковки и делает фото. Стоимость считается сама.",
      go: () => { App.closeDesk(); App.go.phone("packForm", newId(), "warehouse"); },
      hint: () => {
        if (App.ui.phoneRole !== "warehouse") return { sel: '#phoneRoles [data-role="warehouse"]', tip: "Переключите телефон на склад в Китае" };
        if (App.ui.phone !== "packForm") return App.ui.phone === "pack" ? { sel: `[data-pk="${newId()}"]`, tip: "Выберите принятый груз" } : { sel: '[data-tab="pack"]', tip: "Откройте «Упаковку»" };
        const d = App.tmp.pack[newId()] || {};
        const fill = { act: "packFill", actLabel: "Заполнить за меня" };
        if (!d.packType) return Object.assign({ sel: '[data-hl="pack-type"]', tip: "Выберите вид упаковки. Цена упаковки добавится к стоимости." }, fill);
        if (!(d.photos || []).length) return Object.assign({ sel: '[data-hl="pack-cam"]', tip: "Сфотографируйте упакованный груз." }, fill);
        return { sel: '[data-hl="pack-go"]', tip: "Стоимость для клиента уже посчитана. Нажмите «Упаковано»." };
      } },
    { k: "ship", who: ["truck", "Менеджер в России"], t: "Соберите отправку",
      p: "Компьютер менеджера в России: упакованные грузы объединяются в отправку, трек-номер присваивается сам.",
      go: () => App.go.desk("dispatch", null, "manager"),
      hint: () => {
        if (App.ui.deskRole !== "manager") return { sel: '#deskRoles [data-role="manager"]', tip: "Переключите компьютер на менеджера в России" };
        if (App.ui.desk !== "dispatch") return { sel: '[data-nav="dispatch"]', tip: "Откройте «Отгрузку»" };
        if (modalOpen()) return { sel: "#btnDispatchGo", tip: "Трек-номер уже присвоен. Нажмите «Отправить»." };
        if (!App.tmp.sel.includes(newId())) return { sel: `[data-sel="${newId()}"]`, tip: "Отметьте новый груз ТехноДома. Можно добавить и второй его груз." };
        return { sel: "#btnDispatch", tip: "Нажмите «Сформировать отправку»." };
      } },
    { k: "track", who: ["user", "Клиент"], t: "У клиента трек-номер",
      p: "Клиент получил уведомление: груз в пути, трек-номер и дата прибытия. Больше не нужно спрашивать «где мой груз».",
      go: () => App.go.phone("ship", newId(), "client"), manual: true,
      hint: () => (App.ui.phone === "ship" ? { sel: '[data-hl="client-track"]', tip: "Трек-номер и дата прибытия у клиента в телефоне.", act: "scnNext", actLabel: "Дальше", pri: true } : { sel: '[data-act="scnNext"]', tip: "Нажмите «Дальше»" }) },
    { k: "pay", who: ["wallet", "Администратор"], t: "Отметьте оплату",
      p: "В финансах видно, кто сколько должен. Отметьте оплату ТехноДома: долг обнулится, клиент получит подтверждение.",
      go: () => App.go.desk("finance", null, "admin"),
      hint: () => {
        if (App.ui.deskRole !== "admin") return { sel: '#deskRoles [data-role="admin"]', tip: "Переключите компьютер на администратора" };
        if (App.ui.desk !== "finance") return { sel: '[data-nav="finance"]', tip: "Откройте «Финансы»" };
        if (modalOpen()) return { sel: "#btnPayGo", tip: "Сумма долга уже подставлена. Нажмите «Сохранить оплату»." };
        return { sel: `[data-pay="${st.ME}"]`, tip: "Это долг ТехноДома. Нажмите «Отметить оплату»." };
      } },
    { k: "end", who: ["spark", "Готово"], t: "Это и есть первая версия",
      p: "Вы прошли путь груза от склада в Китае до оплаты. В «Что входит» собраны функции первой версии и модули на выбор.",
      go: () => { App.go.desk("included", null, "admin"); App.go.phone("ships", null, "client"); }, final: true, hint: () => null },
  ];
  const N = STEPS.length - 1;

  // ---------- нижняя панель ----------
  function dock() {
    const s = sc(), el = $("dock");
    let h;
    if (!s.on) {
      h = `<div class="free"><span>Прототип для обсуждения. Данные вымышленные.</span><button class="btn sm" type="button" data-act="scnStart">${I("play")}Пройти сценарий</button></div>`;
    } else {
      const step = STEPS[s.step], pct = Math.round((Math.min(s.step, N) / N) * 100);
      h = `<div class="stp" style="--p:${pct}"><span>${step.final ? I("check") : s.step + 1 + "/" + N}</span></div>
        <div class="txt"><h4>${E(step.t)}<span class="who">${I(step.who[0])}${E(step.who[1])}</span></h4><p>${E(step.p)}</p></div>
        <div class="acts">${step.final ? `<button class="btn pri" type="button" data-act="scnEnd">${I("check")}Завершить</button>` : `<button class="btn" type="button" data-act="scnShow">Показать, где</button>`}
          ${step.manual ? `<button class="btn pri" type="button" data-act="scnNext">Дальше</button>` : ""}
          ${step.final ? "" : `<button class="btn ghost" type="button" data-act="scnEnd" title="Выйти из сценария">${I("exit")}Выйти</button>`}</div>`;
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
  let cur = null, curKey = "", curHtml = "", coachMode = "", scrolledFor = "";

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
    if (b - t < Math.min(28, r.height * 0.5)) {
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
      : `<i class="arw"></i><small>Шаг ${sc().step + 1} из ${N}</small><p>Нужный элемент ${dir === "up" ? "выше" : "ниже"}. Прокрутите ${dir === "up" ? "вверх" : "вниз"} или нажмите «Показать».</p><div class="ca"><button class="btn sm pri" type="button" data-act="scnFocus">${I(dir === "up" ? "back" : "chevron")}Показать</button></div>`;
    const a = coach.querySelector(".ca .ic"); if (a && mode !== "on") a.style.transform = "rotate(90deg)";
  }
  function hide() { spot.classList.remove("show"); coach.classList.remove("show"); cur = null; curKey = ""; coachMode = ""; }
  function decorate() {
    const s = sc();
    if (!s.on || $("ov").classList.contains("show")) { hide(); return; }
    const step = STEPS[s.step], h = step && step.hint && step.hint();
    const el = h && q(h.sel);
    if (!el) { hide(); return; }
    const key = s.step + "|" + h.sel + "|" + h.tip;
    cur = el;
    if (key !== curKey) {
      curKey = key; coachMode = "";
      curHtml = `<i class="arw"></i><small>Шаг ${s.step + 1} из ${N} · ${E(step.who[1])}</small><p>${E(h.tip)}</p>${h.act ? `<div class="ca"><button class="btn sm${h.pri ? " pri" : ""}" type="button" data-act="${h.act}">${E(h.actLabel)}</button></div>` : ""}`;
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
      const ch = coach.offsetHeight || 110;
      if (r.left - cw - gap > 8) { side = "l"; x = r.left - cw - gap; y = r.top + r.height / 2 - ch / 2; }
      else if (r.right + cw + gap < W - 8) { side = "r"; x = r.right + gap; y = r.top + r.height / 2 - ch / 2; }
      else if (r.bottom + ch + gap < H - 8) { side = "b"; x = r.left + r.width / 2 - cw / 2; y = r.bottom + gap; }
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
    const run = () => { sc().step = Math.min(i, N); App.saveUI(); dock(); STEPS[sc().step].go(); setTimeout(decorate, 420); };
    if (delay) { hide(); advT = setTimeout(run, delay); } else run();
  }
  function check(ev, data) {
    const s = sc(); if (!s.on) return;
    const k = STEPS[s.step].k;
    if (k === "accept" && ev === "accepted") { s.newId = data.id; App.saveUI(); goStep(s.step + 1, 1400); return; }
    if (k === "client" && ev === "nav" && App.ui.phoneRole === "client" && App.ui.phone === "ship" && App.ui.phoneP === s.newId) { goStep(s.step + 1, 1600); return; }
    if (k === "board" && ev === "openShip" && data === s.newId) { goStep(s.step + 1, 1800); return; }
    if (k === "pack" && ev === "packed" && data === s.newId) { goStep(s.step + 1, 1000); return; }
    if (k === "ship" && ev === "dispatched" && data && data.shipIds.includes(s.newId)) { goStep(s.step + 1, 1100); return; }
    if (k === "pay" && ev === "paid" && data && data.clientId === st.ME) { goStep(s.step + 1, 1300); return; }
    setTimeout(decorate, 60);
  }
  st.on("paid", (d) => check("paid", d));
  // после любого клика или ввода пересчитываем подсказку (новое поле, открытое окно)
  document.addEventListener("click", () => { if (!App.ui || !sc().on) return; setTimeout(decorate, 40); setTimeout(() => sc().on && decorate(), 380); }, true);
  document.addEventListener("input", () => { if (App.ui && sc().on) setTimeout(decorate, 30); }, true);

  function start() {
    App.closeOverlay(); App.ui.introSeen = true;
    const s = sc(); s.on = true; s.step = 0; s.newId = null;
    App.tmp.draft = null; scrolledFor = "";
    App.saveUI(); goStep(0);
  }
  function stop(silent) {
    clearTimeout(advT); const s = sc(); s.on = false; App.saveUI(); dock(); hide();
    if (!silent) App.toast("Сценарий закрыт. Запустить снова можно кнопкой «Сценарий» вверху", "info");
  }

  Object.assign(App.acts, {
    scnStart: () => start(),
    scnOpen: () => { if (sc().on) { scrolledFor = ""; STEPS[sc().step].go(); setTimeout(decorate, 420); } else start(); },
    scnShow: () => { scrolledFor = ""; STEPS[sc().step].go(); setTimeout(decorate, 420); },
    scnFocus: () => { if (cur) reveal(cur); },
    scnNext: () => goStep(sc().step + 1),
    scnEnd: () => { const fin = STEPS[sc().step].final; stop(fin); if (fin) App.toast("Спасибо! Дальше можно осматриваться самостоятельно", "check"); },
  });

  App.scenario = {
    init() { dock(); setTimeout(decorate, 300); requestAnimationFrame(loop); },
    render: dock, decorate, check,
    onNav() { check("nav"); },
    isStep: (k) => sc().on && STEPS[sc().step] && STEPS[sc().step].k === k,
  };
})(window.App);
