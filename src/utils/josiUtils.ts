/**
 * 한글 단어의 받침 유무를 확인하는 함수
 */
export const hasFinalConsonant = (word: string): boolean => {
  if (!word) return false
  
  const lastChar = word[word.length - 1]
  const code = lastChar.charCodeAt(0)
  
  // 한글 완성형 범위 확인
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const baseCode = code - 0xAC00
    const finalIndex = baseCode % 28
    return finalIndex !== 0 // 0이면 받침 없음, 0이 아니면 받침 있음
  }
  
  // 한글 자음 확인 (ㄱ, ㄴ, ㄷ 등)
  const consonants = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
  if (consonants.includes(lastChar)) {
    return true
  }
  
  return false
}

/**
 * 단어에 적절한 조사를 붙이는 함수
 */
export const addJosi = (word: string, josiType: 'eul' | 'i' | 'e' | 'wa'): string => {
  if (!word) return word
  
  const hasFinal = hasFinalConsonant(word)
  
  switch (josiType) {
    case 'eul': // 을/를
      return word + (hasFinal ? '을' : '를')
    
    case 'i': // 이/가
      return word + (hasFinal ? '이' : '가')
    
    case 'e': // 에
      return word + '에'
    
    case 'wa': // 와/과
      return word + (hasFinal ? '과' : '와')
    
    default:
      return word
  }
}

/**
 * 서술어에서 조사 패턴을 찾아서 자동으로 교체하는 함수
 */
export const processJosi = (word: string, predicate: string): string => {
  if (!word || !predicate) return predicate
  
  // 조사 패턴 매칭 및 교체
  const josiPatterns = [
    { pattern: /을\/를/, replacement: addJosi(word, 'eul').slice(word.length) },
    { pattern: /이\/가/, replacement: addJosi(word, 'i').slice(word.length) },
    { pattern: /와\/과/, replacement: addJosi(word, 'wa').slice(word.length) },
    { pattern: /을(?=\s)/, replacement: addJosi(word, 'eul').slice(word.length) },
    { pattern: /를(?=\s)/, replacement: addJosi(word, 'eul').slice(word.length) },
    { pattern: /이(?=\s)/, replacement: addJosi(word, 'i').slice(word.length) },
    { pattern: /가(?=\s)/, replacement: addJosi(word, 'i').slice(word.length) },
    { pattern: /와(?=\s)/, replacement: addJosi(word, 'wa').slice(word.length) },
    { pattern: /과(?=\s)/, replacement: addJosi(word, 'wa').slice(word.length) }
  ]
  
  let result = predicate
  for (const { pattern, replacement } of josiPatterns) {
    result = result.replace(pattern, replacement)
  }
  
  return result
}