// Platform AI Service - OpenAI GPT-4.1-mini 직접 프롬프트 호출
// AIDEV-NOTE: 기존 AI 서비스 완전 대체용 - 직접 프롬프트 기반 단순 구현

import OpenAI from 'openai'
import { getAIPredicatesWithCache, saveAIResponseToCache } from './database/cacheService'

export interface PredicateCandidate {
  text: string
  emoji: string
  category: string
}

// 직접 프롬프트 템플릿
const SYSTEM_PROMPT = `# You are a communication aid system for people with autism (intelligence level 4-7 years old) who cannot speak.
For each user input, generate 10 candidate natural and pragmatic sentences that conform to Korean grammar.
The generated sentences will be used by the disabled person to communicate their intentions to the non-disabled person.

## Important ordering requirements:
1. 20% of the generated sentences must be in the form of a request and appear first (예: 나 가고 싶어요, 해 주세요, 도와 주세요 등).
2. Next, list sentiment expressions related to the user's input (예: 좋아해요, 싫어요 등). However, if it is awkward or inappropriate to express an emotion for the user input, omit these.
3. If you express an emotion, also generate a sentence expressing the opposite emotion.
4. The remaining sentences should express status, characteristics, or other relevant information.
5. Group and display sentences by category, in the specified order: 요청, 감정, 상태/특성 등.

## General requirements:
1. Use sentences that are frequently needed in daily life.
2. Make all sentences simple and easy to understand.
3. For each sentence, also provide a corresponding sentence with the opposite meaning (where applicable).
4. Create an emoji that matches the predicate of the sentence.
5. Do not generate the same sentence in multiple categories.
6. Output both text and category only in Hangul/Korean.
7. Do not include any emoji in the out text and category.
8. Use one word for category, not two.

## Output Format
The output must be a JSON object in the following format:
{
  "predicates": [
    {"text": "자동차를 타고 가요", "emoji": "🚗", "category": "이동"}
  ]
}
- The sentences must be strictly grouped and ordered as above by category: requests first (요청), followed by sentiment (감정), then status/characteristics (상태/특성). Sentences irrelevant to a category should not be generated.
- Each "category" must be a string in Korean. Each "text" field must be simple Korean suitable for the user's age and daily communication needs.
- No emoji must be included anywhere in the output.
- The total number of sentences across all categories must be 15.
- If expressing emotion is awkward or inappropriate for the user input, omit the 감정 category.`;

export class PlatformAIService {
  private openai: OpenAI
  
  constructor() {
    const apiKey = import.meta.env.OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY || ''
    
    if (!apiKey) {
      console.warn('⚠️ [Platform AI] OpenAI API 키가 설정되지 않았습니다')
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // 브라우저에서 실행을 위한 설정
    })
    
    console.log(`🚀 [Platform AI] 서비스 초기화: gpt-4.1-mini 직접 프롬프트`)
  }
  
  // 메인 서술어 생성 메서드 - 기존 AIService와 동일한 시그니처
  async generatePredicates(noun: string): Promise<PredicateCandidate[]> {
    const startTime = Date.now()
    
    try {
      console.log(`🔍 [Platform AI] 서술어 생성 요청: "${noun}"`)
      
      // 1. 캐시 확인 (기존 시스템 활용)
      const cached = await this.checkCache(noun)
      if (cached) {
        const processingTime = Date.now() - startTime
        console.log(`🎯 [Platform AI] 캐시 적중: "${noun}" (${processingTime}ms)`)
        return cached
      }
      
      // 2. OpenAI API 직접 호출
      const response = await this.callOpenAI(noun)
      
      // 3. 응답 파싱
      const predicates = this.parseResponse(response)
      
      if (predicates.length === 0) {
        throw new Error('파싱된 서술어가 없습니다')
      }
      
      // 4. 캐시 저장 (기존 시스템 활용)
      await this.saveToCache(noun, predicates)
      
      const processingTime = Date.now() - startTime
      console.log(`✅ [Platform AI] 서술어 생성 성공: "${noun}" (${predicates.length}개, ${processingTime}ms)`)
      
      return predicates
      
    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error(`❌ [Platform AI] 서술어 생성 실패: "${noun}" (${processingTime}ms)`, error)
      
      // 실패 시 빈 배열 반환 (기존 시스템과 동일)
      return []
    }
  }
  
  // OpenAI Chat Completions API 직접 호출
  private async callOpenAI(noun: string): Promise<any> {
    console.log(`🤖 [Platform AI] API 호출 시작: ${noun}`)
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: noun
          }
        ],
        max_tokens: 2048,
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
      
      console.log(`📥 [Platform AI] API 응답 수신: ${JSON.stringify(response).substring(0, 200)}...`)
      return response
      
    } catch (error) {
      console.error(`❌ [Platform AI] OpenAI API 오류:`, error)
      throw new Error(`OpenAI API 오류: ${error}`)
    }
  }
  
  // 응답 파싱 - OpenAI Chat Completions 응답 형식 처리
  private parseResponse(response: any): PredicateCandidate[] {
    try {
      // OpenAI Chat Completions 응답 구조: response.choices[0].message.content
      if (response.choices && response.choices.length > 0) {
        const content = response.choices[0].message?.content
        if (content) {
          return this.parseJSONString(content)
        }
      }
      
      // 전체 응답을 JSON 문자열로 시도
      const responseString = JSON.stringify(response)
      return this.parseJSONString(responseString)
      
    } catch (error) {
      console.error(`❌ [Platform AI] 응답 파싱 실패:`, error)
      console.error(`📄 [Platform AI] 원본 응답:`, response)
      return []
    }
  }
  
  // JSON 문자열 파싱
  private parseJSONString(jsonString: string): PredicateCandidate[] {
    try {
      // JSON 코드 블록 제거
      const cleaned = jsonString.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      
      // predicates 배열 확인
      if (parsed.predicates && Array.isArray(parsed.predicates)) {
        return this.parsePredicateArray(parsed.predicates)
      }
      
      // 직접 배열인 경우
      if (Array.isArray(parsed)) {
        return this.parsePredicateArray(parsed)
      }
      
      return []
    } catch (error) {
      console.warn(`⚠️ [Platform AI] JSON 파싱 실패: ${jsonString.substring(0, 100)}...`)
      return []
    }
  }
  
  // PredicateCandidate 배열 정규화
  private parsePredicateArray(array: any[]): PredicateCandidate[] {
    return array
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        text: (item.text || item.predicate || '').toString().trim(),
        emoji: (item.emoji || item.icon || '😊').toString().trim(),
        category: (item.category || item.type || 'general').toString().trim()
      }))
      .filter(predicate => predicate.text.length > 0) // 빈 텍스트 제외
  }
  
  // 캐시 확인 (기존 시스템 활용)
  private async checkCache(noun: string): Promise<PredicateCandidate[] | null> {
    try {
      const cacheResult = await getAIPredicatesWithCache(noun)
      
      if (cacheResult.fromCache) {
        const modelName = cacheResult.modelName || ''
        
        // gpt-4.1-mini 모델로 생성된 캐시 우선 사용
        if (modelName.includes('gpt-4.1-mini')) {
          return cacheResult.response
        }
        
        // 다른 모델의 캐시도 사용 가능 (성능을 위해)
        console.log(`🔄 [Platform AI] 다른 모델 캐시 사용: ${modelName}`)
        return cacheResult.response
      }
      
      return null
    } catch (error) {
      console.warn(`⚠️ [Platform AI] 캐시 확인 실패:`, error)
      return null
    }
  }
  
  // 캐시 저장 (기존 시스템 활용)
  private async saveToCache(noun: string, predicates: PredicateCandidate[]): Promise<void> {
    try {
      const modelName = `gpt-4.1-mini`
      
      await saveAIResponseToCache(noun, predicates, modelName, true)
      console.log(`💾 [Platform AI] 캐시 저장 완료: "${noun}" (${predicates.length}개)`)
      
    } catch (error) {
      console.warn(`⚠️ [Platform AI] 캐시 저장 실패:`, error)
      // 캐시 저장 실패는 치명적이지 않으므로 계속 진행
    }
  }
  
  // 설정 정보 조회
  public getConfig(): {
    model: string
    hasApiKey: boolean
  } {
    return {
      model: "gpt-4.1-mini",
      hasApiKey: !!this.openai.apiKey
    }
  }
  
  // 모델 정보 출력
  public getModelInfo(): string {
    return "gpt-4.1-mini with direct prompt"
  }
  
  // API 연결 테스트 (개발용)
  public async testAPI(): Promise<boolean> {
    try {
      await this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: "테스트"
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
      
      console.log(`✅ [Platform AI] API 테스트 성공: gpt-4.1-mini`)
      return true
    } catch (error) {
      console.error(`❌ [Platform AI] API 테스트 실패: gpt-4.1-mini`, error)
      return false
    }
  }
}

// 싱글톤 인스턴스 생성
export default new PlatformAIService()