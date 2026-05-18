// ============================================================
// ArrayViewer - 配列の視覚表示コンポーネント
// ============================================================

import type { ExecutionState } from '../interpreter/types';
import styles from './ArrayViewer.module.css';

interface ArrayViewerProps {
  state: ExecutionState;
}

/** 配列をマス目で横並び表示する */
export function ArrayViewer({ state }: ArrayViewerProps) {
  const arrayEntries = Object.entries(state.arrays);

  if (arrayEntries.length === 0) {
    return <div className={styles.emptyState}>配列がありません</div>;
  }

  return (
    <div className={styles.arrayViewerContainer}>
      {arrayEntries.map(([name, values]) => (
        <div key={name} className={styles.arraySection}>
          <div className={styles.arrayName}>{name}[]</div>
          <div className={styles.arrayGrid}>
            {values.map((value, index) => {
              const isChanged = state.changedArrayCells.some(
                cell => cell.name === name && cell.index === index
              );
              return (
                <div
                  key={index}
                  className={`${styles.arrayCell} ${isChanged ? styles.changedCell : ''}`}
                >
                  {/* インデックスは1始まりで表示 */}
                  <span className={styles.cellIndex}>{index + 1}</span>
                  <span className={styles.cellValue}>
                    {value === undefined ? '−' : String(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
