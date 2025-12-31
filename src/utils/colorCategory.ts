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
export function determineColorFamily(r: number, g: number, b: number): ColorFamily {
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
