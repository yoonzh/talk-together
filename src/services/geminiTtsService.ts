import { logError } from '../utils/logger'

export interface TTSOptions {
  text: string
  voice?: 'ko-KR-Standard-A' | 'ko-KR-Standard-B' | 'ko-KR-Standard-C' | 'ko-KR-Standard-D'
  speed?: number
  pitch?: number
}

export class GeminiTTSService {
  private apiKey: string
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateSpeech(options: TTSOptions): Promise<AudioBuffer> {
    try {
      const prompt = this.createTTSPrompt(options)
      
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        }),
        signal: AbortSignal.timeout(30000) // 30초 타임아웃 (TTS는 더 오래 걸릴 수 있음)
      })

      if (!response.ok) {
        throw new Error(`Gemini TTS API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const responseText = data.candidates[0].content.parts[0].text
        return await this.processAudioResponse(responseText)
      }

      throw new Error('Invalid Gemini TTS API response format')

    } catch (error) {
      logError('Gemini TTS API call failed', error)
      throw error
    }
  }

  async playAudio(options: TTSOptions): Promise<void> {
    try {
      // Gemini는 실제로 오디오 생성을 지원하지 않으므로, 
      // 현재는 더 나은 텍스트 전처리와 함께 Web Speech API를 사용
      const processedText = await this.preprocessText(options.text)
      
      const utterance = new SpeechSynthesisUtterance(processedText)
      utterance.lang = 'ko-KR'
      utterance.rate = options.speed || 1.0
      utterance.pitch = options.pitch || 1.0
      
      // 한국어 음성 선택 시도
      const voices = speechSynthesis.getVoices()
      const koreanVoice = voices.find(voice => voice.lang.startsWith('ko'))
      if (koreanVoice) {
        utterance.voice = koreanVoice
      }

      speechSynthesis.speak(utterance)
      
    } catch (error) {
      logError('Gemini TTS playAudio failed', error)
      throw error
    }
  }

  private createTTSPrompt(options: TTSOptions): string {
    return `다음 한국어 텍스트를 자연스럽고 명확하게 읽을 수 있도록 발음과 억양을 개선해주세요.

원본 텍스트: "${options.text}"

요구사항:
1. 자폐장애인(4-7세 지능 수준)이 듣기 쉽도록 명확하고 간단하게
2. 어려운 한자어는 쉬운 순우리말로 바꿔주세요
3. 문장 구조를 단순하게 만들어주세요
4. 발음이 어려운 부분은 읽기 쉽게 조정해주세요
5. 감정이 잘 전달되도록 자연스럽게 표현해주세요

개선된 텍스트만 반환해주세요:`
  }

  private async preprocessText(text: string): Promise<string> {
    try {
      const prompt = this.createTTSPrompt({ text })
      
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        }),
        signal: AbortSignal.timeout(10000)
      })

      if (!response.ok) {
        logError('Gemini TTS 전처리 실패, 원본 텍스트 사용', { status: response.status })
        return text
      }

      const data = await response.json()
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const processedText = data.candidates[0].content.parts[0].text.trim()
        return processedText || text
      }

      return text
    } catch (error) {
      logError('Gemini TTS 전처리 중 오류, 원본 텍스트 사용', error)
      return text
    }
  }

  private async processAudioResponse(_responseText: string): Promise<AudioBuffer> {
    // 실제로는 Gemini가 오디오를 생성하지 않으므로
    // 이 메서드는 현재 구현되지 않음
    throw new Error('Gemini does not support direct audio generation')
  }
}

export default GeminiTTSService