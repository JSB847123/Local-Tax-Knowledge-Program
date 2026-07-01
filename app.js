"use strict";

const STORAGE_KEY = "taxflow.mvp.v1";
const MAX_CATEGORY_DEPTH = 3;
const THEORY_FILE_MAX_BYTES = 2 * 1024 * 1024;
const THEORY_FILE_STORAGE_REFERENCE_BYTES = 5 * 1024 * 1024;
const SERVER_DATA_ENDPOINT = "/api/data";
const SERVER_SETTINGS_ENDPOINT = "/api/settings";
const SERVER_LEGAL_SEARCH_ENDPOINT = "/api/legal-search";
const SERVER_AI_SEARCH_ENDPOINT = "/api/ai-search";
const AI_CONTEXT_MAX_ITEMS = 10;
const AI_CONTEXT_MAX_CHARS = 22000;
const AI_CONTEXT_ITEM_MAX_CHARS = 3200;
const BACKUP_FORMAT = "tax-flow-portable-backup";
const BACKUP_VERSION = 1;

const viewLabels = {
  legal: "법령 및 판례 검색",
  favorites: "즐겨찾기",
  theoryFiles: "이론 등 파일 등록",
  manuals: "매뉴얼 작성",
  aiSearch: "AI 검색",
  backup: "데이터 백업/복원"
};

const sourceTypes = ["법령", "시행령", "조례", "행정규칙", "판례", "행정해석", "조세심판", "감사원", "내부문서"];
const qaStarterPrompts = [
  "대도시 법인 중과 판단 기준과 전산 입력 순서를 정리해줘.",
  "재산세 별도합산 토지 판단 시 확인할 자료를 알려줘.",
  "감면 후 추징 쟁점에서 원문, 노트, 매뉴얼을 같이 찾아줘."
];
const bulkRequiredHeaders = ["분류", "제목", "출처", "내용", "전산적용", "날짜", "태그"];
const bulkCategoryMap = {
  "판례": "precedent",
  "심판례": "tribunal",
  "사례": "case",
  "민원처리": "civil",
  "이론": "theory",
  "법령": "statute",
  "행정규칙": "admin_rule",
  "자치법규": "ordinance",
  "조약": "treaty",
  "해석례": "interpretation",
  "조세심판례": "tax_tribunal",
  "헌재결정": "constitutional",
  "행정심판례": "admin_appeal",
  "기타": "other"
};
const bulkCategoryLabels = {
  precedent: "판례",
  tribunal: "심판례",
  case: "사례",
  civil: "민원처리",
  theory: "이론",
  statute: "법령",
  admin_rule: "행정규칙",
  ordinance: "자치법규",
  treaty: "조약",
  interpretation: "해석례",
  tax_tribunal: "조세심판례",
  constitutional: "헌재결정",
  admin_appeal: "행정심판례",
  other: "기타"
};
const bulkSourceTypeMap = {
  precedent: "판례",
  tribunal: "조세심판",
  statute: "법령",
  admin_rule: "행정규칙",
  ordinance: "조례",
  interpretation: "행정해석",
  tax_tribunal: "조세심판",
  constitutional: "판례",
  admin_appeal: "행정해석",
  treaty: "내부문서"
};
const statuses = ["draft", "review", "published", "archived"];
const statusLabels = {
  active: "활성",
  hidden: "숨김",
  draft: "초안",
  review: "검토",
  published: "확정",
  archived: "보관"
};
const riskLabels = {
  low: "낮음",
  normal: "보통",
  high: "높음"
};
const theoryFileTypeLabels = {
  markdown: "Markdown",
  txt: "TXT"
};
const theoryFileAccept = ".md,.markdown,.txt,text/markdown,text/x-markdown,text/plain";
const aiProviderLabels = {
  openai: "OpenAI",
  gemini: "Gemini",
  deepseek: "DeepSeek",
  zai: "Z.ai"
};
const aiDefaultModels = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash",
  deepseek: "deepseek-v4-flash",
  zai: "GLM-4.7-FlashX"
};
const aiModelOptions = {
  openai: [
    "gpt-5.5",
    "gpt-5.5-pro",
    "gpt-5.4-pro",
    "gpt-5.4-mini",
    "gpt-4o",
    "gpt-4o-mini"
  ],
  gemini: [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite"
  ],
  deepseek: [
    "deepseek-v4-pro",
    "deepseek-v4-flash"
  ],
  zai: [
    "GLM-5.2",
    "GLM-5.1",
    "GLM-5-Turbo",
    "GLM-5",
    "GLM-4.7",
    "GLM-4.7-FlashX"
  ]
};
const manualSidebarTaxItems = [
  { taxItemId: "tax-acquisition", label: "취득세", children: [] },
  { taxItemId: "tax-property", label: "재산세", children: [] },
  {
    taxItemId: "tax-local-income",
    label: "지방소득세",
    children: [
      { categoryId: "cat-local-income-personal", label: "종합소득분" },
      { categoryId: "cat-local-income-transfer", label: "양도소득분" },
      { categoryId: "cat-local-income-corporate", label: "법인" }
    ]
  },
  {
    taxItemId: "tax-resident",
    label: "주민세",
    children: [
      { categoryId: "cat-resident-individual", label: "개인분" },
      { categoryId: "cat-resident-employee", label: "종업원분" },
      { categoryId: "cat-resident-business", label: "사업소분" }
    ]
  }
];
const requiredManualCategories = [
  { id: "cat-local-income-personal", taxItemId: "tax-local-income", name: "종합소득분", description: "종합소득분 지방소득세 신고·부과 업무", sortOrder: 1 },
  { id: "cat-local-income-transfer", taxItemId: "tax-local-income", name: "양도소득분", description: "양도소득분 지방소득세 신고·부과 업무", sortOrder: 2 },
  { id: "cat-local-income-corporate", taxItemId: "tax-local-income", name: "법인", description: "법인지방소득세 신고·납부와 안분 검토", sortOrder: 3 },
  { id: "cat-resident-individual", taxItemId: "tax-resident", name: "개인분", description: "개인분 주민세 부과·감면", sortOrder: 1 },
  { id: "cat-resident-employee", taxItemId: "tax-resident", name: "종업원분", description: "종업원분 과세표준과 신고", sortOrder: 2 },
  { id: "cat-resident-business", taxItemId: "tax-resident", name: "사업소분", description: "사업소분 신고·납부와 과세대상", sortOrder: 3 }
];
const HANGUL_BASE_CODE = 0xac00;
const HANGUL_END_CODE = 0xd7a3;
const HANGUL_INITIALS = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"
];

const app = {
  data: null,
  state: {
    activeView: "dashboard",
    currentTaxItemId: "",
    selectedCategoryId: "",
    selectedSourceId: "",
    selectedNoteId: "",
    selectedManualId: "",
    selectedFlowId: "",
    searchQuery: "",
    searchScope: "current",
    legalQuery: "",
    legalType: "전체",
    legalResults: [],
    legalLoading: false,
    legalMessage: "",
    legalApiAttempted: false,
    settingsStatus: null,
    settingsLoading: false,
    settingsMessage: "",
    settingsError: "",
    aiProvider: "openai",
    aiQuestion: "",
    aiAnswer: "",
    aiReferences: [],
    aiLoading: false,
    aiError: "",
    aiModelOverride: "",
    listFilter: "",
    bulkPreview: null,
    bulkFileName: "",
    bulkRawText: "",
    bulkError: "",
    bulkResult: null,
    editingSourceTagsId: "",
    storageWarning: "",
    modal: null,
    toast: ""
  }
};

let serverSaveTimer = null;

initialize();

async function initialize() {
  app.data = await loadData();
  await loadRuntimeSettings();
  bootstrap();
  saveData();
}

function bootstrap() {
  const firstTaxItem = activeTaxItems()[0];
  app.state.currentTaxItemId = app.data.ui.currentTaxItemId || (firstTaxItem ? firstTaxItem.id : "");
  app.state.activeView = normalizeActiveView(app.data.ui.activeView);
  app.state.selectedFlowId = firstByTax(app.data.flows, app.state.currentTaxItemId)?.id || "";
  app.state.selectedNoteId = firstByTax(app.data.notes, app.state.currentTaxItemId)?.id || "";
  app.state.selectedManualId = firstByTax(app.data.manuals, app.state.currentTaxItemId)?.id || "";
  app.state.selectedSourceId = firstByTax(app.data.sourceDocuments, app.state.currentTaxItemId)?.id || "";
  bindEvents();
  render();
}

function bindEvents() {
  document.addEventListener("click", onClick);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("input", onInput);
  document.addEventListener("change", onChange);
  document.addEventListener("compositionstart", onCompositionStart);
  document.addEventListener("compositionend", onCompositionEnd);
  document.addEventListener("dragstart", onDragStart);
  document.addEventListener("dragover", onDragOver);
  document.addEventListener("dragleave", onDragLeave);
  document.addEventListener("drop", onDrop);
}

function onClick(event) {
  const actionEl = event.target.closest("[data-action]");
  if (!actionEl) return;

  const action = actionEl.dataset.action;
  const id = actionEl.dataset.id || "";
  const type = actionEl.dataset.type || "";
  const value = actionEl.dataset.value || "";

  if (action === "set-view") {
    setView(value);
  }
  if (action === "set-tax-item") {
    setCurrentTaxItem(id);
  }
  if (action === "set-manual-tax") {
    setManualScope(id, "");
  }
  if (action === "set-manual-category") {
    setManualScope(actionEl.dataset.taxId || "", id);
  }
  if (action === "set-category") {
    app.state.selectedCategoryId = id;
    render();
  }
  if (action === "clear-category") {
    app.state.selectedCategoryId = "";
    render();
  }
  if (action === "toggle-collapse") {
    toggleCategoryCollapse(id);
  }
  if (action === "open-modal") {
    openModal(type, id, actionEl.dataset.parentId || "");
  }
  if (action === "close-modal") {
    closeModal();
  }
  if (action === "delete-category") {
    deleteCategory(id);
  }
  if (action === "move-category") {
    moveCategory(id, value);
  }
  if (action === "select-source") {
    selectItem("source", id);
  }
  if (action === "select-note") {
    selectItem("note", id);
  }
  if (action === "select-manual") {
    selectItem("manual", id);
  }
  if (action === "select-flow") {
    selectItem("flow", id);
  }
  if (action === "toggle-favorite") {
    toggleFavorite(type, id);
  }
  if (action === "edit-source-tags") {
    app.state.editingSourceTagsId = id;
    render();
  }
  if (action === "cancel-source-tags") {
    app.state.editingSourceTagsId = "";
    render();
  }
  if (action === "duplicate-note") {
    duplicateNote(id);
  }
  if (action === "create-manual-from-note") {
    createManualFromNote(id);
  }
  if (action === "delete-item") {
    deleteItem(type, id);
  }
  if (action === "save-official-result") {
    saveOfficialResult(id);
  }
  if (action === "toggle-official-favorite") {
    toggleOfficialFavorite(id);
  }
  if (action === "run-search") {
    runTopSearch();
  }
  if (action === "export-data") {
    exportData();
  }
  if (action === "reset-data") {
    resetData();
  }
  if (action === "copy-flow") {
    copyFlowMarkdown(id);
  }
  if (action === "commit-bulk") {
    commitBulkPreview();
  }
  if (action === "clear-bulk") {
    clearBulkPreview();
  }
  if (action === "set-qa-prompt") {
    setQaDraft(value);
  }
  if (action === "clear-qa") {
    clearQaHistory();
  }
  if (action === "refresh-settings") {
    loadRuntimeSettings(true);
  }
  if (action === "clear-ai-answer") {
    app.state.aiAnswer = "";
    app.state.aiReferences = [];
    app.state.aiError = "";
    render();
  }
}

function onSubmit(event) {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();

  const formType = form.dataset.form;
  const values = formValues(form);

  if (formType === "category") saveCategory(values);
  if (formType === "source") saveSourceDocument(values);
  if (formType === "source-tags") saveSourceTags(values);
  if (formType === "note") saveNote(values);
  if (formType === "manual") saveManual(values);
  if (formType === "flow") saveFlow(values);
  if (formType === "theory-file") saveTheoryFile(values);
  if (formType === "legal-search") runLegalSearch(values);
  if (formType === "tax-item") saveTaxItem(values);
  if (formType === "import-data") importData(values);
  if (formType === "qa") submitQaQuestion(values);
  if (formType === "settings") saveRuntimeSettings(values);
  if (formType === "ai-settings") saveAiSettings(values);
  if (formType === "ai-search") runAiSearch(values);
}

function onInput(event) {
  const input = event.target;
  if (input.matches("[data-bind='searchQuery']")) {
    app.state.searchQuery = input.value;
  }
  if (input.matches("[data-bind='listFilter']")) {
    app.state.listFilter = input.value;
    if (event.isComposing || input.dataset.composing === "true") return;
    render({ restoreFocus: captureInputFocus(input) });
  }
  if (input.matches("[data-bind='qaDraft']")) {
    app.data.qa.draft = input.value;
    saveData();
  }
  if (input.matches("[data-bind='aiQuestion']")) {
    app.state.aiQuestion = input.value;
  }
  if (input.matches("[data-bind='aiModelOverride']")) {
    app.state.aiModelOverride = input.value;
  }
}

function onChange(event) {
  const input = event.target;
  if (input.matches("[data-bind='searchScope']")) {
    app.state.searchScope = input.value;
  }
  if (input.matches("[data-action='toggle-check']")) {
    toggleManualChecklist(input.dataset.manualId, input.dataset.checkId, input.checked);
  }
  if (input.matches("[data-bind='qaIncludePublic']")) {
    app.data.qa.includePublic = input.checked;
    saveData();
    render();
  }
  if (input.matches("[data-bind='aiProvider']")) {
    app.state.aiProvider = input.value;
    app.state.aiModelOverride = "";
    render();
  }
  if (input.matches("[data-bind='aiModelOverride']")) {
    app.state.aiModelOverride = input.value;
  }
  if (input.matches("[data-action='bulk-file']")) {
    handleBulkFileChange(input);
  }
}

function onCompositionStart(event) {
  const input = event.target;
  if (input.matches("[data-bind='listFilter']")) {
    input.dataset.composing = "true";
  }
}

function onCompositionEnd(event) {
  const input = event.target;
  if (!input.matches("[data-bind='listFilter']")) return;
  input.dataset.composing = "";
  app.state.listFilter = input.value;
  render({ restoreFocus: captureInputFocus(input) });
}

function onDragStart(event) {
  const row = event.target.closest("[data-category-drag]");
  if (!row) return;
  event.dataTransfer.setData("text/plain", row.dataset.id);
  event.dataTransfer.effectAllowed = "move";
}

function onDragOver(event) {
  const row = event.target.closest("[data-category-drop]");
  if (!row) return;
  event.preventDefault();
  row.classList.add("drag-over");
}

function onDragLeave(event) {
  const row = event.target.closest("[data-category-drop]");
  if (row) row.classList.remove("drag-over");
}

function onDrop(event) {
  const row = event.target.closest("[data-category-drop]");
  if (!row) return;
  event.preventDefault();
  row.classList.remove("drag-over");
  const draggedId = event.dataTransfer.getData("text/plain");
  const targetId = row.dataset.id;
  reorderCategoryByDrop(draggedId, targetId);
}

function render(options = {}) {
  persistUi();
  const root = document.getElementById("app");
  root.innerHTML = `
    <div class="app-shell">
      ${renderSidebar()}
      <main class="main">
        ${renderTopbar()}
        <section class="content">
          ${renderActiveView()}
        </section>
      </main>
    </div>
    ${renderModal()}
    ${renderToast()}
  `;
  restoreInputFocus(options.restoreFocus);
}

function captureInputFocus(input) {
  return {
    bind: input.dataset.bind || "",
    selectionStart: input.selectionStart,
    selectionEnd: input.selectionEnd
  };
}

function restoreInputFocus(focus) {
  if (!focus?.bind) return;
  const escapedBind = globalThis.CSS?.escape ? CSS.escape(focus.bind) : focus.bind.replace(/["\\]/g, "\\$&");
  const input = document.querySelector(`[data-bind="${escapedBind}"]`);
  if (!input) return;
  input.focus({ preventScroll: true });
  if (typeof input.setSelectionRange === "function") {
    const fallback = input.value.length;
    const start = Number.isInteger(focus.selectionStart) ? focus.selectionStart : fallback;
    const end = Number.isInteger(focus.selectionEnd) ? focus.selectionEnd : start;
    input.setSelectionRange(start, end);
  }
}

function renderSidebar() {
  const nav = [
    ["legal", "법령 및 판례 검색", "원문 검색"],
    ["favorites", "즐겨찾기", "별표한 원문"],
    ["theoryFiles", "이론 등 파일 등록", `Markdown·TXT · 최대 ${formatBytes(THEORY_FILE_MAX_BYTES)}`],
    ["manuals", "매뉴얼 작성", "이론 · 관련 법령 · 전산 작업"],
    ["aiSearch", "AI 검색", "매뉴얼 · 등록 파일 기반 답변"],
    ["backup", "데이터 백업/복원", "다른 PC로 이동"]
  ];

  return `
    <aside class="sidebar">
      <div class="brand">
        <div style="display:flex;align-items:center;gap:10px;min-width:0;">
          <div class="brand-mark">TF</div>
          <div style="min-width:0;">
            <h1 class="brand-title">Tax-Flow</h1>
            <p class="brand-subtitle">지방세 실무 지식베이스</p>
          </div>
        </div>
      </div>

      <section class="side-section">
        <div class="side-heading"><span>업무 메뉴</span></div>
        <ul class="nav-list">
          ${nav.map(([id, label, sub]) => `
            <li>
              <button class="nav-button ${app.state.activeView === id ? "active" : ""}" data-action="set-view" data-value="${id}">
                <span class="nav-name">${label}<br><small>${sub}</small></span>
              </button>
              ${id === "manuals" ? renderManualSidebarTree() : ""}
            </li>
          `).join("")}
        </ul>
      </section>
    </aside>
  `;
}

function renderManualSidebarTree() {
  return `
    <ul class="manual-tree">
      ${manualSidebarTaxItems.map(item => renderManualSidebarTaxItem(item)).join("")}
    </ul>
  `;
}

function renderManualSidebarTaxItem(item) {
  const isActiveTax = app.state.activeView === "manuals" && app.state.currentTaxItemId === item.taxItemId;
  return `
    <li>
      <button class="manual-tree-button ${isActiveTax ? "active" : ""}" data-action="set-manual-tax" data-id="${escapeAttr(item.taxItemId)}">
        <span>${escapeHtml(item.label)}</span>
      </button>
      ${item.children.length ? `
        <ul>
          ${item.children.map(child => renderManualSidebarCategoryItem(item.taxItemId, child)).join("")}
        </ul>
      ` : ""}
    </li>
  `;
}

function renderManualSidebarCategoryItem(taxItemId, item) {
  const isActive = app.state.activeView === "manuals"
    && app.state.currentTaxItemId === taxItemId
    && app.state.selectedCategoryId === item.categoryId;
  return `
    <li>
      <button class="manual-tree-button child ${isActive ? "active" : ""}" data-action="set-manual-category" data-tax-id="${escapeAttr(taxItemId)}" data-id="${escapeAttr(item.categoryId)}">
        <span>${escapeHtml(item.label)}</span>
      </button>
    </li>
  `;
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div>
        <strong>${escapeHtml(currentTaxItem()?.name || "세목")}</strong>
        <p class="description">법령 근거를 찾고, 실무 매뉴얼을 파트별로 정리합니다.</p>
      </div>
      <div class="toolbar">
        <button class="btn" data-action="set-view" data-value="legal">법령 검색</button>
        <button class="btn" data-action="set-view" data-value="favorites">즐겨찾기</button>
        <button class="btn primary" data-action="open-modal" data-type="manual">매뉴얼 작성</button>
      </div>
    </header>
  `;
}

function renderActiveView() {
  const view = app.state.activeView;
  if (view === "legal") return renderLegalView();
  if (view === "favorites") return renderFavoritesView();
  if (view === "theoryFiles") return renderTheoryFilesView();
  if (view === "manuals") return renderManualsView();
  if (view === "aiSearch") return renderAiSearchView();
  if (view === "backup") return renderBackupView();
  return renderLegalView();
}

function renderHeader(title, description, actions = "", options = {}) {
  const taxItem = currentTaxItem();
  const eyebrow = options.eyebrow === undefined
    ? `${taxItem?.name || "전체"} · ${viewLabels[app.state.activeView] || ""}`
    : options.eyebrow;
  return `
    <div class="view-header">
      <div>
        ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
        <h1>${escapeHtml(title)}</h1>
        ${description ? `<p class="description">${escapeHtml(description)}</p>` : ""}
      </div>
      <div class="toolbar">${actions}</div>
    </div>
  `;
}

function renderDashboard() {
  const taxId = app.state.currentTaxItemId;
  const stats = workspaceStats(taxId);
  const recent = app.data.recentItems
    .map(refToItem)
    .filter(Boolean)
    .filter(item => item.taxItemId === taxId)
    .slice(0, 6);
  const favoriteItems = getAllItems()
    .filter(item => item.taxItemId === taxId && item.favorite)
    .slice(0, 6);
  const flows = app.data.flows
    .filter(flow => flow.taxItemId === taxId)
    .sort(sortUpdated)
    .slice(0, 5);

  return `
    ${renderHeader(
      "업무 흐름 대시보드",
      "법령·판례 근거, 판단 노트, 전산 입력 절차를 같은 세목 안에서 이어 봅니다.",
      `<button class="btn primary" data-action="open-modal" data-type="flow">Flow 생성</button>`
    )}
    <div class="stat-grid">
      ${renderStat("카테고리", stats.categories)}
      ${renderStat("원문", stats.sources)}
      ${renderStat("노트", stats.notes)}
      ${renderStat("매뉴얼", stats.manuals)}
    </div>

    <div class="grid two" style="margin-top:16px;">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>최근 Flow</h2>
            <small>쟁점 단위 문서</small>
          </div>
          <button class="btn small" data-action="set-view" data-value="flows">열기</button>
        </div>
        <div class="panel-body">
          <div class="item-list">
            ${flows.length ? flows.map(renderFlowCard).join("") : renderEmpty("등록된 Flow가 없습니다.")}
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>즐겨찾기</h2>
            <small>자주 다시 보는 자료</small>
          </div>
        </div>
        <div class="panel-body">
          <div class="item-list">
            ${favoriteItems.length ? favoriteItems.map(item => renderGenericCard(item)).join("") : renderEmpty("즐겨찾기한 항목이 없습니다.")}
          </div>
        </div>
      </section>
    </div>

    <div class="grid two" style="margin-top:16px;">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>최근 본 항목</h2>
            <small>업무 재진입</small>
          </div>
        </div>
        <div class="panel-body">
          <div class="item-list">
            ${recent.length ? recent.map(item => renderGenericCard(item)).join("") : renderEmpty("아직 최근 항목이 없습니다.")}
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>카테고리 현황</h2>
            <small>세목별 독립 트리</small>
          </div>
          <button class="btn small" data-action="set-view" data-value="categories">관리</button>
        </div>
        <div class="panel-body tight">
          ${renderCategoryTree(taxId, { compact: true })}
        </div>
      </section>
    </div>
    ${renderIntegrationSettings()}
  `;
}

function renderIntegrationSettings() {
  const status = app.state.settingsStatus;
  const fallbackLawOc = app.data.runtimeSettings?.lawOc || "";
  const configured = status?.law_oc?.configured || Boolean(fallbackLawOc);
  const source = status?.law_oc?.source || (fallbackLawOc ? "localStorage" : "missing");
  const settingsPath = status?.settingsFile || "브라우저 localStorage";
  return `
    <section class="panel" style="margin-top:16px;">
      <div class="panel-header">
        <div class="panel-title">
          <h2>연동 설정</h2>
          <small>property-tax-qa의 런타임 설정 흐름 중 LAW_OC만 로컬 프로그램에 맞게 반영</small>
        </div>
        <button class="btn small" data-action="refresh-settings">상태 새로고침</button>
      </div>
      <div class="panel-body">
        <div class="grid two">
          <form data-form="settings" class="form-grid">
            <div class="field full">
              <label for="lawOc">LAW_OC</label>
              <input id="lawOc" name="lawOc" class="control" type="password" autocomplete="off" placeholder="${configured ? "새 값 입력, 해제는 체크박스 사용" : "국가법령정보 공동활용 OC 값"}" />
              <p class="description">판례·법령·해석례 검색 API를 호출할 때 사용합니다. 입력값은 저장 후 화면에 다시 표시하지 않습니다.</p>
              <label class="check-row" style="margin-top:10px;">
                <input type="checkbox" name="clearLawOc" value="1" />
                <span>저장된 LAW_OC 해제</span>
              </label>
            </div>
            <div class="field full form-actions">
              <button class="btn primary" type="submit">저장</button>
            </div>
          </form>
          <div class="item-card">
            <div class="item-head">
              <div>
                <p class="item-title">현재 상태</p>
                <p class="item-summary">${configured ? "공식 API 검색을 사용할 준비가 되어 있습니다." : "값을 저장하면 원문 검색 화면에서 실제 API 검색을 우선 사용합니다."}</p>
              </div>
              <span class="state-pill">${configured ? "설정됨" : "미설정"}</span>
            </div>
            <div class="item-meta" style="margin-top:12px;">
              <span>출처 ${escapeHtml(source)}</span>
              <span>${escapeHtml(settingsPath)}</span>
            </div>
            ${app.state.settingsMessage ? `<p class="description" style="color:var(--accent-strong);margin-top:12px;">${escapeHtml(app.state.settingsMessage)}</p>` : ""}
            ${app.state.settingsError ? `<p class="description" style="color:var(--red);margin-top:12px;">${escapeHtml(app.state.settingsError)}</p>` : ""}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderStat(label, value) {
  return `
    <div class="stat">
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  `;
}

function renderCategoriesView() {
  const taxId = app.state.currentTaxItemId;
  const selected = app.data.categories.find(category => category.id === app.state.selectedCategoryId);
  return `
    ${renderHeader(
      "카테고리 관리",
      "세목별로 최대 3단계 분류를 만들고 순서를 저장합니다.",
      `<button class="btn primary" data-action="open-modal" data-type="category">최상위 추가</button>`
    )}
    <div class="grid sidebar-layout">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>분류 트리</h2>
            <small>드래그 또는 화살표로 같은 부모 안에서 정렬</small>
          </div>
        </div>
        <div class="panel-body tight">
          ${renderCategoryTree(taxId, { editable: true })}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>${selected ? escapeHtml(selected.name) : "카테고리 상세"}</h2>
            <small>${selected ? escapeHtml(categoryPath(selected.id)) : "항목을 선택하세요"}</small>
          </div>
          ${selected ? `<button class="btn" data-action="open-modal" data-type="category" data-id="${selected.id}">수정</button>` : ""}
        </div>
        <div class="panel-body">
          ${selected ? renderCategoryDetail(selected) : renderEmpty("왼쪽 트리에서 카테고리를 선택하면 연결 항목과 설명을 볼 수 있습니다.")}
        </div>
      </section>
    </div>
  `;
}

function renderCategoryTree(taxId, options = {}) {
  const roots = app.data.categories
    .filter(category => category.taxItemId === taxId && !category.parentId && category.status !== "archived")
    .sort(sortOrder);
  if (!roots.length) return renderEmpty("카테고리가 없습니다.");
  return `<div class="category-tree">${roots.map(category => renderCategoryNode(category, 0, options)).join("")}</div>`;
}

function renderCategoryNode(category, depth, options) {
  const children = app.data.categories
    .filter(child => child.parentId === category.id && child.status !== "archived")
    .sort(sortOrder);
  const collapsed = app.data.ui.collapsedCategoryIds.includes(category.id);
  const counts = categoryCounts(category.id);
  const selected = app.state.selectedCategoryId === category.id;
  const editable = Boolean(options.editable);
  const compact = Boolean(options.compact);

  return `
    <div>
      <div class="category-row indent-${Math.min(depth, 2)} ${selected ? "active" : ""}"
        data-category-drag="${editable ? "true" : "false"}"
        data-category-drop="${editable ? "true" : "false"}"
        data-id="${category.id}"
        draggable="${editable ? "true" : "false"}">
        <button class="btn icon small ${children.length ? "" : "ghost"}" data-action="toggle-collapse" data-id="${category.id}" title="접기/펼치기">
          ${children.length ? (collapsed ? "+" : "-") : ""}
        </button>
        <button class="compact-button" data-action="set-category" data-id="${category.id}">
          <span class="category-name">${escapeHtml(category.name)}</span>
          <span class="count-pill">${counts.total}</span>
        </button>
        ${editable && !compact ? `
          <span class="category-tools">
            <button class="btn icon small" data-action="move-category" data-id="${category.id}" data-value="up" title="위로">▲</button>
            <button class="btn icon small" data-action="move-category" data-id="${category.id}" data-value="down" title="아래로">▼</button>
            ${depth < MAX_CATEGORY_DEPTH - 1 ? `<button class="btn icon small" data-action="open-modal" data-type="category" data-parent-id="${category.id}" title="하위 추가">+</button>` : ""}
            <button class="btn icon small" data-action="open-modal" data-type="category" data-id="${category.id}" title="수정">✎</button>
            <button class="btn icon small danger" data-action="delete-category" data-id="${category.id}" title="삭제">×</button>
          </span>
        ` : `<span></span>`}
      </div>
      ${children.length && !collapsed ? children.map(child => renderCategoryNode(child, depth + 1, options)).join("") : ""}
    </div>
  `;
}

function renderCategoryDetail(category) {
  const counts = categoryCounts(category.id);
  const related = getAllItems().filter(item => item.categoryId === category.id).sort(sortUpdated);
  return `
    <div class="grid">
      <div class="form-grid">
        <div class="field"><label>상태</label><div>${renderStatus(category.status)}</div></div>
        <div class="field"><label>연결 항목</label><div class="item-meta">${renderCountPills(counts)}</div></div>
        <div class="field full"><label>설명</label><p class="markdown-preview">${escapeHtml(category.description || "설명이 없습니다.")}</p></div>
      </div>
      <div>
        <h3 style="margin-bottom:8px;">연결된 항목</h3>
        <div class="item-list">
          ${related.length ? related.map(renderGenericCard).join("") : renderEmpty("이 카테고리에 연결된 항목이 없습니다.")}
        </div>
      </div>
    </div>
  `;
}

function renderLegalView() {
  const fallbackResults = buildOfficialResults(app.state.legalQuery, app.state.legalType);
  const settings = app.state.settingsStatus;
  const lawConfigured = settings?.law_oc?.configured || Boolean(app.data.runtimeSettings?.lawOc);
  const apiAvailable = lawConfigured && canUseServerStorage();
  const useApiResults = apiAvailable && app.state.legalApiAttempted;
  const officialResults = useApiResults ? app.state.legalResults : fallbackResults;
  const resultLabel = useApiResults ? "실제 API 결과" : "공식 검색 바로가기";
  return `
    ${renderHeader(
      "법령 및 판례 검색",
      "키워드로 공식 원문 후보를 찾고 필요한 원문을 바로 엽니다.",
      "",
      { eyebrow: "" }
    )}
    <div class="grid two">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>공식 원문 검색</h2>
            <small>법령·판례·해석례 검색</small>
          </div>
        </div>
        <div class="panel-body">
          <div class="item-card" style="margin-bottom:14px;">
            <div class="item-head">
              <div>
                <p class="item-title">국가법령정보 연동</p>
                <p class="item-summary">${apiAvailable ? "LAW_OC가 설정되어 실제 검색 API 결과를 우선 표시합니다." : lawConfigured ? "LAW_OC는 저장되어 있지만 로컬 서버로 실행해야 실제 API 검색을 사용할 수 있습니다." : "LAW_OC 미설정 상태입니다. 아래에 값을 저장하면 실제 API 검색을 사용할 수 있습니다."}</p>
              </div>
              <span class="state-pill">${apiAvailable ? "API 사용" : lawConfigured ? "저장됨" : "미설정"}</span>
            </div>
            <form data-form="settings" class="form-grid" style="margin-top:12px;">
              <div class="field full">
                <label for="legalLawOc">LAW_OC</label>
                <input id="legalLawOc" name="lawOc" class="control" type="password" autocomplete="off" placeholder="${lawConfigured ? "새 값 입력, 해제는 체크박스 사용" : "국가법령정보 공동활용 OC 값"}" />
                <p class="description">국가법령정보 공동활용 API 검색에 사용하는 값입니다. 저장 후 화면에 다시 표시하지 않습니다.</p>
              </div>
              ${lawConfigured ? `
                <div class="field full">
                  <label class="check-row">
                    <input type="checkbox" name="clearLawOc" value="1" />
                    <span>저장된 LAW_OC 해제</span>
                  </label>
                </div>
              ` : ""}
              <div class="field full form-actions">
                <button class="btn small" type="button" data-action="refresh-settings">상태 새로고침</button>
                <button class="btn small primary" type="submit">LAW_OC 저장</button>
              </div>
            </form>
            ${app.state.settingsMessage ? `<p class="description" style="color:var(--accent-strong);margin-top:10px;">${escapeHtml(app.state.settingsMessage)}</p>` : ""}
            ${app.state.settingsError ? `<p class="description" style="color:var(--red);margin-top:10px;">${escapeHtml(app.state.settingsError)}</p>` : ""}
          </div>
          <form data-form="legal-search" class="form-grid">
            <div class="field full">
              <label for="legalQuery">키워드</label>
              <input id="legalQuery" name="query" class="control" value="${escapeAttr(app.state.legalQuery)}" placeholder="대도시 중과 직접사용, 별도합산 과세기준일" />
            </div>
            <div class="field full">
              <label for="legalType">자료 유형</label>
              <select id="legalType" name="type" class="control">
                ${["전체", ...sourceTypes].map(type => `<option value="${type}" ${app.state.legalType === type ? "selected" : ""}>${type}</option>`).join("")}
              </select>
            </div>
            <div class="field full">
              <button class="btn primary" type="submit">검색</button>
            </div>
          </form>

          <div style="margin-top:14px;">
            <h3 style="margin-bottom:8px;">공식 사이트</h3>
            <div class="source-links">
              ${renderOfficialLinks(app.state.legalQuery)}
            </div>
            ${renderKeywordSearchGuide()}
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>검색 후보</h2>
            <small>${escapeHtml(resultLabel)}</small>
          </div>
        </div>
        <div class="panel-body">
          ${app.state.legalLoading ? `<div class="empty">국가법령정보 API를 조회하고 있습니다.</div>` : ""}
          ${app.state.legalMessage ? `<div class="item-card" style="margin-bottom:12px;">${escapeHtml(app.state.legalMessage)}</div>` : ""}
          <div class="item-list">
            ${officialResults.length ? officialResults.map(renderOfficialResult).join("") : app.state.legalMessage ? "" : renderEmpty(useApiResults ? "실제 API 결과가 없습니다. 왼쪽 공식 사이트 검색 바로가기도 함께 확인하세요." : "키워드를 입력하면 공식 원문 후보를 보여줍니다.")}
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderOfficialLinks(query) {
  const encoded = encodeURIComponent(query || "");
  const links = [
    ["국가법령정보센터", `https://www.law.go.kr/LSW/lsSc.do?query=${encoded}`, "법령·판례 원문"],
    ["공동활용 API 안내", "https://open.law.go.kr/LSO/openApi/guideList.do", "API 연계 기준"],
    ["지방세 법령정보", "https://www.olta.re.kr/", "지방세 특화 자료"],
    ["조세심판원", "https://www.tt.go.kr/", "심판 결정례"]
  ];
  return links.map(([name, url, desc]) => `
    <a class="source-link" href="${escapeAttr(url)}" target="_blank" rel="noreferrer">
      <strong>${escapeHtml(name)}</strong>
      <span>${escapeHtml(desc)}</span>
    </a>
  `).join("");
}

function renderKeywordSearchGuide() {
  const rows = [
    ["여러 단어", "띄어쓰기 또는 *", "주민세 재산분 면적"],
    ["둘 중 하나", "+ 또는 |", "해지 + 해제"],
    ["제외", "! 뒤에 제외어", "계약 ! 근로"],
    ["정확한 문구", "큰따옴표", "\"채무불이행\""]
  ];
  return `
    <div class="search-guide">
      <div class="guide-title">
        <strong>키워드 검색 방법</strong>
        <span>짧은 핵심어부터 넣고 필요하면 조건을 더하세요.</span>
      </div>
      <div class="guide-grid">
        ${rows.map(([name, rule, example]) => `
          <div class="guide-row">
            <span>${escapeHtml(name)}</span>
            <span>${escapeHtml(rule)}</span>
            <code>${escapeHtml(example)}</code>
          </div>
        `).join("")}
      </div>
      <p class="guide-note">최근 용어가 안 잡히면 예전 용어도 함께 써보세요. 예: 사업소분 → 재산분, 사업소 연면적</p>
    </div>
  `;
}

function renderOfficialResult(result) {
  const favoriteSource = findFavoriteForOfficialResult(result);
  const isFavorite = Boolean(favoriteSource?.favorite);
  return `
    <article class="item-card">
      <div class="item-head">
        <div>
          <p class="item-title">${escapeHtml(result.title)}</p>
          <div class="item-meta">
            <span class="type-pill">${escapeHtml(result.type)}</span>
            <span>${escapeHtml(result.sourceName)}</span>
            <span>${escapeHtml(result.sourceDate || "")}</span>
            ${result.matchedQuery ? `<span>검색어: ${escapeHtml(result.matchedQuery)}</span>` : ""}
          </div>
        </div>
        <button class="btn icon small" data-action="toggle-official-favorite" data-id="${escapeAttr(result.id)}" title="즐겨찾기">${isFavorite ? "★" : "☆"}</button>
      </div>
      <p class="item-summary">${escapeHtml(result.summary)}</p>
      <div class="item-meta">
        ${result.officialUrl ? `<a href="${escapeAttr(result.officialUrl)}" target="_blank" rel="noreferrer">${result.fallback ? "검색 페이지 열기" : "원문 열기"}</a>` : `<span>원문 링크 없음</span>`}
      </div>
    </article>
  `;
}

function renderSourceCard(source) {
  const selected = app.state.selectedSourceId === source.id;
  const canEditTags = app.state.activeView === "favorites";
  return `
    <article class="item-card ${selected ? "selected" : ""}">
      <div class="item-head">
        <div>
          <p class="item-title">${escapeHtml(source.title)}</p>
          <div class="item-meta">
            <span class="type-pill">${escapeHtml(source.type)}</span>
            <span>${escapeHtml(source.sourceName || "수동 등록")}</span>
            ${source.categoryId ? `<span>${escapeHtml(categoryPath(source.categoryId))}</span>` : ""}
          </div>
        </div>
        <div class="toolbar">
          <button class="btn icon small" data-action="toggle-favorite" data-type="source" data-id="${source.id}" title="즐겨찾기">${source.favorite ? "★" : "☆"}</button>
          ${canEditTags ? `<button class="btn small" data-action="edit-source-tags" data-id="${escapeAttr(source.id)}">태그 편집</button>` : ""}
          ${source.officialUrl ? `<a class="btn small" href="${escapeAttr(source.officialUrl)}" target="_blank" rel="noreferrer">열기</a>` : `<button class="btn small" data-action="select-source" data-id="${source.id}">보기</button>`}
        </div>
      </div>
      <p class="item-summary">${escapeHtml(source.summary || "")}</p>
      ${renderSourceTagArea(source)}
    </article>
  `;
}

function renderSourceTagArea(source) {
  const isEditing = app.state.activeView === "favorites" && app.state.editingSourceTagsId === source.id;
  if (isEditing) return renderSourceTagEditor(source);
  const emptyText = app.state.activeView === "favorites" ? `<span>태그 없음</span>` : "";
  return `
    <div class="item-meta source-tags">
      ${renderTags(source.tags) || emptyText}
    </div>
  `;
}

function renderSourceTagEditor(source) {
  return `
    <form data-form="source-tags" class="tag-editor">
      <input type="hidden" name="id" value="${escapeAttr(source.id)}" />
      <label for="sourceTags-${escapeAttr(source.id)}">태그</label>
      <input id="sourceTags-${escapeAttr(source.id)}" name="tags" class="control" value="${escapeAttr((source.tags || []).join(", "))}" placeholder="쉼표 또는 #으로 구분" />
      <div class="toolbar">
        <button class="btn small" type="button" data-action="cancel-source-tags">취소</button>
        <button class="btn primary small" type="submit">저장</button>
      </div>
    </form>
  `;
}

function renderFavoritesView() {
  const favorites = app.data.sourceDocuments
    .filter(source => source.taxItemId === app.state.currentTaxItemId && source.favorite)
    .filter(source => textMatchesSearch(searchBlob(source), app.state.listFilter))
    .sort(sortUpdated);
  return `
    ${renderHeader(
      "즐겨찾기",
      "법령 및 판례 검색에서 별표한 원문을 다시 확인합니다.",
      `<button class="btn" data-action="set-view" data-value="legal">검색으로 돌아가기</button>`
    )}
    <section class="panel">
      <div class="panel-header">
        <div class="panel-title">
          <h2>즐겨찾기한 원문</h2>
          <small>${favorites.length}개</small>
        </div>
        <input class="control" data-bind="listFilter" value="${escapeAttr(app.state.listFilter)}" placeholder="즐겨찾기 필터" style="max-width:240px;" />
      </div>
      <div class="panel-body">
        <div class="item-list">
          ${favorites.length ? favorites.map(renderSourceCard).join("") : renderEmpty("아직 즐겨찾기한 원문이 없습니다. 법령 및 판례 검색에서 별표를 눌러 추가하세요.")}
        </div>
      </div>
    </section>
  `;
}

function renderTheoryFilesView() {
  const files = filteredTheoryFiles();
  return `
    ${renderHeader(
      "이론 등 파일 등록",
      "이론 자료, 내부 검토 문서, 참고 텍스트 파일을 세목별로 보관합니다.",
      ""
    )}
    <div class="grid two">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>파일 등록</h2>
            <small>파일당 최대 ${formatBytes(THEORY_FILE_MAX_BYTES)}</small>
          </div>
        </div>
        <div class="panel-body">
          <form data-form="theory-file" class="form-grid">
            <input type="hidden" name="taxItemId" value="${escapeAttr(app.state.currentTaxItemId)}" />
            <div class="field">
              <label for="theoryFileTitle">자료 제목</label>
              <input id="theoryFileTitle" name="title" class="control" placeholder="비워두면 파일명을 사용" />
            </div>
            <div class="field">
              <label for="theoryFileCategory">하위카테고리</label>
              <select id="theoryFileCategory" name="categoryId" class="control">
                <option value="">미분류</option>
                ${categoryOptions(app.state.currentTaxItemId, "", app.state.selectedCategoryId)}
              </select>
            </div>
            <div class="field full">
              <label class="upload-box">
                <span class="eyebrow">Markdown · TXT</span>
                <strong>텍스트 파일을 선택해 이론 자료로 등록합니다.</strong>
                <span>업로드 가능 용량: 파일당 최대 ${formatBytes(THEORY_FILE_MAX_BYTES)}. 서버에는 별도 하드 제한이 없지만, 브라우저 저장소 안전 기준 약 ${formatBytes(THEORY_FILE_STORAGE_REFERENCE_BYTES)}를 고려해 제한합니다.</span>
                <span>텍스트 기반 파일만 등록할 수 있습니다.</span>
                <input type="file" name="file" accept="${escapeAttr(theoryFileAccept)}" required />
              </label>
            </div>
            <div class="field full">
              <label for="theoryFileTags">태그</label>
              <input id="theoryFileTags" name="tags" class="control" placeholder="쉼표 또는 #으로 구분" />
            </div>
            <div class="field full">
              <label for="theoryFileMemo">메모</label>
              <textarea id="theoryFileMemo" name="memo" placeholder="핵심 이론, 검토 포인트, 파일 활용 메모를 적어두세요."></textarea>
            </div>
            <div class="field full form-actions">
              <button class="btn primary" type="submit">파일 등록</button>
            </div>
          </form>
          ${app.state.storageWarning ? `<div class="item-card warning-card">${escapeHtml(app.state.storageWarning)}</div>` : ""}
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>등록 안내</h2>
            <small>지원 파일과 저장 방식</small>
          </div>
        </div>
        <div class="panel-body">
          <div class="file-guide">
            <div><strong>Markdown</strong><span>이론 정리, 체크리스트, 내부 검토 내용을 구조화해 저장하기 좋습니다.</span></div>
            <div><strong>TXT</strong><span>원본 파일과 본문 텍스트를 함께 저장해 검색에 활용합니다.</span></div>
            <div><strong>용량</strong><span>현재 앱 제한은 파일당 ${formatBytes(THEORY_FILE_MAX_BYTES)}입니다.</span></div>
          </div>
        </div>
      </section>
    </div>

    <section class="panel" style="margin-top:16px;">
      <div class="panel-header">
        <div class="panel-title">
          <h2>등록된 파일</h2>
          <small>${files.length}개</small>
        </div>
        <input class="control" data-bind="listFilter" value="${escapeAttr(app.state.listFilter)}" placeholder="파일 필터" style="max-width:240px;" />
      </div>
      <div class="panel-body">
        <div class="item-list">
          ${files.length ? files.map(renderTheoryFileCard).join("") : renderEmpty("등록된 파일이 없습니다. Markdown 또는 TXT 파일을 추가하세요.")}
        </div>
      </div>
    </section>
  `;
}

function renderTheoryFileCard(file) {
  const typeLabel = theoryFileTypeLabels[file.fileKind] || file.fileKind || "파일";
  return `
    <article class="item-card">
      <div class="item-head">
        <div>
          <p class="item-title">${escapeHtml(file.title)}</p>
          <div class="item-meta">
            <span class="type-pill">${escapeHtml(typeLabel)}</span>
            <span>${escapeHtml(file.fileName || "")}</span>
            <span>${formatBytes(file.fileSize || 0)}</span>
            ${file.categoryId ? `<span>${escapeHtml(categoryPath(file.categoryId))}</span>` : ""}
            <span>등록 ${formatDate(file.createdAt)}</span>
          </div>
        </div>
        <div class="toolbar">
          ${file.dataUrl ? `<a class="btn small" href="${escapeAttr(file.dataUrl)}" download="${escapeAttr(file.fileName || file.title)}">다운로드</a>` : ""}
          <button class="btn danger small" data-action="delete-item" data-type="theoryFile" data-id="${escapeAttr(file.id)}">삭제</button>
        </div>
      </div>
      ${file.memo ? `<p class="item-summary">${escapeHtml(trimText(file.memo, 180))}</p>` : ""}
      ${file.contentText ? `<div class="file-text-preview">${escapeHtml(trimText(file.contentText, 260))}</div>` : ""}
      <div class="item-meta">${renderTags(file.tags)}</div>
    </article>
  `;
}

function renderAiSearchView() {
  const provider = app.state.aiProvider || "openai";
  const context = buildAiSearchContext(app.state.aiQuestion);
  const providerStatus = aiProviderStatus(provider);
  const model = normalizeAiModel(provider, app.state.aiModelOverride || providerStatus.model);
  return `
    ${renderHeader(
      "AI 검색",
      "작성한 매뉴얼과 등록한 Markdown·TXT 파일을 근거로 질문에 답합니다.",
      `<button class="btn" data-action="refresh-settings">API key 상태 새로고침</button>`
    )}
    <div class="grid two">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>질문</h2>
            <small>현재 세목 기준 · 매뉴얼 ${context.manualCount}개 · 파일 ${context.fileCount}개</small>
          </div>
          ${app.state.aiAnswer ? `<button class="btn small" data-action="clear-ai-answer">답변 지우기</button>` : ""}
        </div>
        <div class="panel-body">
          <form data-form="ai-search" class="form-grid">
            <div class="field">
              <label for="aiProvider">AI provider</label>
              <select id="aiProvider" name="provider" class="control" data-bind="aiProvider">
                ${Object.entries(aiProviderLabels).map(([id, label]) => `<option value="${id}" ${provider === id ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="aiModel">모델</label>
              <select id="aiModel" name="model" class="control" data-bind="aiModelOverride">
                ${renderAiModelOptions(provider, model)}
              </select>
            </div>
            <div class="field full">
              <label for="aiQuestion">질문</label>
              <textarea id="aiQuestion" name="question" data-bind="aiQuestion" style="min-height:160px;" placeholder="예: 주민세 사업소분 연면적 판단 시 태양광 발전 설비를 어떻게 봐야 해?">${escapeHtml(app.state.aiQuestion)}</textarea>
            </div>
            <div class="field full">
              <div class="item-card">
                <div class="item-head">
                  <div>
                    <p class="item-title">검색 근거</p>
                    <p class="item-summary">현재 세목의 매뉴얼과 등록 파일 중 질문과 가까운 항목을 최대 ${AI_CONTEXT_MAX_ITEMS}개까지 AI에 전달합니다.</p>
                  </div>
                  <span class="state-pill">${context.items.length}개 선택</span>
                </div>
                <div class="item-meta" style="margin-top:10px;">
                  ${context.items.length ? context.items.map(item => `<span>${escapeHtml(item.ref)} ${escapeHtml(trimText(item.title, 34))}</span>`).join("") : `<span>전달할 매뉴얼 또는 파일이 없습니다.</span>`}
                </div>
              </div>
            </div>
            <div class="field full form-actions">
              <button class="btn primary" type="submit" ${app.state.aiLoading || !context.items.length ? "disabled" : ""}>${app.state.aiLoading ? "답변 생성 중..." : "AI에게 질문"}</button>
            </div>
          </form>
          ${renderAiReferenceGuide()}
          ${app.state.aiError ? `<div class="item-card warning-card">${escapeHtml(app.state.aiError)}</div>` : ""}
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>API key 설정</h2>
            <small>${escapeHtml(app.state.settingsStatus?.settingsFile || "로컬 설정 파일")}</small>
          </div>
        </div>
        <div class="panel-body">
          ${renderAiSettingsForm()}
        </div>
      </section>
    </div>

    <section class="panel" style="margin-top:16px;">
      <div class="panel-header">
        <div class="panel-title">
          <h2>AI 답변</h2>
          <small>${app.state.aiReferences.length ? `근거 ${app.state.aiReferences.length}개` : "답변 대기"}</small>
        </div>
      </div>
      <div class="panel-body">
        ${app.state.aiAnswer ? `
          <div class="ai-answer markdown-preview">${escapeHtml(app.state.aiAnswer)}</div>
          <div class="reference-list">
            ${app.state.aiReferences.map(item => `
              <div class="item-card">
                <div class="item-head">
                  <div>
                    <p class="item-title">${escapeHtml(item.ref)} ${escapeHtml(item.title)}</p>
                    <p class="item-summary">${escapeHtml(item.kindLabel)} · ${escapeHtml(item.categoryPath || "미분류")}</p>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        ` : renderEmpty("질문을 입력하면 매뉴얼과 등록 파일을 근거로 답변을 생성합니다.")}
      </div>
    </section>
  `;
}

function renderAiReferenceGuide() {
  return `
    <div class="ai-reference-guide" aria-label="AI 답변 근거 표시 안내">
      <div>
        <p class="item-title">답변 근거 표시 안내</p>
        <p class="item-summary">AI 답변에 붙는 번호는 어떤 자료를 근거로 삼았는지 보여주는 표시입니다.</p>
      </div>
      <div class="reference-guide-grid">
        <div>
          <span class="type-pill">M1 · M2</span>
          <p>매뉴얼 근거입니다. AI에 전달된 매뉴얼이 관련도 높은 순서로 M1, M2처럼 번호가 붙습니다.</p>
        </div>
        <div>
          <span class="type-pill">F1 · F2</span>
          <p>등록 파일 근거입니다. Markdown 또는 TXT 파일이 답변 근거로 쓰일 때 F1, F2처럼 표시됩니다.</p>
        </div>
      </div>
      <p class="reference-guide-note">같은 번호는 위의 검색 근거 목록과 아래 AI 답변의 근거 카드에서 확인할 수 있습니다. 번호는 질문할 때마다 선택된 자료 순서에 따라 다시 매겨집니다.</p>
    </div>
  `;
}

function renderAiSettingsForm() {
  return `
    <form data-form="ai-settings" class="form-grid">
      ${Object.entries(aiProviderLabels).map(([id, label]) => {
        const status = aiProviderStatus(id);
        return `
          <div class="field full api-key-row">
            <div class="item-head">
              <div>
                <label for="aiKey-${id}">${escapeHtml(label)} API key</label>
                <p class="description">비워두면 기존 키를 유지합니다. 저장 후 키 원문은 다시 표시하지 않습니다.</p>
              </div>
              <span class="state-pill ${status.configured ? "" : "warning"}">${status.configured ? "설정됨" : "미설정"}</span>
            </div>
            <input id="aiKey-${id}" name="${id}Key" class="control" type="password" autocomplete="off" placeholder="${status.configured ? "새 키 입력 또는 해제 체크" : `${label} API key`}" />
            <div class="form-grid api-model-grid">
              <div class="field">
                <label for="aiModel-${id}">기본 모델</label>
                <select id="aiModel-${id}" name="${id}Model" class="control">
                  ${renderAiModelOptions(id, status.model)}
                </select>
              </div>
              <label class="check-row">
                <input type="checkbox" name="clear${capitalizeProviderId(id)}Key" value="1" />
                <span>저장된 키 해제</span>
              </label>
            </div>
          </div>
        `;
      }).join("")}
      <div class="field full form-actions">
        <button class="btn primary" type="submit">API key 저장</button>
      </div>
      ${app.state.settingsMessage ? `<p class="description" style="color:var(--accent-strong);">${escapeHtml(app.state.settingsMessage)}</p>` : ""}
      ${app.state.settingsError ? `<p class="description" style="color:var(--red);">${escapeHtml(app.state.settingsError)}</p>` : ""}
    </form>
  `;
}

function renderNotesView() {
  const notes = filteredNotes();
  const selected = app.data.notes.find(note => note.id === app.state.selectedNoteId) || notes[0];
  if (selected && app.state.selectedNoteId !== selected.id) app.state.selectedNoteId = selected.id;

  return `
    ${renderHeader(
      "지식·이론 노트",
      "쟁점별 판단 기준, 법리 해석, 내부 노하우를 세목·카테고리·태그로 정리합니다.",
      `<button class="btn primary" data-action="open-modal" data-type="note">노트 작성</button>`
    )}
    <div class="split-view">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title"><h2>노트 목록</h2><small>${notes.length}개</small></div>
          <input class="control" data-bind="listFilter" value="${escapeAttr(app.state.listFilter)}" placeholder="노트 필터" style="max-width:170px;" />
        </div>
        <div class="panel-body tight">
          <div class="item-list">
            ${notes.length ? notes.map(renderNoteCard).join("") : renderEmpty("등록된 노트가 없습니다.")}
          </div>
        </div>
      </section>

      <section class="panel">
        ${selected ? renderNoteDetail(selected) : `<div class="panel-body">${renderEmpty("노트를 선택하세요.")}</div>`}
      </section>
    </div>
  `;
}

function renderNoteCard(note) {
  const selected = app.state.selectedNoteId === note.id;
  return `
    <article class="item-card ${selected ? "selected" : ""}">
      <div class="item-head">
        <div>
          <p class="item-title">${escapeHtml(note.title)}</p>
          <div class="item-meta">
            ${renderStatus(note.status)}
            ${note.categoryId ? `<span>${escapeHtml(categoryPath(note.categoryId))}</span>` : ""}
          </div>
        </div>
        <div class="toolbar">
          <button class="btn icon small" data-action="toggle-favorite" data-type="note" data-id="${note.id}" title="즐겨찾기">${note.favorite ? "★" : "☆"}</button>
          <button class="btn small" data-action="select-note" data-id="${note.id}">열기</button>
        </div>
      </div>
      <p class="item-summary">${escapeHtml(trimText(note.judgmentCriteria || note.body, 130))}</p>
      <div class="item-meta">${renderTags(note.tags)}</div>
    </article>
  `;
}

function renderNoteDetail(note) {
  const linkedSources = note.linkedSourceIds
    .map(id => app.data.sourceDocuments.find(source => source.id === id))
    .filter(Boolean);
  return `
    <div class="panel-header">
      <div class="panel-title">
        <h2>${escapeHtml(note.title)}</h2>
        <small>${escapeHtml(categoryPath(note.categoryId) || "미분류")}</small>
      </div>
      <div class="toolbar">
        <button class="btn" data-action="create-manual-from-note" data-id="${note.id}">매뉴얼 생성</button>
        <button class="btn" data-action="duplicate-note" data-id="${note.id}">복제</button>
        <button class="btn" data-action="open-modal" data-type="note" data-id="${note.id}">수정</button>
      </div>
    </div>
    <div class="panel-body">
      <div class="item-meta">
        ${renderStatus(note.status)}
        ${renderTags(note.tags)}
        <span>수정 ${formatDate(note.updatedAt)}</span>
      </div>
      <div class="grid two" style="margin-top:14px;">
        <div>
          <h3 style="margin-bottom:8px;">판단 기준</h3>
          <p class="markdown-preview">${escapeHtml(note.judgmentCriteria || "작성된 판단 기준이 없습니다.")}</p>
        </div>
        <div>
          <h3 style="margin-bottom:8px;">연결 원문</h3>
          <div class="item-list">
            ${linkedSources.length ? linkedSources.map(renderSourceCard).join("") : renderEmpty("연결된 원문이 없습니다.")}
          </div>
        </div>
      </div>
      <div style="margin-top:16px;">
        <h3 style="margin-bottom:8px;">노트 본문</h3>
        <div class="markdown-preview">${escapeHtml(note.body || "")}</div>
      </div>
    </div>
  `;
}

function renderManualsView() {
  const manuals = filteredManuals();
  const selected = manuals.find(manual => manual.id === app.state.selectedManualId) || manuals[0];
  if (selected && app.state.selectedManualId !== selected.id) app.state.selectedManualId = selected.id;
  const emptyMessage = app.state.listFilter.trim()
    ? "필터와 일치하는 매뉴얼이 없습니다."
    : "등록된 매뉴얼이 없습니다.";

  return `
    ${renderHeader(
      "매뉴얼 작성",
      "업무 판단을 이론, 관련 법령, 관련 판례, 전산 작업으로 단순하게 정리합니다.",
      `<button class="btn primary" data-action="open-modal" data-type="manual">매뉴얼 작성</button>`
    )}
    <div class="split-view">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title"><h2>매뉴얼 목록</h2><small>${manuals.length}개</small></div>
          <input class="control" data-bind="listFilter" value="${escapeAttr(app.state.listFilter)}" placeholder="매뉴얼 필터" style="max-width:170px;" />
        </div>
        <div class="panel-body tight">
          <div class="item-list">
            ${manuals.length ? manuals.map(renderManualCard).join("") : renderEmpty(emptyMessage)}
          </div>
        </div>
      </section>

      <section class="panel">
        ${selected ? renderManualDetail(selected) : `<div class="panel-body">${renderEmpty("매뉴얼을 선택하세요.")}</div>`}
      </section>
    </div>
  `;
}

function renderManualCard(manual) {
  const selected = app.state.selectedManualId === manual.id;
  return `
    <article class="item-card ${selected ? "selected" : ""}">
      <div class="item-head">
        <div>
          <p class="item-title">${escapeHtml(manual.title)}</p>
          <div class="item-meta">
            <span>이론</span>
            <span>관련 법령</span>
            <span>관련 판례</span>
            <span>전산 작업</span>
            ${manual.categoryId ? `<span>${escapeHtml(categoryPath(manual.categoryId))}</span>` : ""}
          </div>
        </div>
        <div class="toolbar">
          <button class="btn icon small" data-action="toggle-favorite" data-type="manual" data-id="${manual.id}" title="즐겨찾기">${manual.favorite ? "★" : "☆"}</button>
          <button class="btn small" data-action="select-manual" data-id="${manual.id}">열기</button>
        </div>
      </div>
      <p class="item-summary">${escapeHtml(trimText(manualTheoryText(manual) || manualSystemWorkText(manual), 140))}</p>
    </article>
  `;
}

function renderManualDetail(manual) {
  const revisions = app.data.revisions
    .filter(revision => revision.targetType === "manual" && revision.targetId === manual.id)
    .sort((a, b) => b.versionNo - a.versionNo)
    .slice(0, 5);
  return `
    <div class="panel-header">
      <div class="panel-title">
        <h2>${escapeHtml(manual.title)}</h2>
        <small>${escapeHtml(categoryPath(manual.categoryId) || "미분류")} · 이론 · 관련 법령 · 관련 판례 · 전산 작업</small>
      </div>
      <div class="toolbar">
        <button class="btn" data-action="open-modal" data-type="manual" data-id="${manual.id}">수정</button>
        <button class="btn danger" data-action="delete-item" data-type="manual" data-id="${manual.id}">삭제</button>
      </div>
    </div>
    <div class="panel-body">
      <div class="item-meta"><span>수정 ${formatDate(manual.updatedAt)}</span></div>
      <div class="grid" style="margin-top:14px;">
        ${renderManualPart("이론", manualTheoryText(manual), "판단 기준과 업무 원리를 정리하세요.")}
        ${renderManualPart("관련 법령", manualRelatedLawText(manual), "관련 조문, 법령, 해석례를 정리하세요.")}
        ${renderManualPart("관련 판례", manualRelatedPrecedentText(manual), "관련 판례, 결정례, 사건번호와 판단 요지를 정리하세요.")}
        ${renderManualPart("전산 작업", manualSystemWorkText(manual), "시스템 메뉴, 입력값, 확인 절차를 정리하세요.")}
      </div>

      <div style="margin-top:16px;">
        <h3 style="margin-bottom:8px;">변경 이력</h3>
        ${revisions.length ? `
          <table class="kbd-table">
            <thead><tr><th>버전</th><th>변경일</th><th>사유</th></tr></thead>
            <tbody>${revisions.map(revision => `<tr><td>v${revision.versionNo}</td><td>${formatDate(revision.createdAt)}</td><td>${escapeHtml(revision.changeReason || "수정")}</td></tr>`).join("")}</tbody>
          </table>
        ` : renderEmpty("아직 변경 이력이 없습니다.")}
      </div>
    </div>
  `;
}

function renderManualPart(title, value, emptyText) {
  return `
    <section class="item-card">
      <h3 style="margin-bottom:8px;">${escapeHtml(title)}</h3>
      <div class="markdown-preview">${escapeHtml(value || emptyText)}</div>
    </section>
  `;
}

function manualTheoryText(manual) {
  if (manual.theory) return manual.theory;
  const linkedNote = app.data.notes.find(note => note.id === manual.noteId);
  if (!linkedNote) return "";
  return [linkedNote.judgmentCriteria, linkedNote.body].filter(Boolean).join("\n\n");
}

function manualRelatedLawText(manual) {
  if (manual.relatedLaw) return manual.relatedLaw;
  const sources = linkedManualSources(manual).filter(source => !isPrecedentSource(source));
  if (!sources.length) return "";
  return sources.map(formatManualSource).join("\n\n");
}

function manualRelatedPrecedentText(manual) {
  if (manual.relatedPrecedent) return manual.relatedPrecedent;
  const sources = linkedManualSources(manual).filter(isPrecedentSource);
  if (!sources.length) return "";
  return sources.map(formatManualSource).join("\n\n");
}

function linkedManualSources(manual) {
  const linkedNote = app.data.notes.find(note => note.id === manual.noteId);
  const sourceIds = linkedNote?.linkedSourceIds || [];
  return sourceIds
    .map(id => app.data.sourceDocuments.find(source => source.id === id))
    .filter(Boolean);
}

function isPrecedentSource(source) {
  return source.type === "판례";
}

function formatManualSource(source) {
  return [
    `- ${source.title}`,
    source.documentNumber ? `  문서번호: ${source.documentNumber}` : "",
    source.sourceDate ? `  일자: ${source.sourceDate}` : "",
    source.officialUrl ? `  링크: ${source.officialUrl}` : "",
    source.summary ? `  메모: ${source.summary}` : ""
  ].filter(Boolean).join("\n");
}

function manualSystemWorkText(manual) {
  if (manual.systemWork) return manual.systemWork;
  const parts = [];
  if (manual.systemName) parts.push(`전산 시스템: ${manual.systemName}`);
  if (manual.menuPath?.length) parts.push(`메뉴 경로: ${manual.menuPath.join(" > ")}`);
  if (manual.inputFields?.length) parts.push(`입력값:\n${formatInputFields(manual.inputFields)}`);
  if (manual.steps?.length) parts.push(`처리 단계:\n${formatSteps(manual.steps)}`);
  if (manual.checklist?.length) parts.push(`확인 사항:\n${formatChecklist(manual.checklist)}`);
  if (manual.cautions) parts.push(`주의사항:\n${manual.cautions}`);
  return parts.join("\n\n");
}

function renderFlowsView() {
  const flows = filteredFlows();
  const selected = app.data.flows.find(flow => flow.id === app.state.selectedFlowId) || flows[0];
  if (selected && app.state.selectedFlowId !== selected.id) app.state.selectedFlowId = selected.id;

  return `
    ${renderHeader(
      "Tax-Flow 연결 문서",
      "원문, 판단 노트, 전산 매뉴얼을 하나의 쟁점 단위로 묶어 재사용합니다.",
      `<button class="btn primary" data-action="open-modal" data-type="flow">Flow 생성</button>`
    )}
    <div class="grid flow-layout">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title"><h2>Flow 목록</h2><small>${flows.length}개</small></div>
          <input class="control" data-bind="listFilter" value="${escapeAttr(app.state.listFilter)}" placeholder="Flow 필터" style="max-width:150px;" />
        </div>
        <div class="panel-body tight">
          <div class="item-list">
            ${flows.length ? flows.map(renderFlowCard).join("") : renderEmpty("등록된 Flow가 없습니다.")}
          </div>
        </div>
      </section>

      <section class="panel">
        ${selected ? renderFlowDetail(selected) : `<div class="panel-body">${renderEmpty("Flow를 선택하세요.")}</div>`}
      </section>
    </div>
  `;
}

function renderFlowCard(flow) {
  const selected = app.state.selectedFlowId === flow.id;
  return `
    <article class="item-card ${selected ? "selected" : ""}">
      <div class="item-head">
        <div>
          <p class="item-title">${escapeHtml(flow.title)}</p>
          <div class="item-meta">
            ${renderStatus(flow.status)}
            ${renderRisk(flow.riskLevel)}
            ${flow.categoryId ? `<span>${escapeHtml(categoryPath(flow.categoryId))}</span>` : ""}
          </div>
        </div>
        <div class="toolbar">
          <button class="btn icon small" data-action="toggle-favorite" data-type="flow" data-id="${flow.id}" title="즐겨찾기">${flow.favorite ? "★" : "☆"}</button>
          <button class="btn small" data-action="select-flow" data-id="${flow.id}">열기</button>
        </div>
      </div>
      <p class="item-summary">${escapeHtml(trimText(flow.issueSummary, 140))}</p>
      <div class="item-meta">
        <span>원문 ${flow.sourceIds.length}</span>
        <span>노트 ${flow.noteIds.length}</span>
        <span>매뉴얼 ${flow.manualIds.length}</span>
        ${renderTags(flow.tags)}
      </div>
    </article>
  `;
}

function renderFlowDetail(flow) {
  const sources = flow.sourceIds.map(id => app.data.sourceDocuments.find(item => item.id === id)).filter(Boolean);
  const notes = flow.noteIds.map(id => app.data.notes.find(item => item.id === id)).filter(Boolean);
  const manuals = flow.manualIds.map(id => app.data.manuals.find(item => item.id === id)).filter(Boolean);

  return `
    <div class="panel-header">
      <div class="panel-title">
        <h2>${escapeHtml(flow.title)}</h2>
        <small>${escapeHtml(categoryPath(flow.categoryId) || "미분류")} · ${formatDate(flow.updatedAt)}</small>
      </div>
      <div class="toolbar">
        <button class="btn" data-action="copy-flow" data-id="${flow.id}">Markdown</button>
        <button class="btn" data-action="open-modal" data-type="flow" data-id="${flow.id}">수정</button>
        <button class="btn danger" data-action="delete-item" data-type="flow" data-id="${flow.id}">삭제</button>
      </div>
    </div>
    <div class="panel-body">
      <div class="item-meta">
        ${renderStatus(flow.status)}
        ${renderRisk(flow.riskLevel)}
        ${renderTags(flow.tags)}
      </div>
      <p class="markdown-preview" style="margin-top:12px;">${escapeHtml(flow.issueSummary || "")}</p>

      <div class="three-pane" style="margin-top:16px;">
        <section class="flow-column">
          <div class="flow-column-head"><h3>1. 원문 근거</h3></div>
          <div class="flow-column-body">
            ${sources.length ? sources.map(renderSourceCard).join("") : renderEmpty("연결 원문 없음")}
          </div>
        </section>
        <section class="flow-column">
          <div class="flow-column-head"><h3>2. 이론 노트</h3></div>
          <div class="flow-column-body">
            ${notes.length ? notes.map(renderNoteCard).join("") : renderEmpty("연결 노트 없음")}
          </div>
        </section>
        <section class="flow-column">
          <div class="flow-column-head"><h3>3. 전산 매뉴얼</h3></div>
          <div class="flow-column-body">
            ${manuals.length ? manuals.map(renderManualCard).join("") : renderEmpty("연결 매뉴얼 없음")}
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderQaView() {
  const qa = app.data.qa;
  const recentCount = qa.messages.length;
  return `
    ${renderHeader(
      "실무 Q&A 워크벤치",
      "property-tax-qa의 질의응답 흐름을 가져와, 현재 Tax-Flow에 저장된 원문·노트·매뉴얼을 기반으로 답변 초안을 만듭니다.",
      `<button class="btn" data-action="clear-qa">질의응답 비우기</button>`
    )}
    <div class="grid two">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>질문</h2>
            <small>최근 질의응답 ${recentCount}건 유지</small>
          </div>
          <label class="toggle-line">
            <input type="checkbox" data-bind="qaIncludePublic" ${qa.includePublic ? "checked" : ""} />
            <span>공식 검색 후보 포함</span>
          </label>
        </div>
        <div class="panel-body">
          <form data-form="qa" class="field">
            <label for="qaQuestion">질문 입력</label>
            <textarea id="qaQuestion" name="question" data-bind="qaDraft" placeholder="예: &quot;대도시 법인&quot; 중과 판단 기준과 전산 입력 순서를 알려줘.">${escapeHtml(qa.draft || "")}</textarea>
            <div class="form-actions">
              <button class="btn primary" type="submit">자료 기반 답변 생성</button>
            </div>
          </form>
          <div style="margin-top:14px;">
            <h3 style="margin-bottom:8px;">빠른 질문</h3>
            <div class="toolbar" style="justify-content:flex-start;">
              ${qaStarterPrompts.map(prompt => `<button class="btn small" data-action="set-qa-prompt" data-value="${escapeAttr(prompt)}">${escapeHtml(prompt)}</button>`).join("")}
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>답변 원칙</h2>
            <small>법적 판단 자동 확정 아님</small>
          </div>
        </div>
        <div class="panel-body">
          <div class="item-list">
            <div class="item-card">저장된 원문, 노트, 전산 매뉴얼을 먼저 검색하고 결과를 섹션으로 나눠 보여줍니다.</div>
            <div class="item-card">큰따옴표로 묶은 표현은 정확히 포함된 자료만 우선 매칭합니다.</div>
            <div class="item-card">공식 검색 후보 포함을 켜면 국가법령정보센터 등 외부 검색 링크 후보도 함께 제시합니다.</div>
            <div class="item-card">최종 과세 판단과 전산 입력은 담당자가 공식 원문과 사실관계를 확인해야 합니다.</div>
          </div>
        </div>
      </section>
    </div>

    <section class="panel" style="margin-top:16px;">
      <div class="panel-header">
        <div class="panel-title">
          <h2>최근 질의응답</h2>
          <small>최대 3건 자동 저장</small>
        </div>
      </div>
      <div class="panel-body">
        <div class="item-list">
          ${qa.messages.length ? qa.messages.map(renderQaMessage).join("") : renderEmpty("아직 질의응답이 없습니다.")}
        </div>
      </div>
    </section>
  `;
}

function renderQaMessage(message) {
  const refs = (message.references || []).map(resolveQaReference).filter(Boolean);
  return `
    <article class="item-card">
      <div class="item-head">
        <div>
          <p class="item-title">${escapeHtml(message.question)}</p>
          <div class="item-meta">
            <span>${formatDate(message.createdAt)}</span>
            <span class="count-pill">참조 ${refs.length}</span>
          </div>
        </div>
      </div>
      <div class="qa-answer">
        ${renderQaSections(message.answerSections || [])}
      </div>
      <div style="margin-top:12px;">
        <h3 style="margin-bottom:8px;">참조 자료</h3>
        <div class="item-list">
          ${refs.length ? refs.map(renderQaReferenceCard).join("") : renderEmpty("참조 자료가 없습니다.")}
        </div>
      </div>
    </article>
  `;
}

function renderQaSections(sections) {
  if (!sections.length) return renderEmpty("답변 내용이 없습니다.");
  return sections.map(section => `
    <section class="qa-section ${section.tone || ""}">
      <h3>${escapeHtml(section.title)}</h3>
      <div class="markdown-preview">${escapeHtml(section.body || "")}</div>
    </section>
  `).join("");
}

function renderQaReferenceCard(ref) {
  if (ref.kind === "official") {
    return `
      <article class="item-card">
        <div class="item-head">
          <div>
            <p class="item-title">${escapeHtml(ref.title)}</p>
            <div class="item-meta"><span class="type-pill">${escapeHtml(ref.type)}</span><span>${escapeHtml(ref.sourceName)}</span></div>
          </div>
          <a class="btn small" href="${escapeAttr(ref.officialUrl)}" target="_blank" rel="noreferrer">열기</a>
        </div>
        <p class="item-summary">${escapeHtml(ref.summary || "")}</p>
      </article>
    `;
  }
  return renderGenericCard(ref);
}

function renderBulkView() {
  const preview = app.state.bulkPreview;
  const errorCount = preview?.errors?.length || 0;
  const totalRows = preview?.rows?.length || 0;
  const validRows = totalRows - errorCount;
  const summaries = preview ? Object.entries(preview.categoryStats).filter(([, count]) => count > 0) : [];
  return `
    ${renderHeader(
      "CSV·Markdown 대량등록",
      "property-tax-qa의 대량등록 형식을 가져와, 업로드 전에 분류와 오류를 확인한 뒤 Tax-Flow 항목으로 변환합니다.",
      `<button class="btn" data-action="clear-bulk">미리보기 초기화</button>`
    )}
    <div class="grid two">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>파일 선택</h2>
            <small>CSV 또는 Markdown</small>
          </div>
        </div>
        <div class="panel-body">
          <label class="upload-box">
            <span class="eyebrow">Bulk Import</span>
            <strong>파일을 선택하면 바로 미리보기를 생성합니다.</strong>
            <span>CSV 헤더: ${bulkRequiredHeaders.join(", ")}</span>
            <input type="file" data-action="bulk-file" accept=".csv,text/csv,.md,.markdown,text/markdown" />
          </label>
          ${app.state.bulkFileName ? `<p class="description">선택 파일: ${escapeHtml(app.state.bulkFileName)}</p>` : ""}
          ${app.state.bulkError ? `<div class="item-card" style="margin-top:12px;color:var(--red);">${escapeHtml(app.state.bulkError)}</div>` : ""}
          ${app.state.bulkResult ? `<div class="item-card" style="margin-top:12px;color:var(--accent-strong);">${escapeHtml(app.state.bulkResult)}</div>` : ""}
          <div class="form-actions">
            <button class="btn primary" data-action="commit-bulk" ${preview && validRows > 0 ? "" : "disabled"}>유효 항목 등록</button>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>미리보기 요약</h2>
            <small>${preview ? preview.formatLabel : "파일 대기"}</small>
          </div>
        </div>
        <div class="panel-body">
          <div class="stat-grid">
            ${renderStat("전체", totalRows)}
            ${renderStat("유효", validRows)}
            ${renderStat("검토 필요", errorCount)}
            ${renderStat("분류", summaries.length)}
          </div>
          <div class="item-list" style="margin-top:12px;">
            ${summaries.length ? summaries.map(([category, count]) => `
              <div class="item-card item-head">
                <span>${escapeHtml(bulkCategoryLabels[category] || category)}</span>
                <span class="count-pill">${count}건</span>
              </div>
            `).join("") : renderEmpty("미리보기 생성 후 분류별 건수가 표시됩니다.")}
          </div>
        </div>
      </section>
    </div>

    <section class="panel" style="margin-top:16px;">
      <div class="panel-header">
        <div class="panel-title">
          <h2>파싱 결과</h2>
          <small>상위 20건 표시</small>
        </div>
      </div>
      <div class="panel-body">
        ${preview ? renderBulkPreviewTable(preview) : renderBulkExample()}
      </div>
    </section>
  `;
}

function renderBulkPreviewTable(preview) {
  return `
    ${preview.errors.length ? `
      <div class="item-card" style="margin-bottom:12px;color:var(--red);">
        ${preview.errors.map(issue => `${issue.line}번 항목: ${issue.message}`).map(escapeHtml).join("<br>")}
      </div>
    ` : ""}
    <div class="preview-table-wrap">
      <table class="kbd-table">
        <thead><tr><th>번호</th><th>분류</th><th>제목</th><th>출처</th><th>날짜</th><th>상태</th></tr></thead>
        <tbody>
          ${preview.rows.slice(0, 20).map(row => {
            const rowError = preview.errors.find(issue => issue.line === row.line);
            return `
              <tr>
                <td>${row.line}</td>
                <td>${escapeHtml(bulkCategoryLabels[row.category] || row["분류"] || "-")}</td>
                <td>${escapeHtml(row["제목"] || "-")}</td>
                <td>${escapeHtml(row["출처"] || "-")}</td>
                <td>${escapeHtml(row["날짜"] || "-")}</td>
                <td>${rowError ? `<span class="state-pill danger">검토</span>` : `<span class="state-pill">유효</span>`}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderBulkExample() {
  return `
    <div class="grid two">
      <div class="item-card">
        <h3>CSV 형식</h3>
        <p class="markdown-preview">분류,제목,출처,내용,전산적용,날짜,태그
이론,사실상 취득 판단 기준,내부 검토 메모,대금 지급과 사용수익 이전 등 실질을 확인한다.,잔금일과 점유 이전일을 함께 확인한다.,2026-01-01,취득세;사실상취득</p>
      </div>
      <div class="item-card">
        <h3>Markdown 형식</h3>
        <p class="markdown-preview"># 경매취득 정리
- 분류: 이론
- 출처: 내부 검토 메모
- 날짜: 2026-01-01
- 태그: 취득세;경매취득
## 내용
경매 취득 과세표준 판단 기준을 정리한다.
## 전산적용
매각대금완납증명원 확인 후 취득가액 입력

---
# 시가인정액 관련 문의
- 분류: 민원처리
- 출처: 민원처리 내부기록
- 날짜: 2026-01-02
- 태그: 취득세;증여;민원
## 내용
시가인정액이 없을 때 적용 기준 문의
## 전산적용
위택스 보완 입력 확인</p>
      </div>
    </div>
  `;
}

function renderSearchView() {
  const results = runInternalSearch(app.state.searchQuery, app.state.searchScope);
  const grouped = groupBy(results, item => item.kind);
  const groups = [
    ["source", "원문"],
    ["note", "노트"],
    ["manual", "매뉴얼"],
    ["flow", "Flow"]
  ];
  return `
    ${renderHeader(
      "통합 검색",
      "세목, 카테고리, 태그, 원문 메타데이터, 노트 본문, 매뉴얼 절차를 함께 검색합니다.",
      `<button class="btn" data-action="clear-category">카테고리 필터 해제</button>`
    )}
    <section class="panel">
      <div class="panel-header">
        <div class="panel-title">
          <h2>검색 결과</h2>
          <small>${results.length}개</small>
        </div>
        <div class="toolbar">
          <span class="state-pill">${app.state.searchScope === "current" ? "현재 세목" : "전체 세목"}</span>
          ${app.state.searchQuery ? `<span class="tag-pill">${escapeHtml(app.state.searchQuery)}</span>` : ""}
        </div>
      </div>
      <div class="panel-body">
        ${app.state.searchQuery ? groups.map(([kind, label]) => `
          <div style="margin-bottom:16px;">
            <h3 style="margin-bottom:8px;">${label}</h3>
            <div class="item-list">
              ${(grouped[kind] || []).length ? grouped[kind].map(renderGenericCard).join("") : renderEmpty(`${label} 결과가 없습니다.`)}
            </div>
          </div>
        `).join("") : renderEmpty("상단 검색창에서 검색어를 입력하세요.")}
      </div>
    </section>
  `;
}

function renderSettingsView() {
  const hiddenTaxItems = app.data.taxItems.filter(item => item.status !== "active");
  return `
    ${renderHeader(
      "설정",
      "세목 관리, 데이터 백업, 로컬 저장소 초기화를 처리합니다.",
      `<button class="btn primary" data-action="open-modal" data-type="tax-item">세목 추가</button>`
    )}
    <div class="grid two">
      <section class="panel">
        <div class="panel-header"><div class="panel-title"><h2>세목</h2><small>활성·숨김·정렬</small></div></div>
        <div class="panel-body">
          <table class="kbd-table">
            <thead><tr><th>세목</th><th>코드</th><th>상태</th><th></th></tr></thead>
            <tbody>
              ${app.data.taxItems.sort(sortOrder).map(item => `
                <tr>
                  <td>${escapeHtml(item.name)}</td>
                  <td>${escapeHtml(item.code)}</td>
                  <td>${renderStatus(item.status)}</td>
                  <td><button class="btn small" data-action="open-modal" data-type="tax-item" data-id="${item.id}">수정</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          ${hiddenTaxItems.length ? `<p class="description">숨김 세목: ${hiddenTaxItems.map(item => escapeHtml(item.name)).join(", ")}</p>` : ""}
        </div>
      </section>

      <section class="panel">
        <div class="panel-header"><div class="panel-title"><h2>백업</h2><small>JSON 내보내기·가져오기</small></div></div>
        <div class="panel-body">
          <div class="toolbar" style="justify-content:flex-start;margin-bottom:14px;">
            <button class="btn primary" data-action="export-data">내보내기</button>
            <button class="btn danger" data-action="reset-data">샘플 데이터로 초기화</button>
          </div>
          <form data-form="import-data" class="field">
            <label for="importJson">가져오기 JSON</label>
            <textarea id="importJson" name="json" placeholder="내보낸 Tax-Flow JSON을 붙여넣기"></textarea>
            <div class="form-actions">
              <button class="btn" type="submit">가져오기</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  `;
}

function renderBackupView() {
  const summary = backupSummary(app.data);
  return `
    ${renderHeader(
      "데이터 백업/복원",
      "컴퓨터를 바꿀 때 백업 파일을 새 PC에서 복원하면 입력하고 저장한 데이터를 그대로 이어서 사용할 수 있습니다.",
      `<button class="btn primary" data-action="export-data">백업 파일 만들기</button>`
    )}
    <div class="grid two">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>현재 데이터 백업</h2>
            <small>PC 이동용 JSON</small>
          </div>
        </div>
        <div class="panel-body">
          <div class="file-guide">
            <div>
              <strong>포함되는 데이터</strong>
              <span>세목, 카테고리, 즐겨찾기한 법령·판례, 매뉴얼, 등록한 Markdown·TXT 파일 본문, 태그, 검색/작업 메모를 함께 저장합니다.</span>
            </div>
            <div>
              <strong>새 컴퓨터에서 사용</strong>
              <span>이 컴퓨터에서 백업 파일을 만든 뒤 새 컴퓨터의 같은 메뉴에서 그 JSON 파일을 선택해 복원하세요.</span>
            </div>
            <div>
              <strong>보안 안내</strong>
              <span>OpenAI/Gemini/DeepSeek/Z.ai API key와 LAW_OC 같은 비밀 키는 백업 파일에 포함하지 않습니다. 새 컴퓨터에서 한 번 다시 입력하세요.</span>
            </div>
          </div>
          <div class="backup-summary">
            <span class="state-pill">세목 ${summary.taxItems}</span>
            <span class="state-pill">카테고리 ${summary.categories}</span>
            <span class="state-pill">즐겨찾기 ${summary.favorites}</span>
            <span class="state-pill">매뉴얼 ${summary.manuals}</span>
            <span class="state-pill">등록 파일 ${summary.theoryFiles}</span>
          </div>
          <div class="form-actions">
            <button class="btn primary" data-action="export-data">백업 파일 만들기</button>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>백업 파일 복원</h2>
            <small>새 PC에서 JSON 선택</small>
          </div>
        </div>
        <div class="panel-body">
          <form data-form="import-data" class="form-grid">
            <div class="field full">
              <label class="upload-box">
                <span class="eyebrow">Tax-Flow 백업 JSON</span>
                <strong>백업 파일을 선택해 현재 데이터로 복원합니다.</strong>
                <span>복원하면 현재 컴퓨터의 Tax-Flow 데이터가 백업 파일 내용으로 교체됩니다.</span>
                <input type="file" name="backupFile" accept=".json,application/json" />
              </label>
            </div>
            <div class="field full">
              <label for="importJson">또는 JSON 직접 붙여넣기</label>
              <textarea id="importJson" name="json" placeholder="백업 JSON 내용을 붙여넣기"></textarea>
            </div>
            <div class="field full form-actions">
              <button class="btn primary" type="submit">백업 복원</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  `;
}

function renderGenericCard(item) {
  const kind = item.kind || inferKind(item);
  if (kind === "source") return renderSourceCard(item);
  if (kind === "note") return renderNoteCard(item);
  if (kind === "manual") return renderManualCard(item);
  if (kind === "flow") return renderFlowCard(item);
  if (kind === "theoryFile") return renderTheoryFileCard(item);
  return "";
}

function renderRecentList(limit) {
  const recent = app.data.recentItems.map(refToItem).filter(Boolean).slice(0, limit);
  if (!recent.length) return `<div class="empty">최근 항목 없음</div>`;
  return recent.map(item => {
    const kind = inferKind(item);
    const action = kind === "source" ? "select-source" : kind === "note" ? "select-note" : kind === "manual" ? "select-manual" : "select-flow";
    return `
      <button class="compact-button" data-action="${action}" data-id="${item.id}">
        <span class="tax-name">${escapeHtml(item.title)}</span>
        <span class="count-pill">${escapeHtml(kindLabel(kind))}</span>
      </button>
    `;
  }).join("");
}

function renderStatus(status) {
  const label = statusLabels[status] || status || "활성";
  const variant = status === "archived" ? "warning" : "";
  return `<span class="state-pill ${variant}">${escapeHtml(label)}</span>`;
}

function renderRisk(risk) {
  const variant = risk === "high" ? "danger" : risk === "low" ? "" : "warning";
  return `<span class="state-pill ${variant}">위험도 ${escapeHtml(riskLabels[risk] || "보통")}</span>`;
}

function renderTags(tags = []) {
  return tags.map(tag => `<span class="tag-pill">#${escapeHtml(tag)}</span>`).join("");
}

function renderCountPills(counts) {
  return `
    <span class="count-pill">원문 ${counts.sources}</span>
    <span class="count-pill">노트 ${counts.notes}</span>
    <span class="count-pill">매뉴얼 ${counts.manuals}</span>
    <span class="count-pill">파일 ${counts.files || 0}</span>
    <span class="count-pill">Flow ${counts.flows}</span>
  `;
}

function renderEmpty(message) {
  return `<div class="empty">${escapeHtml(message)}</div>`;
}

function renderModal() {
  if (!app.state.modal) return "";
  const { type, id, parentId } = app.state.modal;
  const title = modalTitle(type, id);
  return `
    <div class="modal-backdrop" role="presentation">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="panel-header">
          <div class="panel-title">
            <h2>${escapeHtml(title)}</h2>
            <small>${escapeHtml(currentTaxItem()?.name || "")}</small>
          </div>
          <button class="btn icon" data-action="close-modal" title="닫기">×</button>
        </div>
        <div class="panel-body">
          ${renderModalForm(type, id, parentId)}
        </div>
      </div>
    </div>
  `;
}

function renderModalForm(type, id, parentId) {
  if (type === "category") return renderCategoryForm(id, parentId);
  if (type === "source") return renderSourceForm(id);
  if (type === "note") return renderNoteForm(id);
  if (type === "manual") return renderManualForm(id);
  if (type === "flow") return renderFlowForm(id);
  if (type === "tax-item") return renderTaxItemForm(id);
  return renderEmpty("지원하지 않는 양식입니다.");
}

function modalTitle(type, id) {
  const map = {
    category: "카테고리",
    source: "원문",
    note: "노트",
    manual: "매뉴얼",
    flow: "Flow",
    "tax-item": "세목"
  };
  return `${map[type] || "항목"} ${id ? "수정" : "생성"}`;
}

function renderCategoryForm(id, parentId = "") {
  const item = app.data.categories.find(category => category.id === id) || {
    id: "",
    taxItemId: app.state.currentTaxItemId,
    parentId,
    name: "",
    description: "",
    status: "active"
  };
  return `
    <form data-form="category" class="form-grid">
      <input type="hidden" name="id" value="${escapeAttr(item.id)}" />
      <input type="hidden" name="taxItemId" value="${escapeAttr(item.taxItemId)}" />
      <div class="field">
        <label for="categoryName">이름</label>
        <input id="categoryName" name="name" class="control" value="${escapeAttr(item.name)}" required />
      </div>
      <div class="field">
        <label for="categoryParent">상위 카테고리</label>
        <select id="categoryParent" name="parentId" class="control">
          <option value="">최상위</option>
          ${categoryOptions(app.state.currentTaxItemId, item.id, item.parentId)}
        </select>
      </div>
      <div class="field">
        <label for="categoryStatus">상태</label>
        <select id="categoryStatus" name="status" class="control">
          ${["active", "hidden", "archived"].map(status => `<option value="${status}" ${item.status === status ? "selected" : ""}>${statusLabels[status] || status}</option>`).join("")}
        </select>
      </div>
      <div class="field full">
        <label for="categoryDescription">설명</label>
        <textarea id="categoryDescription" name="description">${escapeHtml(item.description || "")}</textarea>
      </div>
      <div class="field full form-actions">
        <button class="btn" type="button" data-action="close-modal">취소</button>
        <button class="btn primary" type="submit">저장</button>
      </div>
    </form>
  `;
}

function renderSourceForm(id) {
  const item = app.data.sourceDocuments.find(source => source.id === id) || {
    id: "",
    taxItemId: app.state.currentTaxItemId,
    categoryId: app.state.selectedCategoryId,
    type: "법령",
    title: "",
    sourceName: "",
    officialUrl: "",
    sourceDate: "",
    documentNumber: "",
    summary: "",
    tags: []
  };
  return `
    <form data-form="source" class="form-grid">
      <input type="hidden" name="id" value="${escapeAttr(item.id)}" />
      <input type="hidden" name="taxItemId" value="${escapeAttr(item.taxItemId)}" />
      <div class="field">
        <label for="sourceTitle">제목</label>
        <input id="sourceTitle" name="title" class="control" value="${escapeAttr(item.title)}" required />
      </div>
      <div class="field">
        <label for="sourceType">자료 유형</label>
        <select id="sourceType" name="type" class="control">
          ${sourceTypes.map(type => `<option value="${type}" ${item.type === type ? "selected" : ""}>${type}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="sourceCategory">카테고리</label>
        <select id="sourceCategory" name="categoryId" class="control">
          <option value="">미분류</option>
          ${categoryOptions(item.taxItemId, "", item.categoryId)}
        </select>
      </div>
      <div class="field">
        <label for="sourceName">출처</label>
        <input id="sourceName" name="sourceName" class="control" value="${escapeAttr(item.sourceName)}" placeholder="국가법령정보센터, 지방세 법령정보시스템" />
      </div>
      <div class="field">
        <label for="sourceDate">일자</label>
        <input id="sourceDate" name="sourceDate" class="control" value="${escapeAttr(item.sourceDate)}" placeholder="2026-06-19" />
      </div>
      <div class="field">
        <label for="sourceNumber">문서번호</label>
        <input id="sourceNumber" name="documentNumber" class="control" value="${escapeAttr(item.documentNumber)}" />
      </div>
      <div class="field full">
        <label for="sourceUrl">공식 링크</label>
        <input id="sourceUrl" name="officialUrl" class="control" value="${escapeAttr(item.officialUrl)}" placeholder="https://..." />
      </div>
      <div class="field full">
        <label for="sourceSummary">요약/메모</label>
        <textarea id="sourceSummary" name="summary">${escapeHtml(item.summary || "")}</textarea>
      </div>
      <div class="field full">
        <label for="sourceTags">태그</label>
        <input id="sourceTags" name="tags" class="control" value="${escapeAttr((item.tags || []).join(", "))}" placeholder="대도시, 중과, 입문 코스" />
      </div>
      <div class="field full form-actions">
        ${item.id ? `<button class="btn danger" type="button" data-action="delete-item" data-type="source" data-id="${item.id}">삭제</button>` : ""}
        <button class="btn" type="button" data-action="close-modal">취소</button>
        <button class="btn primary" type="submit">저장</button>
      </div>
    </form>
  `;
}

function renderNoteForm(id) {
  const item = app.data.notes.find(note => note.id === id) || {
    id: "",
    taxItemId: app.state.currentTaxItemId,
    categoryId: app.state.selectedCategoryId,
    title: "",
    status: "draft",
    judgmentCriteria: "",
    body: "",
    tags: [],
    linkedSourceIds: []
  };
  const sources = app.data.sourceDocuments.filter(source => source.taxItemId === item.taxItemId).sort(sortUpdated);
  return `
    <form data-form="note" class="form-grid">
      <input type="hidden" name="id" value="${escapeAttr(item.id)}" />
      <input type="hidden" name="taxItemId" value="${escapeAttr(item.taxItemId)}" />
      <div class="field">
        <label for="noteTitle">제목</label>
        <input id="noteTitle" name="title" class="control" value="${escapeAttr(item.title)}" required />
      </div>
      <div class="field">
        <label for="noteCategory">카테고리</label>
        <select id="noteCategory" name="categoryId" class="control">
          <option value="">미분류</option>
          ${categoryOptions(item.taxItemId, "", item.categoryId)}
        </select>
      </div>
      <div class="field">
        <label for="noteStatus">상태</label>
        <select id="noteStatus" name="status" class="control">
          ${statuses.map(status => `<option value="${status}" ${item.status === status ? "selected" : ""}>${statusLabels[status]}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="noteTags">태그</label>
        <input id="noteTags" name="tags" class="control" value="${escapeAttr((item.tags || []).join(", "))}" />
      </div>
      <div class="field full">
        <label for="noteJudgment">판단 기준</label>
        <textarea id="noteJudgment" name="judgmentCriteria">${escapeHtml(item.judgmentCriteria || "")}</textarea>
      </div>
      <div class="field full">
        <label for="noteBody">본문</label>
        <textarea id="noteBody" name="body" style="min-height:220px;">${escapeHtml(item.body || "")}</textarea>
      </div>
      <div class="field full">
        <label>연결 원문</label>
        <div class="item-list">
          ${sources.length ? sources.map(source => `
            <label class="check-row item-card">
              <input type="checkbox" name="linkedSourceIds" value="${source.id}" ${(item.linkedSourceIds || []).includes(source.id) ? "checked" : ""} />
              <span><strong>${escapeHtml(source.title)}</strong><br><small>${escapeHtml(source.type)} · ${escapeHtml(source.sourceName || "")}</small></span>
            </label>
          `).join("") : renderEmpty("먼저 원문을 등록하세요.")}
        </div>
      </div>
      <div class="field full form-actions">
        ${item.id ? `<button class="btn danger" type="button" data-action="delete-item" data-type="note" data-id="${item.id}">삭제</button>` : ""}
        <button class="btn" type="button" data-action="close-modal">취소</button>
        <button class="btn primary" type="submit">저장</button>
      </div>
    </form>
  `;
}

function renderManualForm(id) {
  const item = app.data.manuals.find(manual => manual.id === id) || {
    id: "",
    taxItemId: app.state.currentTaxItemId,
    categoryId: app.state.selectedCategoryId,
    title: "",
    theory: "",
    relatedLaw: "",
    relatedPrecedent: "",
    systemWork: ""
  };
  return `
    <form data-form="manual" class="form-grid">
      <input type="hidden" name="id" value="${escapeAttr(item.id)}" />
      <input type="hidden" name="taxItemId" value="${escapeAttr(item.taxItemId)}" />
      <div class="field full">
        <label for="manualTitle">제목</label>
        <input id="manualTitle" name="title" class="control" value="${escapeAttr(item.title)}" required />
      </div>
      <div class="field full">
        <label for="manualCategory">하위카테고리</label>
        <select id="manualCategory" name="categoryId" class="control">
          <option value="">미분류</option>
          ${categoryOptions(item.taxItemId, "", item.categoryId)}
        </select>
      </div>
      <div class="field full">
        <label for="manualTheory">이론</label>
        <textarea id="manualTheory" name="theory" style="min-height:160px;" placeholder="쟁점의 판단 기준, 업무 원리, 검토 기준을 정리합니다.">${escapeHtml(manualTheoryText(item))}</textarea>
      </div>
      <div class="field full">
        <label for="manualRelatedLaw">관련 법령</label>
        <textarea id="manualRelatedLaw" name="relatedLaw" style="min-height:150px;" placeholder="관련 조문, 법령, 질의회신, 원문 링크를 정리합니다.">${escapeHtml(manualRelatedLawText(item))}</textarea>
      </div>
      <div class="field full">
        <label for="manualRelatedPrecedent">관련 판례</label>
        <textarea id="manualRelatedPrecedent" name="relatedPrecedent" style="min-height:150px;" placeholder="관련 판례, 결정례, 사건번호, 판단 요지를 정리합니다.">${escapeHtml(manualRelatedPrecedentText(item))}</textarea>
      </div>
      <div class="field full">
        <label for="manualSystemWork">전산 작업</label>
        <textarea id="manualSystemWork" name="systemWork" style="min-height:180px;" placeholder="전산 시스템 메뉴, 입력값, 확인 순서, 주의사항을 정리합니다.">${escapeHtml(manualSystemWorkText(item))}</textarea>
      </div>
      <div class="field full">
        <label for="manualReason">변경 사유</label>
        <input id="manualReason" name="changeReason" class="control" value="" placeholder="수정 시 변경 이력에 기록" />
      </div>
      <div class="field full form-actions">
        ${item.id ? `<button class="btn danger" type="button" data-action="delete-item" data-type="manual" data-id="${item.id}">삭제</button>` : ""}
        <button class="btn" type="button" data-action="close-modal">취소</button>
        <button class="btn primary" type="submit">저장</button>
      </div>
    </form>
  `;
}

function renderFlowForm(id) {
  const item = app.data.flows.find(flow => flow.id === id) || {
    id: "",
    taxItemId: app.state.currentTaxItemId,
    categoryId: app.state.selectedCategoryId,
    title: "",
    issueSummary: "",
    status: "draft",
    riskLevel: "normal",
    sourceIds: app.state.selectedSourceId ? [app.state.selectedSourceId] : [],
    noteIds: app.state.selectedNoteId ? [app.state.selectedNoteId] : [],
    manualIds: app.state.selectedManualId ? [app.state.selectedManualId] : [],
    tags: []
  };
  const sources = app.data.sourceDocuments.filter(source => source.taxItemId === item.taxItemId).sort(sortUpdated);
  const notes = app.data.notes.filter(note => note.taxItemId === item.taxItemId).sort(sortUpdated);
  const manuals = app.data.manuals.filter(manual => manual.taxItemId === item.taxItemId).sort(sortUpdated);
  return `
    <form data-form="flow" class="form-grid">
      <input type="hidden" name="id" value="${escapeAttr(item.id)}" />
      <input type="hidden" name="taxItemId" value="${escapeAttr(item.taxItemId)}" />
      <div class="field">
        <label for="flowTitle">제목</label>
        <input id="flowTitle" name="title" class="control" value="${escapeAttr(item.title)}" required />
      </div>
      <div class="field">
        <label for="flowCategory">카테고리</label>
        <select id="flowCategory" name="categoryId" class="control">
          <option value="">미분류</option>
          ${categoryOptions(item.taxItemId, "", item.categoryId)}
        </select>
      </div>
      <div class="field">
        <label for="flowStatus">상태</label>
        <select id="flowStatus" name="status" class="control">
          ${statuses.map(status => `<option value="${status}" ${item.status === status ? "selected" : ""}>${statusLabels[status]}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="flowRisk">위험도</label>
        <select id="flowRisk" name="riskLevel" class="control">
          ${Object.keys(riskLabels).map(risk => `<option value="${risk}" ${item.riskLevel === risk ? "selected" : ""}>${riskLabels[risk]}</option>`).join("")}
        </select>
      </div>
      <div class="field full">
        <label for="flowSummary">쟁점 요약</label>
        <textarea id="flowSummary" name="issueSummary">${escapeHtml(item.issueSummary || "")}</textarea>
      </div>
      <div class="field full">
        <label for="flowTags">태그</label>
        <input id="flowTags" name="tags" class="control" value="${escapeAttr((item.tags || []).join(", "))}" />
      </div>
      <div class="field full">
        <label>원문 근거</label>
        <div class="item-list">${renderCheckboxList("sourceIds", sources, item.sourceIds)}</div>
      </div>
      <div class="field full">
        <label>이론 노트</label>
        <div class="item-list">${renderCheckboxList("noteIds", notes, item.noteIds)}</div>
      </div>
      <div class="field full">
        <label>전산 매뉴얼</label>
        <div class="item-list">${renderCheckboxList("manualIds", manuals, item.manualIds)}</div>
      </div>
      <div class="field full form-actions">
        ${item.id ? `<button class="btn danger" type="button" data-action="delete-item" data-type="flow" data-id="${item.id}">삭제</button>` : ""}
        <button class="btn" type="button" data-action="close-modal">취소</button>
        <button class="btn primary" type="submit">저장</button>
      </div>
    </form>
  `;
}

function renderTaxItemForm(id) {
  const item = app.data.taxItems.find(tax => tax.id === id) || {
    id: "",
    code: "",
    name: "",
    description: "",
    status: "active"
  };
  return `
    <form data-form="tax-item" class="form-grid">
      <input type="hidden" name="id" value="${escapeAttr(item.id)}" />
      <div class="field">
        <label for="taxName">세목명</label>
        <input id="taxName" name="name" class="control" value="${escapeAttr(item.name)}" required />
      </div>
      <div class="field">
        <label for="taxCode">코드</label>
        <input id="taxCode" name="code" class="control" value="${escapeAttr(item.code)}" placeholder="local_income_tax" required />
      </div>
      <div class="field">
        <label for="taxStatus">상태</label>
        <select id="taxStatus" name="status" class="control">
          ${["active", "hidden", "archived"].map(status => `<option value="${status}" ${item.status === status ? "selected" : ""}>${statusLabels[status] || status}</option>`).join("")}
        </select>
      </div>
      <div class="field full">
        <label for="taxDescription">설명</label>
        <textarea id="taxDescription" name="description">${escapeHtml(item.description || "")}</textarea>
      </div>
      <div class="field full form-actions">
        <button class="btn" type="button" data-action="close-modal">취소</button>
        <button class="btn primary" type="submit">저장</button>
      </div>
    </form>
  `;
}

function renderCheckboxList(name, items, selectedIds = []) {
  if (!items.length) return renderEmpty("등록 항목 없음");
  return items.map(item => `
    <label class="check-row item-card">
      <input type="checkbox" name="${name}" value="${item.id}" ${selectedIds.includes(item.id) ? "checked" : ""} />
      <span><strong>${escapeHtml(item.title)}</strong><br><small>${escapeHtml(categoryPath(item.categoryId) || "미분류")}</small></span>
    </label>
  `).join("");
}

function renderToast() {
  if (!app.state.toast) return "";
  return `<div class="toast">${escapeHtml(app.state.toast)}</div>`;
}

function setView(view) {
  const nextView = normalizeActiveView(view);
  app.state.activeView = nextView;
  app.state.selectedCategoryId = "";
  app.state.listFilter = "";
  app.state.editingSourceTagsId = "";
  if (nextView === "manuals") {
    app.state.selectedManualId = firstByTax(app.data.manuals, app.state.currentTaxItemId)?.id || "";
  }
  persistUi();
  render();
}

function normalizeActiveView(view) {
  return ["legal", "favorites", "theoryFiles", "manuals", "aiSearch", "backup"].includes(view) ? view : "legal";
}

function setCurrentTaxItem(id) {
  app.state.currentTaxItemId = id;
  app.state.selectedCategoryId = "";
  app.state.listFilter = "";
  app.state.editingSourceTagsId = "";
  app.state.selectedFlowId = firstByTax(app.data.flows, id)?.id || "";
  app.state.selectedNoteId = firstByTax(app.data.notes, id)?.id || "";
  app.state.selectedManualId = firstByTax(app.data.manuals, id)?.id || "";
  app.state.selectedSourceId = firstByTax(app.data.sourceDocuments, id)?.id || "";
  render();
}

function setManualScope(taxItemId, categoryId = "") {
  if (!taxItemId) return;
  app.state.currentTaxItemId = taxItemId;
  app.state.selectedCategoryId = categoryId;
  app.state.activeView = "manuals";
  app.state.listFilter = "";
  app.state.editingSourceTagsId = "";
  app.state.selectedFlowId = firstByTax(app.data.flows, taxItemId)?.id || "";
  app.state.selectedNoteId = firstByTax(app.data.notes, taxItemId)?.id || "";
  app.state.selectedSourceId = firstByTax(app.data.sourceDocuments, taxItemId)?.id || "";
  app.state.selectedManualId = firstManualByScope(taxItemId, categoryId)?.id || "";
  render();
}

function selectItem(kind, id) {
  if (kind === "source") {
    app.state.selectedSourceId = id;
    app.state.activeView = "legal";
  }
  if (kind === "note") {
    app.state.selectedNoteId = id;
    app.state.activeView = "notes";
  }
  if (kind === "manual") {
    app.state.selectedManualId = id;
    app.state.activeView = "manuals";
  }
  if (kind === "flow") {
    app.state.selectedFlowId = id;
    app.state.activeView = "flows";
  }
  addRecent(kind, id);
  render();
}

function openModal(type, id = "", parentId = "") {
  app.state.modal = { type, id, parentId };
  render();
}

function closeModal() {
  app.state.modal = null;
  render();
}

function toggleCategoryCollapse(id) {
  const list = app.data.ui.collapsedCategoryIds;
  if (list.includes(id)) {
    app.data.ui.collapsedCategoryIds = list.filter(item => item !== id);
  } else {
    list.push(id);
  }
  saveData();
  render();
}

function moveCategory(id, direction) {
  const item = app.data.categories.find(category => category.id === id);
  if (!item) return;
  const siblings = app.data.categories
    .filter(category => category.taxItemId === item.taxItemId && (category.parentId || "") === (item.parentId || ""))
    .sort(sortOrder);
  const index = siblings.findIndex(category => category.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= siblings.length) return;
  const other = siblings[targetIndex];
  const currentOrder = item.sortOrder;
  item.sortOrder = other.sortOrder;
  other.sortOrder = currentOrder;
  touch(item);
  touch(other);
  saveData();
  render();
}

function reorderCategoryByDrop(draggedId, targetId) {
  if (!draggedId || !targetId || draggedId === targetId) return;
  const dragged = app.data.categories.find(category => category.id === draggedId);
  const target = app.data.categories.find(category => category.id === targetId);
  if (!dragged || !target) return;
  if (dragged.taxItemId !== target.taxItemId || (dragged.parentId || "") !== (target.parentId || "")) {
    showToast("같은 상위 카테고리 안에서만 드래그 정렬할 수 있습니다.");
    return;
  }
  const siblings = app.data.categories
    .filter(category => category.taxItemId === dragged.taxItemId && (category.parentId || "") === (dragged.parentId || ""))
    .sort(sortOrder);
  const from = siblings.findIndex(category => category.id === draggedId);
  const to = siblings.findIndex(category => category.id === targetId);
  siblings.splice(to, 0, siblings.splice(from, 1)[0]);
  siblings.forEach((category, index) => {
    category.sortOrder = index + 1;
    touch(category);
  });
  saveData();
  render();
}

function saveCategory(values) {
  const name = values.name.trim();
  if (!name) return;
  const taxItemId = values.taxItemId || app.state.currentTaxItemId;
  const parentId = values.parentId || "";
  const duplicate = app.data.categories.find(category =>
    category.id !== values.id &&
    category.taxItemId === taxItemId &&
    (category.parentId || "") === parentId &&
    category.name.trim() === name
  );
  if (duplicate) {
    showToast("같은 상위 카테고리 아래에 같은 이름이 이미 있습니다.");
    return;
  }
  if (parentId && categoryDepth(parentId) >= MAX_CATEGORY_DEPTH) {
    showToast("카테고리는 최대 3단계까지 만들 수 있습니다.");
    return;
  }

  if (values.id) {
    const category = app.data.categories.find(item => item.id === values.id);
    Object.assign(category, {
      name,
      parentId,
      status: values.status,
      description: values.description
    });
    touch(category);
    app.state.selectedCategoryId = category.id;
  } else {
    const category = {
      id: uid("cat"),
      taxItemId,
      parentId,
      name,
      description: values.description || "",
      status: values.status || "active",
      sortOrder: nextSortOrder(app.data.categories.filter(item => item.taxItemId === taxItemId && (item.parentId || "") === parentId)),
      createdAt: now(),
      updatedAt: now()
    };
    app.data.categories.push(category);
    app.state.selectedCategoryId = category.id;
  }
  saveData();
  closeModal();
  showToast("카테고리를 저장했습니다.");
}

function deleteCategory(id) {
  const category = app.data.categories.find(item => item.id === id);
  if (!category) return;
  const counts = categoryCounts(id, true);
  const childIds = getDescendantCategoryIds(id);
  const total = counts.total;
  const confirmed = window.confirm(
    `${category.name} 카테고리를 삭제할까요?\n연결 항목 ${total}개와 하위 카테고리 ${childIds.length}개는 미분류로 이동됩니다.`
  );
  if (!confirmed) return;
  const affectedIds = [id, ...childIds];
  for (const collection of mutableItemCollections()) {
    collection.forEach(item => {
      if (affectedIds.includes(item.categoryId)) {
        item.categoryId = "";
        touch(item);
      }
    });
  }
  app.data.categories = app.data.categories.filter(item => !affectedIds.includes(item.id));
  app.state.selectedCategoryId = "";
  saveData();
  render();
  showToast("카테고리를 삭제하고 연결 항목을 미분류로 이동했습니다.");
}

function saveSourceDocument(values) {
  const payload = {
    taxItemId: values.taxItemId || app.state.currentTaxItemId,
    categoryId: values.categoryId || "",
    type: values.type,
    title: values.title.trim(),
    sourceName: values.sourceName.trim(),
    officialUrl: values.officialUrl.trim(),
    sourceDate: values.sourceDate.trim(),
    documentNumber: values.documentNumber.trim(),
    summary: values.summary.trim(),
    tags: parseTags(values.tags)
  };
  if (!payload.title) return;
  if (values.id) {
    const item = app.data.sourceDocuments.find(source => source.id === values.id);
    Object.assign(item, payload);
    touch(item);
    app.state.selectedSourceId = item.id;
  } else {
    const item = {
      id: uid("src"),
      ...payload,
      favorite: false,
      createdAt: now(),
      updatedAt: now()
    };
    app.data.sourceDocuments.push(item);
    app.state.selectedSourceId = item.id;
  }
  saveData();
  closeModal();
  showToast("원문 메타데이터를 저장했습니다.");
}

function saveSourceTags(values) {
  const source = app.data.sourceDocuments.find(item => item.id === values.id);
  if (!source) return;
  source.tags = parseTags(values.tags);
  touch(source);
  app.state.editingSourceTagsId = "";
  saveData();
  render();
  showToast("태그를 저장했습니다.");
}

function saveNote(values) {
  const payload = {
    taxItemId: values.taxItemId || app.state.currentTaxItemId,
    categoryId: values.categoryId || "",
    title: values.title.trim(),
    status: values.status,
    judgmentCriteria: values.judgmentCriteria.trim(),
    body: values.body.trim(),
    tags: parseTags(values.tags),
    linkedSourceIds: asArray(values.linkedSourceIds)
  };
  if (!payload.title) return;
  if (values.id) {
    const item = app.data.notes.find(note => note.id === values.id);
    Object.assign(item, payload);
    touch(item);
    app.state.selectedNoteId = item.id;
  } else {
    const item = {
      id: uid("note"),
      ...payload,
      favorite: false,
      createdAt: now(),
      updatedAt: now()
    };
    app.data.notes.push(item);
    app.state.selectedNoteId = item.id;
  }
  saveData();
  closeModal();
  showToast("노트를 저장했습니다.");
}

function saveManual(values) {
  const existing = values.id ? app.data.manuals.find(manual => manual.id === values.id) : null;
  if (values.id && !existing) return;
  const payload = {
    taxItemId: values.taxItemId || app.state.currentTaxItemId,
    categoryId: values.categoryId || "",
    noteId: existing?.noteId || "",
    title: values.title.trim(),
    status: existing?.status || "draft",
    riskLevel: existing?.riskLevel || "normal",
    systemName: existing?.systemName || "차세대 지방세입정보시스템",
    theory: (values.theory || "").trim(),
    relatedLaw: (values.relatedLaw || "").trim(),
    relatedPrecedent: (values.relatedPrecedent || "").trim(),
    systemWork: (values.systemWork || "").trim(),
    menuPath: existing?.menuPath || [],
    inputFields: existing?.inputFields || [],
    steps: existing?.steps || [],
    checklist: existing?.checklist || [],
    cautions: existing?.cautions || "",
    tags: existing?.tags || []
  };
  if (!payload.title) return;
  if (values.id) {
    const item = existing;
    addRevision("manual", item, values.changeReason || "매뉴얼 수정");
    Object.assign(item, payload);
    item.versionNo = (item.versionNo || 1) + 1;
    touch(item);
    app.state.selectedManualId = item.id;
  } else {
    const item = {
      id: uid("manual"),
      ...payload,
      favorite: false,
      versionNo: 1,
      createdAt: now(),
      updatedAt: now()
    };
    app.data.manuals.push(item);
    app.state.selectedManualId = item.id;
  }
  saveData();
  closeModal();
  showToast("전산 매뉴얼을 저장했습니다.");
}

function saveFlow(values) {
  const payload = {
    taxItemId: values.taxItemId || app.state.currentTaxItemId,
    categoryId: values.categoryId || "",
    title: values.title.trim(),
    issueSummary: values.issueSummary.trim(),
    status: values.status,
    riskLevel: values.riskLevel || "normal",
    sourceIds: asArray(values.sourceIds),
    noteIds: asArray(values.noteIds),
    manualIds: asArray(values.manualIds),
    tags: parseTags(values.tags)
  };
  if (!payload.title) return;
  if (values.id) {
    const item = app.data.flows.find(flow => flow.id === values.id);
    Object.assign(item, payload);
    touch(item);
    app.state.selectedFlowId = item.id;
  } else {
    const item = {
      id: uid("flow"),
      ...payload,
      favorite: false,
      createdAt: now(),
      updatedAt: now()
    };
    app.data.flows.push(item);
    app.state.selectedFlowId = item.id;
  }
  saveData();
  closeModal();
  showToast("Flow를 저장했습니다.");
}

async function saveTheoryFile(values) {
  const file = values.file;
  if (!(file instanceof File) || !file.name || file.size <= 0) {
    showToast("등록할 파일을 선택하세요.");
    return;
  }

  const fileKind = detectTheoryFileKind(file);
  if (!fileKind) {
    showToast("Markdown 또는 TXT 파일만 등록할 수 있습니다.");
    return;
  }

  if (file.size > THEORY_FILE_MAX_BYTES) {
    showToast(`파일 용량은 ${formatBytes(THEORY_FILE_MAX_BYTES)} 이하로 등록하세요.`);
    return;
  }

  try {
    const contentText = await file.text();
    const dataUrl = await readFileAsDataUrl(file);
    const item = {
      id: uid("file"),
      taxItemId: values.taxItemId || app.state.currentTaxItemId,
      categoryId: values.categoryId || "",
      title: (values.title || "").trim() || stripFileExtension(file.name),
      fileName: file.name,
      fileKind,
      mimeType: file.type || theoryFileMimeType(fileKind),
      fileSize: file.size,
      dataUrl,
      contentText,
      memo: (values.memo || "").trim(),
      tags: parseTags(values.tags),
      createdAt: now(),
      updatedAt: now()
    };
    app.data.theoryFiles.push(item);
    saveData();
    render();
    showToast("파일을 등록했습니다.");
  } catch (error) {
    console.warn("Theory file save failed:", error);
    showToast("파일을 읽는 중 오류가 발생했습니다.");
  }
}

function saveTaxItem(values) {
  const payload = {
    code: values.code.trim(),
    name: values.name.trim(),
    status: values.status || "active",
    description: values.description || ""
  };
  if (!payload.code || !payload.name) return;
  const duplicate = app.data.taxItems.find(item => item.id !== values.id && item.code === payload.code);
  if (duplicate) {
    showToast("같은 세목 코드가 이미 있습니다.");
    return;
  }
  if (values.id) {
    const item = app.data.taxItems.find(tax => tax.id === values.id);
    Object.assign(item, payload);
    touch(item);
  } else {
    const item = {
      id: uid("tax"),
      ...payload,
      sortOrder: nextSortOrder(app.data.taxItems),
      createdAt: now(),
      updatedAt: now()
    };
    app.data.taxItems.push(item);
    app.state.currentTaxItemId = item.id;
  }
  saveData();
  closeModal();
  showToast("세목을 저장했습니다.");
}

async function runLegalSearch(values) {
  app.state.legalQuery = values.query.trim();
  app.state.legalType = values.type || "전체";
  app.state.legalResults = [];
  app.state.legalMessage = "";
  app.state.legalApiAttempted = false;
  if (app.state.legalQuery) addSearchHistory(app.state.legalQuery);
  render();

  if (!app.state.legalQuery || !canUseServerStorage()) {
    return;
  }

  app.state.legalLoading = true;
  render();
  try {
    const url = `${SERVER_LEGAL_SEARCH_ENDPOINT}?q=${encodeURIComponent(app.state.legalQuery)}&type=${encodeURIComponent(app.state.legalType)}&max=20`;
    const response = await fetch(url, { headers: { "Accept": "application/json" }, cache: "no-store" });
    if (!response.ok) throw new Error(`공식 검색 요청 실패: ${response.status}`);
    const payload = await response.json();
    app.state.legalApiAttempted = Boolean(payload.configured);
    app.state.legalResults = Array.isArray(payload.results) ? payload.results : [];
    app.state.legalMessage = legalSearchMessage(payload.message || "", app.state.legalResults.length, app.state.legalQuery);
  } catch (error) {
    console.warn("Tax-Flow legal search skipped:", error);
    app.state.legalApiAttempted = true;
    app.state.legalMessage = "공식 API 검색에 실패했습니다. 왼쪽 공식 사이트 검색 바로가기를 이용하세요.";
  } finally {
    app.state.legalLoading = false;
    render();
  }
}

function legalSearchMessage(apiMessage, resultCount, query) {
  if (resultCount > 0) return apiMessage || "국가법령정보 검색 결과입니다.";
  if (apiMessage && /실패|오류|검증|거부|미설정/.test(apiMessage)) return apiMessage;

  const normalized = normalize(query);
  const hints = [];
  if (normalized.includes("사업소분")) {
    hints.push("'사업소분'은 API 검색에서 잘 잡히지 않을 수 있어 '재산분', '사업소 연면적', '사업소용 건축물 연면적'으로도 검색해 보세요.");
  }
  if (query.trim().includes(" ")) {
    hints.push("여러 단어를 한 번에 넣으면 0건이 나올 수 있으니 핵심어를 줄여 검색해 보세요.");
  }

  return [
    `국가법령정보 API가 "${query.trim()}" 검색어로는 0건을 반환했습니다.`,
    ...hints
  ].join(" ");
}

function runTopSearch() {
  if (app.state.searchQuery.trim()) addSearchHistory(app.state.searchQuery.trim());
  app.state.activeView = "search";
  render();
}

function setQaDraft(prompt) {
  app.data.qa.draft = prompt;
  saveData();
  render();
}

function clearQaHistory() {
  app.data.qa.messages = [];
  app.data.qa.draft = "";
  saveData();
  render();
  showToast("질의응답 기록을 비웠습니다.");
}

function submitQaQuestion(values) {
  const question = (values.question || app.data.qa.draft || "").trim();
  if (!question) return;
  const internalResults = runInternalSearch(question, "current").slice(0, 12);
  const officialResults = app.data.qa.includePublic ? buildOfficialResults(question, "전체").slice(0, 4) : [];
  const answerSections = buildQaAnswerSections(question, internalResults, officialResults);
  const references = [
    ...internalResults.slice(0, 8).map(item => ({ kind: item.kind, id: item.id })),
    ...officialResults.map(item => ({ kind: "official", item }))
  ];
  const message = {
    id: uid("qa"),
    question,
    answerSections,
    references,
    createdAt: now()
  };
  app.data.qa.messages = [message, ...app.data.qa.messages].slice(0, 3);
  app.data.qa.draft = "";
  addSearchHistory(question);
  saveData();
  render();
}

function buildQaAnswerSections(question, internalResults, officialResults) {
  const grouped = groupBy(internalResults, item => item.kind);
  const sources = grouped.source || [];
  const notes = grouped.note || [];
  const manuals = grouped.manual || [];
  const flows = grouped.flow || [];
  const basisLines = [];
  const judgmentLines = [];
  const manualLines = [];

  if (sources.length) {
    sources.slice(0, 4).forEach(source => {
      basisLines.push(`- ${source.title}: ${trimText(source.summary || source.sourceName || "원문 메타데이터 확인 필요", 120)}`);
    });
  }
  if (officialResults.length) {
    officialResults.slice(0, 3).forEach(result => {
      basisLines.push(`- 공식 검색 후보: ${result.title} (${result.sourceName})`);
    });
  }
  if (!basisLines.length) {
    basisLines.push("- 현재 세목에 저장된 원문 근거가 바로 매칭되지 않았습니다. 원문 검색 화면에서 공식 검색 후보를 먼저 저장해 보세요.");
  }

  if (notes.length) {
    notes.slice(0, 4).forEach(note => {
      judgmentLines.push(`- ${note.title}: ${trimText(note.judgmentCriteria || note.body, 150)}`);
    });
  }
  if (flows.length) {
    flows.slice(0, 3).forEach(flow => {
      judgmentLines.push(`- 연결 Flow ${flow.title}: ${trimText(flow.issueSummary, 140)}`);
    });
  }
  if (!judgmentLines.length) {
    judgmentLines.push("- 저장된 판단 노트가 부족합니다. 질문의 사실관계, 날짜, 세목, 전산 메뉴명을 더 구체화하거나 새 노트를 추가하세요.");
  }

  if (manuals.length) {
    manuals.slice(0, 4).forEach(manual => {
      const menu = (manual.menuPath || []).join(" > ") || "메뉴 경로 미등록";
      const checks = (manual.checklist || []).slice(0, 3).map(item => item.text).join(", ");
      manualLines.push(`- ${manual.title}: ${menu}${checks ? ` / 체크: ${checks}` : ""}`);
    });
  } else {
    manualLines.push("- 연결된 전산 매뉴얼이 바로 검색되지 않았습니다. 노트에서 매뉴얼 초안을 만들거나 대량등록의 전산적용 필드를 활용하세요.");
  }

  return [
    {
      title: "근거 자료",
      tone: "basis",
      body: basisLines.join("\n")
    },
    {
      title: "이론 판단",
      tone: "judgment",
      body: judgmentLines.join("\n")
    },
    {
      title: "전산 처리",
      tone: "manual",
      body: manualLines.join("\n")
    },
    {
      title: "주의",
      tone: "caution",
      body: `질문: ${question}\n위 답변은 Tax-Flow에 저장된 자료와 공식 검색 후보를 정리한 초안입니다. 최종 과세 판단 전에는 공식 원문, 사실관계, 최신 개정 여부를 반드시 확인하세요.`
    }
  ];
}

function resolveQaReference(ref) {
  if (ref.kind === "official") return { ...ref.item, kind: "official" };
  const item = findByKind(ref.kind, ref.id);
  return item ? { ...item, kind: ref.kind } : null;
}

async function handleBulkFileChange(input) {
  const file = input.files?.[0];
  app.state.bulkPreview = null;
  app.state.bulkRawText = "";
  app.state.bulkResult = null;
  app.state.bulkError = "";
  app.state.bulkFileName = file?.name || "";
  if (!file) {
    render();
    return;
  }
  try {
    const text = await file.text();
    app.state.bulkRawText = text;
    app.state.bulkPreview = buildBulkPreview({ text, fileName: file.name });
  } catch (error) {
    app.state.bulkError = error.message;
  }
  render();
}

function clearBulkPreview() {
  app.state.bulkPreview = null;
  app.state.bulkRawText = "";
  app.state.bulkFileName = "";
  app.state.bulkError = "";
  app.state.bulkResult = null;
  render();
}

function commitBulkPreview() {
  const preview = app.state.bulkPreview;
  if (!preview) return;
  const errorLines = new Set(preview.errors.map(issue => issue.line));
  const validRows = preview.rows.filter(row => !errorLines.has(row.line));
  if (!validRows.length) {
    showToast("등록할 유효 항목이 없습니다.");
    return;
  }
  const result = {
    rows: validRows.length,
    sources: 0,
    notes: 0,
    manuals: 0,
    flows: 0
  };
  validRows.forEach(row => importBulkRow(row, result));
  saveData();
  app.state.bulkResult = `등록 완료: ${result.rows}건 처리, 원문 ${result.sources}개, 노트 ${result.notes}개, 매뉴얼 ${result.manuals}개, Flow ${result.flows}개 생성`;
  app.state.bulkPreview = null;
  app.state.bulkRawText = "";
  app.state.bulkFileName = "";
  render();
}

function importBulkRow(row, result) {
  const taxItemId = inferTaxItemIdFromBulkRow(row);
  const categoryId = inferCategoryIdFromBulkRow(row, taxItemId);
  const title = row["제목"].trim();
  const content = row["내용"].trim();
  const practical = row["전산적용"].trim();
  const tags = [...new Set([...parseBulkTags(row["태그"]), bulkCategoryLabels[row.category] || row["분류"]].filter(Boolean))];
  const createdAt = now();
  const sourceIds = [];
  let noteId = "";
  let manualId = "";

  if (bulkSourceTypeMap[row.category]) {
    const source = {
      id: uid("src"),
      taxItemId,
      categoryId,
      type: bulkSourceTypeMap[row.category],
      title,
      sourceName: row["출처"],
      officialUrl: "",
      sourceDate: row["날짜"],
      documentNumber: "",
      summary: content,
      tags,
      favorite: false,
      createdAt,
      updatedAt: createdAt
    };
    app.data.sourceDocuments.push(source);
    sourceIds.push(source.id);
    result.sources += 1;
  }

  const note = {
    id: uid("note"),
    taxItemId,
    categoryId,
    title,
    status: "draft",
    judgmentCriteria: firstMeaningfulLine(content),
    body: content,
    tags,
    linkedSourceIds: sourceIds,
    favorite: false,
    createdAt,
    updatedAt: createdAt
  };
  app.data.notes.push(note);
  noteId = note.id;
  result.notes += 1;

  if (practical) {
    const manual = {
      id: uid("manual"),
      taxItemId,
      categoryId,
      noteId,
      title: `${title} 전산 적용`,
      status: "draft",
      riskLevel: "normal",
      systemName: "차세대 지방세입정보시스템",
      menuPath: inferMenuPathFromText(practical),
      inputFields: [],
      steps: textToSteps(practical),
      checklist: textToChecklist(practical),
      cautions: "대량등록으로 생성된 초안입니다. 실제 메뉴명과 입력값을 확인해 보완하세요.",
      tags: [...new Set([...tags, "대량등록"])],
      favorite: false,
      versionNo: 1,
      createdAt,
      updatedAt: createdAt
    };
    app.data.manuals.push(manual);
    manualId = manual.id;
    result.manuals += 1;
  }

  if (sourceIds.length || manualId) {
    const flow = {
      id: uid("flow"),
      taxItemId,
      categoryId,
      title,
      issueSummary: content,
      status: "draft",
      riskLevel: "normal",
      sourceIds,
      noteIds: [noteId],
      manualIds: manualId ? [manualId] : [],
      tags: [...new Set([...tags, "대량등록"])],
      favorite: false,
      createdAt,
      updatedAt: createdAt
    };
    app.data.flows.push(flow);
    result.flows += 1;
  }

  app.state.selectedNoteId = noteId;
  if (sourceIds[0]) app.state.selectedSourceId = sourceIds[0];
  if (manualId) app.state.selectedManualId = manualId;
}

function buildBulkPreview({ text, fileName }) {
  const kind = detectBulkFileKind(fileName);
  return kind === "csv" ? buildCsvPreview(text) : buildMarkdownPreview(text);
}

function detectBulkFileKind(fileName = "") {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith(".csv")) return "csv";
  if (normalized.endsWith(".md") || normalized.endsWith(".markdown")) return "markdown";
  throw new Error("대량등록은 CSV(.csv) 또는 Markdown(.md) 파일만 지원합니다.");
}

function buildCsvPreview(text) {
  const rows = parseCsvText(String(text || "").replace(/^\ufeff/, ""));
  if (!rows.length) throw new Error("CSV 내용이 비어 있습니다.");
  const headers = rows[0].map(header => header.trim());
  const missing = bulkRequiredHeaders.filter(header => !headers.includes(header));
  if (missing.length) throw new Error(`필수 헤더가 없습니다: ${missing.join(", ")}`);
  const bodyRows = rows.slice(1).filter(columns => columns.some(value => value.trim() !== ""));
  const previewRows = bodyRows.map((columns, index) => {
    const raw = Object.fromEntries(headers.map((header, headerIndex) => [header, (columns[headerIndex] || "").trim()]));
    return buildBulkPreviewRow(raw, index);
  });
  return buildBulkPreviewResult("csv", "CSV", previewRows);
}

function buildMarkdownPreview(text) {
  const normalized = String(text || "").replace(/^\ufeff/, "").trim();
  if (!normalized) throw new Error("Markdown 내용이 비어 있습니다.");
  const blocks = normalized.split(/(?:^|\r?\n)---\s*(?=\r?\n|$)/).map(item => item.trim()).filter(Boolean);
  const previewRows = blocks.map((block, index) => buildBulkPreviewRow(extractMarkdownBulkFields(block), index));
  return buildBulkPreviewResult("markdown", "Markdown", previewRows);
}

function buildBulkPreviewRow(raw, index) {
  const category = bulkCategoryMap[raw["분류"]] || "";
  return {
    line: index + 1,
    ...Object.fromEntries(bulkRequiredHeaders.map(header => [header, raw[header] || ""])),
    category,
    tags: parseBulkTags(raw["태그"])
  };
}

function buildBulkPreviewResult(kind, formatLabel, rows) {
  const errors = rows
    .filter(row => !row.category || !row["제목"] || !row["출처"] || !row["내용"] || !row["날짜"])
    .map(row => ({
      line: row.line,
      message: !row.category ? "분류 값이 올바르지 않습니다." : "제목, 출처, 내용, 날짜는 비워둘 수 없습니다."
    }));
  return {
    kind,
    formatLabel,
    rows,
    errors,
    categoryStats: rows.reduce((acc, row) => {
      if (row.category) acc[row.category] = (acc[row.category] || 0) + 1;
      return acc;
    }, {})
  };
}

function parseCsvText(text) {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"') {
      if (insideQuotes && next === '"') {
        value += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }
    if (char === "," && !insideQuotes) {
      row.push(value);
      value = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      value = "";
      if (row.some(item => item !== "")) rows.push(row);
      row = [];
      continue;
    }
    value += char;
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value);
    if (row.some(item => item !== "")) rows.push(row);
  }
  return rows;
}

function extractMarkdownBulkFields(block) {
  const raw = Object.fromEntries(bulkRequiredHeaders.map(header => [header, ""]));
  const bodyLines = [];
  const sectionLines = { "내용": [], "전산적용": [] };
  let currentSection = "";
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, "");
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentSection) sectionLines[currentSection].push("");
      else if (bodyLines.length && bodyLines[bodyLines.length - 1] !== "") bodyLines.push("");
      continue;
    }
    const normalized = trimmed.replace(/^\s*[-*]\s+/, "").trim();
    if (normalized.startsWith("## ")) {
      const section = normalizeMarkdownSectionName(normalized.slice(3).trim());
      if (section) {
        currentSection = section;
        continue;
      }
    }
    if (currentSection) {
      sectionLines[currentSection].push(line);
      continue;
    }
    if (normalized.startsWith("# ") && !raw["제목"]) {
      raw["제목"] = normalized.slice(2).trim();
      continue;
    }
    const separatorIndex = normalized.indexOf(":");
    if (separatorIndex >= 0) {
      const key = normalized.slice(0, separatorIndex).trim();
      const value = normalized.slice(separatorIndex + 1).trim();
      const section = normalizeMarkdownSectionName(key);
      if (section) {
        currentSection = section;
        if (value) sectionLines[section].push(value);
        continue;
      }
      if (bulkRequiredHeaders.includes(key)) {
        raw[key] = value;
        continue;
      }
    }
    bodyLines.push(line);
  }
  raw["내용"] = sectionLines["내용"].join("\n").trim() || bodyLines.join("\n").trim();
  raw["전산적용"] = sectionLines["전산적용"].join("\n").trim();
  return raw;
}

function normalizeMarkdownSectionName(value) {
  const normalized = value.replace(/\s+/g, "");
  if (normalized.startsWith("내용")) return "내용";
  if (normalized.startsWith("전산적용")) return "전산적용";
  return "";
}

function parseBulkTags(value) {
  return String(value || "")
    .split(/[;,#\n]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .filter((item, index, all) => all.indexOf(item) === index);
}

function inferTaxItemIdFromBulkRow(row) {
  const text = `${row["제목"]} ${row["내용"]} ${row["전산적용"]} ${row["태그"]}`;
  if (text.includes("재산세") || text.includes("토지") || text.includes("별도합산") || text.includes("종합합산")) {
    return app.data.taxItems.find(item => item.code === "property_tax")?.id || app.state.currentTaxItemId;
  }
  if (text.includes("취득세") || text.includes("취득") || text.includes("중과")) {
    return app.data.taxItems.find(item => item.code === "acquisition_tax")?.id || app.state.currentTaxItemId;
  }
  return app.state.currentTaxItemId;
}

function inferCategoryIdFromBulkRow(row, taxItemId) {
  if (app.state.selectedCategoryId && app.data.categories.some(category => category.id === app.state.selectedCategoryId && category.taxItemId === taxItemId)) {
    return app.state.selectedCategoryId;
  }
  const text = normalize(`${row["제목"]} ${row["내용"]} ${row["전산적용"]} ${row["태그"]}`);
  const candidates = app.data.categories.filter(category => category.taxItemId === taxItemId && category.status !== "archived");
  const matched = candidates
    .map(category => ({ category, score: categoryKeywordScore(category, text) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)[0];
  return matched?.category.id || "";
}

function categoryKeywordScore(category, text) {
  const terms = [category.name, ...categoryPath(category.id).split(" > ")].map(normalize).filter(Boolean);
  return terms.reduce((score, term) => score + (text.includes(term) ? term.length : 0), 0);
}

function firstMeaningfulLine(text) {
  return String(text || "").split(/\r?\n/).map(line => line.trim()).find(Boolean) || "";
}

function inferMenuPathFromText(text) {
  const line = String(text || "").split(/\r?\n/).find(item => item.includes(">") || item.includes("/"));
  return line ? parseMenuPath(line) : [];
}

function textToSteps(text) {
  const lines = String(text || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return (lines.length ? lines : [text]).map((line, index) => ({
    id: uid("step"),
    title: `대량등록 단계 ${index + 1}`,
    body: line
  }));
}

function textToChecklist(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map(line => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8)
    .map(line => ({ id: uid("check"), text: line, done: false }));
}

function saveOfficialResult(resultId) {
  const result = currentOfficialResults().find(item => item.id === resultId);
  if (!result) return;
  const exists = app.data.sourceDocuments.find(source => source.officialUrl === result.officialUrl && source.title === result.title);
  if (exists) {
    app.state.selectedSourceId = exists.id;
    showToast("이미 저장된 원문입니다.");
    render();
    return;
  }
  const source = officialResultToSource(result, true);
  app.data.sourceDocuments.push(source);
  app.state.selectedSourceId = source.id;
  saveData();
  render();
  showToast("검색 후보를 원문 북마크로 저장했습니다.");
}

function currentOfficialResults() {
  return app.state.legalResults.length
    ? app.state.legalResults
    : buildOfficialResults(app.state.legalQuery, app.state.legalType);
}

function toggleOfficialFavorite(resultId) {
  const result = currentOfficialResults().find(item => item.id === resultId);
  if (!result) return;

  const existing = findFavoriteForOfficialResult(result);
  if (existing) {
    existing.favorite = !existing.favorite;
    touch(existing);
    app.state.selectedSourceId = existing.id;
    saveData();
    render();
    showToast(existing.favorite ? "즐겨찾기에 다시 추가했습니다." : "즐겨찾기에서 해제했습니다.");
    return;
  }

  const source = officialResultToSource(result, true);
  app.data.sourceDocuments.push(source);
  app.state.selectedSourceId = source.id;
  saveData();
  render();
  showToast("즐겨찾기에 추가했습니다.");
}

function findFavoriteForOfficialResult(result) {
  return app.data.sourceDocuments.find(source =>
    source.taxItemId === app.state.currentTaxItemId &&
    (
      (result.officialUrl && source.officialUrl === result.officialUrl) ||
      (source.title === result.title && source.type === result.type)
    )
  );
}

function officialResultToSource(result, favorite = false) {
  return {
    id: uid("src"),
    taxItemId: app.state.currentTaxItemId,
    categoryId: "",
    type: result.type || "법령",
    title: result.title || "공식 원문",
    sourceName: result.sourceName || "공식 원문",
    officialUrl: result.officialUrl || "",
    sourceDate: result.sourceDate || "",
    documentNumber: result.documentNumber || "",
    summary: result.summary || "",
    tags: parseTags(app.state.legalQuery),
    favorite,
    createdAt: now(),
    updatedAt: now()
  };
}

function toggleFavorite(kind, id) {
  const item = findByKind(kind, id);
  if (!item) return;
  item.favorite = !item.favorite;
  if (!item.favorite && kind === "source" && app.state.editingSourceTagsId === id) {
    app.state.editingSourceTagsId = "";
  }
  touch(item);
  saveData();
  render();
}

function duplicateNote(id) {
  const note = app.data.notes.find(item => item.id === id);
  if (!note) return;
  const copy = {
    ...deepClone(note),
    id: uid("note"),
    title: `${note.title} 복사본`,
    status: "draft",
    favorite: false,
    createdAt: now(),
    updatedAt: now()
  };
  app.data.notes.push(copy);
  app.state.selectedNoteId = copy.id;
  saveData();
  render();
  showToast("노트를 복제했습니다.");
}

function createManualFromNote(id) {
  const note = app.data.notes.find(item => item.id === id);
  if (!note) return;
  const linkedSources = (note.linkedSourceIds || [])
    .map(sourceId => app.data.sourceDocuments.find(source => source.id === sourceId))
    .filter(Boolean);
  const manual = {
    id: uid("manual"),
    taxItemId: note.taxItemId,
    categoryId: note.categoryId,
    noteId: note.id,
    title: `${note.title} 전산 적용 매뉴얼`,
    status: "draft",
    riskLevel: "normal",
    systemName: "차세대 지방세입정보시스템",
    theory: [note.judgmentCriteria, note.body].filter(Boolean).join("\n\n"),
    relatedLaw: linkedSources
      .filter(source => !isPrecedentSource(source))
      .map(formatManualSource)
      .join("\n\n"),
    relatedPrecedent: linkedSources
      .filter(isPrecedentSource)
      .map(formatManualSource)
      .join("\n\n"),
    systemWork: "전산 시스템 메뉴, 입력값, 확인 순서를 보완하세요.",
    menuPath: [],
    inputFields: [],
    steps: [
      { id: uid("step"), title: "쟁점 확인", body: note.judgmentCriteria || "노트의 판단 기준을 확인합니다." },
      { id: uid("step"), title: "전산 입력", body: "메뉴 경로와 입력값을 보완하세요." }
    ],
    checklist: [
      { id: uid("check"), text: "연결 원문 최신성 확인", done: false },
      { id: uid("check"), text: "증빙자료 확인", done: false },
      { id: uid("check"), text: "입력 후 세액 검증", done: false }
    ],
    cautions: "최종 과세 판단과 전산 입력 책임은 담당 공무원에게 있습니다.",
    tags: [...new Set([...(note.tags || []), "매뉴얼화"])],
    favorite: false,
    versionNo: 1,
    createdAt: now(),
    updatedAt: now()
  };
  app.data.manuals.push(manual);
  app.state.selectedManualId = manual.id;
  app.state.activeView = "manuals";
  saveData();
  render();
  showToast("노트 기반 매뉴얼 초안을 만들었습니다.");
}

function deleteItem(kind, id) {
  const item = findByKind(kind, id);
  if (!item) return;
  const confirmed = window.confirm(`${kindLabel(kind)} "${item.title}" 항목을 삭제할까요?`);
  if (!confirmed) return;
  if (kind === "source") {
    app.data.sourceDocuments = app.data.sourceDocuments.filter(source => source.id !== id);
    app.data.notes.forEach(note => note.linkedSourceIds = (note.linkedSourceIds || []).filter(sourceId => sourceId !== id));
    app.data.flows.forEach(flow => flow.sourceIds = (flow.sourceIds || []).filter(sourceId => sourceId !== id));
    app.state.selectedSourceId = firstByTax(app.data.sourceDocuments, app.state.currentTaxItemId)?.id || "";
  }
  if (kind === "note") {
    app.data.notes = app.data.notes.filter(note => note.id !== id);
    app.data.manuals.forEach(manual => {
      if (manual.noteId === id) manual.noteId = "";
    });
    app.data.flows.forEach(flow => flow.noteIds = (flow.noteIds || []).filter(noteId => noteId !== id));
    app.state.selectedNoteId = firstByTax(app.data.notes, app.state.currentTaxItemId)?.id || "";
  }
  if (kind === "manual") {
    app.data.manuals = app.data.manuals.filter(manual => manual.id !== id);
    app.data.flows.forEach(flow => flow.manualIds = (flow.manualIds || []).filter(manualId => manualId !== id));
    app.state.selectedManualId = firstByTax(app.data.manuals, app.state.currentTaxItemId)?.id || "";
  }
  if (kind === "flow") {
    app.data.flows = app.data.flows.filter(flow => flow.id !== id);
    app.state.selectedFlowId = firstByTax(app.data.flows, app.state.currentTaxItemId)?.id || "";
  }
  if (kind === "theoryFile") {
    app.data.theoryFiles = app.data.theoryFiles.filter(file => file.id !== id);
  }
  app.data.recentItems = app.data.recentItems.filter(itemRef => !(itemRef.type === kind && itemRef.id === id));
  saveData();
  closeModal();
  showToast("항목을 삭제했습니다.");
}

function toggleManualChecklist(manualId, checkId, done) {
  const manual = app.data.manuals.find(item => item.id === manualId);
  if (!manual) return;
  const check = manual.checklist.find(item => item.id === checkId);
  if (!check) return;
  check.done = done;
  touch(manual);
  saveData();
}

function copyFlowMarkdown(id) {
  const flow = app.data.flows.find(item => item.id === id);
  if (!flow) return;
  const sources = flow.sourceIds.map(sourceId => app.data.sourceDocuments.find(source => source.id === sourceId)).filter(Boolean);
  const notes = flow.noteIds.map(noteId => app.data.notes.find(note => note.id === noteId)).filter(Boolean);
  const manuals = flow.manualIds.map(manualId => app.data.manuals.find(manual => manual.id === manualId)).filter(Boolean);
  const markdown = [
    `# ${flow.title}`,
    "",
    `- 세목: ${currentTaxItemName(flow.taxItemId)}`,
    `- 카테고리: ${categoryPath(flow.categoryId) || "미분류"}`,
    `- 상태: ${statusLabels[flow.status] || flow.status}`,
    "",
    "## 쟁점 요약",
    flow.issueSummary || "",
    "",
    "## 원문 근거",
    ...sources.map(source => `- [${source.title}](${source.officialUrl || "#"}) (${source.type}, ${source.sourceName || "수동"})`),
    "",
    "## 이론 노트",
    ...notes.map(note => `### ${note.title}\n${note.judgmentCriteria || note.body || ""}`),
    "",
    "## 전산 매뉴얼",
    ...manuals.map(manual => `### ${manual.title}\n- 메뉴: ${(manual.menuPath || []).join(" > ")}\n- 주의: ${manual.cautions || ""}`)
  ].join("\n");
  if (navigator.clipboard) {
    navigator.clipboard.writeText(markdown).then(() => showToast("Flow Markdown을 클립보드에 복사했습니다."));
  } else {
    showToast("브라우저가 클립보드 복사를 지원하지 않습니다.");
  }
}

function exportData() {
  const backup = createBackupPackage();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tax-flow-portable-backup-${formatBackupTimestamp(backup.exportedAt)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("새 컴퓨터에서 복원할 수 있는 백업 파일을 만들었습니다.");
}

function createBackupPackage() {
  const data = JSON.parse(JSON.stringify(app.data || createDefaultData()));
  data.runtimeSettings = {};
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    product: "Tax-Flow",
    exportedAt: new Date().toISOString(),
    summary: backupSummary(data),
    excluded: ["API keys", "LAW_OC"],
    data
  };
}

async function importData(values) {
  try {
    const raw = await readImportPayload(values);
    const parsed = JSON.parse(raw);
    const data = unwrapBackupData(parsed);
    validateDataShape(data);
    const confirmed = window.confirm("현재 Tax-Flow 데이터가 백업 파일 내용으로 교체됩니다. 복원할까요?");
    if (!confirmed) return;
    app.data = migrateData(data);
    saveData();
    setCurrentTaxItem(activeTaxItems()[0]?.id || "");
    app.state.activeView = "backup";
    render();
    showToast("백업 데이터를 복원했습니다.");
  } catch (error) {
    showToast(`복원 실패: ${error.message}`);
  }
}

async function readImportPayload(values) {
  const file = values.backupFile instanceof File && values.backupFile.size > 0 ? values.backupFile : null;
  if (file) return file.text();
  const raw = String(values.json || "").trim();
  if (!raw) throw new Error("백업 JSON 파일을 선택하거나 JSON 내용을 붙여넣으세요.");
  return raw;
}

function unwrapBackupData(parsed) {
  if (parsed?.format === BACKUP_FORMAT && parsed.data) return parsed.data;
  if (parsed?.product === "Tax-Flow" && parsed.data) return parsed.data;
  return parsed;
}

function backupSummary(data) {
  return {
    taxItems: data?.taxItems?.length || 0,
    categories: data?.categories?.length || 0,
    favorites: data?.sourceDocuments?.filter(source => source.favorite).length || 0,
    sourceDocuments: data?.sourceDocuments?.length || 0,
    manuals: data?.manuals?.length || 0,
    theoryFiles: data?.theoryFiles?.length || 0,
    notes: data?.notes?.length || 0,
    flows: data?.flows?.length || 0
  };
}

function formatBackupTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  const pad = number => String(number).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + `-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function resetData() {
  const confirmed = window.confirm("현재 로컬 데이터를 샘플 데이터로 초기화할까요?");
  if (!confirmed) return;
  app.data = createDefaultData();
  saveData();
  app.state.currentTaxItemId = activeTaxItems()[0]?.id || "";
  app.state.activeView = "dashboard";
  app.state.modal = null;
  render();
  showToast("샘플 데이터로 초기화했습니다.");
}

function showToast(message) {
  app.state.toast = message;
  render();
  window.setTimeout(() => {
    app.state.toast = "";
    render();
  }, 2400);
}

function formValues(form) {
  const data = new FormData(form);
  const values = {};
  for (const [key, value] of data.entries()) {
    if (values[key] !== undefined) {
      values[key] = asArray(values[key]);
      values[key].push(value);
    } else {
      values[key] = value;
    }
  }
  return values;
}

function detectTheoryFileKind(file) {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  if (name.endsWith(".md") || name.endsWith(".markdown") || type === "text/markdown" || type === "text/x-markdown") return "markdown";
  if (name.endsWith(".txt") || type === "text/plain") return "txt";
  return "";
}

function theoryFileMimeType(kind) {
  return {
    markdown: "text/markdown",
    txt: "text/plain"
  }[kind] || "application/octet-stream";
}

function aiProviderStatus(provider) {
  const status = app.state.settingsStatus?.ai?.providers?.[provider] || {};
  return {
    configured: Boolean(status.configured),
    source: status.source || "missing",
    saved: Boolean(status.saved),
    model: normalizeAiModel(provider, status.model)
  };
}

function aiModelChoices(provider) {
  const choices = aiModelOptions[provider] || [];
  if (choices.length) return choices;
  return aiDefaultModels[provider] ? [aiDefaultModels[provider]] : [];
}

function normalizeAiModel(provider, model) {
  const choices = aiModelChoices(provider);
  const requested = String(model || "").trim();
  if (requested && choices.includes(requested)) return requested;
  const fallback = aiDefaultModels[provider] || choices[0] || requested;
  return choices.includes(fallback) ? fallback : (choices[0] || fallback || "");
}

function renderAiModelOptions(provider, selectedModel) {
  const selected = normalizeAiModel(provider, selectedModel);
  return aiModelChoices(provider)
    .map(model => `<option value="${escapeAttr(model)}" ${model === selected ? "selected" : ""}>${escapeHtml(model)}</option>`)
    .join("");
}

function capitalizeProviderId(provider) {
  return String(provider || "").charAt(0).toUpperCase() + String(provider || "").slice(1);
}

function stripFileExtension(fileName) {
  return String(fileName || "").replace(/\.[^.]+$/, "") || "이론 자료";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

function categoryOptions(taxItemId, excludeId = "", selectedId = "") {
  const categories = app.data.categories
    .filter(category => category.taxItemId === taxItemId && category.id !== excludeId && !getDescendantCategoryIds(excludeId).includes(category.id))
    .sort(sortOrder);
  const rows = [];
  const addRows = (parentId, depth) => {
    categories
      .filter(category => (category.parentId || "") === (parentId || ""))
      .sort(sortOrder)
      .forEach(category => {
        const prefix = depth ? `${"· ".repeat(depth)}` : "";
        rows.push(`<option value="${category.id}" ${selectedId === category.id ? "selected" : ""}>${prefix}${escapeHtml(category.name)}</option>`);
        addRows(category.id, depth + 1);
      });
  };
  addRows("", 0);
  return rows.join("");
}

function buildOfficialResults(query, type) {
  const q = (query || "").trim();
  if (!q) return [];
  const encoded = encodeURIComponent(q);
  const pool = [
    {
      id: "official-law",
      type: "법령",
      title: `법령 검색: ${q}`,
      sourceName: "국가법령정보센터",
      officialUrl: `https://www.law.go.kr/LSW/lsSc.do?query=${encoded}`,
      sourceDate: "",
      summary: "현행 법령, 시행령, 시행규칙 및 조문 원문을 확인하기 위한 공식 검색 링크입니다.",
      fallback: true
    },
    {
      id: "official-case",
      type: "판례",
      title: `${q} 판례 검색`,
      sourceName: "국가법령정보센터",
      officialUrl: `https://www.law.go.kr/LSW/precSc.do?query=${encoded}`,
      sourceDate: "",
      summary: "사건명, 사건번호, 선고일자, 법원명 등 판례 메타데이터 확인에 사용합니다.",
      fallback: true
    },
    {
      id: "official-olta",
      type: "행정해석",
      title: `${q} 지방세 해석례 검색`,
      sourceName: "지방세 법령정보시스템",
      officialUrl: "https://www.olta.re.kr/",
      sourceDate: "",
      summary: "지방세 특화 판례, 행정안전부 유권해석, 조세심판 결정례 확인용 링크입니다.",
      fallback: true
    },
    {
      id: "official-tribunal",
      type: "조세심판",
      title: `${q} 조세심판 결정례 검색`,
      sourceName: "조세심판원",
      officialUrl: "https://www.tt.go.kr/",
      sourceDate: "",
      summary: "심판청구 결정례를 확인하고 Tax-Flow 원문 메타데이터로 저장할 수 있습니다.",
      fallback: true
    }
  ];
  return pool.filter(item => type === "전체" || item.type === type);
}

function runInternalSearch(query, scope = "current") {
  const exactPhrases = extractExactPhrases(query);
  const q = stripExactPhraseQuotes(query);
  if (!normalizeSearchText(q) && !exactPhrases.length) return [];
  const taxId = app.state.currentTaxItemId;
  return getAllItems()
    .filter(item => scope === "all" || item.taxItemId === taxId)
    .filter(item => {
      const blob = searchBlob(item);
      const looseMatch = textMatchesSearch(blob, q);
      const exactMatch = exactPhrases.every(phrase => textMatchesExactPhrase(blob, phrase));
      return looseMatch && exactMatch;
    })
    .sort(sortUpdated);
}

function extractExactPhrases(query) {
  const phrases = [];
  const seen = new Set();
  const pattern = /["“”]([^"“”]+)["“”]/g;
  let match = pattern.exec(query || "");
  while (match) {
    const phrase = match[1].replace(/\s+/g, " ").trim();
    const key = normalize(phrase);
    if (phrase && !seen.has(key)) {
      phrases.push(phrase);
      seen.add(key);
    }
    match = pattern.exec(query || "");
  }
  return phrases;
}

function stripExactPhraseQuotes(query) {
  return String(query || "").replace(/[“”"]/g, " ");
}

function filteredSources() {
  return app.data.sourceDocuments
    .filter(item => item.taxItemId === app.state.currentTaxItemId)
    .filter(item => !app.state.selectedCategoryId || item.categoryId === app.state.selectedCategoryId)
    .filter(item => textMatchesSearch(searchBlob(item), app.state.listFilter))
    .sort(sortUpdated);
}

function filteredNotes() {
  return app.data.notes
    .filter(item => item.taxItemId === app.state.currentTaxItemId)
    .filter(item => !app.state.selectedCategoryId || item.categoryId === app.state.selectedCategoryId)
    .filter(item => textMatchesSearch(searchBlob(item), app.state.listFilter))
    .sort(sortUpdated);
}

function filteredManuals() {
  return app.data.manuals
    .filter(item => item.taxItemId === app.state.currentTaxItemId)
    .filter(item => !app.state.selectedCategoryId || item.categoryId === app.state.selectedCategoryId)
    .filter(item => textMatchesSearch(searchBlob(item), app.state.listFilter))
    .sort(sortUpdated);
}

function filteredFlows() {
  return app.data.flows
    .filter(item => item.taxItemId === app.state.currentTaxItemId)
    .filter(item => !app.state.selectedCategoryId || item.categoryId === app.state.selectedCategoryId)
    .filter(item => textMatchesSearch(searchBlob(item), app.state.listFilter))
    .sort(sortUpdated);
}

function filteredTheoryFiles() {
  return app.data.theoryFiles
    .filter(item => item.taxItemId === app.state.currentTaxItemId)
    .filter(item => textMatchesSearch(searchBlob(item), app.state.listFilter))
    .sort(sortUpdated);
}

function buildAiSearchContext(question) {
  const taxId = app.state.currentTaxItemId;
  const manuals = app.data.manuals
    .filter(item => item.taxItemId === taxId)
    .map(item => ({
      kind: "manual",
      kindLabel: "매뉴얼",
      id: item.id,
      title: item.title,
      categoryPath: categoryPath(item.categoryId),
      updatedAt: item.updatedAt,
      content: [
        `제목: ${item.title}`,
        item.categoryId ? `카테고리: ${categoryPath(item.categoryId)}` : "",
        manualTheoryText(item) ? `이론:\n${manualTheoryText(item)}` : "",
        manualRelatedLawText(item) ? `관련 법령:\n${manualRelatedLawText(item)}` : "",
        manualRelatedPrecedentText(item) ? `관련 판례:\n${manualRelatedPrecedentText(item)}` : "",
        manualSystemWorkText(item) ? `전산 작업:\n${manualSystemWorkText(item)}` : ""
      ].filter(Boolean).join("\n\n"),
      blob: searchBlob(item)
    }));
  const files = app.data.theoryFiles
    .filter(item => item.taxItemId === taxId)
    .map(item => ({
      kind: "theoryFile",
      kindLabel: "등록 파일",
      id: item.id,
      title: item.title || item.fileName,
      categoryPath: categoryPath(item.categoryId),
      updatedAt: item.updatedAt,
      content: [
        `제목: ${item.title || item.fileName}`,
        item.categoryId ? `카테고리: ${categoryPath(item.categoryId)}` : "",
        item.fileName ? `파일명: ${item.fileName}` : "",
        item.memo ? `메모:\n${item.memo}` : "",
        item.contentText ? `본문:\n${item.contentText}` : ""
      ].filter(Boolean).join("\n\n"),
      blob: searchBlob(item)
    }));

  const ranked = [...manuals, ...files]
    .filter(item => item.content.trim())
    .map(item => ({
      ...item,
      score: aiContextScore(question, item.blob)
    }))
    .sort((a, b) => b.score - a.score || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  const selected = [];
  const counters = { manual: 0, theoryFile: 0 };
  let usedChars = 0;
  for (const item of ranked) {
    if (selected.length >= AI_CONTEXT_MAX_ITEMS || usedChars >= AI_CONTEXT_MAX_CHARS) break;
    const refPrefix = item.kind === "manual" ? "M" : "F";
    counters[item.kind] += 1;
    const clipped = trimByChars(item.content, Math.min(AI_CONTEXT_ITEM_MAX_CHARS, AI_CONTEXT_MAX_CHARS - usedChars));
    if (!clipped) continue;
    usedChars += clipped.length;
    selected.push({
      ref: `[${refPrefix}${counters[item.kind]}]`,
      kind: item.kind,
      kindLabel: item.kindLabel,
      id: item.id,
      title: item.title,
      categoryPath: item.categoryPath,
      content: clipped
    });
  }

  return {
    items: selected,
    manualCount: manuals.length,
    fileCount: files.length
  };
}

function aiContextScore(question, text) {
  const q = normalizeSearchText(question);
  const normalizedText = normalizeSearchText(text);
  if (!q) return 0;
  let score = textMatchesSearch(text, question) ? 10 : 0;
  const tokens = q.split(/\s+/).filter(token => token.length >= 2);
  tokens.forEach(token => {
    if (normalizedText.includes(token)) score += 2;
  });
  return score;
}

function trimByChars(value, maxChars) {
  const text = String(value || "").trim();
  if (maxChars <= 0) return "";
  return text.length > maxChars ? `${text.slice(0, Math.max(0, maxChars - 12))}\n...[생략]` : text;
}

function searchBlob(item) {
  const kind = inferKind(item);
  if (kind === "source") {
    return [item.title, item.type, item.sourceName, item.documentNumber, item.summary, categoryPath(item.categoryId), ...(item.tags || [])].join(" ");
  }
  if (kind === "note") {
    return [item.title, item.judgmentCriteria, item.body, categoryPath(item.categoryId), ...(item.tags || [])].join(" ");
  }
  if (kind === "manual") {
    return [
      item.title,
      manualTheoryText(item),
      manualRelatedLawText(item),
      manualRelatedPrecedentText(item),
      manualSystemWorkText(item),
      item.systemName,
      (item.menuPath || []).join(" "),
      formatInputFields(item.inputFields),
      formatSteps(item.steps),
      formatChecklist(item.checklist),
      item.cautions,
      categoryPath(item.categoryId),
      ...(item.tags || [])
    ].join(" ");
  }
  if (kind === "flow") {
    const linked = [
      ...item.sourceIds.map(id => app.data.sourceDocuments.find(source => source.id === id)?.title || ""),
      ...item.noteIds.map(id => app.data.notes.find(note => note.id === id)?.title || ""),
      ...item.manualIds.map(id => app.data.manuals.find(manual => manual.id === id)?.title || "")
    ];
    return [item.title, item.issueSummary, categoryPath(item.categoryId), ...(item.tags || []), ...linked].join(" ");
  }
  if (kind === "theoryFile") {
    return [
      item.title,
      item.fileName,
      theoryFileTypeLabels[item.fileKind] || item.fileKind,
      item.memo,
      item.contentText,
      categoryPath(item.categoryId),
      ...(item.tags || [])
    ].join(" ");
  }
  return "";
}

function workspaceStats(taxItemId) {
  return {
    categories: app.data.categories.filter(item => item.taxItemId === taxItemId && item.status !== "archived").length,
    sources: app.data.sourceDocuments.filter(item => item.taxItemId === taxItemId).length,
    notes: app.data.notes.filter(item => item.taxItemId === taxItemId).length,
    manuals: app.data.manuals.filter(item => item.taxItemId === taxItemId).length,
    flows: app.data.flows.filter(item => item.taxItemId === taxItemId).length
  };
}

function workspaceTotal(taxItemId) {
  const stats = workspaceStats(taxItemId);
  return stats.sources + stats.notes + stats.manuals + stats.flows;
}

function categoryCounts(categoryId, includeDescendants = false) {
  const ids = includeDescendants ? [categoryId, ...getDescendantCategoryIds(categoryId)] : [categoryId];
  const counts = {
    sources: app.data.sourceDocuments.filter(item => ids.includes(item.categoryId)).length,
    notes: app.data.notes.filter(item => ids.includes(item.categoryId)).length,
    manuals: app.data.manuals.filter(item => ids.includes(item.categoryId)).length,
    files: app.data.theoryFiles.filter(item => ids.includes(item.categoryId)).length,
    flows: app.data.flows.filter(item => ids.includes(item.categoryId)).length
  };
  counts.total = counts.sources + counts.notes + counts.manuals + counts.files + counts.flows;
  return counts;
}

function getDescendantCategoryIds(categoryId) {
  if (!categoryId) return [];
  const children = app.data.categories.filter(category => category.parentId === categoryId);
  return children.flatMap(child => [child.id, ...getDescendantCategoryIds(child.id)]);
}

function categoryDepth(categoryId) {
  let depth = 1;
  let current = app.data.categories.find(category => category.id === categoryId);
  while (current?.parentId) {
    depth += 1;
    current = app.data.categories.find(category => category.id === current.parentId);
  }
  return depth;
}

function categoryPath(categoryId) {
  if (!categoryId) return "";
  const parts = [];
  let current = app.data.categories.find(category => category.id === categoryId);
  while (current) {
    parts.unshift(current.name);
    current = app.data.categories.find(category => category.id === current.parentId);
  }
  return parts.join(" > ");
}

function activeTaxItems() {
  return app.data.taxItems.filter(item => item.status === "active").sort(sortOrder);
}

function currentTaxItem() {
  return app.data.taxItems.find(item => item.id === app.state.currentTaxItemId);
}

function currentTaxItemName(taxItemId) {
  return app.data.taxItems.find(item => item.id === taxItemId)?.name || "";
}

function firstByTax(items, taxItemId) {
  return items.filter(item => item.taxItemId === taxItemId).sort(sortUpdated)[0];
}

function firstManualByScope(taxItemId, categoryId = "") {
  return app.data.manuals
    .filter(item => item.taxItemId === taxItemId)
    .filter(item => !categoryId || item.categoryId === categoryId)
    .sort(sortUpdated)[0];
}

function getAllItems() {
  return [
    ...app.data.sourceDocuments.map(item => ({ ...item, kind: "source" })),
    ...app.data.notes.map(item => ({ ...item, kind: "note" })),
    ...app.data.manuals.map(item => ({ ...item, kind: "manual" })),
    ...app.data.flows.map(item => ({ ...item, kind: "flow" })),
    ...app.data.theoryFiles.map(item => ({ ...item, kind: "theoryFile" }))
  ];
}

function mutableItemCollections() {
  return [app.data.sourceDocuments, app.data.notes, app.data.manuals, app.data.flows, app.data.theoryFiles];
}

function refToItem(ref) {
  return findByKind(ref.type, ref.id);
}

function findByKind(kind, id) {
  if (kind === "source") return app.data.sourceDocuments.find(item => item.id === id);
  if (kind === "note") return app.data.notes.find(item => item.id === id);
  if (kind === "manual") return app.data.manuals.find(item => item.id === id);
  if (kind === "flow") return app.data.flows.find(item => item.id === id);
  if (kind === "theoryFile") return app.data.theoryFiles.find(item => item.id === id);
  return null;
}

function inferKind(item) {
  if (item.kind) return item.kind;
  if (item.sourceName !== undefined || item.officialUrl !== undefined) return "source";
  if (item.judgmentCriteria !== undefined || item.body !== undefined) return "note";
  if (item.menuPath !== undefined || item.checklist !== undefined) return "manual";
  if (item.issueSummary !== undefined || item.sourceIds !== undefined) return "flow";
  if (item.fileName !== undefined || item.fileKind !== undefined) return "theoryFile";
  return "";
}

function kindLabel(kind) {
  return {
    source: "원문",
    note: "노트",
    manual: "매뉴얼",
    flow: "Flow",
    theoryFile: "파일"
  }[kind] || kind;
}

function addRecent(type, id) {
  app.data.recentItems = [
    { type, id, viewedAt: now() },
    ...app.data.recentItems.filter(item => !(item.type === type && item.id === id))
  ].slice(0, 20);
  saveData();
}

function addSearchHistory(query) {
  app.data.searchHistory = [
    { query, createdAt: now() },
    ...app.data.searchHistory.filter(item => item.query !== query)
  ].slice(0, 20);
  saveData();
}

function addRevision(targetType, item, changeReason) {
  app.data.revisions.push({
    id: uid("rev"),
    targetType,
    targetId: item.id,
    versionNo: item.versionNo || 1,
    snapshot: deepClone(item),
    changeReason,
    createdAt: now()
  });
}

function persistUi() {
  app.data.ui.currentTaxItemId = app.state.currentTaxItemId;
  app.data.ui.activeView = app.state.activeView;
  saveData();
}

async function loadData() {
  const serverData = await loadServerData();
  if (serverData) return serverData;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultData();
    const parsed = JSON.parse(raw);
    return migrateData(parsed);
  } catch (error) {
    console.warn("Tax-Flow data reset:", error);
    return createDefaultData();
  }
}

function saveData() {
  if (!app.data) return;
  const payload = JSON.stringify(app.data);
  try {
    localStorage.setItem(STORAGE_KEY, payload);
    app.state.storageWarning = "";
  } catch (error) {
    console.warn("Tax-Flow local storage save skipped:", error);
    app.state.storageWarning = "브라우저 저장공간이 부족해 로컬 사본 저장에 실패했습니다. 실행 중인 로컬 서버 저장은 계속 시도합니다.";
  }
  queueServerSave();
}

async function loadRuntimeSettings(showToastOnDone = false) {
  app.state.settingsLoading = true;
  app.state.settingsError = "";
  if (canUseServerStorage()) {
    try {
      const response = await fetch(SERVER_SETTINGS_ENDPOINT, {
        method: "GET",
        headers: { "Accept": "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`설정 상태 조회 실패: ${response.status}`);
      app.state.settingsStatus = await response.json();
      if (showToastOnDone) showToast("연동 설정 상태를 새로고침했습니다.");
    } catch (error) {
      console.warn("Tax-Flow settings status skipped:", error);
      app.state.settingsError = "서버 설정 상태를 읽지 못했습니다. 브라우저 로컬 설정을 사용합니다.";
      app.state.settingsStatus = localRuntimeSettingsStatus();
    } finally {
      app.state.settingsLoading = false;
      if (app.data && app.state.currentTaxItemId) render();
    }
    return;
  }

  app.state.settingsStatus = localRuntimeSettingsStatus();
  app.state.settingsLoading = false;
}

async function saveRuntimeSettings(values) {
  const lawOc = (values.lawOc || "").trim();
  const clearLawOc = values.clearLawOc === "1";
  app.state.settingsMessage = "";
  app.state.settingsError = "";

  if (!lawOc && !clearLawOc) {
    app.state.settingsMessage = "변경할 LAW_OC 값이 없어 기존 설정을 유지했습니다.";
    render();
    return;
  }

  const nextLawOc = clearLawOc ? "" : lawOc;

  if (canUseServerStorage()) {
    try {
      const response = await fetch(SERVER_SETTINGS_ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ law_oc: nextLawOc })
      });
      if (!response.ok) throw new Error(`설정 저장 실패: ${response.status}`);
      const payload = await response.json();
      app.state.settingsStatus = payload.settings || localRuntimeSettingsStatus();
      app.data.runtimeSettings = {
        ...(app.data.runtimeSettings || {}),
        lawOc: ""
      };
      app.state.settingsMessage = nextLawOc ? "LAW_OC를 로컬 설정 파일에 저장했습니다." : "LAW_OC 설정을 해제했습니다.";
    } catch (error) {
      console.warn("Tax-Flow settings save skipped:", error);
      app.state.settingsError = "서버 설정 저장에 실패했습니다. 브라우저 로컬 설정으로 저장합니다.";
      saveRuntimeSettingsLocally(nextLawOc);
    }
  } else {
    saveRuntimeSettingsLocally(nextLawOc);
  }

  app.state.legalResults = [];
  saveData();
  render();
}

async function saveAiSettings(values) {
  app.state.settingsMessage = "";
  app.state.settingsError = "";

  if (!canUseServerStorage()) {
    app.state.settingsError = "AI API key는 로컬 서버로 실행 중일 때만 저장할 수 있습니다.";
    render();
    return;
  }

  const aiKeys = {};
  const aiModels = {};
  const clearAiKeys = [];
  Object.keys(aiProviderLabels).forEach(provider => {
    const keyValue = (values[`${provider}Key`] || "").trim();
    const modelValue = (values[`${provider}Model`] || "").trim();
    if (keyValue) aiKeys[provider] = keyValue;
    if (modelValue) aiModels[provider] = modelValue;
    if (values[`clear${capitalizeProviderId(provider)}Key`] === "1") clearAiKeys.push(provider);
  });

  if (!Object.keys(aiKeys).length && !Object.keys(aiModels).length && !clearAiKeys.length) {
    app.state.settingsMessage = "변경할 AI 설정이 없어 기존 설정을 유지했습니다.";
    render();
    return;
  }

  try {
    const response = await fetch(SERVER_SETTINGS_ENDPOINT, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ ai_keys: aiKeys, ai_models: aiModels, clear_ai_keys: clearAiKeys })
    });
    if (!response.ok) throw new Error(`AI 설정 저장 실패: ${response.status}`);
    const payload = await response.json();
    app.state.settingsStatus = payload.settings || localRuntimeSettingsStatus();
    app.state.settingsMessage = "AI API key 설정을 저장했습니다.";
  } catch (error) {
    console.warn("Tax-Flow AI settings save skipped:", error);
    app.state.settingsError = "AI 설정 저장에 실패했습니다. 로컬 서버 상태를 확인하세요.";
  }
  render();
}

async function runAiSearch(values) {
  const question = (values.question || "").trim();
  const provider = values.provider || app.state.aiProvider || "openai";
  const model = normalizeAiModel(provider, values.model || aiProviderStatus(provider).model);
  app.state.aiProvider = provider;
  app.state.aiQuestion = question;
  app.state.aiModelOverride = model;
  app.state.aiAnswer = "";
  app.state.aiReferences = [];
  app.state.aiError = "";

  if (!question) {
    app.state.aiError = "질문을 입력하세요.";
    render();
    return;
  }
  if (!canUseServerStorage()) {
    app.state.aiError = "AI 검색은 로컬 서버로 실행 중일 때 사용할 수 있습니다.";
    render();
    return;
  }
  if (!aiProviderStatus(provider).configured) {
    app.state.aiError = `${aiProviderLabels[provider] || provider} API key를 먼저 저장하세요.`;
    render();
    return;
  }

  const context = buildAiSearchContext(question);
  if (!context.items.length) {
    app.state.aiError = "답변에 사용할 매뉴얼 또는 등록 파일이 없습니다.";
    render();
    return;
  }

  app.state.aiLoading = true;
  render();
  try {
    const response = await fetch(SERVER_AI_SEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        provider,
        model,
        question,
        taxItemName: currentTaxItemName(app.state.currentTaxItemId),
        contextItems: context.items
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.message || `AI 검색 실패: ${response.status}`);
    app.state.aiAnswer = payload.answer || "";
    app.state.aiReferences = context.items.map(item => ({
      ref: item.ref,
      title: item.title,
      kindLabel: item.kindLabel,
      categoryPath: item.categoryPath
    }));
  } catch (error) {
    console.warn("Tax-Flow AI search failed:", error);
    app.state.aiError = error.message || "AI 검색 중 오류가 발생했습니다.";
  } finally {
    app.state.aiLoading = false;
    render();
  }
}

function saveRuntimeSettingsLocally(lawOc) {
  app.data.runtimeSettings = {
    ...(app.data.runtimeSettings || {}),
    lawOc
  };
  app.state.settingsStatus = localRuntimeSettingsStatus();
  app.state.settingsMessage = lawOc ? "LAW_OC를 브라우저 로컬 저장소에 저장했습니다." : "LAW_OC 설정을 해제했습니다.";
}

function localRuntimeSettingsStatus() {
  const lawOc = app.data?.runtimeSettings?.lawOc || "";
  return {
    law_oc: {
      configured: Boolean(lawOc),
      source: lawOc ? "localStorage" : "missing",
      saved: Boolean(lawOc)
    },
    ai: {
      providers: Object.fromEntries(Object.keys(aiProviderLabels).map(provider => [
        provider,
        { configured: false, source: "missing", saved: false, model: aiDefaultModels[provider] || "" }
      ]))
    },
    settingsFile: "브라우저 localStorage"
  };
}

async function loadServerData() {
  if (!canUseServerStorage()) return null;

  try {
    const response = await fetch(SERVER_DATA_ENDPOINT, {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store"
    });
    if (response.status === 204 || response.status === 404) return null;
    if (!response.ok) throw new Error(`서버 데이터 로드 실패: ${response.status}`);
    const parsed = await response.json();
    return migrateData(parsed);
  } catch (error) {
    console.warn("Tax-Flow server data skipped:", error);
    return null;
  }
}

function queueServerSave() {
  if (!canUseServerStorage()) return;
  clearTimeout(serverSaveTimer);
  const payload = JSON.stringify(app.data);
  serverSaveTimer = setTimeout(() => saveServerData(payload), 250);
}

async function saveServerData(payload) {
  try {
    const response = await fetch(SERVER_DATA_ENDPOINT, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: payload
    });
    if (!response.ok) throw new Error(`서버 데이터 저장 실패: ${response.status}`);
  } catch (error) {
    console.warn("Tax-Flow server save skipped:", error);
  }
}

function canUseServerStorage() {
  return location.protocol === "http:" || location.protocol === "https:";
}

function migrateData(data) {
  const defaults = createDefaultData();
  const migrated = {
    ...defaults,
    ...data,
    ui: {
      ...defaults.ui,
      ...(data.ui || {})
    },
    taxItems: data.taxItems || defaults.taxItems,
    categories: data.categories || defaults.categories,
    sourceDocuments: data.sourceDocuments || [],
    notes: data.notes || [],
    manuals: data.manuals || [],
    flows: data.flows || [],
    theoryFiles: data.theoryFiles || [],
    tags: data.tags || [],
    bookmarks: data.bookmarks || [],
    recentItems: data.recentItems || [],
    searchHistory: data.searchHistory || [],
    revisions: data.revisions || [],
    runtimeSettings: {
      ...defaults.runtimeSettings,
      ...(data.runtimeSettings || {})
    },
    qa: {
      ...defaults.qa,
      ...(data.qa || {}),
      messages: data.qa?.messages || []
    }
  };
  migrated.sourceDocuments = migrated.sourceDocuments.map(source => ({
    favorite: false,
    tags: [],
    ...source
  }));
  migrated.theoryFiles = migrated.theoryFiles.map(file => ({
    tags: [],
    memo: "",
    contentText: "",
    dataUrl: "",
    ...file
  }));
  ensureManualCategories(migrated);
  return migrated;
}

function ensureManualCategories(data) {
  requiredManualCategories.forEach(spec => {
    const existing = data.categories.find(category => category.id === spec.id);
    if (existing) {
      existing.name = spec.name;
      existing.description = existing.description || spec.description;
      existing.sortOrder = spec.sortOrder;
      existing.parentId = "";
      existing.status = existing.status === "archived" ? "active" : (existing.status || "active");
      return;
    }

    const sameName = data.categories.find(category =>
      category.taxItemId === spec.taxItemId
      && normalize(category.name) === normalize(spec.name)
      && !category.parentId
    );
    if (sameName) {
      sameName.description = sameName.description || spec.description;
      sameName.sortOrder = spec.sortOrder;
      sameName.status = sameName.status === "archived" ? "active" : (sameName.status || "active");
      return;
    }

    const timestamp = now();
    data.categories.push({
      id: spec.id,
      taxItemId: spec.taxItemId,
      parentId: "",
      name: spec.name,
      description: spec.description,
      status: "active",
      sortOrder: spec.sortOrder,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  });
}

function validateDataShape(data) {
  const requiredArrays = ["taxItems", "categories", "sourceDocuments", "notes", "manuals", "flows"];
  for (const key of requiredArrays) {
    if (!Array.isArray(data[key])) throw new Error(`${key} 배열이 없습니다.`);
  }
}

function createDefaultData() {
  const createdAt = now();
  const taxItems = [
    {
      id: "tax-acquisition",
      code: "acquisition_tax",
      name: "취득세",
      description: "부동산·차량 등 취득 행위에 대한 지방세 업무",
      status: "active",
      sortOrder: 1,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "tax-property",
      code: "property_tax",
      name: "재산세",
      description: "토지·건축물·주택 등 보유 재산 과세 업무",
      status: "active",
      sortOrder: 2,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "tax-registration-license",
      code: "registration_license_tax",
      name: "등록면허세",
      description: "확장 세목",
      status: "hidden",
      sortOrder: 5,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "tax-resident",
      code: "resident_tax",
      name: "주민세",
      description: "개인분·사업소분·종업원분 주민세 업무",
      status: "active",
      sortOrder: 4,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "tax-local-income",
      code: "local_income_tax",
      name: "지방소득세",
      description: "개인·법인 지방소득세 신고, 부과, 특별징수 업무",
      status: "active",
      sortOrder: 3,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "tax-automobile",
      code: "automobile_tax",
      name: "자동차세",
      description: "확장 세목",
      status: "hidden",
      sortOrder: 6,
      createdAt,
      updatedAt: createdAt
    }
  ];

  const categories = [
    cat("cat-acq-taxable", "tax-acquisition", "", "과세대상", "취득의 성립, 과세대상 판단", 1),
    cat("cat-acq-rate", "tax-acquisition", "", "세율", "주택·농지·일반세율", 2),
    cat("cat-acq-heavy", "tax-acquisition", "", "중과세", "대도시 법인, 사치성 재산 등 중과 판단", 3),
    cat("cat-acq-heavy-corp", "tax-acquisition", "cat-acq-heavy", "대도시 법인", "지점 설치, 본점 전입, 직접사용 여부", 1),
    cat("cat-acq-heavy-luxury", "tax-acquisition", "cat-acq-heavy", "사치성 재산", "고급주택, 별장 등", 2),
    cat("cat-acq-reduction", "tax-acquisition", "", "감면", "감면 요건과 사후관리", 4),
    cat("cat-acq-clawback", "tax-acquisition", "", "추징", "감면 후 목적 외 사용 등", 5),
    cat("cat-prop-standard", "tax-property", "", "과세기준일", "6월 1일 현재 납세의무 및 현황 판단", 1),
    cat("cat-prop-land", "tax-property", "", "토지", "종합합산·별도합산·분리과세", 2),
    cat("cat-prop-land-general", "tax-property", "cat-prop-land", "종합합산", "일반 토지 과세구분", 1),
    cat("cat-prop-land-special", "tax-property", "cat-prop-land", "별도합산", "건축물 부속토지 등", 2),
    cat("cat-prop-land-separate", "tax-property", "cat-prop-land", "분리과세", "농지, 임야 등 별도 규정", 3),
    cat("cat-prop-building", "tax-property", "", "건축물", "건축물 과세대상 및 시가표준액", 3),
    cat("cat-prop-house", "tax-property", "", "주택", "주택분 재산세", 4),
    cat("cat-prop-reduction", "tax-property", "", "감면", "감면 요건과 사후관리", 5),
    cat("cat-local-income-personal", "tax-local-income", "", "종합소득분", "종합소득분 지방소득세 신고·부과 업무", 1),
    cat("cat-local-income-transfer", "tax-local-income", "", "양도소득분", "양도소득분 지방소득세 신고·부과 업무", 2),
    cat("cat-local-income-corporate", "tax-local-income", "", "법인", "법인지방소득세 신고·납부와 안분 검토", 3),
    cat("cat-local-income-withholding", "tax-local-income", "", "특별징수", "특별징수 신고, 납부, 정산", 4),
    cat("cat-local-income-payment", "tax-local-income", "", "신고·납부", "신고기한, 납부확인, 가산세", 5),
    cat("cat-resident-individual", "tax-resident", "", "개인분", "개인분 주민세 부과·감면", 1),
    cat("cat-resident-employee", "tax-resident", "", "종업원분", "종업원분 과세표준과 신고", 2),
    cat("cat-resident-business", "tax-resident", "", "사업소분", "사업소분 신고·납부와 과세대상", 3),
    cat("cat-resident-payment", "tax-resident", "", "신고·납부", "납부확인, 독촉, 가산세", 4),
    cat("cat-resident-delinquency", "tax-resident", "", "체납", "체납 정리, 독촉, 압류, 징수 관리", 5)
  ];

  const sourceDocuments = [
    {
      id: "src-acq-heavy-law",
      taxItemId: "tax-acquisition",
      categoryId: "cat-acq-heavy-corp",
      type: "법령",
      title: "지방세법상 대도시 법인 취득세 중과 근거",
      sourceName: "국가법령정보센터",
      officialUrl: "https://www.law.go.kr/LSW/lsSc.do?query=%EB%8C%80%EB%8F%84%EC%8B%9C%20%EB%B2%95%EC%9D%B8%20%EC%B7%A8%EB%93%9D%EC%84%B8%20%EC%A4%91%EA%B3%BC",
      sourceDate: "현행",
      documentNumber: "",
      summary: "대도시 내 법인 설립·지점 설치 후 일정 기간 내 부동산 취득 시 중과 적용 여부를 확인하기 위한 공식 검색 링크.",
      tags: ["대도시", "중과", "법인"],
      favorite: true,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "src-prop-land-case",
      taxItemId: "tax-property",
      categoryId: "cat-prop-land-special",
      type: "판례",
      title: "재산세 토지 과세구분 관련 판례 검색",
      sourceName: "국가법령정보센터",
      officialUrl: "https://www.law.go.kr/LSW/precSc.do?query=%EC%9E%AC%EC%82%B0%EC%84%B8%20%EB%B3%84%EB%8F%84%ED%95%A9%EC%82%B0%20%EC%B0%A9%EA%B3%B5",
      sourceDate: "검색 링크",
      documentNumber: "",
      summary: "과세기준일 현재 착공 여부, 토지 이용상황과 별도합산 판단 자료를 확인하기 위한 판례 검색 링크.",
      tags: ["별도합산", "과세기준일", "착공"],
      favorite: true,
      createdAt,
      updatedAt: createdAt
    }
  ];

  const notes = [
    {
      id: "note-acq-heavy-corp",
      taxItemId: "tax-acquisition",
      categoryId: "cat-acq-heavy-corp",
      title: "대도시 법인 지점 설치 후 부동산 취득 판단 기준",
      status: "published",
      judgmentCriteria: "법인의 지점 설치 시점, 취득 부동산의 사용 목적, 직접사용 여부, 임대 여부를 분리해 확인한다. 중과 여부는 단순 소재지가 아니라 법령상 대도시 요건과 기간 요건을 함께 검토한다.",
      body: "1. 법인 설립·전입·지점 설치일을 확인한다.\n2. 취득일이 기준 기간 안에 있는지 확인한다.\n3. 취득 부동산이 법인의 본점·지점 업무에 직접 사용되는지 확인한다.\n4. 임대 또는 목적 외 사용이 있으면 감면·중과 판단을 별도로 기록한다.\n\n개인정보가 포함된 실제 납세자 자료는 Tax-Flow에 저장하지 않고 사건번호 또는 익명화된 사례명으로만 남긴다.",
      tags: ["대도시", "중과", "입문 코스"],
      linkedSourceIds: ["src-acq-heavy-law"],
      favorite: true,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "note-prop-land-special",
      taxItemId: "tax-property",
      categoryId: "cat-prop-land-special",
      title: "과세기준일 현재 착공 토지의 별도합산 검토",
      status: "review",
      judgmentCriteria: "과세기준일 현재 단순 준비행위와 실질 착공을 구분한다. 착공신고, 공사계약, 현장 사진, 굴착 여부, 자재 반입 등 객관 자료를 함께 본다.",
      body: "공부상 지목과 실제 이용상황이 다를 경우 현황 과세 원칙을 검토한다. 사진, 출장복명, 인허가 문서가 서로 충돌하면 판단 근거와 보완 요청 내용을 같이 남긴다.",
      tags: ["별도합산", "과세기준일", "입문 코스"],
      linkedSourceIds: ["src-prop-land-case"],
      favorite: false,
      createdAt,
      updatedAt: createdAt
    }
  ];

  const manuals = [
    {
      id: "manual-acq-heavy-corp",
      taxItemId: "tax-acquisition",
      categoryId: "cat-acq-heavy-corp",
      noteId: "note-acq-heavy-corp",
      title: "대도시 법인 중과 전산 입력 체크",
      status: "published",
      riskLevel: "high",
      systemName: "차세대 지방세입정보시스템",
      menuPath: ["부과관리", "취득세", "신고자료 검토", "세율/중과 선택"],
      inputFields: [
        { label: "취득 유형", value: "법인 부동산 취득" },
        { label: "중과 구분", value: "대도시 법인" },
        { label: "사용 구분", value: "직접사용/임대 여부 확인 후 선택" }
      ],
      steps: [
        { id: "step-acq-1", title: "법인 기본정보 확인", body: "설립일, 본점 소재지, 지점 설치일을 확인한다." },
        { id: "step-acq-2", title: "중과세율 선택", body: "세율/중과 선택 화면에서 대도시 법인 중과 항목을 선택한다." },
        { id: "step-acq-3", title: "검증", body: "산출세액, 감면 배제 여부, 증빙 첨부 여부를 확인한다." }
      ],
      checklist: [
        { id: "check-acq-1", text: "법인등기부 등본 확인", done: false },
        { id: "check-acq-2", text: "지점 설치일과 취득일 비교", done: false },
        { id: "check-acq-3", text: "직접사용/임대 증빙 확인", done: false },
        { id: "check-acq-4", text: "중과세율 적용 후 산출세액 검산", done: false }
      ],
      cautions: "유권해석이나 판례 적용 범위가 사건 사실관계와 다르면 그대로 적용하지 않는다. 최종 판단은 담당자가 공식 원문을 확인해 기록한다.",
      tags: ["대도시", "중과", "전산"],
      favorite: true,
      versionNo: 1,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "manual-prop-land-special",
      taxItemId: "tax-property",
      categoryId: "cat-prop-land-special",
      noteId: "note-prop-land-special",
      title: "토지 과세구분 변경 전산 처리",
      status: "draft",
      riskLevel: "normal",
      systemName: "차세대 지방세입정보시스템",
      menuPath: ["과세자료관리", "재산세", "토지", "과세구분 변경"],
      inputFields: [
        { label: "변경 전 구분", value: "종합합산" },
        { label: "변경 후 구분", value: "별도합산" },
        { label: "적용 기준일", value: "과세기준일 현재" }
      ],
      steps: [
        { id: "step-prop-1", title: "현황 자료 확인", body: "현장사진, 착공신고, 공사계약서를 대조한다." },
        { id: "step-prop-2", title: "과세구분 변경", body: "토지 과세구분 변경 화면에서 변경 사유를 기록한다." }
      ],
      checklist: [
        { id: "check-prop-1", text: "현장사진 확보", done: false },
        { id: "check-prop-2", text: "착공신고 여부 확인", done: false },
        { id: "check-prop-3", text: "변경 전후 세액 비교", done: false }
      ],
      cautions: "공부와 현황이 다르면 현황 판단 근거를 별도 문서로 남긴다.",
      tags: ["별도합산", "전산"],
      favorite: false,
      versionNo: 1,
      createdAt,
      updatedAt: createdAt
    }
  ];

  const flows = [
    {
      id: "flow-acq-heavy-corp",
      taxItemId: "tax-acquisition",
      categoryId: "cat-acq-heavy-corp",
      title: "대도시 법인 지점 설치 후 5년 이내 취득",
      issueSummary: "법인이 대도시 내 지점을 설치한 뒤 일정 기간 안에 부동산을 취득한 사안에서 중과세율 적용 여부와 전산 입력값을 함께 확인한다.",
      status: "published",
      riskLevel: "high",
      sourceIds: ["src-acq-heavy-law"],
      noteIds: ["note-acq-heavy-corp"],
      manualIds: ["manual-acq-heavy-corp"],
      tags: ["대도시", "법인", "중과"],
      favorite: true,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "flow-prop-land-special",
      taxItemId: "tax-property",
      categoryId: "cat-prop-land-special",
      title: "과세기준일 현재 착공 토지 별도합산 판단",
      issueSummary: "착공 중인지 단순 준비행위인지 다투는 토지에 대해 판단 자료와 과세구분 변경 절차를 하나의 Flow로 관리한다.",
      status: "review",
      riskLevel: "normal",
      sourceIds: ["src-prop-land-case"],
      noteIds: ["note-prop-land-special"],
      manualIds: ["manual-prop-land-special"],
      tags: ["재산세", "토지", "별도합산"],
      favorite: false,
      createdAt,
      updatedAt: createdAt
    }
  ];

  return {
    version: 1,
    ui: {
      currentTaxItemId: "tax-acquisition",
      activeView: "dashboard",
      collapsedCategoryIds: []
    },
    taxItems,
    categories,
    sourceDocuments,
    notes,
    manuals,
    flows,
    theoryFiles: [],
    tags: [],
    bookmarks: [],
    recentItems: [
      { type: "flow", id: "flow-acq-heavy-corp", viewedAt: createdAt },
      { type: "manual", id: "manual-acq-heavy-corp", viewedAt: createdAt }
    ],
    searchHistory: [],
    revisions: [],
    runtimeSettings: {
      lawOc: ""
    },
    qa: {
      includePublic: true,
      draft: "",
      messages: []
    }
  };
}

function cat(id, taxItemId, parentId, name, description, sortOrder) {
  const timestamp = now();
  return {
    id,
    taxItemId,
    parentId,
    name,
    description,
    status: "active",
    sortOrder,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function parseTags(value) {
  if (Array.isArray(value)) return value.flatMap(parseTags);
  return String(value || "")
    .split(/[,\n#]+/)
    .map(tag => tag.trim())
    .filter(Boolean)
    .filter((tag, index, all) => all.indexOf(tag) === index);
}

function parseMenuPath(value) {
  return String(value || "")
    .split(/>|\/|\n/)
    .map(item => item.trim())
    .filter(Boolean);
}

function parseInputFields(value) {
  return String(value || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [label, ...rest] = line.split("|");
      return {
        label: (label || "").trim(),
        value: rest.join("|").trim()
      };
    })
    .filter(field => field.label || field.value);
}

function parseSteps(value) {
  return String(value || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [title, ...rest] = line.split("|");
      return {
        id: uid("step"),
        title: (title || "").trim(),
        body: rest.join("|").trim()
      };
    })
    .filter(step => step.title || step.body);
}

function parseChecklist(value, manualId = "") {
  const oldItems = manualId ? app.data.manuals.find(manual => manual.id === manualId)?.checklist || [] : [];
  return String(value || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const existing = oldItems.find(item => item.text === line);
      return existing ? existing : { id: uid("check"), text: line, done: false };
    });
}

function formatInputFields(fields = []) {
  return fields.map(field => `${field.label} | ${field.value}`).join("\n");
}

function formatSteps(steps = []) {
  return steps.map(step => `${step.title} | ${step.body}`).join("\n");
}

function formatChecklist(items = []) {
  return items.map(item => item.text).join("\n");
}

function asArray(value) {
  if (value === undefined || value === null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function sortOrder(a, b) {
  return (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name, "ko");
}

function sortUpdated(a, b) {
  return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
}

function nextSortOrder(items) {
  return items.reduce((max, item) => Math.max(max, item.sortOrder || 0), 0) + 1;
}

function groupBy(items, getter) {
  return items.reduce((acc, item) => {
    const key = getter(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function normalize(value) {
  return normalizeSearchText(value);
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearchText(value) {
  return normalizeSearchText(value).replace(/[\s"'`~!@#$%^&*()_+\-=[\]{};:,.<>/?\\|·ㆍ•]+/g, "");
}

function searchTokens(value) {
  return normalizeSearchText(value).split(" ").map(compactSearchText).filter(Boolean);
}

function textMatchesSearch(text, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const normalizedText = normalizeSearchText(text);
  const compactText = compactSearchText(normalizedText);
  const initialText = hangulInitials(compactText);

  return searchTokens(normalizedQuery).every(token => {
    if (normalizedText.includes(token)) return true;
    if (compactText.includes(token)) return true;
    if (hasHangulInitials(token) && initialText.includes(token)) return true;
    return false;
  });
}

function textMatchesExactPhrase(text, phrase) {
  const normalizedPhrase = normalizeSearchText(phrase);
  if (!normalizedPhrase) return true;

  const normalizedText = normalizeSearchText(text);
  return normalizedText.includes(normalizedPhrase) || compactSearchText(normalizedText).includes(compactSearchText(normalizedPhrase));
}

function hangulInitials(value) {
  return Array.from(String(value || "")).map(char => {
    const code = char.charCodeAt(0);
    if (code < HANGUL_BASE_CODE || code > HANGUL_END_CODE) return char;
    return HANGUL_INITIALS[Math.floor((code - HANGUL_BASE_CODE) / 588)];
  }).join("");
}

function hasHangulInitials(value) {
  return /[ㄱ-ㅎ]/.test(value);
}

function trimText(value, length) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function touch(item) {
  item.updatedAt = now();
}

function now() {
  return new Date().toISOString();
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const rounded = size >= 10 ? Math.round(size) : Math.round(size * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

function uid(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
