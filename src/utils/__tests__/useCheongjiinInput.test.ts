import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCheongjiinInput } from '../../hooks/useCheongjiinInput'

describe('useCheongjiinInput', () => {
  describe('종성 입력 시 올바른 문자 조합', () => {
    it('밥 입력 시 올바른 글자가 나와야 함', () => {
      const { result } = renderHook(() => useCheongjiinInput())

      act(() => {
        // ㅂ (초성)
        result.current.handleKeyPress('ㅂㅍ')
      })

      act(() => {
        // ㅏ (중성: ㅣ + ㆍ)
        result.current.handleKeyPress('ㅣ')
        result.current.handleKeyPress('ㆍ')
      })

      act(() => {
        // ㅂ (종성)
        result.current.handleKeyPress('ㅂㅍ')
      })

      expect(result.current.text).toBe('밥')
    })

    it('밥 입력 후 추가 입력 시에도 밥이 유지되어야 함', () => {
      const { result } = renderHook(() => useCheongjiinInput())

      act(() => {
        // ㅂ (초성)
        result.current.handleKeyPress('ㅂㅍ')
      })

      act(() => {
        // ㅏ (중성: ㅣ + ㆍ)
        result.current.handleKeyPress('ㅣ')
        result.current.handleKeyPress('ㆍ')
      })

      act(() => {
        // ㅂ (종성)
        result.current.handleKeyPress('ㅂㅍ')
      })

      // 여기서 텍스트를 확정
      act(() => {
        result.current.commitCurrentChar()
      })

      expect(result.current.text).toBe('밥')
    })

    it('종성에서 같은 키 반복 클릭 시 자음 변경되어야 함', () => {
      const { result } = renderHook(() => useCheongjiinInput())

      act(() => {
        // ㅂ (초성)
        result.current.handleKeyPress('ㅂㅍ')
      })

      act(() => {
        // ㅏ (중성: ㅣ + ㆍ)
        result.current.handleKeyPress('ㅣ')
        result.current.handleKeyPress('ㆍ')
      })

      act(() => {
        // ㅂ (종성)
        result.current.handleKeyPress('ㅂㅍ')
      })

      act(() => {
        // 같은 키 다시 클릭 → ㅍ (종성)
        result.current.handleKeyPress('ㅂㅍ')
      })

      expect(result.current.text).toBe('밮')
    })
  })
})