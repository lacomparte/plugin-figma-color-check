# 디자인 시스템 Color Scanner - Part 2: UI 구현

---

## 4. UI 구현

### 4.1 HTML 템플릿 (src/ui.html)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>디자인 시스템 Color Scanner</title>
  <style>
    /* ========================================
       CSS Variables
       ======================================== */
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f5f5f5;
      --bg-tertiary: #ebebeb;
      --bg-success: #d1fae5;
      --bg-error: #fee2e2;
      --bg-warning: #fef3c7;
      --text-primary: #000000;
      --text-secondary: #666666;
      --text-tertiary: #8a8a8a;
      --text-success: #059669;
      --text-error: #dc2626;
      --text-warning: #d97706;
      --border-color: #e0e0e0;
      --accent-blue: #245EFF;
      --accent-red: #F31110;
      --accent-green: #10b981;
    }

    /* ========================================
       Reset & Base
       ======================================== */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      color: var(--text-primary);
      background: var(--bg-primary);
      line-height: 1.5;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    /* ========================================
       Header
       ======================================== */
    .header {
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-primary);
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .header-title h1 {
      font-size: 16px;
      font-weight: 600;
    }

    .header-desc {
      font-size: 11px;
      color: var(--text-secondary);
    }

    .header-actions {
      margin-top: 12px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-primary {
      background: var(--accent-blue);
      color: white;
    }

    .btn-primary:hover {
      background: #1a4fd9;
    }

    .btn-success {
      background: var(--accent-green);
      color: white;
    }

    .btn-success:hover {
      background: #059669;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* ========================================
       Stats Section
       ======================================== */
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
    }

    .stat-item {
      text-align: center;
      padding: 8px;
      background: var(--bg-primary);
      border-radius: 6px;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 700;
    }

    .stat-value.success { color: var(--accent-green); }
    .stat-value.error { color: var(--accent-red); }
    .stat-value.neutral { color: var(--text-primary); }

    .stat-label {
      font-size: 10px;
      color: var(--text-tertiary);
      margin-top: 2px;
    }

    /* ========================================
       SSOT Info
       ======================================== */
    .ssot-info {
      padding: 12px 16px;
      background: var(--bg-success);
      border-bottom: 1px solid var(--border-color);
      font-size: 11px;
      color: var(--text-success);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ssot-info.warning {
      background: var(--bg-warning);
      color: var(--text-warning);
    }

    .ssot-info.error {
      background: var(--bg-error);
      color: var(--text-error);
    }

    /* ========================================
       Results Section
       ======================================== */
    .results {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }

    .results-header {
      position: sticky;
      top: 0;
      z-index: 10;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .results-title {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .results-count {
      font-size: 11px;
      color: var(--text-tertiary);
      font-weight: 400;
    }

    /* ========================================
       Empty & Loading States
       ======================================== */
    .empty-state,
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      color: var(--text-tertiary);
    }

    .empty-icon,
    .loading-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .empty-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border-color);
      border-top-color: var(--accent-blue);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ========================================
       Violation Item
       ======================================== */
    .violation-item {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      transition: background 0.15s ease;
    }

    .violation-item:hover {
      background: var(--bg-secondary);
    }

    .violation-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .color-swatch {
      width: 36px;
      height: 36px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      flex-shrink: 0;
      position: relative;
    }

    .color-swatch.has-opacity {
      background-image: 
        linear-gradient(45deg, #ccc 25%, transparent 25%),
        linear-gradient(-45deg, #ccc 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #ccc 75%),
        linear-gradient(-45deg, transparent 75%, #ccc 75%);
      background-size: 8px 8px;
      background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
    }

    .color-swatch-inner {
      position: absolute;
      inset: 0;
      border-radius: 5px;
    }

    .violation-info {
      flex: 1;
      min-width: 0;
    }

    .violation-color {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 2px;
    }

    .color-hex {
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 12px;
      font-weight: 600;
    }

    .color-family {
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .family-grayscale { background: #e5e5e5; color: #525252; }
    .family-blue { background: #dbeafe; color: #1e40af; }
    .family-red { background: #fee2e2; color: #dc2626; }
    .family-yellow { background: #fef3c7; color: #d97706; }
    .family-green { background: #d1fae5; color: #059669; }
    .family-other { background: #f3e8ff; color: #7c3aed; }

    .violation-node {
      font-size: 11px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
    }

    .violation-node:hover {
      color: var(--accent-blue);
      text-decoration: underline;
    }

    .property-badge {
      font-size: 9px;
      padding: 2px 6px;
      background: var(--bg-tertiary);
      border-radius: 3px;
      color: var(--text-tertiary);
      margin-left: 4px;
    }

    /* ========================================
       Suggestion Box
       ======================================== */
    .suggestion {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: var(--bg-secondary);
      border-radius: 8px;
      margin-top: 8px;
    }

    .suggestion-arrow {
      color: var(--text-tertiary);
      font-size: 16px;
      flex-shrink: 0;
    }

    .suggestion-swatch {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid var(--border-color);
      flex-shrink: 0;
    }

    .suggestion-info {
      flex: 1;
      min-width: 0;
    }

    .suggestion-name {
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .suggestion-hex {
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 10px;
      color: var(--text-secondary);
    }

    .suggestion-distance {
      font-size: 9px;
      color: var(--text-tertiary);
    }

    .btn-fix {
      padding: 6px 12px;
      font-size: 11px;
      background: var(--accent-blue);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      flex-shrink: 0;
    }

    .btn-fix:hover {
      background: #1a4fd9;
    }

    /* ========================================
       Footer
       ======================================== */
    .footer {
      padding: 12px 16px;
      border-top: 1px solid var(--border-color);
      background: var(--bg-primary);
    }

    .footer .btn {
      width: 100%;
    }

    /* ========================================
       Message
       ======================================== */
    .message {
      padding: 12px 16px;
      border-radius: 6px;
      margin: 16px;
      font-size: 12px;
    }

    .message-error {
      background: var(--bg-error);
      color: var(--text-error);
    }

    .message-success {
      background: var(--bg-success);
      color: var(--text-success);
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-title">
        <span style="font-size: 20px;">🔍</span>
        <h1>디자인 시스템 Color Scanner</h1>
      </div>
      <p class="header-desc">
        Color Variables를 기준으로 현재 페이지의 색상을 검사합니다
      </p>
      <div class="header-actions">
        <button class="btn btn-primary" id="rescanBtn">
          🔄 다시 스캔
        </button>
      </div>
    </div>

    <!-- SSOT Info -->
    <div class="ssot-info" id="ssotInfo" style="display: none;">
      <span>📦</span>
      <span id="ssotText"></span>
    </div>

    <!-- Stats -->
    <div class="stats" id="stats" style="display: none;">
      <div class="stat-item">
        <div class="stat-value neutral" id="statTotal">0</div>
        <div class="stat-label">전체 색상</div>
      </div>
      <div class="stat-item">
        <div class="stat-value success" id="statBound">0</div>
        <div class="stat-label">Variable</div>
      </div>
      <div class="stat-item">
        <div class="stat-value error" id="statUnbound">0</div>
        <div class="stat-label">하드코딩</div>
      </div>
      <div class="stat-item">
        <div class="stat-value neutral" id="statRate">0%</div>
        <div class="stat-label">준수율</div>
      </div>
    </div>

    <!-- Results -->
    <div class="results" id="results">
      <div class="loading-state" id="loadingState">
        <div class="spinner"></div>
        <p>색상 검사 중...</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer" id="footer" style="display: none;">
      <button class="btn btn-success" id="fixAllBtn">
        ✨ 모든 위반 색상 수정
      </button>
    </div>
  </div>
</body>
</html>
```

### 4.2 UI 로직 (src/ui.ts)

```typescript
// src/ui.ts

// ============================================
// 타입 정의
// ============================================

interface ColorToken {
  variableId: string;
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  opacity: number;
  family: string;
}

interface ColorUsage {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  propertyType: 'fill' | 'stroke';
  paintIndex: number;
  hex: string;
  rgb: { r: number; g: number; b: number };
  opacity: number;
  family: string;
  isBoundToVariable: boolean;
  boundVariableName?: string;
  suggestion?: {
    variableId: string;
    name: string;
    hex: string;
    distance: number;
  };
}

interface ScanResult {
  totalNodes: number;
  totalColors: number;
  boundColors: number;
  unboundColors: number;
  ssotTokens: ColorToken[];
  violations: ColorUsage[];
}

// ============================================
// 상태
// ============================================

let currentViolations: ColorUsage[] = [];

// ============================================
// DOM 요소
// ============================================

const rescanBtn = document.getElementById('rescanBtn') as HTMLButtonElement;
const ssotInfo = document.getElementById('ssotInfo') as HTMLDivElement;
const ssotText = document.getElementById('ssotText') as HTMLSpanElement;
const stats = document.getElementById('stats') as HTMLDivElement;
const results = document.getElementById('results') as HTMLDivElement;
const footer = document.getElementById('footer') as HTMLDivElement;
const fixAllBtn = document.getElementById('fixAllBtn') as HTMLButtonElement;

// ============================================
// 이벤트 리스너
// ============================================

rescanBtn.addEventListener('click', () => {
  parent.postMessage({ pluginMessage: { type: 'rescan' } }, '*');
});

fixAllBtn.addEventListener('click', () => {
  if (currentViolations.length === 0) return;

  const fixes = currentViolations
    .filter(v => v.suggestion)
    .map(v => ({
      nodeId: v.nodeId,
      propertyType: v.propertyType,
      paintIndex: v.paintIndex,
      variableId: v.suggestion!.variableId,
    }));

  parent.postMessage({ 
    pluginMessage: { type: 'fix-all', payload: { fixes } } 
  }, '*');
});

// ============================================
// 메시지 핸들러
// ============================================

window.onmessage = (event) => {
  const msg = event.data.pluginMessage;

  switch (msg.type) {
    case 'scan-start':
      showLoading();
      break;

    case 'scan-result':
      renderResults(msg.data);
      break;

    case 'scan-error':
      showError(msg.error);
      break;
  }
};

// ============================================
// 렌더링 함수
// ============================================

function showLoading(): void {
  results.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>색상 검사 중...</p>
    </div>
  `;
  stats.style.display = 'none';
  ssotInfo.style.display = 'none';
  footer.style.display = 'none';
}

function showError(error: string): void {
  ssotInfo.className = 'ssot-info error';
  ssotInfo.style.display = 'flex';
  ssotText.textContent = error;

  results.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <div class="empty-title">오류 발생</div>
      <p>${error}</p>
    </div>
  `;
  
  stats.style.display = 'none';
  footer.style.display = 'none';
}

function renderResults(data: ScanResult): void {
  currentViolations = data.violations;

  // SSOT 정보 표시
  ssotInfo.className = 'ssot-info';
  ssotInfo.style.display = 'flex';
  ssotText.textContent = `${data.ssotTokens.length}개의 Color Variables를 SSOT로 사용 중`;

  // 통계 표시
  stats.style.display = 'grid';
  (document.getElementById('statTotal') as HTMLDivElement).textContent = 
    data.totalColors.toString();
  (document.getElementById('statBound') as HTMLDivElement).textContent = 
    data.boundColors.toString();
  (document.getElementById('statUnbound') as HTMLDivElement).textContent = 
    data.unboundColors.toString();
  
  const rate = data.totalColors > 0 
    ? Math.round((data.boundColors / data.totalColors) * 100) 
    : 100;
  (document.getElementById('statRate') as HTMLDivElement).textContent = `${rate}%`;

  // 결과 목록
  if (data.violations.length === 0) {
    results.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <div class="empty-title">완벽합니다!</div>
        <p>모든 색상이 Color Variables를 사용하고 있습니다.</p>
      </div>
    `;
    footer.style.display = 'none';
  } else {
    results.innerHTML = `
      <div class="results-header">
        <div class="results-title">
          ⚠️ 하드코딩된 색상
          <span class="results-count">(${data.violations.length}개)</span>
        </div>
      </div>
      ${data.violations.map(renderViolationItem).join('')}
    `;

    // 이벤트 리스너 연결
    attachEventListeners();

    // 푸터 표시
    footer.style.display = 'block';
    fixAllBtn.textContent = `✨ ${data.violations.filter(v => v.suggestion).length}개 색상 모두 수정`;
  }
}

function renderViolationItem(violation: ColorUsage): string {
  const familyClass = `family-${violation.family}`;
  const hasOpacity = violation.opacity < 1;

  return `
    <div class="violation-item" data-node-id="${violation.nodeId}">
      <div class="violation-header">
        <div class="color-swatch ${hasOpacity ? 'has-opacity' : ''}">
          <div class="color-swatch-inner" style="background-color: ${violation.hex}; opacity: ${violation.opacity}"></div>
        </div>
        <div class="violation-info">
          <div class="violation-color">
            <span class="color-hex">${violation.hex}</span>
            ${hasOpacity ? `<span class="color-hex" style="color: var(--text-tertiary)">${Math.round(violation.opacity * 100)}%</span>` : ''}
            <span class="color-family ${familyClass}">${violation.family}</span>
          </div>
          <div class="violation-node" data-node-id="${violation.nodeId}">
            ${escapeHtml(violation.nodeName)}
            <span class="property-badge">${violation.propertyType === 'fill' ? 'Fill' : 'Stroke'}</span>
          </div>
        </div>
      </div>
      ${violation.suggestion ? renderSuggestion(violation) : renderNoSuggestion()}
    </div>
  `;
}

function renderSuggestion(violation: ColorUsage): string {
  const suggestion = violation.suggestion!;
  
  return `
    <div class="suggestion">
      <span class="suggestion-arrow">→</span>
      <div class="suggestion-swatch" style="background-color: ${suggestion.hex}"></div>
      <div class="suggestion-info">
        <div class="suggestion-name">${suggestion.name}</div>
        <div class="suggestion-hex">${suggestion.hex}</div>
      </div>
      ${suggestion.distance > 0 ? `<span class="suggestion-distance">거리: ${suggestion.distance}</span>` : ''}
      <button class="btn-fix" 
        data-node-id="${violation.nodeId}"
        data-property-type="${violation.propertyType}"
        data-paint-index="${violation.paintIndex}"
        data-variable-id="${suggestion.variableId}">
        수정
      </button>
    </div>
  `;
}

function renderNoSuggestion(): string {
  return `
    <div class="suggestion" style="background: var(--bg-error);">
      <span class="suggestion-arrow">⚠️</span>
      <span style="color: var(--text-error); font-size: 11px;">
        추천할 수 있는 Variable이 없습니다
      </span>
    </div>
  `;
}

// ============================================
// 이벤트 리스너 연결
// ============================================

function attachEventListeners(): void {
  // 노드 선택
  results.querySelectorAll('.violation-node').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const nodeId = (el as HTMLElement).dataset.nodeId;
      if (nodeId) {
        parent.postMessage({ 
          pluginMessage: { type: 'select-node', payload: { nodeId } } 
        }, '*');
      }
    });
  });

  // 개별 수정 버튼
  results.querySelectorAll('.btn-fix').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = el as HTMLElement;
      parent.postMessage({
        pluginMessage: {
          type: 'fix-color',
          payload: {
            nodeId: btn.dataset.nodeId,
            propertyType: btn.dataset.propertyType,
            paintIndex: parseInt(btn.dataset.paintIndex || '0'),
            variableId: btn.dataset.variableId,
          }
        }
      }, '*');
    });
  });
}

// ============================================
// 유틸리티
// ============================================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

---

## 5. 테스트 및 사용법

### 5.1 빌드 및 설치

```bash
# 의존성 설치
npm install

# 빌드
npm run build

# Figma에서 플러그인 로드
# Plugins → Development → Import plugin from manifest...
# manifest.json 파일 선택
```

### 5.2 Figma 파일 준비

1. **Color Variables 설정**
   - 파일에 Color Variables가 설정되어 있어야 합니다
   - Variables가 SSOT(Single Source of Truth)로 사용됩니다

2. **Color Palette 프레임 (선택)**
   - "컬러팔레트", "Color Palette", "Color Specimen" 이름이 포함된 프레임은 자동으로 스캔 제외됩니다

### 5.3 플러그인 사용

1. **플러그인 실행**
   - Plugins → Development → 디자인 시스템 Color Scanner
   - 실행 즉시 자동으로 현재 페이지 스캔

2. **결과 확인**
   - 📦 SSOT: 로드된 Color Variables 수
   - 📊 통계: 전체 색상, Variable 사용, 하드코딩, 준수율
   - ⚠️ 위반 목록: 하드코딩된 색상과 추천 Variable

3. **색상 수정**
   - 개별 수정: 각 항목의 "수정" 버튼 클릭
   - 일괄 수정: "모든 위반 색상 수정" 버튼 클릭

### 5.4 기능 테스트 시나리오

| 시나리오 | 예상 결과 |
|----------|-----------|
| Variables 없는 파일 | "Color Variables가 없습니다" 오류 메시지 |
| 모든 색상이 Variable 사용 | "완벽합니다!" 메시지 |
| 하드코딩 색상 포함 | 위반 목록 표시 + 추천 Variable |
| 회색 하드코딩 | Grayscale Variable 추천 |
| 파란색 하드코딩 | Blue 계열 Variable 추천 |
| 수정 버튼 클릭 | Variable로 바인딩 변경 |
| 노드 이름 클릭 | Figma에서 해당 노드 선택 |

---

## 빠른 시작 요약

```bash
# 1. 프로젝트 생성
mkdir design-system-color-scanner && cd design-system-color-scanner

# 2. 파일 생성 (manifest.json, package.json, tsconfig.json, webpack.config.js)
# 3. src 폴더 생성 및 코드 파일 생성

# 4. 설치 및 빌드
npm install
npm run build

# 5. Figma에서 테스트
# Plugins → Development → Import plugin from manifest...
```

---

## 향후 개선 아이디어

1. **다른 페이지 스캔**: 현재 페이지뿐 아니라 다른 페이지도 선택하여 스캔
2. **외부 파일 참조**: REST API로 다른 파일의 Variables를 SSOT로 사용
3. **리포트 내보내기**: CSV/JSON 형식으로 검사 결과 저장
4. **실시간 감시**: 색상 변경 시 자동으로 재검사
5. **무시 목록**: 특정 노드나 색상을 검사에서 제외
