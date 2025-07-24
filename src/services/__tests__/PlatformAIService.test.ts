// Platform AI Service 테스트
// AIDEV-NOTE: OpenAI Platform Prompt API 연동 테스트

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PlatformAIService, PredicateCandidate } from '../PlatformAIService'

// Mock fetch
global.fetch = vi.fn()

// Mock 환경 변수
vi.mock('../../utils/logger', () => ({
  logError: vi.fn(),
  logAiService: vi.fn()
}))

describe('PlatformAIService', () => {
  let service: PlatformAIService
  const mockApiKey = 'test-api-key'
  const mockPromptId = 'test-prompt-id'
  const mockPromptVersion = '1'

  beforeEach(() => {
    vi.clearAllMocks()
    // 환경 변수 모킹
    import.meta.env.OPENAI_API_KEY = mockApiKey
    
    service = new PlatformAIService(mockPromptId, mockPromptVersion)
  })

  describe('generatePredicates', () => {
    it('성공적으로 서술어를 생성해야 함', async () => {
      const mockResponse = {
        completion: JSON.stringify({
          predicates: [
            { text: '을 먹고 싶어요', emoji: '🍽️', category: '요청' },
            { text: '이 맛있어요', emoji: '😋', category: '맛' }
          ]
        })
      }

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as any)

      const result = await service.generatePredicates('밥')

      expect(result).toEqual([
        { text: '을 먹고 싶어요', emoji: '🍽️', category: '요청' },
        { text: '이 맛있어요', emoji: '😋', category: '맛' }
      ])

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/responses',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockApiKey}`
          },
          body: JSON.stringify({
            prompt: {
              id: mockPromptId,
              version: mockPromptVersion
            },
            variables: {
              user_input: '밥'
            }
          })
        })
      )
    })

    it('API 오류 시 빈 배열을 반환해야 함', async () => {
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request')
      } as any)

      const result = await service.generatePredicates('테스트')

      expect(result).toEqual([])
    })

    it('JSON 파싱 실패 시 빈 배열을 반환해야 함', async () => {
      const mockResponse = {
        completion: 'invalid json'
      }

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as any)

      const result = await service.generatePredicates('테스트')

      expect(result).toEqual([])
    })

    it('response 필드에서 데이터를 파싱할 수 있어야 함', async () => {
      const mockResponse = {
        response: JSON.stringify({
          predicates: [
            { text: '을 하고 싶어요', emoji: '🙌', category: '요청' }
          ]
        })
      }

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as any)

      const result = await service.generatePredicates('운동')

      expect(result).toEqual([
        { text: '을 하고 싶어요', emoji: '🙌', category: '요청' }
      ])
    })

    it('data 필드에서 구조화된 응답을 파싱할 수 있어야 함', async () => {
      const mockResponse = {
        data: {
          predicates: [
            { text: '에 가고 싶어요', emoji: '🚶', category: '이동' }
          ]
        }
      }

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as any)

      const result = await service.generatePredicates('학교')

      expect(result).toEqual([
        { text: '에 가고 싶어요', emoji: '🚶', category: '이동' }
      ])
    })

    it('빈 문자열 입력 시 빈 배열을 반환해야 함', async () => {
      const result = await service.generatePredicates('')
      expect(result).toEqual([])
    })

    it('공백만 있는 문자열 입력 시 빈 배열을 반환해야 함', async () => {
      const result = await service.generatePredicates('   ')
      expect(result).toEqual([])
    })
  })

  describe('파싱 테스트', () => {
    it('필수 필드가 없는 항목을 필터링해야 함', async () => {
      const mockResponse = {
        completion: JSON.stringify({
          predicates: [
            { text: '정상 항목', emoji: '😊', category: '테스트' },
            { text: '', emoji: '😊', category: '테스트' }, // 빈 텍스트
            { emoji: '😊', category: '테스트' }, // 텍스트 누락
            { text: '완전한 항목', emoji: '🎯', category: '완료' }
          ]
        })
      }

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as any)

      const result = await service.generatePredicates('테스트')

      expect(result).toEqual([
        { text: '정상 항목', emoji: '😊', category: '테스트' },
        { text: '완전한 항목', emoji: '🎯', category: '완료' }
      ])
    })

    it('기본값을 적용해야 함', async () => {
      const mockResponse = {
        completion: JSON.stringify({
          predicates: [
            { text: '텍스트만 있음' },
            { text: '이모지 없음', category: '카테고리' }
          ]
        })
      }

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as any)

      const result = await service.generatePredicates('테스트')

      expect(result).toEqual([
        { text: '텍스트만 있음', emoji: '😊', category: 'general' },
        { text: '이모지 없음', emoji: '😊', category: '카테고리' }
      ])
    })
  })

  describe('설정 관리', () => {
    it('설정 정보를 반환해야 함', () => {
      const config = service.getConfig()

      expect(config).toEqual({
        promptId: mockPromptId,
        promptVersion: mockPromptVersion,
        hasApiKey: true
      })
    })

    it('프롬프트 설정을 업데이트할 수 있어야 함', () => {
      const newPromptId = 'new-prompt-id'
      const newPromptVersion = '2'

      service.updatePrompt(newPromptId, newPromptVersion)

      const config = service.getConfig()
      expect(config.promptId).toBe(newPromptId)
      expect(config.promptVersion).toBe(newPromptVersion)
    })
  })
})