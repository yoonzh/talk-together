import { processJosi } from '../utils/josiUtils'
import { logAiService, logError } from '../utils/logger'
import GeminiService from './geminiService'

interface PredicateCandidate {
  text: string
  emoji: string
  category: string
}

export class OpenAIService {
  private static instance: OpenAIService
  private openaiApiKey: string
  private geminiApiKey: string
  private geminiService: GeminiService | null = null
  
  private constructor() {
    this.openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || ''
    this.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || ''
    
    console.log('=== API Keys Debug ===')
    console.log('OpenAI Key exists:', !!this.openaiApiKey)
    console.log('Gemini Key exists:', !!this.geminiApiKey)
    console.log('OpenAI Key length:', this.openaiApiKey.length)
    console.log('Gemini Key length:', this.geminiApiKey.length)
    
    if (this.geminiApiKey) {
      this.geminiService = new GeminiService(this.geminiApiKey)
      console.log('Gemini service created')
    } else {
      console.log('No Gemini API key, skipping Gemini service')
    }
  }
  
  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService()
    }
    return OpenAIService.instance
  }
  
  async generatePredicates(noun: string): Promise<PredicateCandidate[]> {
    logAiService(`서술어 생성 시작: "${noun}"`)
    
    // Gemini가 설정되어 있으면 우선 사용
    if (this.geminiService) {
      try {
        logAiService('Gemini API 사용')
        return await this.geminiService.generatePredicates(noun)
      } catch (error) {
        logError('Gemini API failed, falling back to OpenAI', error)
        // Gemini 실패 시 OpenAI로 폴백
      }
    }
    
    // OpenAI 사용
    if (!this.openaiApiKey) {
      logAiService('No API keys found, using local fallback')
      return this.getLocalFallback(noun)
    }
    
    try {
      const prompt = this.createPrompt(noun)
      console.log('=== AI 프롬프트 ===')
      console.log(prompt)
      console.log('=== AI 프롬프트 끝 ===')
      logAiService('OpenAI API 호출 시작')
      
      const response = await this.callOpenAI(prompt)
      
      if (response) {
        console.log('=== AI 응답 ===')
        console.log(response)
        console.log('=== AI 응답 끝 ===')
        logAiService('OpenAI API 응답 성공, 파싱 시작')
        const result = this.parseResponse(response)
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
당신은 말을 못하는 자폐장애인(4-7세 지능 수준)을 위한 의사소통 보조 시스템입니다.
사용자 입력어 "${noun}"에 대해 자연스럽고 실용적인 문장 후보 5개에서 8개를 생성해주세요.

중요한 순서 요구사항:
1. 첫 번째와 두 번째 문장은 반드시 요청형 문장이어야 합니다 (가고싶어요, 하고싶어요, 주세요, 도와주세요 등)
2. 세번째와 네번째는 사용자 입력어와 관련된 감정 표현 (좋아요, 싫어요 등). 단, 사용자 입력어에 대한 감정 표현이 어색하다면 생략
3. 생성된 문장이 감정을 표현하는 문장이면 반대 감정에 대한 문장도 생성
4. 나머지 문장은 상태, 특성 등을 표현하는 문장

일반 요구사항:
1. 자폐장애인이 일상에서 자주 사용할 만한 표현
2. 간단하고 이해하기 쉬운 문장
3. 각 서술어마다 적절한 이모지 1개
4. 사용자 입력어의 의미와 문맥에 정확히 맞는 서술어를 생성하세요
5. 사용자 입력어와 관련된 구체적인 행동, 상태, 감정을 표현하세요

출력 형식 (JSON):
text는 완전한 문장으로 생성해주세요.
{
  "predicates": [
    {"text": "자동차를 타고 가요", "emoji": "🚗", "category": "이동"},
    {"text": "자동차가 빨라요", "emoji": "💨", "category": "특성"},
    {"text": "자동차를 운전해요", "emoji": "🚙", "category": "행동"},
    {"text": "자동차가 멋져요", "emoji": "✨", "category": "감정"},
    {"text": "자동차를 씻어요", "emoji": "🧼", "category": "관리"},
    {"text": "자동차가 크네요", "emoji": "📏", "category": "특성"}
  ]
}

사용자 입력어: "${noun}"
`
  }
  
  private async callOpenAI(prompt: string): Promise<string | null> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
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
          { text: '에 가고 싶어요', emoji: '🚶', category: '요청' },
          { text: '에 데려다 주세요', emoji: '🚗', category: '요청' },
          { text: '이/가 좋아요', emoji: '😊', category: '감정' },
          { text: '에서 쉬고 싶어요', emoji: '😴', category: '휴식' },
          { text: '에 도착했어요', emoji: '🎯', category: '도착' },
          { text: '이/가 깨끗해요', emoji: '✨', category: '상태' }
        ]
        break
      
      case 'food':
        basePredicates = [
          { text: '을/를 주세요', emoji: '🤲', category: '요청' },
          { text: '을/를 먹고 싶어요', emoji: '🍽️', category: '요청' },
          { text: '이/가 맛있어요', emoji: '😋', category: '맛' },
          { text: '이/가 필요해요', emoji: '🤗', category: '필요' },
          { text: '을/를 만들어 주세요', emoji: '👨‍🍳', category: '요리' },
          { text: '이/가 따뜻해요', emoji: '🔥', category: '온도' }
        ]
        break
      
      case 'activity':
        basePredicates = [
          { text: '을/를 하고 싶어요', emoji: '🙌', category: '요청' },
          { text: '을/를 배우고 싶어요', emoji: '📚', category: '요청' },
          { text: '이/가 좋아요', emoji: '😊', category: '감정' },
          { text: '이/가 재미있어요', emoji: '😄', category: '기분' },
          { text: '이/가 어려워요', emoji: '😰', category: '난이도' },
          { text: '을/를 하고 있어요', emoji: '⏰', category: '진행' }
        ]
        break
      
      case 'person':
        basePredicates = [
          { text: '을/를 만나고 싶어요', emoji: '🤗', category: '요청' },
          { text: '을/를 도와주세요', emoji: '🙏', category: '요청' },
          { text: '이/가 좋아요', emoji: '😊', category: '감정' },
          { text: '이/가 보고 싶어요', emoji: '💕', category: '그리움' },
          { text: '이/가 친절해요', emoji: '😇', category: '성격' },
          { text: '과/와 놀고 싶어요', emoji: '🎉', category: '놀이' }
        ]
        break
      
      default:
        basePredicates = [
          { text: '을/를 주세요', emoji: '🤲', category: '요청' },
          { text: '을/를 도와주세요', emoji: '🙏', category: '요청' },
          { text: '이/가 좋아요', emoji: '😊', category: '감정' },
          { text: '이/가 필요해요', emoji: '🤗', category: '필요' },
          { text: '을/를 원해요', emoji: '🙌', category: '바람' },
          { text: '이/가 예쁘네요', emoji: '🌸', category: '외관' }
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
