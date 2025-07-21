import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest'
import { 
  getAIPredicatesWithCache, 
  saveAIPredicatesToCache,
  getTTSAudioWithCache,
  saveTTSAudioToCache
} from '../cacheService'
import { TTSSource } from '../ttsAudioCacheService'

// Mock the cache service dependencies
vi.mock('../tursoClient', () => ({
  getTursoClient: vi.fn()
}))

vi.mock('../aiPredicateCacheService', () => ({
  AIPredicateCacheService: vi.fn()
}))

vi.mock('../ttsAudioCacheService', () => ({
  TTSAudioCacheService: vi.fn(),
  TTSSource: {
    GOOGLE_CLOUD: 'gcp_tts',
    GEMINI_TTS: 'gemini_tts',
    WEB_SPEECH_FALLBACK: 'web_speech_fallback'
  }
}))

describe('Cache Service Helper Functions', () => {
  let mockPredicateService: any
  let mockAudioService: any
  let mockCacheService: any

  beforeEach(() => {
    mockPredicateService = {
      getFromCache: vi.fn(),
      saveToCache: vi.fn(),
      logCacheOperation: vi.fn()
    }

    mockAudioService = {
      getAudioFromCache: vi.fn(),
      saveAudioToCache: vi.fn(),
      logCacheOperation: vi.fn()
    }

    mockCacheService = {
      predicates: mockPredicateService,
      audio: mockAudioService,
      initialize: vi.fn(),
      isInitialized: true
    }

    // Mock the getCacheService function
    vi.doMock('../cacheService', async () => {
      const actual = await vi.importActual('../cacheService')
      return {
        ...actual,
        getCacheService: vi.fn().mockResolvedValue(mockCacheService)
      }
    })
  })

  describe('getAIPredicatesWithCache', () => {
    it('should return cached predicates when found', async () => {
      const mockCached = {
        ai_response: ['수영이 좋아요', '수영장에 가요'],
        model_name: 'gpt-3.5-turbo',
        response_source: 'api'
      }
      mockPredicateService.getFromCache.mockResolvedValue(mockCached)

      const result = await getAIPredicatesWithCache('수영')

      expect(result).toEqual({
        predicates: ['수영이 좋아요', '수영장에 가요'],
        source: 'cache',
        fromCache: true
      })
      expect(mockPredicateService.logCacheOperation).toHaveBeenCalledWith(
        'hit', '수영', { model: 'gpt-3.5-turbo' }
      )
    })

    it('should return empty predicates when cache miss', async () => {
      mockPredicateService.getFromCache.mockResolvedValue(null)

      const result = await getAIPredicatesWithCache('새로운단어')

      expect(result).toEqual({
        predicates: [],
        source: 'api',
        fromCache: false
      })
      expect(mockPredicateService.logCacheOperation).toHaveBeenCalledWith('miss', '새로운단어')
    })

    it('should return fallback on error', async () => {
      mockPredicateService.getFromCache.mockRejectedValue(new Error('Cache error'))

      const result = await getAIPredicatesWithCache('수영')

      expect(result).toEqual({
        predicates: [],
        source: 'fallback',
        fromCache: false
      })
    })
  })

  describe('saveAIPredicatesToCache', () => {
    it('should save API predicates to cache', async () => {
      await saveAIPredicatesToCache('수영', ['수영이 좋아요'], 'gpt-3.5-turbo', true)

      expect(mockPredicateService.saveToCache).toHaveBeenCalledWith(
        '수영', ['수영이 좋아요'], 'gpt-3.5-turbo', true
      )
      expect(mockPredicateService.logCacheOperation).toHaveBeenCalledWith(
        'save', '수영', { model: 'gpt-3.5-turbo', predicates_count: 1 }
      )
    })

    it('should skip fallback predicates', async () => {
      await saveAIPredicatesToCache('수영', ['수영이 좋아요'], 'local_fallback', false)

      expect(mockPredicateService.saveToCache).toHaveBeenCalledWith(
        '수영', ['수영이 좋아요'], 'local_fallback', false
      )
      expect(mockPredicateService.logCacheOperation).toHaveBeenCalledWith(
        'skip', '수영', { model: 'local_fallback', predicates_count: 1 }
      )
    })

    it('should not throw on save error', async () => {
      mockPredicateService.saveToCache.mockRejectedValue(new Error('Save error'))

      await expect(
        saveAIPredicatesToCache('수영', ['수영이 좋아요'], 'gpt-3.5-turbo', true)
      ).resolves.not.toThrow()
    })
  })

  describe('getTTSAudioWithCache', () => {
    it('should return cached audio when found', async () => {
      const mockCached = {
        audio_data: 'base64audiodata',
        tts_provider: 'gcp_tts'
      }
      mockAudioService.getAudioFromCache.mockResolvedValue(mockCached)

      const result = await getTTSAudioWithCache('안녕하세요')

      expect(result).toEqual({
        audioData: 'base64audiodata',
        source: 'cache',
        fromCache: true
      })
      expect(mockAudioService.logCacheOperation).toHaveBeenCalledWith(
        'hit', '안녕하세요', 'gcp_tts'
      )
    })

    it('should return null when cache miss', async () => {
      mockAudioService.getAudioFromCache.mockResolvedValue(null)

      const result = await getTTSAudioWithCache('새로운문장')

      expect(result).toEqual({
        audioData: null,
        source: 'api',
        fromCache: false
      })
      expect(mockAudioService.logCacheOperation).toHaveBeenCalledWith('miss', '새로운문장')
    })

    it('should return fallback on error', async () => {
      mockAudioService.getAudioFromCache.mockRejectedValue(new Error('Cache error'))

      const result = await getTTSAudioWithCache('안녕하세요')

      expect(result).toEqual({
        audioData: null,
        source: 'fallback',
        fromCache: false
      })
    })
  })

  describe('saveTTSAudioToCache', () => {
    it('should save GCP TTS audio to cache', async () => {
      await saveTTSAudioToCache(
        '안녕하세요',
        'base64audiodata',
        { voice: 'ko-KR-Standard-A' },
        TTSSource.GOOGLE_CLOUD,
        2000,
        50000
      )

      expect(mockAudioService.saveAudioToCache).toHaveBeenCalledWith(
        '안녕하세요',
        'base64audiodata',
        { voice: 'ko-KR-Standard-A' },
        TTSSource.GOOGLE_CLOUD,
        2000,
        50000
      )
      expect(mockAudioService.logCacheOperation).toHaveBeenCalledWith(
        'save', '안녕하세요', TTSSource.GOOGLE_CLOUD, {
          duration_ms: 2000,
          size_bytes: 50000
        }
      )
    })

    it('should skip Web Speech fallback audio', async () => {
      await saveTTSAudioToCache(
        '안녕하세요',
        'base64audiodata',
        { voice: 'ko-KR-Standard-A' },
        TTSSource.WEB_SPEECH_FALLBACK,
        2000,
        50000
      )

      expect(mockAudioService.saveAudioToCache).toHaveBeenCalledWith(
        '안녕하세요',
        'base64audiodata',
        { voice: 'ko-KR-Standard-A' },
        TTSSource.WEB_SPEECH_FALLBACK,
        2000,
        50000
      )
      expect(mockAudioService.logCacheOperation).toHaveBeenCalledWith(
        'skip', '안녕하세요', TTSSource.WEB_SPEECH_FALLBACK, {
          duration_ms: 2000,
          size_bytes: 50000
        }
      )
    })

    it('should not throw on save error', async () => {
      mockAudioService.saveAudioToCache.mockRejectedValue(new Error('Save error'))

      await expect(
        saveTTSAudioToCache(
          '안녕하세요',
          'base64audiodata',
          {},
          TTSSource.GOOGLE_CLOUD
        )
      ).resolves.not.toThrow()
    })
  })
})