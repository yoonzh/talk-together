import { logAiService, logError } from '../utils/logger'
import { createPredicatePrompt } from '../utils/promptTemplates'

interface PredicateCandidate {
  text: string
  emoji: string
  category: string
}

export class GeminiService {
  private apiKey: string
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generatePredicates(noun: string): Promise<PredicateCandidate[]> {
    try {
      const prompt = createPredicatePrompt(noun)

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
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        }),
        signal: AbortSignal.timeout(10000) // 10초 타임아웃
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      logAiService('Gemini API 응답 받음', data)

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const responseText = data.candidates[0].content.parts[0].text
        return this.parseResponse(responseText)
      }

      throw new Error('Invalid Gemini API response format')

    } catch (error) {
      logError('Gemini API call failed', error)
      throw error
    }
  }

  private parseResponse(response: string): PredicateCandidate[] {
    try {
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      
      if (parsed.predicates && Array.isArray(parsed.predicates)) {
        return parsed.predicates.map((p: any) => ({
          text: p.text || '',
          emoji: p.emoji || '😊',
          category: p.category || 'general'
        }))
      }
      
      return []
    } catch (error) {
      console.error('❌ [Gemini] JSON 파싱 실패 - 원본 응답:', error)
      console.error('📄 [Gemini] 받은 전체 응답 내용:')
      console.error('==================== 시작 ====================')
      console.error(response)
      console.error('==================== 끝 =====================')
      logError('Failed to parse Gemini response', error)
      return []
    }
  }
}

export default GeminiService