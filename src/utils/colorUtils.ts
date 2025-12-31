// src/utils/colorUtils.ts

import { type ColorToken } from '../tokens/colors';
import { determineColorFamily, type ColorFamily } from './colorCategory';

// 현재 활성 팔레트 색상 (Page 또는 Variable에서 로드)
let activeColors: ColorToken[] = [];

/**
 * 현재 활성 컬러 팔레트 반환
 */
export function getActiveColors(): ColorToken[] {
  return activeColors;
}

/**
 * 활성 팔레트 설정 (Page 또는 Variable Collection에서 로드한 색상)
 */
export function setActiveVariableColors(colors: ColorToken[]): void {
  activeColors = colors;
}

/**
 * Figma RGB (0-1 범위) → HEX 변환
 */
export function figmaRgbToHex(r: number, g: number, b: number): string {
  const toHex = (val: number): string => {
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
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1] ?? '0', 16),
        g: parseInt(result[2] ?? '0', 16),
        b: parseInt(result[3] ?? '0', 16),
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
  return Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2));
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
    activeColors.find((color) => {
      const rgbMatch = color.rgb.r === r255 && color.rgb.g === g255 && color.rgb.b === b255;

      // Opacity가 정의된 토큰인 경우
      if (opacity !== undefined && color.opacity !== undefined) {
        return rgbMatch && Math.abs(color.opacity - opacity) < 0.01;
      }

      // Opacity가 없는 일반 토큰
      return rgbMatch && color.opacity === undefined;
    }) ?? null
  );
}

/**
 * 같은 색상 계열 내에서 가장 가까운 색상 찾기
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
 * 색상 계열에 따른 색상 필터링
 */
function filterColorsByFamily(family: ColorFamily): ColorToken[] {
  return activeColors.filter((color) => {
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
  _opacity?: number
): { color: ColorToken; distance: number } | null {
  const r255 = Math.round(r * 255);
  const g255 = Math.round(g * 255);
  const b255 = Math.round(b * 255);

  let closestColor: ColorToken | null = null;
  let minDistance = Infinity;

  for (const color of activeColors) {
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
  tolerance = 0
): boolean {
  const exactMatch = findExactColor(r, g, b, opacity);
  if (exactMatch) return true;

  if (tolerance > 0) {
    const closest = findClosestColorInFamily(r, g, b, opacity);
    return closest !== null && closest.distance <= tolerance;
  }

  return false;
}
