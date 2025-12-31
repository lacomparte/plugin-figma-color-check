import type { ReactNode } from 'react';
import styles from './Loading.module.css';

export const Loading = (): ReactNode => {
  return (
    <div className={styles.container}>
      <div className={styles.spinner} />
      <p className={styles.text}>색상 검사 중...</p>
    </div>
  );
};
