import { useState, useCallback, useEffect, useRef } from 'react'
import { getConsonantByClick, combineVowel, isVowelKey, isConsonantKey } from '../utils/cheongjiinUtils'
import { assembleHangul } from '../utils/hangulUtils'

interface InputState {
  text: string
  currentChar: {
    initial: string
    medial: string
    final: string
  }
  vowelSequence: string[]
  consonantClickCounts: Record<string, number>
  isComposing: boolean
  lastSpaceTime: number
}

export const useCheongjiinInput = () => {
  const [state, setState] = useState<InputState>({
    text: '',
    currentChar: { initial: '', medial: '', final: '' },
    vowelSequence: [],
    consonantClickCounts: {},
    isComposing: false,
    lastSpaceTime: 0
  })

  // AIDEV-NOTE: 3초 타임아웃 후 자동 완성을 위한 타이머
  const autoCompleteTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 타이머 정리 함수
  const clearAutoCompleteTimer = useCallback(() => {
    if (autoCompleteTimerRef.current) {
      clearTimeout(autoCompleteTimerRef.current)
      autoCompleteTimerRef.current = null
    }
  }, [])

  // 타이머 시작 함수
  const startAutoCompleteTimer = useCallback(() => {
    clearAutoCompleteTimer()
    autoCompleteTimerRef.current = setTimeout(() => {
      setState(prev => {
        if (prev.isComposing && prev.currentChar.initial) {
          let assembled = ''
          if (prev.currentChar.medial) {
            // 초성+중성(+종성) 조합
            assembled = assembleHangul(prev.currentChar.initial, prev.currentChar.medial, prev.currentChar.final)
          } else {
            // 초성만 있는 경우 그대로 완성
            assembled = prev.currentChar.initial
          }
          return {
            ...prev,
            text: prev.text + assembled,
            currentChar: { initial: '', medial: '', final: '' },
            vowelSequence: [],
            consonantClickCounts: {},
            isComposing: false,
            lastSpaceTime: 0
          }
        }
        return prev
      })
    }, 2000) // 2초 타임아웃
  }, [clearAutoCompleteTimer])

  const commitCurrentChar = useCallback(() => {
    clearAutoCompleteTimer() // 수동 완성 시 타이머 정리
    setState(prev => {
      if (prev.currentChar.initial && prev.currentChar.medial) {
        const assembled = assembleHangul(prev.currentChar.initial, prev.currentChar.medial, prev.currentChar.final)
        return {
          ...prev,
          text: prev.text + assembled,
          currentChar: { initial: '', medial: '', final: '' },
          vowelSequence: [],
          consonantClickCounts: {},
          isComposing: false,
          lastSpaceTime: 0
        }
      }
      return prev
    })
  }, [])

  const handleKeyPress = useCallback((key: string) => {
    if (key === 'backspace') {
      setState(prev => {
        if (prev.isComposing) {
          if (prev.currentChar.final) {
            return {
              ...prev,
              currentChar: { ...prev.currentChar, final: '' }
            }
          } else if (prev.vowelSequence.length > 0) {
            const newVowelSequence = prev.vowelSequence.slice(0, -1)
            const newMedial = combineVowel(newVowelSequence)
            return {
              ...prev,
              vowelSequence: newVowelSequence,
              currentChar: { ...prev.currentChar, medial: newMedial }
            }
          } else if (prev.currentChar.initial) {
            return {
              ...prev,
              currentChar: { initial: '', medial: '', final: '' },
              vowelSequence: [],
              consonantClickCounts: {},
              isComposing: false
            }
          }
        }
        
        if (prev.text.length > 0) {
          return {
            ...prev,
            text: prev.text.slice(0, -1)
          }
        }
        
        return prev
      })
      return
    }

    if (key === 'space') {
      setState(prev => {
        // AIDEV-NOTE: 스페이스 키 로직 개선 - 조합 중이면 완성, 아니면 바로 띄어쓰기
        
        // 현재 조합 중인 글자가 있는지 확인 (isComposing 상태 사용)
        if (prev.isComposing && (prev.currentChar.initial || prev.currentChar.medial || prev.currentChar.final)) {
          // 조합 중인 글자가 있을 때: 현재 글자를 완성하고 조합 상태 종료
          const assembled = prev.currentChar.initial && prev.currentChar.medial
            ? assembleHangul(prev.currentChar.initial, prev.currentChar.medial, prev.currentChar.final)
            : prev.currentChar.initial || ''
          
          return {
            ...prev,
            text: prev.text + assembled,
            currentChar: { initial: '', medial: '', final: '' },
            vowelSequence: [],
            consonantClickCounts: {},
            isComposing: false,
            lastSpaceTime: 0
          }
        } else {
          // 조합 상태가 아닐 때: 바로 띄어쓰기 추가 (연속 띄어쓰기 허용)
          return {
            ...prev,
            text: prev.text + ' ',
            lastSpaceTime: 0
          }
        }
      })
      return
    }

    if (key === 'newline') {
      setState(prev => {
        const assembled = prev.currentChar.initial && prev.currentChar.medial
          ? assembleHangul(prev.currentChar.initial, prev.currentChar.medial, prev.currentChar.final)
          : ''
        
        return {
          ...prev,
          text: prev.text + assembled + '\n',
          currentChar: { initial: '', medial: '', final: '' },
          vowelSequence: [],
          consonantClickCounts: {},
          isComposing: false
        }
      })
      return
    }

    if (isVowelKey(key)) {
      setState(prev => {
        // 종성이 있는 상태에서 모음이 오면, 종성을 새로운 글자의 초성으로 변환
        if (prev.currentChar.final && prev.currentChar.initial && prev.currentChar.medial) {
          const assembledWithoutFinal = assembleHangul(prev.currentChar.initial, prev.currentChar.medial, '')
          const newVowelSequence = [key]
          const newMedial = combineVowel(newVowelSequence)
          
          if (newMedial) {
            return {
              ...prev,
              text: prev.text + assembledWithoutFinal,
              currentChar: { initial: prev.currentChar.final, medial: newMedial, final: '' },
              vowelSequence: newVowelSequence,
              consonantClickCounts: {},
              isComposing: true
            }
          }
        }
        
        if (!prev.currentChar.initial) {
          return prev
        }
        
        // 'ㆍ'가 이미 2개 있는 경우 추가 입력 무시
        if (key === 'ㆍ' && prev.vowelSequence.filter(v => v === 'ㆍ').length >= 2) {
          return prev
        }
        
        const newVowelSequence = [...prev.vowelSequence, key]
        const newMedial = combineVowel(newVowelSequence)
        
        if (newMedial) {
          // 모음이 성공적으로 조합되면 계속 조합 중 상태 유지
          return {
            ...prev,
            vowelSequence: newVowelSequence,
            currentChar: { ...prev.currentChar, medial: newMedial },
            isComposing: true
          }
        }
        
        // 조합이 안 되더라도 vowelSequence는 계속 유지
        return {
          ...prev,
          vowelSequence: newVowelSequence,
          isComposing: true
        }
      })
      return
    }

    // AIDEV-NOTE: 숫자 키 처리
    if (/^[0-9]$/.test(key)) {
      setState(prev => {
        return {
          ...prev,
          text: prev.text + key
        }
      })
      return
    }

    if (isConsonantKey(key)) {
      setState(prev => {
        const clickCount = (prev.consonantClickCounts[key] || 0) + 1
        const consonant = getConsonantByClick(key, clickCount)
        
        // 초성 위치에 같은 키를 다시 클릭하는 경우 (ㄱ → ㅋ → ㄲ)
        if (!prev.currentChar.initial) {
          return {
            ...prev,
            currentChar: { ...prev.currentChar, initial: consonant },
            consonantClickCounts: { ...prev.consonantClickCounts, [key]: clickCount },
            isComposing: true
          }
        }
        
        // 현재 초성이 있고 중성이 없는 상태에서 같은 키를 다시 클릭하는 경우
        if (prev.currentChar.initial && !prev.currentChar.medial && prev.consonantClickCounts[key]) {
          return {
            ...prev,
            currentChar: { ...prev.currentChar, initial: consonant },
            consonantClickCounts: { ...prev.consonantClickCounts, [key]: clickCount },
            isComposing: true
          }
        }
        
        // 종성 위치에 자음을 입력하는 경우
        if (prev.currentChar.medial && !prev.currentChar.final) {
          const finalConsonant = getConsonantByClick(key, 1) // 종성은 항상 첫 번째 자음
          return {
            ...prev,
            currentChar: { ...prev.currentChar, final: finalConsonant },
            consonantClickCounts: { [key]: 1 } // 종성 입력 시 clickCount 초기화
          }
        }
        
        // 종성이 있는 상태에서 같은 키를 다시 클릭하는 경우
        if (prev.currentChar.final && prev.consonantClickCounts[key]) {
          return {
            ...prev,
            currentChar: { ...prev.currentChar, final: consonant },
            consonantClickCounts: { ...prev.consonantClickCounts, [key]: clickCount }
          }
        }
        
        // 새로운 글자 시작
        const assembled = prev.currentChar.initial && prev.currentChar.medial
          ? assembleHangul(prev.currentChar.initial, prev.currentChar.medial, prev.currentChar.final)
          : prev.currentChar.initial || ''
        
        return {
          ...prev,
          text: prev.text + assembled,
          currentChar: { initial: consonant, medial: '', final: '' },
          vowelSequence: [],
          consonantClickCounts: { [key]: clickCount },
          isComposing: true
        }
      })
      return
    }
  }, [clearAutoCompleteTimer, startAutoCompleteTimer])

  // AIDEV-NOTE: 모든 키 입력 후 조합 가능한 상태이면 타이머 시작
  useEffect(() => {
    if (state.isComposing && state.currentChar.initial) {
      startAutoCompleteTimer()
    } else {
      clearAutoCompleteTimer()
    }
  }, [state.isComposing, state.currentChar.initial, state.currentChar.medial, state.currentChar.final, startAutoCompleteTimer, clearAutoCompleteTimer])

  // AIDEV-NOTE: 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      clearAutoCompleteTimer()
    }
  }, [clearAutoCompleteTimer])

  const getCurrentDisplay = useCallback(() => {
    if (state.isComposing && state.currentChar.initial) {
      // 완전한 모음이 조합된 경우 정상 한글로 표시
      if (state.currentChar.medial) {
        // 'ㆍ'가 단독으로 medial에 있고 vowelSequence가 1개인 경우는 중간 상태로 처리
        if (state.currentChar.medial === 'ㆍ' && state.vowelSequence.length === 1) {
          const result = state.currentChar.initial + state.vowelSequence.join('')
          return result
        }
        // 'ㆍ'가 연속으로 나오는 경우 (ㆍㆍ) 중간 상태로 처리
        else if (state.currentChar.medial === 'ㆍ' && state.vowelSequence.length === 2 && state.vowelSequence[0] === 'ㆍ' && state.vowelSequence[1] === 'ㆍ') {
          const result = state.currentChar.initial + state.vowelSequence.join('')
          return result
        }
        // 그 외의 경우는 정상 한글로 조합
        else {
          const result = assembleHangul(state.currentChar.initial, state.currentChar.medial, state.currentChar.final)
          
          // assembleHangul이 실패하면 (비표준 조합) 분해된 형태로 표시
          if (!result && state.currentChar.initial && state.currentChar.medial) {
            // 종성이 없는 경우: 모두 분해 (예: 대ㅐ)
            if (!state.currentChar.final) {
              const decomposed = state.currentChar.initial + state.currentChar.medial
              return decomposed
            }
            // 종성이 있는 경우: 초성+중성 조합 후 종성만 분해 (예: 비ㅉ)
            else {
              const baseChar = assembleHangul(state.currentChar.initial, state.currentChar.medial, '')
              if (baseChar) {
                const decomposed = baseChar + state.currentChar.final
                return decomposed
              } else {
                // 초성+중성도 안되면 모두 분해
                const decomposed = state.currentChar.initial + state.currentChar.medial + state.currentChar.final
                return decomposed
              }
            }
          }
          
          return result
        }
      }
      // 천지인 조합 과정 중인 경우 중간 상태 그대로 표시
      else if (state.vowelSequence.length > 0) {
        const result = state.currentChar.initial + state.vowelSequence.join('')
        return result
      }
      // 초성만 있는 경우
      else {
        return state.currentChar.initial
      }
    }
    return ''
  }, [state.currentChar, state.isComposing, state.vowelSequence])

  const getFullText = useCallback(() => {
    return state.text + getCurrentDisplay()
  }, [state.text, getCurrentDisplay])

  const clearAll = useCallback(() => {
    setState({
      text: '',
      currentChar: { initial: '', medial: '', final: '' },
      vowelSequence: [],
      consonantClickCounts: {},
      isComposing: false,
      lastSpaceTime: 0
    })
  }, [])

  const setText = useCallback((newText: string) => {
    setState({
      text: newText,
      currentChar: { initial: '', medial: '', final: '' },
      vowelSequence: [],
      consonantClickCounts: {},
      isComposing: false,
      lastSpaceTime: 0
    })
  }, [])

  return {
    text: getFullText(),
    handleKeyPress,
    commitCurrentChar,
    clearAll,
    setText,
    isComposing: state.isComposing,
    currentChar: state.currentChar,
    getCurrentDisplay
  }
}