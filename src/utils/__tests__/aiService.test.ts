import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OpenAIService } from '../../services/openaiService'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AI 서술어 생성 서비스 테스트', () => {
  let openaiService: OpenAIService
  
  beforeEach(() => {
    openaiService = OpenAIService.getInstance()
    vi.clearAllMocks()
    
    // Mock environment variable
    vi.stubEnv('VITE_OPENAI_API_KEY', 'test-api-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('OpenAI API 호출', () => {
    it('성공적인 API 응답으로 서술어 생성', async () => {
      console.log('=== OpenAI API 성공 테스트 ===')
      
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                predicates: [
                  { text: "자동차를 타고 가요", emoji: "🚗", category: "이동" },
                  { text: "자동차가 빨라요", emoji: "💨", category: "특성" },
                  { text: "자동차를 운전해요", emoji: "🚙", category: "행동" },
                  { text: "자동차가 멋져요", emoji: "✨", category: "감정" }
                ]
              })
            }
          }]
        })
      }
      
      mockFetch.mockResolvedValue(mockResponse)
      
      const result = await openaiService.generatePredicates('자동차')
      
      expect(mockFetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': expect.stringContaining('Bearer')
        },
        body: expect.stringContaining('"model":"gpt-3.5-turbo"'),
        signal: expect.any(AbortSignal)
      })
      
      expect(result).toHaveLength(4)
      expect(result[0]).toEqual({
        text: "자동차를 타고 가요",
        emoji: "🚗", 
        category: "이동"
      })
      
      console.log('OpenAI API 성공 테스트 완료')
    })

    it('API 키가 없을 때 로컬 폴백 사용', async () => {
      console.log('=== API 키 없음 로컬 폴백 테스트 ===')
      
      // 새로운 인스턴스 생성을 위해 기존 인스턴스 제거
      // @ts-ignore - private 멤버 접근
      OpenAIService.instance = undefined
      
      // API 키 제거
      vi.stubEnv('VITE_OPENAI_API_KEY', '')
      
      const service = OpenAIService.getInstance()
      const result = await service.generatePredicates('밥')
      
      // 로컬 폴백으로 생성된 결과 확인
      expect(result).toHaveLength(4)
      expect(result[0]).toHaveProperty('text')
      expect(result[0]).toHaveProperty('emoji')
      expect(result[0]).toHaveProperty('category')
      
      // API 호출이 없었음을 확인
      expect(mockFetch).not.toHaveBeenCalled()
      
      console.log('로컬 폴백 테스트 완료')
    })

    it('API 호출 실패 시 로컬 폴백 사용', async () => {
      console.log('=== API 실패 로컬 폴백 테스트 ===')
      
      mockFetch.mockRejectedValue(new Error('네트워크 오류'))
      
      const result = await openaiService.generatePredicates('물')
      
      // 로컬 폴백으로 생성된 결과 확인
      expect(result).toHaveLength(4)
      expect(result[0].text).toContain('물')
      
      console.log('API 실패 폴백 테스트 완료')
    })

    it('잘못된 JSON 응답 시 로컬 폴백 사용', async () => {
      console.log('=== 잘못된 JSON 폴백 테스트 ===')
      
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: '잘못된 JSON 형식'
            }
          }]
        })
      }
      
      mockFetch.mockResolvedValue(mockResponse)
      
      const result = await openaiService.generatePredicates('수영')
      
      // 로컬 폴백으로 생성된 결과 확인
      expect(result).toHaveLength(4)
      expect(result[0].text).toContain('수영')
      
      console.log('잘못된 JSON 폴백 테스트 완료')
    })
  })

  describe('로컬 폴백 시스템', () => {
    beforeEach(() => {
      // 새로운 인스턴스 생성을 위해 기존 인스턴스 제거
      // @ts-ignore - private 멤버 접근
      OpenAIService.instance = undefined
      vi.stubEnv('VITE_OPENAI_API_KEY', '')
    })

    it('음식 카테고리 명사에 대한 서술어 생성', async () => {
      console.log('=== 음식 카테고리 테스트 ===')
      
      const service = OpenAIService.getInstance()
      const result = await service.generatePredicates('빵')
      
      expect(result).toHaveLength(4)
      expect(result.some(p => p.category === '음식')).toBe(true)
      expect(result.some(p => p.text.includes('빵을 먹고 싶어요'))).toBe(true)
      
      console.log('음식 카테고리 테스트 완료')
    })

    it('장소 카테고리 명사에 대한 서술어 생성', async () => {
      console.log('=== 장소 카테고리 테스트 ===')
      
      const service = OpenAIService.getInstance()
      const result = await service.generatePredicates('학교')
      
      expect(result).toHaveLength(4)
      expect(result.some(p => p.category === '장소')).toBe(true)
      expect(result.some(p => p.text.includes('학교에 가고 싶어요'))).toBe(true)
      
      console.log('장소 카테고리 테스트 완료')
    })

    it('활동 카테고리 명사에 대한 서술어 생성', async () => {
      console.log('=== 활동 카테고리 테스트 ===')
      
      const service = OpenAIService.getInstance()
      const result = await service.generatePredicates('운동')
      
      expect(result).toHaveLength(4)
      expect(result.some(p => p.category === '활동')).toBe(true)
      expect(result.some(p => p.text.includes('운동을 하고 싶어요'))).toBe(true)
      
      console.log('활동 카테고리 테스트 완료')
    })

    it('사람 카테고리 명사에 대한 서술어 생성', async () => {
      console.log('=== 사람 카테고리 테스트 ===')
      
      const service = OpenAIService.getInstance()
      const result = await service.generatePredicates('친구')
      
      expect(result).toHaveLength(4)
      expect(result.some(p => p.category === '감정')).toBe(true)
      expect(result.some(p => p.text.includes('친구가 좋아요'))).toBe(true)
      
      console.log('사람 카테고리 테스트 완료')
    })

    it('일반 카테고리 명사에 대한 서술어 생성', async () => {
      console.log('=== 일반 카테고리 테스트 ===')
      
      const service = OpenAIService.getInstance()
      const result = await service.generatePredicates('알수없는단어')
      
      expect(result).toHaveLength(4)
      expect(result.some(p => p.category === '감정')).toBe(true)
      expect(result.some(p => p.text.includes('알수없는단어가 좋아요'))).toBe(true)
      
      console.log('일반 카테고리 테스트 완료')
    })
  })

  describe('조사 처리 시스템', () => {
    beforeEach(() => {
      // @ts-ignore - private 멤버 접근
      OpenAIService.instance = undefined
      vi.stubEnv('VITE_OPENAI_API_KEY', '')
    })

    it('받침 있는 명사의 조사 처리', async () => {
      console.log('=== 받침 있는 명사 조사 처리 테스트 ===')
      
      const service = OpenAIService.getInstance()
      const result = await service.generatePredicates('밥') // 받침 ㅂ
      
      // "을/를" → "을", "이/가" → "이" 변환 확인
      const predicates = result.map(p => p.text)
      expect(predicates.some(text => text.includes('밥을'))).toBe(true)
      expect(predicates.some(text => text.includes('밥이'))).toBe(true)
      
      console.log('받침 있는 명사 조사 처리 완료')
    })

    it('받침 없는 명사의 조사 처리', async () => {
      console.log('=== 받침 없는 명사 조사 처리 테스트 ===')
      
      const service = OpenAIService.getInstance()
      const result = await service.generatePredicates('사과') // 받침 없음
      
      // "을/를" → "를", "이/가" → "가" 변환 확인
      const predicates = result.map(p => p.text)
      expect(predicates.some(text => text.includes('사과를'))).toBe(true)
      expect(predicates.some(text => text.includes('사과가'))).toBe(true)
      
      console.log('받침 없는 명사 조사 처리 완료')
    })
  })

  describe('타임아웃 및 에러 처리', () => {
    it('API 타임아웃 시 로컬 폴백', async () => {
      console.log('=== API 타임아웃 테스트 ===')
      
      // 타임아웃 시뮬레이션
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 6000)) // 5초 타임아웃보다 긴 시간
      )
      
      const result = await openaiService.generatePredicates('컴퓨터')
      
      // 로컬 폴백 결과 확인
      expect(result).toHaveLength(4)
      expect(result[0].text).toContain('컴퓨터')
      
      console.log('API 타임아웃 테스트 완료')
    })

    it('HTTP 오류 상태 시 로컬 폴백', async () => {
      console.log('=== HTTP 오류 상태 테스트 ===')
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: vi.fn()
      })
      
      const result = await openaiService.generatePredicates('책')
      
      // 로컬 폴백 결과 확인
      expect(result).toHaveLength(4)
      expect(result[0].text).toContain('책')
      
      console.log('HTTP 오류 상태 테스트 완료')
    })
  })
})