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
      <main className={`app-main ${mode}-mode`}>
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
    <div className={`trace-view-container ${mode}-container`}>
      {mode === 'practice' && question.statement && (
        <div className="practice-panel practice-statement">
          <div className="practice-panel-header">📝 問題文</div>
          <div className="practice-panel-body">
            <p>{question.statement}</p>
          </div>
        </div>
      )}

      <div className="trace-layout">
        <div className="code-section">
          <div className="panel">
            <div className="panel-header">💻 擬似言語コード ─ {question.title}</div>
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

      <div className="trace-controls-bar">
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
        <div className="practice-panel practice-quiz">
          <div className="practice-panel-header">🎯 選択肢から答えを選んでください</div>
          <div className="practice-panel-body">
            <div className="choices-grid">
              {question.choices.map((c) => {
                const isSelected = selectedAnswer === c.label;
                const isCorrect = selectedAnswer && c.label === question.answer;
                const isWrong = selectedAnswer && isSelected && c.label !== question.answer;
                
                let btnClass = 'choice-btn';
                if (isCorrect) btnClass += ' choice-correct';
                else if (isWrong) btnClass += ' choice-wrong';
                else if (selectedAnswer) btnClass += ' choice-disabled';
                else if (isSelected) btnClass += ' choice-selected';

                return (
                  <button 
                    key={c.label} 
                    className={btnClass}
                    onClick={() => !selectedAnswer && setSelectedAnswer(c.label)}
                    disabled={!!selectedAnswer}
                  >
                    <span className="choice-label">{c.label}</span>
                    <span className="choice-value">{c.value}</span>
                  </button>
                );
              })}
            </div>

            {selectedAnswer && (
              <div className={`practice-feedback ${selectedAnswer === question.answer ? 'feedback-correct' : 'feedback-wrong'}`}>
                <div className="feedback-header">
                  {selectedAnswer === question.answer ? '🎉 正解！' : '❌ 不正解...'}
                </div>
                <div className="feedback-body">
                  <strong>💡 解説:</strong> {question.explanation}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
