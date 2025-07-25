import React from 'react'

interface ThinkButtonProps {
  onThink: () => void
  disabled?: boolean
}

const ThinkButton: React.FC<ThinkButtonProps> = ({ onThink, disabled = false }) => {
  return (
    <button
      onClick={onThink}
      disabled={disabled}
      style={{
        width: '53px',
        height: '53px',
        fontSize: '24px',
        fontWeight: 'bold',
        color: disabled ? '#ccc' : '#fff',
        backgroundColor: disabled ? '#f0f0f0' : '#4CAF50',
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
          e.currentTarget.style.backgroundColor = '#45a049'
          e.currentTarget.style.transform = 'scale(1.05)'
        }
      }}
      onMouseOut={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#4CAF50'
          e.currentTarget.style.transform = 'scale(1)'
        }
      }}
    >
      🤔
    </button>
  )
}

export default ThinkButton