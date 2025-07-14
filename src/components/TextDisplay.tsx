import React from 'react'
import CompleteInputButton from './CompleteInputButton'

interface TextDisplayProps {
  inputText: string
  selectedPredicate: string
  onCompleteInput?: () => void
}

const TextDisplay: React.FC<TextDisplayProps> = ({ inputText, selectedPredicate, onCompleteInput }) => {
  return (
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
        <span style={{ color: '#2196F3' }}>{inputText}</span>
        <span style={{ color: '#4CAF50' }}>{selectedPredicate}</span>
      </div>
      {onCompleteInput && (
        <CompleteInputButton 
          onComplete={onCompleteInput}
          disabled={!inputText.trim()}
        />
      )}
    </div>
  )
}

export default TextDisplay