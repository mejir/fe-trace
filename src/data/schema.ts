// ============================================================
// FE-Trace 問題データスキーマ定義
// ============================================================

/** 選択肢 */
export interface Choice {
  label: string;  // 「ア」「イ」「ウ」「エ」
  value: string;  // 選択肢の値
}

/** 問題 */
export interface Question {
  id: string;                                       // 一意な問題 ID
  title: string;                                    // 問題タイトル
  source: string;                                   // 出典（年度・試験名）
  difficulty: 'easy' | 'medium' | 'hard';           // 難易度
  tags: string[];                                   // タグ（ソート種別など）
  pseudocode: string[];                             // 擬似言語コード（1要素＝1行）
  choices: Choice[];                                // 選択肢（ア〜エ）
  answer: string;                                   // 正解ラベル
  explanation: string;                              // 解説文
}
