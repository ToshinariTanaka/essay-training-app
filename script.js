const rubricConfig = {
  passLine: 70,
  categories: {
    questionFit: { label: "設問適合", max: 20 },
    claimClarity: { label: "主張の明確さ", max: 10 },
    reasonPersuasiveness: { label: "理由の説得力", max: 25 },
    evidence: { label: "具体例・根拠", max: 15 },
    structure: { label: "構成・論理展開", max: 15 },
    counterargument: { label: "反論・条件設定", max: 5 },
    language: { label: "日本語・表現", max: 10 }
  }
};

const deductionsCatalog = [
  "問いに答えていない",
  "主張がない",
  "理由がない",
  "理由が主観的",
  "理由が抽象的すぎる",
  "因果が飛んでいる",
  "具体例が弱い",
  "具体例だけで終わっている",
  "反論を無視している",
  "条件設定がない",
  "話が逸れている",
  "意味不明な表現がある",
  "不適切な外国語混入がある",
  "字数稼ぎの冗長表現がある",
  "文法の誤りがある",
  "誤字・変換ミスがある",
  "日本語が不自然"
];

const reasonLevelGuide = [
  "0: 理由なし",
  "1: 主観理由",
  "2: 抽象理由",
  "3: 具体理由",
  "4: 因果つき理由",
  "5: 条件・反論対応つき理由"
];

const promptInput = document.getElementById("promptInput");
const answerInput = document.getElementById("answerInput");
const charCount = document.getElementById("charCount");
const scoreButton = document.getElementById("scoreButton");
const resultArea = document.getElementById("resultArea");

answerInput.addEventListener("input", () => {
  charCount.textContent = `文字数: ${answerInput.value.trim().length}`;
});

scoreButton.addEventListener("click", () => {
  const promptText = promptInput.value.trim();
  const answerText = answerInput.value.trim();
  const result = gradeEssayMock(promptText, answerText);
  renderResult(result);
});

function gradeEssayMock(prompt, answer) {
  if (!answer) {
    return {
      totalScore: 0,
      passed: false,
      categoryScores: emptyCategoryScores(),
      goodPoints: ["まずは解答を書いてみましょう。"],
      deductions: ["主張がない", "理由がない"],
      suggestions: ["最初の1文で主張を明確に書く。", "理由を2つ以上書く。"],
      rewriteExample: "私は〇〇だと考える。なぜなら〜。例えば〜。この点について反論として〜があるが、条件として〜なら成り立つ。",
      reasonLevel: 0,
      warning: "解答が空のため採点できません。"
    };
  }

  const lowerAnswer = answer.toLowerCase();
  const length = answer.length;
  const sentenceCount = (answer.match(/[。.!?！？]/g) || []).length || 1;

  const hasClaim = /(私は|私が|私は.*(考える|思う)|べきだ|必要だ|だと考える)/.test(answer);
  const hasReason = /(なぜなら|理由は|からだ|ため|ので)/.test(answer);
  const hasCauseEffect = /(ため|ので|結果|だからこそ|につながる)/.test(answer);
  const hasExample = /(例えば|たとえば|具体的に|実際に|経験では|データ|統計|事例)/.test(answer);
  const hasCounter = /(一方で|しかし|反論|とはいえ|ただし|もちろん)/.test(answer);
  const hasCondition = /(場合|条件|なら|限り|によって)/.test(answer);
  const hasDefinition = /(とは|定義|ここでいう|私の考える.*は)/.test(answer);
  const hasQuestionFraming = /(問い|なぜ|どうすれば|何をもって)/.test(answer);

  const abstractTheme = /幸せとは何か|自由とは何か|正義とは何か/.test(prompt);

  let reasonLevel = 0;
  if (hasReason) reasonLevel = 2;
  if (hasReason && hasExample) reasonLevel = 3;
  if (reasonLevel >= 3 && hasCauseEffect) reasonLevel = 4;
  if (reasonLevel >= 4 && hasCounter && hasCondition) reasonLevel = 5;
  if (!hasReason && hasClaim) reasonLevel = 1;

  const categoryScores = {
    questionFit: 8,
    claimClarity: hasClaim ? 8 : 2,
    reasonPersuasiveness: Math.min(25, reasonLevel * 5),
    evidence: hasExample ? 11 : 4,
    structure: sentenceCount >= 4 ? 11 : 6,
    counterargument: hasCounter || hasCondition ? 3 : 0,
    language: 8
  };

  if (abstractTheme) {
    categoryScores.questionFit += hasDefinition ? 6 : 2;
    categoryScores.questionFit += hasQuestionFraming ? 4 : 1;
  } else {
    categoryScores.questionFit += hasClaim && hasReason ? 10 : 3;
  }

  if (length < 200) {
    categoryScores.structure -= 4;
    categoryScores.evidence -= 3;
  }

  if (length > 650) {
    categoryScores.language -= 2;
  }

  normalizeScores(categoryScores);

  const deductions = detectDeductions({
    prompt,
    answer,
    lowerAnswer,
    hasClaim,
    hasReason,
    hasCauseEffect,
    hasExample,
    hasCounter,
    hasCondition,
    length
  });

  const goodPoints = buildGoodPoints({ hasClaim, hasReason, hasExample, hasCounter, hasCondition, hasCauseEffect, abstractTheme, hasDefinition });
  const suggestions = buildSuggestions(deductions);
  const rewriteExample = buildRewriteExample(answer);

  const totalScore = Object.values(categoryScores).reduce((sum, n) => sum + n, 0);
  return {
    totalScore,
    passed: totalScore >= rubricConfig.passLine,
    categoryScores,
    goodPoints,
    deductions,
    suggestions,
    rewriteExample,
    reasonLevel,
    warning: length < 180 ? "文字数が少ないため、評価が安定しない可能性があります。" : ""
  };
}

function emptyCategoryScores() {
  return Object.keys(rubricConfig.categories).reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

function normalizeScores(scores) {
  for (const key of Object.keys(scores)) {
    const max = rubricConfig.categories[key].max;
    scores[key] = Math.max(0, Math.min(max, Math.round(scores[key])));
  }
}

function detectDeductions(ctx) {
  const list = [];
  if (!ctx.hasClaim) list.push("主張がない");
  if (!ctx.hasReason) list.push("理由がない");
  if (ctx.hasReason && /(私はそう思うから|なんとなく|気分)/.test(ctx.answer)) list.push("理由が主観的");
  if (ctx.hasReason && /(効率的だから|大切だから|必要だから)/.test(ctx.answer) && !ctx.hasExample) list.push("理由が抽象的すぎる");
  if (ctx.hasReason && !ctx.hasCauseEffect) list.push("因果が飛んでいる");
  if (!ctx.hasExample) list.push("具体例が弱い");
  if (ctx.hasExample && !ctx.hasReason) list.push("具体例だけで終わっている");
  if (!ctx.hasCounter) list.push("反論を無視している");
  if (!ctx.hasCondition) list.push("条件設定がない");
  if (/ところで|ちなみに/.test(ctx.answer)) list.push("話が逸れている");
  if (/[\^]{2,}|@@@/.test(ctx.answer)) list.push("意味不明な表現がある");
  if (/\b(?:very|awesome|cool)\b/i.test(ctx.lowerAnswer)) list.push("不適切な外国語混入がある");
  if (/同じことを繰り返すと|とにかくとにかく/.test(ctx.answer)) list.push("字数稼ぎの冗長表現がある");
  if (/ですです|ますますます/.test(ctx.answer)) list.push("文法の誤りがある");
  if (/ぁ|ぃ|ぅ|ぇ|ぉ/.test(ctx.answer)) list.push("誤字・変換ミスがある");
  if (/なんか|やばい/.test(ctx.answer)) list.push("日本語が不自然");

  const fitWeak = ctx.prompt && !containsPromptKeyword(ctx.prompt, ctx.answer);
  if (fitWeak) list.push("問いに答えていない");

  return uniqueAndFiltered(list);
}

function containsPromptKeyword(prompt, answer) {
  const promptKeywords = prompt
    .replace(/[^ぁ-んァ-ヶ一-龠a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, 12);

  if (!promptKeywords.length) return true;
  return promptKeywords.some((w) => answer.includes(w));
}

function uniqueAndFiltered(items) {
  return [...new Set(items)].filter((x) => deductionsCatalog.includes(x));
}

function buildGoodPoints(ctx) {
  const points = [];
  if (ctx.hasClaim) points.push("主張が明確で、立場が読み取りやすいです。");
  if (ctx.hasReason) points.push("理由が示され、意見の根拠が見えます。");
  if (ctx.hasCauseEffect) points.push("理由と結果の因果関係が書けています。");
  if (ctx.hasExample) points.push("具体例があり、読み手がイメージしやすいです。");
  if (ctx.hasCounter || ctx.hasCondition) points.push("反論や条件に触れ、議論の幅が出ています。");
  if (ctx.abstractTheme && ctx.hasDefinition) points.push("抽象語を自分なりに定義できています。");
  if (!points.length) points.push("骨組みを作ると、さらに読みやすい答案になります。");
  return points;
}

function buildSuggestions(deductions) {
  const map = {
    "問いに答えていない": "設問中のキーワードを1つ以上本文で明示し、問いへの回答を最初に示す。",
    "主張がない": "冒頭1〜2文で『私は〜と考える』の形で結論を書く。",
    "理由がない": "『なぜなら〜』で始める文を最低2つ入れる。",
    "理由が主観的": "体験だけでなく、比較・結果・データなど外部根拠を加える。",
    "理由が抽象的すぎる": "『効率的』など抽象語は、何が・どのくらい改善されるか数値や状況で具体化する。",
    "因果が飛んでいる": "『〜のため、〜となり、結果として〜』の3段でつなぐ。",
    "具体例が弱い": "学校生活・社会事例・ニュースなどの具体的場面を1つ入れる。",
    "具体例だけで終わっている": "例の後に『この例から〜と言える』と結論へ戻す。",
    "反論を無視している": "『一方で〜という反論がある』を入れたうえで再反論する。",
    "条件設定がない": "『ただし〜の場合に限る』の形で適用条件を示す。"
  };

  const suggestions = deductions
    .slice(0, 4)
    .map((item) => map[item])
    .filter(Boolean);

  if (!suggestions.length) {
    suggestions.push("理由・具体例・反論対応を1段ずつ深掘りし、説得力レベル5を目指しましょう。");
  }

  return suggestions;
}

function buildRewriteExample(answer) {
  const baseClaim = /私は/.test(answer) ? "私は、結論としてこの立場を支持する。" : "私は、この問題について賛成の立場を取る。";
  return `${baseClaim}なぜなら、短時間で行動できる仕組みを作ると、学習の継続率が上がるからだ。例えば、毎日20分の振り返り時間を先に確保すると、理解不足をその日のうちに修正できる。` +
    "一方で、時間管理が苦手な人には負担になるという反論もある。" +
    "ただし、最初は週3回から始める条件にすれば、無理なく継続しやすい。";
}

function renderResult(result) {
  const categoryHtml = Object.entries(rubricConfig.categories)
    .map(([key, info]) => `<li>${info.label}: <strong>${result.categoryScores[key]} / ${info.max}</strong></li>`)
    .join("");

  const reasonLabel = reasonLevelGuide[result.reasonLevel] || "0: 理由なし";

  resultArea.innerHTML = `
    <article class="result-card">
      <h3>総合評価</h3>
      <p class="score-large">${result.totalScore} / 100</p>
      <span class="badge ${result.passed ? "pass" : "fail"}">${result.passed ? "合格" : "不合格"}</span>
      <p>合格基準: ${rubricConfig.passLine}点以上</p>
      <p>理由の説得力レベル: <strong>${reasonLabel}</strong></p>
      ${result.warning ? `<p class="warning-text">${result.warning}</p>` : ""}
    </article>

    <article class="result-card">
      <h3>観点別点数</h3>
      <ul>${categoryHtml}</ul>
    </article>

    <article class="result-card">
      <h3>良い点</h3>
      <ul>${result.goodPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
    </article>

    <article class="result-card">
      <h3>減点理由</h3>
      <ul>${result.deductions.length ? result.deductions.map((p) => `<li>${escapeHtml(p)}</li>`).join("") : "<li>大きな減点要因は見つかりませんでした。</li>"}</ul>
    </article>

    <article class="result-card">
      <h3>改善案</h3>
      <ul>${result.suggestions.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
    </article>

    <article class="result-card">
      <h3>書き直し例</h3>
      <p>${escapeHtml(result.rewriteExample)}</p>
    </article>
  `;
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
