import React from 'react'

interface ClearButtonProps {
  onClear: () => void
  disabled?: boolean
}

const ClearButton: React.FC<ClearButtonProps> = ({ onClear, disabled = false }) => {
  return (
    <button
      onClick={onClear}
      disabled={disabled}
      style={{
        width: '100%',
        height: '60px',
        fontSize: '18px',
        fontWeight: 'bold',
        color: disabled ? '#ccc' : '#fff',
        backgroundColor: disabled ? '#f0f0f0' : '#ff4757',
        border: 'none',
        borderRadius: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s',
        boxShadow: disabled ? 'none' : '0 4px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}
      onMouseOver={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#ff3838'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseOut={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#ff4757'
          e.currentTarget.style.transform = 'translateY(0)'
        }
      }}
    >
      <span style={{ fontSize: '24px' }}>🧹</span>
    </button>
  )
}

export default ClearButton