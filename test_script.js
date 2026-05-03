const fs = require('fs');
const vm = require('vm');

function createElementStub() {
  return {
    addEventListener: () => {},
    classList: { add: () => {}, remove: () => {} },
    value: '',
    textContent: '',
    innerHTML: ''
  };
}

const context = {
  console,
  window: {},
  document: {
    getElementById: () => createElementStub(),
  },
};
context.window = context;

vm.createContext(context);
const code = fs.readFileSync('./script.js', 'utf8');
vm.runInContext(code, context);

if (typeof context.buildStructuredModelAnswer !== 'function') {
  throw new Error('buildStructuredModelAnswer が読み込めません');
}

const prompt = '次の問いに600字以内で答えなさい。';
const result = context.buildStructuredModelAnswer(prompt);

const banned = ['【理由1】', '【理由2】', '【理由3】'];
for (const token of banned) {
  if (result.includes(token)) {
    throw new Error(`旧形式が残っています: ${token}`);
  }
}

const required = ['【理由1：合理的理由', '【理由2：伝統的理由', '【理由3：権威的理由'];
for (const token of required) {
  if (!result.includes(token)) {
    throw new Error(`分類つき理由が不足しています: ${token}`);
  }
}

if (result.length < 558 || result.length > 600) {
  throw new Error(`文字数が条件外です: ${result.length}`);
}

console.log('OK');
console.log(`length=${result.length}`);
