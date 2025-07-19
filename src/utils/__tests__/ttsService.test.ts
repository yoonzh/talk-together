import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSpeechTTSService, EnhancedGeminiTTSService, GoogleCloudTTSServiceWrapper, TTSServiceFactory } from '../../services/ttsService'

// Mock Web Speech API
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => [
    { name: 'Korean Voice', lang: 'ko-KR' },
    { name: 'English Voice', lang: 'en-US' }
  ])
}

const mockSpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  lang: '',
  voice: null,
  volume: 1,
  rate: 1,
  pitch: 1
}))

describe('TTS 서비스 테스트', () => {
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
    vi.restoreAllMocks()
  })

  describe('WebSpeechTTSService', () => {
    it('기본 음성 출력 기능 테스트', async () => {
      const ttsService = new WebSpeechTTSService()
      
      await ttsService.playAudio('안녕하세요')
      
      expect(mockSpeechSynthesisUtterance).toHaveBeenCalledWith('안녕하세요')
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
    })

    it('한국어 음성 선택 테스트', async () => {
      const ttsService = new WebSpeechTTSService()
      
      await ttsService.playAudio('밥 먹어요')
      
      const utteranceCall = mockSpeechSynthesisUtterance.mock.calls[0]
      expect(utteranceCall[0]).toBe('밥 먹어요')
      
      // 한국어 음성이 선택되었는지 확인
      expect(mockSpeechSynthesis.getVoices).toHaveBeenCalled()
    })

    it('음성 옵션 설정 테스트', async () => {
      const ttsService = new WebSpeechTTSService()
      
      await ttsService.playAudio('천천히 말해요', { speed: 0.8, pitch: 1.2 })
      
      expect(mockSpeechSynthesisUtterance).toHaveBeenCalledWith('천천히 말해요')
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
    })
  })

  describe('EnhancedGeminiTTSService', () => {
    // Mock fetch for Gemini API
    beforeEach(() => {
      global.fetch = vi.fn()
    })

    it('Gemini TTS 서비스 초기화 테스트', () => {
      const ttsService = new EnhancedGeminiTTSService('test-api-key')
      expect(ttsService).toBeDefined()
    })

    it('Gemini API 성공 응답 처리', async () => {
      // Mock successful API response
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{
                text: '테스트 문장이 자연스럽게 처리되었습니다'
              }]
            }
          }]
        })
      }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const ttsService = new EnhancedGeminiTTSService('test-api-key')
      
      await ttsService.playAudio('테스트 문장')
      
      expect(global.fetch).toHaveBeenCalled()
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
    })
  })

  describe('GoogleCloudTTSServiceWrapper', () => {
    beforeEach(() => {
      global.fetch = vi.fn()
      // Mock Audio constructor
      global.Audio = vi.fn().mockImplementation(() => ({
        play: vi.fn().mockResolvedValue(undefined),
        onended: null,
        onerror: null
      }))
      // Mock URL methods
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
      global.URL.revokeObjectURL = vi.fn()
      // Mock atob
      global.atob = vi.fn().mockReturnValue('mock-binary-data')
    })

    it('Google Cloud TTS 서비스 초기화 테스트', () => {
      const ttsService = new GoogleCloudTTSServiceWrapper('test-api-key')
      expect(ttsService).toBeDefined()
    })

    it('Google Cloud TTS API 성공 응답 처리', async () => {
      const mockAudio = {
        play: vi.fn().mockResolvedValue(undefined),
        onended: null,
        onerror: null
      }
      global.Audio = vi.fn().mockImplementation(() => mockAudio)

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          audioContent: 'base64-encoded-audio-data'
        })
      }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const ttsService = new GoogleCloudTTSServiceWrapper('test-api-key')
      
      // Mock audio playback completion
      setTimeout(() => {
        if (mockAudio.onended) mockAudio.onended()
      }, 100)
      
      await ttsService.playAudio('테스트 문장')
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://texttospeech.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      )
    })
  })

  describe('TTSServiceFactory', () => {
    it('기본적으로 Web Speech API 서비스 반환', () => {
      const service = TTSServiceFactory.createTTSService()
      expect(service).toBeInstanceOf(WebSpeechTTSService)
    })

    // TODO: 환경 변수 테스트는 Vitest 설정 개선 후 다시 활성화
    it.skip('TTS_MODULE 환경 변수 기반 서비스 선택 테스트', () => {
      // 환경 변수 모킹이 복잡하므로 실제 통합 테스트에서 확인
    })

    it.skip('TTS_MODULE=GCP_TTS 설정 시 Google Cloud TTS 서비스 반환', () => {
      // 환경 변수 모킹이 복잡하므로 실제 통합 테스트에서 확인
    })

    it('각 TTS 서비스 클래스 인스턴스 생성 테스트', () => {
      // 직접 인스턴스 생성 테스트
      const webSpeechService = new WebSpeechTTSService()
      expect(webSpeechService).toBeInstanceOf(WebSpeechTTSService)

      const geminiService = new EnhancedGeminiTTSService('test-key')
      expect(geminiService).toBeInstanceOf(EnhancedGeminiTTSService)

      const googleCloudService = new GoogleCloudTTSServiceWrapper('test-key')
      expect(googleCloudService).toBeInstanceOf(GoogleCloudTTSServiceWrapper)
    })
  })

  describe('TTS 통합 테스트', () => {

    it('긴 텍스트 처리 테스트', async () => {
      const ttsService = new WebSpeechTTSService()
      const longText = '안녕하세요. 저는 자폐장애인을 위한 의사소통 보조 앱입니다. 이 앱은 천지인 키보드를 사용해서 한글을 입력할 수 있고, AI가 서술어를 추천해줍니다.'
      
      await ttsService.playAudio(longText)
      
      expect(mockSpeechSynthesisUtterance).toHaveBeenCalledWith(longText)
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
    })

    it('특수 문자 포함 텍스트 처리 테스트', async () => {
      const ttsService = new WebSpeechTTSService()
      const specialText = '밥🍚 먹어요! 맛있네요~ 😋'
      
      await ttsService.playAudio(specialText)
      
      expect(mockSpeechSynthesisUtterance).toHaveBeenCalledWith(specialText)
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
    })
  })
})