import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import type { PaletteInfo } from '@/types';
import { useScan } from '../../context/ScanContext';
import { useDebounce } from '../../hooks/useDebounce';
import styles from './PaletteSelector.module.css';

/**
 * 순수 함수: 문자열 정규화 (공백 제거, 소문자)
 */
const normalizeString = (str: string): string => str.toLowerCase().replace(/\s+/g, '');

/**
 * 순수 함수: 팔레트 필터링 (공백 무시, 대소문자 무시)
 */
const filterPalettes = (palettes: readonly PaletteInfo[], query: string): readonly PaletteInfo[] => {
  if (query.trim() === '') {
    return palettes;
  }
  const normalizedQuery = normalizeString(query);
  return palettes.filter((palette) => normalizeString(palette.name).includes(normalizedQuery));
};

/**
 * 순수 함수: 소스 타입 레이블
 */
const getSourceTypeLabel = (sourceType: PaletteInfo['sourceType']): string => {
  switch (sourceType) {
    case 'variable':
      return 'Variables';
    case 'page':
      return '페이지';
  }
};

export const PaletteSelector = (): ReactNode => {
  const { state, selectPalette, loadVariableCollections, loadPages, goToPage, allPalettes } = useScan();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const debouncedQuery = useDebounce(searchQuery, 200);

  // 초기 로드 시 Variable Collections와 페이지 목록 가져오기
  useEffect(() => {
    loadVariableCollections();
    loadPages();
  }, [loadVariableCollections, loadPages]);

  const handleGoToPage = useCallback(
    (event: React.MouseEvent, pageId: string): void => {
      event.stopPropagation();
      goToPage(pageId);
    },
    [goToPage]
  );

  const filteredPalettes = useMemo(
    () => filterPalettes(allPalettes, debouncedQuery),
    [allPalettes, debouncedQuery]
  );

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(event.target.value);
    setIsOpen(true);
  }, []);

  const handleSelectPalette = useCallback(
    (palette: PaletteInfo): void => {
      selectPalette(palette);
      setSearchQuery('');
      setIsOpen(false);
    },
    [selectPalette]
  );

  const handleInputFocus = useCallback((): void => {
    setIsOpen(true);
  }, []);

  const handleInputBlur = useCallback((): void => {
    // 약간의 지연을 두어 클릭 이벤트가 처리되도록 함
    setTimeout(() => {
      setIsOpen(false);
    }, 150);
  }, []);

  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="palette-search">
        참조 팔레트
      </label>
      <div className={styles.selectorWrapper}>
        <input
          autoComplete="off"
          className={styles.input}
          id="palette-search"
          placeholder={state.selectedPalette?.name ?? '팔레트 검색...'}
          type="text"
          value={searchQuery}
          onBlur={handleInputBlur}
          onChange={handleSearchChange}
          onFocus={handleInputFocus}
        />
        {state.selectedPalette !== null && searchQuery === '' && (
          <div className={styles.selectedBadge}>
            <span className={styles.selectedName}>{state.selectedPalette.name}</span>
            <span className={styles.sourceType}>
              {getSourceTypeLabel(state.selectedPalette.sourceType)}
            </span>
          </div>
        )}
        {isOpen && filteredPalettes.length > 0 ? <ul className={styles.dropdown}>
            {filteredPalettes.map((palette) => (
              <li key={palette.id} className={styles.dropdownItem}>
                <button
                  className={styles.dropdownButton}
                  type="button"
                  onClick={() => {
                    handleSelectPalette(palette);
                  }}
                >
                  <span className={styles.paletteName}>{palette.name}</span>
                  <span className={styles.paletteInfo}>
                    <span className={styles.sourceTag}>
                      {getSourceTypeLabel(palette.sourceType)}
                    </span>
                    <span className={styles.colorCount}>{palette.colorCount}색</span>
                  </span>
                </button>
                {palette.sourceType === 'page' && palette.pageId !== undefined && (
                  <button
                    className={styles.goToButton}
                    title="페이지로 이동"
                    type="button"
                    onClick={(e) => {
                      handleGoToPage(e, palette.pageId!);
                    }}
                  >
                    →
                  </button>
                )}
              </li>
            ))}
          </ul> : null}
        {isOpen && filteredPalettes.length === 0 && searchQuery !== '' ? <div className={styles.noResults}>검색 결과가 없습니다</div> : null}
      </div>
    </div>
  );
};
