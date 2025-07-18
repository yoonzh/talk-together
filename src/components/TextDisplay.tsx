import React from 'react'
import CompleteInputButton from './CompleteInputButton'

interface TextDisplayProps {
  inputText: string
  selectedPredicate: string
  onCompleteInput?: () => void
  isComposing?: boolean
  keyboardVisible?: boolean
  currentDisplayChar?: string
}

const TextDisplay: React.FC<TextDisplayProps> = ({ 
  inputText, 
  selectedPredicate, 
  onCompleteInput, 
  isComposing = false,
  keyboardVisible = true,
  currentDisplayChar = ''
}) => {
  
  const renderTextWithCursor = () => {
    // 서술어가 선택된 경우 커서 없이 간단히 표시
    if (selectedPredicate) {
      // 서술어에서 중복된 입력 텍스트 제거
      let displayPredicate = selectedPredicate
      if (inputText && selectedPredicate.startsWith(inputText)) {
        displayPredicate = selectedPredicate.substring(inputText.length)
      }
      
      return (
        <>
          <span style={{ color: '#2196F3' }}>{inputText}</span>
          <span style={{ color: '#4CAF50' }}>{displayPredicate}</span>
        </>
      )
    }
    
    // 키보드가 숨겨진 경우 커서 없이 표시
    if (!keyboardVisible) {
      return (
        <span style={{ color: '#2196F3' }}>{inputText}</span>
      )
    }
    
    // 입력된 텍스트와 조합 중인 글자를 분리
    let displayText = inputText
    let currentComposingChar = ''
    
    // 조합 중인 글자가 있는지 확인
    if (isComposing && currentDisplayChar) {
      currentComposingChar = currentDisplayChar
      console.log('=== TextDisplay DEBUG ===')
      console.log('inputText:', JSON.stringify(inputText))
      console.log('currentDisplayChar:', JSON.stringify(currentDisplayChar))
      console.log('displayText before:', JSON.stringify(displayText))
      console.log('endsWith check:', displayText.endsWith(currentComposingChar))
      
      // inputText에서 마지막에 있는 currentDisplayChar를 제거 (중복 방지)
      if (displayText.endsWith(currentComposingChar)) {
        displayText = displayText.slice(0, -currentComposingChar.length)
      }
      
      console.log('displayText after:', JSON.stringify(displayText))
      console.log('currentComposingChar:', JSON.stringify(currentComposingChar))
    }
    
    return (
      <>
        <span style={{ color: '#2196F3' }}>{displayText}</span>
        {isComposing && currentComposingChar ? (
          // 조합 중: 글자를 블록으로 감싸고 반전
          <span style={{
            color: '#ffffff',
            backgroundColor: '#2196F3',
            padding: '2px 4px',
            borderRadius: '4px',
            position: 'relative',
            animation: 'composingBlink 1s infinite'
          }}>
            {currentComposingChar}
          </span>
        ) : (
          // 입력 대기 또는 조합 완성: vertical bar 커서 (키보드 보일 때만)
          <span style={{
            color: '#2196F3',
            fontSize: '0.9em',
            fontWeight: 'normal',
            animation: 'cursorBlink 1s infinite',
            marginLeft: '2px'
          }}>
            |
          </span>
        )}
      </>
    )
  }

  return (
    <>
      <style>
        {`
          @keyframes cursorBlink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          
          @keyframes composingBlink {
            0%, 70% { opacity: 1; }
            71%, 100% { opacity: 0.7; }
          }
        `}
      </style>
      <div style={{
        padding: '20px',
        backgroundColor: '#ffffff',
        borderBottom: '2px solid #e0e0e0',
        minHeight: '100px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px'
      }}>
        <div style={{
          fontSize: '36px',
          fontWeight: 'bold',
          color: '#333',
          textAlign: 'center',
          lineHeight: '1.4',
          flex: 1
        }}>
          {renderTextWithCursor()}
        </div>
        {onCompleteInput && (
          <CompleteInputButton 
            onComplete={onCompleteInput}
            disabled={!inputText.trim()}
          />
        )}
      </div>
    </>
  )
}

export default TextDisplay