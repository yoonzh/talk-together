import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest'
import { TursoClient } from '../tursoClient'
import { createClient } from '@libsql/client'

// createClient 모킹
vi.mock('@libsql/client')
const mockCreateClient = createClient as MockedFunction<typeof createClient>

describe('TursoClient', () => {
  let client: TursoClient
  let mockLibsqlClient: any

  beforeEach(() => {
    // Mock LibSQL client
    mockLibsqlClient = {
      execute: vi.fn(),
      batch: vi.fn(),
      close: vi.fn()
    }
    
    mockCreateClient.mockReturnValue(mockLibsqlClient)
    
    client = new TursoClient({
      url: 'libsql://test-database.turso.io',
      authToken: 'test-token'
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('connect', () => {
    it('should connect successfully', async () => {
      mockLibsqlClient.execute.mockResolvedValue({ rows: [{ '1': 1 }] })

      await client.connect()

      expect(mockCreateClient).toHaveBeenCalledWith({
        url: 'libsql://test-database.turso.io',
        authToken: 'test-token'
      })
      expect(mockLibsqlClient.execute).toHaveBeenCalledWith('SELECT 1')
      expect(client.isHealthy).toBe(true)
    })

    it('should throw error on connection failure', async () => {
      mockLibsqlClient.execute.mockRejectedValue(new Error('Connection failed'))

      await expect(client.connect()).rejects.toThrow('데이터베이스 연결 실패')
      expect(client.isHealthy).toBe(false)
    })
  })

  describe('query', () => {
    beforeEach(async () => {
      mockLibsqlClient.execute.mockResolvedValue({ rows: [{ '1': 1 }] })
      await client.connect()
    })

    it('should execute query successfully', async () => {
      const mockResult = { rows: [{ id: 1, name: 'test' }] }
      mockLibsqlClient.execute.mockResolvedValue(mockResult)

      const result = await client.query('SELECT * FROM test WHERE id = ?', [1])

      expect(mockLibsqlClient.execute).toHaveBeenCalledWith({
        sql: 'SELECT * FROM test WHERE id = ?',
        args: [1]
      })
      expect(result).toEqual(mockResult)
    })

    it('should throw error when not connected', async () => {
      await client.disconnect()

      await expect(client.query('SELECT 1')).rejects.toThrow('데이터베이스가 연결되지 않았습니다')
    })
  })

  describe('batch', () => {
    beforeEach(async () => {
      mockLibsqlClient.execute.mockResolvedValue({ rows: [{ '1': 1 }] })
      await client.connect()
    })

    it('should execute batch statements successfully', async () => {
      const statements = [
        { sql: 'INSERT INTO test (name) VALUES (?)', args: ['test1'] },
        { sql: 'INSERT INTO test (name) VALUES (?)', args: ['test2'] }
      ]
      const mockResults = [{ rowsAffected: 1 }, { rowsAffected: 1 }]
      mockLibsqlClient.batch.mockResolvedValue(mockResults)

      const results = await client.batch(statements)

      expect(mockLibsqlClient.batch).toHaveBeenCalledWith(statements)
      expect(results).toEqual(mockResults)
    })
  })

  describe('healthCheck', () => {
    beforeEach(async () => {
      mockLibsqlClient.execute.mockResolvedValue({ rows: [{ '1': 1 }] })
      await client.connect()
    })

    it('should return true when healthy', async () => {
      mockLibsqlClient.execute.mockResolvedValue({ rows: [{ health_check: 1 }] })

      const isHealthy = await client.healthCheck()

      expect(isHealthy).toBe(true)
      expect(mockLibsqlClient.execute).toHaveBeenCalledWith({
        sql: 'SELECT 1 as health_check',
        args: []
      })
    })

    it('should return false when unhealthy', async () => {
      mockLibsqlClient.execute.mockRejectedValue(new Error('Health check failed'))

      const isHealthy = await client.healthCheck()

      expect(isHealthy).toBe(false)
    })
  })

  describe('getSettings', () => {
    beforeEach(async () => {
      mockLibsqlClient.execute.mockResolvedValue({ rows: [{ '1': 1 }] })
      await client.connect()
    })

    it('should return settings from database', async () => {
      const mockSettings = {
        rows: [
          { setting_key: 'ai_cache_duration_months', setting_value: '3' },
          { setting_key: 'tts_cache_max_size_mb', setting_value: '100' }
        ]
      }
      mockLibsqlClient.execute.mockResolvedValue(mockSettings)

      const settings = await client.getSettings()

      expect(settings).toEqual({
        ai_cache_duration_months: '3',
        tts_cache_max_size_mb: '100'
      })
    })

    it('should return default settings when table not exists', async () => {
      mockLibsqlClient.execute.mockRejectedValue(new Error('Table not found'))

      const settings = await client.getSettings()

      expect(settings).toEqual({
        ai_cache_duration_months: '3',
        tts_cache_max_size_mb: '100',
        cache_cleanup_interval_hours: '24'
      })
    })
  })

  describe('updateSetting', () => {
    beforeEach(async () => {
      mockLibsqlClient.execute.mockResolvedValue({ rows: [{ '1': 1 }] })
      await client.connect()
    })

    it('should update setting successfully', async () => {
      mockLibsqlClient.execute.mockResolvedValue({ rowsAffected: 1 })

      await client.updateSetting('test_key', 'test_value')

      expect(mockLibsqlClient.execute).toHaveBeenCalledWith({
        sql: expect.stringContaining('INSERT OR REPLACE INTO system_settings'),
        args: ['test_key', 'test_value']
      })
    })
  })

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      mockLibsqlClient.execute.mockResolvedValue({ rows: [{ '1': 1 }] })
      await client.connect()

      await client.disconnect()

      expect(mockLibsqlClient.close).toHaveBeenCalled()
      expect(client.isHealthy).toBe(false)
    })
  })
})