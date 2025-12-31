import type { ReactNode } from 'react';
import styles from './Message.module.css';

interface MessageProps {
  readonly type: 'error' | 'success';
  readonly children: ReactNode;
}

export const Message = ({ type, children }: MessageProps): ReactNode => {
  return <div className={`${styles.message} ${styles[type]}`}>{children}</div>;
};
