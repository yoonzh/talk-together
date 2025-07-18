import { useState, useCallback } from 'react'
import { getConsonantByClick, combineVowel, isVowelKey, isConsonantKey } from '../utils/cheongjiinUtils'
import { assembleHangul } from '../utils/hangulUtils'
import { logCheongjiinInput } from '../utils/logger'

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

  const commitCurrentChar = useCallback(() => {
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
    logCheongjiinInput(`키 입력: ${key}`)
    
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
        const currentTime = Date.now()
        const assembled = prev.currentChar.initial && prev.currentChar.medial
          ? assembleHangul(prev.currentChar.initial, prev.currentChar.medial, prev.currentChar.final)
          : ''
        
        // 현재 조합 중인 글자가 있는지 확인
        const hasCurrentChar = prev.currentChar.initial || prev.currentChar.medial || prev.currentChar.final
        
        // 이전 space키 입력으로부터 짧은 시간(500ms) 내에 다시 space키가 눌렸는지 확인
        const isQuickSecondSpace = !hasCurrentChar && (currentTime - prev.lastSpaceTime) < 500
        
        if (hasCurrentChar) {
          // 조합 중인 글자가 있을 때: 현재 글자를 완성하고 조합 상태 종료
          return {
            ...prev,
            text: prev.text + assembled,
            currentChar: { initial: '', medial: '', final: '' },
            vowelSequence: [],
            consonantClickCounts: {},
            isComposing: false,
            lastSpaceTime: currentTime
          }
        } else if (isQuickSecondSpace) {
          // 빠른 연속 space키: 띄어쓰기 추가
          return {
            ...prev,
            text: prev.text + ' ',
            lastSpaceTime: 0 // 리셋
          }
        } else {
          // 첫 번째 space키 (조합 완성 후): 아무것도 하지 않음
          return {
            ...prev,
            lastSpaceTime: currentTime
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
          console.log('ㆍ 입력 무시: 이미 2개 존재')
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
  }, [commitCurrentChar])

  const getCurrentDisplay = useCallback(() => {
    console.log('=== getCurrentDisplay DEBUG ===')
    console.log('isComposing:', state.isComposing)
    console.log('currentChar:', state.currentChar)
    console.log('vowelSequence:', state.vowelSequence)
    
    if (state.isComposing && state.currentChar.initial) {
      // 완전한 모음이 조합된 경우 정상 한글로 표시
      if (state.currentChar.medial) {
        // 'ㆍ'가 단독으로 medial에 있고 vowelSequence가 1개인 경우는 중간 상태로 처리
        if (state.currentChar.medial === 'ㆍ' && state.vowelSequence.length === 1) {
          const result = state.currentChar.initial + state.vowelSequence.join('')
          console.log('intermediate state (ㆍ):', result)
          return result
        }
        // 'ㆍ'가 연속으로 나오는 경우 (ㆍㆍ) 중간 상태로 처리
        else if (state.currentChar.medial === 'ㆍ' && state.vowelSequence.length === 2 && state.vowelSequence[0] === 'ㆍ' && state.vowelSequence[1] === 'ㆍ') {
          const result = state.currentChar.initial + state.vowelSequence.join('')
          console.log('intermediate state (ㆍㆍ):', result)
          return result
        }
        // 그 외의 경우는 정상 한글로 조합
        else {
          const result = assembleHangul(state.currentChar.initial, state.currentChar.medial, state.currentChar.final)
          console.log('assembled hangul:', result)
          
          // assembleHangul이 실패하면 (비표준 조합) 분해된 형태로 표시
          if (!result && state.currentChar.initial && state.currentChar.medial) {
            // 종성이 없는 경우: 모두 분해 (예: 대ㅐ)
            if (!state.currentChar.final) {
              const decomposed = state.currentChar.initial + state.currentChar.medial
              console.log('non-standard medial composition, showing decomposed:', decomposed)
              return decomposed
            }
            // 종성이 있는 경우: 초성+중성 조합 후 종성만 분해 (예: 비ㅉ)
            else {
              const baseChar = assembleHangul(state.currentChar.initial, state.currentChar.medial, '')
              if (baseChar) {
                const decomposed = baseChar + state.currentChar.final
                console.log('non-standard final composition, showing base + final:', decomposed)
                return decomposed
              } else {
                // 초성+중성도 안되면 모두 분해
                const decomposed = state.currentChar.initial + state.currentChar.medial + state.currentChar.final
                console.log('fully non-standard composition, showing fully decomposed:', decomposed)
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
        console.log('intermediate state:', result)
        return result
      }
      // 초성만 있는 경우
      else {
        console.log('initial only:', state.currentChar.initial)
        return state.currentChar.initial
      }
    }
    console.log('returning empty string')
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