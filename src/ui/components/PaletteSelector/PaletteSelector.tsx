import { useCallback, useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import type { ColorPropertyType } from '@/types';
import { useScan } from '../../context/ScanContext';
import styles from './PaletteSelector.module.css';

export const PaletteSelector = (): ReactNode => {
  const { state, selectPalette, addUrlPalette, deletePalette, loadSavedPalettes, clearError } =
    useScan();

  // Form state
  const [layerName, setLayerName] = useState('');
  const [paletteName, setPaletteName] = useState('');
  const [filterNodeName, setFilterNodeName] = useState('');
  const [colorProperty, setColorProperty] = useState<ColorPropertyType>('all');

  // Palette expansion state
  const [expandedPaletteIds, setExpandedPaletteIds] = useState<Set<string>>(new Set());

  // 초기 로드 시 저장된 팔레트 목록 가져오기
  useEffect(() => {
    loadSavedPalettes();
  }, [loadSavedPalettes]);

  const handleAddPalette = useCallback((): void => {
    if (!layerName.trim()) {
      return;
    }

    addUrlPalette(
      layerName.trim(),
      paletteName.trim() || undefined,
      filterNodeName.trim() || undefined,
      colorProperty
    );

    // 입력 필드 초기화
    setLayerName('');
    setPaletteName('');
    setFilterNodeName('');
    setColorProperty('all');
  }, [layerName, paletteName, filterNodeName, colorProperty, addUrlPalette]);

  const handleDeletePalette = useCallback(
    (paletteId: string, event: React.MouseEvent): void => {
      event.stopPropagation();
      if (confirm('이 팔레트를 삭제하시겠습니까?')) {
        deletePalette(paletteId);
      }
    },
    [deletePalette]
  );

  const handleSelectPalette = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const paletteId = event.target.value;
      const palette = state.savedPalettes.find((p) => p.id === paletteId);
      if (palette) {
        selectPalette(palette);
      }
    },
    [state.savedPalettes, selectPalette]
  );

  const togglePaletteExpansion = useCallback((paletteId: string): void => {
    setExpandedPaletteIds((prev) => {
      const next = new Set(prev);
      if (next.has(paletteId)) {
        next.delete(paletteId);
      } else {
        next.add(paletteId);
      }
      return next;
    });
  }, []);

  return (
    <div className={styles.container}>
      <label className={styles.label}>참조 팔레트</label>

      {/* 팔레트 추가 폼 */}
      <div className={styles.addForm}>
        <input
          className={styles.input}
          placeholder="Layer 이름 (예: Frame 1171278887)"
          type="text"
          value={layerName}
          onChange={(e) => setLayerName(e.target.value)}
        />

        <input
          className={styles.input}
          placeholder="필터링할 노드 이름 (선택, 예: box)"
          type="text"
          value={filterNodeName}
          onChange={(e) => setFilterNodeName(e.target.value)}
        />

        <select
          className={styles.select}
          value={colorProperty}
          onChange={(e) => setColorProperty(e.target.value as ColorPropertyType)}
        >
          <option value="all">모든 색상</option>
          <option value="fills">배경 색상 (Fills)</option>
          <option value="strokes">테두리 색상 (Strokes)</option>
          <option value="text">텍스트 색상 (Text)</option>
          <option value="effects">효과 색상 (Effects)</option>
        </select>

        <input
          className={styles.input}
          placeholder="팔레트 이름 (선택, 비어있으면 Layer 이름 사용)"
          type="text"
          value={paletteName}
          onChange={(e) => setPaletteName(e.target.value)}
        />

        {/* Error message above button with dismiss */}
        {state.error && (
          <div className={styles.errorBanner}>
            <span className={styles.errorText}>{state.error}</span>
            <button
              className={styles.errorCloseButton}
              type="button"
              onClick={clearError}
              aria-label="에러 닫기"
            >
              ✕
            </button>
          </div>
        )}

        <button
          className={styles.addButton}
          disabled={!layerName.trim()}
          type="button"
          onClick={handleAddPalette}
        >
          팔레트에 추가
        </button>
      </div>

      {/* 저장된 팔레트 선택 */}
      <div className={styles.selectorWrapper}>
        <select
          className={styles.select}
          value={state.selectedPalette?.id ?? ''}
          onChange={handleSelectPalette}
        >
          <option value="">팔레트를 선택하세요...</option>
          {state.savedPalettes.map((palette) => (
            <option key={palette.id} value={palette.id}>
              {palette.name} ({palette.colorCount}색)
            </option>
          ))}
        </select>

        {/* 선택된 팔레트 정보 & 삭제 버튼 */}
        {state !== null && state.selectedPalette !== null && state.selectedPalette.id !== null ? (
          <div className={styles.selectedInfo}>
            <span className={styles.selectedName}>{state.selectedPalette.name}</span>
            <span className={styles.colorCount}>({state.selectedPalette.colorCount}색)</span>
            <button
              className={styles.deleteButton}
              title="팔레트 삭제"
              type="button"
              onClick={(e) => handleDeletePalette(state.selectedPalette?.id || '', e)}
            >
              ✕
            </button>
          </div>
        ) : null}
      </div>

      {/* Palette 목록 with expand/collapse */}
      {state.savedPalettes.length > 0 && (
        <div className={styles.paletteList}>
          <h3 className={styles.paletteListTitle}>저장된 팔레트 목록</h3>
          {state.savedPalettes.map((palette) => {
            const isExpanded = expandedPaletteIds.has(palette.id);
            return (
              <div key={palette.id} className={styles.paletteItem}>
                <div className={styles.paletteHeader}>
                  <button
                    className={styles.expandButton}
                    type="button"
                    onClick={() => togglePaletteExpansion(palette.id)}
                    aria-label={isExpanded ? '접기' : '펼치기'}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  <span className={styles.paletteName}>
                    {palette.name} ({palette.colorCount}색)
                  </span>
                  <button
                    className={styles.paletteDeleteButton}
                    title="팔레트 삭제"
                    type="button"
                    onClick={(e) => handleDeletePalette(palette.id, e)}
                  >
                    ✕
                  </button>
                </div>

                {isExpanded && palette.colors && palette.colors.length > 0 && (
                  <div className={styles.colorGrid}>
                    {palette.colors.map((color: { hex: string; name: string }) => (
                      <div key={color.hex} className={styles.colorItem}>
                        <div
                          className={styles.colorSwatch}
                          style={{ backgroundColor: color.hex }}
                          title={color.hex}
                        />
                        <span className={styles.colorHex}>{color.hex}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
