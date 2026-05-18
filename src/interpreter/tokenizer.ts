// ============================================================
// FE-Trace 擬似言語トークナイザー
// 1文字ずつ走査するアプローチ（正規表現不使用）
// ============================================================

import type { Token, TokenType } from './types';

/** キーワードマッピング */
const KEYWORDS: Record<string, TokenType> = {
  '整数型': 'TYPE_INT',
  '実数型': 'TYPE_REAL',
  '論理型': 'TYPE_BOOL',
  '文字型': 'TYPE_CHAR',
  'if': 'IF',
  'elseif': 'ELSEIF',
  'else': 'ELSE',
  'endif': 'ENDIF',
  'while': 'WHILE',
  'endwhile': 'ENDWHILE',
  'for': 'FOR',
  'endfor': 'ENDFOR',
  'true': 'BOOLEAN',
  'false': 'BOOLEAN',
  'and': 'AND',
  'or': 'OR',
  'not': 'NOT',
  'mod': 'MOD',
  'return': 'RETURN',
};

/** 「整数型の配列」などの複合型キーワード（引数宣言で使用） */
const ARRAY_TYPE_KEYWORDS = [
  '整数型の配列',
  '実数型の配列',
  '論理型の配列',
  '文字型の配列',
];

/** 日本語キーワード（for文用） */
const JP_KEYWORDS: Record<string, TokenType> = {
  'を': 'WO',
  'から': 'FROM',
  'まで': 'TO',
  'ずつ増やす': 'BY_INC',
  'ずつ減らす': 'BY_DEC',
};

/** 擬似言語テキストをトークン列に変換する */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 0;

  // 現在位置の文字を取得
  const peek = (): string => source[pos] ?? '\0';
  // 次の文字を取得
  const peekNext = (): string => source[pos + 1] ?? '\0';
  // 現在位置を進めて文字を返す
  const advance = (): string => {
    const ch = source[pos];
    if (ch === '\n') line++;
    pos++;
    return ch;
  };

  // トークン追加ヘルパー
  const addToken = (type: TokenType, value: string, tokenLine: number) => {
    // COMMENT は実行に不要なので追加しない
    if (type !== 'COMMENT') {
      tokens.push({ type, value, line: tokenLine });
    }
  };

  while (pos < source.length) {
    const ch = peek();

    // --- 空白・改行のスキップ ---
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      advance();
      continue;
    }
    if (ch === '\n') {
      advance();
      continue;
    }

    const tokenLine = line;

    // --- 関数・手続き定義マーカー ○ と終了マーカー ■ ---
    if (ch === '○' || ch === '●') {
      advance();
      addToken('FUNC_DEF', '○', tokenLine);
      continue;
    }
    if (ch === '■') {
      advance();
      addToken('END_FUNC', '■', tokenLine);
      continue;
    }

    // --- コメント /* ... */ ---
    if (ch === '/' && peekNext() === '*') {
      advance(); // /
      advance(); // *
      while (pos < source.length) {
        if (peek() === '*' && peekNext() === '/') {
          advance(); // *
          advance(); // /
          break;
        }
        advance();
      }
      addToken('COMMENT', '', tokenLine);
      continue;
    }

    // --- 特殊記号（全角・Unicode） ---
    if (ch === '←') { advance(); addToken('ASSIGN', '←', tokenLine); continue; }
    if (ch === '×') { advance(); addToken('MULTIPLY', '×', tokenLine); continue; }
    if (ch === '÷') { advance(); addToken('DIVIDE', '÷', tokenLine); continue; }
    if (ch === '≠') { advance(); addToken('NEQ', '≠', tokenLine); continue; }
    if (ch === '≦') { advance(); addToken('LEQ', '≦', tokenLine); continue; }
    if (ch === '≧') { advance(); addToken('GEQ', '≧', tokenLine); continue; }

    // --- 半角記号 ---
    if (ch === '+') { advance(); addToken('PLUS', '+', tokenLine); continue; }
    if (ch === '-') { advance(); addToken('MINUS', '-', tokenLine); continue; }
    if (ch === '*') { advance(); addToken('MULTIPLY', '*', tokenLine); continue; }
    if (ch === '/') { advance(); addToken('DIVIDE', '/', tokenLine); continue; }
    if (ch === '<') { advance(); addToken('LT', '<', tokenLine); continue; }
    if (ch === '>') { advance(); addToken('GT', '>', tokenLine); continue; }
    if (ch === '=') { advance(); addToken('EQ', '=', tokenLine); continue; }
    if (ch === '[') { advance(); addToken('LBRACKET', '[', tokenLine); continue; }
    if (ch === ']') { advance(); addToken('RBRACKET', ']', tokenLine); continue; }
    if (ch === '(') { advance(); addToken('LPAREN', '(', tokenLine); continue; }
    if (ch === ')') { advance(); addToken('RPAREN', ')', tokenLine); continue; }
    if (ch === '{') { advance(); addToken('LBRACE', '{', tokenLine); continue; }
    if (ch === '}') { advance(); addToken('RBRACE', '}', tokenLine); continue; }
    if (ch === ',') { advance(); addToken('COMMA', ',', tokenLine); continue; }
    if (ch === ':') { advance(); addToken('COLON', ':', tokenLine); continue; }

    // --- 文字列リテラル "..." ---
    if (ch === '"' || ch === '\u201C' || ch === '\u201D') {
      advance(); // 開き引用符
      let str = '';
      while (pos < source.length && peek() !== '"' && peek() !== '\u201D' && peek() !== '\n') {
        str += advance();
      }
      if (peek() === '"' || peek() === '\u201D') advance(); // 閉じ引用符
      addToken('STRING', str, tokenLine);
      continue;
    }

    // --- 数値リテラル ---
    if (isDigit(ch)) {
      let num = '';
      while (pos < source.length && (isDigit(peek()) || peek() === '.')) {
        num += advance();
      }
      addToken('NUMBER', num, tokenLine);
      continue;
    }

    // --- 「整数型の配列」などの複合型キーワードの先読みチェック ---
    const arrayTypeMatch = matchArrayTypeKeyword(source, pos);
    if (arrayTypeMatch) {
      const { keyword, length } = arrayTypeMatch;
      for (let i = 0; i < length; i++) advance();
      // 「整数型の配列」→ TYPE_INT + ARRAY フラグ（COLON前に解釈するためIDENTとして保留）
      addToken('TYPE_INT', keyword, tokenLine); // 配列型も TYPE_INT に統一してパーサーで判別
      continue;
    }

    // --- 日本語キーワードの先読みチェック ---
    const jpMatch = matchJapaneseKeyword(source, pos);
    if (jpMatch) {
      const { keyword, length } = jpMatch;
      for (let i = 0; i < length; i++) advance();
      addToken(JP_KEYWORDS[keyword], keyword, tokenLine);
      continue;
    }

    // --- 日本語型キーワードの先読みチェック ---
    const typeMatch = matchTypeKeyword(source, pos);
    if (typeMatch) {
      const { keyword, length } = typeMatch;
      for (let i = 0; i < length; i++) advance();
      addToken(KEYWORDS[keyword], keyword, tokenLine);
      continue;
    }

    // --- 識別子・英語キーワード ---
    if (isIdentStart(ch)) {
      let ident = '';
      while (pos < source.length && isIdentPart(peek())) {
        ident += advance();
      }
      const kwType = KEYWORDS[ident];
      if (kwType) {
        addToken(kwType, ident, tokenLine);
      } else {
        addToken('IDENT', ident, tokenLine);
      }
      continue;
    }

    // --- 全角括弧の対応 ---
    if (ch === '（') { advance(); addToken('LPAREN', '(', tokenLine); continue; }
    if (ch === '）') { advance(); addToken('RPAREN', ')', tokenLine); continue; }

    // --- 認識できない文字: スキップ ---
    console.warn(`[tokenizer] 認識できない文字 '${ch}' (U+${ch.charCodeAt(0).toString(16)}) を行 ${line + 1} でスキップしました`);
    advance();
  }

  // EOF トークンを追加
  addToken('EOF', '', line);

  return tokens;
}

// --- ヘルパー関数 ---

/** 数字かどうか判定 */
function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

/** 識別子の先頭文字として有効かどうか */
function isIdentStart(ch: string): boolean {
  // 英字・アンダースコア・日本語文字（ひらがな・カタカナ・漢字は型キーワード以外も考慮）
  const code = ch.charCodeAt(0);
  return (
    (ch >= 'a' && ch <= 'z') ||
    (ch >= 'A' && ch <= 'Z') ||
    ch === '_' ||
    (code >= 0x3040 && code <= 0x309F) || // ひらがな
    (code >= 0x30A0 && code <= 0x30FF) || // カタカナ
    (code >= 0x4E00 && code <= 0x9FFF)    // CJK統合漢字
  );
}

/** 識別子の文字として有効かどうか */
function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || isDigit(ch);
}

/** 日本語for文キーワードのマッチング（長いものから優先） */
function matchJapaneseKeyword(source: string, pos: number): { keyword: string; length: number } | null {
  // 長い順にチェック
  const sortedKeywords = Object.keys(JP_KEYWORDS).sort((a, b) => b.length - a.length);
  for (const kw of sortedKeywords) {
    if (source.substring(pos, pos + kw.length) === kw) {
      return { keyword: kw, length: kw.length };
    }
  }
  return null;
}

/** 日本語型キーワードのマッチング */
function matchTypeKeyword(source: string, pos: number): { keyword: string; length: number } | null {
  const typeKeywords = ['整数型', '実数型', '論理型', '文字型'];
  for (const kw of typeKeywords) {
    if (source.substring(pos, pos + kw.length) === kw) {
      return { keyword: kw, length: kw.length };
    }
  }
  return null;
}

/** 「整数型の配列」などの複合型キーワードのマッチング（長い順に優先） */
function matchArrayTypeKeyword(source: string, pos: number): { keyword: string; length: number } | null {
  // 長い順にチェックして先にマッチしたものを返す
  const sorted = [...ARRAY_TYPE_KEYWORDS].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    if (source.substring(pos, pos + kw.length) === kw) {
      return { keyword: kw, length: kw.length };
    }
  }
  return null;
}
