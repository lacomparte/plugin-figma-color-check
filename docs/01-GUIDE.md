# 디자인 시스템 Color Scanner - Figma 플러그인 개발 가이드

> Figma Variables로 정의된 Color Palette를 SSOT(Single Source of Truth)로 삼아,
> 현재 페이지에서 사용된 색상을 자동 검사하고 위반 색상에 대해 추천하는 플러그인

---

## 목차

1. [개요](#1-개요)
2. [프로젝트 설정](#2-프로젝트-설정)
3. [핵심 로직 구현](#3-핵심-로직-구현)
4. [UI 구현](#4-ui-구현)
5. [테스트 및 사용법](#5-테스트-및-사용법)

---

## 1. 개요

### 1.1 플러그인 동작 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                      플러그인 실행                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: SSOT 색상 로드                                         │
│  ─────────────────────────────────────────────────────────────  │
│  figma.variables.getLocalVariablesAsync('COLOR')               │
│  → 모든 Color Variables를 SSOT로 저장                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: 현재 페이지 색상 스캔                                   │
│  ─────────────────────────────────────────────────────────────  │
│  현재 페이지의 모든 노드에서 fills, strokes 추출                │
│  → Variable 바인딩 여부 확인                                    │
│  → 하드코딩된 색상 식별                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: 비교 및 추천                                           │
│  ─────────────────────────────────────────────────────────────  │
│  하드코딩된 색상 vs SSOT Variables                              │
│  → 같은 색상 계열에서 가장 가까운 Variable 추천                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: 결과 표시                                              │
│  ─────────────────────────────────────────────────────────────  │
│  ✅ Variable 사용 색상: 정상                                    │
│  ⚠️ 하드코딩 색상: 위반 (추천 Variable 표시)                    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 핵심 기능

| 기능 | 설명 |
|------|------|
| **자동 SSOT 로드** | 파일의 Color Variables를 자동으로 SSOT로 인식 |
| **Variable 바인딩 검사** | 색상이 Variable에 연결되어 있는지 확인 |
| **하드코딩 탐지** | Variable 없이 직접 입력된 색상 식별 |
| **스마트 추천** | 하드코딩 색상과 가장 가까운 Variable 추천 (같은 계열 우선) |
| **원클릭 수정** | 추천된 Variable로 즉시 교체 |

### 1.3 파일 구조

```
design-system-color-scanner/
├── manifest.json
├── package.json
├── tsconfig.json
├── webpack.config.js
├── src/
│   ├── code.ts              # 메인 플러그인 로직
│   ├── ui.html              # UI 템플릿
│   ├── ui.ts                # UI 로직
│   └── utils/
│       ├── colorUtils.ts    # 색상 유틸리티
│       └── variableUtils.ts # Variable 관련 유틸리티
└── dist/
    ├── code.js
    └── ui.html
```

---

## 2. 프로젝트 설정

### 2.1 manifest.json

```json
{
  "name": "디자인 시스템 Color Scanner",
  "id": "design-system-color-scanner-plugin",
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "editorType": ["figma"],
  "documentAccess": "dynamic-page",
  "networkAccess": {
    "allowedDomains": ["none"]
  }
}
```

### 2.2 package.json

```json
{
  "name": "design-system-color-scanner",
  "version": "1.0.0",
  "description": "Figma Color Variables 기반 색상 검사 플러그인",
  "scripts": {
    "build": "webpack --mode=production",
    "watch": "webpack --mode=development --watch"
  },
  "devDependencies": {
    "@figma/plugin-typings": "^1.96.0",
    "css-loader": "^6.10.0",
    "html-webpack-plugin": "^5.6.0",
    "html-inline-script-webpack-plugin": "^3.2.1",
    "style-loader": "^3.3.4",
    "ts-loader": "^9.5.1",
    "typescript": "^5.4.0",
    "webpack": "^5.90.0",
    "webpack-cli": "^5.1.4"
  }
}
```

### 2.3 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "noEmit": false,
    "outDir": "./dist",
    "rootDir": "./src",
    "typeRoots": ["./node_modules/@types", "./node_modules/@figma"],
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

### 2.4 webpack.config.js

```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');

module.exports = (env, argv) => ({
  mode: argv.mode === 'production' ? 'production' : 'development',
  devtool: argv.mode === 'production' ? false : 'inline-source-map',

  entry: {
    code: './src/code.ts',
    ui: './src/ui.ts',
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },

  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './src/ui.html',
      filename: 'ui.html',
      chunks: ['ui'],
      inject: 'body',
      cache: false,
    }),
    new HtmlInlineScriptPlugin(),
  ],
});
```

### 2.5 설치 및 빌드

```bash
# 프로젝트 생성
mkdir design-system-color-scanner && cd design-system-color-scanner

# package.json 생성 후 의존성 설치
npm install

# 개발 모드 (watch)
npm run watch

# 프로덕션 빌드
npm run build
```

---

## 3. 핵심 로직 구현

### 3.1 색상 유틸리티 (src/utils/colorUtils.ts)

```typescript
// src/utils/colorUtils.ts

/**
 * 색상 계열 타입
 */
export type ColorFamily = 'grayscale' | 'blue' | 'red' | 'yellow' | 'green' | 'other';

/**
 * SSOT 색상 토큰 인터페이스
 */
export interface ColorToken {
  variableId: string;
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  opacity: number;
  family: ColorFamily;
}

/**
 * 검사 결과 인터페이스
 */
export interface ColorUsage {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  propertyType: 'fill' | 'stroke';
  paintIndex: number;
  hex: string;
  rgb: { r: number; g: number; b: number };
  opacity: number;
  family: ColorFamily;
  isBoundToVariable: boolean;
  boundVariableName?: string;
  suggestion?: {
    variableId: string;
    name: string;
    hex: string;
    distance: number;
  };
}

/**
 * Figma RGB (0-1) → HEX 변환
 */
export function figmaRgbToHex(r: number, g: number, b: number): string {
  const toHex = (val: number) => 
    Math.round(val * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * HEX → RGB (0-255) 변환
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

/**
 * 색상 계열 판단 (HSV 기반)
 */
export function determineColorFamily(r: number, g: number, b: number): ColorFamily {
  // 0-255 범위로 정규화
  const r255 = r > 1 ? r : Math.round(r * 255);
  const g255 = g > 1 ? g : Math.round(g * 255);
  const b255 = b > 1 ? b : Math.round(b * 255);

  const rNorm = r255 / 255;
  const gNorm = g255 / 255;
  const bNorm = b255 / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  // 채도 계산
  const saturation = max === 0 ? 0 : delta / max;
  
  // 채도가 낮으면 무채색
  if (saturation < 0.1) {
    return 'grayscale';
  }

  // Hue 계산
  let hue = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      hue = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      hue = (bNorm - rNorm) / delta + 2;
    } else {
      hue = (rNorm - gNorm) / delta + 4;
    }
  }
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  // Hue 범위로 색상 계열 판단
  if ((hue >= 0 && hue < 15) || hue >= 345) return 'red';
  if (hue >= 15 && hue < 45) return 'yellow'; // 주황 포함
  if (hue >= 45 && hue < 75) return 'yellow';
  if (hue >= 75 && hue < 165) return 'green';
  if (hue >= 165 && hue < 195) return 'other'; // cyan
  if (hue >= 195 && hue < 270) return 'blue';
  if (hue >= 270 && hue < 345) return 'other'; // purple/magenta

  return 'other';
}

/**
 * 두 색상 간의 거리 계산 (유클리드 RGB)
 */
export function colorDistance(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  // 0-255 범위로 정규화
  const r1 = c1.r > 1 ? c1.r : Math.round(c1.r * 255);
  const g1 = c1.g > 1 ? c1.g : Math.round(c1.g * 255);
  const b1 = c1.b > 1 ? c1.b : Math.round(c1.b * 255);
  
  const r2 = c2.r > 1 ? c2.r : Math.round(c2.r * 255);
  const g2 = c2.g > 1 ? c2.g : Math.round(c2.g * 255);
  const b2 = c2.b > 1 ? c2.b : Math.round(c2.b * 255);

  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
}

/**
 * 색상 계열 한글 이름
 */
export function getColorFamilyName(family: ColorFamily): string {
  const names: Record<ColorFamily, string> = {
    grayscale: 'Gray',
    blue: 'Blue',
    red: 'Red',
    yellow: 'Yellow',
    green: 'Green',
    other: 'Other',
  };
  return names[family];
}
```

### 3.2 Variable 유틸리티 (src/utils/variableUtils.ts)

```typescript
// src/utils/variableUtils.ts

import { 
  ColorToken, 
  figmaRgbToHex, 
  determineColorFamily, 
  colorDistance,
  ColorFamily 
} from './colorUtils';

/**
 * 로컬 Color Variables에서 SSOT 색상 토큰 로드
 */
export async function loadColorTokensFromVariables(): Promise<ColorToken[]> {
  const variables = await figma.variables.getLocalVariablesAsync('COLOR');
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  
  const tokens: ColorToken[] = [];

  for (const variable of variables) {
    const collection = collections.find(c => c.id === variable.variableCollectionId);
    const modeId = collection?.defaultModeId;

    if (!modeId) continue;

    const value = variable.valuesByMode[modeId];

    // Variable Alias인 경우 실제 값 추적
    let resolvedValue = value;
    if (typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
      const aliasedVar = await figma.variables.getVariableByIdAsync(value.id);
      if (aliasedVar) {
        const aliasCollection = collections.find(c => c.id === aliasedVar.variableCollectionId);
        const aliasModeId = aliasCollection?.defaultModeId;
        if (aliasModeId) {
          resolvedValue = aliasedVar.valuesByMode[aliasModeId];
        }
      }
    }

    // RGBA 객체인 경우
    if (resolvedValue && typeof resolvedValue === 'object' && 'r' in resolvedValue) {
      const rgba = resolvedValue as RGBA;
      const rgb = {
        r: Math.round(rgba.r * 255),
        g: Math.round(rgba.g * 255),
        b: Math.round(rgba.b * 255),
      };

      tokens.push({
        variableId: variable.id,
        name: variable.name,
        hex: figmaRgbToHex(rgba.r, rgba.g, rgba.b),
        rgb,
        opacity: rgba.a ?? 1,
        family: determineColorFamily(rgb.r, rgb.g, rgb.b),
      });
    }
  }

  return tokens;
}

/**
 * 같은 색상 계열 내에서 가장 가까운 토큰 찾기
 */
export function findClosestToken(
  rgb: { r: number; g: number; b: number },
  tokens: ColorToken[],
  preferSameFamily: boolean = true
): ColorToken | null {
  const family = determineColorFamily(rgb.r, rgb.g, rgb.b);
  
  // 같은 계열 토큰 필터링
  let candidates = preferSameFamily 
    ? tokens.filter(t => t.family === family)
    : tokens;

  // 같은 계열에 토큰이 없으면 전체에서 검색
  if (candidates.length === 0) {
    candidates = tokens;
  }

  let closest: ColorToken | null = null;
  let minDistance = Infinity;

  for (const token of candidates) {
    const dist = colorDistance(rgb, token.rgb);
    if (dist < minDistance) {
      minDistance = dist;
      closest = token;
    }
  }

  return closest;
}

/**
 * 정확히 일치하는 토큰 찾기
 */
export function findExactToken(
  rgb: { r: number; g: number; b: number },
  opacity: number,
  tokens: ColorToken[],
  tolerance: number = 2
): ColorToken | null {
  for (const token of tokens) {
    const dist = colorDistance(rgb, token.rgb);
    const opacityMatch = Math.abs(token.opacity - opacity) < 0.01;
    
    if (dist <= tolerance && opacityMatch) {
      return token;
    }
  }
  return null;
}
```

### 3.3 메인 플러그인 코드 (src/code.ts)

```typescript
// src/code.ts

import { 
  ColorToken, 
  ColorUsage, 
  figmaRgbToHex, 
  determineColorFamily,
  colorDistance 
} from './utils/colorUtils';
import { 
  loadColorTokensFromVariables, 
  findClosestToken,
  findExactToken 
} from './utils/variableUtils';

// ============================================
// 타입 정의
// ============================================

interface ScanResult {
  totalNodes: number;
  totalColors: number;
  boundColors: number;
  unboundColors: number;
  ssotTokens: ColorToken[];
  violations: ColorUsage[];
}

// ============================================
// 전역 상태
// ============================================

let ssotTokens: ColorToken[] = [];

// ============================================
// UI 초기화
// ============================================

figma.showUI(__html__, { 
  width: 450, 
  height: 650,
  themeColors: true 
});

// ============================================
// 플러그인 시작 시 자동 스캔
// ============================================

(async () => {
  await runScan();
})();

// ============================================
// 메시지 핸들러
// ============================================

figma.ui.onmessage = async (msg: { type: string; payload?: any }) => {
  switch (msg.type) {
    case 'rescan':
      await runScan();
      break;
    case 'fix-color':
      await fixColor(msg.payload);
      break;
    case 'fix-all':
      await fixAllColors(msg.payload);
      break;
    case 'select-node':
      selectNode(msg.payload.nodeId);
      break;
    case 'close':
      figma.closePlugin();
      break;
  }
};

// ============================================
// 메인 스캔 함수
// ============================================

async function runScan(): Promise<void> {
  figma.ui.postMessage({ type: 'scan-start' });

  try {
    // Step 1: SSOT 색상 토큰 로드
    ssotTokens = await loadColorTokensFromVariables();

    if (ssotTokens.length === 0) {
      figma.ui.postMessage({ 
        type: 'scan-error', 
        error: 'Color Variables가 없습니다. 먼저 Color Variables를 설정해주세요.' 
      });
      return;
    }

    // Step 2: 현재 페이지 스캔
    const result = await scanCurrentPage();

    // Step 3: 결과 전송
    figma.ui.postMessage({ 
      type: 'scan-result', 
      data: result 
    });

  } catch (error) {
    figma.ui.postMessage({ 
      type: 'scan-error', 
      error: `스캔 중 오류 발생: ${error}` 
    });
  }
}

// ============================================
// 페이지 스캔
// ============================================

async function scanCurrentPage(): Promise<ScanResult> {
  const page = figma.currentPage;
  const violations: ColorUsage[] = [];
  let totalNodes = 0;
  let totalColors = 0;
  let boundColors = 0;
  let unboundColors = 0;

  // 재귀 탐색 함수
  function traverse(node: SceneNode): void {
    totalNodes++;

    // Fills 검사
    if ('fills' in node && node.fills !== figma.mixed && Array.isArray(node.fills)) {
      node.fills.forEach((fill, index) => {
        if (fill.type === 'SOLID' && fill.visible !== false) {
          totalColors++;
          const usage = analyzePaint(node, fill, 'fill', index);
          
          if (usage.isBoundToVariable) {
            boundColors++;
          } else {
            unboundColors++;
            violations.push(usage);
          }
        }
      });
    }

    // Strokes 검사
    if ('strokes' in node && Array.isArray(node.strokes)) {
      node.strokes.forEach((stroke, index) => {
        if (stroke.type === 'SOLID' && stroke.visible !== false) {
          totalColors++;
          const usage = analyzePaint(node, stroke, 'stroke', index);
          
          if (usage.isBoundToVariable) {
            boundColors++;
          } else {
            unboundColors++;
            violations.push(usage);
          }
        }
      });
    }

    // 자식 노드 탐색
    if ('children' in node) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  // Color Palette 프레임 제외하고 스캔
  for (const child of page.children) {
    // "컬러팔레트" 또는 "Color Palette" 프레임은 스캔 제외
    if (child.name.toLowerCase().includes('컬러팔레트') || 
        child.name.toLowerCase().includes('color palette') ||
        child.name.toLowerCase().includes('color specimen')) {
      continue;
    }
    traverse(child);
  }

  return {
    totalNodes,
    totalColors,
    boundColors,
    unboundColors,
    ssotTokens,
    violations,
  };
}

// ============================================
// Paint 분석
// ============================================

function analyzePaint(
  node: SceneNode,
  paint: SolidPaint,
  propertyType: 'fill' | 'stroke',
  paintIndex: number
): ColorUsage {
  const { r, g, b } = paint.color;
  const opacity = paint.opacity ?? 1;
  const hex = figmaRgbToHex(r, g, b);
  const rgb = {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
  const family = determineColorFamily(rgb.r, rgb.g, rgb.b);

  // Variable 바인딩 확인
  let isBoundToVariable = false;
  let boundVariableName: string | undefined;

  if (paint.boundVariables?.color) {
    isBoundToVariable = true;
    const varId = paint.boundVariables.color.id;
    const variable = figma.variables.getVariableById(varId);
    boundVariableName = variable?.name;
  }

  // 추천 Variable 찾기 (바인딩 안 된 경우)
  let suggestion: ColorUsage['suggestion'];
  if (!isBoundToVariable) {
    // 먼저 정확히 일치하는 토큰 찾기
    const exactMatch = findExactToken(rgb, opacity, ssotTokens, 3);
    
    if (exactMatch) {
      suggestion = {
        variableId: exactMatch.variableId,
        name: exactMatch.name,
        hex: exactMatch.hex,
        distance: 0,
      };
    } else {
      // 같은 계열에서 가장 가까운 토큰 찾기
      const closest = findClosestToken(rgb, ssotTokens, true);
      if (closest) {
        suggestion = {
          variableId: closest.variableId,
          name: closest.name,
          hex: closest.hex,
          distance: Math.round(colorDistance(rgb, closest.rgb)),
        };
      }
    }
  }

  return {
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    propertyType,
    paintIndex,
    hex,
    rgb,
    opacity,
    family,
    isBoundToVariable,
    boundVariableName,
    suggestion,
  };
}

// ============================================
// 색상 수정
// ============================================

async function fixColor(payload: {
  nodeId: string;
  propertyType: 'fill' | 'stroke';
  paintIndex: number;
  variableId: string;
}): Promise<void> {
  const node = figma.getNodeById(payload.nodeId) as SceneNode;
  if (!node) {
    figma.notify('노드를 찾을 수 없습니다.', { error: true });
    return;
  }

  const variable = await figma.variables.getVariableByIdAsync(payload.variableId);
  if (!variable) {
    figma.notify('Variable을 찾을 수 없습니다.', { error: true });
    return;
  }

  try {
    if (payload.propertyType === 'fill' && 'fills' in node) {
      const fills = [...(node.fills as Paint[])];
      const paint = fills[payload.paintIndex];
      
      if (paint && paint.type === 'SOLID') {
        // Variable 바인딩
        const newPaint = figma.variables.setBoundVariableForPaint(
          paint,
          'color',
          variable
        );
        fills[payload.paintIndex] = newPaint;
        (node as GeometryMixin).fills = fills;
      }
    }

    if (payload.propertyType === 'stroke' && 'strokes' in node) {
      const strokes = [...(node.strokes as Paint[])];
      const paint = strokes[payload.paintIndex];
      
      if (paint && paint.type === 'SOLID') {
        const newPaint = figma.variables.setBoundVariableForPaint(
          paint,
          'color',
          variable
        );
        strokes[payload.paintIndex] = newPaint;
        (node as GeometryMixin).strokes = strokes;
      }
    }

    figma.notify(`✅ ${variable.name}으로 변경되었습니다.`);
    
    // 재스캔
    await runScan();

  } catch (error) {
    figma.notify('색상 변경 중 오류가 발생했습니다.', { error: true });
    console.error(error);
  }
}

// ============================================
// 모든 위반 색상 수정
// ============================================

async function fixAllColors(payload: {
  fixes: Array<{
    nodeId: string;
    propertyType: 'fill' | 'stroke';
    paintIndex: number;
    variableId: string;
  }>;
}): Promise<void> {
  let successCount = 0;
  let failCount = 0;

  for (const fix of payload.fixes) {
    const node = figma.getNodeById(fix.nodeId) as SceneNode;
    if (!node) {
      failCount++;
      continue;
    }

    const variable = await figma.variables.getVariableByIdAsync(fix.variableId);
    if (!variable) {
      failCount++;
      continue;
    }

    try {
      if (fix.propertyType === 'fill' && 'fills' in node) {
        const fills = [...(node.fills as Paint[])];
        const paint = fills[fix.paintIndex];
        
        if (paint && paint.type === 'SOLID') {
          const newPaint = figma.variables.setBoundVariableForPaint(
            paint,
            'color',
            variable
          );
          fills[fix.paintIndex] = newPaint;
          (node as GeometryMixin).fills = fills;
          successCount++;
        }
      }

      if (fix.propertyType === 'stroke' && 'strokes' in node) {
        const strokes = [...(node.strokes as Paint[])];
        const paint = strokes[fix.paintIndex];
        
        if (paint && paint.type === 'SOLID') {
          const newPaint = figma.variables.setBoundVariableForPaint(
            paint,
            'color',
            variable
          );
          strokes[fix.paintIndex] = newPaint;
          (node as GeometryMixin).strokes = strokes;
          successCount++;
        }
      }
    } catch (error) {
      failCount++;
      console.error(error);
    }
  }

  figma.notify(`✅ ${successCount}개 수정 완료` + (failCount > 0 ? `, ⚠️ ${failCount}개 실패` : ''));
  
  // 재스캔
  await runScan();
}

// ============================================
// 노드 선택
// ============================================

function selectNode(nodeId: string): void {
  const node = figma.getNodeById(nodeId) as SceneNode;
  if (node) {
    figma.currentPage.selection = [node];
    figma.viewport.scrollAndZoomIntoView([node]);
  }
}
```
