/* Оболочка: режимы «Компьютер» и «Телефон», роли, плавная смена экранов, окна, шторки, уведомления, запуск. */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, $ = (id) => document.getElementById(id), I = u.icon, E = u.esc;
  const mobile = window.matchMedia("(max-width: 699px)");
  App.isMobile = () => mobile.matches;

  const PROLES = [["warehouse", "Склад в Китае"], ["cnmanager", "Менеджер Китая"], ["moscow", "Москва (выдача)"], ["client", "Клиент"], ["admin", "Администратор"]];
  const PHOME = { warehouse: "home", cnmanager: "csum", moscow: "mlist", client: "ships", admin: "asum" };
  const DROLES = {
    admin: { who: "Рамиль · администратор", ava: "РМ", name: "Рамиль", role: "Администратор", home: "board", t: "Администратор", s: "Рамиль: видит всё" },
    manager: { who: "Ольга · менеджер в России", ava: "ОК", name: "Ольга Королёва", role: "Менеджер в России", home: "dispatch", t: "Менеджер в России", s: "отправки, трек-номера" },
    sales: { who: "Тимур · менеджер по продажам", ava: "ТА", name: "Тимур Ахметов", role: "Менеджер по продажам", home: "clients", t: "Менеджер по продажам", s: "только свои клиенты" },
    accountant: { who: "Наталья · бухгалтер", ava: "НС", name: "Наталья Сергеева", role: "Бухгалтер", home: "money", t: "Бухгалтер", s: "деньги и учёт", stage: 2 },
  };
  App.DROLES = DROLES; App.PROLES = PROLES; App.PHOME = PHOME;

  const DEF = () => ({ mode: mobile.matches ? "phone" : "desk", deskRole: "admin", desk: "board", deskP: null, phones: 2,
    slots: [{ role: "warehouse", screen: "home", p: null, lang: "ru", wh: "yiwu" }, { role: "client", screen: "ships", p: null, lang: "ru", wh: "yiwu" }],
    introSeen: false, scn: { on: false, step: 0 } });
  function loadUI() {
    try { const v = JSON.parse(localStorage.getItem(st.UIKEY) || "null"); if (v && v.desk && Array.isArray(v.slots) && v.slots.length === 2 && DROLES[v.deskRole]) return v; } catch (e) { /* нет хранилища */ }
    return {};
  }
  const ui = (App.ui = Object.assign(DEF(), loadUI()));
  App.saveUI = () => { try { localStorage.setItem(st.UIKEY, JSON.stringify(ui)); } catch (e) { /* без сохранения */ } };
  const TMP = () => ({ sel: {}, acc: null, pack: {}, packSel: [], aw: null, q: "", clientsQ: "", whF: "all", tr: "auto", period: 90, chat: null, chatText: "", ptext: {}, issue: null, pay: null });
  App.tmp = TMP();
  App.cur = 0; // телефон, в котором произошло действие
  App.nPhones = () => (mobile.matches ? 1 : ui.phones);
  // в каком телефоне сценарий показывает роль: слева сотрудник, справа клиент
  App.slotFor = (role) => (App.nPhones() === 1 ? 0 : role === "client" ? 1 : 0);

  // ===== шесть дополнительных опций из предложения =====
  App.OPT = {
    invoice: { icon: "file", t: "Автоматическая накладная", s: "Накладная на отправку собирается в PDF по вашему шаблону", d: "Накладная на отправку собирается в PDF по вашему шаблону из данных системы: клиент, места, вес, объём, трек-номер. Одна кнопка вместо ручного заполнения." },
    voice: { icon: "mic", t: "Создание поставки голосом", s: "Сотрудник наговаривает данные, карточка заполняется сама", d: "Сотрудник склада наговаривает: «ТехноДом, восемь мест, поставщик Хунда», и карточка приёмки заполняется сама. Удобно, когда руки заняты коробками." },
    analytics: { icon: "chart", t: "Расширенная аналитика", s: "Загрузка складов, сроки по этапам, доходность по клиентам", d: "Загрузка каждого склада, сроки на каждом этапе, доходность по клиентам. Видно, где груз задерживается и какие клиенты приносят больше всего." },
    wecom: { icon: "bell", t: "Уведомления складу в WeCom", s: "Сотрудники в Китае получают задачи в привычном мессенджере", d: "Сотрудники в Китае получают задачи и уведомления в рабочем мессенджере WeCom: ожидается груз, пора упаковать, машина на погрузке. Надёжнее, чем уведомления браузера на китайских телефонах." },
    clientChat: { icon: "chat", t: "Чат клиента с менеджером", s: "Клиент пишет в приложении, переписка привязана к его грузам", d: "Клиент пишет менеджеру прямо в приложении. Переписка привязана к его грузам, менеджер отвечает с компьютера, история не теряется при смене менеджера.", chat: true },
    tgbot: { icon: "tg", t: "Бот «Где мой груз?» в Telegram", s: "Клиент получает статус по коду или трек-номеру круглосуточно", d: "Клиент пишет боту свой код или трек-номер и сразу получает статус, фото и дату прибытия. Отвечает круглосуточно, без участия менеджера." },
  };
  function optHtml(k, close) {
    const o = App.OPT[k]; if (!o) return "";
    const chat = o.chat ? `<div class="chat-prev"><div class="bub me">Добрый день! Когда приедут светильники?<small>ТехноДом · клиент</small></div><div class="bub">Отправили вчера, трек ЦЛ-48231, прибытие около 1 декабря<small>Ольга · менеджер</small></div></div>` : "";
    return `<div class="mh"><div class="mi">${I(o.icon)}</div><div><h2>${E(o.t)}</h2><span class="opt" style="margin-top:6px">${I("spark")}<span class="ol">Дополнительная опция</span></span></div><button class="x" type="button" data-act="${close}" aria-label="Закрыть">${I("x")}</button></div><p>${E(o.d)}</p>${chat}<div class="note">Не входит в этапы. Можно добавить в любой этап или позже, по вашему желанию.</div>`;
  }

  // ===== плавная смена содержимого =====
  const T = new Map();
  const navAt = { desk: 0, 0: 0, 1: 0 };
  function swap(view, html, scroller, after) {
    clearTimeout(T.get(view));
    view.classList.add("out");
    T.set(view, setTimeout(() => {
      view.innerHTML = html;
      if (scroller) scroller.scrollTop = 0;
      view.classList.remove("out"); view.classList.add("pre");
      void view.offsetHeight;
      if (after) after();
      view.classList.remove("pre");
    }, 130));
  }
  function put(view, html, after) { clearTimeout(T.get(view)); view.classList.remove("out"); view.innerHTML = html; if (after) after(); }
  function decorate() { if (App.scenario) App.scenario.decorate(); }

  const slotEl = (i) => $("ps" + i);
  const sq = (i, sel) => slotEl(i).querySelector(sel);
  App.slotEl = slotEl; App.sq = sq;
  const clientSlot = () => (ui.mode !== "phone" ? -1 : ui.slots.slice(0, App.nPhones()).findIndex((s) => s.role === "client"));
  const hasUnread = () => st.S.notes.some((n) => n.clientId === st.ME && !n.read);

  let msKey = "";
  function chrome() {
    const b = document.body;
    b.dataset.mode = ui.mode; b.dataset.scn = ui.scn.on ? "on" : "off";
    $("phones").dataset.n = ui.phones;
    document.querySelectorAll("#modeSeg button").forEach((x) => x.classList.toggle("on", x.dataset.mode === ui.mode));
    document.querySelectorAll("#cntSeg button").forEach((x) => x.classList.toggle("on", +x.dataset.n === ui.phones));
    document.querySelectorAll("#deskRoles button").forEach((x) => x.classList.toggle("on", x.dataset.role === ui.deskRole));
    $("deskWho").textContent = DROLES[ui.deskRole].who;
    const dot = hasUnread();
    ui.slots.forEach((s, i) => {
      slotEl(i).dataset.role = s.role;
      slotEl(i).querySelectorAll(".prole button").forEach((x) => x.classList.toggle("on", x.dataset.role === s.role));
      sq(i, ".prole .dot").classList.toggle("show", dot && s.role !== "client");
    });
    // полоса ролей на настоящем телефоне
    const key = ui.mode, ms = $("msRoles");
    if (key !== msKey) {
      msKey = key;
      ms.innerHTML = ui.mode === "phone"
        ? PROLES.map(([k, t]) => `<button type="button" data-act="phoneRole" data-slot="0" data-role="${k}">${t}</button>`).join("")
        : Object.keys(DROLES).map((k) => `<button type="button" data-act="deskRole" data-role="${k}">${DROLES[k].t}${DROLES[k].stage ? '<em class="stg s2">Этап 2</em>' : ""}</button>`).join("");
    }
    const curRole = ui.mode === "phone" ? ui.slots[0].role : ui.deskRole;
    ms.querySelectorAll("button").forEach((x) => { const on = x.dataset.role === curRole; x.classList.toggle("on", on); });
  }
  App.chrome = chrome;
  function msReveal() { const on = $("msRoles").querySelector(".on"); if (on) $("msRoles").scrollLeft = Math.max(0, on.offsetLeft - 60); }

  function renderSide(anim) { const h = App.D.side(ui.deskRole, ui.desk, DROLES[ui.deskRole]); anim ? swap($("side"), h, null) : put($("side"), h); }
  function renderDesk(anim) {
    if (!App.D.allowed(ui.deskRole, ui.desk)) { ui.desk = DROLES[ui.deskRole].home; ui.deskP = null; }
    let h; try { h = App.D.screens[ui.desk](ui.deskP); } catch (e) { console.error(e); ui.desk = DROLES[ui.deskRole].home; ui.deskP = null; h = App.D.screens[ui.desk](); }
    anim ? swap($("deskView"), h, $("deskScroll"), () => { App.D.after(); decorate(); }) : put($("deskView"), h, () => { App.D.after(); decorate(); });
    chrome();
  }
  function renderSlot(i, anim) {
    const s = ui.slots[i];
    if (!App.P.has(s.role, s.screen)) { s.screen = PHOME[s.role]; s.p = null; }
    let h; try { h = App.P.render(i); } catch (e) { console.error(e); s.screen = PHOME[s.role]; s.p = null; h = App.P.render(i); }
    sq(i, ".ptabs").innerHTML = App.P.tabs(i);
    const after = () => { App.P.after(i); decorate(); };
    anim ? swap(sq(i, ".pv"), h, sq(i, ".pview"), after) : put(sq(i, ".pv"), h, after);
    if (s.role === "client" && clientSlot() === i) st.readNotes();
  }
  App.renderSlot = renderSlot;
  App.refresh = function (force) {
    const now = Date.now();
    if (force || now - navAt.desk > 320) {
      const sc = $("deskScroll").scrollTop, a = document.activeElement, keep = a && a.dataset && a.dataset.in && a.closest("#deskView") ? { k: a.dataset.in, s: a.selectionStart } : null;
      renderDesk(false); $("deskScroll").scrollTop = sc;
      if (keep) { const n = $("deskView").querySelector(`[data-in="${keep.k}"]`); if (n) { n.focus({ preventScroll: true }); try { n.setSelectionRange(keep.s, keep.s); } catch (e) { /* не текстовое поле */ } } }
    }
    ui.slots.forEach((s, i) => {
      if (!force && now - navAt[i] <= 320) return;
      const a = document.activeElement, typing = a && a.closest && a.closest("#ps" + i + " .pv") && (a.tagName === "INPUT" || a.tagName === "TEXTAREA");
      if (typing && !force) { sq(i, ".ptabs").innerHTML = App.P.tabs(i); return; }
      const sc = sq(i, ".pview").scrollTop; renderSlot(i, false); sq(i, ".pview").scrollTop = sc;
    });
    renderSide(false); chrome();
  };

  App.go = {
    desk(screen, p, role) {
      closeDesk();
      const roleChanged = role && role !== ui.deskRole;
      if (roleChanged) ui.deskRole = role;
      ui.desk = screen; ui.deskP = p == null ? null : p; navAt.desk = Date.now(); App.saveUI();
      renderDesk(true); renderSide(!!roleChanged);
      if (roleChanged) msReveal();
      if (App.scenario) App.scenario.onNav();
    },
    phone(i, screen, p, role) {
      closeSheet(i);
      const s = ui.slots[i], was = clientSlot() === i;
      if (role && role !== s.role) { s.role = role; hidePush(i); }
      s.screen = screen; s.p = p == null ? null : p; navAt[i] = Date.now(); App.saveUI();
      const unread = st.S.notes.filter((n) => n.clientId === st.ME && !n.read);
      renderSlot(i, true); chrome();
      if (clientSlot() === i && !was && unread.length) setTimeout(() => notePush(i, unread[0]), 420);
      if (role) msReveal();
      if (App.scenario) App.scenario.onNav();
    },
  };
  App.setMode = function (m) {
    if (m === ui.mode) return;
    closeDesk(); closeSheet();
    const unread = st.S.notes.filter((n) => n.clientId === st.ME && !n.read);
    ui.mode = m; App.saveUI(); chrome(); msReveal();
    const ci = clientSlot();
    if (ci >= 0 && unread.length) { st.readNotes(); setTimeout(() => notePush(ci, unread[0]), 520); }
    if (App.scenario) App.scenario.onNav();
  };
  App.setPhones = function (n) { ui.phones = n === 1 ? 1 : 2; App.saveUI(); chrome(); if (App.scenario) App.scenario.onNav(); };

  // ===== окна компьютера, шторки телефона =====
  function openDesk(kind, html, wide) {
    const el = $(kind), other = kind === "drawer" ? $("modal") : $("drawer");
    other.classList.remove("show"); el.innerHTML = html; el.scrollTop = 0; el.classList.toggle("wide", !!wide);
    requestAnimationFrame(() => { el.classList.add("show"); $("deskDim").classList.add("show"); decorate(); });
  }
  function closeDesk() { $("drawer").classList.remove("show"); $("modal").classList.remove("show"); $("deskDim").classList.remove("show"); }
  App.drawer = (h) => openDesk("drawer", h);
  App.modal = (h, wide) => openDesk("modal", h, wide);
  App.modalOpen = () => $("modal").classList.contains("show");
  App.closeDesk = closeDesk;
  App.sheet = (i, h) => { const s = sq(i, ".psheet"); s.innerHTML = '<div class="grab"></div>' + h; s.scrollTop = 0; requestAnimationFrame(() => { s.classList.add("show"); sq(i, ".pdim").classList.add("show"); decorate(); }); };
  App.sheetOpen = (i) => sq(i, ".psheet").classList.contains("show");
  function closeSheet(i) { (i == null ? [0, 1] : [i]).forEach((k) => { sq(k, ".psheet").classList.remove("show"); sq(k, ".pdim").classList.remove("show"); }); }
  App.closeSheet = closeSheet;
  App.overlay = (h) => { $("ovCard").innerHTML = h; $("ov").classList.add("show"); };
  App.closeOverlay = () => $("ov").classList.remove("show");
  let toastT = 0;
  App.toast = (text, ic) => { const t = $("toast"); t.innerHTML = I(ic || "check") + "<span>" + E(text) + "</span>"; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3400); };
  App.opt = (k, slot) => (slot == null ? App.modal(optHtml(k, "closeDesk")) : App.sheet(slot, optHtml(k, "closeSheet")));

  // ===== уведомления: на экране телефона и в окне компьютера =====
  const pushT = {}, pushGo = {};
  function showPush(i, title, text, go) {
    const p = sq(i, ".push"); pushGo[i] = go || null;
    p.innerHTML = `<span class="mk">${I("box")}</span><div><b>${E(title)}</b><p>${E(text)}</p></div><small>${ui.slots[i].lang === "zh" && go && go[0] === "chat" ? "刚刚" : "сейчас"}</small>`;
    p.classList.remove("show"); void p.offsetWidth; p.classList.add("show");
    clearTimeout(pushT[i]); pushT[i] = setTimeout(() => p.classList.remove("show"), 6500);
  }
  function hidePush(i) { clearTimeout(pushT[i]); sq(i, ".push").classList.remove("show"); }
  function notePush(i, n) { showPush(i, "Центр логистики", n.text, n.ref ? ["citem", n.ref.t + ":" + n.ref.id] : ["ships", null]); }
  App.showPush = showPush;
  st.on("push", (n) => {
    const i = clientSlot();
    if (i >= 0) { notePush(i, n); n.read = true; st.save(); }
    chrome();
  });
  let dpT = 0, dpGo = null;
  App.dpush = (title, text, go) => {
    const p = $("dpush"); dpGo = go;
    p.innerHTML = `<span class="mk">${I("chat")}</span><div><b>${E(title)}</b><p>${E(text)}</p></div>`;
    p.classList.remove("show"); void p.offsetWidth; p.classList.add("show");
    clearTimeout(dpT); dpT = setTimeout(() => p.classList.remove("show"), 7000);
  };

  // ===== обработчики =====
  const acts = (App.acts = Object.assign(App.acts || {}, {
    mode: (d) => App.setMode(d.mode),
    phones: (d) => App.setPhones(+d.n),
    deskRole: (d) => { App.closeOverlay(); if (d.role !== ui.deskRole) App.go.desk(DROLES[d.role].home, null, d.role); },
    phoneRole: (d) => { const i = App.cur; if (d.role !== ui.slots[i].role) App.go.phone(i, PHOME[d.role], null, d.role); },
    d: (d) => App.go.desk(d.s, d.p || null, d.role || null),
    p: (d) => App.go.phone(App.cur, d.s, d.p || null, null),
    lang: (d) => { const s = ui.slots[App.cur]; if (s.lang === d.l) return; s.lang = d.l; App.saveUI(); closeSheet(App.cur); renderSlot(App.cur, true); if (App.scenario) App.scenario.check("lang", d.l); },
    closeDesk: () => closeDesk(),
    closeSheet: () => closeSheet(App.cur),
    closeAny: () => { closeDesk(); closeSheet(); App.closeOverlay(); },
    opt: (d, el) => App.opt(d.k, el && el.closest(".pslot") ? App.cur : null),
    toast: (d) => App.toast(d.t, d.i),
    pushOpen: () => { const i = App.cur, go = pushGo[i]; hidePush(i); if (go) App.go.phone(i, go[0], go[1]); },
    dpushOpen: () => { $("dpush").classList.remove("show"); if (dpGo) App.go.desk(dpGo[0], dpGo[1]); },
    menu: () => App.overlay(`<h2 style="margin-top:0">Меню прототипа</h2>
      <div class="menu-list">
        <button type="button" data-act="scnStart">${I("play")}<span><b>Пройти сценарий</b><small>путь груза от трек-номера до выдачи, 3 минуты</small></span></button>
        <button type="button" data-act="menuMode">${I(ui.mode === "phone" ? "monitor" : "phone")}<span><b>Режим «${ui.mode === "phone" ? "Компьютер" : "Телефон"}»</b><small>${ui.mode === "phone" ? "экраны администратора, менеджеров и бухгалтера" : "склад, менеджер Китая, Москва, клиент"}</small></span></button>
        <button type="button" data-act="menuInc">${I("grid")}<span><b>Что входит</b><small>три этапа и шесть опций</small></span></button>
        <button type="button" data-act="reset">${I("refresh")}<span><b>Сбросить демо</b><small>вернуть исходные данные</small></span></button>
      </div><div class="of"><button class="btn lg block" type="button" data-act="closeAny">Закрыть</button></div>`),
    menuMode: () => { App.closeOverlay(); App.setMode(ui.mode === "phone" ? "desk" : "phone"); },
    menuInc: () => { App.closeOverlay(); App.setMode("desk"); App.go.desk("included"); },
    reset: () => App.overlay(`<span class="opt">${I("refresh")}<span class="ol">Сброс</span></span><h2>Начать демо заново?</h2><p>Все изменения, которые вы сделали в прототипе, пропадут, данные вернутся к исходным.</p><div class="of"><button class="btn pri lg" type="button" data-act="resetYes">Сбросить</button><button class="btn lg" type="button" data-act="closeAny">Отмена</button></div>`),
    resetYes: () => {
      App.closeOverlay(); closeDesk(); closeSheet(); hidePush(0); hidePush(1);
      const keep = ui.mode;
      st.reset(); Object.assign(ui, DEF(), { introSeen: true, mode: keep }); App.tmp = TMP();
      App.saveUI(); renderSide(true); renderDesk(true); renderSlot(0, true); renderSlot(1, true); chrome();
      if (App.scenario) App.scenario.render();
      App.toast("Демо сброшено, данные вернулись к исходным", "refresh");
    },
    introClose: () => { ui.introSeen = true; App.saveUI(); App.closeOverlay(); },
  }));
  function setCur(el) { const ps = el.closest("[data-slot]"); if (ps) App.cur = +ps.dataset.slot || 0; }
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]"); if (!el) return;
    const fn = acts[el.dataset.act]; if (!fn) return;
    e.preventDefault(); setCur(el); fn(el.dataset, el, e);
  });
  document.addEventListener("input", (e) => {
    const el = e.target.closest("[data-in]"); if (!el) return;
    const fn = App.ins && App.ins[el.dataset.in]; if (fn) { setCur(el); fn(el.value, el, e); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeDesk(); closeSheet(); App.closeOverlay(); }
    if (e.key === "Enter") { const el = e.target.closest && e.target.closest("[data-enter]"); if (el) { const root = el.closest(".pslot") || document, b = root.querySelector(el.dataset.enter); if (b && !b.disabled) { e.preventDefault(); b.click(); } } }
  });

  // окна и шторки уезжают за край контейнера: сам контейнер прокручиваться не должен (фокус в поле, клавиатура телефона)
  document.addEventListener("scroll", (e) => { const t = e.target; if (t && t.classList && (t.classList.contains("screen") || t.classList.contains("desk") || t.classList.contains("app") || t.classList.contains("stage")) && (t.scrollTop || t.scrollLeft)) { t.scrollTop = 0; t.scrollLeft = 0; } }, true);

  // изменения данных → мягкая перерисовка
  let refT = 0;
  st.on("change", () => { clearTimeout(refT); refT = setTimeout(() => App.refresh(), 0); });
  mobile.addEventListener("change", () => { chrome(); App.refresh(true); if (App.scenario) App.scenario.render(); });

  // часы в строке состояния
  function clock() { const d = new Date(), t = d.getHours() + ":" + u.pad(d.getMinutes()); document.querySelectorAll(".clock").forEach((c) => { c.textContent = t; }); }

  // ===== запуск =====
  const SIG = '<svg width="17" height="11" viewBox="0 0 17 11" aria-hidden="true"><rect x="0" y="7" width="3" height="4" rx="1" fill="#0f1b2d"/><rect x="4.6" y="5" width="3" height="6" rx="1" fill="#0f1b2d"/><rect x="9.2" y="2.6" width="3" height="8.4" rx="1" fill="#0f1b2d"/><rect x="13.8" y="0" width="3" height="11" rx="1" fill="#0f1b2d"/></svg>';
  [0, 1].forEach((i) => {
    slotEl(i).innerHTML = `<div class="seg light prole">${PROLES.map(([k, t]) => `<button type="button" data-act="phoneRole" data-role="${k}">${t}${k === "client" ? '<span class="dot"></span>' : ""}</button>`).join("")}</div>
      <div class="phone"><div class="screen">
        <div class="sbar"><span class="clock">9:41</span><span class="ind">${SIG}<span class="bat"></span></span></div>
        <div class="push" data-act="pushOpen"></div>
        <div class="pview"><div class="view pv"></div></div>
        <nav class="ptabs"></nav>
        <div class="pdim" data-act="closeSheet"></div>
        <div class="psheet"></div>
      </div></div>`;
  });
  $("brandMark").innerHTML = I("box");
  $("modeSeg").innerHTML = `<button type="button" data-act="mode" data-mode="desk">${I("monitor")}Компьютер</button><button type="button" data-act="mode" data-mode="phone">${I("phone")}Телефон</button>`;
  $("cntSeg").innerHTML = `<button type="button" data-act="phones" data-n="1">Один</button><button type="button" data-act="phones" data-n="2">Два</button>`;
  $("deskRoles").innerHTML = Object.keys(DROLES).map((k) => `<button type="button" data-act="deskRole" data-role="${k}"><b>${DROLES[k].t}${DROLES[k].stage ? '<em class="stg s2">Этап 2</em>' : ""}</b><small>${DROLES[k].s}</small></button>`).join("");
  $("btnScn").innerHTML = I("play") + "<span>Сценарий</span>";
  $("btnReset").innerHTML = I("refresh") + "<span>Сбросить демо</span>";
  $("msMenu").innerHTML = I("menu");
  clock(); setInterval(clock, 20000);
  renderSide(false); renderDesk(false); renderSlot(0, false); renderSlot(1, false); chrome(); msReveal();
  if (App.scenario) App.scenario.init();
  if (!ui.introSeen) {
    setTimeout(() => App.overlay(`<span class="opt">${I("spark")}<span class="ol">Прототип</span></span>
      <h2>Центр логистики: как это будет работать</h2>
      <p>${mobile.matches ? "Это кликабельный прототип вашей системы. Вверху выбор роли: склад в Китае, менеджер Китая, сотрудник в Москве, клиент, администратор. Экраны компьютера открываются через меню справа вверху." : "Это кликабельный прототип вашей системы. Вверху переключатель «Компьютер / Телефон»: на компьютере работают администратор и менеджеры, на телефоне склад в Китае, менеджер Китая, сотрудник в Москве и клиент. Всё, что делает одна роль, сразу видно у остальных."}</p>
      <ul><li>Клиент заранее вносит трек-номер, склад находит его груз по треку</li><li>Приходы от разных поставщиков собираются в один груз и уезжают частями</li><li>Склад работает на китайском, вы на русском</li><li>Этапы 2 и 3 из предложения тоже можно посмотреть, они помечены</li></ul>
      <p class="muted">Данные вымышленные. Можно смело нажимать всё подряд: «Сбросить демо» вернёт всё как было.</p>
      <div class="of"><button class="btn pri lg" type="button" data-act="scnStart">${I("play")}Пройти сценарий, 3 минуты</button><button class="btn lg" type="button" data-act="introClose">Осмотреться самостоятельно</button></div>`), 350);
  }
  // показываем страницу, когда готовы и шрифт, и интерфейс: без пустых кнопок и сдвигов
  window.__ar = 1; if (window.__fr) document.documentElement.classList.remove("fl");
  // прогреваем кэш фото, чтобы при переходах они появлялись сразу
  setTimeout(() => u.allPhotos().forEach((f) => { const im = new Image(); im.decoding = "async"; im.src = "img/" + f; }), 600);
})(window.App);
