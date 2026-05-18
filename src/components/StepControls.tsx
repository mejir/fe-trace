// ============================================================
// StepControls - ステップ操作コンポーネント
// ============================================================

import { useEffect } from 'react';
import styles from './StepControls.module.css';

interface StepControlsProps {
  currentIndex: number;
  totalSteps: number;
  goNext: () => void;
  goPrev: () => void;
  goFirst: () => void;
  goLast: () => void;
  isFirst: boolean;
  isLast: boolean;
  log?: string;
}

/** ステップ実行の操作ボタンとステップ情報を表示する */
export function StepControls({
  currentIndex,
  totalSteps,
  goNext,
  goPrev,
  goFirst,
  goLast,
  isFirst,
  isLast,
  log,
}: StepControlsProps) {
  // キーボードショートカット: ← → キーでステップ移動
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // input要素にフォーカスがある場合はスキップ
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goFirst();
      } else if (e.key === 'End') {
        e.preventDefault();
        goLast();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, goFirst, goLast]);

  return (
    <div className={styles.controlsBar}>
      <button
        className={styles.stepButton}
        onClick={goFirst}
        disabled={isFirst}
        title="最初に戻る (Home)"
        id="btn-first"
      >
        |◀ 最初
      </button>
      <button
        className={styles.stepButton}
        onClick={goPrev}
        disabled={isFirst}
        title="前のステップ (←)"
        id="btn-prev"
      >
        ◀ 前へ
      </button>

      <span className={styles.stepInfo}>
        ステップ {currentIndex} / {totalSteps - 1}
      </span>

      <button
        className={styles.stepButton}
        onClick={goNext}
        disabled={isLast}
        title="次のステップ (→)"
        id="btn-next"
      >
        次へ ▶
      </button>
      <button
        className={styles.stepButton}
        onClick={goLast}
        disabled={isLast}
        title="最後まで (End)"
        id="btn-last"
      >
        最後 ▶|
      </button>

      {log && <span className={styles.logMessage} title={log}>{log}</span>}
    </div>
  );
}
