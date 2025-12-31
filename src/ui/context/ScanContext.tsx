import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type {
  ColorFixRequest,
  ColorUsage,
  PageInfo,
  PaletteInfo,
  PaletteSourceType,
  PluginMessageToUi,
  ScanResult,
  VariableCollectionInfo,
} from '@/types';
import { useFigmaMessaging } from '../hooks/useFigmaMessaging';

// ============================================
// State
// ============================================

interface ScanState {
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly scanResult: ScanResult | null;
  readonly selectedPalette: PaletteInfo | null;
  readonly variableCollections: readonly VariableCollectionInfo[];
  readonly pages: readonly PageInfo[];
}

const initialState: ScanState = {
  isLoading: false,
  error: null,
  scanResult: null,
  selectedPalette: null,
  variableCollections: [],
  pages: [],
};

// ============================================
// Actions
// ============================================

type ScanAction =
  | { type: 'START_SCAN' }
  | { type: 'SCAN_SUCCESS'; payload: ScanResult }
  | { type: 'SCAN_ERROR'; payload: string }
  | { type: 'SET_PALETTE'; payload: PaletteInfo }
  | { type: 'SET_VARIABLE_COLLECTIONS'; payload: readonly VariableCollectionInfo[] }
  | { type: 'SET_PAGES'; payload: readonly PageInfo[] }
  | { type: 'CLEAR_ERROR' };

const scanReducer = (state: ScanState, action: ScanAction): ScanState => {
  switch (action.type) {
    case 'START_SCAN':
      return { ...state, isLoading: true, error: null };
    case 'SCAN_SUCCESS':
      return { ...state, isLoading: false, scanResult: action.payload };
    case 'SCAN_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'SET_PALETTE':
      return { ...state, selectedPalette: action.payload };
    case 'SET_VARIABLE_COLLECTIONS':
      return { ...state, variableCollections: action.payload };
    case 'SET_PAGES':
      return { ...state, pages: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

// ============================================
// Context
// ============================================

interface ScanContextValue {
  readonly state: ScanState;
  readonly scanSelection: () => void;
  readonly scanPage: () => void;
  readonly fixColor: (usage: ColorUsage) => void;
  readonly fixAllColors: () => void;
  readonly selectNode: (nodeId: string) => void;
  readonly selectPalette: (palette: PaletteInfo) => void;
  readonly loadVariableCollections: () => void;
  readonly loadPages: () => void;
  readonly goToPage: (pageId: string) => void;
  readonly clearError: () => void;
  readonly allPalettes: readonly PaletteInfo[];
}

const ScanContext = createContext<ScanContextValue | null>(null);

// ============================================
// Provider
// ============================================

interface ScanProviderProps {
  readonly children: ReactNode;
}

export const ScanProvider = ({ children }: ScanProviderProps): ReactNode => {
  const [state, dispatch] = useReducer(scanReducer, initialState);

  const handleMessage = useCallback((message: PluginMessageToUi): void => {
    console.log('[ScanContext] Received message:', message.type, message);
    switch (message.type) {
      case 'scan-result':
        if ('error' in message) {
          dispatch({ type: 'SCAN_ERROR', payload: message.error });
        } else {
          dispatch({ type: 'SCAN_SUCCESS', payload: message.data });
        }
        break;
      case 'variable-collections':
        if ('data' in message) {
          console.log('[ScanContext] Setting variable collections:', message.data);
          dispatch({ type: 'SET_VARIABLE_COLLECTIONS', payload: message.data });
        }
        break;
      case 'pages':
        if ('data' in message) {
          console.log('[ScanContext] Setting pages:', message.data);
          dispatch({ type: 'SET_PAGES', payload: message.data });
          // 첫 번째 페이지를 기본 팔레트로 자동 선택
          const firstPage = message.data[0];
          if (firstPage !== undefined) {
            console.log('[ScanContext] Auto-selecting first page:', firstPage);
            dispatch({
              type: 'SET_PALETTE',
              payload: {
                id: firstPage.id,
                name: firstPage.name,
                sourceType: 'page',
                colorCount: firstPage.colorCount,
                pageId: firstPage.id,
              },
            });
          }
        }
        break;
    }
  }, []);

  const sendMessage = useFigmaMessaging(handleMessage);

  const getCurrentPalettePayload = useCallback((): {
    paletteId: string;
    sourceType: PaletteSourceType;
  } | null => {
    if (state.selectedPalette === null) {
      return null;
    }
    return {
      paletteId: state.selectedPalette.id,
      sourceType: state.selectedPalette.sourceType,
    };
  }, [state.selectedPalette]);

  const scanSelection = useCallback((): void => {
    const payload = getCurrentPalettePayload();
    if (payload === null) {
      dispatch({ type: 'SCAN_ERROR', payload: '팔레트를 먼저 선택해주세요' });
      return;
    }
    dispatch({ type: 'START_SCAN' });
    sendMessage({
      type: 'scan-selection',
      payload,
    });
  }, [sendMessage, getCurrentPalettePayload]);

  const scanPage = useCallback((): void => {
    const payload = getCurrentPalettePayload();
    if (payload === null) {
      dispatch({ type: 'SCAN_ERROR', payload: '팔레트를 먼저 선택해주세요' });
      return;
    }
    dispatch({ type: 'START_SCAN' });
    sendMessage({
      type: 'scan-page',
      payload,
    });
  }, [sendMessage, getCurrentPalettePayload]);

  const fixColor = useCallback(
    (usage: ColorUsage): void => {
      if (usage.suggestion === null || usage.suggestion === undefined) return;

      const request: ColorFixRequest = {
        nodeId: usage.nodeId,
        propertyType: usage.propertyType,
        originalHex: usage.hex,
        targetHex: usage.suggestion.hex,
      };
      sendMessage({ type: 'fix-color', payload: request });
    },
    [sendMessage]
  );

  const fixAllColors = useCallback((): void => {
    const usages = state.scanResult?.colorUsages ?? [];
    const fixes: ColorFixRequest[] = usages
      .filter((usage): usage is ColorUsage & { suggestion: NonNullable<ColorUsage['suggestion']> } =>
        usage.suggestion !== null && usage.suggestion !== undefined
      )
      .map((usage) => ({
        nodeId: usage.nodeId,
        propertyType: usage.propertyType,
        originalHex: usage.hex,
        targetHex: usage.suggestion.hex,
      }));

    if (fixes.length > 0) {
      sendMessage({ type: 'fix-all', payload: { fixes } });
    }
  }, [sendMessage, state.scanResult]);

  const selectNode = useCallback(
    (nodeId: string): void => {
      sendMessage({ type: 'select-node', payload: { nodeId } });
    },
    [sendMessage]
  );

  const selectPalette = useCallback((palette: PaletteInfo): void => {
    dispatch({ type: 'SET_PALETTE', payload: palette });
  }, []);

  const loadVariableCollections = useCallback((): void => {
    sendMessage({ type: 'get-variable-collections' });
  }, [sendMessage]);

  const loadPages = useCallback((): void => {
    console.log('[ScanContext] Sending get-pages message');
    sendMessage({ type: 'get-pages' });
  }, [sendMessage]);

  const goToPage = useCallback(
    (pageId: string): void => {
      sendMessage({ type: 'go-to-page', payload: { pageId } });
    },
    [sendMessage]
  );

  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const allPalettes = useMemo((): readonly PaletteInfo[] => {
    console.log('[ScanContext] Computing allPalettes. pages:', state.pages, 'variableCollections:', state.variableCollections);
    const variablePalettes: PaletteInfo[] = state.variableCollections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      sourceType: 'variable' as const,
      colorCount: collection.colorCount,
    }));
    const pagePalettes: PaletteInfo[] = state.pages.map((page) => ({
      id: page.id,
      name: page.name,
      sourceType: 'page' as const,
      colorCount: page.colorCount,
      pageId: page.id,
    }));
    const result = [...pagePalettes, ...variablePalettes];
    console.log('[ScanContext] allPalettes result:', result);
    return result;
  }, [state.variableCollections, state.pages]);

  const contextValue = useMemo(
    (): ScanContextValue => ({
      state,
      scanSelection,
      scanPage,
      fixColor,
      fixAllColors,
      selectNode,
      selectPalette,
      loadVariableCollections,
      loadPages,
      goToPage,
      clearError,
      allPalettes,
    }),
    [
      state,
      scanSelection,
      scanPage,
      fixColor,
      fixAllColors,
      selectNode,
      selectPalette,
      loadVariableCollections,
      loadPages,
      goToPage,
      clearError,
      allPalettes,
    ]
  );

  return <ScanContext.Provider value={contextValue}>{children}</ScanContext.Provider>;
};

// ============================================
// Hook
// ============================================

export const useScan = (): ScanContextValue => {
  const context = useContext(ScanContext);
  if (context === null) {
    throw new Error('useScan must be used within a ScanProvider');
  }
  return context;
};
