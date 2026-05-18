// ============================================================
// FE-Trace サンプル問題データ（Phase 2: 関数定義対応 + IPA公式参考問題追加）
// ============================================================

import type { Question } from './schema';

export const sampleQuestions: Question[] = [
  // ========================================
  // 問題1: 配列の最大値（Phase 1 既存）
  // ========================================
  {
    id: 'q001',
    title: '配列の最大値を求める',
    source: 'サンプル問題',
    difficulty: 'easy',
    tags: ['配列', '繰り返し'],
    pseudocode: [
      '整数型: max, i',
      '整数型: A[] ← {3, 1, 4, 1, 5, 9, 2, 6}',
      'max ← A[1]',
      'for (i を 2 から 要素数(A) まで 1 ずつ増やす)',
      '  if (A[i] > max)',
      '    max ← A[i]',
      '  endif',
      'endfor',
    ],
    choices: [
      { label: 'ア', value: '6' },
      { label: 'イ', value: '9' },
      { label: 'ウ', value: '5' },
      { label: 'エ', value: '3' },
    ],
    answer: 'イ',
    explanation:
      'ループで A[i] を順番に max と比較し、大きければ max を更新する。最終的に max は 9 になる。',
  },

  // ========================================
  // 問題2: 線形探索（Phase 1 既存）
  // ========================================
  {
    id: 'q002',
    title: '線形探索',
    source: 'サンプル問題',
    difficulty: 'easy',
    tags: ['配列', '探索'],
    pseudocode: [
      '整数型: key, i, found',
      '整数型: A[] ← {4, 2, 7, 1, 9}',
      'key ← 7',
      'found ← 0',
      'for (i を 1 から 要素数(A) まで 1 ずつ増やす)',
      '  if (A[i] = key)',
      '    found ← i',
      '  endif',
      'endfor',
    ],
    choices: [
      { label: 'ア', value: '1' },
      { label: 'イ', value: '2' },
      { label: 'ウ', value: '3' },
      { label: 'エ', value: '4' },
    ],
    answer: 'ウ',
    explanation:
      '配列 A を先頭から順に key（7）と比較する。A[3] = 7 なので found は 3 になる。',
  },

  // ========================================
  // 問題3: バブルソート（Phase 1 既存）
  // ========================================
  {
    id: 'q003',
    title: 'バブルソート',
    source: 'サンプル問題',
    difficulty: 'medium',
    tags: ['配列', 'ソート', '二重ループ'],
    pseudocode: [
      '整数型: i, j, temp',
      '整数型: A[] ← {5, 3, 1, 4, 2}',
      'for (i を 1 から 要素数(A) - 1 まで 1 ずつ増やす)',
      '  for (j を 1 から 要素数(A) - i まで 1 ずつ増やす)',
      '    if (A[j] > A[j + 1])',
      '      temp ← A[j]',
      '      A[j] ← A[j + 1]',
      '      A[j + 1] ← temp',
      '    endif',
      '  endfor',
      'endfor',
    ],
    choices: [
      { label: 'ア', value: '{1, 2, 3, 4, 5}' },
      { label: 'イ', value: '{5, 4, 3, 2, 1}' },
      { label: 'ウ', value: '{2, 1, 3, 4, 5}' },
      { label: 'エ', value: '{1, 3, 2, 4, 5}' },
    ],
    answer: 'ア',
    explanation:
      'バブルソートは隣接要素を比較・交換する。外側ループは配列長-1回、内側ループは未ソート部分を走査する。最終的に昇順 {1, 2, 3, 4, 5} になる。',
  },

  // ========================================
  // 問題4: 選択ソート（IPA公式サンプル参考・関数定義使用）
  // ========================================
  {
    id: 'q004',
    title: '選択ソート',
    source: 'IPA公式サンプル参考',
    difficulty: 'medium',
    tags: ['配列', 'ソート', '関数'],
    pseudocode: [
      '○selectionSort(整数型の配列: A, 整数型: n)',
      '  整数型: i, j, minIdx, tmp',
      '  for (i を 1 から n - 1 まで 1 ずつ増やす)',
      '    minIdx ← i',
      '    for (j を i + 1 から n まで 1 ずつ増やす)',
      '      if (A[j] < A[minIdx])',
      '        minIdx ← j',
      '      endif',
      '    endfor',
      '    tmp ← A[i]',
      '    A[i] ← A[minIdx]',
      '    A[minIdx] ← tmp',
      '  endfor',
      '■',
      '整数型: A[] ← {5, 3, 8, 1, 4}',
      'selectionSort(A, 要素数(A))',
    ],
    choices: [
      { label: 'ア', value: '{1, 3, 4, 5, 8}' },
      { label: 'イ', value: '{5, 4, 3, 2, 1}' },
      { label: 'ウ', value: '{1, 3, 5, 4, 8}' },
      { label: 'エ', value: '{3, 1, 4, 5, 8}' },
    ],
    answer: 'ア',
    explanation:
      '選択ソートは、未整列部分の最小値を探して先頭と交換する操作を繰り返す。A={5,3,8,1,4} は最終的に {1,3,4,5,8} になる。',
  },

  // ========================================
  // 問題5: 二分探索（IPA公式サンプル参考・関数定義+return+elseif）
  // ========================================
  {
    id: 'q005',
    title: '二分探索',
    source: 'IPA公式サンプル参考',
    difficulty: 'medium',
    tags: ['配列', '探索', '関数', '二分探索'],
    pseudocode: [
      '○整数型: binSearch(整数型の配列: A, 整数型: n, 整数型: key)',
      '  整数型: left, right, mid',
      '  left ← 1',
      '  right ← n',
      '  while (left ≦ right)',
      '    mid ← (left + right) ÷ 2',
      '    if (A[mid] = key)',
      '      return mid',
      '    elseif (A[mid] < key)',
      '      left ← mid + 1',
      '    else',
      '      right ← mid - 1',
      '    endif',
      '  endwhile',
      '  return 0',
      '■',
      '整数型: A[] ← {1, 3, 5, 7, 9, 11, 13}',
      '整数型: result',
      'result ← binSearch(A, 要素数(A), 7)',
    ],
    choices: [
      { label: 'ア', value: '3' },
      { label: 'イ', value: '4' },
      { label: 'ウ', value: '5' },
      { label: 'エ', value: '0' },
    ],
    answer: 'イ',
    explanation:
      '二分探索は中央値と比較して探索範囲を半分にする。A[4]=7 なので index=4 が返る（1始まり）。',
  },

  // ========================================
  // 問題6: 挿入ソート（IPA公式サンプル参考・関数定義）
  // ========================================
  {
    id: 'q006',
    title: '挿入ソート',
    source: 'IPA公式サンプル参考',
    difficulty: 'medium',
    tags: ['配列', 'ソート', '関数'],
    pseudocode: [
      '○insertionSort(整数型の配列: A, 整数型: n)',
      '  整数型: i, j, key',
      '  for (i を 2 から n まで 1 ずつ増やす)',
      '    key ← A[i]',
      '    j ← i - 1',
      '    while (j ≧ 1 and A[j] > key)',
      '      A[j + 1] ← A[j]',
      '      j ← j - 1',
      '    endwhile',
      '    A[j + 1] ← key',
      '  endfor',
      '■',
      '整数型: A[] ← {4, 2, 5, 1, 3}',
      'insertionSort(A, 要素数(A))',
    ],
    choices: [
      { label: 'ア', value: '{1, 2, 3, 4, 5}' },
      { label: 'イ', value: '{5, 4, 3, 2, 1}' },
      { label: 'ウ', value: '{4, 2, 1, 3, 5}' },
      { label: 'エ', value: '{2, 1, 3, 4, 5}' },
    ],
    answer: 'ア',
    explanation:
      '挿入ソートは、2番目から順に「正しい位置に挿入」する操作を繰り返す。最終的に昇順 {1,2,3,4,5} になる。',
  },

  // ========================================
  // 問題7: FizzBuzz（合計）（条件分岐 + 複合条件）
  // ========================================
  {
    id: 'q007',
    title: '合計と条件分岐',
    source: 'IPA公式サンプル参考',
    difficulty: 'easy',
    tags: ['条件分岐', '繰り返し', '合計'],
    pseudocode: [
      '整数型: i, sum',
      'sum ← 0',
      'for (i を 1 から 10 まで 1 ずつ増やす)',
      '  if (i mod 2 = 0)',
      '    sum ← sum + i',
      '  endif',
      'endfor',
    ],
    choices: [
      { label: 'ア', value: '25' },
      { label: 'イ', value: '30' },
      { label: 'ウ', value: '55' },
      { label: 'エ', value: '20' },
    ],
    answer: 'イ',
    explanation:
      '1〜10の偶数（2,4,6,8,10）の合計。2+4+6+8+10 = 30。',
  },

  // ========================================
  // 問題8: 最大公約数（GCD・ユークリッドの互除法）
  // ========================================
  {
    id: 'q008',
    title: '最大公約数（ユークリッドの互除法）',
    source: 'IPA公式サンプル参考',
    difficulty: 'hard',
    tags: ['アルゴリズム', '関数', '繰り返し'],
    pseudocode: [
      '○整数型: gcd(整数型: a, 整数型: b)',
      '  整数型: r',
      '  while (b ≠ 0)',
      '    r ← a mod b',
      '    a ← b',
      '    b ← r',
      '  endwhile',
      '  return a',
      '■',
      '整数型: result',
      'result ← gcd(48, 18)',
    ],
    choices: [
      { label: 'ア', value: '6' },
      { label: 'イ', value: '3' },
      { label: 'ウ', value: '9' },
      { label: 'エ', value: '18' },
    ],
    answer: 'ア',
    explanation:
      'ユークリッドの互除法。gcd(48,18): 48 mod 18=12 → gcd(18,12): 18 mod 12=6 → gcd(12,6): 12 mod 6=0 → 6。',
  },

  // ========================================
  // 問題9: 配列の合計と平均（手続き定義）
  // ========================================
  {
    id: 'q009',
    title: '配列の合計と平均',
    source: 'IPA公式サンプル参考',
    difficulty: 'easy',
    tags: ['配列', '関数', '合計'],
    pseudocode: [
      '○整数型: calcSum(整数型の配列: A, 整数型: n)',
      '  整数型: i, total',
      '  total ← 0',
      '  for (i を 1 から n まで 1 ずつ増やす)',
      '    total ← total + A[i]',
      '  endfor',
      '  return total',
      '■',
      '整数型: A[] ← {10, 20, 30, 40, 50}',
      '整数型: s',
      's ← calcSum(A, 要素数(A))',
    ],
    choices: [
      { label: 'ア', value: '100' },
      { label: 'イ', value: '120' },
      { label: 'ウ', value: '150' },
      { label: 'エ', value: '50' },
    ],
    answer: 'ウ',
    explanation:
      'A の全要素の合計。10+20+30+40+50 = 150。',
  },

  // ========================================
  // 問題10: 配列の逆順（手続き定義）
  // ========================================
  {
    id: 'q010',
    title: '配列の逆順',
    source: 'IPA公式サンプル参考',
    difficulty: 'medium',
    tags: ['配列', '手続き', '交換'],
    pseudocode: [
      '○reverse(整数型の配列: A, 整数型: n)',
      '  整数型: i, tmp',
      '  for (i を 1 から n ÷ 2 まで 1 ずつ増やす)',
      '    tmp ← A[i]',
      '    A[i] ← A[n - i + 1]',
      '    A[n - i + 1] ← tmp',
      '  endfor',
      '■',
      '整数型: A[] ← {1, 2, 3, 4, 5}',
      'reverse(A, 要素数(A))',
    ],
    choices: [
      { label: 'ア', value: '{5, 4, 3, 2, 1}' },
      { label: 'イ', value: '{1, 2, 3, 4, 5}' },
      { label: 'ウ', value: '{1, 4, 3, 2, 5}' },
      { label: 'エ', value: '{3, 2, 1, 4, 5}' },
    ],
    answer: 'ア',
    explanation:
      '配列の先頭と末尾から順に要素を交換していく。A={1,2,3,4,5} は {5,4,3,2,1} になる。',
  },
];
