// src/code.ts

import {
  figmaRgbToHex,
  findClosestColorInFamily,
  isColorInPalette,
  getActiveColors,
  setActiveVariableColors,
} from './utils/colorUtils';
import { determineColorFamily } from './utils/colorCategory';
import type { ColorToken } from './tokens/colors';

// ============================================
// 타입 정의
// ============================================

type PaletteSourceType = 'variable' | 'page';

interface PageInfo {
  id: string;
  name: string;
  colorCount: number;
}

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

interface VariableCollectionInfo {
  id: string;
  name: string;
  colorCount: number;
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

interface ScanPayload {
  paletteId: string;
  sourceType: PaletteSourceType;
}

interface FixColorPayload {
  nodeId: string;
  propertyType: 'fill' | 'stroke';
  originalHex: string;
  targetHex: string;
}

interface FixAllPayload {
  fixes: FixColorPayload[];
}

interface SelectNodePayload {
  nodeId: string;
}

interface GoToPagePayload {
  pageId: string;
}

type PluginMessage =
  | { type: 'scan-selection'; payload: ScanPayload }
  | { type: 'scan-page'; payload: ScanPayload }
  | { type: 'fix-color'; payload: FixColorPayload }
  | { type: 'fix-all'; payload: FixAllPayload }
  | { type: 'select-node'; payload: SelectNodePayload }
  | { type: 'get-variable-collections' }
  | { type: 'get-pages' }
  | { type: 'go-to-page'; payload: GoToPagePayload }
  | { type: 'cancel' };

figma.ui.onmessage = (msg: PluginMessage): void => {
  console.log('[code.ts] Received message:', msg.type);
  void (async (): Promise<void> => {
    switch (msg.type) {
      case 'scan-selection':
        await setupPalette(msg.payload);
        await scanSelection();
        break;
      case 'scan-page':
        await setupPalette(msg.payload);
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
      case 'get-variable-collections':
        await getVariableCollections();
        break;
      case 'get-pages':
        await getPages();
        break;
      case 'go-to-page':
        await goToPage(msg.payload.pageId);
        break;
      case 'cancel':
        figma.closePlugin();
        break;
    }
  })();
};

// ============================================
// Variable Collections API
// ============================================

/**
 * Figma Variable Collections 조회
 */
async function getVariableCollections(): Promise<void> {
  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const colorVariables = await figma.variables.getLocalVariablesAsync('COLOR');

    const result: VariableCollectionInfo[] = collections.map((collection) => {
      const collectionColors = colorVariables.filter(
        (v) => v.variableCollectionId === collection.id
      );
      return {
        id: collection.id,
        name: collection.name,
        colorCount: collectionColors.length,
      };
    });

    figma.ui.postMessage({
      type: 'variable-collections',
      data: result,
    });
  } catch (_error) {
    figma.ui.postMessage({
      type: 'variable-collections',
      error: 'Variable Collections를 불러올 수 없습니다.',
    });
  }
}

/**
 * Variable Collection에서 색상 팔레트 로드
 */
async function loadVariableColors(collectionId: string): Promise<ColorToken[]> {
  const colorVariables = await figma.variables.getLocalVariablesAsync('COLOR');
  const collectionColors = colorVariables.filter(
    (v) => v.variableCollectionId === collectionId
  );

  const colors: ColorToken[] = [];

  for (const variable of collectionColors) {
    // 첫 번째 모드의 값 사용
    const modeIds = Object.keys(variable.valuesByMode);
    const firstModeId = modeIds[0];
    if (firstModeId === undefined) continue;

    const value = variable.valuesByMode[firstModeId];
    if (value === undefined) continue;

    // RGBA 타입 확인
    if (
      typeof value === 'object' &&
      value !== null &&
      'r' in value &&
      'g' in value &&
      'b' in value
    ) {
      const rgbaValue = value as { r: number; g: number; b: number; a?: number };
      const r = Math.round(rgbaValue.r * 255);
      const g = Math.round(rgbaValue.g * 255);
      const b = Math.round(rgbaValue.b * 255);
      const opacity = rgbaValue.a;

      colors.push({
        name: variable.name,
        hex: figmaRgbToHex(rgbaValue.r, rgbaValue.g, rgbaValue.b),
        rgb: { r, g, b },
        opacity: opacity !== undefined && opacity < 1 ? opacity : undefined,
        category: 'grayscale', // Variable에서는 카테고리 구분 없음
      });
    }
  }

  return colors;
}

// ============================================
// Pages API
// ============================================

/**
 * 현재 파일의 모든 페이지 목록 조회
 */
async function getPages(): Promise<void> {
  console.log('[code.ts] getPages called');
  try {
    // 모든 페이지를 먼저 로드해야 children에 접근 가능
    await figma.loadAllPagesAsync();

    const pages = figma.root.children;
    console.log('[code.ts] Found pages:', pages.length);
    const result: PageInfo[] = pages.map((page) => {
      const colorCount = countColorsInPage(page);
      console.log('[code.ts] Page:', page.name, 'colorCount:', colorCount);
      return {
        id: page.id,
        name: page.name,
        colorCount,
      };
    });

    console.log('[code.ts] Sending pages message:', result);
    figma.ui.postMessage({
      type: 'pages',
      data: result,
    });
  } catch (error) {
    console.error('[code.ts] getPages error:', error);
    figma.ui.postMessage({
      type: 'pages',
      error: '페이지 목록을 불러올 수 없습니다.',
    });
  }
}

/**
 * 페이지 내 고유 색상 수 계산
 */
function countColorsInPage(page: PageNode): number {
  const colors = new Set<string>();

  function traverse(node: SceneNode): void {
    if ('fills' in node && node.fills !== figma.mixed) {
      const fills = node.fills as readonly Paint[];
      for (const fill of fills) {
        if (fill.type === 'SOLID' && fill.visible !== false) {
          const hex = figmaRgbToHex(fill.color.r, fill.color.g, fill.color.b);
          colors.add(hex);
        }
      }
    }

    if ('strokes' in node) {
      const strokes = node.strokes as readonly Paint[];
      for (const stroke of strokes) {
        if (stroke.type === 'SOLID' && stroke.visible !== false) {
          const hex = figmaRgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
          colors.add(hex);
        }
      }
    }

    if ('children' in node) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const child of page.children) {
    traverse(child);
  }

  return colors.size;
}

/**
 * 특정 페이지로 이동
 */
async function goToPage(pageId: string): Promise<void> {
  const page = figma.root.children.find((p) => p.id === pageId);
  if (page !== undefined) {
    await figma.setCurrentPageAsync(page);
    figma.notify(`${page.name} 페이지로 이동했습니다.`);
  } else {
    figma.notify('페이지를 찾을 수 없습니다.', { error: true });
  }
}

/**
 * 페이지에서 색상 팔레트 추출
 */
async function loadPageColors(pageId: string): Promise<ColorToken[]> {
  const page = figma.root.children.find((p) => p.id === pageId);
  if (page === undefined) return [];

  // 페이지 데이터를 먼저 로드해야 children에 접근 가능
  await page.loadAsync();

  const colorMap = new Map<string, { r: number; g: number; b: number; name: string }>();

  function traverse(node: SceneNode): void {
    if ('fills' in node && node.fills !== figma.mixed) {
      const fills = node.fills as readonly Paint[];
      for (const fill of fills) {
        if (fill.type === 'SOLID' && fill.visible !== false) {
          const hex = figmaRgbToHex(fill.color.r, fill.color.g, fill.color.b);
          if (!colorMap.has(hex)) {
            colorMap.set(hex, {
              r: Math.round(fill.color.r * 255),
              g: Math.round(fill.color.g * 255),
              b: Math.round(fill.color.b * 255),
              name: node.name,
            });
          }
        }
      }
    }

    if ('strokes' in node) {
      const strokes = node.strokes as readonly Paint[];
      for (const stroke of strokes) {
        if (stroke.type === 'SOLID' && stroke.visible !== false) {
          const hex = figmaRgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
          if (!colorMap.has(hex)) {
            colorMap.set(hex, {
              r: Math.round(stroke.color.r * 255),
              g: Math.round(stroke.color.g * 255),
              b: Math.round(stroke.color.b * 255),
              name: node.name,
            });
          }
        }
      }
    }

    if ('children' in node) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const child of page.children) {
    traverse(child);
  }

  const colors: ColorToken[] = [];
  colorMap.forEach((value, hex) => {
    colors.push({
      name: hex,
      hex,
      rgb: { r: value.r, g: value.g, b: value.b },
      category: 'grayscale',
    });
  });

  return colors;
}

/**
 * 팔레트 설정
 */
async function setupPalette(payload: ScanPayload): Promise<void> {
  if (payload.sourceType === 'variable') {
    const colors = await loadVariableColors(payload.paletteId);
    setActiveVariableColors(colors);
  } else if (payload.sourceType === 'page') {
    const colors = await loadPageColors(payload.paletteId);
    setActiveVariableColors(colors);
  }
}

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
    if (closest !== null) {
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
async function fixColor(payload: FixColorPayload): Promise<void> {
  const baseNode = await figma.getNodeByIdAsync(payload.nodeId);

  if (baseNode === null) {
    figma.notify('노드를 찾을 수 없습니다.', { error: true });
    return;
  }

  // DocumentNode나 PageNode가 아닌 SceneNode인지 확인
  if (baseNode.type === 'DOCUMENT' || baseNode.type === 'PAGE') {
    figma.notify('잘못된 노드 타입입니다.', { error: true });
    return;
  }

  const node = baseNode as SceneNode;

  const targetColor = getActiveColors().find(
    (c) => c.hex.toUpperCase() === payload.targetHex.toUpperCase()
  );

  if (targetColor === undefined) {
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
async function fixAllColors(payload: FixAllPayload): Promise<void> {
  let fixedCount = 0;

  for (const fix of payload.fixes) {
    const baseNode = await figma.getNodeByIdAsync(fix.nodeId);
    if (baseNode === null) continue;

    // DocumentNode나 PageNode가 아닌 SceneNode인지 확인
    if (baseNode.type === 'DOCUMENT' || baseNode.type === 'PAGE') continue;

    const node = baseNode as SceneNode;

    const targetColor = getActiveColors().find(
      (c) => c.hex.toUpperCase() === fix.targetHex.toUpperCase()
    );
    if (targetColor === undefined) continue;

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
  const baseNode = await figma.getNodeByIdAsync(nodeId);

  if (baseNode === null) {
    figma.notify('노드를 찾을 수 없습니다.', { error: true });
    return;
  }

  // DocumentNode나 PageNode가 아닌 SceneNode인지 확인
  if (baseNode.type === 'DOCUMENT' || baseNode.type === 'PAGE') {
    figma.notify('선택할 수 없는 노드입니다.', { error: true });
    return;
  }

  const node = baseNode as SceneNode;
  figma.currentPage.selection = [node];
  figma.viewport.scrollAndZoomIntoView([node]);
}
