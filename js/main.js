/* Оболочка: роли, навигация с плавной сменой экранов, окна, уведомления, запуск. */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, $ = (id) => document.getElementById(id);
  const UIKEY = "cl-ui-v1";
  const DEF = { deskRole: "admin", desk: "board", deskP: null, phoneRole: "warehouse", phone: "home", phoneP: null, introSeen: false, scn: { on: false, step: 0, min: false } };
  function loadUI() { try { const v = JSON.parse(localStorage.getItem(UIKEY) || "null"); if (v && v.desk) return v; } catch (e) { /* нет хранилища */ } return {}; }
  const ui = (App.ui = Object.assign(JSON.parse(JSON.stringify(DEF)), loadUI()));
  App.saveUI = () => { try { localStorage.setItem(UIKEY, JSON.stringify(ui)); } catch (e) { /* без сохранения */ } };
  App.tmp = { sel: [], draft: null, pack: {}, q: "", period: "m", clientsQ: "" };

  // ===== каталог дополнительных модулей =====
  App.OPT = {
    chat: { icon: "chat", t: "Чат с автопереводом", d: "Сотрудники в России и Китае переписываются прямо в системе. Каждый пишет на своём языке, собеседник сразу читает перевод. Можно отправлять фото и привязывать сообщения к поставке, WeChat для работы больше не нужен.", chat: true },
    invoice: { icon: "file", t: "Автоматическая накладная", d: "Накладная на отправку собирается в PDF по вашему шаблону из данных системы: клиент, места, вес, объём, стоимость. Одна кнопка вместо ручного заполнения." },
    voice: { icon: "mic", t: "Создание поставки голосом", d: "Сотрудник наговаривает: «ТехноДом, восемь мест, девяносто шесть килограммов», и карточка заполняется сама. Удобно, когда руки заняты коробками." },
    ocr: { icon: "scan", t: "Распознавание кода по фото", d: "Камера телефона читает код клиента прямо с коробки и сразу подставляет клиента. Код не нужно вводить вручную." },
    tariff: { icon: "wallet", t: "Расчёт стоимости по тарифам", d: "Ставки по направлениям и видам доставки: за кубометр, за килограмм или по плотности. Стоимость считается сама при упаковке, с учётом упаковки и страховки." },
    whatsapp: { icon: "send", t: "Уведомления клиентам в WhatsApp", d: "Клиенты получают статусы грузов в WhatsApp. Подключается через официального провайдера, у провайдера своя абонентская плата." },
    analytics: { icon: "chart", t: "Расширенная аналитика", d: "Загрузка склада, сроки на каждом этапе, доходность по клиентам и направлениям, прогноз объёмов на следующий месяц." },
    import: { icon: "download", t: "Перенос истории из Excel", d: "Переносим ваши текущие таблицы: клиентов и их коды, историю поставок и оплаты. Работа не останавливается ни на день." },
    clientChat: { icon: "chat", t: "Чат с менеджером для клиентов", d: "Клиент пишет менеджеру прямо в приложении, а не в WhatsApp. Переписка привязана к его грузам, менеджер отвечает с компьютера, история не теряется при смене менеджера.", client: true },
    sbp: { icon: "wallet", t: "Онлайн-оплата по СБП", d: "Клиент оплачивает доставку в приложении по QR-коду СБП. Оплата отмечается в системе сама, долг обнуляется без участия бухгалтера." },
    calc: { icon: "layers", t: "Калькулятор доставки для клиента", d: "Клиент заранее считает стоимость по весу и объёму, выбирает авто или ЖД и видит срок. Меньше вопросов менеджеру, больше заявок." },
    tgbot: { icon: "tg", t: "Бот «Где мой груз?» в Telegram", d: "Клиент пишет боту свой код или трек-номер и сразу получает статус, фото и дату прибытия. Отвечает круглосуточно, без менеджера." },
  };
  function optHtml(k) {
    const o = App.OPT[k]; if (!o) return "";
    const chat = o.client ? `<div class="chat-prev"><div class="bub me">Добрый день! Когда будет П-0352?<small>ТехноДом · клиент</small></div><div class="bub">Отправили вчера, трек ЦЛ-48231, прибытие около 24 ноября<small>Ольга · менеджер</small></div></div>` : o.chat ? `<div class="chat-prev"><div class="bub">Груз MSK-117 упакован, 8 мест, можно отправлять?<small>Ли Вэй · переведено с китайского</small></div><div class="bub me">Да, отправляем сегодня авто<small>Ольга · собеседник читает по-китайски</small></div></div>` : "";
    return `<div class="mh"><div class="mi">${u.icon(o.icon)}</div><div><h2>${u.esc(o.t)}</h2><span class="opt" style="margin-top:6px">${u.icon("spark")}Дополнительная опция</span></div><button class="x" type="button" data-act="closeAny" aria-label="Закрыть">${u.icon("x")}</button></div><p>${u.esc(o.d)}</p>${chat}<div class="note">Не входит в первую версию. Добавляется по вашему выбору сразу или следующим этапом, стоимость указана в предложении.</div>`;
  }

  // ===== плавная смена содержимого =====
  const T = new Map();
  let navAt = { desk: 0, phone: 0 };
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
  function put(view, html, after) { view.innerHTML = html; if (after) after(); }

  const ROLE = { admin: { who: "Рамиль · администратор", ava: "РМ", name: "Рамиль", role: "Администратор" }, manager: { who: "Ольга · менеджер в России", ava: "ОК", name: "Ольга Королёва", role: "Менеджер в России" } };

  function setOn(sel, val) { document.querySelectorAll(sel).forEach((b) => b.classList.toggle("on", b.dataset.role === val)); }
  function chrome() {
    $("deskUrl").innerHTML = u.icon("pin") + "центр-логистики" + u.NB + "·" + u.NB + u.esc(App.D.title(ui.desk));
    $("deskWho").textContent = ROLE[ui.deskRole].who;
    setOn("#deskRoles button", ui.deskRole); setOn("#phoneRoles button", ui.phoneRole);
    const unread = st.S.notes.some((n) => n.clientId === st.ME && !n.read);
    $("clientDot").classList.toggle("show", unread && ui.phoneRole !== "client");
    $("pcap").textContent = { client: "Телефон клиента: приложение открывается по ссылке, как у банков", admin: "Телефон администратора. Менеджер в России тоже работает с телефона", warehouse: "Телефон сотрудника склада в Иу" }[ui.phoneRole] || "";
  }
  function decorate() { if (App.scenario) App.scenario.decorate(); }

  function renderSide(anim) { const h = App.D.side(ui.deskRole, ui.desk, ROLE[ui.deskRole]); anim ? swap($("side"), h, null) : put($("side"), h); }
  function renderDesk(anim) {
    if (!App.D.screens[ui.desk]) { ui.desk = ui.deskRole === "manager" ? "dispatch" : "board"; ui.deskP = null; }
    let h; try { h = App.D.screens[ui.desk](ui.deskP); } catch (e) { console.error(e); ui.desk = "board"; ui.deskP = null; h = App.D.screens.board(); }
    anim ? swap($("deskView"), h, $("deskScroll"), decorate) : put($("deskView"), h, decorate);
    chrome();
  }
  function renderPhone(anim) {
    const homeOf = { client: "ships", admin: "asum", warehouse: "home" };
    if (!App.P.screens[ui.phone]) { ui.phone = homeOf[ui.phoneRole] || "home"; ui.phoneP = null; }
    let h; try { h = App.P.screens[ui.phone](ui.phoneP); } catch (e) { console.error(e); ui.phone = homeOf[ui.phoneRole] || "home"; ui.phoneP = null; h = App.P.screens[ui.phone](); }
    $("ptabs").innerHTML = App.P.tabs(ui.phoneRole, ui.phone);
    anim ? swap($("phoneView"), h, $("phoneScroll"), decorate) : put($("phoneView"), h, decorate);
    if (ui.phoneRole === "client") st.readNotes();
    chrome();
  }
  App.refresh = function (force) {
    const now = Date.now();
    if (force || now - navAt.desk > 320) { const sc = $("deskScroll").scrollTop; renderDesk(false); $("deskScroll").scrollTop = sc; }
    if (force || now - navAt.phone > 320) {
      const a = document.activeElement;
      const typing = a && a.closest && a.closest("#phoneView") && (a.tagName === "INPUT" || a.tagName === "TEXTAREA");
      if (!typing) { const sc = $("phoneScroll").scrollTop; renderPhone(false); $("phoneScroll").scrollTop = sc; }
    }
    renderSide(false); chrome();
  };

  App.go = {
    desk(screen, p, role) {
      closeDesk();
      const roleChanged = role && role !== ui.deskRole;
      if (roleChanged) ui.deskRole = role;
      ui.desk = screen; ui.deskP = p == null ? null : p; navAt.desk = Date.now(); App.saveUI();
      renderDesk(true); renderSide(!!roleChanged);
      if (App.scenario) App.scenario.onNav();
    },
    phone(screen, p, role) {
      closeSheet();
      const wasClient = ui.phoneRole === "client";
      if (role) ui.phoneRole = role;
      ui.phone = screen; ui.phoneP = p == null ? null : p; navAt.phone = Date.now(); App.saveUI();
      const unread = st.S.notes.filter((n) => n.clientId === st.ME && !n.read);
      renderPhone(true);
      if (ui.phoneRole === "client" && !wasClient && unread.length) setTimeout(() => showPush(unread[0]), 420);
      if (App.scenario) App.scenario.onNav();
    },
  };

  // ===== окна =====
  function openDesk(kind, html) {
    const el = $(kind), other = kind === "drawer" ? $("modal") : $("drawer");
    other.classList.remove("show"); el.innerHTML = html; el.scrollTop = 0;
    requestAnimationFrame(() => { el.classList.add("show"); $("deskDim").classList.add("show"); decorate(); });
  }
  function closeDesk() { $("drawer").classList.remove("show"); $("modal").classList.remove("show"); $("deskDim").classList.remove("show"); }
  App.drawer = (h) => openDesk("drawer", h);
  App.modal = (h) => openDesk("modal", h);
  App.closeDesk = closeDesk;
  App.sheet = (h) => { const s = $("psheet"); s.innerHTML = '<div class="grab"></div>' + h; s.scrollTop = 0; requestAnimationFrame(() => { s.classList.add("show"); $("pdim").classList.add("show"); decorate(); }); };
  function closeSheet() { $("psheet").classList.remove("show"); $("pdim").classList.remove("show"); }
  App.closeSheet = closeSheet;
  App.overlay = (h) => { $("ovCard").innerHTML = h; $("ov").classList.add("show"); };
  App.closeOverlay = () => $("ov").classList.remove("show");
  let toastT = 0;
  App.toast = (text, ic) => { const t = $("toast"); t.innerHTML = u.icon(ic || "check") + "<span>" + u.esc(text) + "</span>"; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200); };
  App.opt = (k, inPhone) => (inPhone ? App.sheet(optHtml(k).replace('data-act="closeAny"', 'data-act="closeSheet"')) : App.modal(optHtml(k)));

  // ===== уведомление на телефоне клиента =====
  let pushT = 0, pushShip = null;
  function showPush(n) {
    const p = $("push");
    const m = /П-\d+/.exec(n.text); pushShip = m ? m[0] : null;
    p.innerHTML = `<span class="mk">${u.icon("box")}</span><div><b>Центр логистики</b><p>${u.esc(n.text)}</p></div><small>сейчас</small>`;
    p.classList.remove("show"); void p.offsetWidth; p.classList.add("show");
    clearTimeout(pushT); pushT = setTimeout(() => p.classList.remove("show"), 6000);
  }
  st.on("push", (n) => {
    if (ui.phoneRole === "client") { showPush(n); n.read = true; st.save(); }
    chrome();
  });

  // ===== обработчики =====
  const acts = (App.acts = Object.assign(App.acts || {}, {
    deskRole: (d) => { if (d.role !== ui.deskRole) App.go.desk(d.role === "manager" ? "dispatch" : "board", null, d.role); },
    phoneRole: (d) => { if (d.role !== ui.phoneRole) App.go.phone({ client: "ships", admin: "asum", warehouse: "home" }[d.role], null, d.role); },
    d: (d) => App.go.desk(d.s, d.p || null, d.role || null),
    p: (d) => App.go.phone(d.s, d.p || null, d.role || null),
    closeDesk: () => closeDesk(),
    closeSheet: () => closeSheet(),
    closeAny: () => { closeDesk(); closeSheet(); App.closeOverlay(); },
    opt: (d, el) => App.opt(d.k, !!el.closest(".screen")),
    toast: (d) => App.toast(d.t, d.i),
    pushOpen: () => { $("push").classList.remove("show"); if (ui.phoneRole === "client") App.go.phone(pushShip ? "ship" : "ships", pushShip); },
    reset: () => App.overlay(`<span class="opt">${u.icon("refresh")}Сброс</span><h2>Начать демо заново?</h2><p>Все изменения, которые вы сделали в прототипе, пропадут, данные вернутся к исходным.</p><div class="of"><button class="btn pri lg" type="button" data-act="resetYes">Сбросить</button><button class="btn lg" type="button" data-act="closeAny">Отмена</button></div>`),
    resetYes: () => {
      App.closeOverlay(); closeDesk(); closeSheet();
      st.reset(); Object.assign(ui, JSON.parse(JSON.stringify(DEF)), { introSeen: true }); App.tmp.sel = []; App.tmp.draft = null; App.tmp.pack = {};
      App.saveUI(); renderSide(true); renderDesk(true); renderPhone(true); chrome();
      if (App.scenario) App.scenario.render();
      App.toast("Демо сброшено, данные вернулись к исходным", "refresh");
    },
  }));
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]"); if (!el) return;
    const fn = acts[el.dataset.act]; if (!fn) return;
    e.preventDefault(); fn(el.dataset, el, e);
  });
  document.addEventListener("input", (e) => {
    const el = e.target.closest("[data-in]"); if (!el) return;
    const fn = App.ins && App.ins[el.dataset.in]; if (fn) fn(el.value, el, e);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeDesk(); closeSheet(); App.closeOverlay(); }
    if (e.key === "Enter") { const el = e.target.closest && e.target.closest("[data-enter]"); if (el) { const b = document.querySelector(el.dataset.enter); if (b && !b.disabled) b.click(); } }
  });

  // изменения данных → мягкая перерисовка
  let refT = 0;
  st.on("change", () => { clearTimeout(refT); refT = setTimeout(() => App.refresh(), 0); });

  // часы в строке состояния
  function clock() { const d = new Date(); $("clock").textContent = d.getHours() + ":" + u.pad(d.getMinutes()); }
  clock(); setInterval(clock, 20000);

  // ===== запуск =====
  $("brandMark").innerHTML = u.icon("box");
  $("btnScn").innerHTML = u.icon("play") + "Сценарий";
  $("btnReset").innerHTML = u.icon("refresh") + "Сбросить демо";
  renderSide(false); renderDesk(false); renderPhone(false); chrome();
  if (App.scenario) App.scenario.init();
  if (!ui.introSeen) {
    setTimeout(() => App.overlay(`<span class="opt">${u.icon("spark")}Прототип</span>
      <h2>Центр логистики: как это будет работать</h2>
      <p>Это кликабельный прототип вашей системы. Слева компьютер администратора или менеджера в России, справа телефон склада в Китае или клиента. Всё, что вы нажимаете, сразу видно у других ролей.</p>
      <ul><li>Склад принимает груз с фото, клиенту сразу приходит уведомление</li><li>Грузы движутся по этапам на общей доске</li><li>Менеджер собирает отправку и присваивает трек-номер</li><li>Деньги, долги и отчёты в одном месте</li></ul>
      <p class="muted">Данные вымышленные. Можно смело нажимать всё подряд: кнопка «Сбросить демо» вернёт всё как было.</p>
      <div class="of"><button class="btn pri lg" type="button" data-act="scnStart">${u.icon("play")}Пройти сценарий, 2 минуты</button><button class="btn lg" type="button" data-act="introClose">Осмотреться самостоятельно</button></div>`), 350);
  }
  acts.introClose = () => { ui.introSeen = true; App.saveUI(); App.closeOverlay(); };
  // показываем страницу, когда готовы и шрифт, и интерфейс: без пустых кнопок и сдвигов
  window.__ar = 1; if (window.__fr) document.documentElement.classList.remove("fl");
  // прогреваем кэш фото, чтобы при переходах они появлялись сразу
  setTimeout(() => u.allPhotos().forEach((f) => { const im = new Image(); im.decoding = "async"; im.src = "img/" + f; }), 600);
})(window.App);
