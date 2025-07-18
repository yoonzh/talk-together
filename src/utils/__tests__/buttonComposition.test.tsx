import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../../App'

// Mock Web Speech API
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => [])
}

const mockSpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  lang: '',
  voice: null,
  volume: 1,
  rate: 1,
  pitch: 1
}))

// Mock 설정
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: mockSpeechSynthesis
})
Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  writable: true,
  value: mockSpeechSynthesisUtterance
})

describe('버튼 클릭 시 조합 완성 테스트', () => {
  it('조합 중 상태에서 소리내기 버튼 클릭 시 조합 완성 후 음성 출력', () => {
    console.log('=== 조합 중 소리내기 버튼 테스트 ===')
    
    vi.clearAllMocks()
    render(<App />)
    
    // 1. "밥" 입력 (조합 중 상태)
    const bButton = screen.getByText('ㅂㅍ')
    const iButton = screen.getByText('ㅣ')
    const dotButton = screen.getByText('ㆍ')
    
    fireEvent.click(bButton) // ㅂ
    fireEvent.click(iButton) // ㅣ
    fireEvent.click(dotButton) // ㆍ -> ㅏ -> 바
    fireEvent.click(bButton) // ㅂ (종성) -> 밥
    
    // 2. 소리내기 버튼 클릭
    const voiceButton = screen.getByText('🔊')
    fireEvent.click(voiceButton)
    
    // 3. Web Speech API가 호출되어야 함
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
    expect(mockSpeechSynthesisUtterance).toHaveBeenCalledWith('밥')
    
    console.log('조합 중 소리내기 버튼 테스트 완료')
  })

  it('조합이 완성된 후 버튼들이 정상 동작', () => {
    console.log('=== 조합 완성 후 버튼 정상 동작 테스트 ===')
    
    vi.clearAllMocks()
    render(<App />)
    
    // 1. "물" 입력 후 space키로 조합 완성
    const mButton = screen.getByText('ㅇㅁ')
    const euButton = screen.getByText('ㅡ')
    const dotButton = screen.getByText('ㆍ')
    const lButton = screen.getByText('ㄴㄹ')
    const spaceButton = screen.getByText('⎵')
    
    fireEvent.click(mButton) // ㅁ (두 번째 자음)
    fireEvent.click(mButton)
    fireEvent.click(euButton) // ㅡ
    fireEvent.click(dotButton) // ㆍ -> ㅜ -> 무
    fireEvent.click(lButton) // ㄹ (두 번째 자음)  
    fireEvent.click(lButton) // 물
    fireEvent.click(spaceButton) // 조합 완성
    
    // 2. 소리내기 버튼이 정상 동작해야 함
    const voiceButton = screen.getByText('🔊')
    fireEvent.click(voiceButton)
    
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
    expect(mockSpeechSynthesisUtterance).toHaveBeenCalledWith('물')
    
    console.log('조합 완성 후 버튼 정상 동작 테스트 완료')
  })
})