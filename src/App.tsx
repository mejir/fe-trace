// ============================================================
// FE-Trace App.tsx - ルートコンポーネント
// ============================================================

import { useState, useMemo } from 'react';
import type { Question } from './data/schema';
import { sampleQuestions } from './data/samples';
import { useTracer } from './hooks/useTracer';
import { CodeViewer } from './components/CodeViewer';
import { TraceTable } from './components/TraceTable';
import { ArrayViewer } from './components/ArrayViewer';
import { StepControls } from './components/StepControls';
import { QuestionSelector } from './components/QuestionSelector';

type Screen = 'select' | 'trace';

function App() {
  const [screen, setScreen] = useState<Screen>('select');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  /** 問題を選択してトレース画面に遷移 */
  const handleSelectQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setScreen('trace');
  };

  /** 問題選択画面に戻る */
  const handleBack = () => {
    setScreen('select');
    setSelectedQuestion(null);
  };

  return (
    <>
      {/* ヘッダー */}
      <header className="app-header">
        <h1>
          <span className="logo-icon">🔍</span>
          FE-Trace
        </h1>
        {screen === 'trace' && (
          <button className="back-button" onClick={handleBack} id="btn-back">
            ← 問題一覧に戻る
          </button>
        )}
      </header>

      {/* メインコンテンツ */}
      <main className="app-main">
        {screen === 'select' && (
          <QuestionSelector
            questions={sampleQuestions}
            onSelect={handleSelectQuestion}
          />
        )}

        {screen === 'trace' && selectedQuestion && (
          <TraceView question={selectedQuestion} />
        )}
      </main>
    </>
  );
}

// ============================================================
// トレース画面
// ============================================================

interface TraceViewProps {
  question: Question;
}

function TraceView({ question }: TraceViewProps) {
  // useMemo で pseudocodeLines を安定させる
  const pseudocodeLines = useMemo(() => question.pseudocode, [question]);

  const {
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
  } = useTracer(pseudocodeLines);

  if (error) {
    return <div className="error-banner">⚠️ {error}</div>;
  }

  if (!currentState) {
    return <div className="error-banner">⚠️ 実行結果がありません</div>;
  }

  return (
    <>
      <div className="trace-layout">
        {/* コード表示パネル */}
        <div className="code-section">
          <div className="panel">
            <div className="panel-header">📝 擬似言語コード ─ {question.title}</div>
            <div className="panel-body">
              <CodeViewer
                lines={question.pseudocode}
                currentLine={currentState.lineIndex}
              />
            </div>
          </div>
        </div>

        {/* 変数パネル */}
        <div className="vars-section">
          <div className="panel">
            <div className="panel-header">📊 変数</div>
            <div className="panel-body">
              <TraceTable state={currentState} />
            </div>
          </div>
        </div>

        {/* 配列パネル */}
        <div className="arrays-section">
          <div className="panel">
            <div className="panel-header">📦 配列</div>
            <div className="panel-body">
              <ArrayViewer state={currentState} />
            </div>
          </div>
        </div>
      </div>

      {/* ステップ操作バー */}
      <div className="trace-controls-bar" style={{ marginTop: 16 }}>
        <StepControls
          currentIndex={currentIndex}
          totalSteps={totalSteps}
          goNext={goNext}
          goPrev={goPrev}
          goFirst={goFirst}
          goLast={goLast}
          isFirst={isFirst}
          isLast={isLast}
          log={currentState.log}
        />
      </div>
    </>
  );
}

export default App;
