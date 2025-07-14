import { describe, it, expect } from 'vitest'
import { assembleHangul, disassembleHangul, isCompleteHangul } from '../hangulUtils'

describe('hangulUtils', () => {
  describe('assembleHangul', () => {
    it('should assemble 초성 + 중성', () => {
      expect(assembleHangul('ㄱ', 'ㅏ')).toBe('가')
      expect(assembleHangul('ㄱ', 'ㅓ')).toBe('거')
      expect(assembleHangul('ㄱ', 'ㅗ')).toBe('고')
      expect(assembleHangul('ㄱ', 'ㅜ')).toBe('구')
      expect(assembleHangul('ㄱ', 'ㅡ')).toBe('그')
      expect(assembleHangul('ㄱ', 'ㅣ')).toBe('기')
    })

    it('should assemble 초성 + 중성 + 종성', () => {
      expect(assembleHangul('ㄱ', 'ㅏ', 'ㅇ')).toBe('강')
      expect(assembleHangul('ㄱ', 'ㅓ', 'ㅇ')).toBe('겅')
      expect(assembleHangul('ㄱ', 'ㅗ', 'ㅇ')).toBe('공')
      expect(assembleHangul('ㄱ', 'ㅜ', 'ㅇ')).toBe('궁')
      expect(assembleHangul('ㄱ', 'ㅡ', 'ㅇ')).toBe('긍')
      expect(assembleHangul('ㄱ', 'ㅣ', 'ㅇ')).toBe('깅')
    })

    it('should handle all vowel combinations', () => {
      expect(assembleHangul('ㄱ', 'ㅑ')).toBe('갸')
      expect(assembleHangul('ㄱ', 'ㅕ')).toBe('겨')
      expect(assembleHangul('ㄱ', 'ㅛ')).toBe('교')
      expect(assembleHangul('ㄱ', 'ㅠ')).toBe('규')
      expect(assembleHangul('ㄱ', 'ㅐ')).toBe('개')
      expect(assembleHangul('ㄱ', 'ㅒ')).toBe('걔')
      expect(assembleHangul('ㄱ', 'ㅔ')).toBe('게')
      expect(assembleHangul('ㄱ', 'ㅖ')).toBe('계')
      expect(assembleHangul('ㄱ', 'ㅚ')).toBe('괴')
      expect(assembleHangul('ㄱ', 'ㅟ')).toBe('귀')
      expect(assembleHangul('ㄱ', 'ㅢ')).toBe('긔')
      expect(assembleHangul('ㄱ', 'ㅘ')).toBe('과')
      expect(assembleHangul('ㄱ', 'ㅙ')).toBe('괘')
      expect(assembleHangul('ㄱ', 'ㅝ')).toBe('궈')
      expect(assembleHangul('ㄱ', 'ㅞ')).toBe('궤')
    })
  })

  describe('disassembleHangul', () => {
    it('should disassemble complete hangul characters', () => {
      expect(disassembleHangul('가')).toEqual({
        initial: 'ㄱ',
        medial: 'ㅏ',
        final: ''
      })
      expect(disassembleHangul('강')).toEqual({
        initial: 'ㄱ',
        medial: 'ㅏ',
        final: 'ㅇ'
      })
    })

    it('should return empty for non-hangul characters', () => {
      expect(disassembleHangul('a')).toEqual({
        initial: '',
        medial: '',
        final: ''
      })
      expect(disassembleHangul('1')).toEqual({
        initial: '',
        medial: '',
        final: ''
      })
    })
  })

  describe('isCompleteHangul', () => {
    it('should return true for complete hangul characters', () => {
      expect(isCompleteHangul('가')).toBe(true)
      expect(isCompleteHangul('강')).toBe(true)
      expect(isCompleteHangul('한')).toBe(true)
    })

    it('should return false for non-hangul characters', () => {
      expect(isCompleteHangul('a')).toBe(false)
      expect(isCompleteHangul('1')).toBe(false)
      expect(isCompleteHangul('ㄱ')).toBe(false)
      expect(isCompleteHangul('ㅏ')).toBe(false)
    })
  })
})