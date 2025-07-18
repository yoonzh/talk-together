import React, { useState, useRef, useCallback } from 'react'
import { logUserAction, logKeyboardState, logSpeechOutput } from './utils/logger'
import CheongjiinKeyboard from './components/CheongjiinKeyboard'
import PredicateList from './components/PredicateList'
import TextDisplay from './components/TextDisplay'
import SpeechButton from './components/SpeechButton'
import KeyboardToggleButton from './components/KeyboardToggleButton'

const App: React.FC = () => {
  const [inputText, setInputText] = useState('')
  const [selectedPredicate, setSelectedPredicate] = useState('')
  const [shouldGeneratePredicates, setShouldGeneratePredicates] = useState(false)
  const [shouldClearOnNextInput, setShouldClearOnNextInput] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(true)
  const [keyboardReturnedViaButton, setKeyboardReturnedViaButton] = useState(false)
  const [compositionState, setCompositionState] = useState({ isComposing: false, currentChar: { initial: '', medial: '', final: '' }, currentDisplayChar: '' })
  const keyboardRef = useRef<{ 
    clearAll: () => void; 
    commitCurrentChar: () => void; 
    setText: (text: string) => void;
    getCompositionState: () => { isComposing: boolean; currentChar: { initial: string; medial: string; final: string } };
  }>(null)

  const handleTextChange = useCallback((text: string) => {
    setInputText(text)
    // 텍스트가 변경되면 서술어 생성 비활성화
    setShouldGeneratePredicates(false)
  }, [])

  const handleCompositionStateChange = useCallback((state: { isComposing: boolean; currentChar: { initial: string; medial: string; final: string }; currentDisplayChar: string }) => {
    setCompositionState(state)
  }, [])

  const handleKeyPress = () => {
    // ㄱ버튼을 통한 복귀인 경우 초기화하지 않음
    if (keyboardReturnedViaButton) {
      setKeyboardReturnedViaButton(false)
      setShouldClearOnNextInput(false)
      return
    }
    
    // 말하기/소리내기 버튼 후 첫 입력 시 초기화
    if (shouldClearOnNextInput) {
      setInputText('')
      setSelectedPredicate('')
      setShouldGeneratePredicates(false)
      setShouldClearOnNextInput(false)
      keyboardRef.current?.clearAll()
    }
  }

  // 조합 중인 글자가 있으면 완성하는 헬퍼 함수
  const commitComposingChar = () => {
    if (compositionState.isComposing && keyboardRef.current) {
      keyboardRef.current.commitCurrentChar()
    }
  }

  const handlePredicateSelect = (predicate: string) => {
    logUserAction('서술어 선택', { predicate, inputText })
    setSelectedPredicate(predicate)
  }

  const handleSpeak = () => {
    // 먼저 조합 중인 글자가 있으면 완성
    commitComposingChar()
    
    // 조합 완성 후 최종 텍스트로 음성 출력 (textChange 이벤트 후 업데이트된 inputText 사용)
    setTimeout(() => {
      // 서술어에서 중복된 입력 텍스트 제거
      let displayPredicate = selectedPredicate
      if (inputText && selectedPredicate.startsWith(inputText)) {
        displayPredicate = selectedPredicate.substring(inputText.length)
      }
      
      const fullSentence = inputText + displayPredicate
      if (fullSentence.trim()) {
        logSpeechOutput('음성 출력 시작', { sentence: fullSentence })
        const utterance = new SpeechSynthesisUtterance(fullSentence)
        utterance.lang = 'ko-KR'
        speechSynthesis.speak(utterance)
      } else {
        logSpeechOutput('빈 텍스트로 인한 음성 출력 취소')
      }
      // 소리내기 버튼 클릭 후 다음 입력 시 초기화 설정
      setShouldClearOnNextInput(true)
    }, 0)
  }

  const handleClearAll = () => {
    logUserAction('전체 삭제', { inputText, selectedPredicate })
    setInputText('')
    setSelectedPredicate('')
    setShouldGeneratePredicates(false)
    setShouldClearOnNextInput(false)
    keyboardRef.current?.clearAll()
  }

  const handleCompleteInput = () => {
    // 먼저 조합 중인 글자가 있으면 완성
    commitComposingChar()
    
    // 조합 완성 후 상태 업데이트를 위한 지연 처리
    setTimeout(() => {
      console.log('=== handleCompleteInput DEBUG ===')
      console.log('Current inputText:', inputText)
      console.log('Setting shouldGeneratePredicates to true')
      
      logUserAction('말하기 버튼 클릭', { inputText })
      logKeyboardState('키보드 숨김')
      // 입력 완성 후 AI 서술어 생성 시작
      setShouldGeneratePredicates(true)
      // 말하기 버튼 클릭 후 다음 입력 시 초기화 설정
      setShouldClearOnNextInput(true)
      // 키보드 숨기기
      setKeyboardVisible(false)
    }, 50) // 50ms로 늘려서 텍스트 업데이트 완료 후 처리
  }

  return (
    <div style={{ 
      height: '100vh',
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f0f8ff',
      overflow: 'hidden'
    }}>
      <TextDisplay 
        inputText={inputText} 
        selectedPredicate={selectedPredicate}
        onCompleteInput={handleCompleteInput}
        isComposing={compositionState.isComposing}
        keyboardVisible={keyboardVisible}
        currentDisplayChar={compositionState.currentDisplayChar}
      />
      
      <PredicateList 
        inputText={inputText}
        onPredicateSelect={handlePredicateSelect}
        shouldGenerate={shouldGeneratePredicates}
      />
      
      <div style={{
        padding: '20px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e0e0e0',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        gap: '12px'
      }}>
        <div style={{ flex: 2 }}>
          <SpeechButton 
            text={(() => {
              // 서술어에서 중복된 입력 텍스트 제거
              let displayPredicate = selectedPredicate
              if (inputText && selectedPredicate.startsWith(inputText)) {
                displayPredicate = selectedPredicate.substring(inputText.length)
              }
              return inputText + displayPredicate
            })()}
            onSpeak={handleSpeak}
          />
        </div>
        <div style={{ flex: 1 }}>
          <KeyboardToggleButton 
            onClick={() => {
              // 먼저 조합 중인 글자가 있으면 완성
              commitComposingChar()
              
              // 전체삭제 동작 수행
              handleClearAll()
              
              logUserAction('#️⃣버튼 클릭', { inputText })
              logKeyboardState('키보드 복원 및 전체삭제')
              setKeyboardVisible(true)
              setKeyboardReturnedViaButton(true)
            }}
            disabled={keyboardVisible}
          />
        </div>
      </div>
      
      {keyboardVisible && (
        <CheongjiinKeyboard 
          ref={keyboardRef} 
          onTextChange={handleTextChange} 
          onKeyPress={handleKeyPress}
          onCompositionStateChange={handleCompositionStateChange}
        />
      )}
    </div>
  )
}

export default App