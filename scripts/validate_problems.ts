import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { tokenize } from '../src/interpreter/tokenizer';
import { parse } from '../src/interpreter/parser';
import { interpret } from '../src/interpreter/interpreter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const problemsPath = path.resolve(__dirname, '../../fe-trace-problems-batch-001.json');
const batchData = JSON.parse(fs.readFileSync(problemsPath, 'utf-8'));

let passed = 0;
let failed = 0;

for (const p of batchData.problems) {
    const codeLines = p.problem.pseudocode;
    let codeStr = codeLines.join('\n');
    if (codeStr.includes('solve()')) {
        codeStr += '\n■\nsolve()';
    }
    console.log(`\n--- Validating: ${p.id} ${p.meta.title} ---`);
    try {
        const tokens = tokenize(codeStr);
        const ast = parse(tokens);
        const states = interpret(ast);
        const lastState = states.length > 0 ? states[states.length - 1] : null;

        const expectedFinalState = p.validation?.expectedFinalState?.variables;
        if (expectedFinalState) {
            let stateMatch = true;
            let errMsg = '';
            
            // 関数終了前のローカル変数が含まれる最後のステートを探す
            let targetState = lastState;
            for (let i = states.length - 1; i >= 0; i--) {
                if (states[i].callDepth > 0) {
                    targetState = states[i];
                    break;
                }
            }

            for (const [key, val] of Object.entries(expectedFinalState)) {
                let actualVal = targetState?.variables[key];

                if (actualVal !== val) {
                    stateMatch = false;
                    errMsg += `Var ${key}: expected ${val}, got ${actualVal}. `;
                }
            }
            if (stateMatch) {
                console.log(`✅ [PASS] Steps: ${states.length}`);
                passed++;
            } else {
                console.log(`❌ [FAIL] State mismatch. ${errMsg}`);
                failed++;
            }
        } else {
            console.log(`⚠️ [WARN] No expectedFinalState to check`);
            passed++;
        }

    } catch (err: any) {
        console.log(`❌ [ERROR] ${err.message}`);
        failed++;
    }
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
