// ============================================================
// TraceTable - 変数トレース表コンポーネント
// ============================================================

import type { ExecutionState } from '../interpreter/types';
import styles from './TraceTable.module.css';

interface TraceTableProps {
  state: ExecutionState;
}

/** 変数の現在値を表形式で表示する */
export function TraceTable({ state }: TraceTableProps) {
  const varEntries = Object.entries(state.variables);

  if (varEntries.length === 0) {
    return <div className={styles.emptyState}>変数がありません</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.traceTable}>
        <thead>
          <tr>
            <th>変数名</th>
            <th>値</th>
          </tr>
        </thead>
        <tbody>
          {varEntries.map(([name, value]) => {
            const isChanged = state.changedVars.includes(name);
            return (
              <tr key={name} className={isChanged ? styles.changedRow : ''}>
                <td className={styles.varName}>{name}</td>
                <td className={value === undefined ? styles.undefinedValue : styles.varValue}>
                  {formatValue(value)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 値を表示用文字列に変換 */
function formatValue(value: number | boolean | string | undefined): string {
  if (value === undefined) return '−';
  if (typeof value === 'boolean') return value ? '真' : '偽';
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}
