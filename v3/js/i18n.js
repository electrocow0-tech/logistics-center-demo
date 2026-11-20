/* Словарь интерфейса: русский и китайский (упрощённые иероглифы, складская лексика).
   Китайский интерфейс есть у роли «Склад в Китае», переключается кнопкой RU / 中文. Склад в Москве и клиент только на русском. Названия видов упаковки по-китайски взяты из ТЗ заказчика. */
(function (App) {
  "use strict";
  const u = App.u, NB = u.NB, PK = ["bag", "crate", "pallet", "wbox"];

  const ru = {
    // статусы
    st_wait: "Ожидается", st_in: "Принят на складе", st_packing: "На упаковке", st_pack: "Упакован", st_way: "В пути", st_arrived: "Прибыл в Москву", st_done: "Выдан", st_unk: "Не опознан",
    ts_collect: "Сборка", ts_packing: "Упаковка",
    // упаковка и доставка
    pk_bag: "Мешок и скотч", pk_crate: "Обрешётка", pk_pallet: "Паллет", pk_wbox: "Ящик",
    tr_auto: "Авто", tr_rail: "ЖД", tr_air: "Авиа", tr_none: "пока не указан",
    // вкладки
    tab_accept: "Приёмка", tab_tasks: "Задачи", tab_packs: "Упаковка", tab_done: "Упаковано", tab_report: "Отчёт",
    wh: "Склад",
    wh_title: "Склад · {0}", wh_pick: "Выберите склад", wh_pick_s: "У каждого склада свои сотрудники и свои грузы", wh_cnt: "на складе: {0}",
    // приёмка
    acc_title: "Приёмка", seg_accept: "Принять", seg_stock: "На складе",
    scan_btn: "Сканировать трек", scan_btn_s: "камерой телефона, без сканера", scan_hint: "Наведите камеру на штрих-код", scan_ok: "Трек распознан", scan_cancel: "Отмена",
    acc_track: "Китайский трек-номер", acc_track_ph: "или введите вручную",
    acc_client: "Код клиента", acc_client_ph: "Начните вводить код или название", f_by_track: "нашёлся по треку: клиент внёс его заранее", f_by_hand: "выбран из списка", ta_empty: "Никого не нашли",
    acc_photo: "Фото груза", cam_first: "Сделать фото", cam_more: "Ещё фото", acc_places: "Количество мест",
    acc_dmg: "Повреждение", dmg_no: "Нет", dmg_yes: "Есть", dmg_ph: "Что повреждено", dmg_none: "нет", dmg_photo: "Фото повреждения",
    acc_deliv: "Доставка до склада", door_sup: "Оплатил поставщик", door_wh: "Оплатили при получении", door_sum: "Сколько заплатили, ¥",
    acc_extra: "Доп. расходы, ¥", acc_note: "Примечание", acc_note_ph: "Всё, что важно знать о грузе", sum_hint: "Суммы увидят администратор и клиент, они войдут в стоимость.",
    l_deliv: "Доставка до склада", l_extra: "Доп. расходы", l_note: "Примечание", door_sup_l: "оплатил поставщик", door_none: "не указана",
    acc_go: "Принять", acc_free: "Все поля необязательные: заполните, что есть.", acc_unk_note: "Код клиента не выбран: груз уйдёт в «Неизвестные».",
    a_less: "Меньше", a_more: "Больше",
    ok_title: "Груз принят", ok_sub: "{0} · клиент уже получил уведомление", ok_unk_title: "Принят в «Неизвестные»", ok_unk_sub: "{0} · администратор привяжет его к клиенту", ok_more: "Принять ещё", ok_stock: "Грузы на складе", no_photo: "без фото",
    l_client: "Клиент", l_sup: "Поставщик", l_track: "Китайский трек", l_places: "Мест", l_dmg: "Повреждение", l_wh: "Склад", l_what: "Что внутри", l_pack: "Вид упаковки", l_w: "Вес", l_v: "Объём", l_name: "Наименование", l_tr: "Вид доставки", l_from: "Команду дал",
    l_route: "Маршрут", l_dest: "Место назначения", l_sent: "Отправлен", l_packed: "Упакован", l_dims: "Размеры, см", l_our: "Наш трек-номер",
    // на складе по кодам клиентов
    stock_sub: "по кодам клиентов · {0}", stock_empty: "На складе пусто.", stock_unk: "Неизвестные", stock_unk_s: "без кода клиента, привяжет администратор",
    s_wait: "лежит на складе", s_task: "в задаче на упаковку", s_lost: "не найден при сборке", rec_at: "принят {0}", stock_hint: "Что и как упаковывать, решает администратор: команда придёт во вкладку «Задачи».",
    // задачи: сборка
    task_title: "Задачи", task_sub: "команды на упаковку · {0}", task_empty: "Новых задач нет. Команды на упаковку даёт администратор.", task_new: "новая", task_push: "Новая задача на упаковку",
    tf_total: "Всего коробок", tf_cards: "Грузы, которые нужно собрать", tf_found: "нашёл", tf_all: "Отметить все", tf_go: "Готово",
    tf_hint: "Отметьте найденные грузы. Если какого-то нет, можно продолжить без него.", tf_lost: "Не найдено: {0}. Останется на складе, администратор увидит это в истории.", tf_need: "Отметьте хотя бы один найденный груз", tf_ok: "Все грузы найдены, можно паковать",
    // упаковка
    pk_title: "Упаковка", pk_sub: "собраны, ждут упаковки · {0}", pk_empty: "Сейчас паковать нечего. Сначала соберите груз во вкладке «Задачи».",
    pf_photo: "Фото упакованного груза", pf_types: "Сколько упаковок каждого вида", pf_dims: "Размеры, см", pf_dim_l: "Длина", pf_dim_w: "Ширина", pf_dim_h: "Высота", pf_dim_n: "Мест", pf_add: "Добавить ещё", pf_del: "Убрать строку",
    pf_w: "Вес, кг", pf_vol: "Объём", pf_vol_auto: "считается сам по размерам", pf_note: "Примечание", pf_go: "Готово", pf_plan: "Команда администратора", pf_ordered: "заказано: {0}", pf_diff: "Упаковано иначе, чем заказано: администратор увидит это в карточке груза.",
    pd_title: "Груз упакован", pd_sub: "{0} · администратор и клиент получили уведомление", pd_more: "К упаковке", pd_list: "Упакованные грузы",
    // упакованные
    dn_title: "Упакованные", dn_sub: "все упакованные грузы · {0}", dn_search: "Трек или наименование", dn_all: "Все", dn_today: "Сегодня", dn_7: "7 дней", dn_30: "30 дней", dn_export: "Excel",
    dn_empty: "Ничего не нашли.", dn_exported: "Файл скачан, открывается в Excel", dn_wait: "ждёт отправки", dn_sent: "отправлен", dn_notsent: "Маршрут и место назначения появятся после отправки.", dn_cnt: "грузов: {0}",
    // отчёт
    rp_title: "Отчёт", rp_sub: "упаковки за месяц · {0}", rp_this: "Этот месяц", rp_prev: "Прошлый месяц", rp_total: "Упаковок за месяц", rp_cargos: "грузов: {0}", rp_list: "упаковано за месяц", rp_empty: "За этот месяц так не упаковывали.", rp_hint: "Нажмите на вид упаковки, чтобы увидеть треки и наименования.",
    staff_note: "Стоимость и оплаты сотрудникам в Китае не показываются.",
    today: "сегодня", yesterday: "вчера",
  };

  const zh = {
    st_wait: "待到货", st_in: "已入库", st_packing: "打包中", st_pack: "已打包", st_way: "运输中", st_arrived: "已到莫斯科", st_done: "已交付", st_unk: "无主货",
    ts_collect: "备货", ts_packing: "打包",
    pk_bag: "套袋缠胶带", pk_crate: "木架", pk_pallet: "托盘", pk_wbox: "木箱",
    tr_auto: "汽运", tr_rail: "铁路", tr_air: "空运", tr_none: "暂未确定",
    tab_accept: "收货", tab_tasks: "任务", tab_packs: "打包", tab_done: "已打包", tab_report: "报表",
    wh: "仓库",
    wh_title: "{0}仓库", wh_pick: "选择仓库", wh_pick_s: "每个仓库有各自的员工和货物", wh_cnt: "在库：{0}",
    acc_title: "收货", seg_accept: "收货", seg_stock: "在库",
    scan_btn: "扫描快递单号", scan_btn_s: "用手机摄像头，无需扫码枪", scan_hint: "将摄像头对准条形码", scan_ok: "识别成功", scan_cancel: "取消",
    acc_track: "国内快递单号", acc_track_ph: "也可手动输入",
    acc_client: "客户代码", acc_client_ph: "输入代码或名称", f_by_track: "按单号匹配：客户已提前登记", f_by_hand: "从列表选择", ta_empty: "未找到客户",
    acc_photo: "货物照片", cam_first: "拍照", cam_more: "再拍一张", acc_places: "件数",
    acc_dmg: "破损情况", dmg_no: "无破损", dmg_yes: "有破损", dmg_ph: "请描述破损情况", dmg_none: "无", dmg_photo: "破损照片",
    acc_deliv: "到仓运费", door_sup: "供应商已付", door_wh: "到付，仓库垫付", door_sum: "垫付金额（元）",
    acc_extra: "其他费用（元）", acc_note: "备注", acc_note_ph: "货物的重要信息", sum_hint: "管理员和客户会看到金额，并计入费用。",
    l_deliv: "到仓运费", l_extra: "其他费用", l_note: "备注", door_sup_l: "供应商已付", door_none: "未填写",
    acc_go: "确认收货", acc_free: "所有项目均为选填，有什么填什么。", acc_unk_note: "未选择客户：货物将登记为无主货。",
    a_less: "减少", a_more: "增加",
    ok_title: "收货成功", ok_sub: "{0} · 已通知客户", ok_unk_title: "已登记为无主货", ok_unk_sub: "{0} · 等待管理员关联客户", ok_more: "继续收货", ok_stock: "在库货物", no_photo: "无照片",
    l_client: "客户", l_sup: "供应商", l_track: "国内单号", l_places: "件数", l_dmg: "破损", l_wh: "仓库", l_what: "品名", l_pack: "包装方式", l_w: "重量", l_v: "体积", l_name: "品名", l_tr: "运输方式", l_from: "下达人",
    l_route: "线路", l_dest: "目的地", l_sent: "发货日期", l_packed: "打包日期", l_dims: "尺寸（厘米）", l_our: "我司运单号",
    stock_sub: "按客户代码 · {0}", stock_empty: "暂无在库货物。", stock_unk: "无主货", stock_unk_s: "无客户代码，等待管理员关联",
    s_wait: "在库", s_task: "已下达打包任务", s_lost: "备货时未找到", rec_at: "{0} 入库", stock_hint: "如何打包由管理员决定，指令会出现在“任务”页。",
    task_title: "任务", task_sub: "打包指令 · {0}", task_empty: "暂无新任务。打包指令由管理员下达。", task_new: "新", task_push: "新的打包任务",
    tf_total: "总箱数", tf_cards: "需要备齐的货物", tf_found: "已找到", tf_all: "全选", tf_go: "完成",
    tf_hint: "勾选已找到的货物。如有缺失，也可以继续。", tf_lost: "未找到：{0}票。货物留在仓库，管理员可在记录中看到。", tf_need: "请至少勾选一票货物", tf_ok: "货物全部找到，可以打包",
    pk_title: "打包", pk_sub: "已备货，待打包 · {0}", pk_empty: "暂无待打包货物。请先在“任务”页备货。",
    pf_photo: "打包后照片", pf_types: "各包装方式数量", pf_dims: "尺寸（厘米）", pf_dim_l: "长", pf_dim_w: "宽", pf_dim_h: "高", pf_dim_n: "件数", pf_add: "再添加", pf_del: "删除此行",
    pf_w: "重量（公斤）", pf_vol: "体积", pf_vol_auto: "按尺寸自动计算", pf_note: "备注", pf_go: "完成", pf_plan: "管理员指令", pf_ordered: "要求：{0}", pf_diff: "实际包装与要求不同：管理员会在货物卡片中看到。",
    pd_title: "打包完成", pd_sub: "{0} · 已通知管理员和客户", pd_more: "返回打包", pd_list: "已打包货物",
    dn_title: "已打包", dn_sub: "全部已打包货物 · {0}", dn_search: "运单号或品名", dn_all: "全部", dn_today: "今天", dn_7: "7天", dn_30: "30天", dn_export: "Excel",
    dn_empty: "未找到。", dn_exported: "文件已下载，可用 Excel 打开", dn_wait: "待发货", dn_sent: "已发货", dn_notsent: "发货后显示线路和目的地。", dn_cnt: "货物：{0}",
    rp_title: "报表", rp_sub: "月度包装统计 · {0}", rp_this: "本月", rp_prev: "上月", rp_total: "本月包装数量", rp_cargos: "货物：{0}", rp_list: "本月打包", rp_empty: "本月没有这种包装。", rp_hint: "点击包装方式，查看运单号和品名。",
    staff_note: "对中国员工不显示费用和付款信息。",
    today: "今天", yesterday: "昨天",
  };

  function make(lang) {
    const d = lang === "zh" ? zh : ru, Z = lang === "zh";
    const t = (k, ...a) => { let s = d[k] != null ? d[k] : ru[k] != null ? ru[k] : k; a.forEach((v, i) => { s = s.replace("{" + i + "}", () => v); }); return s; };
    return {
      lang: Z ? "zh" : "ru", t,
      places: (n) => (Z ? n + NB + "件" : u.places(n)),
      kg: (n) => (Z ? u.groups(Math.round(n)) + NB + "公斤" : u.kg(n)),
      vol: (n) => (Z ? Number(n).toFixed(2) + NB + "m³" : u.vol(n)),
      recs: (n) => (Z ? n + NB + "票到货" : n + NB + u.plural(n, "груз", "груза", "грузов")),
      goods: (n) => (Z ? n + NB + "票" : n + NB + u.plural(n, "груз", "груза", "грузов")),
      // виды упаковки с количеством: «мешок и скотч 30, обрешётка 2»
      packs: (p) => PK.filter((k) => p && p[k] > 0).map((k) => (Z ? t("pk_" + k) : t("pk_" + k).toLowerCase()) + NB + p[k]).join(Z ? "、" : ", ") || (Z ? "未填写" : "не указана"),
      plan: (a) => (a || []).map((k) => (Z ? t("pk_" + k) : t("pk_" + k).toLowerCase())).join(Z ? "、" : ", ") || (Z ? "由仓库决定" : "на усмотрение склада"),
      when: (ts) => { const diff = u.dayDiff(ts); return diff === 0 ? t("today") + NB + u.hm(ts) : diff === 1 ? t("yesterday") + NB + u.hm(ts) : Z ? (new Date(ts).getMonth() + 1) + "月" + new Date(ts).getDate() + "日" : u.dShort(ts); },
      date: (ts) => (Z ? (new Date(ts).getMonth() + 1) + "月" + new Date(ts).getDate() + "日" : u.dLong(ts)),
      wh: (w) => (Z ? w.zh : w.ru),
    };
  }
  const cache = { ru: make("ru"), zh: make("zh") };
  App.i18n = { ru, zh, of: (lang) => cache[lang === "zh" ? "zh" : "ru"] };
})(window.App);
