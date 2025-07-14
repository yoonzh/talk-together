interface PredicateCandidate {
  text: string
  emoji: string
  category: string
}

interface AIResponse {
  predicates: PredicateCandidate[]
  confidence: number
}

export class AIService {
  private static instance: AIService
  private baseUrl: string
  
  private constructor() {
    this.baseUrl = import.meta.env.VITE_AI_API_URL || 'http://localhost:8080/api'
  }
  
  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }
  
  async generatePredicates(noun: string): Promise<PredicateCandidate[]> {
    try {
      // API 호출이 실패하거나 느릴 경우를 대비한 로컬 백업
      const localPredicates = this.getLocalBackupPredicates(noun)
      
      // 실제 AI API 호출
      const response = await this.callAIAPI(noun)
      
      if (response && response.predicates.length > 0) {
        return response.predicates
      }
      
      return localPredicates
    } catch (error) {
      console.error('AI Service error:', error)
      return this.getLocalBackupPredicates(noun)
    }
  }
  
  private async callAIAPI(noun: string): Promise<AIResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/predicates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noun: noun,
          context: '자폐장애인 의사소통 보조',
          language: 'ko',
          maxCandidates: 6
        }),
        signal: AbortSignal.timeout(3000) // 3초 타임아웃
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.warn('AI API call failed:', error)
      return null
    }
  }
  
  private getLocalBackupPredicates(noun: string): PredicateCandidate[] {
    // 간단한 로컬 분석 로직
    const category = this.analyzeNounCategory(noun)
    
    switch (category) {
      case 'place':
        return [
          { text: '에 가고 싶어요', emoji: '🚶', category: 'place' },
          { text: '에 있어요', emoji: '🏠', category: 'place' },
          { text: '이 좋아요', emoji: '😊', category: 'general' },
          { text: '에서 쉬고 싶어요', emoji: '😴', category: 'place' }
        ]
      
      case 'food':
        return [
          { text: '을 먹고 싶어요', emoji: '🍽️', category: 'food' },
          { text: '이 맛있어요', emoji: '😋', category: 'food' },
          { text: '을 주세요', emoji: '🤲', category: 'general' },
          { text: '이 필요해요', emoji: '🤗', category: 'general' }
        ]
      
      case 'activity':
        return [
          { text: '을 하고 싶어요', emoji: '🙌', category: 'activity' },
          { text: '이 좋아요', emoji: '😊', category: 'general' },
          { text: '이 재미있어요', emoji: '😄', category: 'general' },
          { text: '을 배우고 싶어요', emoji: '📚', category: 'activity' }
        ]
      
      case 'person':
        return [
          { text: '가 좋아요', emoji: '😊', category: 'general' },
          { text: '를 만나고 싶어요', emoji: '🤗', category: 'person' },
          { text: '가 보고 싶어요', emoji: '💕', category: 'person' },
          { text: '를 도와주세요', emoji: '🙏', category: 'general' }
        ]
      
      default:
        return [
          { text: '이 좋아요', emoji: '😊', category: 'general' },
          { text: '이 필요해요', emoji: '🤲', category: 'general' },
          { text: '을 원해요', emoji: '🙌', category: 'general' },
          { text: '을 도와주세요', emoji: '🙏', category: 'general' }
        ]
    }
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
    
    // 간단한 휴리스틱 분석
    if (noun.includes('실') || noun.includes('장')) return 'place'
    if (noun.includes('음료') || noun.includes('식')) return 'food'
    if (noun.includes('놀') || noun.includes('게임')) return 'activity'
    
    return 'general'
  }
}

export default AIService.getInstance()