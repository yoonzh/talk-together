import { processJosi } from '../utils/josiUtils'
import { logAiService, logError } from '../utils/logger'

interface PredicateCandidate {
  text: string
  emoji: string
  category: string
}

export class OpenAIService {
  private static instance: OpenAIService
  private apiKey: string
  
  private constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || ''
  }
  
  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService()
    }
    return OpenAIService.instance
  }
  
  async generatePredicates(noun: string): Promise<PredicateCandidate[]> {
    logAiService(`서술어 생성 시작: "${noun}"`)
    
    if (!this.apiKey) {
      logAiService('OpenAI API key not found, using local fallback')
      return this.getLocalFallback(noun)
    }
    
    try {
      const prompt = this.createPrompt(noun)
      logAiService('OpenAI API 호출 시작')
      
      const response = await this.callOpenAI(prompt)
      
      if (response) {
        logAiService('OpenAI API 응답 성공, 파싱 시작')
        const result = this.parseResponse(response, noun)
        logAiService(`서술어 생성 완료: ${result.length}개 생성`)
        return result
      }
      
      logAiService('OpenAI API 응답 없음, 로컬 폴백 사용')
      return this.getLocalFallback(noun)
    } catch (error) {
      logError('OpenAI API error', error)
      logAiService('API 오류로 인한 로컬 폴백 사용')
      return this.getLocalFallback(noun)
    }
  }
  
  private createPrompt(noun: string): string {
    return `
당신은 자폐장애인(4-7세 지능 수준)을 위한 의사소통 보조 시스템입니다.
명사 "${noun}"에 대해 자연스럽고 실용적인 서술어 후보 4개를 생성해주세요.

요구사항:
1. 자폐장애인이 일상에서 자주 사용할 만한 표현
2. 간단하고 이해하기 쉬운 문장
3. 각 서술어마다 적절한 이모지 1개
4. 명사의 의미와 문맥에 정확히 맞는 서술어를 생성하세요
5. 해당 명사와 관련된 구체적인 행동, 상태, 감정을 표현하세요
6. 조사를 자연스럽게 사용하되, 문법적으로 올바른 형태로 생성하세요
7. 카테고리는 해당 문장의 의미에 맞는 한국어로 표현하세요

예시:
- "자동차" → "자동차를 타고 가요", "자동차가 빨라요", "자동차를 운전해요", "자동차가 멋져요"
- "병원" → "병원에 가야 해요", "병원에서 치료받아요", "병원이 무서워요", "병원 선생님이 좋아요"
- "수영" → "수영을 배우고 싶어요", "수영이 재미있어요", "수영장에 가고 싶어요", "수영을 잘해요"

출력 형식 (JSON):
text는 명사를 포함한 완전한 문장으로 생성해주세요.
{
  "predicates": [
    {"text": "자동차를 타고 가요", "emoji": "🚗", "category": "이동"},
    {"text": "자동차가 빨라요", "emoji": "💨", "category": "특성"},
    {"text": "자동차를 운전해요", "emoji": "🚙", "category": "행동"},
    {"text": "자동차가 멋져요", "emoji": "✨", "category": "감정"}
  ]
}

명사: "${noun}"
`
  }
  
  private async callOpenAI(prompt: string): Promise<string | null> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: '당신은 자폐장애인을 위한 의사소통 보조 시스템입니다. 항상 JSON 형태로 응답해주세요.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        }),
        signal: AbortSignal.timeout(5000)
      })
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }
      
      const data = await response.json()
      return data.choices[0]?.message?.content || null
    } catch (error) {
      logError('OpenAI API call failed', error)
      return null
    }
  }
  
  private parseResponse(response: string, noun: string): PredicateCandidate[] {
    try {
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      
      if (parsed.predicates && Array.isArray(parsed.predicates)) {
        return parsed.predicates.map((p: any) => ({
          text: processJosi(noun, p.text || ''),
          emoji: p.emoji || '😊',
          category: p.category || 'general'
        }))
      }
      
      return []
    } catch (error) {
      logError('Failed to parse OpenAI response', error)
      return []
    }
  }
  
  private getLocalFallback(noun: string): PredicateCandidate[] {
    const category = this.analyzeNounCategory(noun)
    
    let basePredicates: Array<{text: string, emoji: string, category: string}>
    
    switch (category) {
      case 'place':
        basePredicates = [
          { text: '에 가고 싶어요', emoji: '🚶', category: '장소' },
          { text: '에 있어요', emoji: '🏠', category: '위치' },
          { text: '이/가 좋아요', emoji: '😊', category: '감정' },
          { text: '에서 쉬고 싶어요', emoji: '😴', category: '휴식' }
        ]
        break
      
      case 'food':
        basePredicates = [
          { text: '을/를 먹고 싶어요', emoji: '🍽️', category: '음식' },
          { text: '이/가 맛있어요', emoji: '😋', category: '맛' },
          { text: '을/를 주세요', emoji: '🤲', category: '요청' },
          { text: '이/가 필요해요', emoji: '🤗', category: '필요' }
        ]
        break
      
      case 'activity':
        basePredicates = [
          { text: '을/를 하고 싶어요', emoji: '🙌', category: '활동' },
          { text: '이/가 좋아요', emoji: '😊', category: '감정' },
          { text: '이/가 재미있어요', emoji: '😄', category: '기분' },
          { text: '을/를 배우고 싶어요', emoji: '📚', category: '학습' }
        ]
        break
      
      case 'person':
        basePredicates = [
          { text: '이/가 좋아요', emoji: '😊', category: '감정' },
          { text: '을/를 만나고 싶어요', emoji: '🤗', category: '만남' },
          { text: '이/가 보고 싶어요', emoji: '💕', category: '그리움' },
          { text: '을/를 도와주세요', emoji: '🙏', category: '도움' }
        ]
        break
      
      default:
        basePredicates = [
          { text: '이/가 좋아요', emoji: '😊', category: '감정' },
          { text: '이/가 필요해요', emoji: '🤲', category: '필요' },
          { text: '을/를 원해요', emoji: '🙌', category: '바람' },
          { text: '을/를 도와주세요', emoji: '🙏', category: '도움' }
        ]
    }
    
    return basePredicates.map(p => ({
      ...p,
      text: processJosi(noun, p.text)
    }))
  }
  
  private analyzeNounCategory(noun: string): string {
    const places = ['화장실', '학교', '집', '병원', '시장', '공원', '도서관', '식당', '카페', '놀이터', '수영장', '체육관']
    const foods = ['밥', '물', '빵', '우유', '과자', '사과', '바나나', '김치', '라면', '피자', '치킨', '햄버거']
    const activities = ['수영', '공부', '놀이', '운동', '독서', '그림', '음악', '게임', '산책', '요리']
    const people = ['엄마', '아빠', '선생님', '친구', '할머니', '할아버지', '언니', '오빠', '동생']
    
    if (places.includes(noun)) return 'place'
    if (foods.includes(noun)) return 'food'
    if (activities.includes(noun)) return 'activity'
    if (people.includes(noun)) return 'person'
    
    return 'general'
  }
}

export default OpenAIService.getInstance()