import React from 'react'

interface SpeechButtonProps {
  text: string
  onSpeak: () => void
}

const SpeechButton: React.FC<SpeechButtonProps> = ({ text, onSpeak }) => {
  return (
    <button
      onClick={onSpeak}
      disabled={!text.trim()}
      style={{
        width: '100%',
        height: '60px',
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#fff',
        backgroundColor: text.trim() ? '#FF6B6B' : '#ccc',
        border: 'none',
        borderRadius: '12px',
        cursor: text.trim() ? 'pointer' : 'not-allowed',
        transition: 'all 0.3s',
        boxShadow: text.trim() ? '0 4px 8px rgba(0,0,0,0.1)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}
      onMouseOver={(e) => {
        if (text.trim()) {
          e.currentTarget.style.backgroundColor = '#ff5252'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseOut={(e) => {
        if (text.trim()) {
          e.currentTarget.style.backgroundColor = '#FF6B6B'
          e.currentTarget.style.transform = 'translateY(0)'
        }
      }}
    >
      <span style={{ fontSize: '24px' }}>🔊</span>
      말하기
    </button>
  )
}

export default SpeechButton