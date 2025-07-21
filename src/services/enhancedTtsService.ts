import { getTTSAudioWithCache, saveTTSAudioToCache } from './database/cacheService'
import { TTSSource } from './database/ttsAudioCacheService'
import { logError } from '../utils/logger'
import GeminiTTSService, { TTSOptions } from './geminiTtsService'
// import GoogleCloudTTSService from './googleCloudTtsService' // 현재 사용하지 않음

export interface ITTSService {
  playAudio(text: string, options?: Partial<TTSOptions>): Promise<void>
}

export class CachedWebSpeechTTSService implements ITTSService {
  async playAudio(text: string, options?: Partial<TTSOptions>): Promise<void> {
    try {
      console.log('🔊 [Cached TTS] Web Speech API 사용', { text })
      
      // Web Speech API는 캐시하지 않으므로 바로 재생
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

export class CachedGeminiTTSService implements ITTSService {
  private geminiTTS: GeminiTTSService

  constructor(apiKey: string) {
    this.geminiTTS = new GeminiTTSService(apiKey)
  }

  async playAudio(text: string, options?: Partial<TTSOptions>): Promise<void> {
    try {
      console.log('🔊 [Cached TTS] Gemini TTS 사용', { text })
      
      // Gemini TTS는 텍스트 전처리 후 Web Speech API 사용하므로 캐시하지 않음
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

export class CachedGoogleCloudTTSService implements ITTSService {
  // private googleCloudTTS: GoogleCloudTTSService // 현재 사용하지 않음 (직접 API 호출)

  constructor(_apiKey: string) {
    // this.googleCloudTTS = new GoogleCloudTTSService(apiKey)
  }

  async playAudio(text: string, options?: Partial<TTSOptions>): Promise<void> {
    try {
      console.log(`🔍 [Cached TTS] GCP TTS 캐시 확인: ${text.substring(0, 30)}...`)
      
      const voiceConfig = {
        voice: options?.voice || 'ko-KR-Standard-A',
        speed: options?.speed || 1.0,
        pitch: options?.pitch || 1.0,
        language: 'ko-KR'
      }
      
      // 1. 캐시 확인
      const cacheResult = await getTTSAudioWithCache(text, voiceConfig)
      if (cacheResult.fromCache && cacheResult.audioData) {
        console.log(`🎯 [Cached TTS] 캐시에서 오디오 재생: ${text.substring(0, 30)}...`)
        await this.playBase64Audio(cacheResult.audioData)
        return
      }
      
      // 2. GCP TTS API 호출
      console.log(`📡 [Cached TTS] GCP TTS API 호출: ${text.substring(0, 30)}...`)
      const startTime = Date.now()
      
      try {
        // GCP TTS API에서 오디오 데이터를 얻기 위해 직접 호출
        const audioData = await this.getAudioFromGCP(text, voiceConfig)
        const processingTime = Date.now() - startTime
        
        console.log(`✅ [Cached TTS] GCP TTS 응답 성공: ${text.substring(0, 30)}... (${processingTime}ms)`)
        
        // 3. 캐시에 저장
        await saveTTSAudioToCache(
          text,
          audioData,
          voiceConfig,
          TTSSource.GOOGLE_CLOUD,
          undefined, // duration은 계산하지 않음
          undefined  // originalSize는 계산하지 않음
        )
        
        // 4. 오디오 재생
        await this.playBase64Audio(audioData)
        
      } catch (gcpError) {
        console.log(`⚠️ [Cached TTS] GCP TTS 실패, Web Speech 폴백: ${text.substring(0, 30)}...`)
        
        // 5. Web Speech API 폴백 (DB에 저장하지 않음)
        await this.playWithWebSpeech(text, options)
        
        // 6. 폴백 사용 로그만 출력 (DB에 저장하지 않음)
        console.log(`📝 [Cached TTS] Web Speech 폴백 사용 - 문장: ${text.substring(0, 50)}... (DB 저장 안함)`)
      }
      
    } catch (error) {
      logError('Cached Google Cloud TTS 서비스 실패', error)
      throw error
    }
  }

  private async getAudioFromGCP(text: string, voiceConfig: any): Promise<string> {
    // GoogleCloudTTSService의 내부 로직을 복사하여 오디오 데이터만 반환
    const apiKey = import.meta.env.VITE_GCP_API_KEY || import.meta.env.GCP_API_KEY
    const baseUrl = 'https://texttospeech.googleapis.com/v1/text:synthesize'
    
    const request = {
      input: { text },
      voice: {
        languageCode: 'ko-KR',
        name: this.mapVoiceName(voiceConfig.voice),
        ssmlGender: 'NEUTRAL' as const
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate: voiceConfig.speed || 1.0,
        pitch: voiceConfig.pitch || 0.0,
        volumeGainDb: 0.0
      }
    }

    const response = await fetch(`${baseUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google Cloud TTS API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.audioContent) {
      throw new Error('No audio content received from Google Cloud TTS')
    }

    return data.audioContent
  }

  private mapVoiceName(voice?: string): string {
    const voiceMapping: Record<string, string> = {
      'ko-KR-Standard-A': 'ko-KR-Standard-A',
      'ko-KR-Standard-B': 'ko-KR-Standard-B',
      'ko-KR-Standard-C': 'ko-KR-Standard-C',
      'ko-KR-Standard-D': 'ko-KR-Standard-D'
    }
    
    return voiceMapping[voice || 'ko-KR-Standard-A'] || 'ko-KR-Standard-A'
  }

  private async playBase64Audio(base64Audio: string): Promise<void> {
    try {
      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64Audio)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Create blob and object URL
      const audioBlob = new Blob([bytes], { type: 'audio/mp3' })
      const audioUrl = URL.createObjectURL(audioBlob)

      // Create and play audio element
      const audio = new Audio(audioUrl)
      
      return new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          resolve()
        }
        
        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl)
          logError('오디오 재생 실패', error)
          reject(error)
        }
        
        audio.play().catch(reject)
      })
      
    } catch (error) {
      logError('Base64 오디오 처리 실패', error)
      throw error
    }
  }

  private async playWithWebSpeech(text: string, options?: Partial<TTSOptions>): Promise<void> {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ko-KR'
    utterance.rate = options?.speed || 1.0
    utterance.pitch = options?.pitch || 1.0
    
    const voices = speechSynthesis.getVoices()
    const koreanVoice = voices.find(voice => voice.lang.startsWith('ko'))
    if (koreanVoice) {
      utterance.voice = koreanVoice
    }

    speechSynthesis.speak(utterance)
  }
}

export class CachedTTSServiceFactory {
  static createTTSService(): ITTSService {
    const ttsModule = import.meta.env.VITE_TTS_MODULE || import.meta.env.TTS_MODULE
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY
    const googleTtsApiKey = import.meta.env.VITE_GCP_API_KEY || import.meta.env.GCP_API_KEY

    console.log(`⚙️ [Cached TTS Factory] TTS 모듈 선택: ${ttsModule || 'WEB_SPEECH'}`)

    if (ttsModule === 'GEMINI_TTS' && geminiApiKey) {
      return new CachedGeminiTTSService(geminiApiKey)
    } else if (ttsModule === 'GCP_TTS' && googleTtsApiKey) {
      return new CachedGoogleCloudTTSService(googleTtsApiKey)
    } else {
      return new CachedWebSpeechTTSService()
    }
  }
}

export default CachedTTSServiceFactory