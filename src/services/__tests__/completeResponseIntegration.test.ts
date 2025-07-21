import { describe, it, expect, beforeEach } from 'vitest'
import { AIPredicateCacheService, type PredicateCandidate } from '../database/aiPredicateCacheService'
import { TursoClient } from '../database/tursoClient'

// Mock TursoClient for testing
class MockTursoClient {
  private storage: Map<string, any> = new Map()
  
  async query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
    if (sql.includes('SELECT * FROM ai_predicate_cache')) {
      const inputWord = params[0]
      const cached = this.storage.get(`cache_${inputWord}`)
      return { rows: cached ? [cached] : [] }
    }
    return { rows: [] }
  }
  
  async execute(sql: string, params: any[] = []): Promise<{ rowsAffected?: number }> {
    if (sql.includes('INSERT INTO ai_predicate_cache')) {
      const [inputWord, responseJson, modelName] = params
      const row = {
        id: Date.now(),
        input_word: inputWord,
        ai_response: responseJson,
        model_name: modelName,
        response_source: 'api',
        response_hash: 'test-hash',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        access_count: 1,
        last_accessed_at: new Date().toISOString()
      }
      this.storage.set(`cache_${inputWord}`, row)
      return { rowsAffected: 1 }
    }
    if (sql.includes('UPDATE ai_predicate_cache')) {
      return { rowsAffected: 1 }
    }
    return { rowsAffected: 0 }
  }
  
  async getSettings(): Promise<{ ai_cache_duration_months: string }> {
    return { ai_cache_duration_months: '3' }
  }
}

describe('Complete Response Integration', () => {
  let cacheService: AIPredicateCacheService
  let mockClient: MockTursoClient

  beforeEach(() => {
    mockClient = new MockTursoClient()
    cacheService = new AIPredicateCacheService(mockClient as any)
  })

  it('should save and retrieve complete responses', async () => {
    await cacheService.initialize()

    // Test complete response data
    const completeResponse: PredicateCandidate[] = [
      { text: '물을 마시고 싶어요', emoji: '🥤', category: 'food' },
      { text: '물이 필요해요', emoji: '💧', category: 'general' },
      { text: '물을 주세요', emoji: '🙏', category: 'request' }
    ]

    // Save complete response
    await cacheService.saveToCache('물', completeResponse, 'gpt-3.5-turbo', true)

    // Retrieve from cache
    const cached = await cacheService.getFromCache('물')

    expect(cached).not.toBeNull()
    expect(cached?.ai_response).toBeDefined()
    expect(cached?.ai_response).toHaveLength(3)
    expect(cached?.ai_response?.[0]).toEqual({
      text: '물을 마시고 싶어요',
      emoji: '🥤',
      category: 'food'
    })
  })

  it('should handle complete responses with metadata', async () => {
    await cacheService.initialize()

    // Test complete response with rich metadata
    const completeResponse: PredicateCandidate[] = [
      { text: '물을 마셔요', emoji: '🥤', category: 'food' },
      { text: '물이 좋아요', emoji: '👍', category: 'general' }
    ]

    // Save complete response
    await cacheService.saveToCache('물', completeResponse, 'gpt-3.5-turbo', true)

    // Retrieve from cache
    const cached = await cacheService.getFromCache('물')

    expect(cached).not.toBeNull()
    expect(cached?.ai_response).toEqual(completeResponse)
    expect(cached?.ai_response[0].emoji).toBe('🥤')
    expect(cached?.ai_response[1].category).toBe('general')
  })

  it('should store and retrieve JSON responses correctly', async () => {
    await cacheService.initialize()

    // Mock client to return JSON responses
    const mockRow = {
      id: 1,
      input_word: '물',
      ai_response: '[{"text":"물을 마시고 싶어요","emoji":"🥤","category":"food"}]',
      model_name: 'gpt-3.5-turbo',
      response_source: 'api',
      response_hash: 'test-hash',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      access_count: 1,
      last_accessed_at: new Date().toISOString()
    }
    mockClient['storage'].set('cache_물', mockRow)

    const cached = await cacheService.getFromCache('물')

    expect(cached).not.toBeNull()
    expect(cached?.ai_response).toBeDefined()
    expect(cached?.ai_response).toHaveLength(1)
    expect(cached?.ai_response?.[0].text).toBe('물을 마시고 싶어요')
    expect(cached?.ai_response?.[0].emoji).toBe('🥤')
    expect(cached?.ai_response?.[0].category).toBe('food')
  })
})