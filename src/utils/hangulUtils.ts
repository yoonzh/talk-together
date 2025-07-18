const INITIALS = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
]

const MEDIALS = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'
]

const FINALS = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
]

export const assembleHangul = (initial: string, medial: string, final: string = ''): string => {
  const initialIndex = INITIALS.indexOf(initial)
  const medialIndex = MEDIALS.indexOf(medial)
  const finalIndex = FINALS.indexOf(final)
  
  if (initialIndex === -1 || medialIndex === -1 || finalIndex === -1) {
    return ''
  }
  
  const code = 0xAC00 + ((initialIndex * 21) + medialIndex) * 28 + finalIndex
  return String.fromCharCode(code)
}


export const disassembleHangul = (char: string): { initial: string; medial: string; final: string } => {
  const code = char.charCodeAt(0)
  
  if (code < 0xAC00 || code > 0xD7A3) {
    return { initial: '', medial: '', final: '' }
  }
  
  const baseCode = code - 0xAC00
  const finalIndex = baseCode % 28
  const medialIndex = Math.floor(baseCode / 28) % 21
  const initialIndex = Math.floor(baseCode / 28 / 21)
  
  return {
    initial: INITIALS[initialIndex],
    medial: MEDIALS[medialIndex],
    final: FINALS[finalIndex]
  }
}

export const isCompleteHangul = (char: string): boolean => {
  const code = char.charCodeAt(0)
  return code >= 0xAC00 && code <= 0xD7A3
}

export const isInitialConsonant = (char: string): boolean => {
  const consonants = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
  return consonants.includes(char)
}

export const isMedialVowel = (char: string): boolean => {
  const vowels = ['ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ', 'ㅐ', 'ㅒ', 'ㅔ', 'ㅖ', 'ㅚ', 'ㅟ', 'ㅢ', 'ㅘ', 'ㅙ', 'ㅝ', 'ㅞ']
  return vowels.includes(char)
}