import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OpenAIService } from '../../services/openaiService'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AI 서술어 생성 서비스 간단 테스트', () => {
  let originalInstance: any

  beforeEach(() => {
    // 기존 인스턴스 백업
    // @ts-ignore
    originalInstance = OpenAIService.instance
    // @ts-ignore
    OpenAIService.instance = undefined
    vi.clearAllMocks()
  })

  afterEach(() => {
    // 인스턴스 복원
    // @ts-ignore
    OpenAIService.instance = originalInstance
    vi.unstubAllEnvs()
  })

  describe('기본 동작 테스트', () => {
    it('로컬 폴백 기본 동작', async () => {
      console.log('=== 로컬 폴백 기본 동작 테스트 ===')
      
      vi.stubEnv('VITE_OPENAI_API_KEY', '')
      const service = OpenAIService.getInstance()
      
      const result = await service.generatePredicates('밥')
      
      expect(result).toHaveLength(4)
      expect(result[0]).toHaveProperty('text')
      expect(result[0]).toHaveProperty('emoji')
      expect(result[0]).toHaveProperty('category')
      expect(typeof result[0].text).toBe('string')
      expect(typeof result[0].emoji).toBe('string')
      expect(typeof result[0].category).toBe('string')
      
      console.log('로컬 폴백 테스트 완료:', result[0])
    })

    it('알려진 음식 단어로 테스트', async () => {
      console.log('=== 음식 카테고리 테스트 ===')
      
      vi.stubEnv('VITE_OPENAI_API_KEY', '')
      const service = OpenAIService.getInstance()
      
      const result = await service.generatePredicates('밥')
      
      expect(result).toHaveLength(4)
      const hasValidPredicates = result.every(p => 
        p.text && p.emoji && p.category && 
        typeof p.text === 'string' && 
        typeof p.emoji === 'string' && 
        typeof p.category === 'string'
      )
      expect(hasValidPredicates).toBe(true)
      
      console.log('음식 카테고리 테스트 완료')
    })

    it('API 키 있을 때 API 호출 시도', async () => {
      console.log('=== API 호출 시도 테스트 ===')
      
      vi.stubEnv('VITE_OPENAI_API_KEY', 'test-key')
      
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                predicates: [
                  { text: "밥을 먹어요", emoji: "🍚", category: "음식" },
                  { text: "밥이 맛있어요", emoji: "😋", category: "감정" },
                  { text: "밥을 주세요", emoji: "🤲", category: "요청" },
                  { text: "밥이 필요해요", emoji: "🤗", category: "필요" }
                ]
              })
            }
          }]
        })
      }
      
      mockFetch.mockResolvedValue(mockResponse)
      
      const service = OpenAIService.getInstance()
      const result = await service.generatePredicates('밥')
      
      expect(mockFetch).toHaveBeenCalled()
      expect(result).toHaveLength(4)
      expect(result[0].text).toBe('밥을 먹어요')
      
      console.log('API 호출 테스트 완료')
    })

    it('API 실패 시 폴백', async () => {
      console.log('=== API 실패 폴백 테스트 ===')
      
      vi.stubEnv('VITE_OPENAI_API_KEY', 'test-key')
      mockFetch.mockRejectedValue(new Error('네트워크 오류'))
      
      const service = OpenAIService.getInstance()
      const result = await service.generatePredicates('물')
      
      expect(result).toHaveLength(4)
      expect(result[0]).toHaveProperty('text')
      expect(result[0]).toHaveProperty('emoji')
      expect(result[0]).toHaveProperty('category')
      
      console.log('API 실패 폴백 테스트 완료')
    })
  })

  describe('로깅 테스트', () => {
    it('로그 출력 확인', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      vi.stubEnv('VITE_OPENAI_API_KEY', '')
      const service = OpenAIService.getInstance()
      await service.generatePredicates('테스트')
      
      // 로그가 출력되었는지 확인 (정확한 내용보다는 호출 여부)
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })
})