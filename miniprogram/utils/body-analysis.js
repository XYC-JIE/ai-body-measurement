// utils/body-analysis.js —— 体型分类与健康指标纯函数

function toMap(details) {
  const m = {};
  (details || []).forEach((d) => { m[d.parameter_name] = d.value; });
  return m;
}

const BODY_SHAPES = {
  hourglass: { name: '沙漏型', advice: '胸臀均衡、腰线明显，适合修身收腰的剪裁，突出曲线。' },
  pear: { name: '梨型', advice: '下半身较丰盈，可选 A 字裙/阔腿裤，上装提亮转移视觉重心。' },
  apple: { name: '苹果型', advice: '腰腹较圆润，可选 V 领、高腰线和垂坠面料修饰。' },
  invertedTriangle: { name: '倒三角型', advice: '肩部较宽，下装可增加量感（伞裙/宽腿裤）平衡比例。' },
  rectangle: { name: '矩型', advice: '三围曲线平直，可用腰带、褶皱营造腰线。' }
};

function classifyBodyShape(details) {
  const m = toMap(details);
  const bust = m.bustGirth, waist = m.waistGirth, hip = m.hipGirth, shoulder = m.acrossBackShoulderWidth;
  if (!bust || !waist || !hip) return null;

  let type = 'rectangle';
  const diffBH = Math.abs(bust - hip);
  if (waist >= bust || waist > hip) type = 'apple';
  else if (hip - bust >= 5) type = 'pear';
  else if (shoulder && shoulder - hip >= 5) type = 'invertedTriangle';
  else if (diffBH < 5 && waist < 0.75 * Math.max(bust, hip)) type = 'hourglass';

  const s = BODY_SHAPES[type];
  return { type, name: s.name, advice: s.advice };
}

function estimateBodyFat(bmi, age, gender) {
  if (!bmi || age === undefined || age === null || !gender) return null;
  const sex = gender === 'male' ? 1 : 0;
  return Math.round((1.2 * bmi + 0.23 * age - 10.8 * sex - 5.4) * 10) / 10;
}

function whrCategory(whr, gender) {
  if (gender === 'male') {
    if (whr < 0.9) return '健康';
    if (whr < 1.0) return '偏高';
    return '偏高';
  }
  if (whr < 0.85) return '健康';
  return '偏高';
}

function bmiCategory(bmi) {
  if (bmi < 18.5) return '偏瘦';
  if (bmi < 24) return '正常';
  if (bmi < 28) return '过重';
  return '肥胖';
}

function calculateHealthMetrics(opts) {
  const { height, weight, age, gender, details } = opts;
  const m = toMap(details);
  const waist = m.waistGirth, hip = m.hipGirth;
  const res = { bmi: null, bmiCategory: null, whr: null, whrCategory: null, bodyFat: null, idealWeightMin: null, idealWeightMax: null };

  const h = height ? height / 100 : null;
  if (weight && h) {
    const bmi = Math.round((weight / (h * h)) * 10) / 10;
    res.bmi = bmi;
    res.bmiCategory = bmiCategory(bmi);
    res.bodyFat = estimateBodyFat(bmi, age, gender);
  }
  if (waist && hip) {
    res.whr = Math.round((waist / hip) * 100) / 100;
    if (gender) res.whrCategory = whrCategory(res.whr, gender);
  }
  if (h) {
    res.idealWeightMin = Math.round(18.5 * h * h * 10) / 10;
    res.idealWeightMax = Math.round(24 * h * h * 10) / 10;
  }
  return res;
}

module.exports = { classifyBodyShape, calculateHealthMetrics, estimateBodyFat, toMap };
