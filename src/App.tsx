import React, { useState } from 'react'
import CheongjiinKeyboard from './components/CheongjiinKeyboard'
import PredicateList from './components/PredicateList'
import TextDisplay from './components/TextDisplay'
import SpeechButton from './components/SpeechButton'

const App: React.FC = () => {
  const [inputText, setInputText] = useState('')
  const [selectedPredicate, setSelectedPredicate] = useState('')

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
      
      <SpeechButton 
        text={inputText + selectedPredicate}
        onSpeak={handleSpeak}
      />
      
      <CheongjiinKeyboard onTextChange={handleTextChange} />
    </div>
  )
}

export default App