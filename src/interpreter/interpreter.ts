// ============================================================
// FE-Trace 擬似言語インタープリタ（Phase 2）
// 事前全計算方式 + 関数・手続き対応
// ============================================================

import type {
  Program, Statement, Expression,
  ExecutionState, Value,
  VarDecl, Assign, IfStmt, WhileStmt, ForStmt,
  FuncDef, ReturnStmt, CallStmt,
  BinaryOp, UnaryOp, Identifier, ArrayAccess, FunctionCall,
} from './types';
import { InterpreterError, createReturnSignal, isReturnSignal } from './types';

/** 最大ステップ数（無限ループ防止） */
const MAX_STEPS = 2000;

/** 実行スコープ */
interface Scope {
  variables: Record<string, Value>;
  arrays: Record<string, Value[]>;
  name: string; // スコープ名（関数名など）
}

/** AST を実行し、全ステップの ExecutionState[] を生成して返す */
export function interpret(program: Program): ExecutionState[] {
  const engine = new InterpreterEngine();
  engine.run(program);
  return engine.getStates();
}

// ============================================================
// インタープリタエンジン
// ============================================================

class InterpreterEngine {
  /** コールスタック（グローバルスコープ + ローカルスコープ） */
  private callStack: Scope[] = [{ variables: {}, arrays: {}, name: 'グローバル' }];
  /** 関数定義テーブル */
  private functionDefs: Map<string, FuncDef> = new Map();
  /** 全ステップのスナップショット */
  private states: ExecutionState[] = [];
  /** 現在のステップ番号 */
  private stepCount: number = 0;

  // --- スコープアクセサ ---

  private get currentScope(): Scope {
    return this.callStack[this.callStack.length - 1];
  }


  /** 変数を読み取る（ローカル→グローバルの順に探索） */
  private readVariable(name: string): Value {
    for (let i = this.callStack.length - 1; i >= 0; i--) {
      if (name in this.callStack[i].variables) {
        return this.callStack[i].variables[name];
      }
    }
    return undefined;
  }

  /** 変数に書き込む（ローカルスコープが存在すればローカルに） */
  private writeVariable(name: string, value: Value): void {
    for (let i = this.callStack.length - 1; i >= 0; i--) {
      if (name in this.callStack[i].variables) {
        this.callStack[i].variables[name] = value;
        return;
      }
    }
    // 存在しない場合は現在スコープに作成
    this.currentScope.variables[name] = value;
  }

  /** 配列を読み取る（ローカル→グローバルの順に探索） */
  private readArray(name: string): Value[] | undefined {
    for (let i = this.callStack.length - 1; i >= 0; i--) {
      if (name in this.callStack[i].arrays) {
        return this.callStack[i].arrays[name];
      }
    }
    return undefined;
  }

  /** 実行結果を取得 */
  getStates(): ExecutionState[] {
    return this.states;
  }

  /** プログラムを実行 */
  run(program: Program): void {
    this.snapshot(-1, '実行開始');

    for (const stmt of program.body) {
      this.executeStatement(stmt);
      if (this.stepCount >= MAX_STEPS) break;
    }
  }

  // ============================================================
  // スナップショット生成
  // ============================================================

  /** 現在の状態のスナップショットを記録する */
  private snapshot(lineIndex: number, log: string): void {
    const prevState = this.states.length > 0 ? this.states[this.states.length - 1] : null;

    // 全スコープのマージした状態（表示用）
    const mergedVars: Record<string, Value> = {};
    const mergedArrays: Record<string, Value[]> = {};

    // グローバルからローカルの順に上書きしてマージ
    for (const scope of this.callStack) {
      Object.assign(mergedVars, scope.variables);
      Object.assign(mergedArrays, scope.arrays);
    }

    // 変化した変数を検出
    const changedVars: string[] = [];
    const changedArrayCells: { name: string; index: number }[] = [];

    if (prevState) {
      for (const [name, value] of Object.entries(mergedVars)) {
        if (prevState.variables[name] !== value) {
          changedVars.push(name);
        }
      }

      for (const [name, arr] of Object.entries(mergedArrays)) {
        const prevArr = prevState.arrays[name];
        if (!prevArr) {
          arr.forEach((_, i) => changedArrayCells.push({ name, index: i }));
        } else {
          for (let i = 0; i < arr.length; i++) {
            if (i >= prevArr.length || prevArr[i] !== arr[i]) {
              changedArrayCells.push({ name, index: i });
            }
          }
        }
      }
    }

    const state: ExecutionState = {
      step: this.stepCount,
      lineIndex,
      variables: structuredClone(mergedVars),
      arrays: structuredClone(mergedArrays),
      changedVars,
      changedArrayCells,
      log,
      callDepth: this.callStack.length - 1,
    };

    this.states.push(state);
    this.stepCount++;
  }

  // ============================================================
  // 文の実行
  // ============================================================

  /** 文を実行 */
  private executeStatement(stmt: Statement): void {
    if (this.stepCount >= MAX_STEPS) {
      this.snapshot(-1, '実行ステップ上限（2000）に達しました');
      return;
    }

    switch (stmt.type) {
      case 'VarDecl':
        this.executeVarDecl(stmt);
        break;
      case 'Assign':
        this.executeAssign(stmt);
        break;
      case 'IfStmt':
        this.executeIfStmt(stmt);
        break;
      case 'WhileStmt':
        this.executeWhileStmt(stmt);
        break;
      case 'ForStmt':
        this.executeForStmt(stmt);
        break;
      case 'FuncDef':
        this.executeFuncDef(stmt);
        break;
      case 'ReturnStmt':
        this.executeReturnStmt(stmt);
        break;
      case 'CallStmt':
        this.executeCallStmt(stmt);
        break;
    }
  }

  /** 変数宣言を実行 */
  private executeVarDecl(decl: VarDecl): void {
    if (decl.isArray) {
      if (decl.init) {
        const values = decl.init.map(expr => this.evalExpression(expr));
        this.currentScope.arrays[decl.name] = values;
        this.snapshot(decl.line, `${decl.name}[] ← {${values.map(v => this.formatValue(v)).join(', ')}}`);
      } else if (decl.size !== undefined) {
        this.currentScope.arrays[decl.name] = new Array(decl.size).fill(undefined);
        this.snapshot(decl.line, `${decl.name}[${decl.size}] を宣言`);
      } else {
        this.currentScope.arrays[decl.name] = [];
        this.snapshot(decl.line, `${decl.name}[] を宣言`);
      }
    } else {
      if (decl.init && decl.init.length > 0) {
        const value = this.evalExpression(decl.init[0]);
        this.currentScope.variables[decl.name] = value;
        this.snapshot(decl.line, `${decl.name} ← ${this.formatValue(value)}`);
      } else {
        this.currentScope.variables[decl.name] = undefined;
      }
    }
  }

  /** 代入文を実行 */
  private executeAssign(assign: Assign): void {
    const value = this.evalExpression(assign.value);

    if (assign.target.type === 'ArrayAccess') {
      const arrName = assign.target.name;
      const index = this.evalExpression(assign.target.index);
      if (typeof index !== 'number') {
        throw new InterpreterError(`配列インデックスが数値ではありません: ${index}`, assign.line);
      }
      // 全スコープから配列を探す
      const arr = this.readArray(arrName);
      if (!arr) {
        throw new InterpreterError(`未定義の配列: ${arrName}`, assign.line);
      }
      arr[index] = value;
      this.snapshot(assign.line, `${arrName}[${index + 1}] ← ${this.formatValue(value)}`);
    } else {
      const varName = assign.target.name;
      this.writeVariable(varName, value);
      this.snapshot(assign.line, `${varName} ← ${this.formatValue(value)}`);
    }
  }

  /** if 文を実行 */
  private executeIfStmt(stmt: IfStmt): void {
    const condition = this.evalExpression(stmt.condition);
    this.snapshot(stmt.line, `if (${this.formatValue(condition)})`);

    if (condition) {
      for (const s of stmt.then) {
        this.executeStatement(s);
        if (this.stepCount >= MAX_STEPS) return;
      }
      return;
    }

    for (const clause of stmt.elseIfClauses) {
      const elseIfCond = this.evalExpression(clause.condition);
      this.snapshot(clause.line, `elseif (${this.formatValue(elseIfCond)})`);
      if (elseIfCond) {
        for (const s of clause.body) {
          this.executeStatement(s);
          if (this.stepCount >= MAX_STEPS) return;
        }
        return;
      }
    }

    if (stmt.elseBody.length > 0) {
      for (const s of stmt.elseBody) {
        this.executeStatement(s);
        if (this.stepCount >= MAX_STEPS) return;
      }
    }
  }

  /** while 文を実行 */
  private executeWhileStmt(stmt: WhileStmt): void {
    while (this.stepCount < MAX_STEPS) {
      const condition = this.evalExpression(stmt.condition);
      this.snapshot(stmt.line, `while (${this.formatValue(condition)})`);

      if (!condition) break;

      for (const s of stmt.body) {
        this.executeStatement(s);
        if (this.stepCount >= MAX_STEPS) return;
      }
    }
  }

  /** for 文を実行 */
  private executeForStmt(stmt: ForStmt): void {
    const fromVal = this.evalExpression(stmt.from);
    const toVal = this.evalExpression(stmt.to);
    const stepVal = this.evalExpression(stmt.step);

    if (typeof fromVal !== 'number' || typeof toVal !== 'number' || typeof stepVal !== 'number') {
      throw new InterpreterError('for文のカウンタ値が数値ではありません', stmt.line);
    }

    this.writeVariable(stmt.variable, fromVal);
    this.snapshot(stmt.line, `for ${stmt.variable} ← ${fromVal}`);

    const isIncrement = stepVal > 0;

    while (this.stepCount < MAX_STEPS) {
      const currentVal = this.readVariable(stmt.variable) as number;
      const continueLoop = isIncrement ? currentVal <= toVal : currentVal >= toVal;

      if (!continueLoop) {
        this.snapshot(stmt.line, `for終了 (${stmt.variable} = ${currentVal})`);
        break;
      }

      for (const s of stmt.body) {
        this.executeStatement(s);
        if (this.stepCount >= MAX_STEPS) return;
      }

      this.writeVariable(stmt.variable, currentVal + stepVal);
      this.snapshot(stmt.line, `${stmt.variable} ← ${currentVal + stepVal}`);
    }
  }

  /** 関数・手続き定義を実行（定義テーブルに登録するだけ） */
  private executeFuncDef(def: FuncDef): void {
    this.functionDefs.set(def.name, def);
    // 関数定義はスナップショットを生成しない（実行ステップではない）
  }

  /** return 文を実行（ReturnSignalをスローして制御フローを返す） */
  private executeReturnStmt(stmt: ReturnStmt): void {
    const value = stmt.value !== null ? this.evalExpression(stmt.value) : undefined;
    this.snapshot(stmt.line, `return ${this.formatValue(value)}`);
    throw createReturnSignal(value);
  }

  /** 手続き呼び出し文を実行 */
  private executeCallStmt(stmt: CallStmt): void {
    this.callFunction(stmt.call, stmt.line);
  }

  // ============================================================
  // 関数呼び出し（Phase 2コア）
  // ============================================================

  /**
   * ユーザー定義関数を呼び出す
   * - 新スコープを作成してcallStackにプッシュ
   * - 引数をバインド
   * - ボディを実行
   * - ReturnSignalをキャッチして戻り値を取得
   * - スコープをポップ
   */
  private callFunction(call: FunctionCall, line: number): Value {
    const def = this.functionDefs.get(call.name);
    if (!def) {
      // 組み込み関数にフォールバック
      return this.evalBuiltinFunction(call, line);
    }

    // 引数を評価（現在スコープで評価）
    const argValues = call.args.map(arg => this.evalExpression(arg));
    // 配列引数は参照を渡すため、配列名を収集
    const arrayArgRefs: Record<string, Value[]> = {};

    // 新スコープ生成
    const newScope: Scope = {
      variables: {},
      arrays: {},
      name: call.name,
    };

    // 引数バインディング
    for (let i = 0; i < def.params.length; i++) {
      const param = def.params[i];
      const arg = call.args[i];

      if (param.isArray) {
        // 配列引数: 参照渡し（配列オブジェクトを共有）
        if (arg?.type === 'Identifier') {
          const sourceArr = this.readArray(arg.name);
          if (sourceArr) {
            newScope.arrays[param.name] = sourceArr; // 参照を共有
            arrayArgRefs[param.name] = sourceArr;
          } else {
            newScope.arrays[param.name] = [];
          }
        } else {
          newScope.arrays[param.name] = [];
        }
      } else {
        // スカラー引数: 値渡し
        newScope.variables[param.name] = argValues[i];
      }
    }

    // スナップショット: 関数呼び出し
    const argStr = argValues.map(v => this.formatValue(v)).join(', ');
    this.snapshot(line, `${call.name}(${argStr}) を呼び出し`);

    // スコープをプッシュして関数ボディを実行
    this.callStack.push(newScope);
    let returnValue: Value = undefined;

    try {
      for (const stmt of def.body) {
        this.executeStatement(stmt);
        if (this.stepCount >= MAX_STEPS) break;
      }
    } catch (signal) {
      if (isReturnSignal(signal)) {
        returnValue = signal.value;
      } else {
        throw signal;
      }
    }

    // スコープをポップ
    this.callStack.pop();

    if (returnValue !== undefined) {
      this.snapshot(line, `${call.name} → ${this.formatValue(returnValue)}`);
    }

    return returnValue;
  }

  // ============================================================
  // 式の評価
  // ============================================================

  /** 式を評価して値を返す */
  private evalExpression(expr: Expression): Value {
    switch (expr.type) {
      case 'Literal':
        return expr.value as Value;

      case 'Identifier': {
        // IPA擬似言語の「arrの要素数」表記をサポート
        if (expr.name.endsWith('の要素数')) {
          const arrName = expr.name.replace('の要素数', '');
          const arr = this.readArray(arrName);
          if (!arr) throw new InterpreterError(`未定義の配列: ${arrName}`, 0);
          return arr.length;
        }
        return this.readVariable(expr.name);
      }

      case 'ArrayAccess':
        return this.evalArrayAccess(expr);

      case 'BinaryOp':
        return this.evalBinaryOp(expr);

      case 'UnaryOp':
        return this.evalUnaryOp(expr);

      case 'FunctionCall':
        return this.evalFunctionCall(expr);

      default:
        throw new InterpreterError(`未対応の式型: ${(expr as Expression).type}`, 0);
    }
  }

  /** 配列アクセスを評価 */
  private evalArrayAccess(expr: ArrayAccess): Value {
    const index = this.evalExpression(expr.index);
    if (typeof index !== 'number') {
      throw new InterpreterError(`配列インデックスが数値ではありません`, 0);
    }
    const arr = this.readArray(expr.name);
    if (!arr) {
      throw new InterpreterError(`未定義の配列: ${expr.name}`, 0);
    }
    return arr[index];
  }

  /** 二項演算を評価 */
  private evalBinaryOp(expr: BinaryOp): Value {
    const left = this.evalExpression(expr.left);
    const right = this.evalExpression(expr.right);

    switch (expr.op) {
      case '+':
        return (left as number) + (right as number);
      case '-':
        return (left as number) - (right as number);
      case '*':
        return (left as number) * (right as number);
      case '/':
        if (right === 0) throw new InterpreterError('ゼロ除算', 0);
        return Math.floor((left as number) / (right as number));
      case 'mod':
        return (left as number) % (right as number);
      case '=':
        return left === right;
      case '≠':
        return left !== right;
      case '<':
        return (left as number) < (right as number);
      case '>':
        return (left as number) > (right as number);
      case '≦':
        return (left as number) <= (right as number);
      case '≧':
        return (left as number) >= (right as number);
      case 'and':
        return Boolean(left) && Boolean(right);
      case 'or':
        return Boolean(left) || Boolean(right);
      default:
        throw new InterpreterError(`未対応の演算子: ${expr.op}`, 0);
    }
  }

  /** 単項演算を評価 */
  private evalUnaryOp(expr: UnaryOp): Value {
    const operand = this.evalExpression(expr.operand);
    switch (expr.op) {
      case 'not':
        return !operand;
      case '-':
        return -(operand as number);
      default:
        throw new InterpreterError(`未対応の単項演算子: ${expr.op}`, 0);
    }
  }

  /** 関数呼び出しを評価（式として使われる場合） */
  private evalFunctionCall(expr: FunctionCall): Value {
    // ユーザー定義関数があればそちらを優先
    if (this.functionDefs.has(expr.name)) {
      return this.callFunction(expr, 0);
    }
    // 組み込み関数
    return this.evalBuiltinFunction(expr, 0);
  }

  /** 組み込み関数を評価 */
  private evalBuiltinFunction(expr: FunctionCall, _line: number): Value {
    switch (expr.name) {
      case '要素数': {
        if (expr.args.length !== 1 || expr.args[0].type !== 'Identifier') {
          throw new InterpreterError('要素数() には配列名を1つ指定してください', 0);
        }
        const arrName = (expr.args[0] as Identifier).name;
        const arr = this.readArray(arrName);
        if (!arr) {
          throw new InterpreterError(`未定義の配列: ${arrName}`, 0);
        }
        return arr.length;
      }
      case '絶対値': {
        const v = this.evalExpression(expr.args[0]);
        return Math.abs(v as number);
      }
      case '最大': {
        const a = this.evalExpression(expr.args[0]) as number;
        const b = this.evalExpression(expr.args[1]) as number;
        return Math.max(a, b);
      }
      case '最小': {
        const a = this.evalExpression(expr.args[0]) as number;
        const b = this.evalExpression(expr.args[1]) as number;
        return Math.min(a, b);
      }
      default:
        throw new InterpreterError(`未定義の関数: ${expr.name}`, 0);
    }
  }

  // ============================================================
  // ヘルパー
  // ============================================================

  /** 値を表示用文字列に変換 */
  private formatValue(value: Value): string {
    if (value === undefined) return '未定義';
    if (typeof value === 'boolean') return value ? '真' : '偽';
    if (typeof value === 'string') return `"${value}"`;
    return String(value);
  }
}
