import { logError } from '../utils/logger'
import { TTSOptions } from './geminiTtsService'
import { TTSAudioCacheService, TTSSource } from './database/ttsAudioCacheService'
import { TursoClient } from './database/tursoClient'

export interface GoogleCloudTTSRequest {
  input: {
    text: string
  }
  voice: {
    languageCode: string
    name?: string
    ssmlGender?: 'NEUTRAL' | 'FEMALE' | 'MALE'
  }
  audioConfig: {
    audioEncoding: 'MP3' | 'LINEAR16' | 'OGG_OPUS'
    speakingRate?: number
    pitch?: number
    volumeGainDb?: number
  }
}

export interface GoogleCloudTTSResponse {
  audioContent: string // Base64-encoded audio
}

export class GoogleCloudTTSService {
  private apiKey: string
  private baseUrl = 'https://texttospeech.googleapis.com/v1/text:synthesize'
  private cacheService: TTSAudioCacheService | null = null

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.initializeCacheService()
  }

  private async initializeCacheService(): Promise<void> {
    try {
      const databaseUrl = import.meta.env.VITE_TURSO_DATABASE_URL
      const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN
      
      if (!databaseUrl || !authToken) {
        console.warn('🚫 [Google Cloud TTS] Turso 환경변수 없음 - 캐시 없이 동작')
        return
      }
      
      const tursoClient = new TursoClient({ url: databaseUrl, authToken })
      await tursoClient.connect()
      this.cacheService = new TTSAudioCacheService(tursoClient)
      await this.cacheService.initialize()
    } catch (error) {
      console.warn('🚫 [Google Cloud TTS] 캐시 서비스 초기화 실패 - 캐시 없이 동작:', error)
    }
  }

  async playAudio(text: string, options?: Partial<TTSOptions>): Promise<void> {
    try {
      const voiceConfig = {
        voice: this.mapVoiceName(options?.voice),
        speed: options?.speed || 1.0,
        pitch: options?.pitch || 0.0,
        language: 'ko-KR'
      }

      // 1. 캐시 확인
      if (this.cacheService) {
        const cachedAudio = await this.cacheService.getAudioFromCache(text, voiceConfig)
        if (cachedAudio) {
          await this.cacheService.playFromCache(cachedAudio)
          await this.cacheService.logCacheOperation('hit', text, TTSSource.GOOGLE_CLOUD)
          return
        }
        await this.cacheService.logCacheOperation('miss', text, TTSSource.GOOGLE_CLOUD)
      }

      // 2. API 호출
      const request: GoogleCloudTTSRequest = {
        input: { text },
        voice: {
          languageCode: 'ko-KR',
          name: voiceConfig.voice,
          ssmlGender: 'NEUTRAL'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: voiceConfig.speed,
          pitch: voiceConfig.pitch,
          volumeGainDb: 0.0
        }
      }

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
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

      const data: GoogleCloudTTSResponse = await response.json()
      
      if (!data.audioContent) {
        throw new Error('No audio content received from Google Cloud TTS')
      }

      // 3. 오디오 재생
      await this.playBase64Audio(data.audioContent)
      
      // 4. 캐시에 저장 (API 성공 후)
      if (this.cacheService) {
        const originalSize = new Blob([atob(data.audioContent)]).size
        await this.cacheService.saveAudioToCache(
          text,
          data.audioContent,
          voiceConfig,
          TTSSource.GOOGLE_CLOUD,
          undefined, // 재생 시간은 측정하지 않음
          originalSize
        )
        await this.cacheService.logCacheOperation('save', text, TTSSource.GOOGLE_CLOUD, { size: originalSize })
      }
      
    } catch (error) {
      logError('Google Cloud TTS 음성 생성 실패', error)
      throw error
    }
  }

  private mapVoiceName(voice?: string): string {
    // Map Gemini voice names to Google Cloud TTS voice names
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
          logError('Google Cloud TTS 음성 재생 실패', error)
          reject(error)
        }
        
        audio.play().catch(reject)
      })
      
    } catch (error) {
      logError('Google Cloud TTS 오디오 처리 실패', error)
      throw error
    }
  }
}

export default GoogleCloudTTSService