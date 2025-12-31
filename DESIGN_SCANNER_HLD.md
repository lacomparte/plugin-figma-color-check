# 디자인 시스템 컬러 체커 Figma 플러그인 개발 가이드

> 디자인 시스템의 컬러 팔레트 준수 여부를 검사하고, 규정 외 색상 사용 시 가장 가까운 팔레트 색상을 추천하는 Figma 플러그인 개발 가이드입니다.

---

## 목차

1. [개요](#1-개요)
2. [사전 준비](#2-사전-준비)
3. [컬러 토큰 정의](#3-컬러-토큰-정의)
4. [Figma 플러그인 프로젝트 설정](#4-figma-플러그인-프로젝트-설정)
5. [핵심 로직 구현](#5-핵심-로직-구현) - `02-GUIDE-CORE-LOGIC.md`
6. [UI 구현](#6-ui-구현) - `03-GUIDE-UI.md`
7. [테스트 및 배포](#7-테스트-및-배포) - `04-GUIDE-DEPLOY.md`

---

## 1. 개요

### 1.1 플러그인 기능

| 기능               | 설명                                                                    |
| ------------------ | ----------------------------------------------------------------------- |
| **컬러 검사**      | 선택한 요소(또는 페이지 전체)에서 사용된 모든 색상을 추출               |
| **위반 색상 탐지** | 디자인 시스템 컬러 팔레트에 정의되지 않은 색상 식별                           |
| **스마트 추천**    | 위반 색상에 대해 **같은 색상 계열** 내에서 가장 가까운 팔레트 색상 추천 |
| **자동 수정**      | 추천된 색상으로 일괄 변경 기능                                          |

### 1.2 스마트 추천 규칙

| 입력 색상 계열     | 추천 범위                      |
| ------------------ | ------------------------------ |
| 회색/무채색        | Grayscale 계열 (Black ~ White) |
| 파란색 계열        | Blue, #blue, Blue 10%          |
| 빨간색 계열        | Red, #red, Red 10%             |
| 노란색/주황색 계열 | Yellow                         |
| 기타 색상          | 전체 팔레트에서 검색           |

### 1.3 기술 스택

- **언어**: TypeScript
- **API**: Figma Plugin API
- **UI**: HTML/CSS (Plugin UI)
- **빌드**: Webpack

---

## 2. 사전 준비

### 2.1 필수 도구 설치

```bash
# Node.js 설치 (v18 이상 권장)
# https://nodejs.org 에서 다운로드

# 설치 확인
node -v   # v18.x.x 이상
npm -v    # v9.x.x 이상
```

### 2.2 Figma Desktop App

플러그인 개발은 **Desktop App에서만** 가능합니다.

1. [Figma Desktop App](https://www.figma.com/downloads/) 다운로드
2. 설치 및 로그인
3. Hot Reload 활성화: **Preferences** → **Plugins** → **Hot reload plugin** 체크

### 2.3 VS Code 확장 프로그램 (권장)

- ESLint
- Prettier
- TypeScript and JavaScript Language Features

---

## 3. 컬러 토큰 정의

### 3.1 컬러 팔레트 구조

스크린샷 기반으로 정리한 디자인 시스템 컬러 팔레트입니다.

#### Default · Grayscale color

| Name    | HEX     | RGB             |
| ------- | ------- | --------------- |
| Black   | #000000 | (0, 0, 0)       |
| Gray700 | #2A2A2A | (42, 42, 42)    |
| Gray600 | #666666 | (102, 102, 102) |
| Gray500 | #8A8A8A | (138, 138, 138) |
| Gray400 | #CCCCCC | (204, 204, 204) |
| Gray300 | #E0E0E0 | (224, 224, 224) |
| Gray200 | #EBEBEB | (235, 235, 235) |
| Gray100 | #F5F5F5 | (245, 245, 245) |
| White   | #FFFFFF | (255, 255, 255) |

#### Semantic · Highlight color

| Name      | HEX             | RGB                        |
| --------- | --------------- | -------------------------- |
| Blue      | #245EFF         | (36, 94, 255)              |
| Red       | #F31110         | (243, 17, 16)              |
| Yellow    | #FA9200         | (250, 146, 0)              |
| Highlight | Linear Gradient | #A3FBFB → #245EFF → #7CEFF |

#### Label color

| Name      | HEX     | RGB            |
| --------- | ------- | -------------- |
| #darkgray | #4A4A4A | (74, 74, 74)   |
| #blue     | #3A6EFF | (58, 110, 255) |
| #red      | #F73C3B | (247, 60, 59)  |

#### Opacity variants

| Name        | Base HEX | Opacity |
| ----------- | -------- | ------- |
| Black 80%   | #000000  | 80%     |
| Black 60%   | #000000  | 60%     |
| Black 40%   | #000000  | 40%     |
| White 80%   | #FFFFFF  | 80%     |
| White 60%   | #FFFFFF  | 60%     |
| White 40%   | #FFFFFF  | 40%     |
| Gray500 30% | #8A8A8A  | 30%     |
| Gray500 10% | #8A8A8A  | 10%     |
| Blue 10%    | #245EFF  | 10%     |
| Red 10%     | #F31110  | 10%     |

---

## 4. Figma 플러그인 프로젝트 설정

### 4.1 플러그인 생성

1. Figma Desktop App 실행
2. 새 디자인 파일 생성
3. 메뉴: **Plugins** → **Development** → **New plugin...**
4. **Figma design** 선택
5. 플러그인 이름 입력: `디자인 시스템 Color Checker`
6. **Custom UI** 선택
7. 원하는 위치에 저장

### 4.2 프로젝트 구조

```
design-system-color-checker/
├── manifest.json          # 플러그인 설정 파일
├── package.json           # npm 의존성
├── tsconfig.json          # TypeScript 설정
├── webpack.config.js      # Webpack 번들링 설정
├── src/
│   ├── code.ts            # 메인 플러그인 로직 (Figma API)
│   ├── ui.html            # 플러그인 UI
│   ├── ui.ts              # UI 로직
│   ├── tokens/
│   │   └── colors.ts      # 컬러 토큰 정의
│   └── utils/
│       ├── colorUtils.ts  # 색상 유틸리티 함수
│       └── colorCategory.ts # 색상 계열 판단 로직
└── dist/                  # 빌드 결과물
    ├── code.js
    └── ui.html
```

### 4.3 manifest.json

```json
{
  "name": "디자인 시스템 Color Checker",
  "id": "design-system-color-checker-plugin-id",
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

### 4.4 package.json

```json
{
  "name": "design-system-color-checker",
  "version": "1.0.0",
  "description": "디자인 시스템 컬러 팔레트 준수 여부 검사 플러그인",
  "scripts": {
    "build": "webpack --mode=production",
    "watch": "webpack --mode=development --watch",
    "lint": "eslint src/**/*.ts"
  },
  "devDependencies": {
    "@figma/plugin-typings": "^1.96.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "css-loader": "^6.10.0",
    "eslint": "^8.57.0",
    "html-webpack-plugin": "^5.6.0",
    "html-inline-script-webpack-plugin": "^3.2.1",
    "mini-css-extract-plugin": "^2.8.0",
    "style-loader": "^3.3.4",
    "ts-loader": "^9.5.1",
    "typescript": "^5.4.0",
    "webpack": "^5.90.0",
    "webpack-cli": "^5.1.4"
  }
}
```

### 4.5 tsconfig.json

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
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 4.6 webpack.config.js

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

### 4.7 의존성 설치 및 빌드

```bash
# 의존성 설치
npm install

# 개발 모드 (watch)
npm run watch

# 프로덕션 빌드
npm run build
```

---

다음 문서: [02-GUIDE-CORE-LOGIC.md](./02-GUIDE-CORE-LOGIC.md)

# 디자인 시스템 Color Checker - Part 2: 핵심 로직 구현

---

## 5. 핵심 로직 구현

### 5.1 컬러 토큰 정의 (src/tokens/colors.ts)

```typescript
// src/tokens/colors.ts

export interface ColorToken {
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  opacity?: number;
  category: ColorCategory;
}

export type ColorCategory =
  | 'grayscale'
  | 'semantic-blue'
  | 'semantic-red'
  | 'semantic-yellow'
  | 'label'
  | 'opacity';

// ===========================================
// 디자인 시스템 컬러 토큰 정의
// ===========================================

export const MDS_COLORS: ColorToken[] = [
  // ─────────────────────────────────────────
  // Default · Grayscale color
  // ─────────────────────────────────────────
  {
    name: 'Black',
    hex: '#000000',
    rgb: { r: 0, g: 0, b: 0 },
    category: 'grayscale',
  },
  {
    name: 'Gray700',
    hex: '#2A2A2A',
    rgb: { r: 42, g: 42, b: 42 },
    category: 'grayscale',
  },
  {
    name: 'Gray600',
    hex: '#666666',
    rgb: { r: 102, g: 102, b: 102 },
    category: 'grayscale',
  },
  {
    name: 'Gray500',
    hex: '#8A8A8A',
    rgb: { r: 138, g: 138, b: 138 },
    category: 'grayscale',
  },
  {
    name: 'Gray400',
    hex: '#CCCCCC',
    rgb: { r: 204, g: 204, b: 204 },
    category: 'grayscale',
  },
  {
    name: 'Gray300',
    hex: '#E0E0E0',
    rgb: { r: 224, g: 224, b: 224 },
    category: 'grayscale',
  },
  {
    name: 'Gray200',
    hex: '#EBEBEB',
    rgb: { r: 235, g: 235, b: 235 },
    category: 'grayscale',
  },
  {
    name: 'Gray100',
    hex: '#F5F5F5',
    rgb: { r: 245, g: 245, b: 245 },
    category: 'grayscale',
  },
  {
    name: 'White',
    hex: '#FFFFFF',
    rgb: { r: 255, g: 255, b: 255 },
    category: 'grayscale',
  },

  // ─────────────────────────────────────────
  // Semantic · Highlight color
  // ─────────────────────────────────────────
  {
    name: 'Blue',
    hex: '#245EFF',
    rgb: { r: 36, g: 94, b: 255 },
    category: 'semantic-blue',
  },
  {
    name: 'Red',
    hex: '#F31110',
    rgb: { r: 243, g: 17, b: 16 },
    category: 'semantic-red',
  },
  {
    name: 'Yellow',
    hex: '#FA9200',
    rgb: { r: 250, g: 146, b: 0 },
    category: 'semantic-yellow',
  },

  // ─────────────────────────────────────────
  // Label color
  // ─────────────────────────────────────────
  {
    name: '#darkgray',
    hex: '#4A4A4A',
    rgb: { r: 74, g: 74, b: 74 },
    category: 'label',
  },
  {
    name: '#blue',
    hex: '#3A6EFF',
    rgb: { r: 58, g: 110, b: 255 },
    category: 'label',
  },
  {
    name: '#red',
    hex: '#F73C3B',
    rgb: { r: 247, g: 60, b: 59 },
    category: 'label',
  },

  // ─────────────────────────────────────────
  // Opacity variants
  // ─────────────────────────────────────────
  {
    name: 'Black 80%',
    hex: '#000000',
    rgb: { r: 0, g: 0, b: 0 },
    opacity: 0.8,
    category: 'opacity',
  },
  {
    name: 'Black 60%',
    hex: '#000000',
    rgb: { r: 0, g: 0, b: 0 },
    opacity: 0.6,
    category: 'opacity',
  },
  {
    name: 'Black 40%',
    hex: '#000000',
    rgb: { r: 0, g: 0, b: 0 },
    opacity: 0.4,
    category: 'opacity',
  },
  {
    name: 'White 80%',
    hex: '#FFFFFF',
    rgb: { r: 255, g: 255, b: 255 },
    opacity: 0.8,
    category: 'opacity',
  },
  {
    name: 'White 60%',
    hex: '#FFFFFF',
    rgb: { r: 255, g: 255, b: 255 },
    opacity: 0.6,
    category: 'opacity',
  },
  {
    name: 'White 40%',
    hex: '#FFFFFF',
    rgb: { r: 255, g: 255, b: 255 },
    opacity: 0.4,
    category: 'opacity',
  },
  {
    name: 'Gray500 30%',
    hex: '#8A8A8A',
    rgb: { r: 138, g: 138, b: 138 },
    opacity: 0.3,
    category: 'opacity',
  },
  {
    name: 'Gray500 10%',
    hex: '#8A8A8A',
    rgb: { r: 138, g: 138, b: 138 },
    opacity: 0.1,
    category: 'opacity',
  },
  {
    name: 'Blue 10%',
    hex: '#245EFF',
    rgb: { r: 36, g: 94, b: 255 },
    opacity: 0.1,
    category: 'opacity',
  },
  {
    name: 'Red 10%',
    hex: '#F31110',
    rgb: { r: 243, g: 17, b: 16 },
    opacity: 0.1,
    category: 'opacity',
  },
];
```

---

### 5.2 색상 계열 판단 로직 (src/utils/colorCategory.ts)

```typescript
// src/utils/colorCategory.ts

export type ColorFamily = 'grayscale' | 'blue' | 'red' | 'yellow' | 'other';

/**
 * RGB 색상이 어떤 계열인지 판단
 * HSV 변환을 통해 색조(Hue)와 채도(Saturation)로 계열 판단
 *
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns ColorFamily
 */
export function determineColorFamily(
  r: number,
  g: number,
  b: number
): ColorFamily {
  // RGB를 0-1 범위로 정규화
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  // 채도(Saturation) 계산 - max가 0이면 채도도 0
  const saturation = max === 0 ? 0 : delta / max;

  // 채도가 매우 낮으면 무채색(grayscale)
  // 채도 10% 미만은 무채색으로 판단
  if (saturation < 0.1) {
    return 'grayscale';
  }

  // Hue 계산 (0-360도)
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
  // ┌─────────────────────────────────────────┐
  // │ Hue 범위 기준:                          │
  // │ - 빨강:   0° ~ 30°, 330° ~ 360°        │
  // │ - 주황/노랑: 30° ~ 75°                 │
  // │ - 초록:  75° ~ 165° (미사용)           │
  // │ - 파랑: 200° ~ 260°                    │
  // │ - 기타: 그 외 범위                      │
  // └─────────────────────────────────────────┘

  if ((hue >= 0 && hue < 30) || hue >= 330) {
    return 'red';
  } else if (hue >= 30 && hue < 75) {
    return 'yellow';
  } else if (hue >= 200 && hue < 260) {
    return 'blue';
  }

  return 'other';
}

/**
 * ColorFamily를 한국어 이름으로 변환
 */
export function getColorFamilyName(family: ColorFamily): string {
  const names: Record<ColorFamily, string> = {
    grayscale: '회색 계열',
    blue: '파란색 계열',
    red: '빨간색 계열',
    yellow: '노란색 계열',
    other: '기타',
  };
  return names[family];
}
```

---

### 5.3 색상 유틸리티 함수 (src/utils/colorUtils.ts)

```typescript
// src/utils/colorUtils.ts

import { MDS_COLORS, ColorToken } from '../tokens/colors';
import { determineColorFamily, ColorFamily } from './colorCategory';

/**
 * Figma RGB (0-1 범위) → HEX 변환
 */
export function figmaRgbToHex(r: number, g: number, b: number): string {
  const toHex = (val: number) => {
    const hex = Math.round(val * 255)
      .toString(16)
      .padStart(2, '0');
    return hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * HEX → RGB (0-255) 변환
 */
export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * 두 색상 간의 유클리드 거리 계산 (RGB 공간)
 * 거리가 작을수록 색상이 유사함
 */
export function colorDistance(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
  );
}

/**
 * 팔레트에서 정확히 일치하는 색상 찾기
 *
 * @param r - Figma RGB Red (0-1)
 * @param g - Figma RGB Green (0-1)
 * @param b - Figma RGB Blue (0-1)
 * @param opacity - 투명도 (0-1)
 */
export function findExactColor(
  r: number,
  g: number,
  b: number,
  opacity?: number
): ColorToken | null {
  const r255 = Math.round(r * 255);
  const g255 = Math.round(g * 255);
  const b255 = Math.round(b * 255);

  return (
    MDS_COLORS.find((color) => {
      const rgbMatch =
        color.rgb.r === r255 && color.rgb.g === g255 && color.rgb.b === b255;

      // Opacity가 정의된 토큰인 경우
      if (opacity !== undefined && color.opacity !== undefined) {
        return rgbMatch && Math.abs(color.opacity - opacity) < 0.01;
      }

      // Opacity가 없는 일반 토큰
      return rgbMatch && color.opacity === undefined;
    }) || null
  );
}

/**
 * 같은 색상 계열 내에서 가장 가까운 팔레트 색상 찾기
 *
 * 핵심 로직:
 * 1. 입력 색상의 계열(grayscale/blue/red/yellow/other) 판단
 * 2. 해당 계열의 팔레트 색상들만 필터링
 * 3. 필터링된 색상 중 가장 가까운 색상 반환
 */
export function findClosestColorInFamily(
  r: number,
  g: number,
  b: number,
  opacity?: number
): { color: ColorToken; distance: number } | null {
  const r255 = Math.round(r * 255);
  const g255 = Math.round(g * 255);
  const b255 = Math.round(b * 255);

  // Step 1: 입력 색상의 계열 판단
  const family = determineColorFamily(r255, g255, b255);

  // Step 2: 해당 계열의 색상들만 필터링
  const familyColors = filterColorsByFamily(family);

  if (familyColors.length === 0) {
    // 해당 계열에 색상이 없으면 전체에서 검색
    return findClosestColorGlobal(r, g, b, opacity);
  }

  // Step 3: 가장 가까운 색상 찾기
  let closestColor: ColorToken | null = null;
  let minDistance = Infinity;

  for (const color of familyColors) {
    const dist = colorDistance({ r: r255, g: g255, b: b255 }, color.rgb);

    if (dist < minDistance) {
      minDistance = dist;
      closestColor = color;
    }
  }

  return closestColor ? { color: closestColor, distance: minDistance } : null;
}

/**
 * 색상 계열에 따른 팔레트 색상 필터링
 */
function filterColorsByFamily(family: ColorFamily): ColorToken[] {
  return MDS_COLORS.filter((color) => {
    switch (family) {
      case 'grayscale':
        // Grayscale: grayscale 카테고리 + #darkgray + Black/White/Gray Opacity
        return (
          color.category === 'grayscale' ||
          (color.category === 'label' && color.name === '#darkgray') ||
          (color.category === 'opacity' &&
            (color.name.includes('Black') ||
              color.name.includes('White') ||
              color.name.includes('Gray')))
        );

      case 'blue':
        // Blue: semantic-blue + #blue + Blue 10%
        return (
          color.category === 'semantic-blue' ||
          (color.category === 'label' && color.name === '#blue') ||
          (color.category === 'opacity' && color.name.includes('Blue'))
        );

      case 'red':
        // Red: semantic-red + #red + Red 10%
        return (
          color.category === 'semantic-red' ||
          (color.category === 'label' && color.name === '#red') ||
          (color.category === 'opacity' && color.name.includes('Red'))
        );

      case 'yellow':
        // Yellow: semantic-yellow만
        return color.category === 'semantic-yellow';

      default:
        // 'other' 계열은 전체 팔레트
        return true;
    }
  });
}

/**
 * 전체 팔레트에서 가장 가까운 색상 찾기 (fallback)
 */
export function findClosestColorGlobal(
  r: number,
  g: number,
  b: number,
  opacity?: number
): { color: ColorToken; distance: number } | null {
  const r255 = Math.round(r * 255);
  const g255 = Math.round(g * 255);
  const b255 = Math.round(b * 255);

  let closestColor: ColorToken | null = null;
  let minDistance = Infinity;

  for (const color of MDS_COLORS) {
    const dist = colorDistance({ r: r255, g: g255, b: b255 }, color.rgb);

    if (dist < minDistance) {
      minDistance = dist;
      closestColor = color;
    }
  }

  return closestColor ? { color: closestColor, distance: minDistance } : null;
}

/**
 * 색상이 팔레트에 있는지 확인
 *
 * @param tolerance - 허용 오차 (RGB 거리)
 */
export function isColorInPalette(
  r: number,
  g: number,
  b: number,
  opacity?: number,
  tolerance: number = 0
): boolean {
  const exactMatch = findExactColor(r, g, b, opacity);
  if (exactMatch) return true;

  if (tolerance > 0) {
    const closest = findClosestColorInFamily(r, g, b, opacity);
    return closest !== null && closest.distance <= tolerance;
  }

  return false;
}
```

---

### 5.4 메인 플러그인 코드 (src/code.ts)

```typescript
// src/code.ts

import {
  figmaRgbToHex,
  findExactColor,
  findClosestColorInFamily,
  isColorInPalette,
} from './utils/colorUtils';
import { determineColorFamily } from './utils/colorCategory';
import { MDS_COLORS } from './tokens/colors';

// ============================================
// 타입 정의
// ============================================

interface ColorUsage {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  propertyType: 'fill' | 'stroke';
  color: {
    r: number;
    g: number;
    b: number;
    opacity?: number;
  };
  hex: string;
  isValid: boolean;
  colorFamily: string;
  suggestion?: {
    name: string;
    hex: string;
    distance: number;
  };
}

interface ScanResult {
  totalNodes: number;
  totalColors: number;
  validColors: number;
  invalidColors: number;
  colorUsages: ColorUsage[];
}

// ============================================
// UI 초기화
// ============================================

figma.showUI(__html__, {
  width: 420,
  height: 600,
  themeColors: true,
});

// ============================================
// 메시지 핸들러
// ============================================

figma.ui.onmessage = async (msg: { type: string; payload?: any }) => {
  switch (msg.type) {
    case 'scan-selection':
      await scanSelection();
      break;
    case 'scan-page':
      await scanCurrentPage();
      break;
    case 'fix-color':
      await fixColor(msg.payload);
      break;
    case 'fix-all':
      await fixAllColors(msg.payload);
      break;
    case 'select-node':
      await selectNode(msg.payload.nodeId);
      break;
    case 'cancel':
      figma.closePlugin();
      break;
  }
};

// ============================================
// 스캔 함수들
// ============================================

/**
 * 선택한 요소 스캔
 */
async function scanSelection(): Promise<void> {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'scan-result',
      error: '선택된 요소가 없습니다. 검사할 프레임이나 요소를 선택해주세요.',
    });
    return;
  }

  const result = await scanNodes(selection);
  figma.ui.postMessage({ type: 'scan-result', data: result });
}

/**
 * 현재 페이지 전체 스캔
 */
async function scanCurrentPage(): Promise<void> {
  const page = figma.currentPage;
  const result = await scanNodes(page.children);
  figma.ui.postMessage({ type: 'scan-result', data: result });
}

/**
 * 노드 배열 스캔
 */
async function scanNodes(nodes: readonly SceneNode[]): Promise<ScanResult> {
  const colorUsages: ColorUsage[] = [];
  let totalNodes = 0;

  // 재귀적으로 모든 노드 탐색
  function traverse(node: SceneNode): void {
    totalNodes++;

    // fills 검사 (도형, 프레임 등의 배경색)
    if ('fills' in node && node.fills !== figma.mixed) {
      const fills = node.fills as readonly Paint[];
      for (const fill of fills) {
        if (fill.type === 'SOLID' && fill.visible !== false) {
          const usage = createColorUsage(node, fill, 'fill');
          colorUsages.push(usage);
        }
      }
    }

    // strokes 검사 (테두리 색상)
    if ('strokes' in node) {
      const strokes = node.strokes as readonly Paint[];
      for (const stroke of strokes) {
        if (stroke.type === 'SOLID' && stroke.visible !== false) {
          const usage = createColorUsage(node, stroke, 'stroke');
          colorUsages.push(usage);
        }
      }
    }

    // 자식 노드 탐색 (재귀)
    if ('children' in node) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  // 모든 노드 탐색 시작
  for (const node of nodes) {
    traverse(node);
  }

  // 통계 계산
  const validColors = colorUsages.filter((u) => u.isValid).length;
  const invalidColors = colorUsages.filter((u) => !u.isValid).length;

  return {
    totalNodes,
    totalColors: colorUsages.length,
    validColors,
    invalidColors,
    colorUsages: colorUsages.filter((u) => !u.isValid), // 위반 색상만 반환
  };
}

/**
 * ColorUsage 객체 생성
 */
function createColorUsage(
  node: SceneNode,
  paint: SolidPaint,
  propertyType: 'fill' | 'stroke'
): ColorUsage {
  const { r, g, b } = paint.color;
  const opacity = paint.opacity;
  const hex = figmaRgbToHex(r, g, b);

  // 허용 오차 2로 팔레트 검사 (약간의 색상 차이 허용)
  const isValid = isColorInPalette(r, g, b, opacity, 2);

  // 색상 계열 판단
  const r255 = Math.round(r * 255);
  const g255 = Math.round(g * 255);
  const b255 = Math.round(b * 255);
  const colorFamily = determineColorFamily(r255, g255, b255);

  let suggestion;
  if (!isValid) {
    const closest = findClosestColorInFamily(r, g, b, opacity);
    if (closest) {
      suggestion = {
        name: closest.color.name,
        hex: closest.color.hex,
        distance: Math.round(closest.distance),
      };
    }
  }

  return {
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    propertyType,
    color: { r, g, b, opacity },
    hex,
    isValid,
    colorFamily,
    suggestion,
  };
}

// ============================================
// 색상 수정 함수들
// ============================================

/**
 * 단일 색상 수정
 */
async function fixColor(payload: {
  nodeId: string;
  propertyType: 'fill' | 'stroke';
  originalHex: string;
  targetHex: string;
}): Promise<void> {
  const node = figma.getNodeById(payload.nodeId) as SceneNode;

  if (!node) {
    figma.notify('노드를 찾을 수 없습니다.', { error: true });
    return;
  }

  const targetColor = MDS_COLORS.find(
    (c) => c.hex.toUpperCase() === payload.targetHex.toUpperCase()
  );

  if (!targetColor) {
    figma.notify('대상 색상을 찾을 수 없습니다.', { error: true });
    return;
  }

  try {
    // Fill 수정
    if (payload.propertyType === 'fill' && 'fills' in node) {
      const fills = JSON.parse(JSON.stringify(node.fills)) as Paint[];
      const updatedFills = fills.map((fill) => {
        if (fill.type === 'SOLID') {
          const currentHex = figmaRgbToHex(
            fill.color.r,
            fill.color.g,
            fill.color.b
          );
          if (currentHex.toUpperCase() === payload.originalHex.toUpperCase()) {
            return {
              ...fill,
              color: {
                r: targetColor.rgb.r / 255,
                g: targetColor.rgb.g / 255,
                b: targetColor.rgb.b / 255,
              },
              opacity: targetColor.opacity ?? fill.opacity,
            };
          }
        }
        return fill;
      });
      (node as GeometryMixin).fills = updatedFills;
    }

    // Stroke 수정
    if (payload.propertyType === 'stroke' && 'strokes' in node) {
      const strokes = JSON.parse(JSON.stringify(node.strokes)) as Paint[];
      const updatedStrokes = strokes.map((stroke) => {
        if (stroke.type === 'SOLID') {
          const currentHex = figmaRgbToHex(
            stroke.color.r,
            stroke.color.g,
            stroke.color.b
          );
          if (currentHex.toUpperCase() === payload.originalHex.toUpperCase()) {
            return {
              ...stroke,
              color: {
                r: targetColor.rgb.r / 255,
                g: targetColor.rgb.g / 255,
                b: targetColor.rgb.b / 255,
              },
              opacity: targetColor.opacity ?? stroke.opacity,
            };
          }
        }
        return stroke;
      });
      (node as GeometryMixin).strokes = updatedStrokes;
    }

    figma.notify(`색상이 ${targetColor.name}으로 변경되었습니다.`);

    // 스캔 결과 갱신
    await scanSelection();
  } catch (error) {
    figma.notify('색상 변경 중 오류가 발생했습니다.', { error: true });
    console.error(error);
  }
}

/**
 * 모든 위반 색상 일괄 수정
 */
async function fixAllColors(payload: {
  fixes: Array<{
    nodeId: string;
    propertyType: 'fill' | 'stroke';
    originalHex: string;
    targetHex: string;
  }>;
}): Promise<void> {
  let fixedCount = 0;

  for (const fix of payload.fixes) {
    const node = figma.getNodeById(fix.nodeId) as SceneNode;
    if (!node) continue;

    const targetColor = MDS_COLORS.find(
      (c) => c.hex.toUpperCase() === fix.targetHex.toUpperCase()
    );
    if (!targetColor) continue;

    try {
      if (fix.propertyType === 'fill' && 'fills' in node) {
        const fills = JSON.parse(JSON.stringify(node.fills)) as Paint[];
        const updatedFills = fills.map((fill) => {
          if (fill.type === 'SOLID') {
            const currentHex = figmaRgbToHex(
              fill.color.r,
              fill.color.g,
              fill.color.b
            );
            if (currentHex.toUpperCase() === fix.originalHex.toUpperCase()) {
              return {
                ...fill,
                color: {
                  r: targetColor.rgb.r / 255,
                  g: targetColor.rgb.g / 255,
                  b: targetColor.rgb.b / 255,
                },
                opacity: targetColor.opacity ?? fill.opacity,
              };
            }
          }
          return fill;
        });
        (node as GeometryMixin).fills = updatedFills;
        fixedCount++;
      }

      if (fix.propertyType === 'stroke' && 'strokes' in node) {
        const strokes = JSON.parse(JSON.stringify(node.strokes)) as Paint[];
        const updatedStrokes = strokes.map((stroke) => {
          if (stroke.type === 'SOLID') {
            const currentHex = figmaRgbToHex(
              stroke.color.r,
              stroke.color.g,
              stroke.color.b
            );
            if (currentHex.toUpperCase() === fix.originalHex.toUpperCase()) {
              return {
                ...stroke,
                color: {
                  r: targetColor.rgb.r / 255,
                  g: targetColor.rgb.g / 255,
                  b: targetColor.rgb.b / 255,
                },
                opacity: targetColor.opacity ?? stroke.opacity,
              };
            }
          }
          return stroke;
        });
        (node as GeometryMixin).strokes = updatedStrokes;
        fixedCount++;
      }
    } catch (error) {
      console.error('색상 변경 오류:', error);
    }
  }

  figma.notify(`${fixedCount}개의 색상이 수정되었습니다.`);

  // 스캔 결과 갱신
  await scanSelection();
}

/**
 * 노드 선택 (화면에서 해당 요소로 이동)
 */
async function selectNode(nodeId: string): Promise<void> {
  const node = figma.getNodeById(nodeId) as SceneNode;

  if (node) {
    figma.currentPage.selection = [node];
    figma.viewport.scrollAndZoomIntoView([node]);
  }
}
```

---

다음 문서: [03-GUIDE-UI.md](./03-GUIDE-UI.md)

# 디자인 시스템 Color Checker - Part 3: UI 구현

---

## 6. UI 구현

### 6.1 HTML 템플릿 (src/ui.html)

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>디자인 시스템 Color Checker</title>
    <style>
      /* ========================================
       CSS Variables (Light Theme)
       ======================================== */
      :root {
        --bg-primary: #ffffff;
        --bg-secondary: #f5f5f5;
        --bg-tertiary: #ebebeb;
        --text-primary: #000000;
        --text-secondary: #666666;
        --text-tertiary: #8a8a8a;
        --border-color: #e0e0e0;
        --accent-blue: #245eff;
        --accent-red: #f31110;
        --accent-green: #00a86b;
        --accent-yellow: #fa9200;
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
        font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
          sans-serif;
        font-size: 12px;
        color: var(--text-primary);
        background: var(--bg-primary);
        line-height: 1.4;
      }

      .container {
        padding: 16px;
        display: flex;
        flex-direction: column;
        height: 100vh;
      }

      /* ========================================
       Header
       ======================================== */
      .header {
        margin-bottom: 16px;
      }

      .header h1 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .header p {
        color: var(--text-secondary);
        font-size: 11px;
      }

      /* ========================================
       Action Buttons
       ======================================== */
      .actions {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }

      .btn {
        flex: 1;
        padding: 10px 16px;
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

      .btn-secondary {
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
      }

      .btn-secondary:hover {
        background: var(--bg-tertiary);
      }

      .btn-success {
        background: var(--accent-green);
        color: white;
      }

      .btn-success:hover {
        background: #008f5b;
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* ========================================
       Statistics Cards
       ======================================== */
      .stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }

      .stat-card {
        background: var(--bg-secondary);
        padding: 12px;
        border-radius: 8px;
        text-align: center;
      }

      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: var(--text-primary);
      }

      .stat-value.error {
        color: var(--accent-red);
      }

      .stat-value.success {
        color: var(--accent-green);
      }

      .stat-label {
        font-size: 10px;
        color: var(--text-secondary);
        margin-top: 4px;
      }

      /* ========================================
       Results Container
       ======================================== */
      .results {
        flex: 1;
        overflow-y: auto;
        border: 1px solid var(--border-color);
        border-radius: 8px;
      }

      .results-header {
        padding: 12px 16px;
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .results-title {
        font-weight: 600;
      }

      .results-empty {
        padding: 40px;
        text-align: center;
        color: var(--text-tertiary);
      }

      .results-empty-icon {
        font-size: 32px;
        margin-bottom: 8px;
      }

      /* ========================================
       Color Item
       ======================================== */
      .color-item {
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color);
        transition: background 0.15s ease;
      }

      .color-item:hover {
        background: var(--bg-secondary);
      }

      .color-item:last-child {
        border-bottom: none;
      }

      .color-item-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }

      .color-swatch {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: 1px solid var(--border-color);
        flex-shrink: 0;
      }

      .color-info {
        flex: 1;
        min-width: 0;
      }

      .color-hex {
        font-family: 'SF Mono', Monaco, 'Courier New', monospace;
        font-size: 12px;
        font-weight: 600;
      }

      .color-node {
        font-size: 11px;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
      }

      .color-node:hover {
        color: var(--accent-blue);
        text-decoration: underline;
      }

      .color-type {
        font-size: 10px;
        color: var(--text-tertiary);
        background: var(--bg-tertiary);
        padding: 2px 6px;
        border-radius: 4px;
        margin-left: 4px;
      }

      /* ========================================
       Color Family Badge
       ======================================== */
      .color-family {
        font-size: 9px;
        padding: 2px 6px;
        border-radius: 3px;
        text-transform: uppercase;
        font-weight: 600;
        margin-left: 6px;
      }

      .family-grayscale {
        background: #e5e5e5;
        color: #525252;
      }
      .family-blue {
        background: #dbeafe;
        color: #1e40af;
      }
      .family-red {
        background: #fee2e2;
        color: #dc2626;
      }
      .family-yellow {
        background: #fef3c7;
        color: #d97706;
      }
      .family-other {
        background: #f3e8ff;
        color: #7c3aed;
      }

      /* ========================================
       Suggestion Box
       ======================================== */
      .suggestion {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--bg-secondary);
        border-radius: 6px;
        margin-top: 8px;
      }

      .suggestion-arrow {
        color: var(--text-tertiary);
        font-size: 14px;
      }

      .suggestion-color {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .suggestion-swatch {
        width: 20px;
        height: 20px;
        border-radius: 4px;
        border: 1px solid var(--border-color);
      }

      .suggestion-name {
        font-size: 11px;
        font-weight: 500;
      }

      .suggestion-hex {
        font-family: 'SF Mono', Monaco, 'Courier New', monospace;
        font-size: 10px;
        color: var(--text-secondary);
      }

      .btn-fix {
        margin-left: auto;
        padding: 6px 12px;
        font-size: 11px;
        background: var(--accent-blue);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .btn-fix:hover {
        background: #1a4fd9;
      }

      /* ========================================
       Loading Spinner
       ======================================== */
      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: var(--text-secondary);
      }

      .spinner {
        width: 24px;
        height: 24px;
        border: 2px solid var(--border-color);
        border-top-color: var(--accent-blue);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin-bottom: 12px;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* ========================================
       Message Box
       ======================================== */
      .message {
        padding: 12px 16px;
        border-radius: 6px;
        margin-bottom: 16px;
        font-size: 12px;
      }

      .message-error {
        background: #fee2e2;
        color: #dc2626;
        border: 1px solid #fecaca;
      }

      .message-success {
        background: #d1fae5;
        color: #059669;
        border: 1px solid #a7f3d0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <!-- Header -->
      <div class="header">
        <h1>🎨 디자인 시스템 Color Checker</h1>
        <p>디자인 시스템 컬러 팔레트 준수 여부를 검사합니다</p>
      </div>

      <!-- Action Buttons -->
      <div class="actions">
        <button class="btn btn-primary" id="scanSelection">
          선택 영역 검사
        </button>
        <button class="btn btn-secondary" id="scanPage">
          페이지 전체 검사
        </button>
      </div>

      <!-- Message Container -->
      <div id="message"></div>

      <!-- Statistics -->
      <div class="stats" id="stats" style="display: none;">
        <div class="stat-card">
          <div class="stat-value" id="statTotal">0</div>
          <div class="stat-label">검사된 색상</div>
        </div>
        <div class="stat-card">
          <div class="stat-value success" id="statValid">0</div>
          <div class="stat-label">정상</div>
        </div>
        <div class="stat-card">
          <div class="stat-value error" id="statInvalid">0</div>
          <div class="stat-label">위반</div>
        </div>
      </div>

      <!-- Results -->
      <div class="results" id="results">
        <div class="results-empty" id="emptyState">
          <div class="results-empty-icon">🔍</div>
          <p>검사할 요소를 선택하고<br />"선택 영역 검사" 버튼을 클릭하세요</p>
        </div>
      </div>

      <!-- Fix All Button -->
      <div style="margin-top: 12px;">
        <button
          class="btn btn-success"
          id="fixAll"
          style="width: 100%; display: none;"
        >
          모든 위반 색상 수정
        </button>
      </div>
    </div>
  </body>
</html>
```

---

### 6.2 UI 로직 (src/ui.ts)

```typescript
// src/ui.ts

// ============================================
// 타입 정의
// ============================================

interface ColorUsage {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  propertyType: 'fill' | 'stroke';
  color: {
    r: number;
    g: number;
    b: number;
    opacity?: number;
  };
  hex: string;
  isValid: boolean;
  colorFamily: string;
  suggestion?: {
    name: string;
    hex: string;
    distance: number;
  };
}

interface ScanResult {
  totalNodes: number;
  totalColors: number;
  validColors: number;
  invalidColors: number;
  colorUsages: ColorUsage[];
}

// ============================================
// 상태 관리
// ============================================

let currentResults: ColorUsage[] = [];

// ============================================
// DOM 요소 참조
// ============================================

const scanSelectionBtn = document.getElementById(
  'scanSelection'
) as HTMLButtonElement;
const scanPageBtn = document.getElementById('scanPage') as HTMLButtonElement;
const fixAllBtn = document.getElementById('fixAll') as HTMLButtonElement;
const statsContainer = document.getElementById('stats') as HTMLDivElement;
const resultsContainer = document.getElementById('results') as HTMLDivElement;
const messageContainer = document.getElementById('message') as HTMLDivElement;

// ============================================
// 이벤트 리스너
// ============================================

// 선택 영역 검사 버튼
scanSelectionBtn.addEventListener('click', () => {
  showLoading();
  parent.postMessage({ pluginMessage: { type: 'scan-selection' } }, '*');
});

// 페이지 전체 검사 버튼
scanPageBtn.addEventListener('click', () => {
  showLoading();
  parent.postMessage({ pluginMessage: { type: 'scan-page' } }, '*');
});

// 모든 위반 색상 수정 버튼
fixAllBtn.addEventListener('click', () => {
  if (currentResults.length === 0) return;

  const fixes = currentResults
    .filter((usage) => usage.suggestion)
    .map((usage) => ({
      nodeId: usage.nodeId,
      propertyType: usage.propertyType,
      originalHex: usage.hex,
      targetHex: usage.suggestion!.hex,
    }));

  parent.postMessage(
    {
      pluginMessage: {
        type: 'fix-all',
        payload: { fixes },
      },
    },
    '*'
  );
});

// ============================================
// 플러그인 메시지 핸들러
// ============================================

window.onmessage = (event) => {
  const msg = event.data.pluginMessage;

  if (msg.type === 'scan-result') {
    // 에러 처리
    if (msg.error) {
      showMessage(msg.error, 'error');
      hideLoading();
      return;
    }

    const data = msg.data as ScanResult;
    currentResults = data.colorUsages;

    // UI 업데이트
    updateStats(data);
    renderResults(data.colorUsages);
    hideLoading();

    // 성공 메시지
    if (data.invalidColors === 0 && data.totalColors > 0) {
      showMessage('🎉 모든 색상이 디자인 시스템 팔레트를 준수합니다!', 'success');
    } else {
      hideMessage();
    }
  }
};

// ============================================
// UI 헬퍼 함수
// ============================================

/**
 * 로딩 상태 표시
 */
function showLoading(): void {
  resultsContainer.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>색상 검사 중...</p>
    </div>
  `;
  statsContainer.style.display = 'none';
  fixAllBtn.style.display = 'none';
}

/**
 * 로딩 상태 숨김
 */
function hideLoading(): void {
  // 결과가 렌더링되면 자동으로 숨겨짐
}

/**
 * 메시지 표시
 */
function showMessage(text: string, type: 'error' | 'success'): void {
  messageContainer.innerHTML = `
    <div class="message message-${type}">${text}</div>
  `;
}

/**
 * 메시지 숨김
 */
function hideMessage(): void {
  messageContainer.innerHTML = '';
}

/**
 * 통계 업데이트
 */
function updateStats(data: ScanResult): void {
  statsContainer.style.display = 'grid';

  const statTotal = document.getElementById('statTotal') as HTMLDivElement;
  const statValid = document.getElementById('statValid') as HTMLDivElement;
  const statInvalid = document.getElementById('statInvalid') as HTMLDivElement;

  statTotal.textContent = data.totalColors.toString();
  statValid.textContent = data.validColors.toString();
  statInvalid.textContent = data.invalidColors.toString();
}

/**
 * 결과 목록 렌더링
 */
function renderResults(colorUsages: ColorUsage[]): void {
  // 위반 색상이 없는 경우
  if (colorUsages.length === 0) {
    resultsContainer.innerHTML = `
      <div class="results-empty">
        <div class="results-empty-icon">✅</div>
        <p>위반된 색상이 없습니다</p>
      </div>
    `;
    fixAllBtn.style.display = 'none';
    return;
  }

  // 수정 버튼 표시
  fixAllBtn.style.display = 'block';

  // 결과 목록 HTML 생성
  const html = `
    <div class="results-header">
      <span class="results-title">위반 색상 목록 (${colorUsages.length})</span>
    </div>
    ${colorUsages.map((usage) => renderColorItem(usage)).join('')}
  `;

  resultsContainer.innerHTML = html;

  // 이벤트 리스너 연결 - 노드 클릭
  resultsContainer.querySelectorAll('.color-node').forEach((el) => {
    el.addEventListener('click', () => {
      const nodeId = (el as HTMLElement).dataset.nodeId;
      if (nodeId) {
        parent.postMessage(
          {
            pluginMessage: { type: 'select-node', payload: { nodeId } },
          },
          '*'
        );
      }
    });
  });

  // 이벤트 리스너 연결 - 수정 버튼
  resultsContainer.querySelectorAll('.btn-fix').forEach((el) => {
    el.addEventListener('click', () => {
      const dataset = (el as HTMLElement).dataset;
      parent.postMessage(
        {
          pluginMessage: {
            type: 'fix-color',
            payload: {
              nodeId: dataset.nodeId,
              propertyType: dataset.propertyType,
              originalHex: dataset.originalHex,
              targetHex: dataset.targetHex,
            },
          },
        },
        '*'
      );
    });
  });
}

/**
 * 개별 색상 항목 렌더링
 */
function renderColorItem(usage: ColorUsage): string {
  const familyClass = getColorFamilyClass(usage.colorFamily);
  const familyName = getColorFamilyName(usage.colorFamily);

  return `
    <div class="color-item">
      <div class="color-item-header">
        <div class="color-swatch" style="background-color: ${usage.hex}"></div>
        <div class="color-info">
          <div class="color-hex">
            ${usage.hex}
            <span class="color-family ${familyClass}">${familyName}</span>
          </div>
          <div class="color-node" data-node-id="${usage.nodeId}">
            ${escapeHtml(usage.nodeName)} 
            <span class="color-type">${
              usage.propertyType === 'fill' ? 'Fill' : 'Stroke'
            }</span>
          </div>
        </div>
      </div>
      ${usage.suggestion ? renderSuggestion(usage) : ''}
    </div>
  `;
}

/**
 * 추천 색상 박스 렌더링
 */
function renderSuggestion(usage: ColorUsage): string {
  if (!usage.suggestion) return '';

  return `
    <div class="suggestion">
      <span class="suggestion-arrow">→</span>
      <div class="suggestion-color">
        <div class="suggestion-swatch" style="background-color: ${usage.suggestion.hex}"></div>
        <span class="suggestion-name">${usage.suggestion.name}</span>
        <span class="suggestion-hex">${usage.suggestion.hex}</span>
      </div>
      <button class="btn-fix" 
        data-node-id="${usage.nodeId}"
        data-property-type="${usage.propertyType}"
        data-original-hex="${usage.hex}"
        data-target-hex="${usage.suggestion.hex}">
        수정
      </button>
    </div>
  `;
}

/**
 * 색상 계열 CSS 클래스 반환
 */
function getColorFamilyClass(family: string): string {
  const classMap: Record<string, string> = {
    grayscale: 'family-grayscale',
    blue: 'family-blue',
    red: 'family-red',
    yellow: 'family-yellow',
    other: 'family-other',
  };
  return classMap[family] || 'family-other';
}

/**
 * 색상 계열 이름 반환
 */
function getColorFamilyName(family: string): string {
  const nameMap: Record<string, string> = {
    grayscale: 'Gray',
    blue: 'Blue',
    red: 'Red',
    yellow: 'Yellow',
    other: 'Other',
  };
  return nameMap[family] || 'Other';
}

/**
 * HTML 이스케이프 (XSS 방지)
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

---

### 6.3 UI/UX 개선 포인트

#### 색상 계열 표시

- 위반된 색상이 어떤 계열인지 시각적으로 표시
- Grayscale, Blue, Red, Yellow, Other로 분류

#### 인터랙션

- 노드 이름 클릭 시 Figma에서 해당 요소로 이동 및 선택
- 개별 수정 버튼과 일괄 수정 버튼 제공

#### 상태 표시

- 로딩 스피너로 검사 진행 상태 표시
- 통계 카드로 검사 결과 한눈에 파악
- 성공/에러 메시지로 결과 안내

---

다음 문서: [04-GUIDE-DEPLOY.md](./04-GUIDE-DEPLOY.md)

# 디자인 시스템 Color Checker - Part 4: 테스트 및 배포

---

## 7. 플러그인 테스트 및 디버깅

### 7.1 개발 모드 실행

```bash
# 개발 모드로 빌드 (파일 변경 시 자동 재빌드)
npm run watch
```

### 7.2 Figma에서 플러그인 로드

1. **Figma Desktop App** 열기
2. 메뉴: **Plugins** → **Development** → **Import plugin from manifest...**
3. 프로젝트의 `manifest.json` 파일 선택
4. 메뉴: **Plugins** → **Development** → **디자인 시스템 Color Checker** 실행

### 7.3 Hot Reload 설정

Figma Desktop App에서 코드 변경 시 자동으로 플러그인을 재시작하려면:

1. 메뉴: **Figma** → **Preferences** (Mac) 또는 **File** → **Preferences** (Windows)
2. **Plugins** 탭 선택
3. **Hot reload plugin** 체크

### 7.4 디버깅 방법

#### Console 열기

```
메뉴: Plugins → Development → Open Console
```

#### 디버그 로그 추가

```typescript
// code.ts에서
console.log('디버그 메시지', someVariable);

// Figma 알림으로 확인
figma.notify('디버그: ' + someValue);

// 오류 추적
try {
  // ...
} catch (error) {
  console.error('오류 발생:', error);
  figma.notify('오류: ' + error.message, { error: true });
}
```

#### UI 디버깅

```typescript
// ui.ts에서
console.log('UI 이벤트:', eventData);

// 개발자 도구에서 확인 가능
```

### 7.5 테스트 시나리오

| 시나리오       | 테스트 내용                                  | 예상 결과                        |
| -------------- | -------------------------------------------- | -------------------------------- |
| 빈 선택        | 아무것도 선택하지 않고 "선택 영역 검사" 클릭 | "선택된 요소가 없습니다" 메시지  |
| 정상 색상만    | 팔레트 색상만 사용된 요소 검사           | "모든 색상이 준수합니다" 메시지  |
| 위반 색상 포함 | 팔레트 외 색상 포함 요소 검사                | 위반 목록 표시 + 추천 색상       |
| 회색 위반      | #333333 같은 회색 계열 위반                  | Grayscale 계열에서만 추천        |
| 파란색 위반    | #1E90FF 같은 파란색 계열 위반                | Blue 계열에서만 추천             |
| 개별 수정      | 위반 항목의 "수정" 버튼 클릭                 | 해당 색상만 변경                 |
| 일괄 수정      | "모든 위반 색상 수정" 버튼 클릭              | 모든 위반 색상 변경              |
| 노드 선택      | 위반 항목의 노드 이름 클릭                   | Figma에서 해당 요소 선택 및 확대 |

---

## 8. 배포

### 8.1 프로덕션 빌드

```bash
npm run build
```

빌드 결과물:

- `dist/code.js` - 플러그인 메인 코드
- `dist/ui.html` - 플러그인 UI (CSS/JS 인라인)

### 8.2 Figma Community 배포

#### Step 1: 플러그인 정보 준비

| 항목        | 설명          | 예시                                      |
| ----------- | ------------- | ----------------------------------------- |
| 이름        | 플러그인 이름 | 디자인 시스템 Color Checker                         |
| 태그라인    | 한 줄 설명    | 디자인 시스템 컬러 팔레트 준수 여부 검사        |
| 설명        | 상세 설명     | 디자인 시스템 색상 규칙 검사 및 자동 수정 |
| 카테고리    | 분류          | Design tools                              |
| 아이콘      | 128x128 PNG   | 플러그인 아이콘                           |
| 커버 이미지 | 1920x960 PNG  | 배너 이미지                               |

#### Step 2: 배포 진행

1. Figma Desktop App에서 **Plugins** → **Development** → **디자인 시스템 Color Checker** 우클릭
2. **Publish...** 선택
3. 플러그인 정보 입력
4. **Submit for review** 클릭

#### Step 3: 승인 대기

- Figma 팀의 검토 후 승인 (보통 1-3일 소요)
- 승인 시 Figma Community에 게시

### 8.3 팀 전용 배포 (Organization)

Community에 공개하지 않고 팀 내부에서만 사용하려면:

#### 방법 1: manifest.json 공유

```bash
# 프로젝트 폴더 공유
/mds-color-checker
├── manifest.json
├── dist/
│   ├── code.js
│   └── ui.html
```

팀원들이 **Import plugin from manifest...** 로 로드

#### 방법 2: Organization Plugin

1. Figma Organization 관리자 권한 필요
2. **Admin** → **Plugins** → **Develop internal plugins**
3. Organization 전용 플러그인으로 배포

### 8.4 업데이트 배포

1. 코드 수정 후 `npm run build`
2. **Plugins** → **Development** → **디자인 시스템 Color Checker** 우클릭
3. **Publish new version...** 선택
4. 버전 노트 작성 후 제출

---

## 9. 전체 소스 코드 요약

### 9.1 파일 구조

```
design-system-color-checker/
├── manifest.json              # 플러그인 설정
├── package.json               # npm 의존성
├── tsconfig.json              # TypeScript 설정
├── webpack.config.js          # Webpack 번들링 설정
├── src/
│   ├── code.ts                # 메인 플러그인 로직
│   ├── ui.html                # 플러그인 UI 템플릿
│   ├── ui.ts                  # UI 로직
│   ├── tokens/
│   │   └── colors.ts          # 컬러 토큰 정의
│   └── utils/
│       ├── colorUtils.ts      # 색상 유틸리티 함수
│       └── colorCategory.ts   # 색상 계열 판단 로직
└── dist/                      # 빌드 결과물
    ├── code.js
    └── ui.html
```

### 9.2 빠른 시작 명령어

```bash
# 1. 프로젝트 생성
mkdir design-system-color-checker && cd design-system-color-checker

# 2. package.json 생성
npm init -y

# 3. 의존성 설치
npm install -D typescript @figma/plugin-typings webpack webpack-cli \
  ts-loader html-webpack-plugin html-inline-script-webpack-plugin \
  css-loader style-loader

# 4. 위 가이드의 파일들 생성 (manifest.json, tsconfig.json, webpack.config.js, src/*)

# 5. 빌드
npm run build

# 6. Figma에서 manifest.json import
```

---

## 10. 추가 개선 아이디어

### 10.1 색상 거리 알고리즘 개선

현재: 유클리드 RGB 거리  
개선: **CIEDE2000** 알고리즘 (인간 색상 인지 기반)

```typescript
// deltaE 라이브러리 활용
import { deltaE00 } from 'delta-e';

function colorDistanceCIEDE2000(c1: LAB, c2: LAB): number {
  return deltaE00(c1, c2);
}
```

### 10.2 그라데이션 지원

```typescript
// Highlight 그라데이션 검사 로직
function isValidGradient(gradient: GradientPaint): boolean {
  const highlightColors = ['#A3FBFB', '#245EFF', '#7CEFF'];
  return gradient.gradientStops.every((stop) =>
    highlightColors.includes(
      figmaRgbToHex(stop.color.r, stop.color.g, stop.color.b)
    )
  );
}
```

### 10.3 Figma Variables 연동

```typescript
// Variables API 활용
const variables = await figma.variables.getLocalVariablesAsync('COLOR');
```

### 10.4 보고서 내보내기

```typescript
// CSV 형식 내보내기
function exportToCSV(results: ColorUsage[]): string {
  const header = 'Node,Type,Current Color,Suggested Color,Family\n';
  const rows = results.map(
    (r) =>
      `"${r.nodeName}",${r.propertyType},${r.hex},${r.suggestion?.hex || ''},${
        r.colorFamily
      }`
  );
  return header + rows.join('\n');
}
```

### 10.5 실시간 감시 모드

```typescript
// Selection 변경 감지
figma.on('selectionchange', () => {
  if (watchMode) {
    scanSelection();
  }
});
```

---

## 참고 자료

- [Figma Plugin API 공식 문서](https://www.figma.com/plugin-docs/)
- [Figma Plugin Quickstart Guide](https://developers.figma.com/docs/plugins/plugin-quickstart-guide/)
- [Figma Plugin Samples (GitHub)](https://github.com/figma/plugin-samples)
- [Color Science - Delta E](https://en.wikipedia.org/wiki/Color_difference)
- [Figma Plugin DS (UI 라이브러리)](https://github.com/thomas-lowry/figma-plugins-on-github)

---

## 문서 목록

1. [01-GUIDE-OVERVIEW.md](./01-GUIDE-OVERVIEW.md) - 개요 및 프로젝트 설정
2. [02-GUIDE-CORE-LOGIC.md](./02-GUIDE-CORE-LOGIC.md) - 핵심 로직 구현
3. [03-GUIDE-UI.md](./03-GUIDE-UI.md) - UI 구현
4. [04-GUIDE-DEPLOY.md](./04-GUIDE-DEPLOY.md) - 테스트 및 배포 (현재 문서)
