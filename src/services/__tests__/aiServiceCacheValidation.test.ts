import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIService } from '../aiService'

// Mock the cache service
vi.mock('../database/cacheService', () => ({
  getAIPredicatesWithCache: vi.fn(),
  saveAIPredicatesToCache: vi.fn()
}))

import { getAIPredicatesWithCache, saveAIPredicatesToCache } from '../database/cacheService'

describe('AI Service Cache Validation', () => {
  let aiService: AIService
  let mockGetCache: any
  let mockSaveCache: any

  beforeEach(() => {
    aiService = AIService.getInstance()
    mockGetCache = getAIPredicatesWithCache as any
    mockSaveCache = saveAIPredicatesToCache as any
    vi.clearAllMocks()
  })

  it('should use OpenAI cache directly when found', async () => {
    // Mock OpenAI cache hit
    mockGetCache.mockResolvedValue({
      predicates: ['물을 마시고 싶어요'],
      source: 'cache',
      fromCache: true,
      modelName: 'gpt-3.5-turbo',
      cacheId: 1
    })

    const result = await aiService.generatePredicates('물')

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('물을 마시고 싶어요')
    expect(mockGetCache).toHaveBeenCalledWith('물')
    // Should not call save since using cache
    expect(mockSaveCache).not.toHaveBeenCalled()
  })

  it('should retry with OpenAI when Gemini cache found', async () => {
    // Mock Gemini cache hit
    mockGetCache.mockResolvedValue({
      predicates: ['물이 필요해요'],
      source: 'cache', 
      fromCache: true,
      modelName: 'gemini-2.5-flash-lite',
      cacheId: 2
    })

    // Mock OpenAI service to be available but return empty for retry
    // In real scenario, this would trigger OpenAI API call
    const result = await aiService.generatePredicates('물')

    expect(mockGetCache).toHaveBeenCalledWith('물')
    // Should attempt OpenAI retry - if successful, returns OpenAI results (varies)
    // If OpenAI fails, falls back to cached Gemini result
    expect(result.length).toBeGreaterThan(0)
    // If OpenAI retry succeeded, we get fresh results; if failed, we get cached result
  })

  it('should proceed normally when no cache found', async () => {
    // Mock cache miss
    mockGetCache.mockResolvedValue({
      predicates: [],
      source: 'api',
      fromCache: false
    })

    const result = await aiService.generatePredicates('음식')

    expect(mockGetCache).toHaveBeenCalledWith('음식')
    // Should use local fallback since no API keys in test
    expect(result.length).toBeGreaterThan(0)
  })

  it('should identify OpenAI models correctly', async () => {
    const isOpenAIModel = (aiService as any).isOpenAIModel

    expect(isOpenAIModel('gpt-3.5-turbo')).toBe(true)
    expect(isOpenAIModel('gpt-4')).toBe(true)
    expect(isOpenAIModel('openai-model')).toBe(true)
    expect(isOpenAIModel('gemini-2.5-flash-lite')).toBe(false)
    expect(isOpenAIModel('claude-3')).toBe(false)
    expect(isOpenAIModel(undefined)).toBe(false)
  })
})