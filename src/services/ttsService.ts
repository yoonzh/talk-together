import { logError } from '../utils/logger'
import GeminiTTSService, { TTSOptions } from './geminiTtsService'
import GoogleCloudTTSService from './googleCloudTtsService'

export interface ITTSService {
  playAudio(text: string, options?: Partial<TTSOptions>): Promise<void>
}

export class WebSpeechTTSService implements ITTSService {
  async playAudio(text: string, options?: Partial<TTSOptions>): Promise<void> {
    try {
      console.log('🔊 TTS Engine: Web Speech API 사용', { text })
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ko-KR'
      utterance.rate = options?.speed || 1.0
      utterance.pitch = options?.pitch || 1.0
      
      // 한국어 음성 선택 시도
      const voices = speechSynthesis.getVoices()
      const koreanVoice = voices.find(voice => voice.lang.startsWith('ko'))
      if (koreanVoice) {
        utterance.voice = koreanVoice
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
      console.log('🔊 TTS Engine: Gemini TTS 사용', { text })
      
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

export class GoogleCloudTTSServiceWrapper implements ITTSService {
  private googleCloudTTS: GoogleCloudTTSService

  constructor(apiKey: string) {
    this.googleCloudTTS = new GoogleCloudTTSService(apiKey)
  }

  async playAudio(text: string, options?: Partial<TTSOptions>): Promise<void> {
    try {
      console.log('🔊 TTS Engine: Google Cloud TTS 사용', { text })
      await this.googleCloudTTS.playAudio(text, options)
    } catch (error) {
      logError('Google Cloud TTS 서비스 실패', error)
      throw error
    }
  }
}

export class TTSServiceFactory {
  static createTTSService(): ITTSService {
    // TTS_MODULE 환경 변수 확인 (GEMINI_TTS, GCP_TTS, 또는 기본값)
    const ttsModule = import.meta.env.VITE_TTS_MODULE || import.meta.env.TTS_MODULE
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY
    const googleTtsApiKey = import.meta.env.VITE_GCP_API_KEY || import.meta.env.GCP_API_KEY

    // AIDEV-NOTE: TTS 모듈 선택 로직 - 환경변수 TTS_MODULE에 따라 다른 TTS 서비스 사용
    if (ttsModule === 'GEMINI_TTS' && geminiApiKey) {
      return new EnhancedGeminiTTSService(geminiApiKey)
    } else if (ttsModule === 'GCP_TTS' && googleTtsApiKey) {
      return new GoogleCloudTTSServiceWrapper(googleTtsApiKey)
    } else {
      return new WebSpeechTTSService()
    }
  }
}

export default TTSServiceFactory