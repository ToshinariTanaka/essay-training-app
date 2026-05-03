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
  "条件設定が弱い",
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

let currentModelAnswer = null;

const promptInput = document.getElementById("promptInput");
const answerInput = document.getElementById("answerInput");
const charCount = document.getElementById("charCount");
const scoreButton = document.getElementById("scoreButton");
const modelAnswerButton = document.getElementById("modelAnswerButton");
const modelAnswerArea = document.getElementById("modelAnswerArea");
const resultArea = document.getElementById("resultArea");

answerInput.addEventListener("input", () => {
  charCount.textContent = `文字数: ${answerInput.value.trim().length}`;
});

modelAnswerButton.addEventListener("click", () => {
  const promptText = promptInput.value.trim();
  currentModelAnswer = generateModelAnswerMock(promptText);
  renderModelAnswer(currentModelAnswer);
});

scoreButton.addEventListener("click", () => {
  const promptText = promptInput.value.trim();
  const answerText = answerInput.value.trim();
  if (!currentModelAnswer) {
    currentModelAnswer = generateModelAnswerMock(promptText);
    renderModelAnswer(currentModelAnswer);
  }

  const isSimilarModelMatch = isExactMatchModelAnswer(answerText, currentModelAnswer.text);
  const result = gradeEssayMock(promptText, answerText, {
    useSpecialMatch: isSimilarModelMatch
  });
  const comparison = compareWithModelAnswerMock(result, currentModelAnswer, { isSimilarModelMatch });
  renderResult(result, comparison);
});

function generateModelAnswerMock(promptText) {
  const promptKeyword = extractPromptKeyword(promptText);
  const modelText = buildStructuredModelAnswer(promptText);

  return {
    scoreBenchmark: 80,
    title: "AI模範解答（80点答案）",
    label: "合格上位の現実的な答案",
    text: modelText,
    features: [
      "設問語を自分の言葉で定義し、結論を先に示している。",
      "理由→具体例→反論→条件つき再主張の順で論理を構成している。",
      "字数制限下で実行可能な密度に抑え、満点狙いの過剰情報を避けている。",
      `問題文キーワード（${promptKeyword}）への接続を明示している。`
    ]
  };
}

function compareWithModelAnswerMock(studentResult, modelAnswer, opts = {}) {
  if (opts.isSimilarModelMatch) {
    return {
      benchmarkText: "AI模範解答と完全一致のため、特別判定を適用しています。",
      scoreDiff: 0,
      weaker: [],
      stronger: [],
      improvements: []
    };
  }

  const scoreDiff = studentResult.totalScore - modelAnswer.scoreBenchmark;
  const sign = scoreDiff > 0 ? "+" : "";

  const weaker = [];
  if (studentResult.categoryScores.reasonPersuasiveness < 18) weaker.push("理由の具体性と因果の接続が弱く、主張の押し出しが不足しています。");
  if (studentResult.categoryScores.counterargument < 4) weaker.push("反論処理・条件設定が薄く、議論の耐久力で差があります。");
  if (studentResult.categoryScores.evidence < 12) weaker.push("具体例や根拠の解像度が低く、説得力の伸びしろがあります。");
  if (!weaker.length) weaker.push("大きな弱点は少ないですが、段落ごとの論点接続をさらに明示すると安定します。");

  const stronger = [];
  if (studentResult.categoryScores.language >= 9) stronger.push("語彙と文の滑らかさは模範解答より自然です。");
  if (studentResult.categoryScores.claimClarity >= 9) stronger.push("結論提示が明快で、立場が早く伝わります。");
  if (studentResult.categoryScores.questionFit >= 18) stronger.push("設問への忠実度は模範解答と同等以上です。");
  if (!stronger.length) stronger.push("主張の個性が出せる余地があり、改善次第で模範解答を超えられます。");

  const improvements = [
    "冒頭で定義→主張を1文で接続し、論点の軸を固定する。",
    "理由ごとに『なぜなら→結果として』の因果チェーンを明示する。",
    "反論に対して『ただし〜の場合』を追加し、条件付きで結論を補強する。"
  ];

  return {
    benchmarkText: `AI模範解答は80点答案（合格上位の現実的な答案）です。あなたの答案は${studentResult.totalScore}点で、差は${sign}${scoreDiff}点です。`,
    scoreDiff,
    weaker,
    stronger,
    improvements
  };
}

function extractPromptKeyword(promptText) {
  const normalized = promptText.replace(/\s+/g, " ");
  const hit = normalized.match(/「([^」]{2,20})」/);
  if (hit) return hit[1];
  const words = normalized
    .replace(/[^ぁ-んァ-ヶ一-龠a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  return words[0] || "設問テーマ";
}

function renderModelAnswer(modelAnswer) {
  modelAnswerArea.innerHTML = `
    <article class="model-answer-card">
      <h3>${escapeHtml(modelAnswer.title)}</h3>
      <p><span class="badge model">${escapeHtml(modelAnswer.label)}</span></p>
      <p class="model-answer-meta">※ この解答は満点答案ではありません。80点答案として設計した比較基準です。</p>
      <p class="model-answer-meta">文字数: ${modelAnswer.text.length}字</p>
      <pre class="model-answer-structured">${escapeHtml(modelAnswer.text)}</pre>
      <h4>この模範解答の特徴</h4>
      <ul>${modelAnswer.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
    </article>
  `;
}

function parseCharacterLimit(promptText) {
  if (!promptText) return null;
  const normalized = promptText.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  const hit = normalized.match(/(\d{2,5})\s*(?:字|文字)\s*以内/);
  if (!hit) return null;
  const limit = Number.parseInt(hit[1], 10);
  return Number.isFinite(limit) && limit > 0 ? limit : null;
}

function buildLengthAwareModelAnswer(baseText, promptText) {
  const limit = parseCharacterLimit(promptText);
  if (!limit) return baseText;

  const minLength = Math.ceil(limit * 0.93);
  return fitTextWithinRange(baseText, minLength, limit);
}

function buildStructuredModelAnswer(promptText) {
  const claim = "私は、幸せとは「自分で選んだ行動に納得できる状態」だと考える。";
  const sections = [
    `【主張】${claim}`,
    "【理由1：合理的理由】納得を伴う選択は判断基準が明確になるため、失敗後も原因を特定して次の行動を修正しやすい。例えば、試験前に学習計画の根拠を言語化しておけば、点数が下がっても改善点を具体化できる。",
    "【理由2：伝統的理由】納得できる選択は、努力と継続を重んじる社会的価値観と整合し、実践可能性も高い。",
    "【理由3：権威的理由】心理学や教育実践でも、自律的に選んだ行動は動機づけを保ちやすいとされ、自己効力感を高めると報告されている。例えば、自分で選んだ学習課題を継続した生徒ほど、達成後の満足と再挑戦意欲が高まりやすい。",
    "【反論と再反論】一方で、結果が出なければ幸福とは言えないという反論がある。確かに結果は重要だが、結果のみで幸福を測ると達成後も不安が残る。むしろ、結果評価に加えて選択への納得を基準に含める方が、長期的で再現可能な幸福につながる。",
    `【結論】${claim}`
  ];
  const baseText = sections.join("\n");
  const lengthAdjusted = buildLengthAwareModelAnswer(baseText, promptText);
  const withConclusion = enforceConclusionEnding(lengthAdjusted, claim);
  const finalText = buildLengthAwareModelAnswer(withConclusion, promptText);
  return finalText;
}

function enforceConclusionEnding(text, claim) {
  const trimmed = (text || "").trim();
  if (!trimmed) return `【主張】${claim}\n【結論】${claim}`;
  const linesWithoutConclusion = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("【結論】"));
  linesWithoutConclusion.push(`【結論】${claim}`);
  return linesWithoutConclusion.join("\n");
}

function fitTextWithinRange(baseText, minLength, maxLength) {
  const trimmed = (baseText || "").trim();
  if (!trimmed) return "";

  if (trimmed.length >= minLength && trimmed.length <= maxLength) {
    return trimmed;
  }

  if (trimmed.length > maxLength) {
    const clipped = trimmed.slice(0, maxLength).replace(/[、,;:\s]+$/g, "");
    return /[。！？]$/.test(clipped) ? clipped : `${clipped}。`;
  }

  const filler = "また、この考え方は日常の意思決定に直結し、実践可能性も高い。";
  const needed = Math.min(maxLength - trimmed.length, Math.max(0, minLength - trimmed.length));
  if (needed <= 0) return trimmed;
  const suffix = (/[。！？]$/.test(trimmed) ? "" : "。") + filler;
  const appended = `${trimmed}${suffix}`;

  let expanded = appended;
  while (expanded.length < minLength) {
    const remain = minLength - expanded.length;
    if (remain <= 0) break;
    const chunk = filler.slice(0, Math.min(filler.length, remain));
    expanded += chunk;
    if (chunk.length === 0) break;
  }

  if (expanded.length > maxLength) {
    const clipped = expanded.slice(0, maxLength).replace(/[、,;:\s]+$/g, "");
    expanded = /[。！？]$/.test(clipped) ? clipped : `${clipped}。`;
    if (expanded.length > maxLength) {
      expanded = expanded.slice(0, maxLength).replace(/[、,;:\s]+$/g, "");
    }
  }

  return expanded;
}

function gradeEssayMock(prompt, answer, opts = {}) {
  if (!answer) {
    return {
      totalScore: 0,
      rewriteScore: 0,
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

  const categoryScores = scoreEssayCategories(prompt, answer);

  const isWhatQuestion = isDefinitionQuestion(prompt);
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
    hasDefinition,
    isWhatQuestion,
    length
  });

  const goodPoints = buildGoodPoints({ hasClaim, hasReason, hasExample, hasCounter, hasCondition, hasCauseEffect, abstractTheme, hasDefinition });
  const suggestions = buildSuggestions(deductions);
  const rewriteExample = buildRewriteExample(prompt, answer);

  let totalScore = sumCategoryScores(categoryScores);
  if (opts.useSpecialMatch) totalScore = 80;
  const rewriteScore = calculateRewriteScore(prompt, rewriteExample, totalScore);
  return {
    totalScore,
    rewriteScore,
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

function scoreEssayCategories(promptText, essayText) {
  const answer = essayText || "";
  const sentenceCount = (answer.match(/[。.!?！？]/g) || []).length || 1;
  const length = answer.length;
  const hasClaim = /(私は|私が|私は.*(考える|思う)|べきだ|必要だ|だと考える)/.test(answer);
  const hasReason = /(なぜなら|理由は|からだ|ため|ので)/.test(answer);
  const hasCauseEffect = /(ため|ので|結果|だからこそ|につながる)/.test(answer);
  const hasExample = /(例えば|たとえば|具体的に|実際に|経験では|データ|統計|事例)/.test(answer);
  const hasCounter = /(一方で|しかし|反論|とはいえ|ただし|もちろん)/.test(answer);
  const hasCondition = /(場合|条件|なら|限り|によって)/.test(answer);
  const hasDefinition = /(とは|定義|ここでいう|私の考える.*は)/.test(answer);
  const hasQuestionFraming = /(問い|なぜ|どうすれば|何をもって)/.test(answer);
  const abstractTheme = /幸せとは何か|自由とは何か|正義とは何か/.test(promptText || "");

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
  return categoryScores;
}

function sumCategoryScores(categoryScores) {
  const values = Object.values(categoryScores || {});
  return values.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
}

function calculateRewriteScore(promptText, rewriteText, baseScore) {
  const rewriteCategoryScores = scoreEssayCategories(promptText, rewriteText);
  const rewriteTotal = sumCategoryScores(rewriteCategoryScores);
  const safeBaseScore = Number.isFinite(baseScore) ? baseScore : 0;
  const score = Math.max(safeBaseScore + 1, rewriteTotal);
  return Math.min(100, score);
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
  if (!ctx.hasCondition) list.push("条件設定が弱い");
  if (/ところで|ちなみに/.test(ctx.answer)) list.push("話が逸れている");
  if (/[\^]{2,}|@@@/.test(ctx.answer)) list.push("意味不明な表現がある");
  if (/\b(?:very|awesome|cool)\b/i.test(ctx.lowerAnswer)) list.push("不適切な外国語混入がある");
  if (/同じことを繰り返すと|とにかくとにかく/.test(ctx.answer)) list.push("字数稼ぎの冗長表現がある");
  if (/ですです|ますますます/.test(ctx.answer)) list.push("文法の誤りがある");
  if (/ぁ|ぃ|ぅ|ぇ|ぉ/.test(ctx.answer)) list.push("誤字・変換ミスがある");
  if (/なんか|やばい/.test(ctx.answer)) list.push("日本語が不自然");

  const fitWeak = ctx.prompt && !containsPromptKeyword(ctx.prompt, ctx.answer);
  if (fitWeak && !(ctx.isWhatQuestion && ctx.hasDefinition)) list.push("問いに答えていない");

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

function isDefinitionQuestion(promptText) {
  return /とは何か|って何か|何を意味/.test(promptText || "");
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
    "条件設定が弱い": "『ただし〜の場合に限る』の形で適用条件を示す。"
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

function buildRewriteExample(promptText, answer) {
  const claim = /私は/.test(answer)
    ? "私は、結論として『選択への納得を伴う生き方』を重視すべきだと考える。"
    : "私は、結論として『選択への納得を伴う生き方』を重視すべきだと考える。";

  const parts = [
    `【主張】${claim}`,
    "【理由1：合理的理由】納得して選んだ行動は判断基準が明確なため、短期的な苦痛があっても継続しやすい。例えば、目標を定めて毎日30分復習する習慣は、学習の抜けを着実に減らせる。",
    "【理由2：伝統的理由】納得のある選択は、努力を積み重ねることを重視する社会的価値観と一致し、行動の安定につながる。例えば、日々の小さな継続を重んじる姿勢は、学校でも職場でも一貫して評価される。",
    "【理由3：権威的理由】自律的に選んだ課題は動機づけを高めるとされ、失敗後の修正と再挑戦を後押しする。例えば、方法の根拠を記録して学習した人は、結果が悪くても改善策を具体化しやすい。",
    "【反論と再反論】もちろん、結果が出なければ意味がないという反論は成り立つ。しかし、結果だけを基準にすると達成後も不安が残る。結果評価に加えて選択への納得を基準に含める方が、長期的には成果と幸福の両立につながる。",
    `【結論】${claim}`
  ];

  const composed = parts.join("\n");
  const limit = parseCharacterLimit(promptText);
  if (!limit) return composed;
  return enforceConclusionEnding(fitTextWithinRange(composed, Math.ceil(limit * 0.9), limit), claim);
}

function isExactMatchModelAnswer(answerText, modelText) {
  return (answerText || "").trim() === (modelText || "").trim();
}

function renderResult(result, comparison) {
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
      <h3>AI模範解答との差</h3>
      <p>${escapeHtml(comparison.benchmarkText)}</p>
      <p>差分: <strong>${comparison.scoreDiff > 0 ? "+" : ""}${comparison.scoreDiff}点</strong></p>
    </article>

    <article class="result-card">
      <h3>模範解答より劣る点</h3>
      <ul>${comparison.weaker.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
    </article>

    <article class="result-card">
      <h3>模範解答より優れている点</h3>
      <ul>${comparison.stronger.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
    </article>

    <article class="result-card">
      <h3>模範解答に近づけるための改善案</h3>
      <ul>${comparison.improvements.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
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
      <p>書き直し想定スコア: <strong>${result.rewriteScore} / 100</strong></p>
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
