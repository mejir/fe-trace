// ============================================================
// CodeViewer - 擬似言語コード表示コンポーネント
// ============================================================

import { useRef, useEffect } from 'react';
import styles from './CodeViewer.module.css';

interface CodeViewerProps {
  lines: string[];
  currentLine: number; // 0始まり行番号
}

/** 擬似言語コードを行番号付きで表示し、現在実行中の行をハイライトする */
export function CodeViewer({ lines, currentLine }: CodeViewerProps) {
  const currentLineRef = useRef<HTMLDivElement>(null);

  // 現在行が変わったら自動スクロール
  useEffect(() => {
    currentLineRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [currentLine]);

  return (
    <div className={styles.codeViewer}>
      {lines.map((line, index) => {
        const isCurrent = index === currentLine;
        return (
          <div
            key={index}
            ref={isCurrent ? currentLineRef : null}
            className={`${styles.codeLine} ${isCurrent ? styles.currentLine : ''}`}
          >
            <span className={styles.lineNumber}>{index + 1}</span>
            <span className={styles.lineContent}>{line}</span>
          </div>
        );
      })}
    </div>
  );
}
