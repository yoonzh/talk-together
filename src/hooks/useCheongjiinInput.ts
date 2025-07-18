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
}

export const useCheongjiinInput = () => {
  const [state, setState] = useState<InputState>({
    text: '',
    currentChar: { initial: '', medial: '', final: '' },
    vowelSequence: [],
    consonantClickCounts: {},
    isComposing: false
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
          isComposing: false
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
        
        const newVowelSequence = [...prev.vowelSequence, key]
        const newMedial = combineVowel(newVowelSequence)
        
        if (newMedial) {
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
    if (state.isComposing && state.currentChar.initial) {
      if (state.currentChar.medial) {
        return assembleHangul(state.currentChar.initial, state.currentChar.medial, state.currentChar.final)
      } else {
        return state.currentChar.initial
      }
    }
    return ''
  }, [state.currentChar, state.isComposing])

  const getFullText = useCallback(() => {
    return state.text + getCurrentDisplay()
  }, [state.text, getCurrentDisplay])

  const clearAll = useCallback(() => {
    setState({
      text: '',
      currentChar: { initial: '', medial: '', final: '' },
      vowelSequence: [],
      consonantClickCounts: {},
      isComposing: false
    })
  }, [])

  const setText = useCallback((newText: string) => {
    setState({
      text: newText,
      currentChar: { initial: '', medial: '', final: '' },
      vowelSequence: [],
      consonantClickCounts: {},
      isComposing: false
    })
  }, [])

  return {
    text: getFullText(),
    handleKeyPress,
    commitCurrentChar,
    clearAll,
    setText
  }
}