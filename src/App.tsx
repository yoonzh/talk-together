import React, { useState, useRef } from 'react'
import CheongjiinKeyboard from './components/CheongjiinKeyboard'
import PredicateList from './components/PredicateList'
import TextDisplay from './components/TextDisplay'
import SpeechButton from './components/SpeechButton'
import ClearButton from './components/ClearButton'

const App: React.FC = () => {
  const [inputText, setInputText] = useState('')
  const [selectedPredicate, setSelectedPredicate] = useState('')
  const keyboardRef = useRef<{ clearAll: () => void }>(null)

  const handleTextChange = (text: string) => {
    setInputText(text)
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
  }

  const handleClearAll = () => {
    setInputText('')
    setSelectedPredicate('')
    keyboardRef.current?.clearAll()
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
      />
      
      <PredicateList 
        inputText={inputText}
        onPredicateSelect={handlePredicateSelect}
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
      
      <CheongjiinKeyboard ref={keyboardRef} onTextChange={handleTextChange} />
    </div>
  )
}

export default App