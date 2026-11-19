/* Экраны телефона. Два независимых телефона (слота), у каждого своя роль, экран и язык.
   Слот 0: склад в Китае (пять вкладок, рабочий китайский интерфейс), слот 1: клиент. */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, I = u.icon, E = u.esc, ME = st.ME;
  let cur = 0, slot = App.ui ? App.ui.slots[0] : null, T = App.i18n.of("ru");
  const zhRole = (r) => r === "warehouse";
  function ctx(i) { cur = i || 0; slot = App.ui.slots[cur]; T = App.i18n.of(zhRole(slot.role) ? slot.lang : "ru"); }
  const q = (sel) => App.slotEl(cur).querySelector(sel);
  const shown = (i) => App.ui.mode === (i === 0 ? "wh" : "client");
  const pill = (s, label) => `<span class="st" data-st="${s}">${label || T.t("st_" + s)}</span>`;
  const stg = (n) => `<em class="stg s${n}">${n === 3 ? T.t("stage3") : "Этап " + n}</em>`;
  const optBtn = (k, label) => `<button class="opt" type="button" data-act="opt" data-k="${k}">${I((App.OPT[k] || {}).icon || "spark")}<span class="ol">${E(label)}</span><i>${T.t("opt")}</i></button>`;
  const head = (t, small, right) => `<div class="phead"><div><small>${small}</small><h2>${t}</h2></div>${right || ""}</div>`;
  const langSw = () => `<div class="lang" data-hl="lang"><button type="button" class="${slot.lang === "ru" ? "on" : ""}" data-act="lang" data-l="ru">RU</button><button type="button" class="${slot.lang === "zh" ? "on" : ""}" data-act="lang" data-l="zh">中文</button></div>`;
  const cn = (id) => (st.client(id) || {}).name || "";
  const line = (k, v) => `<div class="pline"><span>${k}</span><b>${v}</b></div>`;
  const empty = (t) => `<p class="pempty">${t}</p>`;
  const paidPill = (s) => (st.isPaid(s) ? '<span class="st" data-st="in">оплачено</span>' : s.paidUsd > 0 ? `<span class="st" data-st="pack">оплачено ${u.usd(s.paidUsd)}</span>` : '<span class="st" data-st="unk">не оплачено</span>');
  const photos3 = (list, kind) => (list.length ? `<div class="photos">${list.slice(0, 3).map((p) => `<button class="ph-i" type="button" data-act="zoom" data-p="${p}" data-kind="${kind || ""}">${u.photo(p, kind)}</button>`).join("")}</div>` : `<div class="ph-none">${I("camera")}${T.t("no_photo")}</div>`);
  const dmgI = (r) => (r.damage ? `<i class="dmgi" title="${T.t("acc_dmg")}">!</i>` : "");
  let photoSeq = 500;

  const SCREENS = {
    warehouse: ["accept", "accepted", "stock", "stockc", "tasks", "task", "packs", "packf", "packed", "done", "donec", "report", "reportk", "chats", "chat"],
    client: ["ships", "citem", "await", "pay", "profile"],
  };
  const has = (role, screen) => (SCREENS[role] || []).includes(screen);

  function tabs(i) {
    ctx(i);
    const r = slot.role;
    const map = r === "client" ? [["ships", "box", "Грузы"], ["await", "clock", "Жду"], ["pay", "wallet", "Оплаты"], ["profile", "user", "Профиль"]]
      : [["accept", "plus", T.t("tab_accept")], ["tasks", "list", T.t("tab_tasks")], ["packs", "layers", T.t("tab_packs")], ["done", "box", T.t("tab_done")], ["report", "chart", T.t("tab_report")]];
    const curTab = { accepted: "accept", stock: "accept", stockc: "accept", task: "tasks", packf: "packs", packed: "packs", donec: "done", reportk: "report", chat: "chats", citem: "ships" }[slot.screen] || slot.screen;
    const badge = r === "warehouse" ? { tasks: st.openTasks(slot.wh, "collect").length, packs: st.openTasks(slot.wh, "packing").length }
      : { pay: st.money(ME).debt > 0.5 ? 1 : 0 };
    return map.map(([k, ic, t, sg]) => `<button type="button" class="${curTab === k ? "on" : ""}" data-act="p" data-s="${k}" data-tab="${k}">${I(ic)}<span>${t}${sg ? `<em> · ${T.t("stage3").toLowerCase()}</em>` : ""}</span><i class="${badge[k] ? "show" : ""}">${badge[k] || ""}</i></button>`).join("");
  }
  function render(i) { ctx(i); return (S_[slot.screen] || S_[App.PHOME[slot.role]])(slot.p); }
  function after(i) { ctx(i); if (slot.screen === "chat") { const v = App.sq(i, ".pview"); v.scrollTop = v.scrollHeight; } }
  // перерисовать экран на месте, не теряя прокрутку
  function rr() { const v = q(".pview"), top = v.scrollTop; App.renderSlot(cur, false); v.scrollTop = top; }

  // ================= СКЛАД В КИТАЕ =================
  const whName = () => T.wh(st.wh(slot.wh));
  const whSel = () => `<button class="whsel" type="button" data-act="whPick" data-hl="wh-pick">${E(T.t("wh_title", whName()))}${I("down")}</button>`;
  const chatB = () => { const n = st.unreadAll("zh", slot.wh); return `<button class="x soft chatb" type="button" data-act="p" data-s="chats" title="${T.t("tab_chat")} · ${T.t("stage3")}" aria-label="${T.t("tab_chat")}">${I("lang")}${n ? `<i>${n}</i>` : ""}</button>`; };
  const whHead = (t) => head(t, whSel(), `<span class="hr">${chatB()}${langSw()}</span>`);
  function whSheet() {
    App.sheet(cur, `<h3>${T.t("wh_pick")}</h3><p>${T.t("wh_pick_s")}</p><div class="choice">${st.WH.map((w) => `<button type="button" class="${w.id === slot.wh ? "on" : ""}" data-act="whSet" data-k="${w.id}">${I("wh")}<span class="grow">${E(T.wh(w))}<small>${E(st.who(st.WH_STAFF[w.id], T.lang))} · ${E(T.t("wh_cnt", st.S.receipts.filter((r) => r.wh === w.id && !r.cargoId).length + st.ready(w.id).length))}</small></span></button>`).join("")}</div>`);
  }
  const accSeg = (on) => `<div class="pseg two" data-hl="acc-seg"><button type="button" class="${on === "accept" ? "on" : ""}" data-act="p" data-s="accept">${I("plus")}${T.t("seg_accept")}</button><button type="button" class="${on === "stock" ? "on" : ""}" data-act="p" data-s="stock" data-seg="stock">${I("box")}${T.t("seg_stock")}</button></div>`;

  // ---------- 1. приёмка: ни одно поле не обязательно ----------
  function draft() {
    if (!App.tmp.acc) App.tmp.acc = { track: "", clientId: null, auto: false, supplier: "", what: "", expId: null, expAt: null, photos: [], places: 1, dmg: null, dmgText: "", dmgPhotos: [], dpay: null, deliv: "", extra: "", note: "" };
    return App.tmp.acc;
  }
  // трек, который клиент внёс заранее: клиент и поставщик подставляются сами
  function matchTrack(d) {
    const e = st.expectedByTrack(d.track);
    if (e && d.expId !== e.id) { d.expId = e.id; d.expAt = e.at; d.clientId = e.clientId; d.auto = true; d.supplier = e.supplier; d.what = e.what; return true; }
    if (!e && d.expId) { d.expId = null; d.expAt = null; d.auto = false; d.supplier = ""; d.what = ""; return true; }
    return false;
  }
  function camHtml(list, actAdd, kind) {
    return `<div class="cam">${list.map((p) => `<div class="shot">${u.photo(p, kind)}</div>`).join("")}${list.length < 3 ? `<button class="add" type="button" data-act="${actAdd}">${I("camera")}<span>${list.length ? T.t("cam_more") : T.t("cam_first")}</span></button>` : ""}</div>`;
  }
  const clientNote = (d) => (d.clientId ? (d.auto ? T.t("f_by_track") + (d.supplier ? " · " + E(d.supplier) : "") : T.t("f_by_hand")) : T.t("acc_unk_note"));
  function accept() {
    const d = draft();
    return `<div class="pp">${whHead(T.t("acc_title"))}${accSeg("accept")}
      <button class="scanb" type="button" data-act="scan" data-hl="acc-scan"><span class="ti">${I("scan")}</span><span><b>${T.t("scan_btn")}</b><small>${T.t("scan_btn_s")}</small></span>${I("chevron")}</button>
      <div class="fld"><span>${T.t("acc_client")}</span>${App.ta("acc", { val: d.clientId, ph: T.t("acc_client_ph"), hl: "acc-client" })}<div class="req left${d.clientId ? " ok" : ""}" data-f="accNote">${clientNote(d)}</div></div>
      <label class="fld mt8"><span>${T.t("acc_track")}</span><input class="inp mono" data-f="accTrack" data-in="accTrack" value="${E(d.track)}" placeholder="${T.t("acc_track_ph")}" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>
      <div class="fld mt"><span>${T.t("acc_photo")}</span><div data-f="cam" data-hl="acc-cam">${camHtml(d.photos, "accPhoto")}</div></div>
      <div class="fld mt"><span>${T.t("acc_places")}</span><div class="stepper" data-hl="acc-places"><button type="button" data-act="accPlaces" data-d="-1" aria-label="${T.t("a_less")}">${I("minus")}</button><input class="inp" data-f="accPl" data-in="accPlacesIn" inputmode="numeric" value="${d.places}"><button type="button" data-act="accPlaces" data-d="1" aria-label="${T.t("a_more")}">${I("plus")}</button></div></div>
      <div class="fld mt"><span>${T.t("acc_dmg")}</span><div class="choice cols2" data-hl="acc-dmg"><button type="button" class="${d.dmg === "no" ? "on" : ""}" data-act="accDmg" data-k="no">${T.t("dmg_no")}</button><button type="button" class="${d.dmg === "yes" ? "on" : ""}" data-act="accDmg" data-k="yes">${T.t("dmg_yes")}</button></div>
        <div class="doorbox" data-f="dmgBox" ${d.dmg === "yes" ? "" : "hidden"}><input class="inp" data-in="accIn" data-k="dmgText" value="${E(d.dmgText)}" placeholder="${T.t("dmg_ph")}"><div class="mt8" data-f="dcam">${camHtml(d.dmgPhotos, "accDmgPhoto")}</div></div></div>
      <div class="fld mt"><span>${T.t("acc_deliv")}</span><div class="choice cols2" data-hl="acc-door"><button type="button" class="${d.dpay === "supplier" ? "on" : ""}" data-act="accDoor" data-k="supplier">${T.t("door_sup")}</button><button type="button" class="${d.dpay === "wh" ? "on" : ""}" data-act="accDoor" data-k="wh">${T.t("door_wh")}</button></div>
        <div class="doorbox" data-f="doorBox" ${d.dpay === "wh" ? "" : "hidden"}><input class="inp" data-f="deliv" data-in="accIn" data-k="deliv" inputmode="numeric" value="${E(d.deliv)}" placeholder="${T.t("door_sum")}" data-hl="acc-door-sum"></div></div>
      <div class="row2 mt"><label class="fld"><span>${T.t("acc_extra")}</span><input class="inp" data-f="extra" data-in="accIn" data-k="extra" inputmode="numeric" value="${E(d.extra)}" placeholder="0"></label><label class="fld"><span>${T.t("acc_note")}</span><input class="inp" data-f="note" data-in="accIn" data-k="note" value="${E(d.note)}" placeholder="${T.t("acc_note_ph")}" autocomplete="off"></label></div>
      <div class="req left">${T.t("sum_hint")}</div>
      <div class="row wrap mt8">${optBtn("voice", T.t("opt_voice"))}</div>
      <div class="mt"><button class="btn pri lg block" type="button" data-f="btnAccept" data-act="accGo" data-hl="acc-go">${I("check")}${T.t("acc_go")}</button>
      <div class="req">${T.t("acc_free")}</div></div>
    </div>`;
  }
  const scanT = {};
  function scanStop(i) { clearTimeout(scanT[i]); const el = App.sq(i, ".scan"); el.classList.remove("show", "ok"); }
  function scanStart() {
    const i = cur, el = q(".scan"), s = App.ui.scn, exp = st.S.expected;
    // что «увидит» камера: в сценарии трек клиента, иначе последний внесённый клиентами, иначе новый
    const e = (s.on && s.track && exp.find((x) => x.track === s.track)) || exp[0];
    const track = e ? e.track : "YT" + String(Date.now()).slice(-13);
    el.innerHTML = `<div class="scan-bg">${u.photo(2)}</div><div class="scan-top"><b>${T.t("scan_btn")}</b><button class="x" type="button" data-act="scanCancel" aria-label="${T.t("scan_cancel")}">${I("x")}</button></div>
      <div class="scan-frame"><i></i><i></i><i></i><i></i><div class="scan-label"><div class="scan-bars"></div><span class="mono">${E(track)}</span></div><div class="scan-line"></div></div>
      <p class="scan-hint">${T.t("scan_hint")}</p><div class="scan-ok">${I("check")}<span><b>${T.t("scan_ok")}</b><small class="mono">${E(track)}</small></span></div>`;
    el.classList.remove("ok"); el.classList.add("show");
    clearTimeout(scanT[i]);
    scanT[i] = setTimeout(() => {
      el.classList.add("ok");
      scanT[i] = setTimeout(() => {
        el.classList.remove("show", "ok"); ctx(i);
        const d = draft(); d.track = track; matchTrack(d);
        if (slot.role === "warehouse" && slot.screen === "accept") rr();
        if (App.scenario) App.scenario.check("scanned", track);
      }, 900);
    }, 1500);
  }
  const delivLine = (r) => line(T.t("l_deliv"), r.dpay === "supplier" ? T.t("door_sup_l") : r.deliv ? u.cny(r.deliv) : T.t("door_none"));
  function recLines(r) {
    const c = r.clientId ? st.client(r.clientId) : null;
    return (c ? line(T.t("l_client"), E(c.id) + " · " + E(c.name)) : "") + line(T.t("l_wh"), E(T.wh(st.wh(r.wh)))) + (r.track ? line(T.t("l_track"), `<span class="mono">${E(r.track)}</span>`) : "") + (c && r.supplier ? line(T.t("l_sup"), E(r.supplier)) : "") + (r.what ? line(T.t("l_what"), E(r.what)) : "")
      + line(T.t("l_places"), T.places(r.places)) + line(T.t("l_dmg"), r.damage ? `<span class="bad">${E(st.noteText({ note: r.damage }, T.lang))}</span>` : T.t("dmg_none")) + delivLine(r) + (r.extra ? line(T.t("l_extra"), u.cny(r.extra)) : "") + (st.noteText(r, T.lang) ? line(T.t("l_note"), E(st.noteText(r, T.lang))) : "");
  }
  function accepted(id) {
    const r = st.rec(id); if (!r) return accept();
    return `<div class="pp center"><div class="okmark${r.clientId ? "" : " warn"}">${I(r.clientId ? "check" : "alert")}</div><h2 class="okh">${T.t(r.clientId ? "ok_title" : "ok_unk_title")}</h2>
      <p class="muted oks">${E(T.t(r.clientId ? "ok_sub" : "ok_unk_sub", r.id))}</p>
      <div class="pcard left">${photos3(r.photos)}${recLines(r)}</div>
      <button class="btn pri lg block" type="button" data-act="p" data-s="accept">${I("plus")}${T.t("ok_more")}</button>
      <button class="btn lg block mt8" type="button" data-act="p" data-s="stock">${T.t("ok_stock")}</button></div>`;
  }
  // «На складе»: коды клиентов, по нажатию грузы клиента карточками с фото, как в кабинете клиента
  function stockData(whId) {
    const g = {}; st.S.receipts.filter((r) => (!whId || r.wh === whId) && !r.cargoId).forEach((r) => (g[r.clientId || "unk"] = g[r.clientId || "unk"] || []).push(r));
    return g;
  }
  const codeRow = (g, cid, act, scr) => { const list = g[cid], unk = cid === "unk"; return `<button class="pcard stk${unk ? " warnc" : ""}" type="button" data-act="${act}" data-s="${scr}" data-p="${cid}" data-stk="${cid}"><span class="t"><span class="id">${unk ? I("alert") + T.t("stock_unk") : E(cid) + " · " + E(cn(cid))}</span><span class="n">${list.length}</span></span><span class="thumbs">${list.slice(0, 4).map((r) => `<span class="ph-i">${r.photos.length ? u.photo(r.photos[0]) : ""}</span>`).join("")}</span><span class="sub">${unk ? T.t("stock_unk_s") : T.goods(list.length) + " · " + T.places(list.reduce((a, r) => a + r.places, 0))}</span></button>`; };
  function recCardP(r, o) {
    o = o || {};
    const unk = !r.clientId, stt = unk ? "unk" : r.taskId ? "packing" : "in";
    return `<div class="pcard rcp${o.on ? " on" : ""}"${o.sel ? ` data-rc="${r.id}"` : ""}><div class="t"><span class="id mono">${dmgI(r)}${r.track ? E(r.track) : E(r.id)}</span>${o.sel ? `<button class="cbx${o.on ? " on" : ""}" type="button" data-act="${o.sel}" data-id="${r.id}" data-pk="${r.id}" aria-label="${T.t("tf_found")}">${o.on ? I("check") : ""}</button>` : pill(stt)}</div>
      ${photos3(r.photos)}<div class="m"><span>${T.places(r.places)}</span><span>${E(T.t("rec_at", T.when(r.at)))}</span>${r.deliv ? `<span>${T.t("l_deliv")}: ${u.cny(r.deliv)}</span>` : ""}</div>
      <div class="sub strong">${unk ? E(st.noteText(r, T.lang) || T.t("stock_unk_s")) : E(r.supplier)}</div>${r.damage ? `<div class="sub bad">${T.t("acc_dmg")}: ${E(st.noteText({ note: r.damage }, T.lang))}</div>` : ""}${r.lost ? `<div class="sub bad">${T.t("s_lost")}</div>` : o.sel ? "" : `<div class="sub">${E(r.id)} · ${T.t(r.taskId ? "s_task" : "s_wait")}</div>`}</div>`;
  }
  function stock() {
    const g = stockData(slot.wh), codes = Object.keys(g).filter((k) => k !== "unk").sort((a, b) => Math.max(...g[b].map((x) => x.at)) - Math.max(...g[a].map((x) => x.at)));
    return `<div class="pp">${whHead(T.t("acc_title"))}${accSeg("stock")}
      ${codes.map((cid) => codeRow(g, cid, "p", "stockc")).join("") || (g.unk ? "" : empty(T.t("stock_empty")))}${g.unk ? codeRow(g, "unk", "p", "stockc") : ""}
      <p class="phint">${T.t("stock_hint")}</p>
    </div>`;
  }
  function stockc(p) {
    const g = stockData(slot.wh), list = (g[p] || []).sort((a, b) => b.at - a.at); if (!list.length) return stock();
    const unk = p === "unk";
    return `<div class="pp"><div class="pback" data-act="p" data-s="stock">${I("back")}${T.t("seg_stock")}</div>
      ${head(unk ? T.t("stock_unk") : E(p), unk ? T.t("stock_unk_s") : E(cn(p)) + " · " + T.goods(list.length), `<span class="tag">${T.places(list.reduce((a, x) => a + x.places, 0))}</span>`)}
      ${list.map((r) => recCardP(r)).join("")}
    </div>`;
  }

  // ---------- 2. задачи: сборка грузов по команде администратора ----------
  const taskCard = (t, scr) => `<button class="pcard${t.fresh ? " new" : ""}" type="button" data-act="p" data-s="${scr}" data-p="${t.id}" data-tk="${t.id}"><span class="t"><span class="id mono">${E(t.id)}</span>${t.fresh ? `<span class="st" data-st="in">${T.t("task_new")}</span>` : I("chevron")}</span>
      <span class="sub strong">${E(t.clientId)}${t.name ? " · " + E(t.name) : ""}</span><span class="m"><span>${T.recs(t.receiptIds.length)}</span><span>${T.places(st.taskPlaces(t))}</span><span class="chip">${E(T.plan(t.packPlan))}</span>${t.transport ? `<span class="chip">${T.t("tr_" + t.transport)}</span>` : ""}</span><span class="sub">${E(st.who(t.by, T.lang))} · ${T.when(t.at)}</span></button>`;
  function tasks() {
    const open = st.openTasks(slot.wh, "collect").sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || b.at - a.at);
    return `<div class="pp">${whHead(T.t("task_title"))}
      <p class="phint">${E(T.t("task_sub", whName()))}</p>
      ${open.map((t) => taskCard(t, "task")).join("") || empty(T.t("task_empty"))}
    </div>`;
  }
  const cmdCard = (t) => `<div class="pcard cmd" data-hl="task-cmd"><div class="plabel">${I("bell")}${T.t("pf_plan")}</div>${line(T.t("tf_total"), T.places(st.taskPlaces(t)))}${line(T.t("l_pack"), E(T.t("pf_ordered", T.plan(t.packPlan))))}${line(T.t("l_name"), t.name ? E(t.name) : T.t("door_none"))}${line(T.t("l_tr"), t.transport ? T.t("tr_" + t.transport) : T.t("tr_none"))}${t.note ? line(T.t("l_note"), E(t.note)) : ""}${line(T.t("l_from"), E(st.who(t.by, T.lang)) + "<small>" + T.when(t.at) + "</small>")}</div>`;
  const found = (t) => { const f = (App.tmp.col[t.id] = (App.tmp.col[t.id] || []).filter((id) => t.receiptIds.includes(id))); return f; };
  function task(p) {
    const t = st.task(p); if (!t || t.status !== "collect") return tasks();
    const f = found(t), rs = t.receiptIds.map(st.rec).filter(Boolean), lost = rs.length - f.length;
    return `<div class="pp"><div class="pback" data-act="p" data-s="tasks">${I("back")}${T.t("task_title")}</div>
      ${head(`<span class="mono">${E(t.id)}</span>`, T.t("l_our") + " · " + E(t.clientId) + " " + E(cn(t.clientId)))}
      ${cmdCard(t)}
      <div class="phead sub"><div><small>${T.t("tf_hint")}</small><h2>${T.t("tf_cards")}</h2></div><button class="btn sm" type="button" data-act="colAll">${T.t("tf_all")}</button></div>
      <div data-hl="col-cards">${rs.map((r) => recCardP(r, { sel: "colSel", on: f.includes(r.id) })).join("")}</div>
      <div class="mt"><button class="btn pri lg block" type="button" data-f="btnCol" data-act="colGo" data-hl="col-go" ${f.length ? "" : "disabled"}>${I("check")}${T.t("tf_go")}</button>
      <div class="req${f.length && lost ? " bad" : ""}">${!f.length ? T.t("tf_need") : lost ? E(T.t("tf_lost", lost)) : T.t("tf_ok")}</div></div>
    </div>`;
  }

  // ---------- 3. упаковка: виды с количеством, размеры, вес; объём считается сам ----------
  function packs() {
    const open = st.openTasks(slot.wh, "packing").sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || b.collectedAt - a.collectedAt);
    return `<div class="pp">${whHead(T.t("pk_title"))}
      <p class="phint">${E(T.t("pk_sub", whName()))}</p>
      ${open.map((t) => taskCard(t, "packf")).join("") || empty(T.t("pk_empty"))}
    </div>`;
  }
  function packDraft(t) {
    if (!App.tmp.pack[t.id]) App.tmp.pack[t.id] = { packs: { bag: 0, crate: 0, pallet: 0, wbox: 0 }, dims: [{ l: "", w: "", h: "", n: "" }], weight: "", photos: [], note: "" };
    return App.tmp.pack[t.id];
  }
  const dimRow = (x, i, n) => `<div class="dim" data-dim="${i}">${["l", "w", "h", "n"].map((k, j) => `<input class="inp" data-in="packDim" data-i="${i}" data-k="${k}" inputmode="numeric" value="${E(x[k])}" placeholder="${T.t("pf_dim_" + k)}" aria-label="${T.t("pf_dim_" + k)}">${j < 3 ? "<i>×</i>" : ""}`).join("")}<button class="x sm" type="button" data-act="packDimDel" data-i="${i}" aria-label="${T.t("pf_del")}" ${n > 1 ? "" : "disabled"}>${I("x")}</button></div>`;
  const volHtml = (d) => `<b>${T.vol(st.dimsVolume(d.dims))}</b><small>${T.t("pf_vol_auto")}</small>`;
  function packf(p) {
    const t = st.task(p); if (!t || t.status !== "packing") return packs();
    const d = packDraft(t);
    return `<div class="pp"><div class="pback" data-act="p" data-s="packs">${I("back")}${T.t("pk_title")}</div>
      ${head(`<span class="mono">${E(t.id)}</span>`, T.t("l_our") + " · " + E(t.clientId) + " " + E(cn(t.clientId)))}
      ${cmdCard(t)}
      <div class="fld"><span>${T.t("pf_photo")}</span><div data-f="pcam" data-hl="pack-cam">${camHtml(d.photos, "packPhoto", t.packPlan[0] || "bag")}</div></div>
      <div class="fld mt"><span>${T.t("pf_types")}</span><div class="pkt" data-hl="pack-types">${st.PACK.map((k) => `<div class="pkt-r${t.packPlan.includes(k) ? " plan" : ""}"><span>${T.t("pk_" + k)}</span><div class="stepper sm"><button type="button" data-act="packCnt" data-k="${k}" data-d="-1" aria-label="${T.t("a_less")}">${I("minus")}</button><input class="inp" data-f="pc-${k}" data-in="packCntIn" data-k="${k}" inputmode="numeric" value="${d.packs[k] || 0}" aria-label="${T.t("pk_" + k)}"><button type="button" data-act="packCnt" data-k="${k}" data-d="1" aria-label="${T.t("a_more")}">${I("plus")}</button></div></div>`).join("")}</div></div>
      <div class="fld mt"><span>${T.t("pf_dims")}: ${T.t("pf_dim_l")} × ${T.t("pf_dim_w")} × ${T.t("pf_dim_h")} × ${T.t("pf_dim_n")}</span><div class="dims" data-hl="pack-dims">${d.dims.map((x, i) => dimRow(x, i, d.dims.length)).join("")}</div><button class="btn sm" type="button" data-act="packDimAdd" data-f="dimAdd">${I("plus")}${T.t("pf_add")}</button></div>
      <div class="row2 mt">
        <label class="fld"><span>${T.t("pf_w")}</span><input class="inp" data-f="packW" data-in="packW" inputmode="decimal" value="${E(d.weight)}" placeholder="0" data-hl="pack-w"></label>
        <div class="fld"><span>${T.t("pf_vol")}</span><div class="inp ro vol" data-f="vol">${volHtml(d)}</div></div>
      </div>
      <label class="fld mt"><span>${T.t("pf_note")}</span><input class="inp" data-in="packNote" value="${E(d.note)}" autocomplete="off"></label>
      <div class="mt"><button class="btn pri lg block" type="button" data-f="btnPack" data-act="packGo" data-hl="pack-go">${I("check")}${T.t("pf_go")}</button></div>
    </div>`;
  }
  const dimsText = (c) => c.dims.map((x) => `${x.l} × ${x.w} × ${x.h} · ${T.places(x.n)}`).join("<br>");
  function cargoLines(c) {
    const s = st.ship(c.id);
    return (c.name ? line(T.t("l_name"), E(c.name)) : "") + line(T.t("l_client"), E(c.clientId) + " · " + E(cn(c.clientId))) + line(T.t("l_pack"), E(T.packs(c.packs))) + line(T.t("l_places"), T.places(c.places)) + (c.dims.length ? line(T.t("l_dims"), dimsText(c)) : "") + line(T.t("l_w"), T.kg(c.weight)) + line(T.t("l_v"), T.vol(c.volume))
      + (c.note ? line(T.t("l_note"), E(c.note)) : "") + line(T.t("l_packed"), E(T.date(c.at)) + "<small>" + E(st.who(c.by, T.lang)) + "</small>")
      + (s ? line(T.t("l_tr"), T.t("tr_" + s.transport)) + line(T.t("l_route"), E(s.route)) + line(T.t("l_dest"), E(s.dest)) + line(T.t("l_sent"), E(T.date(s.sentAt))) : "");
  }
  function packed(id) {
    const c = st.cargo(id); if (!c) return packs();
    return `<div class="pp center"><div class="okmark">${I("check")}</div><h2 class="okh">${T.t("pd_title")}</h2>
      <p class="muted oks">${E(T.t("pd_sub", c.id))}</p>
      <div class="pcard left">${photos3(c.photos, c.packType)}${cargoLines(c)}</div>
      <button class="btn pri lg block" type="button" data-act="p" data-s="packs">${T.t("pd_more")}</button>
      <button class="btn lg block mt8" type="button" data-act="p" data-s="done">${T.t("pd_list")}</button></div>`;
  }
  st.on("packcmd", (t) => {
    App.ui.slots.forEach((s, i) => { if (shown(i) && s.role === "warehouse" && s.wh === t.wh) { const X = App.i18n.of(s.lang); App.showPush(i, X.t("task_push"), `${t.id} · ${X.recs(t.receiptIds.length)} · ${X.plan(t.packPlan)}`, ["task", t.id]); } });
  });

  // ---------- 4. упакованные: список, поиск, даты, выгрузка ----------
  function doneList() {
    const f = App.tmp.dn, qs = f.q.trim().toUpperCase(), now = Date.now(), days = { today: 1, d7: 7, d30: 30 }[f.per];
    return st.S.cargos.filter((c) => c.wh === slot.wh && (!qs || c.id.includes(qs) || (c.name || "").toUpperCase().includes(qs) || c.clientId.includes(qs)) && (!days || (days === 1 ? u.dayDiff(c.at) === 0 : now - c.at < days * u.DAY))).sort((a, b) => b.at - a.at);
  }
  const doneRows = () => doneList().map((c) => { const s = st.ship(c.id); return `<button class="pcard" type="button" data-act="p" data-s="donec" data-p="${c.id}" data-dn="${c.id}"><span class="t"><span class="id mono">${E(c.id)}</span>${s ? pill("way", T.t("dn_sent") + " · " + E(s.route)) : pill("pack", T.t("dn_wait"))}</span><span class="sub strong">${E(c.clientId)}${c.name ? " · " + E(c.name) : ""}</span><span class="m"><span>${T.places(c.places)}</span><span>${T.kg(c.weight)}</span><span>${T.vol(c.volume)}</span><span>${E(T.date(c.at))}</span></span></button>`; }).join("") || empty(T.t("dn_empty"));
  function done() {
    const f = App.tmp.dn;
    return `<div class="pp">${whHead(T.t("dn_title"))}
      <div class="dn-bar"><label class="search psearch">${I("search")}<input data-in="dnQ" data-f="dnQ" value="${E(f.q)}" placeholder="${T.t("dn_search")}" autocomplete="off"></label><button class="btn" type="button" data-act="dnExport" data-f="dnExport">${I("download")}${T.t("dn_export")}</button></div>
      <div class="pchips" data-hl="dn-per">${[["all", T.t("dn_all")], ["today", T.t("dn_today")], ["d7", T.t("dn_7")], ["d30", T.t("dn_30")]].map(([k, t]) => `<button type="button" class="${f.per === k ? "on" : ""}" data-act="dnPer" data-k="${k}">${t}</button>`).join("")}</div>
      <div data-f="dnList">${doneRows()}</div>
    </div>`;
  }
  function donec(p) {
    const c = st.cargo(p); if (!c) return done();
    return `<div class="pp"><div class="pback" data-act="p" data-s="done">${I("back")}${T.t("dn_title")}</div>
      ${head(`<span class="mono">${E(c.id)}</span>`, T.t("l_our"), st.ship(c.id) ? pill("way", T.t("dn_sent")) : pill("pack", T.t("dn_wait")))}
      ${photos3(c.photos, c.packType)}<div class="pcard">${cargoLines(c)}</div>
      ${st.ship(c.id) ? "" : `<p class="phint">${T.t("dn_notsent")}</p>`}
      <div class="pcard"><div class="plabel">${T.t("tf_cards")}</div>${c.receiptIds.map(st.rec).filter(Boolean).map((r) => `<div class="pline trec"><span class="ph-i">${r.photos.length ? u.photo(r.photos[0]) : ""}</span><span class="grow mono">${r.track ? E(r.track) : E(r.id)}<small>${E(r.supplier)}</small></span><b>${T.places(r.places)}</b></div>`).join("")}</div>
    </div>`;
  }
  // ---------- 5. отчёт: упаковки за месяц по видам ----------
  function monthCargos(m) {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); if (m === "prev") d.setMonth(d.getMonth() - 1);
    const from = d.getTime(), e = new Date(d); e.setMonth(e.getMonth() + 1);
    return st.S.cargos.filter((c) => c.wh === slot.wh && c.at >= from && c.at < e.getTime());
  }
  const monthSeg = (scr, k) => `<div class="pseg">${[["this", T.t("rp_this")], ["prev", T.t("rp_prev")]].map(([m, t]) => `<button type="button" class="${App.tmp.rpm === m ? "on" : ""}" data-act="rpMonth" data-k="${m}">${t}</button>`).join("")}</div>`;
  function report() {
    const list = monthCargos(App.tmp.rpm), sum = (k) => list.reduce((a, c) => a + (c.packs[k] || 0), 0), total = st.PACK.reduce((a, k) => a + sum(k), 0);
    return `<div class="pp">${whHead(T.t("rp_title"))}${monthSeg()}
      <div class="pay-hero"><span>${T.t("rp_total")}</span><strong>${total}</strong><span>${E(T.t("rp_cargos", list.length))} · ${E(whName())}</span></div>
      <div data-hl="rp-types">${st.PACK.map((k) => `<button class="tile" type="button" data-act="p" data-s="reportk" data-p="${k}" data-rp="${k}"><span class="ti">${I(k === "pallet" ? "layers" : k === "bag" ? "box" : "grid")}</span><span><b>${T.t("pk_" + k)}</b><small>${E(T.t("rp_cargos", list.filter((c) => c.packs[k] > 0).length))}</small></span><span class="n">${sum(k)}</span></button>`).join("")}</div>
      <p class="phint">${T.t("rp_hint")}</p>
    </div>`;
  }
  function reportk(p) {
    const k = st.PACK.includes(p) ? p : st.PACK[0], list = monthCargos(App.tmp.rpm).filter((c) => c.packs[k] > 0).sort((a, b) => b.at - a.at);
    return `<div class="pp"><div class="pback" data-act="p" data-s="report">${I("back")}${T.t("rp_title")}</div>
      ${head(T.t("pk_" + k), T.t("rp_list") + " · " + E(whName()), `<span class="tag">${list.reduce((a, c) => a + c.packs[k], 0)}</span>`)}${monthSeg()}
      ${list.map((c) => `<button class="pcard" type="button" data-act="p" data-s="donec" data-p="${c.id}"><span class="t"><span class="id mono">${E(c.id)}</span><span class="n">${c.packs[k]}</span></span><span class="sub strong">${c.name ? E(c.name) : E(c.clientId)}</span><span class="sub">${E(c.clientId)} · ${E(T.packs(c.packs))} · ${E(T.date(c.at))}</span></button>`).join("") || empty(T.t("rp_empty"))}
    </div>`;
  }

  // ================= ЧАТ С АВТОПЕРЕВОДОМ (ЭТАП 3) =================
  const chatSide = () => "zh";
  function chats() {
    const side = chatSide(), C = App.chatUI, list = C.threadsSorted(slot.role === "warehouse" ? slot.wh : null);
    return `<div class="pp">${head(T.t("ch_title") + stg(3), T.t("ch_sub"), zhRole(slot.role) ? langSw() : "")}
      ${list.map((t) => { const x = C.threadTitle(t, zhRole(slot.role) ? T.lang : "ru"), n = st.unread(t, side); return `<button class="pcard pthr" type="button" data-act="p" data-s="chat" data-p="${t.id}" data-thr="${t.id}"><span class="t"><span class="id">${E(x.id)} · ${E(x.code)}</span>${n ? `<i class="nb">${n}</i>` : `<span class="muted s12">${T.when((t.msgs[t.msgs.length - 1] || {}).at || Date.now())}</span>`}</span><span class="sub strong ell1">${E(C.lastText(t, side))}</span><span class="sub">${E(x.kind)} · ${E(x.wh)}</span></button>`; }).join("") || empty(T.t("ch_empty"))}
    </div>`;
  }
  function chat(p) {
    const t = st.thread(p); if (!t) return chats();
    const side = chatSide(), C = App.chatUI, x = C.threadTitle(t, zhRole(slot.role) ? T.lang : "ru");
    if (shown(cur)) st.chatRead(t.id, side);
    return `<div class="pp chatp"><div class="pback" data-act="p" data-s="chats">${I("back")}${T.t("ch_title")}</div>
      <div class="phead"><div><small>${E(x.kind)} · ${E(x.code)} ${E(x.name)}</small><h2>${E(x.id)}</h2></div>${stg(3)}</div>
      <p class="phint">${side === "ru" ? T.t("ch_side") : T.t("ch_side_wh")}</p>
      <div class="pmsgs">${t.msgs.map((m) => C.bubble(m, side)).join("") || empty(T.t("ch_empty"))}</div>
      <div class="plabel">${T.t("ch_quick")}</div><div class="chat-q" data-hl="chat-q">${C.phrases(side, t.id)}</div>
      <div class="chat-i"><input class="inp" data-in="pchat" placeholder="${T.t("ch_ph")}" value="${E(App.tmp.ptext[cur] || "")}" data-enter='[data-f="psend"]' autocomplete="off"><button class="btn pri" type="button" data-f="psend" data-act="chatSend" data-tid="${t.id}" data-side="${side}" aria-label="${T.t("ch_send")}">${I("send")}</button></div>
    </div>`;
  }
  st.on("chat", ({ t, m }) => {
    const P = App.i18n.PHRASE;
    App.ui.slots.forEach((s, i) => {
      if (!shown(i)) return;
      const side = zhRole(s.role) ? "zh" : null;
      if (!side || side === m.side || (s.role === "warehouse" && s.wh !== t.wh) || (s.screen === "chat" && s.p === t.id)) return;
      App.showPush(i, App.i18n.of(side === "zh" ? s.lang : "ru").t("ch_new") + " · " + st.who(m.by, side), m.k ? P[m.k][side] : m.text, ["chat", t.id]);
    });
    if (m.side === "zh" && App.ui.mode === "admin" && App.ui.desk !== "chat") App.dpush("Новое сообщение · " + st.who(m.by) + ", склад " + st.wh(t.wh).ru, m.k ? P[m.k].ru : m.text, ["chat", t.id]);
  });

  // ================= КЛИЕНТ =================
  const clientHead = (t, right) => { const c = st.client(ME); return head(t, E(c.name) + " · " + E(c.id), right); };
  const PKG = (k) => App.i18n.of("ru").t("pk_" + k);
  function ships(p) {
    const tab = p === "archive" ? "archive" : "active", S = st.S;
    const sh = S.ships.filter((s) => s.clientId === ME), act = sh.filter((s) => s.status !== "done").sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || b.sentAt - a.sentAt), arc = sh.filter((s) => s.status === "done").sort((a, b) => b.doneAt - a.doneAt);
    const cg = st.ready().filter((c) => c.clientId === ME).sort((a, b) => b.at - a.at), rc = st.S.receipts.filter((r) => r.clientId === ME && !r.cargoId).sort((a, b) => b.at - a.at), ex = S.expected.filter((e) => e.clientId === ME);
    const debt = st.money(ME).debt, nAct = act.length + cg.length + rc.length;
    const bell = `<button class="x soft" type="button" data-act="notes" aria-label="Уведомления">${I("bell")}</button>`;
    const shipC = (s) => { const t = st.totals(s); return `<button class="pcard${s.fresh ? " new" : ""}" type="button" data-act="p" data-s="citem" data-p="ship:${s.id}" data-ci="ship:${s.id}"><span class="t"><span class="id">${E(s.id)}</span>${pill(s.status, s.status === "done" && s.issue && s.issue.type === "tk" ? "Передан в ТК" : null)}</span><span class="m"><span>${u.places(t.places)}</span><span>${u.kg(t.weight)}</span><span>${u.vol(t.volume)}</span></span><span class="sub">${s.status === "way" ? "Прибытие около " + u.dLong(s.eta) : s.status === "arrived" ? "Прибыла в Россию, готовим к выдаче" : s.issue && s.issue.type === "tk" ? "Передана в " + E(s.issue.tk) + " " + u.dShort(s.doneAt) : "Выдана " + u.dShort(s.doneAt)} · ${u.usd(s.cost)}, ${st.isPaid(s) ? "оплачено" : "не оплачено"}</span></button>`; };
    const list = tab === "archive" ? arc.map(shipC).join("") : act.map(shipC).join("")
      + cg.map((c) => `<button class="pcard${c.fresh ? " new" : ""}" type="button" data-act="p" data-s="citem" data-p="cargo:${c.id}" data-ci="cargo:${c.id}"><span class="t"><span class="id">${E(c.id)}</span>${pill("pack")}</span><span class="photos">${c.photos.slice(0, 1).map((x) => `<span class="ph-i">${u.photo(x, c.packType)}</span>`).join("")}${c.receiptIds.slice(0, 2).map((id) => `<span class="ph-i">${u.photo(st.rec(id).photos[0])}</span>`).join("")}</span><span class="m"><span>${u.places(c.places)}</span><span>${u.kg(c.weight)}</span><span>${u.vol(c.volume)}</span></span><span class="sub">${c.sent ? "На складе " + st.left(c) + " из " + c.places + " мест, остальные уже едут" : "Ждёт отправки, склад " + E(st.wh(c.wh).ru)}</span></button>`).join("")
      + rc.map((r) => `<button class="pcard${r.fresh ? " new" : ""}" type="button" data-act="p" data-s="citem" data-p="rec:${r.id}" data-ci="rec:${r.id}"><span class="t"><span class="id">${dmgI(r)}${E(r.id)}</span>${pill(r.taskId ? "packing" : "in")}</span><span class="photos">${r.photos.slice(0, 3).map((x) => `<span class="ph-i">${u.photo(x)}</span>`).join("")}</span><span class="m"><span>${u.places(r.places)}</span><span>${E(r.supplier)}</span></span><span class="sub">Принят ${u.when(r.at)}, склад ${E(st.wh(r.wh).ru)}${r.damage ? ". Есть повреждение" : ""}</span></button>`).join("")
      + (ex.length ? `<button class="pcard" type="button" data-act="p" data-s="await"><span class="t"><span class="id">Ждём на складе: ${ex.length}</span>${pill("wait")}</span><span class="sub">${ex.map((e) => E(e.track)).join(", ")}</span></button>` : "");
    return `<div class="pp">${clientHead("Мои грузы", bell)}
      ${debt > 0.5 ? `<button class="pcard warnc" type="button" data-act="p" data-s="pay"><span class="t"><span class="strong">Не оплачено ${u.usd(debt)}</span>${I("chevron")}</span></button>` : ""}
      <div class="opts-row">${optBtn("clientChat", "Написать менеджеру")}</div>
      <div class="pseg"><button type="button" class="${tab === "active" ? "on" : ""}" data-act="p" data-s="ships">Активные · ${nAct}</button><button type="button" class="${tab === "archive" ? "on" : ""}" data-act="p" data-s="ships" data-p="archive">Архив · ${arc.length}</button></div>
      ${list || empty("Здесь пока пусто.")}
    </div>`;
  }
  const tl = (items) => `<ol class="tl">${items.map(([cls, t, at]) => `<li class="${cls}"><b>${t}</b>${at ? `<small>${at}</small>` : ""}</li>`).join("")}</ol>`;
  const dt = (t) => u.dShort(t) + " · " + u.hm(t);
  function citem(p) {
    const [t, id] = String(p || "").split(":");
    const back = `<div class="pback" data-act="p" data-s="ships">${I("back")}Мои грузы</div>`;
    if (t === "rec") {
      const r = st.rec(id); if (!r || r.clientId !== ME) return ships();
      const cg = r.cargoId ? st.cargo(r.cargoId) : null;
      return `<div class="pp">${back}<div class="phead"><div><small>Приход · ${E(r.supplier)}</small><h2>${E(r.id)}</h2></div>${pill(cg ? "pack" : r.taskId ? "packing" : "in")}</div>
        <div class="photos gap">${r.photos.map((x) => `<div class="ph-i">${u.photo(x)}<em>склад</em></div>`).join("")}</div>
        <div class="pcard">${line("Склад", E(st.wh(r.wh).ru))}${r.track ? line("Трек-номер", `<span class="mono">${E(r.track)}</span>`) : ""}${line("Поставщик", E(r.supplier))}${r.what ? line("Что внутри", E(r.what)) : ""}${line("Мест", u.places(r.places))}${r.damage ? line("Повреждение", `<span class="bad">${E(st.noteText({ note: r.damage }))}</span>`) : ""}${r.dpay === "supplier" ? line("Доставка до склада", "оплатил поставщик") : r.deliv ? line("Доставка до склада", u.cny(r.deliv) + "<small>войдёт в стоимость</small>") : ""}${r.extra ? line("Доп. расходы", u.cny(r.extra) + "<small>войдут в стоимость</small>") : ""}</div>
        ${cg ? `<button class="pcard" type="button" data-act="p" data-s="citem" data-p="cargo:${cg.id}"><span class="t"><span class="strong">Трек-номер груза ${E(cg.id)}</span>${I("chevron")}</span><span class="sub">${E(st.packsText(cg.packs))}, ${u.kg(cg.weight)}, ${u.vol(cg.volume)}</span></button>` : '<p class="phint">Вес и объём появятся после упаковки. Если вы ждёте ещё посылки, их соберут в один груз.</p>'}
        <div class="pcard">${tl([r.expAt ? ["done", "Вы внесли трек-номер", dt(r.expAt)] : null, [cg || r.taskId ? "done" : "cur", "Принят на складе (" + E(st.wh(r.wh).ru) + ")", dt(r.at)], cg ? ["done", "Упакован в составе груза " + E(cg.id), dt(cg.at)] : [r.taskId ? "cur" : "todo", r.taskId ? "Передан на упаковку" : "Упаковка", ""], ["todo", "Отправка из Китая", ""]].filter(Boolean))}</div></div>`;
    }
    if (t === "cargo") {
      const c = st.cargo(id); if (!c || c.clientId !== ME) return ships();
      const recs = c.receiptIds.map(st.rec).filter(Boolean), sh = st.shipsOfCargo(c.id), lf = st.left(c);
      return `<div class="pp">${back}<div class="phead"><div><small>Груз · склад ${E(st.wh(c.wh).ru)}</small><h2>${E(c.id)}</h2></div>${pill("pack")}</div>
        <div class="photos gap">${c.photos.map((x) => `<div class="ph-i">${u.photo(x, c.packType)}<em>упаковка</em></div>`).join("")}${recs.slice(0, 2).map((r) => `<div class="ph-i">${u.photo(r.photos[0])}<em>склад</em></div>`).join("")}</div>
        <div class="pcard">${c.name ? line("Наименование", E(c.name)) : ""}${line("Упаковка", E(st.packsText(c.packs)))}${line("Мест после упаковки", u.places(c.places))}${line("Вес", u.kg(c.weight))}${line("Объём", u.vol(c.volume))}${line("Сейчас на складе", lf ? lf + " из " + c.places + " мест" : "всё отправлено")}</div>
        <div class="pcard"><div class="plabel">Что вошло в груз</div>${recs.map((r) => `<div class="pline"><span>${E(r.id)}<small>${E(r.supplier)}</small></span><b>${u.places(r.places)}</b></div>`).join("")}</div>
        ${sh.map((s) => `<button class="pcard" type="button" data-act="p" data-s="citem" data-p="ship:${s.id}"><span class="t"><span class="strong">Отправка ${E(s.id)}</span>${pill(s.status)}</span><span class="sub">${u.places(s.items.find((x) => x.cargoId === c.id).places)} · отправлена ${u.dShort(s.sentAt)}</span></button>`).join("")}
        <div class="pcard">${tl(recs.map((r) => ["done", "Приход " + E(r.id) + " принят", dt(r.at)]).concat([[sh.length ? "done" : "cur", "Упакован, ждёт отправки", dt(c.at)]], sh.map((s) => ["done", "Отправлено " + u.places(s.items.find((x) => x.cargoId === c.id).places) + ", трек " + E(s.id), dt(s.sentAt)]), lf ? [["todo", sh.length ? "Отправка остатка: " + u.places(lf) : "Отправка из Китая", ""]] : []))}</div></div>`;
    }
    const s = st.ship(id); if (!s || s.clientId !== ME) return ships();
    const x = st.totals(s), rest = s.items.reduce((a, y) => a + st.left(st.cargo(y.cargoId)), 0), all = s.items.reduce((a, y) => a + st.cargo(y.cargoId).places, 0);
    const iss = s.issue ? (s.issue.type === "tk" ? "Передана в " + E(s.issue.tk) + ", накладная " + E(s.issue.waybill) : "Выдана") : "";
    return `<div class="pp">${back}<div class="phead"><div><small>Отправка · маршрут ${E(s.route)} · ${E(st.TRANSPORT[s.transport].t)}</small><h2>${E(s.id)}</h2></div>${pill(s.status, s.status === "done" && s.issue && s.issue.type === "tk" ? "Передан в ТК" : null)}</div>
      <div class="pcard track" data-hl="client-track"><div class="t"><span class="muted s12">Трек-номер</span><span class="muted s12">${s.status === "way" ? "прибытие" : s.status === "arrived" ? "прибыла" : "выдана"}</span></div><div class="t"><span class="id big">${E(s.id)}</span><span class="strong">${s.status === "way" ? "≈" + u.NB + u.dLong(s.eta) : u.dLong(s.status === "arrived" ? s.arrivedAt : s.doneAt)}</span></div>
        <div class="sub">${x.places < all ? `Едет ${x.places} из ${all} мест${rest ? ", ещё " + rest + " на складе в Китае" : ""}` : "Маршрут " + E(s.route) + " · " + E(s.dest) + " · " + u.places(x.places)}</div></div>
      <div class="pcard">${line("Мест", u.places(x.places))}${line("Вес", u.kg(x.weight))}${line("Объём", u.vol(x.volume))}${line("Стоимость", u.usd(s.cost))}${s.doorUsd ? line("в том числе доставка до склада и расходы в Китае", u.cny(s.doorCny) + " = " + u.usd(s.doorUsd)) : ""}${line("Оплата", paidPill(s))}</div>
      <div class="pcard" data-hl="client-docs"><div class="plabel">Документы</div>${s.docs.map((d) => `<div class="pline"><span>${E(d.name)}<small>${u.dShort(d.at)}</small></span><button class="btn sm" type="button" data-act="toast" data-t="В рабочей версии файл скачается: ${E(d.name)}" data-i="download">${I("download")}</button></div>`).join("") || '<p class="muted s13 p0">Документы появятся здесь, когда их прикрепят к отправке.</p>'}</div>
      <div class="pcard">${tl([[s.status === "way" ? "cur" : "done", "Отправлена из Китая", dt(s.sentAt)], s.arrivedAt ? [s.status === "arrived" ? "cur" : "done", "Прибыла в Россию", dt(s.arrivedAt)] : ["todo", "Прибытие в Россию", "ожидается " + u.dLong(s.eta)], s.doneAt ? ["done", iss, dt(s.doneAt)] : ["todo", "Выдача или передача в транспортную компанию", ""]])}</div>
      <div class="opts-row">${optBtn("clientChat", "Вопрос по этой отправке")}</div></div>`;
  }
  function awDraft() { if (!App.tmp.aw) App.tmp.aw = { track: "", supplier: "", what: "" }; return App.tmp.aw; }
  const awOk = (d) => d.track.replace(/\s/g, "").length >= 6;
  function awaitScreen() {
    const d = awDraft(), ex = st.S.expected.filter((e) => e.clientId === ME);
    return `<div class="pp">${clientHead("Жду посылку")}
      <p class="phint">Внесите трек-номер китайской доставки. Когда коробка придёт на склад, кладовщик введёт трек, и система сама поймёт, что это ваш груз.</p>
      <div class="pcard form"><label class="fld"><span>Трек-номер поставщика <b>*</b></span><input class="inp" data-f="awTrack" data-in="awTrack" value="${E(d.track)}" placeholder="YT8830215567104" autocomplete="off" autocapitalize="characters" spellcheck="false" data-hl="aw-track"></label>
        <label class="fld mt8"><span>Поставщик</span><input class="inp" data-f="awSup" data-in="awSup" value="${E(d.supplier)}" placeholder="Магазин или фабрика" autocomplete="off" data-hl="aw-sup"></label>
        <label class="fld mt8"><span>Что внутри</span><input class="inp" data-f="awWhat" data-in="awWhat" value="${E(d.what)}" placeholder="Светильники, 8 коробок" autocomplete="off"></label>
        <button class="btn pri lg block mt" type="button" data-f="awGo" data-act="awGo" ${awOk(d) ? "" : "disabled"} data-hl="aw-go">${I("plus")}Добавить</button></div>
      <div class="phead sub"><div><small>склад увидит их заранее</small><h2>Мои трек-номера</h2></div></div>
      ${ex.map((e) => `<div class="pcard"><div class="t"><span class="id mono">${E(e.track)}</span>${pill("wait")}</div><div class="sub strong">${E(e.supplier)}</div><div class="t"><span class="sub">${e.what ? E(e.what) + " · " : ""}внесён ${u.when(e.at)}</span><button class="x sm" type="button" data-act="awDel" data-id="${e.id}" aria-label="Удалить трек-номер">${I("x")}</button></div></div>`).join("") || empty("Все посылки уже на складе.")}
    </div>`;
  }
  function pay() {
    const m = st.money(ME), list = st.S.ships.filter((s) => s.clientId === ME).sort((a, b) => b.sentAt - a.sentAt), pays = st.S.payments.filter((x) => x.clientId === ME).sort((a, b) => b.at - a.at);
    return `<div class="pp">${clientHead("Оплаты")}
      <div class="pay-hero" data-hl="client-pay"><span>${m.debt > 0.5 ? "Не оплачено" : "Всё оплачено"}</span><strong>${u.usd(m.debt)}</strong><button class="btn sm" type="button" data-act="reqs">${I("file")}Реквизиты для оплаты</button></div>
      <div class="pcard"><div class="plabel">Стоимость отправок</div>${list.map((s) => `<div class="pline"><span>${E(s.id)}<small>${u.dShort(s.sentAt)} · ${u.places(st.totals(s).places)}</small></span><span class="rt"><b>${u.usd(s.cost)}</b><small class="${st.isPaid(s) ? "ok" : "bad"}">${st.isPaid(s) ? "оплачено" : s.paidUsd > 0 ? "оплачено " + u.usd(s.paidUsd) : "не оплачено"}</small></span></div>`).join("") || '<p class="muted s13 p0">Отправок пока нет</p>'}</div>
      <div class="pcard"><div class="plabel">История оплат${stg(2)}</div><p class="muted s12 p0 mb8">Платить можно рублями, юанями, сомами, тенге, USDT или долларами. Сумма пересчитывается в доллары по курсу на день оплаты.</p>${pays.slice(0, 6).map((x) => `<div class="pline"><span>${u.dLong(x.at)}<small>${x.cur === "USD" || x.cur === "USDT" ? st.CUR[x.cur].t : "курс " + u.num(x.rate, 2)}</small></span><span class="rt"><b>${x.cur === "USD" ? u.usd(x.amount) : u.groups(Math.round(x.amount)) + u.NB + st.CUR[x.cur].s}</b><small>${x.cur === "USD" ? "доллары" : "= " + u.usd(x.usd)}</small></span></div>`).join("") || '<p class="muted s13 p0">Оплат пока не было</p>'}</div>
    </div>`;
  }
  function profile() {
    const c = st.client(ME);
    return `<div class="pp">${clientHead("Профиль")}
      <div class="pcard codec"><span class="muted s12">Ваш код клиента</span><b>${E(c.id)}</b><span class="sub">Поставщик пишет его на каждой коробке</span></div>
      <div class="pcard"><div class="plabel">Адреса складов для ваших поставщиков</div>${st.WH.map((w) => `<div class="addr"><b>${E(w.ru)}</b><span>${E(w.addr)}<br>收货人: 中心物流 · 唛头: ${E(c.id)}</span><button class="btn sm" type="button" data-act="toast" data-t="Адрес склада (${E(w.ru)}) скопирован, отправьте его поставщику" data-i="copy" aria-label="Скопировать адрес">${I("copy")}</button></div>`).join("")}</div>
      <div class="pcard"><div class="plabel">Уведомления</div>
        <div class="pline"><span>В приложении<small>каждый этап: принят, упакован, отправлен, прибыл, выдан</small></span><span class="st" data-st="in">включено</span></div>
        <div class="pline"><span>Telegram<small>${st.S.tg ? "подключён" : "дублировать уведомления в Telegram"}</small></span>${st.S.tg ? '<span class="st" data-st="in">включено</span>' : '<button class="btn sm" type="button" data-act="tgOn">Подключить</button>'}</div>
        <div class="pline"><span>Бот «Где мой груз?»<small>статус по коду или трек-номеру</small></span>${optBtn("tgbot", "Подключить")}</div></div>
      <div class="pcard">${line("Компания", E(c.name))}${line("Контакт", E(c.person))}${line("Ваш менеджер", E(st.who(c.salesId)))}</div>
    </div>`;
  }

  const S_ = { accept, accepted, stock, stockc, tasks, task, packs, packf, packed, done, donec, report, reportk, chats, chat, ships, citem, await: awaitScreen, pay, profile };

  // ---------- действия ----------
  const A = (fn) => (d, el, e) => { ctx(App.cur); return fn(d, el, e); };
  const go = (s, p) => App.go.phone(cur, s, p == null ? null : p);
  const blur = () => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); };
  const dec = () => { if (App.scenario) App.scenario.decorate(); };
  const acts = {
    whPick: () => whSheet(),
    whSet: (d) => { slot.wh = d.k; App.saveUI(); App.closeSheet(cur); App.renderSlot(cur, true); },
    zoom: (d) => App.overlay(`<div class="zoom">${u.photo(+d.p, d.kind || undefined)}</div><div class="of"><button class="btn lg block" type="button" data-act="closeAny">Закрыть</button></div>`),
    // приёмка
    scan: () => { blur(); scanStart(); },
    scanCancel: () => scanStop(cur),
    accPhoto: () => { const d = draft(); d.photos.push(photoSeq++); q('[data-f="cam"]').innerHTML = camHtml(d.photos, "accPhoto"); dec(); },
    accDmgPhoto: () => { const d = draft(); d.dmgPhotos.push(photoSeq++); q('[data-f="dcam"]').innerHTML = camHtml(d.dmgPhotos, "accDmgPhoto"); },
    accPlaces: (x) => { const d = draft(); d.places = Math.max(1, (parseInt(d.places, 10) || 1) + parseInt(x.d, 10)); q('[data-f="accPl"]').value = d.places; dec(); },
    accDmg: (x) => { const d = draft(); d.dmg = d.dmg === x.k ? null : x.k; App.slotEl(cur).querySelectorAll('[data-act="accDmg"]').forEach((b) => b.classList.toggle("on", b.dataset.k === d.dmg)); q('[data-f="dmgBox"]').hidden = d.dmg !== "yes"; dec(); },
    accDoor: (x) => { const d = draft(); d.dpay = d.dpay === x.k ? null : x.k; App.slotEl(cur).querySelectorAll('[data-act="accDoor"]').forEach((b) => b.classList.toggle("on", b.dataset.k === d.dpay)); q('[data-f="doorBox"]').hidden = d.dpay !== "wh"; dec(); },
    accFill: () => { blur(); const d = draft(); if (!d.track) { const s = App.ui.scn, e = (s.on && s.track && st.S.expected.find((x) => x.track === s.track)) || st.S.expected[0]; if (e) { d.track = e.track; matchTrack(d); } } if (!d.photos.length) d.photos.push(photoSeq++, photoSeq++); if (d.places < 2) d.places = 8; if (!d.dmg) d.dmg = "no"; if (!d.dpay) { d.dpay = "wh"; d.deliv = d.deliv || "85"; } rr(); },
    accGo: () => {
      const d = draft();
      const r = st.accept({ wh: slot.wh, clientId: d.clientId, track: d.track, supplier: d.supplier, what: d.what, expId: d.expId, expAt: d.expAt, places: d.places, damage: d.dmg === "yes" ? d.dmgText.trim() || { ru: "Есть повреждение", zh: "有破损" } : "", dmgPhotos: d.dmgPhotos, photos: d.photos, dpay: d.dpay, deliv: u.parse(d.deliv), extra: u.parse(d.extra), note: d.note });
      App.tmp.acc = null; go("accepted", r.id);
      if (App.scenario) App.scenario.check(r.clientId ? "accepted" : "unknown", r);
    },
    // сборка
    colSel: (x) => { const t = st.task(slot.p); if (!t) return; const f = found(t), i = f.indexOf(x.id); if (i >= 0) f.splice(i, 1); else f.push(x.id); rr(); },
    colAll: () => { const t = st.task(slot.p); if (!t) return; App.tmp.col[t.id] = found(t).length === t.receiptIds.length ? [] : t.receiptIds.slice(); rr(); },
    colGo: () => {
      const t = st.task(slot.p); if (!t) return; const f = found(t); if (!f.length) return;
      const r = st.collect(t.id, f.slice()); delete App.tmp.col[t.id];
      if (r) { App.toast(T.t("ts_packing") + ": " + r.id, "layers"); go("packs"); if (App.scenario) App.scenario.check("collected", r); }
    },
    // упаковка
    packCnt: (x) => { const t = st.task(slot.p); if (!t) return; const d = packDraft(t); d.packs[x.k] = Math.max(0, (parseInt(d.packs[x.k], 10) || 0) + parseInt(x.d, 10)); q(`[data-f="pc-${x.k}"]`).value = d.packs[x.k]; dec(); },
    packDimAdd: () => { const t = st.task(slot.p); if (!t) return; packDraft(t).dims.push({ l: "", w: "", h: "", n: "" }); rr(); },
    packDimDel: (x) => { const t = st.task(slot.p); if (!t) return; const d = packDraft(t); if (d.dims.length > 1) { d.dims.splice(+x.i, 1); rr(); } },
    packPhoto: () => { const t = st.task(slot.p); if (!t) return; const d = packDraft(t); d.photos.push(photoSeq++); q('[data-f="pcam"]').innerHTML = camHtml(d.photos, "packPhoto", t.packPlan[0] || "bag"); dec(); },
    packFill: () => { blur(); const t = st.task(slot.p); if (!t) return; const d = packDraft(t); if (!st.packsSum(d.packs)) d.packs = { bag: 4, crate: 2, pallet: 0, wbox: 0 }; if (!st.dimsVolume(d.dims)) d.dims = [{ l: "50", w: "50", h: "60", n: "4" }, { l: "90", w: "80", h: "60", n: "2" }]; d.weight = d.weight || "142"; if (!d.photos.length) d.photos.push(photoSeq++); rr(); },
    packGo: () => {
      const t = st.task(slot.p); if (!t) return; const d = packDraft(t);
      const c = st.pack(t.id, { packs: d.packs, dims: d.dims, weight: u.parse(d.weight), photos: d.photos, note: d.note });
      delete App.tmp.pack[t.id];
      if (c) { go("packed", c.id); if (App.scenario) App.scenario.check("packed", c); }
    },
    // упакованные и отчёт
    dnPer: (x) => { App.tmp.dn.per = x.k; rr(); },
    dnExport: () => { const rows = [["Трек-номер", "Клиент", "Наименование", "Упаковка", "Мест", "Вес, кг", "Объём, м³", "Упакован", "Маршрут", "Место назначения"]].concat(doneList().map((c) => { const s = st.ship(c.id); return [c.id, c.clientId, c.name, st.packsText(c.packs), c.places, c.weight, u.num(c.volume, 2), u.dFull(c.at), s ? s.route : "", s ? s.dest : ""]; })); App.toast(u.download("upakovannye_" + new Date().toISOString().slice(0, 10) + ".csv", u.csv(rows)) ? T.t("dn_exported") : "Браузер не дал скачать файл", "download"); },
    rpMonth: (x) => { App.tmp.rpm = x.k; rr(); },
    // клиент
    awFill: () => { blur(); const d = awDraft(); d.track = d.track || "YT8830215567104"; d.supplier = d.supplier || "Yiwu Lanxi Lighting"; d.what = d.what || "Светильники, 8 коробок"; App.refresh(true); },
    awGo: () => { const d = awDraft(); if (!awOk(d)) return; const e = st.addExpected(ME, d); App.tmp.aw = null; App.refresh(true); App.toast("Трек-номер добавлен, склад его уже видит", "check"); if (App.scenario) App.scenario.check("expected", e); },
    awDel: (x) => { st.removeExpected(x.id); App.toast("Трек-номер удалён", "x"); },
    notes: () => { const list = st.S.notes.filter((n) => n.clientId === ME).slice(0, 8); App.sheet(cur, `<h3>Уведомления</h3>${list.map((n) => `<div class="pline top"><span>${E(n.text)}<small>${u.when(n.at)}</small></span></div>`).join("")}`); },
    reqs: () => App.sheet(cur, `<h3>Реквизиты для оплаты</h3><p>Здесь будут реквизиты вашей компании. Назначение платежа подставляется само: оплата доставки, код ${ME}.</p><button class="btn pri block" type="button" data-act="toast" data-t="Реквизиты скопированы" data-i="check">Скопировать</button>`),
    tgOn: () => App.sheet(cur, `<h3>Подключить Telegram</h3><p>Откройте нашего бота в Telegram и отправьте ему код привязки. Уведомления будут приходить и в приложение, и в Telegram.</p><div class="note code4">4821</div><button class="btn pri block mt" type="button" data-act="tgDone">${I("tg")}Я отправил код</button>`),
    tgDone: () => { st.setTg(true); App.closeSheet(cur); App.toast("Telegram подключён", "tg"); },
  };
  Object.keys(acts).forEach((k) => { App.acts[k] = A(acts[k]); });
  // подсказки при наборе кода клиента: приёмка у склада и привязка у администратора
  App.taPick.acc = (v) => { ctx(App.cur); const d = draft(); d.clientId = v || null; d.auto = false; rr(); if (App.scenario) App.scenario.check("clientPicked", v); };
  App.taType.acc = () => { ctx(App.cur); const d = draft(); if (d.clientId) { d.clientId = null; d.auto = false; const n = q('[data-f="accNote"]'); if (n) { n.innerHTML = clientNote(d); n.classList.remove("ok"); } } };
  App.taEmpty = { acc: () => T.t("ta_empty") };
  const ins = {
    accTrack: (v) => { const d = draft(); d.track = v; if (matchTrack(d)) rr2(); },
    accPlacesIn: (v) => { draft().places = Math.max(1, parseInt(v, 10) || 1); },
    accIn: (v, el) => { draft()[el.dataset.k] = v; dec(); },
    packCntIn: (v, el) => { const t = st.task(slot.p); if (t) packDraft(t).packs[el.dataset.k] = Math.max(0, parseInt(v, 10) || 0); dec(); },
    packDim: (v, el) => { const t = st.task(slot.p); if (!t) return; const d = packDraft(t); if (!d.dims[+el.dataset.i]) return; d.dims[+el.dataset.i][el.dataset.k] = v; q('[data-f="vol"]').innerHTML = volHtml(d); dec(); },
    packW: (v) => { const t = st.task(slot.p); if (t) packDraft(t).weight = v; dec(); },
    packNote: (v) => { const t = st.task(slot.p); if (t) packDraft(t).note = v; },
    dnQ: (v) => { App.tmp.dn.q = v; const l = q('[data-f="dnList"]'); if (l) l.innerHTML = doneRows(); },
    pcmdIn: (v, el) => { if (App.tmp.pcmd) App.tmp.pcmd[el.dataset.k] = v; },
    awTrack: (v) => { const d = awDraft(); d.track = v; const b = q('[data-f="awGo"]'); if (b) b.disabled = !awOk(d); dec(); },
    awSup: (v) => { awDraft().supplier = v; },
    awWhat: (v) => { awDraft().what = v; },
    tkWb: (v) => { const d = App.tmp.issue; if (!d) return; d.waybill = v; dec(); },
    pchat: (v) => { App.tmp.ptext[cur] = v; },
  };
  // при ручном вводе трека, который клиент внёс заранее, клиент подставляется без потери фокуса в поле трека
  function rr2() { const d = draft(), box = q('[data-ta="acc"] input'), c = d.clientId ? st.client(d.clientId) : null, n = q('[data-f="accNote"]'); if (box) box.value = c ? c.id + " · " + c.name : ""; if (n) { n.innerHTML = clientNote(d); n.classList.toggle("ok", !!d.clientId); } dec(); }
  Object.keys(ins).forEach((k) => { App.ins[k] = (v, el, e) => { ctx(App.cur); return ins[k](v, el, e); }; });

  App.P = { tabs, render, after, has, shown, scanStop };
})(window.App);
