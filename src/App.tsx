import React, { useState, useRef, useCallback } from 'react'
import { logUserAction, logKeyboardState, logSpeechOutput } from './utils/logger'
import CheongjiinKeyboard from './components/CheongjiinKeyboard'
import PredicateList from './components/PredicateList'
import TextDisplay from './components/TextDisplay'
import KeyboardToggleButton from './components/KeyboardToggleButton'
import { NotificationPopup } from './components/NotificationPopup'
import TTSServiceFactory from './services/ttsService'
import { useCommandSystem } from './hooks/useCommandSystem'

const App: React.FC = () => {
  const [inputText, setInputText] = useState('')
  const [selectedPredicate, setSelectedPredicate] = useState('')
  const [shouldGeneratePredicates, setShouldGeneratePredicates] = useState(false)
  const [shouldClearOnNextInput, setShouldClearOnNextInput] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(true)
  const [keyboardReturnedViaButton, setKeyboardReturnedViaButton] = useState(false)
  const [forcePredicatesClear, setForcePredicatesClear] = useState(false)
  const [compositionState, setCompositionState] = useState({ isComposing: false, currentChar: { initial: '', medial: '', final: '' }, currentDisplayChar: '' })
  const keyboardRef = useRef<{ 
    clearAll: () => void; 
    commitCurrentChar: () => void; 
    setText: (text: string) => void;
    getCompositionState: () => { isComposing: boolean; currentChar: { initial: string; medial: string; final: string } };
  }>(null)
  
  // AIDEV-NOTE: 명령어 시스템 통합
  const { 
    settings, 
    notification, 
    setNotification,
    helpVisible, 
    setHelpVisible, 
    executeCommand 
  } = useCommandSystem()

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

  const handlePredicateSelect = async (predicate: string) => {
    logUserAction('서술어 선택', { predicate, inputText })
    
    // AIDEV-NOTE: 서술어 선택 후에도 목록이 유지되도록 inputText를 지우지 않음
    // 입력 텍스트를 삭제하고 선택한 문장으로 완전히 대체
    // setInputText('') // 이 줄을 주석 처리하여 서술어 목록 유지
    setSelectedPredicate(predicate)
    
    // 키보드 상태도 초기화
    keyboardRef.current?.clearAll()
    
    // AIDEV-NOTE: 서술어 선택 시 자동으로 TTS 재생
    try {
      const ttsService = TTSServiceFactory.createTTSService()
      await ttsService.playAudio(predicate)
      
      logSpeechOutput('서술어 선택 시 자동 음성 출력', { sentence: predicate })
    } catch (error) {
      logSpeechOutput('TTS 실패, Web Speech API 폴백 시도', { sentence: predicate, error })
      
      // 폴백: 기본 Web Speech API 사용
      try {
        const utterance = new SpeechSynthesisUtterance(predicate)
        utterance.lang = 'ko-KR'
        speechSynthesis.speak(utterance)
        logSpeechOutput('Web Speech API 폴백 성공', { sentence: predicate })
      } catch (fallbackError) {
        logSpeechOutput('모든 TTS 방법 실패', { sentence: predicate, error: fallbackError })
      }
    }
  }


  const handleClearAll = () => {
    logUserAction('전체 삭제', { inputText, selectedPredicate })
    setInputText('')
    setSelectedPredicate('')
    setShouldGeneratePredicates(false)
    setShouldClearOnNextInput(false)
    // AIDEV-NOTE: 키보드 보이기 버튼 클릭 시 서술어 목록 강제 지우기
    setForcePredicatesClear(true)
    keyboardRef.current?.clearAll()
  }

  const handleCompleteInput = async () => {
    // 먼저 조합 중인 글자가 있으면 완성
    commitComposingChar()
    
    // 조합 완성 후 상태 업데이트를 위한 지연 처리
    setTimeout(async () => {
      logUserAction('생각하기 버튼 클릭', { inputText })
      
      // AIDEV-NOTE: 명령어 처리 시도
      const isCommand = await executeCommand(inputText)
      
      if (isCommand) {
        // 명령어 처리됨 - 키보드 숨김 및 텍스트 초기화
        setKeyboardVisible(false)
        keyboardRef.current?.clearAll()
        setInputText('')
        setSelectedPredicate('')
      } else {
        // 일반 입력 - AI 서술어 생성
        logKeyboardState('키보드 숨김')
        setHelpVisible(false) // 도움말 숨김
        setShouldGeneratePredicates(true)
        setShouldClearOnNextInput(true)
        setKeyboardVisible(false)
      }
    }, 50) // 50ms로 늘려서 텍스트 업데이트 완료 후 처리
  }

  const handleSpeak = async () => {
    const textToSpeak = selectedPredicate || inputText
    if (!textToSpeak.trim()) return

    logUserAction('소리내기 버튼 클릭', { textToSpeak })
    
    try {
      const ttsService = TTSServiceFactory.createTTSService()
      await ttsService.playAudio(textToSpeak)
      
      logSpeechOutput('소리내기 버튼 TTS 성공', { sentence: textToSpeak })
    } catch (error) {
      logSpeechOutput('TTS 실패, Web Speech API 폴백 시도', { sentence: textToSpeak, error })
      
      // 폴백: 기본 Web Speech API 사용
      try {
        const utterance = new SpeechSynthesisUtterance(textToSpeak)
        utterance.lang = 'ko-KR'
        speechSynthesis.speak(utterance)
        logSpeechOutput('Web Speech API 폴백 성공', { sentence: textToSpeak })
      } catch (fallbackError) {
        logSpeechOutput('모든 TTS 방법 실패', { sentence: textToSpeak, error: fallbackError })
      }
    }
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
        onSpeak={handleSpeak}
        isComposing={compositionState.isComposing}
        keyboardVisible={keyboardVisible}
        currentDisplayChar={compositionState.currentDisplayChar}
      />
      
      <PredicateList 
        inputText={inputText}
        onPredicateSelect={handlePredicateSelect}
        shouldGenerate={shouldGeneratePredicates && !helpVisible}
        forcePredicatesClear={forcePredicatesClear}
        onPredicatesCleared={() => setForcePredicatesClear(false)}
        showHelp={helpVisible}
        currentSettings={settings}
      />
      
      <div style={{
        padding: '20px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e0e0e0',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <KeyboardToggleButton 
          onClick={() => {
            // 먼저 조합 중인 글자가 있으면 완성
            commitComposingChar()
            
            // 전체삭제 동작 수행
            handleClearAll()
            
            // AIDEV-NOTE: 키보드 표시 시 도움말 숨김
            setHelpVisible(false)
            
            logUserAction('#️⃣버튼 클릭', { inputText })
            logKeyboardState('키보드 복원 및 전체삭제')
            setKeyboardVisible(true)
            setKeyboardReturnedViaButton(true)
          }}
          disabled={keyboardVisible}
        />
      </div>
      
      {/* AIDEV-NOTE: 명령어 시스템 알림 팝업 */}
      <NotificationPopup 
        message={notification} 
        onClose={() => setNotification(null)}
      />

      {keyboardVisible && (
        <CheongjiinKeyboard 
          ref={keyboardRef} 
          onTextChange={handleTextChange} 
          onKeyPress={handleKeyPress}
          onCompositionStateChange={handleCompositionStateChange}
          autoCompleteConfig={settings.autoComplete}
        />
      )}
    </div>
  )
}

export default App