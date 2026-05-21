import type { Question } from './schema';
import problemsData from './problems.json';

export const practiceQuestions: Question[] = problemsData.problems.map((p: any) => {
  // 難易度のマッピング (1: easy, 2: medium, 3: hard)
  const difficultyMap: Record<number, 'easy' | 'medium' | 'hard'> = {
    1: 'easy',
    2: 'medium',
    3: 'hard'
  };

  // 擬似言語コード（solve()呼び出しを追加してトレース可能にする）
  let codeLines = p.problem.pseudocode as string[];
  const codeStr = codeLines.join('\n');
  if (codeStr.includes('solve()')) {
    // 最終行にマーカーと関数呼び出しを追加
    codeLines = [...codeLines, '■', 'solve()'];
  }

  return {
    id: p.id,
    title: p.meta.title,
    source: 'オリジナル問題演習',
    difficulty: difficultyMap[p.meta.difficulty] || 'medium',
    tags: p.meta.tags,
    pseudocode: codeLines,
    choices: p.quiz.questions[0].choices.map((c: any) => ({
      label: c.id, // ア, イ, ウ, エ
      value: c.text
    })),
    answer: p.quiz.questions[0].answer,
    explanation: p.quiz.questions[0].explanation,
    statement: p.problem.statement
  };
});
