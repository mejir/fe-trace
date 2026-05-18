// ============================================================
// FE-Trace 擬似言語インタープリタ型定義 (Phase 2)
// ============================================================

// --- トークン型 ---

/** IPA 科目B 擬似言語のトークン種別 */
export type TokenType =
  // リテラル・識別子
  | 'NUMBER'       // 整数・実数リテラル
  | 'BOOLEAN'      // true / false
  | 'STRING'       // 文字列リテラル "..."
  | 'IDENT'        // 変数名・配列名
  // 型キーワード（宣言時のみ使用）
  | 'TYPE_INT'     // 整数型
  | 'TYPE_REAL'    // 実数型
  | 'TYPE_BOOL'    // 論理型
  | 'TYPE_CHAR'    // 文字型
  // 演算子
  | 'ASSIGN'       // ←
  | 'PLUS'         // +
  | 'MINUS'        // -
  | 'MULTIPLY'     // ×
  | 'DIVIDE'       // ÷
  | 'MOD'          // mod（剰余）
  | 'EQ'           // =
  | 'NEQ'          // ≠
  | 'LT'           // <
  | 'GT'           // >
  | 'LEQ'          // ≦
  | 'GEQ'          // ≧
  | 'AND'          // and
  | 'OR'           // or
  | 'NOT'          // not
  // 制御構文キーワード
  | 'IF' | 'ELSE' | 'ELSEIF' | 'ENDIF'
  | 'WHILE' | 'ENDWHILE'
  | 'FOR' | 'WO' | 'FROM' | 'TO' | 'BY_INC' | 'BY_DEC' | 'ENDFOR'
  // Phase 2 追加
  | 'FUNC_DEF'     // ○ (関数・手続き定義)
  | 'END_FUNC'     // ■ (関数定義終了マーカー)
  | 'RETURN'       // return
  // 区切り文字
  | 'LBRACKET'     // [
  | 'RBRACKET'     // ]
  | 'LPAREN'       // (
  | 'RPAREN'       // )
  | 'COMMA'        // ,
  | 'COLON'        // :
  | 'LBRACE'       // {（配列初期化）
  | 'RBRACE'       // }
  // 特殊
  | 'COMMENT'      // /* ... */（内容は捨てる）
  | 'EOF';

/** トークン */
export interface Token {
  type: TokenType;
  value: string;    // 元の文字列
  line: number;     // 行番号（0始まり）
}

// --- AST ノード型 ---

/** 式（Expression）ノード */
export type Expression =
  | BinaryOp
  | UnaryOp
  | Literal
  | Identifier
  | ArrayAccess
  | FunctionCall;

/** 文（Statement）ノード */
export type Statement =
  | VarDecl
  | Assign
  | IfStmt
  | WhileStmt
  | ForStmt
  | FuncDef        // 関数・手続き定義
  | ReturnStmt     // return文
  | CallStmt;      // 手続き呼び出し文

/** プログラム全体 */
export interface Program {
  type: 'Program';
  body: Statement[];
}

/** 変数宣言 */
export interface VarDecl {
  type: 'VarDecl';
  name: string;
  isArray: boolean;
  size?: number;          // 配列サイズ指定 A[8]
  init?: Expression[];    // 配列初期化 {1,2,3} or 単一値
  line: number;
}

/** 代入文 */
export interface Assign {
  type: 'Assign';
  target: Identifier | ArrayAccess;
  value: Expression;
  line: number;
}

/** if 文 */
export interface IfStmt {
  type: 'IfStmt';
  condition: Expression;
  then: Statement[];
  elseIfClauses: { condition: Expression; body: Statement[]; line: number }[];
  elseBody: Statement[];
  line: number;
}

/** while 文 */
export interface WhileStmt {
  type: 'WhileStmt';
  condition: Expression;
  body: Statement[];
  line: number;
}

/** for 文 */
export interface ForStmt {
  type: 'ForStmt';
  variable: string;
  from: Expression;
  to: Expression;
  step: Expression;
  body: Statement[];
  line: number;
}

/** 関数・手続きの引数定義 */
export interface Param {
  name: string;
  isArray: boolean;
}

/** 関数・手続き定義 (○ 記法) */
export interface FuncDef {
  type: 'FuncDef';
  name: string;
  params: Param[];
  returnType: string | null;  // null は手続き（戻り値なし）
  body: Statement[];
  line: number;
}

/** return 文 */
export interface ReturnStmt {
  type: 'ReturnStmt';
  value: Expression | null;
  line: number;
}

/** 手続き呼び出し文（値を使わない呼び出し） */
export interface CallStmt {
  type: 'CallStmt';
  call: FunctionCall;
  line: number;
}

/** 二項演算 */
export interface BinaryOp {
  type: 'BinaryOp';
  op: string;
  left: Expression;
  right: Expression;
}

/** 単項演算 */
export interface UnaryOp {
  type: 'UnaryOp';
  op: 'not' | '-';
  operand: Expression;
}

/** リテラル */
export interface Literal {
  type: 'Literal';
  value: number | boolean | string;
}

/** 識別子 */
export interface Identifier {
  type: 'Identifier';
  name: string;
}

/** 配列アクセス */
export interface ArrayAccess {
  type: 'ArrayAccess';
  name: string;
  index: Expression;
}

/** 関数呼び出し（式として使う） */
export interface FunctionCall {
  type: 'FunctionCall';
  name: string;
  args: Expression[];
}

// --- 実行状態 ---

/** ステップ実行の状態スナップショット（イミュータブル） */
export interface ExecutionState {
  step: number;                                     // ステップ番号（0始まり）
  lineIndex: number;                                // 現在実行中の行番号（0始まり）
  variables: Record<string, Value>;
  arrays: Record<string, Value[]>;
  changedVars: string[];                            // このステップで変化した変数名（ハイライト用）
  changedArrayCells: { name: string; index: number }[]; // 変化した配列セル
  log: string;                                      // 「x ← 5」などの実行ログ文字列
  callDepth: number;                               // 呼び出し深さ（インデント表示用）
}

/** 値の型（Phase 2: 文字列追加） */
export type Value = number | boolean | string | undefined;

// --- エラー型 ---

/** インタープリタエラー */
export class InterpreterError extends Error {
  line: number;
  constructor(message: string, line: number) {
    super(`行 ${line + 1}: ${message}`);
    this.name = 'InterpreterError';
    this.line = line;
  }
}

/** return 制御フロー用シグナル（classはerasableSyntaxOnly対応のため関数で実装） */
export function createReturnSignal(value: Value): ReturnSignalObject {
  return { __isReturnSignal: true, value };
}

/** ReturnSignal 型 */
export interface ReturnSignalObject {
  __isReturnSignal: true;
  value: Value;
}

/** ReturnSignal かどうか判定 */
export function isReturnSignal(v: unknown): v is ReturnSignalObject {
  return typeof v === 'object' && v !== null && (v as ReturnSignalObject).__isReturnSignal === true;
}
