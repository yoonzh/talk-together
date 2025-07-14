import React from 'react'

interface TextDisplayProps {
  inputText: string
  selectedPredicate: string
}

const TextDisplay: React.FC<TextDisplayProps> = ({ inputText, selectedPredicate }) => {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#ffffff',
      borderBottom: '2px solid #e0e0e0',
      minHeight: '100px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        fontSize: '36px',
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        lineHeight: '1.4'
      }}>
        <span style={{ color: '#2196F3' }}>{inputText}</span>
        <span style={{ color: '#4CAF50' }}>{selectedPredicate}</span>
      </div>
    </div>
  )
}

export default TextDisplay