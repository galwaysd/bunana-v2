/**
 * Bunana i18n translations
 * Languages: zh (default), en, ja, ko
 *
 * Key structure: nested objects, accessed via dot notation: t("nav.workbench")
 * Template variables: {n} syntax, e.g. t("square.resultCount", { n: 5 })
 */

export type Locale = "zh" | "en" | "ja" | "ko";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "zh", label: "中文", flag: "ZH" },
  { code: "en", label: "English", flag: "EN" },
  { code: "ja", label: "日本語", flag: "JA" },
  { code: "ko", label: "한국어", flag: "KO" },
];

type Dict = Record<string, unknown>;

const zh: Dict = {
  nav: {
    brand: "织物工作台",
    workbench: "工作台",
    square: "布市场",
  },
  home: {
    panelLabel: "布样工作台",
    weavingBtn: "开始织卡",
    weavingLoading: "织卡中…",
    reanalyze: "重新分析",
    dnaSubtitle: "织物身份证",
    readingDna: "读取中…",
    pendingWeave: "待织入",
    aiReading: "AI 正在读取布样数据…",
    emptyHint: "上传布样或描述需求后开始织卡",
    aiOrganizing: "AI 自动整理中",
    dnaFields: ["成分", "织法", "克重", "幅宽", "涂层", "防水", "起订量", "交期", "颜色", "特性"],
  },
  dna: {
    fabricName: "面料名称",
    use: "用途",
    composition: "成分",
    weave: "织法",
    weightGsm: "克重",
    width: "幅宽",
    coating: "涂层",
    waterproof: "防水",
    moq: "起订量",
    quantity: "数量",
    destinationMarket: "目标市场",
    leadTime: "交期",
    color: "颜色",
    features: "特性",
  },
  status: {
    confirmed: "已确认",
    identified: "已识别",
    inferred: "推测",
    missing: "缺失",
  },
  imageUploader: {
    remove: "移除",
    uploadHint: "点击上传图片",
    uploadPrompt: "上传 1-3 张布料照片",
  },
  textInput: {
    placeholder: "描述你需要的面料，例如：雨伞用防水布，190T涤塔夫，PU涂层...",
    helperText: "图片和文字至少填一项，最多 1200 字",
  },
  weavingLoader: {
    loading: "布拿拿正在识别面料...",
  },
  publish: {
    publish: "发布广场",
    publishing: "发布中...",
    publishError: "发布失败，请重试。",
    networkError: "网络错误，发布失败。",
  },
  savePng: {
    save: "保存 Fabric DNA",
    saving: "正在生成 PNG...",
    cardNotReady: "卡片尚未渲染，请稍后重试。",
    exportError: "导出 PNG 失败，请重试。",
  },
  dnaCard: {
    subtitle: "织物身份证",
    logoAlt: "布拿拿 Bunana",
    imageAlt: "上传的面料图样",
    editLabel: "编辑{label}",
    clickToEdit: "点击编辑{label}",
  },
  square: {
    title: "Fabric DNA 数据库",
    subtitle: "已构建的面料身份档案",
    backToWorkbench: "← 返回工作台",
    filterComposition: "材质",
    filterUse: "用途",
    filterFeatures: "特性",
    clearFilter: "清除筛选",
    resultCount: "{n} 条结果",
    loading: "加载中...",
    emptyFiltered: "没有匹配的面料档案，试试调整筛选条件。",
    emptyNoData: "暂无 Fabric DNA 档案。回首页创建一份吧。",
    loadFailed: "加载广场失败。",
    networkError: "网络错误，加载失败。",
    unnamedFabric: "未命名面料",
    needFabric: "我需要这个面料",
    haveFabric: "我有这个面料",
  },
  squareDetail: {
    specLabel: "规格",
    notFound: "未找到该记录。",
    networkError: "网络错误，加载失败。",
    loading: "加载中...",
    recordNotExist: "记录不存在",
    backToDatabase: "← 返回 Fabric DNA 数据库",
    unnamedFabric: "未命名面料",
    aiConfirmed: "AI 已确认 {n} 项",
    tags: "标签",
    specs: "规格参数",
    summary: "摘要",
    publishedAt: "发布于",
    needFabric: "我需要这个面料",
    haveFabric: "我有这个面料",
  },
  chat: {
    roleBuyer: "需求方",
    roleSupplier: "供应方",
    roleSystem: "系统",
    notExist: "该需求记录不存在。",
    initFailed: "初始化聊天失败。",
    networkError: "网络错误。",
    sendFailed: "发送失败。",
    sendError: "发送消息失败。",
    entering: "正在进入聊天...",
    backToSquare: "← 返回布市场",
    backToDetail: "← 返回面料详情",
    unnamedFabric: "未命名面料",
    emptyMessages: "暂无消息。开始对话吧。",
    inputPlaceholder: "输入消息...",
    sending: "发送中",
    send: "发送",
  },
  common: {
    pendingConfirm: "待确认",
  },
};

const en: Dict = {
  nav: {
    brand: "Fabric Workbench",
    workbench: "Workbench",
    square: "Fabric Market",
  },
  home: {
    panelLabel: "Fabric Workbench",
    weavingBtn: "Start Weaving",
    weavingLoading: "Weaving…",
    reanalyze: "Re-analyze",
    dnaSubtitle: "Fabric Identity Card",
    readingDna: "Reading…",
    pendingWeave: "Pending",
    aiReading: "AI is reading fabric data…",
    emptyHint: "Upload a fabric photo or describe your needs to start",
    aiOrganizing: "AI auto-organizing",
    dnaFields: ["Composition", "Weave", "Weight", "Width", "Coating", "Waterproof", "MOQ", "Lead Time", "Color", "Features"],
  },
  dna: {
    fabricName: "Fabric Name",
    use: "Application",
    composition: "Composition",
    weave: "Weave",
    weightGsm: "Weight",
    width: "Width",
    coating: "Coating",
    waterproof: "Waterproof",
    moq: "MOQ",
    quantity: "Quantity",
    destinationMarket: "Target Market",
    leadTime: "Lead Time",
    color: "Color",
    features: "Features",
  },
  status: {
    confirmed: "Confirmed",
    identified: "Identified",
    inferred: "Inferred",
    missing: "Missing",
  },
  imageUploader: {
    remove: "Remove",
    uploadHint: "Click to upload",
    uploadPrompt: "Upload 1-3 fabric photos",
  },
  textInput: {
    placeholder: "Describe the fabric you need, e.g.: Waterproof fabric for umbrellas, 190T polyester taffeta, PU coating...",
    helperText: "Fill in at least image or text, max 1200 characters",
  },
  weavingLoader: {
    loading: "Bunana is identifying the fabric...",
  },
  publish: {
    publish: "Publish to Market",
    publishing: "Publishing...",
    publishError: "Publish failed, please retry.",
    networkError: "Network error, publish failed.",
  },
  savePng: {
    save: "Save Fabric DNA",
    saving: "Generating PNG...",
    cardNotReady: "Card not ready, please retry.",
    exportError: "PNG export failed, please retry.",
  },
  dnaCard: {
    subtitle: "Fabric Identity Card",
    logoAlt: "Bunana",
    imageAlt: "Uploaded fabric sample",
    editLabel: "Edit {label}",
    clickToEdit: "Click to edit {label}",
  },
  square: {
    title: "Fabric DNA Database",
    subtitle: "Built fabric identity profiles",
    backToWorkbench: "← Back to Workbench",
    filterComposition: "Material",
    filterUse: "Application",
    filterFeatures: "Features",
    clearFilter: "Clear filters",
    resultCount: "{n} results",
    loading: "Loading...",
    emptyFiltered: "No matching fabric profiles. Try adjusting filters.",
    emptyNoData: "No Fabric DNA profiles yet. Create one from the home page.",
    loadFailed: "Failed to load market.",
    networkError: "Network error, loading failed.",
    unnamedFabric: "Unnamed Fabric",
    needFabric: "I need this fabric",
    haveFabric: "I have this fabric",
  },
  squareDetail: {
    specLabel: "Spec",
    notFound: "Record not found.",
    networkError: "Network error, loading failed.",
    loading: "Loading...",
    recordNotExist: "Record does not exist",
    backToDatabase: "← Back to Fabric DNA Database",
    unnamedFabric: "Unnamed Fabric",
    aiConfirmed: "AI confirmed {n} items",
    tags: "Tags",
    specs: "Specifications",
    summary: "Summary",
    publishedAt: "Published",
    needFabric: "I need this fabric",
    haveFabric: "I have this fabric",
  },
  chat: {
    roleBuyer: "Buyer",
    roleSupplier: "Supplier",
    roleSystem: "System",
    notExist: "This requirement does not exist.",
    initFailed: "Failed to initialize chat.",
    networkError: "Network error.",
    sendFailed: "Send failed.",
    sendError: "Failed to send message.",
    entering: "Entering chat...",
    backToSquare: "← Back to Fabric Market",
    backToDetail: "← Back to Fabric Detail",
    unnamedFabric: "Unnamed Fabric",
    emptyMessages: "No messages yet. Start the conversation.",
    inputPlaceholder: "Type a message...",
    sending: "Sending",
    send: "Send",
  },
  common: {
    pendingConfirm: "TBD",
  },
};

const ja: Dict = {
  nav: {
    brand: "生地ワークベンチ",
    workbench: "ワークベンチ",
    square: "生地市場",
  },
  home: {
    panelLabel: "生地ワークベンチ",
    weavingBtn: "カード作成",
    weavingLoading: "作成中…",
    reanalyze: "再分析",
    dnaSubtitle: "生地アイデンティティカード",
    readingDna: "読み込み中…",
    pendingWeave: "待機中",
    aiReading: "AIが生地データを読み取り中…",
    emptyHint: "生地写真をアップロードするか、需求を記述して開始",
    aiOrganizing: "AI自動整理中",
    dnaFields: ["成分", "織り方", "目付", "巾", "コーティング", "防水", "最小ロット", "納期", "色", "特徴"],
  },
  dna: {
    fabricName: "生地名",
    use: "用途",
    composition: "成分",
    weave: "織り方",
    weightGsm: "目付",
    width: "巾",
    coating: "コーティング",
    waterproof: "防水",
    moq: "最小ロット",
    quantity: "数量",
    destinationMarket: "ターゲット市場",
    leadTime: "納期",
    color: "色",
    features: "特徴",
  },
  status: {
    confirmed: "確認済み",
    identified: "識別済み",
    inferred: "推測",
    missing: "欠落",
  },
  imageUploader: {
    remove: "削除",
    uploadHint: "クリックでアップロード",
    uploadPrompt: "生地写真を1-3枚アップロード",
  },
  textInput: {
    placeholder: "必要な生地を記述してください。例：傘用防水生地、190Tタフタ、PUコーティング...",
    helperText: "画像またはテキストのいずれかを入力、最大1200文字",
  },
  weavingLoader: {
    loading: "Bunanaが生地を識別中...",
  },
  publish: {
    publish: "市場に公開",
    publishing: "公開中...",
    publishError: "公開に失敗しました。再試行してください。",
    networkError: "ネットワークエラー、公開に失敗。",
  },
  savePng: {
    save: "Fabric DNAを保存",
    saving: "PNG生成中...",
    cardNotReady: "カードの準備ができていません。再試行してください。",
    exportError: "PNG出力に失敗しました。再試行してください。",
  },
  dnaCard: {
    subtitle: "生地アイデンティティカード",
    logoAlt: "Bunana",
    imageAlt: "アップロードされた生地サンプル",
    editLabel: "{label}を編集",
    clickToEdit: "クリックして{label}を編集",
  },
  square: {
    title: "Fabric DNAデータベース",
    subtitle: "構築済みの生地アイデンティティプロファイル",
    backToWorkbench: "← ワークベンチに戻る",
    filterComposition: "材質",
    filterUse: "用途",
    filterFeatures: "特徴",
    clearFilter: "フィルタークリア",
    resultCount: "{n}件",
    loading: "読み込み中...",
    emptyFiltered: "一致する生地プロファイルがありません。フィルターを調整してください。",
    emptyNoData: "Fabric DNAプロファイルがまだありません。ホームページから作成してください。",
    loadFailed: "市場の読み込みに失敗しました。",
    networkError: "ネットワークエラー、読み込みに失敗。",
    unnamedFabric: "名前なし生地",
    needFabric: "この生地が必要",
    haveFabric: "この生地があります",
  },
  squareDetail: {
    specLabel: "スペック",
    notFound: "レコードが見つかりません。",
    networkError: "ネットワークエラー、読み込みに失敗。",
    loading: "読み込み中...",
    recordNotExist: "レコードが存在しません",
    backToDatabase: "← Fabric DNAデータベースに戻る",
    unnamedFabric: "名前なし生地",
    aiConfirmed: "AI確認 {n}項目",
    tags: "タグ",
    specs: "仕様",
    summary: "概要",
    publishedAt: "公開日",
    needFabric: "この生地が必要",
    haveFabric: "この生地があります",
  },
  chat: {
    roleBuyer: "買い手",
    roleSupplier: "供給者",
    roleSystem: "システム",
    notExist: "この需求は存在しません。",
    initFailed: "チャットの初期化に失敗しました。",
    networkError: "ネットワークエラー。",
    sendFailed: "送信失敗。",
    sendError: "メッセージの送信に失敗しました。",
    entering: "チャットに入室中...",
    backToSquare: "← 生地市場に戻る",
    backToDetail: "← 生地詳細に戻る",
    unnamedFabric: "名前なし生地",
    emptyMessages: "メッセージがありません。会話を始めましょう。",
    inputPlaceholder: "メッセージを入力...",
    sending: "送信中",
    send: "送信",
  },
  common: {
    pendingConfirm: "未定",
  },
};

const ko: Dict = {
  nav: {
    brand: "원단 워크벤치",
    workbench: "워크벤치",
    square: "원단 마켓",
  },
  home: {
    panelLabel: "원단 워크벤치",
    weavingBtn: "카드 생성",
    weavingLoading: "생성 중…",
    reanalyze: "재분석",
    dnaSubtitle: "원단 아이덴티티 카드",
    readingDna: "읽는 중…",
    pendingWeave: "대기 중",
    aiReading: "AI가 원단 데이터를 읽는 중…",
    emptyHint: "원단 사진을 업로드하거나 요구사항을 입력하여 시작",
    aiOrganizing: "AI 자동 정리 중",
    dnaFields: ["성분", "직조법", "중량", "폭", "코팅", "방수", "최소주문량", "납기", "색상", "특징"],
  },
  dna: {
    fabricName: "원단명",
    use: "용도",
    composition: "성분",
    weave: "직조법",
    weightGsm: "중량",
    width: "폭",
    coating: "코팅",
    waterproof: "방수",
    moq: "최소주문량",
    quantity: "수량",
    destinationMarket: "타겟 시장",
    leadTime: "납기",
    color: "색상",
    features: "특징",
  },
  status: {
    confirmed: "확인됨",
    identified: "식별됨",
    inferred: "추정",
    missing: "누락",
  },
  imageUploader: {
    remove: "삭제",
    uploadHint: "클릭하여 업로드",
    uploadPrompt: "원단 사진 1-3장 업로드",
  },
  textInput: {
    placeholder: "필요한 원단을 설명해주세요. 예: 우산용 방수 원단, 190T 타페타, PU 코팅...",
    helperText: "이미지 또는 텍스트 중 하나 이상 입력, 최대 1200자",
  },
  weavingLoader: {
    loading: "Bunana가 원단을 식별 중...",
  },
  publish: {
    publish: "마켓에 게시",
    publishing: "게시 중...",
    publishError: "게시 실패, 다시 시도해주세요.",
    networkError: "네트워크 오류, 게시 실패.",
  },
  savePng: {
    save: "Fabric DNA 저장",
    saving: "PNG 생성 중...",
    cardNotReady: "카드가 준비되지 않았습니다. 다시 시도해주세요.",
    exportError: "PNG 내보내기 실패, 다시 시도해주세요.",
  },
  dnaCard: {
    subtitle: "원단 아이덴티티 카드",
    logoAlt: "Bunana",
    imageAlt: "업로드된 원단 샘플",
    editLabel: "{label} 편집",
    clickToEdit: "클릭하여 {label} 편집",
  },
  square: {
    title: "Fabric DNA 데이터베이스",
    subtitle: "구축된 원단 아이덴티티 프로필",
    backToWorkbench: "← 워크벤치로 돌아가기",
    filterComposition: "소재",
    filterUse: "용도",
    filterFeatures: "특징",
    clearFilter: "필터 초기화",
    resultCount: "{n}개 결과",
    loading: "로딩 중...",
    emptyFiltered: "일치하는 원단 프로필이 없습니다. 필터를 조정해보세요.",
    emptyNoData: "Fabric DNA 프로필이 아직 없습니다. 홈페이지에서 생성하세요.",
    loadFailed: "마켓 로딩 실패.",
    networkError: "네트워크 오류, 로딩 실패.",
    unnamedFabric: "이름 없는 원단",
    needFabric: "이 원단이 필요합니다",
    haveFabric: "이 원단이 있습니다",
  },
  squareDetail: {
    specLabel: "스펙",
    notFound: "레코드를 찾을 수 없습니다.",
    networkError: "네트워크 오류, 로딩 실패.",
    loading: "로딩 중...",
    recordNotExist: "레코드가 존재하지 않습니다",
    backToDatabase: "← Fabric DNA 데이터베이스로 돌아가기",
    unnamedFabric: "이름 없는 원단",
    aiConfirmed: "AI 확인 {n}항목",
    tags: "태그",
    specs: "사양",
    summary: "요약",
    publishedAt: "게시일",
    needFabric: "이 원단이 필요합니다",
    haveFabric: "이 원단이 있습니다",
  },
  chat: {
    roleBuyer: "구매자",
    roleSupplier: "공급자",
    roleSystem: "시스템",
    notExist: "이 요구사항이 존재하지 않습니다.",
    initFailed: "채팅 초기화 실패.",
    networkError: "네트워크 오류.",
    sendFailed: "전송 실패.",
    sendError: "메시지 전송 실패.",
    entering: "채팅 입장 중...",
    backToSquare: "← 원단 마켓으로 돌아가기",
    backToDetail: "← 원단 상세로 돌아가기",
    unnamedFabric: "이름 없는 원단",
    emptyMessages: "메시지가 없습니다. 대화를 시작하세요.",
    inputPlaceholder: "메시지 입력...",
    sending: "전송 중",
    send: "전송",
  },
  common: {
    pendingConfirm: "미정",
  },
};

export const translations: Record<Locale, Dict> = { zh, en, ja, ko };

/**
 * Get a value from a nested dict by dot-notation path.
 * Supports {var} template replacement.
 */
export function t(
  locale: Locale,
  path: string,
  vars?: Record<string, string | number>
): string {
  const dict = translations[locale] ?? translations.zh;
  const keys = path.split(".");
  let val: unknown = dict;
  for (const k of keys) {
    if (val && typeof val === "object" && k in val) {
      val = (val as Record<string, unknown>)[k];
    } else {
      // fallback to zh
      val = undefined;
      break;
    }
  }
  // fallback to zh if missing
  if (val === undefined) {
    val = translations.zh;
    for (const k of keys) {
      if (val && typeof val === "object" && k in val) {
        val = (val as Record<string, unknown>)[k];
      } else {
        return path; // last resort
      }
    }
  }
  let str = typeof val === "string" ? val : String(val);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}

/**
 * Get an array value (e.g. dnaFields list)
 */
export function tArray(locale: Locale, path: string): string[] {
  const dict = translations[locale] ?? translations.zh;
  const keys = path.split(".");
  let val: unknown = dict;
  for (const k of keys) {
    if (val && typeof val === "object" && k in val) {
      val = (val as Record<string, unknown>)[k];
    } else {
      val = undefined;
      break;
    }
  }
  if (Array.isArray(val)) return val as string[];
  // fallback to zh
  val = translations.zh;
  for (const k of keys) {
    if (val && typeof val === "object" && k in val) {
      val = (val as Record<string, unknown>)[k];
    } else {
      return [];
    }
  }
  return Array.isArray(val) ? (val as string[]) : [];
}
