import { useEffect, forwardRef, useImperativeHandle, useState, useRef } from 'react'
import { useCheongjiinInput } from '../hooks/useCheongjiinInput'

interface CheongjiinKeyboardProps {
  onTextChange: (text: string) => void
  onKeyPress?: () => void
  onCompositionStateChange?: (state: { isComposing: boolean; currentChar: { initial: string; medial: string; final: string }; currentDisplayChar: string }) => void
  autoCompleteConfig?: {
    enabled: boolean
    duration: number
  }
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

const CheongjiinKeyboard = forwardRef<CheongjiinKeyboardRef, CheongjiinKeyboardProps>(({ onTextChange, onKeyPress, onCompositionStateChange, autoCompleteConfig }, ref) => {
  const { text, handleKeyPress, clearAll, commitCurrentChar, setText, isComposing, currentChar, getCurrentDisplay } = useCheongjiinInput({ autoCompleteConfig })
  
  // AIDEV-NOTE: 롱프레스 상태 관리
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [isLongPress, setIsLongPress] = useState(false)
  const pressedKeyRef = useRef<string | null>(null)

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

  // AIDEV-NOTE: 한글-숫자 매핑 테이블
  const keyNumberMap: Record<string, string> = {
    'ㅣ': '1', 'ㆍ': '2', 'ㅡ': '3',
    'ㄱㅋ': '4', 'ㄴㄹ': '5', 'ㄷㅌ': '6',
    'ㅂㅍ': '7', 'ㅅㅎ': '8', 'ㅈㅊ': '9',
    'ㅇㅁ': '0'
  }

  // AIDEV-NOTE: 천지인 키보드 레이아웃 - 숫자와 통합
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
      justifyContent: 'center',
      position: 'relative' as const
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

  // AIDEV-NOTE: 롱프레스 시작 핸들러
  const handlePressStart = (key: string) => {
    pressedKeyRef.current = key
    setIsLongPress(false)
    
    // 숫자 매핑이 있는 키만 롱프레스 타이머 시작
    if (keyNumberMap[key]) {
      const timer = setTimeout(() => {
        setIsLongPress(true)
        // 조합 중이면 먼저 완성
        if (isComposing) {
          commitCurrentChar()
          // 조합 완성 후 숫자 입력
          setTimeout(() => {
            handleKeyPress(keyNumberMap[key])
          }, 0)
        } else {
          handleKeyPress(keyNumberMap[key])
        }
        setPressTimer(null)
      }, 1000)
      setPressTimer(timer)
    }
  }

  // AIDEV-NOTE: 롱프레스 종료 핸들러
  const handlePressEnd = (key: string) => {
    if (pressTimer) {
      clearTimeout(pressTimer)
      setPressTimer(null)
    }
    
    // 롱프레스가 아니었다면 일반 한글 입력
    if (!isLongPress && pressedKeyRef.current === key) {
      handleKeyClick(key)
    }
    
    setIsLongPress(false)
    pressedKeyRef.current = null
  }

  // AIDEV-NOTE: 롱프레스 취소 핸들러
  const handlePressCancel = () => {
    if (pressTimer) {
      clearTimeout(pressTimer)
      setPressTimer(null)
    }
    setIsLongPress(false)
    pressedKeyRef.current = null
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
      {/* AIDEV-NOTE: 통합 천지인-숫자 키보드 */}
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
                style={getKeyStyle(key)}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundColor = '#e0e0e0'
                  e.currentTarget.style.transform = 'scale(0.95)'
                  handlePressStart(key)
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundColor = getKeyStyle(key).backgroundColor
                  e.currentTarget.style.transform = 'scale(1)'
                  handlePressEnd(key)
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = getKeyStyle(key).backgroundColor
                  e.currentTarget.style.transform = 'scale(1)'
                  handlePressCancel()
                }}
                onTouchStart={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handlePressStart(key)
                }}
                onTouchEnd={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handlePressEnd(key)
                }}
                onTouchCancel={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handlePressCancel()
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                {getKeyDisplay(key)}
                {/* AIDEV-NOTE: 숫자 표시 (해당하는 키만) */}
                {keyNumberMap[key] && (
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    right: '6px',
                    fontSize: '60%',
                    color: '#666',
                    fontWeight: 'normal'
                  }}>
                    {keyNumberMap[key]}
                  </span>
                )}
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