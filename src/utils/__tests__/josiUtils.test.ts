import { describe, it, expect } from 'vitest'
import { hasFinalConsonant, addJosi, processJosi } from '../josiUtils'

describe('josiUtils', () => {
  describe('hasFinalConsonant', () => {
    it('should return true for words with final consonant', () => {
      expect(hasFinalConsonant('강')).toBe(true)
      expect(hasFinalConsonant('집')).toBe(true)
      expect(hasFinalConsonant('책')).toBe(true)
      expect(hasFinalConsonant('물')).toBe(true)
      expect(hasFinalConsonant('밥')).toBe(true)
    })

    it('should return false for words without final consonant', () => {
      expect(hasFinalConsonant('가')).toBe(false)
      expect(hasFinalConsonant('나')).toBe(false)
      expect(hasFinalConsonant('수')).toBe(false)
      expect(hasFinalConsonant('케이크')).toBe(false)
      expect(hasFinalConsonant('커피')).toBe(false)
    })

    it('should handle single consonants', () => {
      expect(hasFinalConsonant('ㄱ')).toBe(true)
      expect(hasFinalConsonant('ㄴ')).toBe(true)
      expect(hasFinalConsonant('ㅁ')).toBe(true)
    })

    it('should handle empty string', () => {
      expect(hasFinalConsonant('')).toBe(false)
    })
  })

  describe('addJosi', () => {
    it('should add correct 을/를 josi', () => {
      expect(addJosi('밥', 'eul')).toBe('밥을')
      expect(addJosi('물', 'eul')).toBe('물을')
      expect(addJosi('케이크', 'eul')).toBe('케이크를')
      expect(addJosi('커피', 'eul')).toBe('커피를')
    })

    it('should add correct 이/가 josi', () => {
      expect(addJosi('밥', 'i')).toBe('밥이')
      expect(addJosi('물', 'i')).toBe('물이')
      expect(addJosi('케이크', 'i')).toBe('케이크가')
      expect(addJosi('커피', 'i')).toBe('커피가')
    })

    it('should add correct 와/과 josi', () => {
      expect(addJosi('밥', 'wa')).toBe('밥과')
      expect(addJosi('물', 'wa')).toBe('물과')
      expect(addJosi('케이크', 'wa')).toBe('케이크와')
      expect(addJosi('커피', 'wa')).toBe('커피와')
    })

    it('should add 에 josi', () => {
      expect(addJosi('학교', 'e')).toBe('학교에')
      expect(addJosi('집', 'e')).toBe('집에')
    })
  })

  describe('processJosi', () => {
    it('should process 을/를 patterns correctly', () => {
      expect(processJosi('밥', '을/를 먹고 싶어요')).toBe('밥을 먹고 싶어요')
      expect(processJosi('케이크', '을/를 먹고 싶어요')).toBe('케이크를 먹고 싶어요')
      expect(processJosi('물', '을 마시고 싶어요')).toBe('물을 마시고 싶어요')
      expect(processJosi('커피', '를 마시고 싶어요')).toBe('커피를 마시고 싶어요')
    })

    it('should process 이/가 patterns correctly', () => {
      expect(processJosi('밥', '이/가 맛있어요')).toBe('밥이 맛있어요')
      expect(processJosi('케이크', '이/가 맛있어요')).toBe('케이크가 맛있어요')
      expect(processJosi('물', '이 차가워요')).toBe('물이 차가워요')
      expect(processJosi('커피', '가 뜨거워요')).toBe('커피가 뜨거워요')
    })

    it('should process 와/과 patterns correctly', () => {
      expect(processJosi('친구', '와/과 놀고 싶어요')).toBe('친구와 놀고 싶어요')
      expect(processJosi('엄마', '와/과 놀고 싶어요')).toBe('엄마와 놀고 싶어요')
      expect(processJosi('아빠', '와/과 놀고 싶어요')).toBe('아빠와 놀고 싶어요')
    })

    it('should handle empty inputs', () => {
      expect(processJosi('', '을/를 먹고 싶어요')).toBe('을/를 먹고 싶어요')
      expect(processJosi('밥', '')).toBe('')
    })
  })
})