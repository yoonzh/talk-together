import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest'
import { AIPredicateCacheService } from '../aiPredicateCacheService'
import { TursoClient } from '../tursoClient'

describe('AIPredicateCacheService', () => {
  let service: AIPredicateCacheService
  let mockClient: TursoClient

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      execute: vi.fn(),
      getSettings: vi.fn().mockResolvedValue({ ai_cache_duration_months: '3' })
    } as any

    service = new AIPredicateCacheService(mockClient)
  })

  describe('initialize', () => {
    it('should initialize with default cache duration', async () => {
      await service.initialize()
      expect(mockClient.getSettings).toHaveBeenCalled()
    })
  })

  describe('getFromCache', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should return cache when found', async () => {
      const mockCacheData = {
        rows: [{
          id: 1,
          input_word: '수영',
          ai_response: '["수영이 좋아요", "수영장에 가고싶어요"]',
          model_name: 'gpt-3.5-turbo',
          response_source: 'api',
          response_hash: 'hash123',
          created_at: '2024-01-15T10:00:00Z',
          expires_at: '2024-04-15T10:00:00Z',
          access_count: 5,
          last_accessed_at: '2024-01-20T10:00:00Z'
        }]
      }

      ;(mockClient.query as MockedFunction<any>).mockResolvedValue(mockCacheData)
      ;(mockClient.execute as MockedFunction<any>).mockResolvedValue({ rowsAffected: 1 })

      const result = await service.getFromCache('수영')

      expect(result).toBeTruthy()
      expect(result?.input_word).toBe('수영')
      expect(result?.ai_response).toEqual(['수영이 좋아요', '수영장에 가고싶어요'])
      expect(result?.model_name).toBe('gpt-3.5-turbo')
      
      // 접근 정보 업데이트 확인
      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE ai_predicate_cache'),
        [1]
      )
    })

    it('should return null when cache not found', async () => {
      ;(mockClient.query as MockedFunction<any>).mockResolvedValue({ rows: [] })

      const result = await service.getFromCache('존재하지않는단어')

      expect(result).toBeNull()
    })

    it('should return null when error occurs', async () => {
      ;(mockClient.query as MockedFunction<any>).mockRejectedValue(new Error('DB Error'))

      const result = await service.getFromCache('수영')

      expect(result).toBeNull()
    })
  })

  describe('saveToCache', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should save API response to cache', async () => {
      ;(mockClient.query as MockedFunction<any>)
        .mockResolvedValueOnce({ rows: [] }) // 중복 체크
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // manageCacheSize용 count

      ;(mockClient.execute as MockedFunction<any>).mockResolvedValue({ rowsAffected: 1 })

      await service.saveToCache('수영', ['수영이 좋아요', '수영장에 가요'], 'gpt-3.5-turbo', true)

      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ai_predicate_cache'),
        expect.arrayContaining([
          '수영',
          '["수영이 좋아요","수영장에 가요"]',
          'gpt-3.5-turbo',
          'api'
        ])
      )
    })

    it('should not save fallback response to cache', async () => {
      await service.saveToCache('수영', ['수영이 좋아요'], 'local_fallback', false)

      expect(mockClient.execute).not.toHaveBeenCalled()
    })

    it('should skip duplicate responses', async () => {
      ;(mockClient.query as MockedFunction<any>).mockResolvedValue({ 
        rows: [{ id: 1 }] // 중복 존재
      })

      await service.saveToCache('수영', ['수영이 좋아요'], 'gpt-3.5-turbo', true)

      expect(mockClient.execute).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ai_predicate_cache'),
        expect.any(Array)
      )
    })
  })

  describe('cleanExpiredCache', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should delete expired cache entries', async () => {
      ;(mockClient.execute as MockedFunction<any>).mockResolvedValue({ rowsAffected: 5 })

      const deletedCount = await service.cleanExpiredCache()

      expect(deletedCount).toBe(5)
      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM ai_predicate_cache')
      )
    })

    it('should return 0 when no expired entries', async () => {
      ;(mockClient.execute as MockedFunction<any>).mockResolvedValue({ rowsAffected: 0 })

      const deletedCount = await service.cleanExpiredCache()

      expect(deletedCount).toBe(0)
    })
  })

  describe('getCacheStats', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should return cache statistics', async () => {
      const mockStats = [
        { rows: [{ count: 100 }] },      // total_entries
        { rows: [{ hits: 50 }] },        // cache_hits_today
        { rows: [{ size_mb: 2.5 }] },    // cache_size_mb
        { rows: [{ oldest: '2024-01-01T00:00:00Z', newest: '2024-01-20T00:00:00Z' }] } // dates
      ]

      ;(mockClient.query as MockedFunction<any>)
        .mockResolvedValueOnce(mockStats[0])
        .mockResolvedValueOnce(mockStats[1])
        .mockResolvedValueOnce(mockStats[2])
        .mockResolvedValueOnce(mockStats[3])

      const stats = await service.getCacheStats()

      expect(stats).toEqual({
        total_entries: 100,
        cache_hits_today: 50,
        cache_size_mb: 2.5,
        oldest_entry: '2024-01-01T00:00:00Z',
        newest_entry: '2024-01-20T00:00:00Z'
      })
    })
  })

  describe('getPopularWords', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should return popular words', async () => {
      const mockPopularWords = {
        rows: [
          { word: '수영', count: 25 },
          { word: '밥', count: 20 },
          { word: '놀이', count: 15 }
        ]
      }

      ;(mockClient.query as MockedFunction<any>).mockResolvedValue(mockPopularWords)

      const popularWords = await service.getPopularWords(3)

      expect(popularWords).toEqual([
        { word: '수영', count: 25 },
        { word: '밥', count: 20 },
        { word: '놀이', count: 15 }
      ])
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY input_word'),
        [3]
      )
    })
  })

  describe('logCacheOperation', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should log cache operations', async () => {
      ;(mockClient.execute as MockedFunction<any>).mockResolvedValue({ rowsAffected: 1 })

      await service.logCacheOperation('hit', '수영', { model: 'gpt-3.5-turbo' })

      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO usage_logs'),
        expect.arrayContaining([
          'ai_cache_hit',
          '수영',
          expect.any(String),
          true,
          true
        ])
      )
    })

    it('should not throw on logging failure', async () => {
      ;(mockClient.execute as MockedFunction<any>).mockRejectedValue(new Error('Log failed'))

      await expect(service.logCacheOperation('miss', '수영')).resolves.not.toThrow()
    })
  })
})