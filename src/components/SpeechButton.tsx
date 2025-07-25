import React from 'react'

interface SpeechButtonProps {
  onSpeak: () => void
  disabled?: boolean
}

const SpeechButton: React.FC<SpeechButtonProps> = ({ onSpeak, disabled = false }) => {
  return (
    <button
      onClick={onSpeak}
      disabled={disabled}
      style={{
        width: '53px',
        height: '53px',
        fontSize: '24px',
        fontWeight: 'bold',
        color: disabled ? '#ccc' : '#fff',
        backgroundColor: disabled ? '#f0f0f0' : '#f44336',
        border: 'none',
        borderRadius: '50%',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s',
        boxShadow: disabled ? 'none' : '0 4px 8px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
      onMouseOver={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#d32f2f'
          e.currentTarget.style.transform = 'scale(1.05)'
        }
      }}
      onMouseOut={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#f44336'
          e.currentTarget.style.transform = 'scale(1)'
        }
      }}
    >
      🔊
    </button>
  )
}

export default SpeechButton