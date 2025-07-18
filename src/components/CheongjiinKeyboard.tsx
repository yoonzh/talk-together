import { useEffect, forwardRef, useImperativeHandle } from 'react'
import { useCheongjiinInput } from '../hooks/useCheongjiinInput'

interface CheongjiinKeyboardProps {
  onTextChange: (text: string) => void
  onKeyPress?: () => void
  onCompositionStateChange?: (state: { isComposing: boolean; currentChar: { initial: string; medial: string; final: string }; currentDisplayChar: string }) => void
}

interface CheongjiinKeyboardRef {
  clearAll: () => void
  commitCurrentChar: () => void
  setText: (text: string) => void
  getCompositionState: () => { 
    isComposing: boolean; 
    currentChar: { initial: string; medial: string; final: string }
  }
}

const CheongjiinKeyboard = forwardRef<CheongjiinKeyboardRef, CheongjiinKeyboardProps>(({ onTextChange, onKeyPress, onCompositionStateChange }, ref) => {
  const { text, handleKeyPress, clearAll, commitCurrentChar, setText, isComposing, currentChar, getCurrentDisplay } = useCheongjiinInput()

  useEffect(() => {
    onTextChange(text)
  }, [text, onTextChange])

  useEffect(() => {
    onCompositionStateChange?.({ isComposing, currentChar, currentDisplayChar: getCurrentDisplay() })
  }, [isComposing, currentChar, onCompositionStateChange, getCurrentDisplay])

  useImperativeHandle(ref, () => ({
    clearAll,
    commitCurrentChar,
    setText,
    getCompositionState: () => ({ isComposing, currentChar })
  }), [clearAll, commitCurrentChar, setText, isComposing, currentChar])

  // AIDEV-NOTE: 키보드 레이아웃 - 아래줄이 공백|ㅇㅁ|백스페이스 순서로 구성됨
  const keyboardLayout = [
    ['ㅣ', 'ㆍ', 'ㅡ'],
    ['ㄱㅋ', 'ㄴㄹ', 'ㄷㅌ'],
    ['ㅂㅍ', 'ㅅㅎ', 'ㅈㅊ'],
    ['space', 'ㅇㅁ', 'backspace']
  ]

  const getKeyDisplay = (key: string) => {
    switch (key) {
      case 'backspace':
        return '⌫'
      case 'space':
        return '⎵'
      case 'newline':
        return '↵'
      default:
        return key
    }
  }

  const getKeyStyle = (key: string) => {
    const baseStyle = {
      height: '70px',
      fontSize: '24px',
      fontWeight: 'bold',
      border: '2px solid #ddd',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: '#ffffff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }

    if (key === 'backspace' || key === 'newline' || key === 'space') {
      return {
        ...baseStyle,
        backgroundColor: '#f0f0f0',
        color: '#666'
      }
    }

    if (key === 'ㆍ') {
      return {
        ...baseStyle,
        fontSize: '36px'
      }
    }

    return baseStyle
  }

  const handleKeyClick = (key: string) => {
    onKeyPress?.()
    handleKeyPress(key)
  }

  return (
    <div data-testid="cheongjiinKeyboard" style={{
      padding: '20px',
      backgroundColor: '#f5f5f5',
      borderTop: '2px solid #e0e0e0',
      flexShrink: 0, /* 키보드 크기 고정 */
      paddingBottom: 'calc(35px + var(--safe-area-inset-bottom))' /* 아이폰 하단 여백 증가 */
    }}>
      <div style={{
        display: 'grid',
        gridTemplateRows: 'repeat(4, 1fr)',
        gap: '10px',
        maxWidth: '400px',
        margin: '0 auto',
        height: '280px' /* 키보드 높이 고정 */
      }}>
        {keyboardLayout.map((row, rowIndex) => (
          <div
            key={rowIndex}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px'
            }}
          >
            {row.map((key, keyIndex) => (
              <button
                key={keyIndex}
                onClick={() => handleKeyClick(key)}
                style={getKeyStyle(key)}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundColor = '#e0e0e0'
                  e.currentTarget.style.transform = 'scale(0.95)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundColor = getKeyStyle(key).backgroundColor
                  e.currentTarget.style.transform = 'scale(1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = getKeyStyle(key).backgroundColor
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                {getKeyDisplay(key)}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
})

CheongjiinKeyboard.displayName = 'CheongjiinKeyboard'

export default CheongjiinKeyboard