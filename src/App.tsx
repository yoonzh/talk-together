import React, { useState, useRef, useCallback } from 'react'
import { logUserAction, logKeyboardState, logSpeechOutput } from './utils/logger'
import CheongjiinKeyboard from './components/CheongjiinKeyboard'
import PredicateList from './components/PredicateList'
import TextDisplay from './components/TextDisplay'
import SpeechButton from './components/SpeechButton'
import KeyboardToggleButton from './components/KeyboardToggleButton'
import TTSServiceFactory from './services/ttsService'

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
    
    // AIDEV-NOTE: 서술어 선택 후에도 목록이 유지되도록 inputText를 지우지 않음
    // 입력 텍스트를 삭제하고 선택한 문장으로 완전히 대체
    // setInputText('') // 이 줄을 주석 처리하여 서술어 목록 유지
    setSelectedPredicate(predicate)
    
    // 키보드 상태도 초기화
    keyboardRef.current?.clearAll()
  }

  const handleSpeak = async () => {
    // 먼저 조합 중인 글자가 있으면 완성
    commitComposingChar()
    
    // 조합 완성 후 최종 텍스트로 음성 출력 (textChange 이벤트 후 업데이트된 inputText 사용)
    setTimeout(async () => {
      // 서술어가 선택되었으면 서술어를 사용, 아니면 입력 텍스트 사용
      const fullSentence = selectedPredicate || inputText
      
      if (fullSentence.trim()) {
        try {
          // TTS 서비스 팩토리를 사용하여 적절한 TTS 서비스 선택
          const ttsService = TTSServiceFactory.createTTSService()
          await ttsService.playAudio(fullSentence)
          
          logSpeechOutput('음성 출력 완료', { sentence: fullSentence })
        } catch (error) {
          logSpeechOutput('음성 출력 실패, Web Speech API 폴백 시도', { sentence: fullSentence, error })
          
          // 폴백: 기본 Web Speech API 사용
          try {
            const utterance = new SpeechSynthesisUtterance(fullSentence)
            utterance.lang = 'ko-KR'
            speechSynthesis.speak(utterance)
            logSpeechOutput('Web Speech API 폴백 성공', { sentence: fullSentence })
          } catch (fallbackError) {
            logSpeechOutput('모든 TTS 방법 실패', { sentence: fullSentence, error: fallbackError })
          }
        }
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
            text={selectedPredicate || inputText}
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