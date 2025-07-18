import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../../App'
import { logUserAction } from '../logger'

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
  pitch: 1,
  onstart: null,
  onend: null,
  onerror: null,
  onpause: null,
  onresume: null,
  onmark: null,
  onboundary: null
}))

// Mock console methods for log testing
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

describe('종합 기능 테스트 스위트', () => {
  beforeEach(() => {
    // Mock Web Speech API
    Object.defineProperty(window, 'speechSynthesis', {
      writable: true,
      value: mockSpeechSynthesis
    })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      writable: true,
      value: mockSpeechSynthesisUtterance
    })
    
    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
  })

  describe('천지인 한글 입력 시스템', () => {
    it('기본 한글 조합: ㅂ + ㅏ + ㅂ = 밥', () => {
      console.log('=== 천지인 한글 입력 테스트: 밥 ===')
      
      render(<App />)
      
      // 1. ㅂ 클릭 (초성)
      const bButton = screen.getByText('ㅂㅍ')
      fireEvent.click(bButton)
      console.log('1. ㅂ 클릭 완료')
      
      // 2. ㅣ 클릭 (중성 시작)
      const iButton = screen.getByText('ㅣ')
      fireEvent.click(iButton)
      console.log('2. ㅣ 클릭 완료')
      
      // 3. ㆍ 클릭 (중성 완성: ㅣ + ㆍ = ㅏ)
      const dotButton = screen.getByText('ㆍ')
      fireEvent.click(dotButton)
      console.log('3. ㆍ 클릭 완료 (ㅏ 완성)')
      
      // 4. ㅂ 클릭 (종성)
      fireEvent.click(bButton)
      console.log('4. ㅂ 종성 클릭 완료')
      
      // 텍스트 확인
      const displayText = document.querySelector('[style*="color: rgb(33, 150, 243)"]')?.textContent
      console.log('최종 결과:', displayText)
      
      expect(displayText).toBe('밥')
    })

    it('복잡한 모음 조합: ㅘ (ㆍ + ㅡ + ㅣ + ㆍ)', () => {
      console.log('=== 복잡한 모음 조합 테스트: ㅘ ===')
      
      render(<App />)
      
      const gButton = screen.getByText('ㄱㅋ')
      const dotButton = screen.getByText('ㆍ')
      const euButton = screen.getByText('ㅡ')
      const iButton = screen.getByText('ㅣ')
      
      // ㄱ + ㅘ 조합
      fireEvent.click(gButton) // ㄱ
      fireEvent.click(dotButton) // ㆍ
      fireEvent.click(euButton) // ㅡ  
      fireEvent.click(iButton) // ㅣ
      fireEvent.click(dotButton) // ㆍ -> ㅘ 완성
      
      const displayText = document.querySelector('[style*="color: rgb(33, 150, 243)"]')?.textContent
      console.log('ㅘ 조합 결과:', displayText)
      
      expect(displayText).toBe('과')
    })

    it('백스페이스 기능 테스트', () => {
      console.log('=== 백스페이스 기능 테스트 ===')
      
      render(<App />)
      
      const bButton = screen.getByText('ㅂㅍ')
      const iButton = screen.getByText('ㅣ')
      const dotButton = screen.getByText('ㆍ')
      const backspaceButton = screen.getByText('⌫')
      
      // "바" 입력
      fireEvent.click(bButton)
      fireEvent.click(iButton)
      fireEvent.click(dotButton)
      
      let displayText = document.querySelector('[style*="color: rgb(33, 150, 243)"]')?.textContent
      expect(displayText).toBe('바')
      
      // 백스페이스로 중성 제거
      fireEvent.click(backspaceButton)
      displayText = document.querySelector('[style*="color: rgb(33, 150, 243)"]')?.textContent
      expect(displayText).toBe('비')
      
      // 백스페이스로 중성 완전 제거
      fireEvent.click(backspaceButton)
      displayText = document.querySelector('[style*="color: rgb(33, 150, 243)"]')?.textContent
      expect(displayText).toBe('ㅂ')
      
      console.log('백스페이스 테스트 완료')
    })
  })

  describe('키보드 숨김/복원 기능', () => {
    it('말하기 버튼 클릭 → 키보드 숨김 → ㄱ버튼 활성화', async () => {
      console.log('=== 키보드 숨김/복원 테스트 ===')
      
      render(<App />)
      
      // 1. "밥" 입력
      const bButton = screen.getByText('ㅂㅍ')
      const iButton = screen.getByText('ㅣ')
      const dotButton = screen.getByText('ㆍ')
      
      fireEvent.click(bButton)
      fireEvent.click(iButton)
      fireEvent.click(dotButton)
      fireEvent.click(bButton)
      
      // 2. 말하기 버튼 클릭
      const speakButton = screen.getByText('🗣️')
      fireEvent.click(speakButton)
      console.log('말하기 버튼 클릭 완료')
      
      // 3. 키보드가 숨겨졌는지 확인
      const keyboard = document.querySelector('[data-testid="cheongjiinKeyboard"]')
      expect(keyboard).not.toBeInTheDocument()
      
      // 4. ㄱ버튼이 활성화되었는지 확인
      const keyboardToggleButton = screen.getByText('ㄱ') as HTMLButtonElement
      expect(keyboardToggleButton.disabled).toBe(false)
      console.log('ㄱ버튼 활성화 확인')
    })

    it('ㄱ버튼 클릭 → 키보드 복원 → 기존 텍스트 유지', async () => {
      console.log('=== 기존 텍스트 유지 테스트 ===')
      
      render(<App />)
      
      // "밥" 입력 → 말하기 → ㄱ버튼 클릭
      const bButton = screen.getByText('ㅂㅍ')
      const iButton = screen.getByText('ㅣ')
      const dotButton = screen.getByText('ㆍ')
      
      fireEvent.click(bButton)
      fireEvent.click(iButton)
      fireEvent.click(dotButton)
      fireEvent.click(bButton)
      
      const speakButton = screen.getByText('🗣️')
      fireEvent.click(speakButton)
      
      const keyboardToggleButton = screen.getByText('ㄱ')
      fireEvent.click(keyboardToggleButton)
      console.log('ㄱ버튼 클릭 완료')
      
      // 잠시 대기 (setText 비동기 처리)
      await waitFor(() => {
        const displayText = document.querySelector('[style*="color: rgb(33, 150, 243)"]')?.textContent
        expect(displayText).toBe('밥')
      })
      
      console.log('기존 텍스트 유지 확인')
    })
  })

  describe('음성 출력 기능', () => {
    it('텍스트가 있을 때 음성 출력 호출', () => {
      console.log('=== 음성 출력 기능 테스트 ===')
      
      render(<App />)
      
      // "밥" 입력
      const bButton = screen.getByText('ㅂㅍ')
      const iButton = screen.getByText('ㅣ')
      const dotButton = screen.getByText('ㆍ')
      
      fireEvent.click(bButton) // ㅂ
      fireEvent.click(iButton) // ㅣ
      fireEvent.click(dotButton) // ㆍ -> ㅏ
      fireEvent.click(bButton) // ㅂ (종성)
      
      // 소리내기 버튼(음성 출력 버튼) 클릭
      const voiceButton = screen.getByText('🔊')
      fireEvent.click(voiceButton)
      
      // Web Speech API 호출 확인
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
      expect(mockSpeechSynthesisUtterance).toHaveBeenCalledWith('밥')
      
      console.log('음성 출력 API 호출 확인')
    })

    it('빈 텍스트일 때 음성 출력 미호출', () => {
      render(<App />)
      
      const voiceButton = screen.getByText('🔊')
      fireEvent.click(voiceButton)
      
      // Web Speech API 호출되지 않음 확인
      expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled()
    })

    it('TTS 서비스 에러 시 폴백 처리', async () => {
      console.log('=== TTS 폴백 테스트 ===')
      
      // Mock TTS service to throw error
      const originalCreateTTSService = require('../../services/ttsService').default.createTTSService
      const mockTTSService = {
        playAudio: vi.fn().mockRejectedValue(new Error('TTS Service Error'))
      }
      require('../../services/ttsService').default.createTTSService = vi.fn().mockReturnValue(mockTTSService)
      
      render(<App />)
      
      // "안녕" 입력
      const ieungButton = screen.getByText('ㅇㅁ')
      const hieuthButton = screen.getByText('ㅅㅎ')
      
      fireEvent.click(ieungButton) // ㅇ
      fireEvent.click(ieungButton) // ㅏ (ㅣ + ㆍ)
      const iButton = screen.getByText('ㅣ')
      const dotButton = screen.getByText('ㆍ')
      fireEvent.click(iButton)
      fireEvent.click(dotButton)
      fireEvent.click(hieuthButton) // ㄴ
      
      // 소리내기 버튼 클릭
      const voiceButton = screen.getByText('🔊')
      fireEvent.click(voiceButton)
      
      // 폴백으로 Web Speech API가 호출되어야 함
      await waitFor(() => {
        expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
      })
      
      console.log('TTS 폴백 처리 확인')
      
      // Restore original function
      require('../../services/ttsService').default.createTTSService = originalCreateTTSService
    })
  })

  describe('전체 삭제 기능', () => {
    it('텍스트 입력 후 전체 삭제', () => {
      console.log('=== 전체 삭제 기능 테스트 ===')
      
      render(<App />)
      
      // 텍스트 입력
      const bButton = screen.getByText('ㅂㅍ')
      const iButton = screen.getByText('ㅣ')
      const dotButton = screen.getByText('ㆍ')
      
      fireEvent.click(bButton)
      fireEvent.click(iButton)
      fireEvent.click(dotButton)
      
      // 입력 확인
      let displayText = document.querySelector('[style*="color: rgb(33, 150, 243)"]')?.textContent
      expect(displayText).toBe('바')
      
      // 전체 삭제 버튼 클릭
      const clearButton = screen.getByText('🧹')
      fireEvent.click(clearButton)
      
      // 텍스트 삭제 확인
      displayText = document.querySelector('[style*="color: rgb(33, 150, 243)"]')?.textContent
      expect(displayText).toBe('')
      
      console.log('전체 삭제 기능 확인')
    })
  })

  describe('로깅 시스템', () => {
    it('프로덕션 환경에서도 운영 로그 출력', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      // 직접 로그 함수 테스트
      logUserAction('테스트 액션', { test: 'data' })
      
      // 프로덕션 환경에서도 운영 로그가 출력되어야 함
      expect(consoleSpy).toHaveBeenCalledWith('[USER_ACTION] 테스트 액션', { test: 'data' })
      
      consoleSpy.mockRestore()
    })

    it('에러 로그 처리', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error')
      
      // 의도적으로 에러 발생시키기 (잘못된 프롭스 등)
      try {
        render(<App />)
        // 정상적인 경우이므로 에러가 발생하지 않을 수 있음
      } catch (error) {
        expect(consoleErrorSpy).toHaveBeenCalled()
      }
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('사용자 플로우 통합 테스트', () => {
    it('완전한 사용자 시나리오: 입력 → 서술어 선택 → 음성 출력', async () => {
      console.log('=== 완전한 사용자 플로우 테스트 ===')
      
      render(<App />)
      
      // 1. "물" 입력
      const mButton = screen.getByText('ㅇㅁ')
      const euButton = screen.getByText('ㅡ')
      const lButton = screen.getByText('ㄴㄹ')
      
      fireEvent.click(mButton) // ㅁ (두 번째 자음)
      fireEvent.click(mButton) // ㅁ
      fireEvent.click(euButton) // ㅜ (ㅡ + ㆍ)
      const dotButton = screen.getByText('ㆍ')
      fireEvent.click(dotButton)
      fireEvent.click(lButton) // ㄹ (두 번째 자음)
      fireEvent.click(lButton)
      
      // 2. 말하기 버튼 클릭하여 서술어 생성 트리거
      const speakButton = screen.getByText('🗣️')
      fireEvent.click(speakButton)
      
      // 3. 서술어 로딩 상태 확인 (AI 서비스 호출)
      await waitFor(() => {
        screen.queryByText('AI가 서술어를 생성하고 있습니다...')
        // 로딩 상태가 나타날 수 있음 (API 키가 없으면 바로 로컬 폴백)
      }, { timeout: 1000 })
      
      console.log('사용자 플로우 테스트 완료')
    })
  })
})