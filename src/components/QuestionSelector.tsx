// ============================================================
// QuestionSelector - 問題選択画面コンポーネント
// ============================================================

import type { Question } from '../data/schema';
import styles from './QuestionSelector.module.css';

interface QuestionSelectorProps {
  questions: Question[];
  onSelect: (question: Question) => void;
}

/** 問題一覧をカード形式で表示する */
export function QuestionSelector({ questions, onSelect }: QuestionSelectorProps) {
  return (
    <div className={styles.selectorContainer}>
      <h2 className={styles.selectorTitle}>問題を選択</h2>
      <p className={styles.selectorDesc}>
        問題を選んで、擬似言語コードのステップ実行を体験しましょう。
      </p>

      <div className={styles.questionGrid}>
        {questions.map(question => (
          <div
            key={question.id}
            className={styles.questionCard}
            onClick={() => onSelect(question)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(question);
              }
            }}
            id={`question-${question.id}`}
          >
            <div className={styles.cardTitle}>{question.title}</div>
            <div className={styles.cardMeta}>
              <span className={`${styles.badge} ${getDifficultyClass(question.difficulty)}`}>
                {getDifficultyLabel(question.difficulty)}
              </span>
              <span className={styles.source}>{question.source}</span>
            </div>
            <div className={styles.tagList}>
              {question.tags.map(tag => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 難易度に応じた CSS クラスを返す */
function getDifficultyClass(difficulty: Question['difficulty']): string {
  switch (difficulty) {
    case 'easy': return styles.badgeEasy;
    case 'medium': return styles.badgeMedium;
    case 'hard': return styles.badgeHard;
  }
}

/** 難易度の日本語ラベルを返す */
function getDifficultyLabel(difficulty: Question['difficulty']): string {
  switch (difficulty) {
    case 'easy': return '初級';
    case 'medium': return '中級';
    case 'hard': return '上級';
  }
}
