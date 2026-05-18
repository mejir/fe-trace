import { sampleQuestions } from './src/data/samples.js';
import { tokenize } from './src/interpreter/tokenizer.js';
import { parse } from './src/interpreter/parser.js';
import { interpret } from './src/interpreter/interpreter.js';

for (const q of sampleQuestions) {
  try {
    const source = q.pseudocode.join('\n');
    const tokens = tokenize(source);
    const ast = parse(tokens);
    const states = interpret(ast);
    const lastState = states[states.length - 1];
    console.log(`✅ ${q.title} -> OK (Steps: ${states.length})`);
    
    // Print the final result variable if it exists
    if (lastState && lastState.variables['result'] !== undefined) {
      console.log(`   result = ${lastState.variables['result']}`);
    }
  } catch(e) {
    console.error(`❌ ${q.title} -> ERROR: ${e.message}`);
  }
}
