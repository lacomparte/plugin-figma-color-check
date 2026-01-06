// 플러그인 전역 타입 정의

import type { ColorToken } from '../tokens/colors';

/**
 * 색상 사용 정보
 */
export interface ColorUsage {
  readonly nodeId: string;
  readonly nodeName: string;
  readonly nodeType: string;
  readonly propertyType: 'fill' | 'stroke';
  readonly color: {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    readonly opacity?: number;
  };
  readonly hex: string;
  readonly isValid: boolean;
  readonly colorFamily: ColorFamily;
  readonly suggestion?: ColorSuggestion;
}

/**
 * 색상 제안
 */
export interface ColorSuggestion {
  readonly name: string;
  readonly hex: string;
  readonly distance: number;
}

/**
 * 색상 계열
 */
export type ColorFamily = 'grayscale' | 'blue' | 'red' | 'yellow' | 'other';

/**
 * 스캔 결과
 */
export interface ScanResult {
  readonly totalNodes: number;
  readonly totalColors: number;
  readonly validColors: number;
  readonly invalidColors: number;
  readonly colorUsages: readonly ColorUsage[];
}

/**
 * 팔레트 소스 타입
 */
export type PaletteSourceType = 'url';

/**
 * 팔레트 정보
 */
export interface PaletteInfo {
  readonly id: string;
  readonly name: string;
  readonly sourceType: PaletteSourceType;
  readonly colorCount: number;
  readonly fileKey: string; // Figma file key
  readonly layerName: string; // Layer 이름
  readonly createdAt: number; // 생성 시간
  readonly colors?: readonly ColorToken[]; // 색상 목록 (선택적)
}

/**
 * 색상 속성 타입
 */
export type ColorPropertyType = 'all' | 'fills' | 'strokes' | 'text' | 'effects';

/**
 * Layer 기반 팔레트 추가 요청
 */
export interface AddUrlPaletteRequest {
  readonly layerName: string; // Layer 이름
  readonly filterNodeName?: string; // 선택적: 특정 하위 노드만 색상 추출
  readonly colorProperty?: ColorPropertyType; // 선택적: 추출할 색상 속성
  readonly paletteName?: string; // 선택적: 사용자 지정 이름
}

/**
 * 색상 수정 요청
 */
export interface ColorFixRequest {
  readonly nodeId: string;
  readonly propertyType: 'fill' | 'stroke';
  readonly originalHex: string;
  readonly targetHex: string;
}

// ============================================
// 플러그인 메시지 타입 (UI ↔ Code)
// ============================================

/**
 * UI → Code 메시지
 */
export type PluginMessageToCode =
  | { type: 'scan-selection'; payload: { paletteId: string } }
  | { type: 'scan-page'; payload: { paletteId: string } }
  | { type: 'fix-color'; payload: ColorFixRequest }
  | { type: 'fix-all'; payload: { fixes: readonly ColorFixRequest[] } }
  | { type: 'select-node'; payload: { nodeId: string } }
  | { type: 'add-url-palette'; payload: AddUrlPaletteRequest }
  | { type: 'get-saved-palettes' }
  | { type: 'delete-palette'; payload: { paletteId: string } }
  | { type: 'cancel' };

/**
 * Code → UI 메시지
 */
export type PluginMessageToUi =
  | { type: 'scan-result'; data: ScanResult }
  | { type: 'scan-result'; error: string }
  | { type: 'saved-palettes'; data: readonly PaletteInfo[] }
  | { type: 'palette-added'; data: PaletteInfo }
  | { type: 'palette-added'; error: string }
  | { type: 'palette-deleted'; paletteId: string };
