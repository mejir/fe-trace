// ============================================================
// FE-Trace useTracer カスタムフック
// 擬似言語のステップ実行を管理する
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import { tokenize } from '../interpreter/tokenizer';
import { parse } from '../interpreter/parser';
import { interpret } from '../interpreter/interpreter';
import type { ExecutionState } from '../interpreter/types';

interface UseTracerResult {
  states: ExecutionState[];
  currentIndex: number;
  currentState: ExecutionState | null;
  totalSteps: number;
  goNext: () => void;
  goPrev: () => void;
  goFirst: () => void;
  goLast: () => void;
  isFirst: boolean;
  isLast: boolean;
  error: string | null;
}

/**
 * 擬似言語コードをステップ実行するフック
 * @param pseudocodeLines 擬似言語コード（1行ずつの配列）
 */
export function useTracer(pseudocodeLines: string[]): UseTracerResult {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 擬似言語をパース・実行して全ステップを生成（メモ化）
  const { states, error } = useMemo(() => {
    try {
      const source = pseudocodeLines.join('\n');
      const tokens = tokenize(source);
      const ast = parse(tokens);
      const executionStates = interpret(ast);
      return { states: executionStates, error: null };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '不明なエラーが発生しました';
      return {
        states: [{
          step: 0,
          lineIndex: -1,
          variables: {},
          arrays: {},
          changedVars: [],
          changedArrayCells: [],
          log: `エラー: ${errorMessage}`,
          callDepth: 0,
        }] as ExecutionState[],
        error: errorMessage,
      };
    }
  }, [pseudocodeLines]);

  const totalSteps = states.length;
  const currentState = states[currentIndex] ?? null;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex >= totalSteps - 1;

  const goNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const goFirst = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  const goLast = useCallback(() => {
    setCurrentIndex(totalSteps - 1);
  }, [totalSteps]);

  return {
    states,
    currentIndex,
    currentState,
    totalSteps,
    goNext,
    goPrev,
    goFirst,
    goLast,
    isFirst,
    isLast,
    error,
  };
}
