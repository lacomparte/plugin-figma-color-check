// src/tokens/colors.ts

/**
 * 색상 토큰 타입
 */
export interface ColorToken {
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  opacity?: number;
  category: ColorCategory;
}

/**
 * 색상 카테고리 타입
 */
export type ColorCategory =
  | 'grayscale'
  | 'semantic-blue'
  | 'semantic-red'
  | 'semantic-yellow'
  | 'label'
  | 'opacity';
