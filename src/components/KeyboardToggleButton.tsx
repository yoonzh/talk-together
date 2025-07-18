import React from 'react'

interface KeyboardToggleButtonProps {
  onClick: () => void
  disabled?: boolean
}

const KeyboardToggleButton: React.FC<KeyboardToggleButtonProps> = ({ onClick, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        height: '60px',
        fontSize: '24px',
        fontWeight: 'bold',
        color: disabled ? '#ccc' : '#fff',
        backgroundColor: disabled ? '#f0f0f0' : '#4CAF50',
        border: 'none',
        borderRadius: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s',
        boxShadow: disabled ? 'none' : '0 4px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.3 : 1
      }}
      onMouseOver={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#45a049'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseOut={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#4CAF50'
          e.currentTarget.style.transform = 'translateY(0)'
        }
      }}
    >
#️⃣
    </button>
  )
}

export default KeyboardToggleButton