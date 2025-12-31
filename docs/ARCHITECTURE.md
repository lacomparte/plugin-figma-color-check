# Figma Design System Color Checker - Architecture

> Figma 디자인 파일에서 디자인 시스템 컬러 팔레트 준수 여부를 검사하는 플러그인의 아키텍처 문서입니다.

---

## 목차

1. [개요](#1-개요)
2. [기술 스택](#2-기술-스택)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [핵심 기능](#4-핵심-기능)
5. [데이터 흐름](#5-데이터-흐름)
6. [컬러 매칭 알고리즘](#6-컬러-매칭-알고리즘)

---

## 1. 개요

### 1.1 플러그인 기능

| 기능 | 설명 |
|------|------|
| **팔레트 소스 선택** | Figma Variables 또는 특정 페이지에서 컬러 팔레트 로드 |
| **컬러 검사** | 선택한 요소 또는 페이지 전체에서 사용된 모든 색상 추출 |
| **위반 색상 탐지** | 디자인 시스템 컬러 팔레트에 정의되지 않은 색상 식별 |
| **스마트 추천** | 위반 색상에 대해 같은 색상 계열 내에서 가장 가까운 팔레트 색상 추천 |
| **자동 수정** | 추천된 색상으로 개별/일괄 변경 |

### 1.2 스마트 추천 규칙

| 입력 색상 계열 | 추천 범위 |
|---------------|----------|
| 회색/무채색 | Grayscale 계열 |
| 파란색 계열 | Blue 계열 |
| 빨간색 계열 | Red 계열 |
| 노란색 계열 | Yellow 계열 |
| 기타 색상 | 전체 팔레트에서 검색 |

---

## 2. 기술 스택

| 항목 | 기술 |
|------|------|
| **Language** | TypeScript 5.7 |
| **UI Framework** | React 19 |
| **Plugin API** | Figma Plugin API |
| **Build Tool** | Vite 5 |
| **Package Manager** | pnpm 9 |
| **Code Quality** | ESLint, Prettier |
| **CI/CD** | GitHub Actions |

---

## 3. 프로젝트 구조

```
src/
├── code.ts                    # Figma 플러그인 샌드박스 (메인 로직)
├── ui.html                    # UI 진입점
├── ui/
│   ├── App.tsx                # React 앱 루트
│   ├── main.tsx               # React 렌더링 진입점
│   ├── components/            # UI 컴포넌트
│   │   ├── ActionButtons/     # 스캔 버튼
│   │   ├── ColorItem/         # 색상 항목 표시
│   │   ├── Header/            # 헤더
│   │   ├── Loading/           # 로딩 스피너
│   │   ├── Message/           # 에러/성공 메시지
│   │   ├── PaletteSelector/   # 팔레트 선택 자동완성
│   │   ├── ResultList/        # 결과 목록
│   │   └── Stats/             # 통계 카드
│   ├── context/
│   │   └── ScanContext.tsx    # 상태 관리 (Context + useReducer)
│   ├── hooks/
│   │   ├── useDebounce.ts     # 디바운스 훅
│   │   └── useFigmaMessaging.ts # Figma 메시지 통신 훅
│   └── styles/
│       ├── global.css         # 글로벌 스타일
│       └── variables.css      # CSS 변수
├── tokens/
│   └── colors.ts              # 색상 토큰 타입 정의
├── types/
│   ├── plugin.ts              # 플러그인 메시지 타입
│   └── css.d.ts               # CSS 모듈 타입
└── utils/
    ├── colorUtils.ts          # 색상 유틸리티 함수
    └── colorCategory.ts       # 색상 계열 판단 로직
```

---

## 4. 핵심 기능

### 4.1 팔레트 소스

플러그인은 두 가지 소스에서 컬러 팔레트를 로드할 수 있습니다:

#### Figma Variables
```typescript
// Figma Variables API로 Color Variables 로드
const variables = await figma.variables.getLocalVariablesAsync('COLOR');
```

#### Page 기반 팔레트
```typescript
// 특정 페이지의 도형 Fill 색상 추출
await page.loadAsync();
const colors = extractColorsFromPage(page);
```

### 4.2 색상 검사 로직

```typescript
// 노드 트리 순회하며 색상 추출
function traverse(node: SceneNode): void {
  // fills 검사
  if ('fills' in node && node.fills !== figma.mixed) {
    for (const fill of node.fills) {
      if (fill.type === 'SOLID') {
        // 팔레트 매칭 검사
      }
    }
  }

  // strokes 검사
  if ('strokes' in node) {
    // ...
  }

  // 자식 노드 재귀 탐색
  if ('children' in node) {
    for (const child of node.children) {
      traverse(child);
    }
  }
}
```

### 4.3 색상 수정

```typescript
// Fill 색상 변경
const fills = [...node.fills];
fills[index] = {
  ...fills[index],
  color: {
    r: targetColor.rgb.r / 255,
    g: targetColor.rgb.g / 255,
    b: targetColor.rgb.b / 255,
  },
};
node.fills = fills;
```

---

## 5. 데이터 흐름

### 5.1 플러그인 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Figma Sandbox (code.ts)                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • Figma Plugin API 접근                             │   │
│  │  • 노드 탐색 및 색상 추출                            │   │
│  │  • 색상 수정                                         │   │
│  │  • Variables/Pages API                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↑↓ postMessage                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   UI (React iframe)                  │   │
│  │  • 사용자 인터페이스                                 │   │
│  │  • 상태 관리 (Context + useReducer)                  │   │
│  │  • 결과 표시 및 인터랙션                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 메시지 타입

#### UI → Code
```typescript
type PluginMessageToCode =
  | { type: 'scan-selection'; payload: ScanPayload }
  | { type: 'scan-page'; payload: ScanPayload }
  | { type: 'fix-color'; payload: ColorFixRequest }
  | { type: 'fix-all'; payload: FixAllPayload }
  | { type: 'select-node'; payload: SelectNodePayload }
  | { type: 'get-variable-collections' }
  | { type: 'get-pages' }
  | { type: 'go-to-page'; payload: GoToPagePayload }
  | { type: 'cancel' };
```

#### Code → UI
```typescript
type PluginMessageToUi =
  | { type: 'scan-result'; data: ScanResult }
  | { type: 'scan-result'; error: string }
  | { type: 'variable-collections'; data: VariableCollectionInfo[] }
  | { type: 'pages'; data: PageInfo[] };
```

---

## 6. 컬러 매칭 알고리즘

### 6.1 색상 계열 판단

HSV 색공간의 Hue 값을 기반으로 색상 계열을 판단합니다:

```typescript
function determineColorFamily(r: number, g: number, b: number): ColorFamily {
  // RGB → HSV 변환
  const { hue, saturation } = rgbToHsv(r, g, b);

  // 채도가 낮으면 무채색
  if (saturation < 0.1) {
    return 'grayscale';
  }

  // Hue 범위로 계열 판단
  if ((hue >= 0 && hue < 30) || hue >= 330) return 'red';
  if (hue >= 30 && hue < 75) return 'yellow';
  if (hue >= 200 && hue < 260) return 'blue';

  return 'other';
}
```

### 6.2 색상 거리 계산

RGB 유클리드 거리를 사용합니다:

```typescript
function colorDistance(c1: RGB, c2: RGB): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}
```

### 6.3 추천 로직

1. 입력 색상의 계열(family) 판단
2. 해당 계열의 팔레트 색상만 필터링
3. RGB 거리 기준 가장 가까운 색상 반환

```typescript
function findClosestColorInFamily(r: number, g: number, b: number): ColorToken | null {
  const family = determineColorFamily(r, g, b);
  const familyColors = filterColorsByFamily(family);

  let closest = null;
  let minDistance = Infinity;

  for (const color of familyColors) {
    const dist = colorDistance({ r, g, b }, color.rgb);
    if (dist < minDistance) {
      minDistance = dist;
      closest = color;
    }
  }

  return closest;
}
```

---

## 빌드 설정

### Vite 설정

프로젝트는 두 개의 Vite 설정 파일을 사용합니다:

- **vite.config.code.ts**: Figma 샌드박스 코드 빌드 (ES2015 타겟)
- **vite.config.ui.ts**: React UI 빌드 (vite-plugin-singlefile로 단일 HTML 생성)

```bash
# 개발 모드
pnpm dev

# 프로덕션 빌드
pnpm build
```

---

## 참고 자료

- [Figma Plugin API](https://www.figma.com/plugin-docs/)
- [Figma Variables API](https://www.figma.com/plugin-docs/api/figma-variables/)
- [React 19](https://react.dev/)
- [Vite](https://vitejs.dev/)
