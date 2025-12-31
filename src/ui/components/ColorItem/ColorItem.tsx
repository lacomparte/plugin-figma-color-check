import { useCallback, type ReactNode } from 'react';
import type { ColorFamily, ColorUsage } from '@/types';
import { useScan } from '../../context/ScanContext';
import styles from './ColorItem.module.css';

interface ColorItemProps {
  readonly usage: ColorUsage;
}

/**
 * 순수 함수: 색상 계열 CSS 클래스
 */
const getColorFamilyClass = (family: ColorFamily): string => {
  const classMap: Record<ColorFamily, string> = {
    grayscale: styles.familyGrayscale ?? '',
    blue: styles.familyBlue ?? '',
    red: styles.familyRed ?? '',
    yellow: styles.familyYellow ?? '',
    other: styles.familyOther ?? '',
  };
  return classMap[family];
};

/**
 * 순수 함수: 색상 계열 레이블
 */
const getColorFamilyLabel = (family: ColorFamily): string => {
  const labelMap: Record<ColorFamily, string> = {
    grayscale: 'Gray',
    blue: 'Blue',
    red: 'Red',
    yellow: 'Yellow',
    other: 'Other',
  };
  return labelMap[family];
};

/**
 * 순수 함수: 프로퍼티 타입 레이블
 */
const getPropertyTypeLabel = (propertyType: 'fill' | 'stroke'): string => {
  return propertyType === 'fill' ? 'Fill' : 'Stroke';
};

export const ColorItem = ({ usage }: ColorItemProps): ReactNode => {
  const { selectNode, fixColor } = useScan();

  const handleNodeClick = useCallback((): void => {
    selectNode(usage.nodeId);
  }, [selectNode, usage.nodeId]);

  const handleFixClick = useCallback((): void => {
    fixColor(usage);
  }, [fixColor, usage]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.swatch} style={{ backgroundColor: usage.hex }} />
        <div className={styles.info}>
          <div className={styles.hexRow}>
            <span className={styles.hex}>{usage.hex}</span>
            <span className={`${styles.family} ${getColorFamilyClass(usage.colorFamily)}`}>
              {getColorFamilyLabel(usage.colorFamily)}
            </span>
          </div>
          <button className={styles.nodeButton} type="button" onClick={handleNodeClick}>
            <span className={styles.nodeName}>{usage.nodeName}</span>
            <span className={styles.propertyType}>{getPropertyTypeLabel(usage.propertyType)}</span>
          </button>
        </div>
      </div>

      {usage.suggestion !== null && usage.suggestion !== undefined && (
        <div className={styles.suggestion}>
          <span className={styles.arrow}>→</span>
          <div className={styles.suggestionColor}>
            <div
              className={styles.suggestionSwatch}
              style={{ backgroundColor: usage.suggestion.hex }}
            />
            <span className={styles.suggestionName}>{usage.suggestion.name}</span>
            <span className={styles.suggestionHex}>{usage.suggestion.hex}</span>
          </div>
          <button className="btn btn-fix" type="button" onClick={handleFixClick}>
            수정
          </button>
        </div>
      )}
    </div>
  );
};
