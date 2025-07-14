import { processJosi } from '../utils/josiUtils'

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
    if (!this.apiKey) {
      console.warn('OpenAI API key not found, using local fallback')
      return this.getLocalFallback(noun)
    }
    
    try {
      const prompt = this.createPrompt(noun)
      const response = await this.callOpenAI(prompt)
      
      if (response) {
        return this.parseResponse(response, noun)
      }
      
      return this.getLocalFallback(noun)
    } catch (error) {
      console.error('OpenAI API error:', error)
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
4. 명사의 의미와 문맥에 맞는 서술어
5. 조사는 받침 유무와 상관없이 "을/를", "이/가", "와/과" 형태로 사용 (자동 변환됨)

출력 형식 (JSON):
{
  "predicates": [
    {"text": "을/를 먹고 싶어요", "emoji": "🍽️", "category": "food"},
    {"text": "이/가 맛있어요", "emoji": "😋", "category": "food"},
    {"text": "을/를 주세요", "emoji": "🤲", "category": "general"},
    {"text": "이/가 필요해요", "emoji": "🤗", "category": "general"}
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
      console.error('OpenAI API call failed:', error)
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
      console.error('Failed to parse OpenAI response:', error)
      return []
    }
  }
  
  private getLocalFallback(noun: string): PredicateCandidate[] {
    const category = this.analyzeNounCategory(noun)
    
    let basePredicates: Array<{text: string, emoji: string, category: string}>
    
    switch (category) {
      case 'place':
        basePredicates = [
          { text: '에 가고 싶어요', emoji: '🚶', category: 'place' },
          { text: '에 있어요', emoji: '🏠', category: 'place' },
          { text: '이/가 좋아요', emoji: '😊', category: 'general' },
          { text: '에서 쉬고 싶어요', emoji: '😴', category: 'place' }
        ]
        break
      
      case 'food':
        basePredicates = [
          { text: '을/를 먹고 싶어요', emoji: '🍽️', category: 'food' },
          { text: '이/가 맛있어요', emoji: '😋', category: 'food' },
          { text: '을/를 주세요', emoji: '🤲', category: 'general' },
          { text: '이/가 필요해요', emoji: '🤗', category: 'general' }
        ]
        break
      
      case 'activity':
        basePredicates = [
          { text: '을/를 하고 싶어요', emoji: '🙌', category: 'activity' },
          { text: '이/가 좋아요', emoji: '😊', category: 'general' },
          { text: '이/가 재미있어요', emoji: '😄', category: 'general' },
          { text: '을/를 배우고 싶어요', emoji: '📚', category: 'activity' }
        ]
        break
      
      case 'person':
        basePredicates = [
          { text: '이/가 좋아요', emoji: '😊', category: 'general' },
          { text: '을/를 만나고 싶어요', emoji: '🤗', category: 'person' },
          { text: '이/가 보고 싶어요', emoji: '💕', category: 'person' },
          { text: '을/를 도와주세요', emoji: '🙏', category: 'general' }
        ]
        break
      
      default:
        basePredicates = [
          { text: '이/가 좋아요', emoji: '😊', category: 'general' },
          { text: '이/가 필요해요', emoji: '🤲', category: 'general' },
          { text: '을/를 원해요', emoji: '🙌', category: 'general' },
          { text: '을/를 도와주세요', emoji: '🙏', category: 'general' }
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