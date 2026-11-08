/* Сценарий: ведёт по пути груза от склада до оплаты, из него можно выйти в любой момент. */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, I = u.icon, E = u.esc;
  const $ = (id) => document.getElementById(id);
  const sc = () => App.ui.scn;
  const newId = () => sc().newId;
  const q = (sel) => document.querySelector(sel);
  const modalOpen = () => $("modal").classList.contains("show");

  const STEPS = [
    { k: "accept", who: ["box", "Склад в Китае"], t: "Примите груз на складе",
      p: "Вы кладовщик в Иу. Пришли коробки с кодом MSK-117. Введите код, сделайте фото, укажите места, вес и объём. Кнопка «Принять» откроется, когда всё заполнено.",
      go: () => App.go.phone("accept", null, "warehouse"),
      hl: () => { const d = App.tmp.draft || { code: "", photos: [] }; if (App.ui.phone !== "accept") return '[data-act="p"][data-s="accept"]'; if (!d.code) return '[data-hl="acc-code"]'; if (!d.photos.length) return '[data-hl="acc-cam"]'; const b = q("#btnAccept"); return b && !b.disabled ? '[data-hl="acc-go"]' : null; } },
    { k: "client", who: ["user", "Клиент"], t: "Клиенту уже пришло уведомление",
      p: "Это телефон клиента. Он сразу видит, что груз принят, с фото со склада. Откройте карточку нового груза.",
      go: () => App.go.phone("ships", null, "client"),
      hl: () => (App.ui.phoneRole !== "client" ? '#phoneRoles [data-role="client"]' : App.ui.phone === "ships" ? `[data-cs="${newId()}"]` : App.ui.phone === "ship" ? null : '[data-tab="ships"]') },
    { k: "board", who: ["board", "Администратор"], t: "Груз на общей доске",
      p: "Слева компьютер администратора. Новая поставка уже в колонке «Принят на складе». Откройте её: фото, история, кто и когда принял.",
      go: () => App.go.desk("board", null, "admin"),
      hl: () => (App.ui.deskRole !== "admin" ? '#deskRoles [data-role="admin"]' : App.ui.desk !== "board" ? '[data-nav="board"]' : `[data-sc="${newId()}"]`) },
    { k: "pack", who: ["layers", "Склад в Китае"], t: "Упакуйте груз",
      p: "Склад выбирает вид упаковки, указывает вес и объём после упаковки и делает фото. Стоимость для клиента считается сама.",
      go: () => { App.closeDesk(); App.go.phone("packForm", newId(), "warehouse"); },
      hl: () => { if (App.ui.phone !== "packForm") return `[data-pk="${newId()}"]`; const d = App.tmp.pack[newId()] || {}; if (!d.packType) return '[data-hl="pack-type"]'; if (!(d.photos || []).length) return '[data-hl="pack-cam"]'; const b = q("#btnPack"); return b && !b.disabled ? '[data-hl="pack-go"]' : null; } },
    { k: "ship", who: ["truck", "Менеджер в России"], t: "Соберите отправку",
      p: "Это компьютер менеджера в России. Отметьте упакованные грузы ТехноДома и сформируйте отправку. Трек-номер присвоится сам.",
      go: () => App.go.desk("dispatch", null, "manager"),
      hl: () => { if (App.ui.deskRole !== "manager") return '#deskRoles [data-role="manager"]'; if (App.ui.desk !== "dispatch") return '[data-nav="dispatch"]'; if (modalOpen()) return "#btnDispatchGo"; return App.tmp.sel.includes(newId()) ? "#btnDispatch" : `[data-sel="${newId()}"]`; } },
    { k: "track", who: ["user", "Клиент"], t: "У клиента трек-номер",
      p: "Клиент получил уведомление: груз в пути, трек-номер и дата прибытия. Больше не нужно спрашивать менеджера «где мой груз».",
      go: () => App.go.phone("ship", newId(), "client"), manual: true,
      hl: () => (App.ui.phone === "ship" ? '[data-hl="client-track"]' : null) },
    { k: "pay", who: ["wallet", "Администратор"], t: "Отметьте оплату",
      p: "В финансах видно, кто сколько должен. Отметьте оплату ТехноДома: долг обнулится, а клиент получит подтверждение.",
      go: () => App.go.desk("finance", null, "admin"),
      hl: () => (App.ui.deskRole !== "admin" ? '#deskRoles [data-role="admin"]' : App.ui.desk !== "finance" ? '[data-nav="finance"]' : modalOpen() ? "#btnPayGo" : `[data-pay="${st.ME}"]`) },
    { k: "end", who: ["spark", "Готово"], t: "Это и есть первая версия",
      p: "Вы прошли путь груза от склада в Китае до оплаты. В разделе «Что входит» собраны все функции первой версии и дополнительные модули на выбор.",
      go: () => { App.go.desk("included", null, "admin"); App.go.phone("ships", null, "client"); }, final: true, hl: () => null },
  ];
  const N = STEPS.length - 1;

  function dock() {
    const s = sc(), el = $("dock");
    let h;
    if (!s.on) {
      h = `<div class="free"><span>Прототип для обсуждения. Данные вымышленные.</span><button class="btn sm" type="button" data-act="scnStart">${I("play")}Пройти сценарий</button></div>`;
    } else {
      const step = STEPS[s.step], pct = Math.round((Math.min(s.step, N) / N) * 100);
      const wait = !step.manual && !step.final;
      h = `<div class="stp" style="--p:${pct}"><span>${step.final ? I("check") : s.step + 1 + "/" + N}</span></div>
        <div class="txt"><h4>${E(step.t)}<span class="who">${I(step.who[0])}${E(step.who[1])}</span></h4><p>${E(step.p)}</p></div>
        <div class="acts">${wait ? '<span class="waiting"><i></i>ждём ваше действие</span>' : ""}
          ${step.final ? `<button class="btn pri" type="button" data-act="scnEnd">${I("check")}Завершить</button>` : `<button class="btn" type="button" data-act="scnShow">Показать, где</button>`}
          ${step.manual ? `<button class="btn pri" type="button" data-act="scnNext">Дальше</button>` : ""}
          ${step.final ? "" : `<button class="btn ghost" type="button" data-act="scnEnd" title="Выйти из сценария">${I("exit")}Выйти</button>`}</div>`;
    }
    if (el.dataset.k === (s.on ? "s" + s.step : "off")) { el.innerHTML = h; return; }
    el.dataset.k = s.on ? "s" + s.step : "off";
    el.classList.add("out");
    setTimeout(() => { el.innerHTML = h; el.classList.remove("out"); el.classList.add("pre"); void el.offsetHeight; el.classList.remove("pre"); }, 130);
  }

  function decorate() {
    document.querySelectorAll(".hl").forEach((e) => e.classList.remove("hl"));
    const s = sc(); if (!s.on) return;
    const step = STEPS[s.step]; if (!step) return;
    const sel = step.hl && step.hl(); if (!sel) return;
    const el = q(sel); if (el) el.classList.add("hl");
  }
  let advT = 0;
  function goStep(i, delay) {
    clearTimeout(advT);
    const run = () => { sc().step = Math.min(i, N); App.saveUI(); dock(); STEPS[sc().step].go(); setTimeout(decorate, 420); };
    delay ? (advT = setTimeout(run, delay)) : run();
  }
  function check(ev, data) {
    const s = sc(); if (!s.on) return;
    const k = STEPS[s.step].k;
    if (k === "accept" && ev === "accepted") { s.newId = data.id; App.saveUI(); goStep(s.step + 1, 1400); }
    else if (k === "client" && ev === "nav" && App.ui.phoneRole === "client" && App.ui.phone === "ship" && App.ui.phoneP === s.newId) goStep(s.step + 1, 1600);
    else if (k === "board" && ev === "openShip" && data === s.newId) goStep(s.step + 1, 1800);
    else if (k === "pack" && ev === "packed" && data === s.newId) goStep(s.step + 1, 1000);
    else if (k === "ship" && ev === "dispatched" && data && data.shipIds.includes(s.newId)) goStep(s.step + 1, 1100);
    else if (k === "pay" && ev === "paid" && data && data.clientId === st.ME) goStep(s.step + 1, 1300);
    setTimeout(decorate, 60);
  }
  st.on("paid", (d) => check("paid", d));

  function start() {
    App.closeOverlay(); App.ui.introSeen = true;
    const s = sc(); s.on = true; s.step = 0; s.newId = null;
    App.tmp.draft = null;
    App.saveUI(); goStep(0);
  }
  function stop(silent) {
    clearTimeout(advT); const s = sc(); s.on = false; App.saveUI(); dock(); decorate();
    if (!silent) App.toast("Сценарий закрыт. Запустить снова можно кнопкой «Сценарий» вверху", "info");
  }

  Object.assign(App.acts, {
    scnStart: () => start(),
    scnOpen: () => { if (sc().on) { STEPS[sc().step].go(); setTimeout(decorate, 420); } else start(); },
    scnShow: () => { STEPS[sc().step].go(); setTimeout(decorate, 420); },
    scnNext: () => goStep(sc().step + 1),
    scnEnd: () => { const fin = STEPS[sc().step].final; stop(fin); if (fin) App.toast("Спасибо! Дальше можно осматриваться самостоятельно", "check"); },
  });

  App.scenario = {
    init() { dock(); decorate(); },
    render: dock, decorate, check,
    onNav() { check("nav"); },
    isStep: (k) => sc().on && STEPS[sc().step] && STEPS[sc().step].k === k,
  };
})(window.App);
