import { logError } from '../utils/logger'
import { TTSOptions } from './geminiTtsService'

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

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async playAudio(text: string, options?: Partial<TTSOptions>): Promise<void> {
    try {
      const request: GoogleCloudTTSRequest = {
        input: { text },
        voice: {
          languageCode: 'ko-KR',
          name: this.mapVoiceName(options?.voice),
          ssmlGender: 'NEUTRAL'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: options?.speed || 1.0,
          pitch: options?.pitch || 0.0, // Google Cloud uses different pitch range (-20 to 20)
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

      // Convert base64 audio to blob and play
      await this.playBase64Audio(data.audioContent)
      
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