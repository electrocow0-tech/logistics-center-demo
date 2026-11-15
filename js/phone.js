/* Экраны телефона. Два независимых телефона (слота), у каждого своя роль, экран и язык.
   Роли: склад в Китае, менеджер Китая (у обоих рабочий китайский интерфейс), Москва (выдача), клиент, администратор. */
(function (App) {
  "use strict";
  const u = App.u, st = App.store, I = u.icon, E = u.esc, ME = st.ME;
  let cur = 0, slot = App.ui ? App.ui.slots[0] : null, T = App.i18n.of("ru");
  const zhRole = (r) => r === "warehouse" || r === "cnmanager";
  function ctx(i) { cur = i || 0; slot = App.ui.slots[cur]; T = App.i18n.of(zhRole(slot.role) ? slot.lang : "ru"); }
  const q = (sel) => App.slotEl(cur).querySelector(sel);
  const shown = (i) => App.ui.mode === "phone" && i < App.nPhones();
  const pill = (s, label) => `<span class="st" data-st="${s}">${label || T.t("st_" + s)}</span>`;
  const stg = (n) => `<em class="stg s${n}">${n === 3 ? T.t("stage3") : "Этап " + n}</em>`;
  const optBtn = (k, label) => `<button class="opt" type="button" data-act="opt" data-k="${k}">${I((App.OPT[k] || {}).icon || "spark")}<span class="ol">${E(label)}</span><i>${T.t("opt")}</i></button>`;
  const head = (t, small, right) => `<div class="phead"><div><small>${small}</small><h2>${t}</h2></div>${right || ""}</div>`;
  const langSw = () => `<div class="lang" data-hl="lang"><button type="button" class="${slot.lang === "ru" ? "on" : ""}" data-act="lang" data-l="ru">RU</button><button type="button" class="${slot.lang === "zh" ? "on" : ""}" data-act="lang" data-l="zh">中文</button></div>`;
  const cn = (id) => (st.client(id) || {}).name || "";
  const line = (k, v) => `<div class="pline"><span>${k}</span><b>${v}</b></div>`;
  const empty = (t) => `<p class="pempty">${t}</p>`;
  const paidPill = (s) => (st.isPaid(s) ? '<span class="st" data-st="in">оплачено</span>' : s.paidUsd > 0 ? `<span class="st" data-st="pack">оплачено ${u.usd(s.paidUsd)}</span>` : '<span class="st" data-st="unk">не оплачено</span>');
  let photoSeq = 500;

  const SCREENS = {
    warehouse: ["home", "accept", "accepted", "pack", "packForm", "packed", "unk", "chats", "chat"],
    cnmanager: ["csum", "cships", "cunk", "chats", "chat"],
    moscow: ["mlist", "mship", "mdone"],
    client: ["ships", "citem", "await", "pay", "profile"],
    admin: ["asum", "aships", "acons", "chats", "chat"],
  };
  const has = (role, screen) => (SCREENS[role] || []).includes(screen);

  function tabs(i) {
    ctx(i);
    const r = slot.role, S = st.S;
    const map = r === "client" ? [["ships", "box", "Грузы"], ["await", "clock", "Жду"], ["pay", "wallet", "Оплаты"], ["profile", "user", "Профиль"]]
      : r === "admin" ? [["asum", "home", "Сводка"], ["aships", "box", "Грузы"], ["acons", "truck", "Отправки"], ["chats", "lang", "Чат", 3]]
      : r === "moscow" ? [["mlist", "pin", "Выдача"], ["mdone", "check", "Выдано"]]
      : r === "cnmanager" ? [["csum", "home", T.t("tab_sum")], ["cships", "box", T.t("tab_cargo")], ["cunk", "alert", T.t("tab_unk")], ["chats", "lang", T.t("tab_chat"), 3]]
      : [["home", "list", T.t("tab_home")], ["accept", "plus", T.t("tab_accept")], ["pack", "layers", T.t("tab_pack")], ["chats", "lang", T.t("tab_chat"), 3]];
    const curTab = { accepted: "accept", packForm: "pack", packed: "pack", unk: "home", chat: "chats", citem: "ships", mship: "mlist" }[slot.screen] || slot.screen;
    const badge = r === "warehouse" ? { pack: st.waiting(slot.wh).length, chats: st.unreadAll("zh", slot.wh) }
      : r === "cnmanager" ? { cunk: st.unknown().length, chats: st.unreadAll("zh") }
      : r === "moscow" ? { mlist: S.ships.filter((s) => s.status === "arrived").length }
      : r === "client" ? { pay: st.money(ME).debt > 0.5 ? 1 : 0 } : { chats: st.unreadAll("ru") };
    return map.map(([k, ic, t, sg]) => `<button type="button" class="${curTab === k ? "on" : ""}" data-act="p" data-s="${k}" data-tab="${k}">${I(ic)}<span>${t}${sg ? `<em> · ${T.t("stage3").toLowerCase()}</em>` : ""}</span><i class="${badge[k] ? "show" : ""}">${badge[k] || ""}</i></button>`).join("");
  }
  function render(i) { ctx(i); return (S_[slot.screen] || S_[App.PHOME[slot.role]])(slot.p); }
  function after(i) { ctx(i); if (slot.screen === "chat") { const v = App.sq(i, ".pview"); v.scrollTop = v.scrollHeight; } }

  // ================= СКЛАД В КИТАЕ =================
  const whName = () => T.wh(st.wh(slot.wh));
  function home() {
    const S = st.S, w = st.wh(slot.wh);
    return `<div class="pp">${head(`<button class="whsel" type="button" data-act="whPick" data-hl="wh-pick">${E(T.t("wh_title", T.wh(w)))}${I("down")}</button>`, E(T.t("wh_worker", st.who(st.WH_STAFF[w.id], T.lang))), langSw())}
      <button class="tile hero" type="button" data-act="p" data-s="accept" data-hl="accept-tile"><span class="ti">${I("plus")}</span><span><b>${T.t("t_accept")}</b><small>${T.t("t_accept_s")}</small></span>${I("chevron")}</button>
      <button class="tile" type="button" data-act="p" data-s="pack"><span class="ti">${I("layers")}</span><span><b>${T.t("t_pack")}</b><small>${T.t("t_pack_s")}</small></span><span class="n">${st.waiting(w.id).length}</span></button>
      <button class="tile" type="button" data-act="p" data-s="unk"><span class="ti alert">${I("alert")}</span><span><b>${T.t("t_unk")}</b><small>${T.t("t_unk_s")}</small></span><span class="n">${st.unknown(w.id).length}</span></button>
      <div class="phead sub"><div><small>${T.t("exp_sub")}</small><h2>${T.t("exp_title")}</h2></div></div>
      ${S.expected.map((e) => `<div class="pcard"><div class="t"><span class="id mono">${E(e.track)}</span>${pill("wait")}</div><div class="sub strong">${E(e.clientId)} · ${E(cn(e.clientId))}</div><div class="sub">${E(e.supplier)}${e.what ? " · " + E(e.what) : ""}</div><div class="sub">${E(T.t("exp_at", T.when(e.at)))}</div></div>`).join("") || empty(T.t("exp_empty"))}
    </div>`;
  }
  function whSheet() {
    App.sheet(cur, `<h3>${T.t("wh_pick")}</h3><p>${T.t("wh_pick_s")}</p><div class="choice">${st.WH.map((w) => `<button type="button" class="${w.id === slot.wh ? "on" : ""}" data-act="whSet" data-k="${w.id}">${I("wh")}<span class="grow">${E(T.wh(w))}<small>${E(st.who(st.WH_STAFF[w.id], T.lang))} · ${T.t("cm_in")}: ${st.waiting(w.id).length}</small></span></button>`).join("")}</div>`);
  }

  // ---------- приёмка ----------
  function draft() {
    if (!App.tmp.acc) App.tmp.acc = { q: "", track: "", supplier: "", photos: [], places: 1, dmg: null, dmgText: "" };
    return App.tmp.acc;
  }
  const hit = (m) => m && (m.kind === "track" || m.kind === "code");
  function foundBox(d, m) {
    if (!m) return `<div class="found idle">${I("search")}<span>${T.t("f_idle")}</span></div>`;
    if (m.kind === "track") return `<div class="found">${I("check")}<span>${E(m.client.id)} · ${E(m.client.name)}<small>${T.t("f_by_track")} · ${E(m.exp.supplier)}${m.exp.what ? " · " + E(m.exp.what) : ""}</small></span></div>`;
    if (m.kind === "code") return `<div class="found">${I("check")}<span>${E(m.client.id)} · ${E(m.client.name)}<small>${T.t("f_by_code")}</small></span></div>`;
    if (m.kind === "like") return `<div class="found idle">${I("search")}<span>${E(T.t("f_like", m.list.join(", ")))}</span></div>`;
    return `<div class="found bad">${I("alert")}<span>${E(T.t("f_bad", d.q.trim().toUpperCase()))}<small>${T.t("f_bad_s")}</small></span></div>`;
  }
  function missing(d, m) {
    const x = [];
    if (!hit(m)) x.push(T.t("m_q"));
    if (!d.photos.length) x.push(T.t("m_photo"));
    if (!(d.places > 0)) x.push(T.t("m_places"));
    if (!d.dmg) x.push(T.t("m_dmg")); else if (d.dmg === "yes" && !d.dmgText.trim()) x.push(T.t("m_dmgtext"));
    return x;
  }
  function camHtml(list, actAdd, kind) {
    return `<div class="cam">${list.map((p) => `<div class="shot">${u.photo(p, kind)}</div>`).join("")}${list.length < 3 ? `<button class="add" type="button" data-act="${actAdd}">${I("camera")}<span>${list.length ? T.t("cam_more") : T.t("cam_first")}</span></button>` : ""}</div>`;
  }
  function accept() {
    const d = draft(), m = st.matchAccept(d.q), miss = missing(d, m);
    return `<div class="pp">${head(T.t("acc_title"), E(T.t("wh_title", whName())), langSw())}
      <label class="fld"><span>${T.t("acc_q")} <b>*</b></span><input class="inp big" data-f="accQ" data-in="accQ" value="${E(d.q)}" placeholder="${T.t("acc_q_ph")}" autocomplete="off" autocapitalize="characters" spellcheck="false" data-hl="acc-q"></label>
      <div class="mt8" data-f="found">${foundBox(d, m)}</div>
      <div class="row wrap mt8">${optBtn("voice", T.t("opt_voice"))}</div>
      <div data-f="extra" ${m && m.kind === "code" ? "" : "hidden"}>
        <label class="fld mt"><span>${T.t("acc_track")}</span><input class="inp" data-in="accTrack" value="${E(d.track)}" placeholder="${T.t("acc_track_ph")}" autocomplete="off"></label>
        <label class="fld mt"><span>${T.t("acc_sup")}</span><input class="inp" data-in="accSup" value="${E(d.supplier)}" placeholder="${T.t("acc_sup_ph")}" autocomplete="off"></label>
      </div>
      <div class="fld mt"><span>${T.t("acc_photo")} <b>*</b></span><div data-f="cam" data-hl="acc-cam">${camHtml(d.photos, "accPhoto")}</div></div>
      <div class="fld mt"><span>${T.t("acc_places")} <b>*</b></span><div class="stepper" data-hl="acc-places"><button type="button" data-act="accPlaces" data-d="-1" aria-label="${T.t("a_less")}">${I("minus")}</button><input class="inp" data-f="accPl" data-in="accPlacesIn" inputmode="numeric" value="${d.places}"><button type="button" data-act="accPlaces" data-d="1" aria-label="${T.t("a_more")}">${I("plus")}</button></div></div>
      <div class="fld mt"><span>${T.t("acc_dmg")} <b>*</b></span><div class="choice cols2" data-hl="acc-dmg"><button type="button" class="${d.dmg === "no" ? "on" : ""}" data-act="accDmg" data-k="no">${T.t("dmg_no")}</button><button type="button" class="${d.dmg === "yes" ? "on" : ""}" data-act="accDmg" data-k="yes">${T.t("dmg_yes")}</button></div>
        <input class="inp" data-f="dmgText" data-in="accDmgText" value="${E(d.dmgText)}" placeholder="${T.t("dmg_ph")}" ${d.dmg === "yes" ? "" : "hidden"}></div>
      <div class="mt"><button class="btn pri lg block" type="button" data-f="btnAccept" data-act="accGo" ${miss.length ? "disabled" : ""} data-hl="acc-go">${I("check")}${T.t("acc_go")}</button>
      <div class="req" data-f="accReq">${miss.length ? E(T.t("need", miss.join(T.lang === "zh" ? "、" : ", "))) : T.t("need_ok")}</div>
      <button class="btn ghost block" type="button" data-f="btnUnk" data-act="accUnk" ${m && m.kind === "none" ? "" : "hidden"}>${I("alert")}${T.t("acc_unk")}</button></div>
    </div>`;
  }
  function syncAccept() {
    const d = draft(), m = st.matchAccept(d.q), miss = missing(d, m), b = q('[data-f="btnAccept"]'); if (!b) return;
    b.disabled = miss.length > 0;
    q('[data-f="accReq"]').textContent = miss.length ? T.t("need", miss.join(T.lang === "zh" ? "、" : ", ")) : T.t("need_ok");
    q('[data-f="found"]').innerHTML = foundBox(d, m);
    q('[data-f="extra"]').hidden = !(m && m.kind === "code");
    q('[data-f="btnUnk"]').hidden = !(m && m.kind === "none");
    q('[data-f="dmgText"]').hidden = d.dmg !== "yes";
    if (App.scenario) App.scenario.decorate();
  }
  function recLines(r) {
    const c = r.clientId ? st.client(r.clientId) : null;
    return (c ? line(T.t("l_client"), E(c.id) + " · " + E(c.name)) : "") + line(T.t("l_wh"), E(T.wh(st.wh(r.wh)))) + (r.track ? line(T.t("l_track"), `<span class="mono">${E(r.track)}</span>`) : "") + (c ? line(T.t("l_sup"), E(r.supplier)) : "") + (r.what ? line(T.t("l_what"), E(r.what)) : "")
      + line(T.t("l_places"), T.places(r.places)) + line(T.t("l_dmg"), r.damage ? `<span class="bad">${E(st.dmgText(r, T.lang))}</span>` : T.t("dmg_none"));
  }
  function accepted(id) {
    const r = st.rec(id); if (!r) return home();
    return `<div class="pp center"><div class="okmark">${I("check")}</div><h2 class="okh">${T.t("ok_title")}</h2>
      <p class="muted oks">${E(T.t("ok_sub", r.id))}</p>
      <div class="pcard left"><div class="photos">${r.photos.slice(0, 3).map((p) => `<div class="ph-i">${u.photo(p)}</div>`).join("")}</div>${recLines(r)}</div>
      <button class="btn pri lg block" type="button" data-act="p" data-s="accept">${I("plus")}${T.t("ok_more")}</button>
      <button class="btn lg block mt8" type="button" data-act="p" data-s="home">${T.t("ok_home")}</button></div>`;
  }

  // ---------- упаковка и консолидация ----------
  function packSel() { App.tmp.packSel = App.tmp.packSel.filter((id) => { const r = st.rec(id); return r && r.clientId && !r.cargoId && r.wh === slot.wh; }); return App.tmp.packSel; }
  function packList() {
    const list = st.waiting(slot.wh).sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || b.at - a.at), sel = packSel();
    const order = []; list.forEach((r) => { if (!order.includes(r.clientId)) order.push(r.clientId); });
    const selC = sel.length ? st.rec(sel[0]).clientId : null;
    return `<div class="pp">${head(T.t("pack_title"), E(T.t("pack_sub", whName())), langSw())}
      ${list.length ? `<p class="phint">${T.t("pack_hint")}</p>` : ""}
      ${order.map((cid) => {
        const rs = list.filter((r) => r.clientId === cid), n = rs.filter((r) => sel.includes(r.id)).length;
        return `<div class="pcard grp${selC && selC !== cid ? " dimmed" : ""}"><div class="t"><span class="id">${E(cid)} · ${E(cn(cid))}</span><span class="muted s12">${T.recs(rs.length)}</span></div>
          ${rs.map((r) => `<button class="prow${sel.includes(r.id) ? " on" : ""}" type="button" data-act="packSel" data-id="${r.id}" data-pk="${r.id}"><span class="cb">${sel.includes(r.id) ? I("check") : ""}</span><span class="ct"><b>${E(r.id)} · ${E(r.supplier)}</b><small>${T.places(r.places)} · ${E(T.t("rec_at", T.when(r.at)))}${r.damage ? " · " + T.t("dmg_yes").toLowerCase() : ""}</small></span>${r.fresh ? `<span class="st" data-st="in">${T.t("rec_new")}</span>` : ""}</button>`).join("")}
          ${n ? `<button class="btn pri block mt8" type="button" data-act="packOpen" data-hl="pack-merge">${n > 1 ? E(T.t("pack_goN", n)) : T.t("pack_go1")}</button>` : ""}</div>`;
      }).join("") || empty(T.t("pack_empty"))}
    </div>`;
  }
  function packIds(p) { const ids = String(p || "").split(",").filter(Boolean), rs = ids.map(st.rec); return rs.length && rs.every((r) => r && r.clientId && !r.cargoId && r.clientId === rs[0].clientId && r.wh === rs[0].wh) ? rs : null; }
  function packDraft(p) {
    if (!App.tmp.pack[p]) { const rs = packIds(p) || []; App.tmp.pack[p] = { packType: "", places: rs.reduce((a, r) => a + r.places, 0), weight: "", volume: "", photos: [] }; }
    return App.tmp.pack[p];
  }
  function packMissing(d) {
    const x = [];
    if (!d.packType) x.push(T.t("m_type"));
    if (!(d.places > 0)) x.push(T.t("m_places"));
    if (!(u.parse(d.weight) > 0)) x.push(T.t("m_w"));
    if (!(u.parse(d.volume) > 0)) x.push(T.t("m_v"));
    if (!d.photos.length) x.push(T.t("m_pphoto"));
    return x;
  }
  const densHtml = (d) => { const w = u.parse(d.weight), v = u.parse(d.volume); return w > 0 && v > 0 ? E(T.t("pf_dens", Math.round(w / v))) : ""; };
  function packForm(p) {
    const rs = packIds(p); if (!rs) return packList();
    const d = packDraft(p), miss = packMissing(d), c = st.client(rs[0].clientId);
    return `<div class="pp"><div class="pback" data-act="p" data-s="pack">${I("back")}${T.t("pack_title")}</div>
      ${head(T.t("pf_title"), E(c.id) + " · " + E(c.name))}
      <div class="pcard"><div class="plabel">${T.t("pf_recs")} · ${T.recs(rs.length)}</div>${rs.map((r) => `<div class="pline"><span>${E(r.id)}<small>${E(r.supplier)}</small></span><b>${T.places(r.places)}</b></div>`).join("")}</div>
      <div class="fld"><span>${T.t("pf_type")} <b>*</b></span><div class="choice cols2" data-hl="pack-type">${st.PACK.map((k) => `<button type="button" class="${d.packType === k ? "on" : ""}" data-act="packType" data-k="${k}"><span>${T.t("pk_" + k)}<small>${T.t("pk_" + k + "_h")}</small></span></button>`).join("")}</div></div>
      <div class="fld mt"><span>${T.t("pf_places")} <b>*</b></span><div class="stepper" data-hl="pack-places"><button type="button" data-act="packPlaces" data-d="-1" aria-label="${T.t("a_less")}">${I("minus")}</button><input class="inp" data-f="packPl" data-in="packPlacesIn" inputmode="numeric" value="${d.places}"><button type="button" data-act="packPlaces" data-d="1" aria-label="${T.t("a_more")}">${I("plus")}</button></div></div>
      <div class="row2 mt">
        <label class="fld"><span>${T.t("pf_w")} <b>*</b></span><input class="inp" data-f="packW" data-in="packW" inputmode="decimal" value="${E(d.weight)}" placeholder="0" data-hl="pack-w"></label>
        <label class="fld"><span>${T.t("pf_v")} <b>*</b></span><input class="inp" data-f="packV" data-in="packV" inputmode="decimal" value="${E(d.volume)}" placeholder="0,00" data-hl="pack-v"></label>
      </div>
      <div class="req left" data-f="dens">${densHtml(d)}</div>
      <div class="fld mt8"><span>${T.t("pf_photo")} <b>*</b></span><div data-f="pcam" data-hl="pack-cam">${camHtml(d.photos, "packPhoto", d.packType || "box")}</div></div>
      <div class="mt"><button class="btn pri lg block" type="button" data-f="btnPack" data-act="packGo" ${miss.length ? "disabled" : ""} data-hl="pack-go">${I("check")}${T.t("pf_go")}</button>
      <div class="req" data-f="packReq">${miss.length ? E(T.t("need", miss.join(T.lang === "zh" ? "、" : ", "))) : T.t("pf_ok")}</div></div>
    </div>`;
  }
  function syncPack() {
    const d = packDraft(slot.p), miss = packMissing(d), b = q('[data-f="btnPack"]'); if (!b) return;
    b.disabled = miss.length > 0;
    q('[data-f="packReq"]').textContent = miss.length ? T.t("need", miss.join(T.lang === "zh" ? "、" : ", ")) : T.t("pf_ok");
    q('[data-f="dens"]').innerHTML = densHtml(d);
    if (App.scenario) App.scenario.decorate();
  }
  function cargoLines(c, noLeft) {
    return line(T.t("l_pack"), T.t("pk_" + c.packType)) + line(T.t("l_places"), T.places(c.places)) + line(T.t("l_w"), T.kg(c.weight)) + line(T.t("l_v"), T.vol(c.volume)) + (noLeft ? "" : line(T.t("l_wh"), E(T.wh(st.wh(c.wh)))));
  }
  function packed(id) {
    const c = st.cargo(id); if (!c) return packList();
    return `<div class="pp center"><div class="okmark">${I("check")}</div><h2 class="okh">${T.t("pd_title")}</h2>
      <p class="muted oks">${E(T.t("pd_sub", c.id))}</p>
      <div class="pcard left"><div class="photos">${c.photos.slice(0, 3).map((p) => `<div class="ph-i">${u.photo(p, c.packType)}</div>`).join("")}</div>${line(T.t("l_client"), E(c.clientId) + " · " + E(cn(c.clientId)))}${line(T.t("l_recs"), c.receiptIds.map(E).join(", "))}${cargoLines(c, true)}</div>
      <button class="btn pri lg block" type="button" data-act="p" data-s="pack">${T.t("pd_more")}</button>
      <button class="btn lg block mt8" type="button" data-act="p" data-s="home">${T.t("ok_home")}</button></div>`;
  }
  const unkNote = (x) => (x.track ? T.t("unk_track", x.track) : x.mark ? T.t("unk_mark", x.mark) : T.t("unk_none"));
  function unkCard(x, bind) {
    return `<div class="pcard"><div class="t"><span class="id">${E(x.id)}</span>${pill("unk")}</div><div class="photos"><div class="ph-i">${u.photo(x.photos[0])}</div></div><div class="sub strong">${E(unkNote(x))}</div><div class="sub">${E(T.wh(st.wh(x.wh)))} · ${T.places(x.places)} · ${T.when(x.at)}</div>
      ${bind ? `<div class="row mt8"><select class="inp sm" data-f="unk-${x.id}" aria-label="${T.t("l_client")}">${st.S.clients.map((c) => `<option value="${c.id}">${c.id} ${E(c.name)}</option>`).join("")}</select><button class="btn sm pri" type="button" data-act="unkBind" data-id="${x.id}">${T.t("unk_bind")}</button></div>` : ""}</div>`;
  }
  function unk() {
    return `<div class="pp"><div class="pback" data-act="p" data-s="home">${I("back")}${T.t("tab_home")}</div>${head(T.t("unk_title"), E(T.t("unk_sub") + " · " + whName()))}
      ${st.unknown(slot.wh).sort((a, b) => b.at - a.at).map((x) => unkCard(x, false)).join("") || empty(T.t("unk_empty"))}
      <p class="phint">${T.t("unk_foot")}</p></div>`;
  }

  // ================= МЕНЕДЖЕР КИТАЯ =================
  function csum() {
    const w = st.waiting().length, r = st.ready().length;
    return `<div class="pp">${head(T.t("tab_sum"), E(T.t("cm_who", st.who("wangtao", T.lang))), langSw())}
      <div class="pay-hero"><span>${T.t("cm_hero")}</span><strong>${w + r}</strong><span>${E(T.t("cm_hero_s", w, r))}</span></div>
      ${st.WH.map((x) => `<button class="pcard whc" type="button" data-act="p" data-s="cships" data-p="${x.id}|in" data-whc="${x.id}"><span class="t"><span class="id">${I("wh")}${E(T.wh(x))}</span>${I("chevron")}</span><span class="trio"><span><b>${st.waiting(x.id).length}</b>${T.t("cm_in")}</span><span><b>${st.ready(x.id).length}</b>${T.t("cm_pack")}</span><span class="${st.unknown(x.id).length ? "bad" : ""}"><b>${st.unknown(x.id).length}</b>${T.t("cm_unk")}</span></span><span class="sub">${E(st.who(st.WH_STAFF[x.id], T.lang))}</span></button>`).join("")}
      <p class="phint">${T.t("staff_note")}</p>
    </div>`;
  }
  // p = "склад|вкладка"
  function listScreen(p, name, sub, moneyOk) {
    const [w0, s0] = String(p || "all|in").split("|"), w = w0 === "all" || st.WH.some((x) => x.id === w0) ? w0 : "all", seg = ["in", "pack", "way"].includes(s0) ? s0 : "in";
    const inWh = (id) => w === "all" || id === w;
    const list = seg === "in" ? st.waiting().filter((r) => inWh(r.wh)).sort((a, b) => b.at - a.at).map((r) => `<button class="pcard" type="button" data-act="itemSheet" data-t="rec" data-id="${r.id}"><span class="t"><span class="id">${E(r.clientId)} · ${E(r.id)}</span>${pill("in")}</span><span class="m"><span>${T.places(r.places)}</span><span>${E(T.wh(st.wh(r.wh)))}</span>${r.damage ? `<span class="bad">${T.t("dmg_yes").toLowerCase()}</span>` : ""}</span><span class="sub">${E(cn(r.clientId))} · ${E(r.supplier)}</span></button>`)
      : seg === "pack" ? st.ready().filter((c) => inWh(c.wh)).sort((a, b) => b.at - a.at).map((c) => `<button class="pcard" type="button" data-act="itemSheet" data-t="cargo" data-id="${c.id}"><span class="t"><span class="id">${E(c.clientId)} · ${E(c.id)}</span>${pill("pack")}</span><span class="m"><span>${T.places(c.places)}</span><span>${T.kg(c.weight)}</span><span>${T.vol(c.volume)}</span></span><span class="sub">${E(cn(c.clientId))} · ${E(T.wh(st.wh(c.wh)))} · ${E(T.t("left", st.left(c), c.places))}</span></button>`)
      : st.S.ships.filter((s) => s.status === "way" && (w === "all" || s.items.some((x) => (st.cargo(x.cargoId) || {}).wh === w))).sort((a, b) => a.eta - b.eta).map((s) => { const t = st.totals(s); return `<button class="pcard" type="button" data-act="itemSheet" data-t="ship" data-id="${s.id}"><span class="t"><span class="id">${E(s.clientId)} · ${E(s.id)}</span>${pill("way")}</span><span class="m"><span>${T.places(t.places)}</span><span>${T.kg(t.weight)}</span><span>${T.vol(t.volume)}</span></span><span class="sub">${E(cn(s.clientId))} · ${E(T.t("eta", T.date(s.eta)))}${moneyOk ? " · " + u.usd(s.cost) : ""}</span></button>`; });
    return `<div class="pp">${head(T.t("tab_cargo"), sub, zhRole(slot.role) ? langSw() : "")}
      <div class="pchips" data-hl="wh-chips">${[["all", T.t("all_wh")]].concat(st.WH.map((x) => [x.id, T.wh(x)])).map(([k, t]) => `<button type="button" class="${w === k ? "on" : ""}" data-act="p" data-s="${name}" data-p="${k}|${seg}">${E(t)}</button>`).join("")}</div>
      <div class="pseg">${[["in", T.t("seg_in")], ["pack", T.t("seg_pack")], ["way", T.t("seg_way")]].map(([k, t]) => `<button type="button" class="${seg === k ? "on" : ""}" data-act="p" data-s="${name}" data-p="${w}|${k}">${t}</button>`).join("")}</div>
      ${list.join("") || empty(T.t("cg_empty"))}
    </div>`;
  }
  const cships = (p) => listScreen(p, "cships", T.t("cg_sub"), false);
  function cunk() {
    return `<div class="pp">${head(T.t("unk_title"), E(T.t("unk_sub")), langSw())}
      ${st.unknown().sort((a, b) => b.at - a.at).map((x) => unkCard(x, true)).join("") || empty(T.t("unk_empty"))}
      <p class="phint">${T.t("unk_foot")}</p></div>`;
  }
  function itemSheet(t, id) {
    const money = slot.role === "admin";
    if (t === "rec") { const r = st.rec(id); if (!r) return; App.sheet(cur, `<div class="sh-t"><h3>${E(r.id)}</h3>${pill(r.clientId ? "in" : "unk")}</div><div class="photos">${r.photos.slice(0, 3).map((p) => `<div class="ph-i">${u.photo(p)}</div>`).join("")}</div>${recLines(r)}${line(T.t("l_by"), E(st.who(r.by, T.lang)) + " · " + T.when(r.at))}`); }
    else if (t === "cargo") { const c = st.cargo(id); if (!c) return; App.sheet(cur, `<div class="sh-t"><h3>${E(c.id)}</h3>${pill("pack")}</div><div class="photos">${c.photos.slice(0, 3).map((p) => `<div class="ph-i">${u.photo(p, c.packType)}</div>`).join("")}</div>${line(T.t("l_client"), E(c.clientId) + " · " + E(cn(c.clientId)))}${line(T.t("l_recs"), c.receiptIds.map(E).join(", "))}${cargoLines(c)}${line(T.t("seg_in"), E(T.t("left", st.left(c), c.places)))}`); }
    else { const s = st.ship(id); if (!s) return; const x = st.totals(s); App.sheet(cur, `<div class="sh-t"><h3>${E(s.id)}</h3>${pill(s.status)}</div>${line(T.t("l_client"), E(s.clientId) + " · " + E(cn(s.clientId)))}${line(T.t("l_places"), T.places(x.places))}${line(T.t("l_w"), T.kg(x.weight))}${line(T.t("l_v"), T.vol(x.volume))}${line(T.t("l_eta"), E(T.date(s.status === "way" ? s.eta : s.arrivedAt)))}${money ? line("Стоимость", u.usd(s.cost) + " " + paidPill(s)) : `<p class="phint">${T.t("staff_note")}</p>`}`); }
  }

  // ================= ЧАТ С АВТОПЕРЕВОДОМ (ЭТАП 3) =================
  const chatSide = () => (slot.role === "admin" ? "ru" : "zh");
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
      const side = s.role === "admin" ? "ru" : zhRole(s.role) ? "zh" : null;
      if (!side || side === m.side || (s.role === "warehouse" && s.wh !== t.wh) || (s.screen === "chat" && s.p === t.id)) return;
      App.showPush(i, App.i18n.of(side === "zh" ? s.lang : "ru").t("ch_new") + " · " + st.who(m.by, side), m.k ? P[m.k][side] : m.text, ["chat", t.id]);
    });
    if (m.side === "zh" && App.ui.mode === "desk" && (App.ui.deskRole === "admin" || App.ui.deskRole === "manager") && App.ui.desk !== "chat") App.dpush("Новое сообщение · " + st.who(m.by) + ", склад " + st.wh(t.wh).ru, m.k ? P[m.k].ru : m.text, ["chat", t.id]);
  });

  // ================= МОСКВА: ВЫДАЧА =================
  function shipCardM(s, extra) {
    const t = st.totals(s);
    return `<span class="t"><span class="id">${E(s.id)}</span>${extra}</span><span class="sub strong">${E(s.clientId)} · ${E(cn(s.clientId))}</span><span class="m"><span>${u.places(t.places)}</span><span>${u.kg(t.weight)}</span><span>${u.vol(t.volume)}</span></span>`;
  }
  function mlist() {
    const S = st.S, arr = S.ships.filter((s) => s.status === "arrived").sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || b.arrivedAt - a.arrivedAt), way = S.ships.filter((s) => s.status === "way").sort((a, b) => a.eta - b.eta);
    const canArr = st.can("arrive", "moscow");
    return `<div class="pp">${head("Выдача", "Сергей Никитин · склад в Москве")}
      <div class="pay-hero"><span>Ждут выдачи</span><strong>${arr.length} ${u.plural(arr.length, "отправка", "отправки", "отправок")}</strong><span>${u.places(arr.reduce((a, s) => a + st.totals(s).places, 0))} на складе в Москве</span></div>
      ${arr.map((s) => `<button class="pcard${s.fresh ? " new" : ""}" type="button" data-act="p" data-s="mship" data-p="${s.id}" data-ms="${s.id}">${shipCardM(s, paidPill(s))}<span class="sub">прибыла ${u.when(s.arrivedAt)}</span></button>`).join("") || empty("Все прибывшие грузы выданы.")}
      <div class="phead sub"><div><small>отметку «Прибыла» ставит менеджер${canArr ? " или вы" : ""}</small><h2>В пути</h2></div></div>
      ${way.map((s) => `<div class="pcard">${shipCardM(s, pill("way"))}<span class="sub">прибытие около ${u.dLong(s.eta)}</span>${canArr ? `<button class="btn sm block mt8" type="button" data-act="mArrive" data-id="${s.id}">${I("pin")}Прибыла в Россию</button>` : ""}</div>`).join("") || empty("В пути ничего нет.")}
    </div>`;
  }
  function mship(id) {
    const s = st.ship(id); if (!s || s.status !== "arrived") return mlist();
    const c = st.client(s.clientId), t = st.totals(s), can = st.can("issue", "moscow");
    return `<div class="pp"><div class="pback" data-act="p" data-s="mlist">${I("back")}Выдача</div>
      <div class="phead"><div><small>${E(c.id)} · ${E(c.name)}</small><h2>${E(s.id)}</h2></div>${pill("arrived")}</div>
      <div class="pcard">${line("Клиент", E(c.name) + ", " + E(c.city))}${line("Контакт", E(c.person) + "<small>" + E(c.phone) + "</small>")}${line("Мест", u.places(t.places))}${line("Вес и объём", u.kg(t.weight) + " · " + u.vol(t.volume))}${line("Оплата", u.usd(s.cost) + " " + paidPill(s))}</div>
      <div class="pcard"><div class="plabel">Состав</div>${s.items.map((x) => { const cg = st.cargo(x.cargoId); return `<div class="pline"><span>${E(cg.id)}<small>${T.t("pk_" + cg.packType)}</small></span><b>${u.places(x.places)}</b></div>`; }).join("")}</div>
      ${can ? `<div class="stack" data-hl="ms-actions"><button class="btn pri lg block" type="button" data-act="msGive" data-id="${s.id}">${I("check")}Выдать клиенту</button><button class="btn lg block" type="button" data-act="msTk" data-id="${s.id}">${I("truck")}Передать в транспортную компанию</button></div>` : '<p class="phint">Выдачу для этой роли отключили в настройке этапов.</p>'}
    </div>`;
  }
  function mdone() {
    const list = st.S.ships.filter((s) => s.status === "done").sort((a, b) => b.doneAt - a.doneAt);
    return `<div class="pp">${head("Выдано", "история выдачи")}
      ${list.map((s) => `<div class="pcard">${shipCardM(s, pill("done", s.issue && s.issue.type === "tk" ? "Передан в ТК" : "Выдан"))}<span class="sub">${s.issue && s.issue.type === "tk" ? E(s.issue.tk) + ", накладная " + E(s.issue.waybill) : "выдан клиенту"} · ${u.dShort(s.doneAt)}</span></div>`).join("") || empty("Пока ничего не выдано.")}
    </div>`;
  }
  function tkSheet() {
    const d = App.tmp.issue, ok = d.tk && d.waybill.trim();
    App.sheet(cur, `<h3>Передать в транспортную компанию</h3><p>Отправка ${E(d.id)}. Клиент получит уведомление с номером накладной.</p>
      <div class="fld"><span>Транспортная компания</span><div class="choice cols3" data-hl="tk-pick">${st.TK.map((k) => `<button type="button" class="${d.tk === k ? "on" : ""}" data-act="tkPick" data-k="${k}">${k}</button>`).join("")}</div></div>
      <label class="fld mt"><span>Номер накладной</span><input class="inp" data-f="tkWb" data-in="tkWb" value="${E(d.waybill)}" placeholder="с квитанции ТК" autocomplete="off" data-hl="tk-wb"></label>
      <button class="btn pri lg block mt" type="button" data-f="tkGo" data-act="tkGo" ${ok ? "" : "disabled"}>${I("truck")}Передать</button>`);
  }

  // ================= КЛИЕНТ =================
  const clientHead = (t, right) => { const c = st.client(ME); return head(t, E(c.name) + " · " + E(c.id), right); };
  const PKG = (k) => App.i18n.of("ru").t("pk_" + k);
  function ships(p) {
    const tab = p === "archive" ? "archive" : "active", S = st.S;
    const sh = S.ships.filter((s) => s.clientId === ME), act = sh.filter((s) => s.status !== "done").sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || b.sentAt - a.sentAt), arc = sh.filter((s) => s.status === "done").sort((a, b) => b.doneAt - a.doneAt);
    const cg = st.ready().filter((c) => c.clientId === ME).sort((a, b) => b.at - a.at), rc = st.waiting().filter((r) => r.clientId === ME).sort((a, b) => b.at - a.at), ex = S.expected.filter((e) => e.clientId === ME);
    const debt = st.money(ME).debt, nAct = act.length + cg.length + rc.length;
    const bell = `<button class="x soft" type="button" data-act="notes" aria-label="Уведомления">${I("bell")}</button>`;
    const shipC = (s) => { const t = st.totals(s); return `<button class="pcard${s.fresh ? " new" : ""}" type="button" data-act="p" data-s="citem" data-p="ship:${s.id}" data-ci="ship:${s.id}"><span class="t"><span class="id">${E(s.id)}</span>${pill(s.status, s.status === "done" && s.issue && s.issue.type === "tk" ? "Передан в ТК" : null)}</span><span class="m"><span>${u.places(t.places)}</span><span>${u.kg(t.weight)}</span><span>${u.vol(t.volume)}</span></span><span class="sub">${s.status === "way" ? "Прибытие около " + u.dLong(s.eta) : s.status === "arrived" ? "Прибыла в Россию, готовим к выдаче" : s.issue && s.issue.type === "tk" ? "Передана в " + E(s.issue.tk) + " " + u.dShort(s.doneAt) : "Выдана " + u.dShort(s.doneAt)} · ${u.usd(s.cost)}, ${st.isPaid(s) ? "оплачено" : "не оплачено"}</span></button>`; };
    const list = tab === "archive" ? arc.map(shipC).join("") : act.map(shipC).join("")
      + cg.map((c) => `<button class="pcard${c.fresh ? " new" : ""}" type="button" data-act="p" data-s="citem" data-p="cargo:${c.id}" data-ci="cargo:${c.id}"><span class="t"><span class="id">${E(c.id)}</span>${pill("pack")}</span><span class="photos">${c.photos.slice(0, 1).map((x) => `<span class="ph-i">${u.photo(x, c.packType)}</span>`).join("")}${c.receiptIds.slice(0, 2).map((id) => `<span class="ph-i">${u.photo(st.rec(id).photos[0])}</span>`).join("")}</span><span class="m"><span>${u.places(c.places)}</span><span>${u.kg(c.weight)}</span><span>${u.vol(c.volume)}</span></span><span class="sub">${c.sent ? "На складе " + st.left(c) + " из " + c.places + " мест, остальные уже едут" : "Готов к отгрузке, склад " + E(st.wh(c.wh).ru)}</span></button>`).join("")
      + rc.map((r) => `<button class="pcard${r.fresh ? " new" : ""}" type="button" data-act="p" data-s="citem" data-p="rec:${r.id}" data-ci="rec:${r.id}"><span class="t"><span class="id">${E(r.id)}</span>${pill("in")}</span><span class="photos">${r.photos.slice(0, 3).map((x) => `<span class="ph-i">${u.photo(x)}</span>`).join("")}</span><span class="m"><span>${u.places(r.places)}</span><span>${E(r.supplier)}</span></span><span class="sub">Принят ${u.when(r.at)}, склад ${E(st.wh(r.wh).ru)}${r.damage ? ". Есть повреждения" : ""}</span></button>`).join("")
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
      return `<div class="pp">${back}<div class="phead"><div><small>Приход · ${E(r.supplier)}</small><h2>${E(r.id)}</h2></div>${pill(cg ? "pack" : "in")}</div>
        <div class="photos gap">${r.photos.map((x) => `<div class="ph-i">${u.photo(x)}<em>склад</em></div>`).join("")}</div>
        <div class="pcard">${line("Склад", E(st.wh(r.wh).ru))}${r.track ? line("Трек-номер", `<span class="mono">${E(r.track)}</span>`) : ""}${line("Поставщик", E(r.supplier))}${r.what ? line("Что внутри", E(r.what)) : ""}${line("Мест", u.places(r.places))}${line("Повреждения", r.damage ? `<span class="bad">${E(st.dmgText(r))}</span>` : "нет")}</div>
        ${cg ? `<button class="pcard" type="button" data-act="p" data-s="citem" data-p="cargo:${cg.id}"><span class="t"><span class="strong">Вошёл в груз ${E(cg.id)}</span>${I("chevron")}</span><span class="sub">${PKG(cg.packType)}, ${u.places(cg.places)}, ${u.kg(cg.weight)}, ${u.vol(cg.volume)}</span></button>` : '<p class="phint">Вес и объём появятся после упаковки. Если вы ждёте ещё посылки, склад соберёт их в один груз.</p>'}
        <div class="pcard">${tl([r.expAt ? ["done", "Вы внесли трек-номер", dt(r.expAt)] : null, [cg ? "done" : "cur", "Принят на складе (" + E(st.wh(r.wh).ru) + ")", dt(r.at)], cg ? ["done", "Упакован в составе груза " + E(cg.id), dt(cg.at)] : ["todo", "Упаковка", ""], ["todo", "Отправка из Китая", ""]].filter(Boolean))}</div></div>`;
    }
    if (t === "cargo") {
      const c = st.cargo(id); if (!c || c.clientId !== ME) return ships();
      const recs = c.receiptIds.map(st.rec).filter(Boolean), sh = st.shipsOfCargo(c.id), lf = st.left(c);
      return `<div class="pp">${back}<div class="phead"><div><small>Груз · склад ${E(st.wh(c.wh).ru)}</small><h2>${E(c.id)}</h2></div>${pill("pack")}</div>
        <div class="photos gap">${c.photos.map((x) => `<div class="ph-i">${u.photo(x, c.packType)}<em>упаковка</em></div>`).join("")}${recs.slice(0, 2).map((r) => `<div class="ph-i">${u.photo(r.photos[0])}<em>склад</em></div>`).join("")}</div>
        <div class="pcard">${line("Упаковка", PKG(c.packType))}${line("Мест после упаковки", u.places(c.places))}${line("Вес", u.kg(c.weight))}${line("Объём", u.vol(c.volume))}${line("Сейчас на складе", lf ? lf + " из " + c.places + " мест" : "всё отправлено")}</div>
        <div class="pcard"><div class="plabel">Что вошло в груз</div>${recs.map((r) => `<div class="pline"><span>${E(r.id)}<small>${E(r.supplier)}</small></span><b>${u.places(r.places)}</b></div>`).join("")}</div>
        ${sh.map((s) => `<button class="pcard" type="button" data-act="p" data-s="citem" data-p="ship:${s.id}"><span class="t"><span class="strong">Отправка ${E(s.id)}</span>${pill(s.status)}</span><span class="sub">${u.places(s.items.find((x) => x.cargoId === c.id).places)} · отправлена ${u.dShort(s.sentAt)}</span></button>`).join("")}
        <div class="pcard">${tl(recs.map((r) => ["done", "Приход " + E(r.id) + " принят", dt(r.at)]).concat([[sh.length ? "done" : "cur", "Упакован, готов к отгрузке", dt(c.at)]], sh.map((s) => ["done", "Отправлено " + u.places(s.items.find((x) => x.cargoId === c.id).places) + ", трек " + E(s.id), dt(s.sentAt)]), lf ? [["todo", sh.length ? "Отправка остатка: " + u.places(lf) : "Отправка из Китая", ""]] : []))}</div></div>`;
    }
    const s = st.ship(id); if (!s || s.clientId !== ME) return ships();
    const x = st.totals(s), rest = s.items.reduce((a, y) => a + st.left(st.cargo(y.cargoId)), 0), all = s.items.reduce((a, y) => a + st.cargo(y.cargoId).places, 0);
    const iss = s.issue ? (s.issue.type === "tk" ? "Передана в " + E(s.issue.tk) + ", накладная " + E(s.issue.waybill) : "Выдана") : "";
    return `<div class="pp">${back}<div class="phead"><div><small>Отправка · ${E(st.TRANSPORT[s.transport].label)}</small><h2>${E(s.id)}</h2></div>${pill(s.status, s.status === "done" && s.issue && s.issue.type === "tk" ? "Передан в ТК" : null)}</div>
      <div class="pcard track" data-hl="client-track"><div class="t"><span class="muted s12">Трек-номер</span><span class="muted s12">${s.status === "way" ? "прибытие" : s.status === "arrived" ? "прибыла" : "выдана"}</span></div><div class="t"><span class="id big">${E(s.id)}</span><span class="strong">${s.status === "way" ? "≈" + u.NB + u.dLong(s.eta) : u.dLong(s.status === "arrived" ? s.arrivedAt : s.doneAt)}</span></div>
        <div class="sub">${x.places < all ? `Едет ${x.places} из ${all} мест${rest ? ", ещё " + rest + " на складе в Китае" : ""}` : "Груз едет целиком: " + u.places(x.places)}</div></div>
      <div class="pcard">${line("Мест", u.places(x.places))}${line("Вес", u.kg(x.weight))}${line("Объём", u.vol(x.volume))}${line("Стоимость", u.usd(s.cost))}${line("Оплата", paidPill(s))}</div>
      <div class="pcard" data-hl="client-docs"><div class="plabel">Документы</div>${s.docs.map((d) => `<div class="pline"><span>${E(d.name)}<small>${u.dShort(d.at)}</small></span><button class="btn sm" type="button" data-act="toast" data-t="В рабочей версии файл скачается: ${E(d.name)}" data-i="download">${I("download")}</button></div>`).join("") || '<p class="muted s13 p0">Менеджер прикрепит документы к отправке.</p>'}</div>
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

  // ================= АДМИНИСТРАТОР НА ТЕЛЕФОНЕ =================
  function events(n) {
    const ev = [], S = st.S;
    S.receipts.forEach((r) => ev.push({ at: r.at, ic: "box", t: r.id + (r.clientId ? " принят на складе" : " не опознан"), sub: (r.clientId ? cn(r.clientId) : "клиент не найден") + " · " + st.wh(r.wh).ru }));
    S.cargos.forEach((c) => ev.push({ at: c.at, ic: "layers", t: c.id + " упакован", sub: cn(c.clientId) + " · " + u.places(c.places) }));
    S.ships.forEach((s) => { ev.push({ at: s.sentAt, ic: "truck", t: s.id + " отправлена из Китая", sub: cn(s.clientId) }); if (s.arrivedAt) ev.push({ at: s.arrivedAt, ic: "pin", t: s.id + " прибыла в Россию", sub: cn(s.clientId) }); if (s.doneAt) ev.push({ at: s.doneAt, ic: "check", t: s.id + (s.issue && s.issue.type === "tk" ? " передана в ТК" : " выдана"), sub: cn(s.clientId) }); });
    return ev.sort((a, b) => b.at - a.at).slice(0, n);
  }
  function asum() {
    const S = st.S, w = st.waiting().length, r = st.ready().length, way = S.ships.filter((s) => s.status === "way").sort((a, b) => a.eta - b.eta), arr = S.ships.filter((s) => s.status === "arrived"), m = st.money(), un = st.unknown().length;
    return `<div class="pp">${head("Сводка", "Рамиль · администратор")}
      <div class="pay-hero"><span>На складах в Китае</span><strong>${w + r} ${u.plural(w + r, "груз", "груза", "грузов")}</strong><span>ждут упаковки: ${w} · готовы к отгрузке: ${r}</span></div>
      <div class="duo">
        <button class="pcard" type="button" data-act="p" data-s="acons"><span class="sub">В пути</span><span class="num">${way.length}</span><span class="sub">${way.length ? "ближайшая " + u.dShort(way[0].eta) : "нет"}</span></button>
        <button class="pcard" type="button" data-act="p" data-s="acons"><span class="sub">Ждут выдачи</span><span class="num">${arr.length}</span><span class="sub">в Москве</span></button>
      </div>
      <div class="pcard"><div class="t"><span><span class="sub m0">Не оплачено клиентами</span><span class="num bad">${u.usd(m.debt)}</span></span><span class="muted s12 rt2">${S.clients.filter((c) => st.money(c.id).debt > 0.5).length} ${u.plural(S.clients.filter((c) => st.money(c.id).debt > 0.5).length, "клиент", "клиента", "клиентов")}</span></div></div>
      ${un ? `<button class="tile" type="button" data-act="aUnk"><span class="ti alert">${I("alert")}</span><span><b>Неопознанные грузы</b><small>ждут привязки к клиенту</small></span><span class="n">${un}</span></button>` : ""}
      <div class="pcard"><div class="plabel">Последние события</div>${events(6).map((e) => `<div class="pline ev"><span class="evi">${I(e.ic)}</span><span class="grow">${E(e.t)}<small>${E(e.sub)}</small></span><small class="nw">${u.when(e.at)}</small></div>`).join("")}</div>
    </div>`;
  }
  const aships = (p) => listScreen(p, "aships", "все склады и клиенты", true);
  function acons() {
    const S = st.S, way = S.ships.filter((s) => s.status === "way").sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || a.eta - b.eta), arr = S.ships.filter((s) => s.status === "arrived").sort((a, b) => b.arrivedAt - a.arrivedAt);
    return `<div class="pp">${head("Отправки", "в пути и на выдаче")}
      ${way.map((s) => `<div class="pcard">${shipCardM(s, pill("way"))}<span class="sub">прибытие около ${u.dLong(s.eta)} · ${u.usd(s.cost)}, ${st.isPaid(s) ? "оплачено" : "не оплачено"}</span><button class="btn sm block mt8" type="button" data-act="aArrive" data-id="${s.id}" data-arr="${s.id}">${I("pin")}Прибыла в Россию</button></div>`).join("") || empty("В пути ничего нет.")}
      <div class="phead sub"><div><small>выдаёт сотрудник в Москве</small><h2>Ждут выдачи</h2></div></div>
      ${arr.map((s) => `<button class="pcard" type="button" data-act="itemSheet" data-t="ship" data-id="${s.id}">${shipCardM(s, paidPill(s))}<span class="sub">прибыла ${u.when(s.arrivedAt)}</span></button>`).join("") || empty("Все грузы выданы.")}
    </div>`;
  }

  const S_ = { home, accept, accepted, pack: packList, packForm, packed, unk, csum, cships, cunk, chats, chat, mlist, mship, mdone, ships, citem, await: awaitScreen, pay, profile, asum, aships, acons };

  // ---------- действия ----------
  const A = (fn) => (d, el, e) => { ctx(App.cur); return fn(d, el, e); };
  const go = (s, p) => App.go.phone(cur, s, p == null ? null : p);
  const blur = () => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); };
  const acts = {
    whPick: () => whSheet(),
    whSet: (d) => { slot.wh = d.k; App.tmp.packSel = []; App.saveUI(); App.closeSheet(cur); App.renderSlot(cur, true); },
    // приёмка
    accPhoto: () => { const d = draft(); d.photos.push(photoSeq++); q('[data-f="cam"]').innerHTML = camHtml(d.photos, "accPhoto"); syncAccept(); },
    accPlaces: (x) => { const d = draft(); d.places = Math.max(1, (parseInt(d.places, 10) || 1) + parseInt(x.d, 10)); q('[data-f="accPl"]').value = d.places; syncAccept(); },
    accDmg: (x) => { const d = draft(); d.dmg = x.k; App.slotEl(cur).querySelectorAll('[data-act="accDmg"]').forEach((b) => b.classList.toggle("on", b.dataset.k === x.k)); syncAccept(); },
    accSample: (x) => { const d = draft(); d.q = x.v || "MSK-117"; const el = q('[data-f="accQ"]'); if (el) el.value = d.q; syncAccept(); },
    accFill: (x) => { blur(); const d = draft(); if (!hit(st.matchAccept(d.q))) d.q = x.v || "MSK-117"; if (!d.photos.length) d.photos.push(photoSeq++, photoSeq++); if (d.places < 2) d.places = 8; if (!d.dmg) d.dmg = "no"; App.refresh(true); },
    accGo: () => {
      const d = draft(), m = st.matchAccept(d.q); if (!hit(m) || missing(d, m).length) return;
      const base = { wh: slot.wh, clientId: m.client.id, places: d.places, damage: d.dmg === "yes" ? d.dmgText.trim() : "", photos: d.photos };
      const r = st.accept(m.kind === "track" ? Object.assign(base, { track: m.exp.track, supplier: m.exp.supplier, what: m.exp.what, expId: m.exp.id, expAt: m.exp.at }) : Object.assign(base, { track: d.track, supplier: d.supplier }));
      App.tmp.acc = null; go("accepted", r.id);
      if (App.scenario) App.scenario.check("accepted", r);
    },
    accUnk: () => {
      const d = draft(), s = d.q.trim().toUpperCase(), isTrack = s.replace(/\D/g, "").length >= 8;
      const r = st.toUnknown({ wh: slot.wh, track: isTrack ? s : "", mark: isTrack ? "" : s, places: d.places, damage: d.dmg === "yes" ? d.dmgText.trim() : "", photos: d.photos.length ? d.photos : [photoSeq++] });
      App.tmp.acc = null; App.toast(T.t("unk_done", r.id), "alert"); go("unk");
    },
    // упаковка
    packSel: (x) => {
      const r = st.rec(x.id), sel = packSel(); if (!r) return;
      if (sel.length && st.rec(sel[0]).clientId !== r.clientId) App.tmp.packSel = [x.id];
      else { const i = sel.indexOf(x.id); if (i >= 0) sel.splice(i, 1); else sel.push(x.id); }
      App.refresh(true);
    },
    packOpen: () => { const sel = packSel(); if (sel.length) go("packForm", sel.join(",")); },
    packType: (x) => { const d = packDraft(slot.p); d.packType = x.k; App.slotEl(cur).querySelectorAll('[data-act="packType"]').forEach((b) => b.classList.toggle("on", b.dataset.k === x.k)); q('[data-f="pcam"]').innerHTML = camHtml(d.photos, "packPhoto", d.packType); syncPack(); },
    packPlaces: (x) => { const d = packDraft(slot.p); d.places = Math.max(1, (parseInt(d.places, 10) || 1) + parseInt(x.d, 10)); q('[data-f="packPl"]').value = d.places; syncPack(); },
    packPhoto: () => { const d = packDraft(slot.p); d.photos.push(photoSeq++); q('[data-f="pcam"]').innerHTML = camHtml(d.photos, "packPhoto", d.packType || "box"); syncPack(); },
    packFill: () => { blur(); const d = packDraft(slot.p); d.packType = d.packType || "crate"; d.places = Math.max(1, Math.min(d.places, 6)); d.weight = d.weight || "142"; d.volume = d.volume || "0,86"; if (!d.photos.length) d.photos.push(photoSeq++); App.refresh(true); },
    packGo: () => {
      const p = slot.p, rs = packIds(p), d = packDraft(p); if (!rs || packMissing(d).length) return;
      const c = st.pack(rs.map((r) => r.id), { packType: d.packType, places: d.places, weight: u.parse(d.weight), volume: u.parse(d.volume), photos: d.photos });
      delete App.tmp.pack[p]; App.tmp.packSel = [];
      if (c) { go("packed", c.id); if (App.scenario) App.scenario.check("packed", c); }
    },
    unkBind: (x) => { const sel = q(`[data-f="unk-${x.id}"]`), r = st.assignUnknown(x.id, sel.value); App.closeSheet(cur); if (r) App.toast(T.t("unk_bound", r.id, r.clientId), "check"); },
    itemSheet: (x) => { itemSheet(x.t, x.id); if (App.scenario) App.scenario.check("openItem", x.t + ":" + x.id); },
    // Москва
    mArrive: (x) => { const s = st.arrive(x.id, "sergey"); if (s) { App.toast(`Отправка ${s.id} прибыла в Россию, клиент получил уведомление`, "bell"); if (App.scenario) App.scenario.check("arrived", s); } },
    msGive: (x) => App.sheet(cur, `<h3>Выдать клиенту</h3><p>Отправка ${E(x.id)}: ${u.places(st.totals(st.ship(x.id)).places)}. Клиент получит уведомление, груз уйдёт в архив.</p>${st.isPaid(st.ship(x.id)) ? "" : '<div class="note warn">Отправка не оплачена. Уточните у менеджера, можно ли выдавать.</div>'}<button class="btn pri lg block mt" type="button" data-f="giveGo" data-act="giveGo" data-id="${x.id}">${I("check")}Подтвердить выдачу</button>`),
    giveGo: (x) => { const s = st.issue(x.id, { type: "client", by: "sergey" }); App.closeSheet(cur); if (s) { App.toast(`Отправка ${s.id} выдана клиенту`, "check"); go("mlist"); if (App.scenario) App.scenario.check("issued", s); } },
    msTk: (x) => { App.tmp.issue = { id: x.id, tk: null, waybill: "" }; tkSheet(); },
    tkPick: (x) => { App.tmp.issue.tk = x.k; App.slotEl(cur).querySelectorAll('[data-act="tkPick"]').forEach((b) => b.classList.toggle("on", b.dataset.k === x.k)); q('[data-f="tkGo"]').disabled = !App.tmp.issue.waybill.trim(); if (App.scenario) App.scenario.decorate(); },
    tkFill: () => { blur(); const d = App.tmp.issue; if (!d) return; d.tk = d.tk || "СДЭК"; d.waybill = d.waybill || "10094417725"; tkSheet(); },
    tkGo: () => { const d = App.tmp.issue; if (!d || !d.tk || !d.waybill.trim()) return; const s = st.issue(d.id, { type: "tk", tk: d.tk, waybill: d.waybill, by: "sergey" }); App.closeSheet(cur); App.tmp.issue = null; if (s) { App.toast(`Отправка ${s.id} передана в ${s.issue.tk}`, "truck"); go("mlist"); if (App.scenario) App.scenario.check("issued", s); } },
    // клиент
    awFill: () => { blur(); const d = awDraft(); d.track = d.track || "YT8830215567104"; d.supplier = d.supplier || "Yiwu Lanxi Lighting"; d.what = d.what || "Светильники, 8 коробок"; App.refresh(true); },
    awGo: () => { const d = awDraft(); if (!awOk(d)) return; const e = st.addExpected(ME, d); App.tmp.aw = null; App.refresh(true); App.toast("Трек-номер добавлен, склад его уже видит", "check"); if (App.scenario) App.scenario.check("expected", e); },
    awDel: (x) => { st.removeExpected(x.id); App.toast("Трек-номер удалён", "x"); },
    notes: () => { const list = st.S.notes.filter((n) => n.clientId === ME).slice(0, 8); App.sheet(cur, `<h3>Уведомления</h3>${list.map((n) => `<div class="pline top"><span>${E(n.text)}<small>${u.when(n.at)}</small></span></div>`).join("")}`); },
    reqs: () => App.sheet(cur, `<h3>Реквизиты для оплаты</h3><p>Здесь будут реквизиты вашей компании. Назначение платежа подставляется само: оплата доставки, код ${ME}.</p><button class="btn pri block" type="button" data-act="toast" data-t="Реквизиты скопированы" data-i="check">Скопировать</button>`),
    tgOn: () => App.sheet(cur, `<h3>Подключить Telegram</h3><p>Откройте нашего бота в Telegram и отправьте ему код привязки. Уведомления будут приходить и в приложение, и в Telegram.</p><div class="note code4">4821</div><button class="btn pri block mt" type="button" data-act="tgDone">${I("tg")}Я отправил код</button>`),
    tgDone: () => { st.setTg(true); App.closeSheet(cur); App.toast("Telegram подключён", "tg"); },
    // администратор
    aArrive: (x) => { const s = st.arrive(x.id, "ramil"); if (s) { App.toast(`Отправка ${s.id} прибыла в Россию, клиент получил уведомление`, "bell"); if (App.scenario) App.scenario.check("arrived", s); } },
    aUnk: () => App.sheet(cur, `<h3>Неопознанные грузы</h3>${st.unknown().sort((a, b) => b.at - a.at).map((x) => unkCard(x, true)).join("") || "<p>Всё разобрано.</p>"}`),
  };
  Object.keys(acts).forEach((k) => { App.acts[k] = A(acts[k]); });
  const ins = {
    accQ: (v) => { draft().q = v; syncAccept(); },
    accTrack: (v) => { draft().track = v; },
    accSup: (v) => { draft().supplier = v; },
    accPlacesIn: (v) => { draft().places = Math.max(0, parseInt(v, 10) || 0); syncAccept(); },
    accDmgText: (v) => { draft().dmgText = v; syncAccept(); },
    packPlacesIn: (v) => { packDraft(slot.p).places = Math.max(0, parseInt(v, 10) || 0); syncPack(); },
    packW: (v) => { packDraft(slot.p).weight = v; syncPack(); },
    packV: (v) => { packDraft(slot.p).volume = v; syncPack(); },
    awTrack: (v) => { const d = awDraft(); d.track = v; const b = q('[data-f="awGo"]'); if (b) b.disabled = !awOk(d); if (App.scenario) App.scenario.decorate(); },
    awSup: (v) => { awDraft().supplier = v; },
    awWhat: (v) => { awDraft().what = v; },
    tkWb: (v) => { const d = App.tmp.issue; if (!d) return; d.waybill = v; const b = q('[data-f="tkGo"]'); if (b) b.disabled = !(d.tk && v.trim()); if (App.scenario) App.scenario.decorate(); },
    pchat: (v) => { App.tmp.ptext[cur] = v; },
  };
  Object.keys(ins).forEach((k) => { App.ins[k] = (v, el, e) => { ctx(App.cur); return ins[k](v, el, e); }; });

  App.P = { tabs, render, after, has, shown };
})(window.App);
