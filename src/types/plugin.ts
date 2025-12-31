// 플러그인 전역 타입 정의

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
export type PaletteSourceType = 'variable' | 'page';

/**
 * 팔레트 정보
 */
export interface PaletteInfo {
  readonly id: string;
  readonly name: string;
  readonly sourceType: PaletteSourceType;
  readonly colorCount: number;
  readonly pageId?: string; // page 타입일 때 페이지 ID
}

/**
 * Figma 페이지 정보
 */
export interface PageInfo {
  readonly id: string;
  readonly name: string;
  readonly colorCount: number;
}

/**
 * Variable Collection 정보
 */
export interface VariableCollectionInfo {
  readonly id: string;
  readonly name: string;
  readonly colorCount: number;
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
  | { type: 'scan-selection'; payload: { paletteId: string; sourceType: PaletteSourceType } }
  | { type: 'scan-page'; payload: { paletteId: string; sourceType: PaletteSourceType } }
  | { type: 'fix-color'; payload: ColorFixRequest }
  | { type: 'fix-all'; payload: { fixes: readonly ColorFixRequest[] } }
  | { type: 'select-node'; payload: { nodeId: string } }
  | { type: 'get-variable-collections' }
  | { type: 'get-pages' }
  | { type: 'go-to-page'; payload: { pageId: string } }
  | { type: 'cancel' };

/**
 * Code → UI 메시지
 */
export type PluginMessageToUi =
  | { type: 'scan-result'; data: ScanResult }
  | { type: 'scan-result'; error: string }
  | { type: 'variable-collections'; data: readonly VariableCollectionInfo[] }
  | { type: 'variable-collections'; error: string }
  | { type: 'pages'; data: readonly PageInfo[] }
  | { type: 'pages'; error: string };
