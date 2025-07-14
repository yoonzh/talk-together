import { describe, it, expect } from 'vitest'
import { getConsonantByClick, combineVowel, isVowelKey, isConsonantKey } from '../cheongjiinUtils'

describe('cheongjiinUtils', () => {
  describe('getConsonantByClick', () => {
    it('should return correct consonant for ㄱㅋ button', () => {
      expect(getConsonantByClick('ㄱㅋ', 1)).toBe('ㄱ')
      expect(getConsonantByClick('ㄱㅋ', 2)).toBe('ㅋ')
      expect(getConsonantByClick('ㄱㅋ', 3)).toBe('ㄲ')
      expect(getConsonantByClick('ㄱㅋ', 4)).toBe('ㄱ')
    })

    it('should return correct consonant for ㄴㄹ button', () => {
      expect(getConsonantByClick('ㄴㄹ', 1)).toBe('ㄴ')
      expect(getConsonantByClick('ㄴㄹ', 2)).toBe('ㄹ')
      expect(getConsonantByClick('ㄴㄹ', 3)).toBe('ㄴ')
    })

    it('should return correct consonant for ㅇㅁ button', () => {
      expect(getConsonantByClick('ㅇㅁ', 1)).toBe('ㅇ')
      expect(getConsonantByClick('ㅇㅁ', 2)).toBe('ㅁ')
      expect(getConsonantByClick('ㅇㅁ', 3)).toBe('ㅇ')
    })
  })

  describe('combineVowel', () => {
    it('should combine basic vowels', () => {
      expect(combineVowel(['ㅣ'])).toBe('ㅣ')
      expect(combineVowel(['ㅡ'])).toBe('ㅡ')
      expect(combineVowel(['ㆍ'])).toBe('ㆍ')
    })

    it('should combine two-character vowels', () => {
      expect(combineVowel(['ㅣ', 'ㆍ'])).toBe('ㅏ')
      expect(combineVowel(['ㆍ', 'ㅣ'])).toBe('ㅓ')
      expect(combineVowel(['ㆍ', 'ㅡ'])).toBe('ㅗ')
      expect(combineVowel(['ㅡ', 'ㆍ'])).toBe('ㅜ')
      expect(combineVowel(['ㅡ', 'ㅣ'])).toBe('ㅢ')
    })

    it('should combine three-character vowels', () => {
      expect(combineVowel(['ㅣ', 'ㆍ', 'ㆍ'])).toBe('ㅑ')
      expect(combineVowel(['ㆍ', 'ㆍ', 'ㅣ'])).toBe('ㅕ')
      expect(combineVowel(['ㆍ', 'ㆍ', 'ㅡ'])).toBe('ㅛ')
      expect(combineVowel(['ㅡ', 'ㆍ', 'ㆍ'])).toBe('ㅠ')
      expect(combineVowel(['ㅣ', 'ㆍ', 'ㅣ'])).toBe('ㅐ')
      expect(combineVowel(['ㆍ', 'ㅣ', 'ㅣ'])).toBe('ㅔ')
      expect(combineVowel(['ㆍ', 'ㅡ', 'ㅣ'])).toBe('ㅚ')
      expect(combineVowel(['ㅡ', 'ㆍ', 'ㅣ'])).toBe('ㅟ')
    })

    it('should combine complex vowels', () => {
      expect(combineVowel(['ㅣ', 'ㆍ', 'ㆍ', 'ㅣ'])).toBe('ㅒ')
      expect(combineVowel(['ㆍ', 'ㆍ', 'ㅣ', 'ㅣ'])).toBe('ㅖ')
      expect(combineVowel(['ㆍ', 'ㅡ', 'ㅣ', 'ㆍ'])).toBe('ㅘ')
      expect(combineVowel(['ㅡ', 'ㆍ', 'ㆍ', 'ㅣ'])).toBe('ㅝ')
      expect(combineVowel(['ㆍ', 'ㅡ', 'ㅣ', 'ㆍ', 'ㅣ'])).toBe('ㅙ')
      expect(combineVowel(['ㅡ', 'ㆍ', 'ㆍ', 'ㅣ', 'ㅣ'])).toBe('ㅞ')
    })
  })

  describe('isVowelKey', () => {
    it('should return true for vowel keys', () => {
      expect(isVowelKey('ㅣ')).toBe(true)
      expect(isVowelKey('ㅡ')).toBe(true)
      expect(isVowelKey('ㆍ')).toBe(true)
    })

    it('should return false for non-vowel keys', () => {
      expect(isVowelKey('ㄱㅋ')).toBe(false)
      expect(isVowelKey('ㄴㄹ')).toBe(false)
      expect(isVowelKey('backspace')).toBe(false)
    })
  })

  describe('isConsonantKey', () => {
    it('should return true for consonant keys', () => {
      expect(isConsonantKey('ㄱㅋ')).toBe(true)
      expect(isConsonantKey('ㄴㄹ')).toBe(true)
      expect(isConsonantKey('ㅇㅁ')).toBe(true)
    })

    it('should return false for non-consonant keys', () => {
      expect(isConsonantKey('ㅣ')).toBe(false)
      expect(isConsonantKey('ㅡ')).toBe(false)
      expect(isConsonantKey('backspace')).toBe(false)
    })
  })
})