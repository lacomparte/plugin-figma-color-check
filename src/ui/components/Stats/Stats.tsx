import type { ReactNode } from 'react';
import { useScan } from '../../context/ScanContext';
import styles from './Stats.module.css';

export const Stats = (): ReactNode => {
  const { state } = useScan();

  if (state.scanResult === null) {
    return null;
  }

  const { totalColors, validColors, invalidColors } = state.scanResult;

  return (
    <div className={styles.container}>
      <div className={styles.statItem}>
        <span className={styles.label}>전체</span>
        <span className={styles.value}>{totalColors}</span>
      </div>
      <div className={styles.statItem}>
        <span className={styles.label}>준수</span>
        <span className={`${styles.value} ${styles.valid}`}>{validColors}</span>
      </div>
      <div className={styles.statItem}>
        <span className={styles.label}>위반</span>
        <span className={`${styles.value} ${styles.invalid}`}>{invalidColors}</span>
      </div>
    </div>
  );
};
