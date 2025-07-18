import React from 'react'
import CompleteInputButton from './CompleteInputButton'
import { assembleHangul } from '../utils/hangulUtils'

interface TextDisplayProps {
  inputText: string
  selectedPredicate: string
  onCompleteInput?: () => void
  isComposing?: boolean
  currentChar?: {
    initial: string
    medial: string
    final: string
  }
}

const TextDisplay: React.FC<TextDisplayProps> = ({ 
  inputText, 
  selectedPredicate, 
  onCompleteInput, 
  isComposing = false,
  currentChar = { initial: '', medial: '', final: '' }
}) => {
  
  const renderTextWithCursor = () => {
    // 입력된 텍스트와 조합 중인 글자를 분리
    let displayText = inputText
    let currentComposingChar = ''
    
    // 조합 중인 글자가 있는지 확인
    if (isComposing && (currentChar.initial || currentChar.medial || currentChar.final)) {
      // 현재 조합 중인 글자가 inputText에 포함되어 있다면 분리
      if (currentChar.initial && currentChar.medial) {
        // getCurrentDisplay와 동일한 로직으로 조합 중인 글자 생성
        currentComposingChar = assembleHangul(currentChar.initial, currentChar.medial, currentChar.final)
        
        // inputText에서 마지막 글자가 조합 중인 글자와 같다면 분리
        if (displayText.endsWith(currentComposingChar)) {
          displayText = displayText.slice(0, -currentComposingChar.length)
        }
      } else if (currentChar.initial) {
        currentComposingChar = currentChar.initial
        if (displayText.endsWith(currentComposingChar)) {
          displayText = displayText.slice(0, -currentComposingChar.length)
        }
      }
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
          // 입력 대기 또는 조합 완성: vertical bar 커서
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
        <span style={{ color: '#4CAF50' }}>{selectedPredicate}</span>
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