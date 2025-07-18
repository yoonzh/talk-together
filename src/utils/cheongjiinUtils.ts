export const cheongjiinVowelMap: Record<string, string> = {
  'ㅣ': 'ㅣ',
  'ㅡ': 'ㅡ',
  'ㆍ': 'ㆍ',
  'ㅣㆍ': 'ㅏ',
  'ㆍㅣ': 'ㅓ',
  'ㆍㅡ': 'ㅗ',
  'ㅡㆍ': 'ㅜ',
  'ㅣㆍㆍ': 'ㅑ',
  'ㆍㆍㅣ': 'ㅕ',
  'ㆍㆍㅡ': 'ㅛ',
  'ㅡㆍㆍ': 'ㅠ',
  'ㅣㆍㅣ': 'ㅐ',
  'ㅣㆍㆍㅣ': 'ㅒ',
  'ㆍㅣㅣ': 'ㅔ',
  'ㆍㆍㅣㅣ': 'ㅖ',
  'ㅡㅣ': 'ㅢ',
  'ㆍㅡㅣ': 'ㅚ',
  'ㅡㆍㅣ': 'ㅟ',
  'ㆍㅡㅣㆍ': 'ㅘ',
  'ㅡㆍㆍㅣ': 'ㅝ',
  'ㆍㅡㅣㆍㅣ': 'ㅙ',
  'ㅡㆍㆍㅣㅣ': 'ㅞ'
}

export const consonantMap: Record<string, string[]> = {
  'ㄱㅋ': ['ㄱ', 'ㅋ', 'ㄲ'],
  'ㄴㄹ': ['ㄴ', 'ㄹ'],
  'ㄷㅌ': ['ㄷ', 'ㅌ', 'ㄸ'],
  'ㅂㅍ': ['ㅂ', 'ㅍ', 'ㅃ'],
  'ㅅㅎ': ['ㅅ', 'ㅎ', 'ㅆ'],
  'ㅈㅊ': ['ㅈ', 'ㅊ', 'ㅉ'],
  'ㅇㅁ': ['ㅇ', 'ㅁ']
}

export const getConsonantByClick = (buttonKey: string, clickCount: number): string => {
  const consonants = consonantMap[buttonKey]
  if (!consonants) return ''
  
  const index = (clickCount - 1) % consonants.length
  return consonants[index]
}

export const combineVowel = (vowelSequence: string[]): string => {
  const key = vowelSequence.join('')
  return cheongjiinVowelMap[key] || ''
}

export const isVowelKey = (key: string): boolean => {
  return ['ㅣ', 'ㅡ', 'ㆍ'].includes(key)
}

export const isConsonantKey = (key: string): boolean => {
  return Object.keys(consonantMap).includes(key)
}

export const canExtendVowelSequence = (vowelSequence: string[]): boolean => {
  const currentKey = vowelSequence.join('')
  
  // 현재 시퀀스가 유효한 모음을 만들어야 함
  if (!cheongjiinVowelMap[currentKey]) {
    return false
  }
  
  // 더 긴 조합이 가능한지 확인
  const vowelKeys = ['ㅣ', 'ㅡ', 'ㆍ']
  
  for (const nextKey of vowelKeys) {
    const extendedKey = currentKey + nextKey
    if (cheongjiinVowelMap[extendedKey]) {
      return true
    }
  }
  
  return false
}