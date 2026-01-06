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
import type {
  PluginMessageToCode,
  PaletteInfo,
  AddUrlPaletteRequest,
  ColorUsage,
  ScanResult,
} from './types';

// ============================================
// UI 초기화
// ============================================

figma.showUI(__html__, {
  width: 420,
  height: 600,
  themeColors: true,
});

// ============================================
// Storage Key
// ============================================

const STORAGE_KEY = 'savedPalettes';

// ============================================
// 메시지 핸들러
// ============================================

figma.ui.onmessage = (msg: PluginMessageToCode): void => {
  console.log('[code.ts] Received message:', msg.type);
  void (async (): Promise<void> => {
    switch (msg.type) {
      case 'scan-selection':
        await setupPalette(msg.payload.paletteId);
        await scanSelection();
        break;
      case 'scan-page':
        await setupPalette(msg.payload.paletteId);
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
      case 'add-url-palette':
        await addUrlPalette(msg.payload);
        break;
      case 'get-saved-palettes':
        await getSavedPalettes();
        break;
      case 'delete-palette':
        await deletePalette(msg.payload.paletteId);
        break;
      case 'cancel':
        figma.closePlugin();
        break;
    }
  })();
};

// ============================================
// Palette Storage Functions
// ============================================

/**
 * 저장된 팔레트 목록 불러오기
 */
async function getSavedPalettes(): Promise<void> {
  try {
    const palettes = (await figma.clientStorage.getAsync(STORAGE_KEY)) as PaletteInfo[] | undefined;
    figma.ui.postMessage({
      type: 'saved-palettes',
      data: palettes ?? [],
    });
  } catch (error) {
    console.error('[getSavedPalettes] Error:', error);
    figma.ui.postMessage({
      type: 'saved-palettes',
      data: [],
    });
  }
}

/**
 * URL 기반 팔레트 추가
 */
async function addUrlPalette(request: AddUrlPaletteRequest): Promise<void> {
  try {
    // 1. Layer 이름으로 노드 찾기
    const allNodes = figma.currentPage.findAll((n) => n.name === request.layerName);

    if (allNodes.length === 0) {
      figma.ui.postMessage({
        type: 'palette-added',
        error: `"${request.layerName}" 이름의 레이어를 찾을 수 없습니다.`,
      });
      return;
    }

    // 여러 개 발견되면 첫 번째 사용
    const node = allNodes[0];

    // 2. SceneNode인지 확인
    if (node.type === 'PAGE' || node.type === 'DOCUMENT') {
      figma.ui.postMessage({
        type: 'palette-added',
        error: 'PAGE 또는 DOCUMENT 노드는 팔레트로 사용할 수 없습니다. 구체적인 Frame이나 Component를 선택해주세요.',
      });
      return;
    }

    // 3. 색상 추출할 노드 찾기
    const targetNodes: SceneNode[] = [];

    if (request.filterNodeName) {
      // filterNodeName이 있으면 해당 이름의 하위 노드만 찾기
      if ('findAll' in node) {
        const filtered = node.findAll(
          (child) => child.type !== 'PAGE' && child.name === request.filterNodeName
        );
        targetNodes.push(...(filtered.filter((n): n is SceneNode => n.type !== 'PAGE')));
      }

      if (targetNodes.length === 0) {
        figma.ui.postMessage({
          type: 'palette-added',
          error: `"${request.filterNodeName}" 이름의 노드를 찾을 수 없습니다.`,
        });
        return;
      }
    } else {
      // filterNodeName이 없으면 전체 노드
      targetNodes.push(node as SceneNode);

      if ('findAll' in node) {
        const children = node.findAll((child) => child.type !== 'PAGE');
        targetNodes.push(...(children.filter((n): n is SceneNode => n.type !== 'PAGE')));
      }
    }

    // 4. 색상 추출 (속성별 필터링)
    const colors = extractColorsFromNodes(targetNodes, request.colorProperty);

    if (colors.length === 0) {
      figma.ui.postMessage({
        type: 'palette-added',
        error: '노드에서 색상을 찾을 수 없습니다.',
      });
      return;
    }

    // 5. PaletteInfo 생성
    const currentFileKey = figma.fileKey ?? 'unknown';
    const nodeName = (node as SceneNode).name;
    const palette: PaletteInfo = {
      id: `${currentFileKey}-${request.nodeId}-${Date.now()}`,
      name: request.paletteName ?? nodeName,
      sourceType: 'url',
      colorCount: colors.length,
      fileKey: currentFileKey,
      nodeId: request.nodeId,
      createdAt: Date.now(),
    };

    // 6. Storage에 저장 (색상 정보도 함께 저장)
    const palettes = (await figma.clientStorage.getAsync(STORAGE_KEY)) as PaletteInfo[] | undefined;
    const updated = [...(palettes ?? []), palette];
    await figma.clientStorage.setAsync(STORAGE_KEY, updated);

    // 7. 색상 정보도 별도로 저장 (스캔 시 사용)
    await figma.clientStorage.setAsync(`palette-colors-${palette.id}`, colors);

    figma.ui.postMessage({
      type: 'palette-added',
      data: palette,
    });

    figma.notify(`팔레트 "${palette.name}" 추가됨 (${colors.length}색)`);
  } catch (error) {
    console.error('[addUrlPalette] Error:', error);
    figma.ui.postMessage({
      type: 'palette-added',
      error: '팔레트 추가 중 오류가 발생했습니다.',
    });
  }
}

/**
 * 노드 배열에서 색상 추출 (중복 제거)
 */
function extractColorsFromNodes(
  nodes: readonly SceneNode[],
  colorProperty: 'all' | 'fills' | 'strokes' | 'text' | 'effects' | undefined = 'all'
): ColorToken[] {
  const colorMap = new Map<string, ColorToken>();

  function traverse(node: SceneNode): void {
    // fills 검사
    if ((colorProperty === 'all' || colorProperty === 'fills') && 'fills' in node && node.fills !== figma.mixed) {
      const fills = node.fills as readonly Paint[];
      for (const fill of fills) {
        if (fill.type === 'SOLID' && fill.visible !== false) {
          const hex = figmaRgbToHex(fill.color.r, fill.color.g, fill.color.b);
          if (!colorMap.has(hex)) {
            colorMap.set(hex, {
              name: hex,
              hex,
              rgb: {
                r: Math.round(fill.color.r * 255),
                g: Math.round(fill.color.g * 255),
                b: Math.round(fill.color.b * 255),
              },
              opacity: fill.opacity !== undefined && fill.opacity < 1 ? fill.opacity : undefined,
              category: 'grayscale',
            });
          }
        }
      }
    }

    // strokes 검사
    if ((colorProperty === 'all' || colorProperty === 'strokes') && 'strokes' in node) {
      const strokes = node.strokes as readonly Paint[];
      for (const stroke of strokes) {
        if (stroke.type === 'SOLID' && stroke.visible !== false) {
          const hex = figmaRgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
          if (!colorMap.has(hex)) {
            colorMap.set(hex, {
              name: hex,
              hex,
              rgb: {
                r: Math.round(stroke.color.r * 255),
                g: Math.round(stroke.color.g * 255),
                b: Math.round(stroke.color.b * 255),
              },
              opacity: stroke.opacity !== undefined && stroke.opacity < 1 ? stroke.opacity : undefined,
              category: 'grayscale',
            });
          }
        }
      }
    }

    // text 검사 (TEXT 노드의 fills)
    if ((colorProperty === 'all' || colorProperty === 'text') && node.type === 'TEXT') {
      const fills = node.fills;
      if (fills !== figma.mixed) {
        for (const fill of fills as readonly Paint[]) {
          if (fill.type === 'SOLID' && fill.visible !== false) {
            const hex = figmaRgbToHex(fill.color.r, fill.color.g, fill.color.b);
            if (!colorMap.has(hex)) {
              colorMap.set(hex, {
                name: hex,
                hex,
                rgb: {
                  r: Math.round(fill.color.r * 255),
                  g: Math.round(fill.color.g * 255),
                  b: Math.round(fill.color.b * 255),
                },
                opacity: fill.opacity !== undefined && fill.opacity < 1 ? fill.opacity : undefined,
                category: 'grayscale',
              });
            }
          }
        }
      }
    }

    // effects 검사 (그림자, 글로우 등)
    if ((colorProperty === 'all' || colorProperty === 'effects') && 'effects' in node) {
      const effects = node.effects;
      for (const effect of effects) {
        if (
          (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') &&
          effect.visible !== false &&
          'color' in effect
        ) {
          const hex = figmaRgbToHex(effect.color.r, effect.color.g, effect.color.b);
          if (!colorMap.has(hex)) {
            colorMap.set(hex, {
              name: hex,
              hex,
              rgb: {
                r: Math.round(effect.color.r * 255),
                g: Math.round(effect.color.g * 255),
                b: Math.round(effect.color.b * 255),
              },
              opacity:
                effect.color.a !== undefined && effect.color.a < 1 ? effect.color.a : undefined,
              category: 'grayscale',
            });
          }
        }
      }
    }

    // 자식 노드 탐색
    if ('children' in node) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  return Array.from(colorMap.values());
}

/**
 * 팔레트 삭제
 */
async function deletePalette(paletteId: string): Promise<void> {
  try {
    const palettes = (await figma.clientStorage.getAsync(STORAGE_KEY)) as PaletteInfo[] | undefined;
    const updated = (palettes ?? []).filter((p) => p.id !== paletteId);
    await figma.clientStorage.setAsync(STORAGE_KEY, updated);

    // 색상 정보도 삭제
    await figma.clientStorage.deleteAsync(`palette-colors-${paletteId}`);

    figma.ui.postMessage({
      type: 'palette-deleted',
      paletteId,
    });

    figma.notify('팔레트가 삭제되었습니다.');
  } catch (error) {
    console.error('[deletePalette] Error:', error);
  }
}

/**
 * 팔레트 설정 (스캔 전에 호출)
 */
async function setupPalette(paletteId: string): Promise<void> {
  const colors = (await figma.clientStorage.getAsync(
    `palette-colors-${paletteId}`
  )) as ColorToken[] | undefined;

  if (colors && colors.length > 0) {
    setActiveVariableColors(colors);
  } else {
    console.warn('[setupPalette] No colors found for palette:', paletteId);
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
async function fixColor(payload: {
  nodeId: string;
  propertyType: 'fill' | 'stroke';
  originalHex: string;
  targetHex: string;
}): Promise<void> {
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
          const currentHex = figmaRgbToHex(fill.color.r, fill.color.g, fill.color.b);
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
          const currentHex = figmaRgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
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
  fixes: readonly {
    nodeId: string;
    propertyType: 'fill' | 'stroke';
    originalHex: string;
    targetHex: string;
  }[];
}): Promise<void> {
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
            const currentHex = figmaRgbToHex(fill.color.r, fill.color.g, fill.color.b);
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
            const currentHex = figmaRgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
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
