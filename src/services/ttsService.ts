import { logSpeechOutput, logError } from '../utils/logger'
import GeminiTTSService, { TTSOptions } from './geminiTtsService'

export interface ITTSService {
  playAudio(text: string, options?: Partial<TTSOptions>): Promise<void>
}

export class WebSpeechTTSService implements ITTSService {
  async playAudio(text: string, options?: Partial<TTSOptions>): Promise<void> {
    try {
      logSpeechOutput('Web Speech API 음성 출력 시작', { text })
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ko-KR'
      utterance.rate = options?.speed || 1.0
      utterance.pitch = options?.pitch || 1.0
      
      // 한국어 음성 선택 시도
      const voices = speechSynthesis.getVoices()
      const koreanVoice = voices.find(voice => voice.lang.startsWith('ko'))
      if (koreanVoice) {
        utterance.voice = koreanVoice
        logSpeechOutput('한국어 음성 선택됨', { voiceName: koreanVoice.name })
      }

      speechSynthesis.speak(utterance)
      
    } catch (error) {
      logError('Web Speech API 음성 출력 실패', error)
      throw error
    }
  }
}

export class EnhancedGeminiTTSService implements ITTSService {
  private geminiTTS: GeminiTTSService

  constructor(apiKey: string) {
    this.geminiTTS = new GeminiTTSService(apiKey)
  }

  async playAudio(text: string, options?: Partial<TTSOptions>): Promise<void> {
    try {
      const ttsOptions: TTSOptions = {
        text,
        voice: options?.voice || 'ko-KR-Standard-A',
        speed: options?.speed || 1.0,
        pitch: options?.pitch || 1.0
      }

      await this.geminiTTS.playAudio(ttsOptions)
      
    } catch (error) {
      logError('Gemini TTS 서비스 실패', error)
      throw error
    }
  }
}

export class TTSServiceFactory {
  static createTTSService(): ITTSService {
    const useGeminiTTS = import.meta.env.VITE_GEMINI_TTS === 'TRUE'
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY

    if (useGeminiTTS && geminiApiKey) {
      logSpeechOutput('Gemini TTS 서비스 초기화')
      return new EnhancedGeminiTTSService(geminiApiKey)
    } else {
      logSpeechOutput('Web Speech API 서비스 초기화')
      return new WebSpeechTTSService()
    }
  }
}

export default TTSServiceFactory