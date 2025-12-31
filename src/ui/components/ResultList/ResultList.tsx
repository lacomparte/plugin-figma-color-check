import type { ReactNode } from 'react';
import { useScan } from '../../context/ScanContext';
import { ColorItem } from '../ColorItem';
import { Loading } from '../Loading';
import { Message } from '../Message';
import styles from './ResultList.module.css';

/**
 * 순수 함수: 위반 색상 수 확인
 */
const hasViolations = (count: number): boolean => count > 0;

/**
 * 순수 함수: 수정 가능한 색상 있는지 확인
 */
const hasFixableSuggestions = (
  usages: readonly { suggestion?: unknown }[]
): boolean => usages.some((usage) => usage.suggestion !== null && usage.suggestion !== undefined);

export const ResultList = (): ReactNode => {
  const { state, fixAllColors } = useScan();

  // 로딩 상태
  if (state.isLoading) {
    return <Loading />;
  }

  // 에러 상태
  if (state.error !== null) {
    return <Message type="error">{state.error}</Message>;
  }

  // 스캔 결과 없음
  if (state.scanResult === null) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>검사할 영역을 선택한 후 버튼을 클릭하세요</p>
      </div>
    );
  }

  const { colorUsages, invalidColors, totalColors } = state.scanResult;

  // 모든 색상이 유효
  if (!hasViolations(invalidColors) && totalColors > 0) {
    return <Message type="success">모든 색상이 디자인 시스템 팔레트를 준수합니다!</Message>;
  }

  // 위반 색상 없음 (검사 결과 0건)
  if (!hasViolations(invalidColors)) {
    return (
      <div className={styles.emptyResult}>
        <div className={styles.emptyIcon}>✓</div>
        <p className={styles.emptyText}>위반된 색상이 없습니다</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>위반 색상 목록 ({invalidColors})</span>
        {hasFixableSuggestions(colorUsages) && (
          <button className="btn btn-primary" type="button" onClick={fixAllColors}>
            모두 수정
          </button>
        )}
      </div>
      <div className={styles.list}>
        {colorUsages.map((usage) => (
          <ColorItem key={`${usage.nodeId}-${usage.propertyType}`} usage={usage} />
        ))}
      </div>
    </div>
  );
};
