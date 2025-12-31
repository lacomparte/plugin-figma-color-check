import type { ReactNode } from 'react';
import styles from './Header.module.css';

export const Header = (): ReactNode => {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>디자인 시스템 Color Checker</h1>
      <p className={styles.description}>디자인 시스템 컬러 팔레트 준수 여부를 검사합니다</p>
    </header>
  );
};
