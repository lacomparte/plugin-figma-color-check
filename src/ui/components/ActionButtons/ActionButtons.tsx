import type { ReactNode } from 'react';
import { useScan } from '../../context/ScanContext';
import styles from './ActionButtons.module.css';

export const ActionButtons = (): ReactNode => {
  const { state, scanSelection, scanPage } = useScan();

  return (
    <div className={styles.container}>
      <button
        className={`btn btn-primary ${styles.button}`}
        disabled={state.isLoading}
        type="button"
        onClick={scanSelection}
      >
        선택 영역 검사
      </button>
      <button
        className={`btn btn-secondary ${styles.button}`}
        disabled={state.isLoading}
        type="button"
        onClick={scanPage}
      >
        페이지 전체 검사
      </button>
    </div>
  );
};
