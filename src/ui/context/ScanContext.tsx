import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type {
  ColorFixRequest,
  ColorPropertyType,
  ColorUsage,
  PaletteInfo,
  PluginMessageToUi,
  ScanResult,
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
  readonly savedPalettes: readonly PaletteInfo[];
}

const initialState: ScanState = {
  isLoading: false,
  error: null,
  scanResult: null,
  selectedPalette: null,
  savedPalettes: [],
};

// ============================================
// Actions
// ============================================

type ScanAction =
  | { type: 'START_SCAN' }
  | { type: 'SCAN_SUCCESS'; payload: ScanResult }
  | { type: 'SCAN_ERROR'; payload: string }
  | { type: 'SET_PALETTE'; payload: PaletteInfo }
  | { type: 'SET_SAVED_PALETTES'; payload: readonly PaletteInfo[] }
  | { type: 'ADD_PALETTE'; payload: PaletteInfo }
  | { type: 'DELETE_PALETTE'; payload: string }
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
    case 'SET_SAVED_PALETTES':
      return { ...state, savedPalettes: action.payload };
    case 'ADD_PALETTE':
      return { ...state, savedPalettes: [...state.savedPalettes, action.payload] };
    case 'DELETE_PALETTE':
      return {
        ...state,
        savedPalettes: state.savedPalettes.filter((p) => p.id !== action.payload),
        selectedPalette:
          state.selectedPalette?.id === action.payload ? null : state.selectedPalette,
      };
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
  readonly addUrlPalette: (
    layerName: string,
    paletteName?: string,
    filterNodeName?: string,
    colorProperty?: ColorPropertyType
  ) => void;
  readonly deletePalette: (paletteId: string) => void;
  readonly loadSavedPalettes: () => void;
  readonly clearError: () => void;
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
    switch (message.type) {
      case 'scan-result':
        if ('error' in message) {
          dispatch({ type: 'SCAN_ERROR', payload: message.error });
        } else {
          dispatch({ type: 'SCAN_SUCCESS', payload: message.data });
        }
        break;
      case 'saved-palettes':
        dispatch({ type: 'SET_SAVED_PALETTES', payload: message.data });
        break;
      case 'palette-added':
        if ('error' in message) {
          dispatch({ type: 'SCAN_ERROR', payload: message.error });
        } else {
          dispatch({ type: 'ADD_PALETTE', payload: message.data });
          // 추가한 팔레트를 자동으로 선택
          dispatch({ type: 'SET_PALETTE', payload: message.data });
        }
        break;
      case 'palette-deleted':
        dispatch({ type: 'DELETE_PALETTE', payload: message.paletteId });
        break;
    }
  }, []);

  const sendMessage = useFigmaMessaging(handleMessage);

  const scanSelection = useCallback((): void => {
    if (state.selectedPalette === null) {
      dispatch({ type: 'SCAN_ERROR', payload: '팔레트를 먼저 선택해주세요' });
      return;
    }
    dispatch({ type: 'START_SCAN' });
    sendMessage({
      type: 'scan-selection',
      payload: { paletteId: state.selectedPalette.id },
    });
  }, [sendMessage, state.selectedPalette]);

  const scanPage = useCallback((): void => {
    if (state.selectedPalette === null) {
      dispatch({ type: 'SCAN_ERROR', payload: '팔레트를 먼저 선택해주세요' });
      return;
    }
    dispatch({ type: 'START_SCAN' });
    sendMessage({
      type: 'scan-page',
      payload: { paletteId: state.selectedPalette.id },
    });
  }, [sendMessage, state.selectedPalette]);

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
      .filter(
        (usage): usage is ColorUsage & { suggestion: NonNullable<ColorUsage['suggestion']> } =>
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

  const addUrlPalette = useCallback(
    (
      layerName: string,
      paletteName?: string,
      filterNodeName?: string,
      colorProperty?: ColorPropertyType
    ): void => {
      sendMessage({
        type: 'add-url-palette',
        payload: { layerName, paletteName, filterNodeName, colorProperty },
      });
    },
    [sendMessage]
  );

  const deletePalette = useCallback(
    (paletteId: string): void => {
      sendMessage({ type: 'delete-palette', payload: { paletteId } });
    },
    [sendMessage]
  );

  const loadSavedPalettes = useCallback((): void => {
    sendMessage({ type: 'get-saved-palettes' });
  }, [sendMessage]);

  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const contextValue = useMemo(
    (): ScanContextValue => ({
      state,
      scanSelection,
      scanPage,
      fixColor,
      fixAllColors,
      selectNode,
      selectPalette,
      addUrlPalette,
      deletePalette,
      loadSavedPalettes,
      clearError,
    }),
    [
      state,
      scanSelection,
      scanPage,
      fixColor,
      fixAllColors,
      selectNode,
      selectPalette,
      addUrlPalette,
      deletePalette,
      loadSavedPalettes,
      clearError,
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
