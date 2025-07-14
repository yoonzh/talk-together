import React from 'react'

interface SpeechButtonProps {
  text: string
  onSpeak: () => void
}

const SpeechButton: React.FC<SpeechButtonProps> = ({ text, onSpeak }) => {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#ffffff',
      borderTop: '1px solid #e0e0e0',
      borderBottom: '1px solid #e0e0e0',
    }}>
      <button
        onClick={onSpeak}
        disabled={!text.trim()}
        style={{
          width: '100%',
          height: '60px',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#fff',
          backgroundColor: text.trim() ? '#FF6B6B' : '#ccc',
          border: 'none',
          borderRadius: '12px',
          cursor: text.trim() ? 'pointer' : 'not-allowed',
          transition: 'background-color 0.3s',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }}
      >
        🔊 말하기
      </button>
    </div>
  )
}

export default SpeechButton