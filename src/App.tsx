import React, { useState, useRef } from 'react'
import CheongjiinKeyboard from './components/CheongjiinKeyboard'
import PredicateList from './components/PredicateList'
import TextDisplay from './components/TextDisplay'
import SpeechButton from './components/SpeechButton'
import ClearButton from './components/ClearButton'

const App: React.FC = () => {
  const [inputText, setInputText] = useState('')
  const [selectedPredicate, setSelectedPredicate] = useState('')
  const [shouldGeneratePredicates, setShouldGeneratePredicates] = useState(false)
  const [shouldClearOnNextInput, setShouldClearOnNextInput] = useState(false)
  const keyboardRef = useRef<{ clearAll: () => void; commitCurrentChar: () => void }>(null)

  const handleTextChange = (text: string) => {
    setInputText(text)
    // 텍스트가 변경되면 서술어 생성 비활성화
    setShouldGeneratePredicates(false)
  }

  const handleKeyPress = () => {
    // 말하기/소리내기 버튼 후 첫 입력 시 초기화
    if (shouldClearOnNextInput) {
      setInputText('')
      setSelectedPredicate('')
      setShouldGeneratePredicates(false)
      setShouldClearOnNextInput(false)
      keyboardRef.current?.clearAll()
    }
  }

  const handlePredicateSelect = (predicate: string) => {
    setSelectedPredicate(predicate)
  }

  const handleSpeak = () => {
    const fullSentence = inputText + selectedPredicate
    if (fullSentence.trim()) {
      const utterance = new SpeechSynthesisUtterance(fullSentence)
      utterance.lang = 'ko-KR'
      speechSynthesis.speak(utterance)
    }
    // 소리내기 버튼 클릭 후 다음 입력 시 초기화 설정
    setShouldClearOnNextInput(true)
  }

  const handleClearAll = () => {
    setInputText('')
    setSelectedPredicate('')
    setShouldGeneratePredicates(false)
    setShouldClearOnNextInput(false)
    keyboardRef.current?.clearAll()
  }

  const handleCompleteInput = () => {
    // 현재 입력 중인 문자를 완성시킴
    keyboardRef.current?.commitCurrentChar()
    // 입력 완성 후 AI 서술어 생성 시작
    setShouldGeneratePredicates(true)
    // 말하기 버튼 클릭 후 다음 입력 시 초기화 설정
    setShouldClearOnNextInput(true)
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f0f8ff'
    }}>
      <TextDisplay 
        inputText={inputText} 
        selectedPredicate={selectedPredicate}
        onCompleteInput={handleCompleteInput}
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
            text={inputText + selectedPredicate}
            onSpeak={handleSpeak}
          />
        </div>
        <div style={{ flex: 1 }}>
          <ClearButton 
            onClear={handleClearAll}
            disabled={!inputText.trim() && !selectedPredicate.trim()}
          />
        </div>
      </div>
      
      <CheongjiinKeyboard 
        ref={keyboardRef} 
        onTextChange={handleTextChange} 
        onKeyPress={handleKeyPress}
      />
    </div>
  )
}

export default App