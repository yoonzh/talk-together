import { logAiService, logError } from '../utils/logger'

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
      logAiService('Gemini API 호출 시작', noun)
      
      const prompt = `당신은 자폐장애 아동(4-7세 지능 수준)의 의사소통을 돕는 AI입니다. 
주어진 명사에 대해 간단하고 이해하기 쉬운 서술어 후보 6개를 생성해주세요.

명사: "${noun}"

중요한 순서 요구사항:
1. 첫 번째와 두 번째 문장은 반드시 요청형 문장이어야 합니다 (가고싶어요, 하고싶어요, 주세요, 도와주세요 등)
2. 나머지 문장은 감정, 상태, 특성 등을 표현하는 문장

조사 처리 규칙:
- 받침이 있는 경우: 이/가 → 이, 을/를 → 을, 와/과 → 과
- 받침이 없는 경우: 이/가 → 가, 을/를 → 를, 와/과 → 와

JSON 형식으로 응답해주세요:
{
  "predicates": [
    {"text": "완전한 문장", "emoji": "관련 이모지", "category": "카테고리"},
    ...
  ]
}

카테고리 예시: 요청, 감정, 필요, 바람, 상태, 특성 등`

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
      logError('Failed to parse Gemini response', error)
      return []
    }
  }
}

export default GeminiService