// ============================================================
// FE-Trace App.tsx - ルートコンポーネント
// ============================================================

import { useState, useMemo } from 'react';
import type { Question } from './data/schema';
import { sampleQuestions } from './data/samples';
import { practiceQuestions } from './data/problems';
import { useTracer } from './hooks/useTracer';
import { CodeViewer } from './components/CodeViewer';
import { TraceTable } from './components/TraceTable';
import { ArrayViewer } from './components/ArrayViewer';
import { StepControls } from './components/StepControls';
import { QuestionSelector } from './components/QuestionSelector';

type Mode = 'visualizer' | 'practice';
type Screen = 'select' | 'trace';

function App() {
  const [mode, setMode] = useState<Mode>('visualizer');
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
        {screen === 'select' && (
          <div className="mode-tabs" style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
            <button 
              className={mode === 'visualizer' ? 'active-tab' : 'inactive-tab'} 
              onClick={() => setMode('visualizer')}
              style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: mode === 'visualizer' ? '#007bff' : '#444', color: 'white', cursor: 'pointer' }}
            >
              ビジュアライザー
            </button>
            <button 
              className={mode === 'practice' ? 'active-tab' : 'inactive-tab'} 
              onClick={() => setMode('practice')}
              style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: mode === 'practice' ? '#007bff' : '#444', color: 'white', cursor: 'pointer' }}
            >
              問題演習
            </button>
          </div>
        )}
        {screen === 'trace' && (
          <button className="back-button" onClick={handleBack} id="btn-back">
            ← {mode === 'visualizer' ? 'サンプル一覧' : '問題一覧'}に戻る
          </button>
        )}
      </header>

      {/* メインコンテンツ */}
      <main className="app-main">
        {screen === 'select' && (
          <QuestionSelector
            questions={mode === 'visualizer' ? sampleQuestions : practiceQuestions}
            onSelect={handleSelectQuestion}
          />
        )}

        {screen === 'trace' && selectedQuestion && (
          <TraceView key={selectedQuestion.id} question={selectedQuestion} mode={mode} />
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
  mode: 'visualizer' | 'practice';
}

function TraceView({ question, mode }: TraceViewProps) {
  const pseudocodeLines = useMemo(() => question.pseudocode, [question]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

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
      {mode === 'practice' && question.statement && (
        <div className="practice-header" style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
          <h3>問題文</h3>
          <p>{question.statement}</p>
        </div>
      )}

      <div className="trace-layout">
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

        <div className="vars-section">
          <div className="panel">
            <div className="panel-header">📊 変数</div>
            <div className="panel-body">
              <TraceTable state={currentState} />
            </div>
          </div>
        </div>

        <div className="arrays-section">
          <div className="panel">
            <div className="panel-header">📦 配列</div>
            <div className="panel-body">
              <ArrayViewer state={currentState} />
            </div>
          </div>
        </div>
      </div>

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

      {mode === 'practice' && question.choices && (
        <div className="practice-quiz" style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
          <h3>選択肢から答えを選んでください</h3>
          <div className="choices" style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
            {question.choices.map((c) => {
              const isSelected = selectedAnswer === c.label;
              const isCorrect = selectedAnswer && c.label === question.answer;
              const isWrong = selectedAnswer && isSelected && c.label !== question.answer;
              
              let bgColor = '#444';
              if (isCorrect) bgColor = '#28a745';
              else if (isWrong) bgColor = '#dc3545';
              else if (isSelected) bgColor = '#007bff'; // This shouldn't be reached if we reveal answer immediately

              return (
                <button 
                  key={c.label} 
                  onClick={() => !selectedAnswer && setSelectedAnswer(c.label)}
                  style={{
                    padding: '12px 24px', 
                    borderRadius: '4px', 
                    border: 'none',
                    background: bgColor,
                    color: 'white',
                    cursor: selectedAnswer ? 'default' : 'pointer',
                    flex: '1 1 calc(50% - 10px)'
                  }}
                  disabled={!!selectedAnswer}
                >
                  <strong>{c.label}</strong>: {c.value}
                </button>
              );
            })}
          </div>

          {selectedAnswer && (
            <div className="practice-feedback" style={{ marginTop: '16px', padding: '16px', borderRadius: '4px', background: selectedAnswer === question.answer ? 'rgba(40, 167, 69, 0.2)' : 'rgba(220, 53, 69, 0.2)' }}>
              <h4>{selectedAnswer === question.answer ? '🎉 正解！' : '❌ 不正解...'}</h4>
              <p style={{ marginTop: '8px' }}><strong>解説:</strong> {question.explanation}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default App;
