import { processJosi } from '../utils/josiUtils'
import { logAiService, logError } from '../utils/logger'
import { createPredicatePrompt } from '../utils/promptTemplates'
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
  private preferredModel: 'openai' | 'gemini' | 'auto' = 'auto' // auto = openai 우선
  
  private constructor() {
    this.openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || ''
    this.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || ''
    
    if (this.geminiApiKey) {
      this.geminiService = new GeminiService(this.geminiApiKey)
    }
  }
  
  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService()
    }
    return OpenAIService.instance
  }
  
  // 모델 전환 메서드
  public setPreferredModel(model: 'openai' | 'gemini' | 'auto'): void {
    this.preferredModel = model
    console.log(`🔄 AI 모델 전환: ${model}`)
  }

  public getPreferredModel(): string {
    return this.preferredModel
  }

  // 키워드 검사 및 모델 전환
  private checkModelSwitchKeyword(noun: string): boolean {
    const normalized = noun.trim().toLowerCase()
    
    if (normalized === '챗지피티' || normalized === 'chatgpt') {
      this.setPreferredModel('openai')
      return true
    }
    
    if (normalized === '제미나이' || normalized === 'gemini') {
      this.setPreferredModel('gemini')
      return true
    }
    
    return false
  }

  async generatePredicates(noun: string): Promise<PredicateCandidate[]> {
    logAiService(`서술어 생성 시작: "${noun}"`)
    
    // 모델 전환 키워드 검사
    if (this.checkModelSwitchKeyword(noun)) {
      // 모델 전환 키워드인 경우 빈 배열 반환 (별도 처리됨)
      return []
    }
    
    // 설정된 모델에 따라 우선순위 결정
    const shouldUseOpenAIFirst = (this.preferredModel === 'auto' && this.openaiApiKey) || 
                                 (this.preferredModel === 'openai' && this.openaiApiKey)
    const shouldUseGeminiFirst = this.preferredModel === 'gemini' && this.geminiService
    
    // OpenAI 우선 사용 (auto 모드 포함)
    if (shouldUseOpenAIFirst) {
      try {
        console.log(`🤖 AI 모델: ChatGPT (${this.preferredModel})`)
        return this.generateWithOpenAI(noun)
      } catch (error) {
        logError('OpenAI API failed, falling back to Gemini', error)
        // OpenAI 실패 시 Gemini로 폴백 (auto 모드에서만)
        if (this.preferredModel === 'auto' && this.geminiService) {
          console.log('🤖 ChatGPT 실패 → Gemini 폴백')
          return await this.geminiService.generatePredicates(noun)
        }
      }
    }
    
    // Gemini 우선 사용 (명시적 설정 시만)
    if (shouldUseGeminiFirst) {
      try {
        console.log(`🤖 AI 모델: Gemini (${this.preferredModel})`)
        return await this.geminiService!.generatePredicates(noun)
      } catch (error) {
        logError('Gemini API failed, falling back to OpenAI', error)
        // Gemini 실패 시 OpenAI로 폴백
        if (this.openaiApiKey) {
          console.log('🤖 Gemini 실패 → ChatGPT 폴백')
          return this.generateWithOpenAI(noun)
        }
      }
    }
    
    // 기본 폴백 (auto 모드)
    if (this.openaiApiKey) {
      try {
        console.log('🤖 AI 모델: ChatGPT (기본)')
        return this.generateWithOpenAI(noun)
      } catch (error) {
        logError('OpenAI API failed, falling back to Gemini', error)
      }
    }
    
    // Gemini 최후 시도
    if (this.geminiService) {
      try {
        console.log('🤖 AI 모델: Gemini (최후 시도)')
        return await this.geminiService.generatePredicates(noun)
      } catch (error) {
        logError('Gemini API failed', error)
      }
    }
    
    // 모든 API 실패 시 로컬 폴백
    console.log('🤖 모든 API 실패 → 로컬 폴백')
    return this.getLocalFallback(noun)
  }

  private async generateWithOpenAI(noun: string): Promise<PredicateCandidate[]> {
    try {
      const prompt = this.createPrompt(noun)
      const response = await this.callOpenAI(prompt)
      
      if (response) {
        console.log('✅ OpenAI 응답 성공')
        const result = this.parseResponse(response)
        console.log(`📝 서술어 ${result.length}개 생성됨`)
        return result
      }
      
      console.log('🤖 OpenAI 응답 없음 → 로컬 폴백')
      return this.getLocalFallback(noun)
    } catch (error) {
      logError('OpenAI API error', error)
      console.log('🤖 OpenAI 오류 → 로컬 폴백')
      return this.getLocalFallback(noun)
    }
  }
  
  private createPrompt(noun: string): string {
    return createPredicatePrompt(noun)
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
      logAiService('OpenAI API 응답 받음', data)
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
      console.error('❌ [OpenAI] JSON 파싱 실패 - 원본 응답:', error)
      console.error('📄 [OpenAI] 받은 전체 응답 내용:')
      console.error('==================== 시작 ====================')
      console.error(response)
      console.error('==================== 끝 =====================')
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
