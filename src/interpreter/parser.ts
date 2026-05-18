// ============================================================
// FE-Trace 擬似言語パーサー（再帰下降）Phase 2
// ============================================================

import type {
  Token, TokenType,
  Program, Statement, Expression,
  VarDecl, IfStmt, WhileStmt, ForStmt,
  FuncDef, ReturnStmt,
  BinaryOp, UnaryOp, Identifier, ArrayAccess,
  Param,
} from './types';
import { InterpreterError } from './types';

/** トークン列を AST に変換する */
export function parse(tokens: Token[]): Program {
  const parser = new Parser(tokens);
  return parser.parseProgram();
}

// ============================================================
// パーサークラス
// ============================================================

class Parser {
  private tokens: Token[];
  private pos: number = 0;
  /** カンマ区切り宣言の保留バッファ */
  private pendingDecls: VarDecl[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  // --- ユーティリティ ---

  /** 現在のトークンを取得 */
  private current(): Token {
    return this.tokens[this.pos] ?? { type: 'EOF', value: '', line: 0 };
  }

  /** 指定タイプなら消費して返す、そうでなければ null */
  private match(...types: TokenType[]): Token | null {
    if (types.includes(this.current().type)) {
      return this.tokens[this.pos++];
    }
    return null;
  }

  /** 指定タイプを期待し、消費する。一致しなければエラー */
  private expect(type: TokenType, context?: string): Token {
    const token = this.current();
    if (token.type !== type) {
      const msg = context
        ? `${context}: '${type}' が期待されましたが '${token.type}' (${token.value}) が見つかりました`
        : `'${type}' が期待されましたが '${token.type}' (${token.value}) が見つかりました`;
      throw new InterpreterError(msg, token.line);
    }
    this.pos++;
    return token;
  }

  /** 現在のトークンが指定タイプかチェック（消費しない） */
  private check(...types: TokenType[]): boolean {
    return types.includes(this.current().type);
  }

  // ============================================================
  // プログラム・文
  // ============================================================

  /** プログラム全体を解析 */
  parseProgram(): Program {
    const body: Statement[] = [];
    while (!this.check('EOF')) {
      // 保留中の宣言があれば先に処理
      if (this.pendingDecls.length > 0) {
        body.push(this.pendingDecls.shift()!);
        continue;
      }
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
    }
    return { type: 'Program', body };
  }

  /** 文を1つ解析 */
  private parseStatement(): Statement | null {
    const token = this.current();

    // 関数・手続き定義 ○
    if (this.check('FUNC_DEF')) {
      return this.parseFuncDef();
    }

    // 型宣言（整数型、実数型、論理型、文字型）
    if (this.check('TYPE_INT', 'TYPE_REAL', 'TYPE_BOOL', 'TYPE_CHAR')) {
      return this.parseVarDecl();
    }

    // if 文
    if (this.check('IF')) {
      return this.parseIfStmt();
    }

    // while 文
    if (this.check('WHILE')) {
      return this.parseWhileStmt();
    }

    // for 文
    if (this.check('FOR')) {
      return this.parseForStmt();
    }

    // return 文
    if (this.check('RETURN')) {
      return this.parseReturnStmt();
    }

    // 識別子: 代入文 or 手続き呼び出し文
    if (this.check('IDENT')) {
      return this.parseIdentStatement();
    }

    // 認識できないトークンはスキップ
    console.warn(`[parser] 予期しないトークン '${token.type}' (${token.value}) を行 ${token.line + 1} でスキップ`);
    this.pos++;
    return null;
  }

  // ============================================================
  // 関数・手続き定義（Phase 2）
  // ============================================================

  /**
   * 関数・手続き定義をパース
   * パターン:
   *   ○整数型: funcName(整数型: x, 整数型の配列: A)  ← 関数（戻り値あり）
   *   ○funcName(整数型: x)                           ← 手続き（戻り値なし）
   */
  private parseFuncDef(): FuncDef {
    const funcDefTok = this.expect('FUNC_DEF', '関数定義');
    const line = funcDefTok.line;

    let returnType: string | null = null;
    let name: string;

    // 戻り値型があるか確認（型キーワードが続く場合は関数）
    if (this.check('TYPE_INT', 'TYPE_REAL', 'TYPE_BOOL', 'TYPE_CHAR')) {
      returnType = this.current().value;
      this.pos++; // 型トークンを消費
      this.expect('COLON', '関数定義の戻り値型');
    }

    // 関数名
    const nameTok = this.expect('IDENT', '関数名');
    name = nameTok.value;

    // 引数リスト
    this.expect('LPAREN', '関数定義の引数リスト');
    const params = this.parseFuncParams();
    this.expect('RPAREN', '関数定義の引数リスト');

    // ボディ（■までの文列）
    // 関数ブロックの終了マーカー ■ で停止
    const body = this.parseBlock('END_FUNC');
    this.expect('END_FUNC', '関数定義の終了');
    return { type: 'FuncDef', name, params, returnType, body, line };
  }

  /**
   * 引数リストをパース
   * 空 or (整数型: x) or (整数型の配列: A) or 複数
   * 「整数型の配列」の場合、トークナイザーでは TYPE_INT として扱われる
   */
  private parseFuncParams(): Param[] {
    const params: Param[] = [];
    if (this.check('RPAREN')) return params;

    params.push(this.parseSingleParam());
    while (this.match('COMMA')) {
      params.push(this.parseSingleParam());
    }
    return params;
  }

  /** 引数を1つパース: 型名: 変数名 or 型名の配列: 変数名 */
  private parseSingleParam(): Param {
    // 型トークン（TYPE_INT など）
    if (!this.check('TYPE_INT', 'TYPE_REAL', 'TYPE_BOOL', 'TYPE_CHAR')) {
      throw new InterpreterError(
        `引数の型宣言が必要です（現在: ${this.current().type} "${this.current().value}"）`,
        this.current().line
      );
    }
    const typeTok = this.current();
    this.pos++;

    // 「整数型の配列」の場合はisArray=true
    const isArray = typeTok.value.includes('の配列');

    this.expect('COLON', '引数の型宣言');
    const nameTok = this.expect('IDENT', '引数名');

    // 引数名の後に [] があれば配列（もう一つの記法）
    const hasArrayBracket = !!this.match('LBRACKET');
    if (hasArrayBracket) this.match('RBRACKET');

    return { name: nameTok.value, isArray: isArray || hasArrayBracket };
  }

  // ============================================================
  // 変数宣言
  // ============================================================

  /**
   * 変数宣言をパース
   * パターン:
   *   整数型: x
   *   整数型: x, y, z
   *   整数型: A[8]
   *   整数型: A[] ← {1, 2, 3}
   */
  private parseVarDecl(): Statement {
    const typeTok = this.current();
    this.pos++; // 型キーワードを消費
    this.expect('COLON', '変数宣言');
    const line = typeTok.line;

    // カンマ区切りで複数変数を宣言できる
    const decls: VarDecl[] = [];
    decls.push(this.parseSingleVarDecl(line));

    while (this.match('COMMA')) {
      decls.push(this.parseSingleVarDecl(line));
    }

    if (decls.length === 1) return decls[0];

    // 複数宣言: 最初を返し残りを保留
    for (let i = decls.length - 1; i >= 1; i--) {
      this.pendingDecls.unshift(decls[i]);
    }
    return decls[0];
  }

  /** 単一の変数/配列宣言をパース */
  private parseSingleVarDecl(line: number): VarDecl {
    const nameTok = this.expect('IDENT', '変数宣言');
    const name = nameTok.value;

    // 配列宣言チェック
    if (this.match('LBRACKET')) {
      let size: number | undefined;
      if (this.check('NUMBER')) {
        size = Number(this.current().value);
        this.pos++;
      }
      this.expect('RBRACKET', '配列宣言');

      // 初期化 ← {1, 2, 3}
      if (this.match('ASSIGN')) {
        this.expect('LBRACE', '配列初期化');
        const init: Expression[] = [];
        if (!this.check('RBRACE')) {
          init.push(this.parseExpression());
          while (this.match('COMMA')) {
            init.push(this.parseExpression());
          }
        }
        this.expect('RBRACE', '配列初期化');
        return { type: 'VarDecl', name, isArray: true, size, init, line };
      }

      return { type: 'VarDecl', name, isArray: true, size, line };
    }

    // 単純変数の初期化
    if (this.match('ASSIGN')) {
      const init = [this.parseExpression()];
      return { type: 'VarDecl', name, isArray: false, init, line };
    }

    return { type: 'VarDecl', name, isArray: false, line };
  }

  // ============================================================
  // return 文（Phase 2）
  // ============================================================

  private parseReturnStmt(): ReturnStmt {
    const tok = this.expect('RETURN', 'return文');
    const line = tok.line;

    // EOF または次が制御構文の終端なら値なしreturn
    if (this.check('EOF', 'ENDIF', 'ENDWHILE', 'ENDFOR', 'FUNC_DEF')) {
      return { type: 'ReturnStmt', value: null, line };
    }
    // 改行後に来るトークンが次の文の先頭っぽければ値なし
    // ただし擬似言語は改行を明示的に認識しないのでまず式をパースする
    const value = this.parseExpression();
    return { type: 'ReturnStmt', value, line };
  }

  // ============================================================
  // 識別子で始まる文（代入 or 手続き呼び出し）
  // ============================================================

  private parseIdentStatement(): Statement {
    const nameTok = this.expect('IDENT', '文');
    const line = nameTok.line;

    // 関数呼び出し文: ident ( ...
    if (this.match('LPAREN')) {
      const args = this.parseCallArgs();
      this.expect('RPAREN', '関数呼び出し');
      const call = { type: 'FunctionCall' as const, name: nameTok.value, args };
      return { type: 'CallStmt', call, line };
    }

    // 配列要素への代入: ident [ ... ] ←
    if (this.match('LBRACKET')) {
      const indexExpr = this.parseExpression();
      this.expect('RBRACKET', '配列アクセス');
      const adjustedIndex: BinaryOp = {
        type: 'BinaryOp',
        op: '-',
        left: indexExpr,
        right: { type: 'Literal', value: 1 },
      };
      const target: ArrayAccess = {
        type: 'ArrayAccess',
        name: nameTok.value,
        index: adjustedIndex,
      };
      this.expect('ASSIGN', '配列代入');
      const value = this.parseExpression();
      return { type: 'Assign', target, value, line };
    }

    // 単純代入: ident ←
    this.expect('ASSIGN', '代入文');
    const value = this.parseExpression();
    const target: Identifier = { type: 'Identifier', name: nameTok.value };
    return { type: 'Assign', target, value, line };
  }

  /** 関数呼び出しの引数リストをパース */
  private parseCallArgs(): Expression[] {
    const args: Expression[] = [];
    if (this.check('RPAREN')) return args;
    args.push(this.parseExpression());
    while (this.match('COMMA')) {
      args.push(this.parseExpression());
    }
    return args;
  }

  // ============================================================
  // if 文
  // ============================================================

  private parseIfStmt(): IfStmt {
    const ifTok = this.expect('IF', 'if文');
    const line = ifTok.line;

    this.expect('LPAREN', 'if文の条件');
    const condition = this.parseExpression();
    this.expect('RPAREN', 'if文の条件');

    const then = this.parseBlock('ENDIF', 'ELSE', 'ELSEIF');

    const elseIfClauses: { condition: Expression; body: Statement[]; line: number }[] = [];
    let elseBody: Statement[] = [];

    while (this.check('ELSEIF')) {
      const elseIfTok = this.expect('ELSEIF', 'elseif');
      this.expect('LPAREN', 'elseif条件');
      const elseIfCond = this.parseExpression();
      this.expect('RPAREN', 'elseif条件');
      const elseIfBody = this.parseBlock('ENDIF', 'ELSE', 'ELSEIF');
      elseIfClauses.push({ condition: elseIfCond, body: elseIfBody, line: elseIfTok.line });
    }

    if (this.match('ELSE')) {
      elseBody = this.parseBlock('ENDIF');
    }

    this.expect('ENDIF', 'if文の終了');

    return { type: 'IfStmt', condition, then, elseIfClauses, elseBody, line };
  }

  // ============================================================
  // while 文
  // ============================================================

  private parseWhileStmt(): WhileStmt {
    const whileTok = this.expect('WHILE', 'while文');
    const line = whileTok.line;

    this.expect('LPAREN', 'while条件');
    const condition = this.parseExpression();
    this.expect('RPAREN', 'while条件');

    const body = this.parseBlock('ENDWHILE');
    this.expect('ENDWHILE', 'while文の終了');

    return { type: 'WhileStmt', condition, body, line };
  }

  // ============================================================
  // for 文
  // ============================================================

  /**
   * for 文をパース
   * for (i を 1 から N まで 1 ずつ増やす)
   */
  private parseForStmt(): ForStmt {
    const forTok = this.expect('FOR', 'for文');
    const line = forTok.line;

    this.expect('LPAREN', 'for文');
    const varTok = this.expect('IDENT', 'for文のカウンタ変数');
    const variable = varTok.value;

    this.expect('WO', 'for文「を」');
    const from = this.parseExpression();
    this.expect('FROM', 'for文「から」');
    const to = this.parseExpression();
    this.expect('TO', 'for文「まで」');
    const stepExpr = this.parseExpression();

    let step: Expression;
    if (this.match('BY_INC')) {
      step = stepExpr;
    } else if (this.match('BY_DEC')) {
      step = { type: 'UnaryOp', op: '-', operand: stepExpr } as UnaryOp;
    } else {
      step = stepExpr;
    }

    this.expect('RPAREN', 'for文');

    const body = this.parseBlock('ENDFOR');
    this.expect('ENDFOR', 'for文の終了');

    return { type: 'ForStmt', variable, from, to, step, body, line };
  }

  // ============================================================
  // ブロック（文の列）
  // ============================================================

  /**
   * 終了トークンが来るまで文をパースする
   * Phase 2: FUNC_DEF で次の関数定義が始まる場合もブロック終了
   */
  private parseBlock(...terminators: TokenType[]): Statement[] {
    const stmts: Statement[] = [];
    while (!this.check('EOF', 'FUNC_DEF', ...terminators)) {
      if (this.pendingDecls.length > 0) {
        stmts.push(this.pendingDecls.shift()!);
        continue;
      }
      const stmt = this.parseStatement();
      if (stmt) stmts.push(stmt);
    }
    return stmts;
  }

  // ============================================================
  // 式のパース（演算子優先順位）
  // ============================================================

  /** 式をパース（最も低い優先順位から開始） */
  parseExpression(): Expression {
    return this.parseOr();
  }

  /** or 演算 */
  private parseOr(): Expression {
    let left = this.parseAnd();
    while (this.match('OR')) {
      const right = this.parseAnd();
      left = { type: 'BinaryOp', op: 'or', left, right };
    }
    return left;
  }

  /** and 演算 */
  private parseAnd(): Expression {
    let left = this.parseComparison();
    while (this.match('AND')) {
      const right = this.parseComparison();
      left = { type: 'BinaryOp', op: 'and', left, right };
    }
    return left;
  }

  /** 比較演算 */
  private parseComparison(): Expression {
    let left = this.parseAddSub();
    while (this.check('EQ', 'NEQ', 'LT', 'GT', 'LEQ', 'GEQ')) {
      const opTok = this.current();
      this.pos++;
      const opMap: Record<string, string> = {
        'EQ': '=', 'NEQ': '≠', 'LT': '<', 'GT': '>', 'LEQ': '≦', 'GEQ': '≧'
      };
      const right = this.parseAddSub();
      left = { type: 'BinaryOp', op: opMap[opTok.type] ?? opTok.value, left, right };
    }
    return left;
  }

  /** 加算・減算 */
  private parseAddSub(): Expression {
    let left = this.parseMulDiv();
    while (this.check('PLUS', 'MINUS')) {
      const opTok = this.current();
      this.pos++;
      const right = this.parseMulDiv();
      left = { type: 'BinaryOp', op: opTok.value === '+' ? '+' : '-', left, right };
    }
    return left;
  }

  /** 乗算・除算・剰余 */
  private parseMulDiv(): Expression {
    let left = this.parseUnary();
    while (this.check('MULTIPLY', 'DIVIDE', 'MOD')) {
      const opTok = this.current();
      this.pos++;
      const opMap: Record<string, string> = {
        'MULTIPLY': '*', 'DIVIDE': '/', 'MOD': 'mod'
      };
      const right = this.parseUnary();
      left = { type: 'BinaryOp', op: opMap[opTok.type] ?? opTok.value, left, right };
    }
    return left;
  }

  /** 単項演算（not, -） */
  private parseUnary(): Expression {
    if (this.match('NOT')) {
      const operand = this.parseUnary();
      return { type: 'UnaryOp', op: 'not', operand };
    }
    if (this.check('MINUS')) {
      const prevIdx = this.pos - 1;
      const prevType = prevIdx >= 0 ? this.tokens[prevIdx].type : null;
      const isUnary = !prevType || !['NUMBER', 'IDENT', 'RPAREN', 'RBRACKET', 'BOOLEAN'].includes(prevType);
      if (isUnary) {
        this.pos++;
        const operand = this.parseUnary();
        return { type: 'UnaryOp', op: '-', operand };
      }
    }
    return this.parsePrimary();
  }

  /** 一次式（リテラル、識別子、配列アクセス、グループ化） */
  private parsePrimary(): Expression {
    const token = this.current();

    // 数値リテラル
    if (this.match('NUMBER')) {
      const val = token.value.includes('.') ? parseFloat(token.value) : parseInt(token.value, 10);
      return { type: 'Literal', value: val };
    }

    // 真偽値リテラル
    if (this.match('BOOLEAN')) {
      return { type: 'Literal', value: token.value === 'true' };
    }

    // 文字列リテラル
    if (this.match('STRING')) {
      return { type: 'Literal', value: token.value };
    }

    // 識別子 or 配列アクセス or 関数呼び出し
    if (this.match('IDENT')) {
      // 配列アクセス: ident[expr]
      if (this.match('LBRACKET')) {
        const indexExpr = this.parseExpression();
        this.expect('RBRACKET', '配列アクセス');
        const adjustedIndex: BinaryOp = {
          type: 'BinaryOp',
          op: '-',
          left: indexExpr,
          right: { type: 'Literal', value: 1 },
        };
        return { type: 'ArrayAccess', name: token.value, index: adjustedIndex };
      }

      // 関数呼び出し: 要素数(A)、binSearch(A, n) など
      if (this.match('LPAREN')) {
        const args = this.parseCallArgs();
        this.expect('RPAREN', '関数呼び出し');
        return { type: 'FunctionCall', name: token.value, args };
      }

      return { type: 'Identifier', name: token.value };
    }

    // 括弧によるグループ化
    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      this.expect('RPAREN', '括弧の閉じ');
      return expr;
    }

    // 全角括弧
    if (this.match('RPAREN')) {
      // 不正なRPARENは無視
      return { type: 'Literal', value: 0 };
    }

    throw new InterpreterError(
      `式の解析: 予期しないトークン '${token.type}' (${token.value})`,
      token.line
    );
  }
}
