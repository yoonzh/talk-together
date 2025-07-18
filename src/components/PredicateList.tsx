import React, { useState, useEffect } from 'react'
import openaiService from '../services/openaiService'

const getCategoryKorean = (category: string): string => {
  const categoryMap: Record<string, string> = {
    'place': '장소',
    'food': '음식',
    'activity': '활동',
    'person': '사람',
    'general': '일반'
  }
  return categoryMap[category] || category
}

interface PredicateCandidate {
  text: string
  emoji: string
  category: string
}

interface PredicateListProps {
  inputText: string
  onPredicateSelect: (predicate: string) => void
  shouldGenerate?: boolean
}

const PredicateList: React.FC<PredicateListProps> = ({ inputText, onPredicateSelect, shouldGenerate = false }) => {
  const [predicates, setPredicates] = useState<PredicateCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const generatePredicates = async () => {
      if (!inputText.trim() || !shouldGenerate) {
        setPredicates([])
        return
      }
      
      setLoading(true)
      setError(null)
      
      try {
        const aiPredicates = await openaiService.generatePredicates(inputText.trim())
        setPredicates(aiPredicates)
      } catch (err) {
        setError('서술어 생성에 실패했습니다')
        console.error('Predicate generation error:', err)
      } finally {
        setLoading(false)
      }
    }
    
    if (shouldGenerate) {
      generatePredicates()
    } else {
      setPredicates([])
    }
  }, [inputText, shouldGenerate])

  return (
    <div style={{
      flex: 1,
      padding: '20px',
      backgroundColor: '#f9f9f9',
      overflowY: 'auto',
      minHeight: 0 /* flex 자식에서 스크롤 활성화 */
    }}>
      {loading && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100px',
          fontSize: '18px',
          color: '#666'
        }}>
          <div style={{ marginRight: '10px' }}>🤖</div>
          AI가 서술어를 생성하고 있습니다...
        </div>
      )}
      
      {error && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100px',
          fontSize: '18px',
          color: '#ff6b6b'
        }}>
          <div style={{ marginRight: '10px' }}>⚠️</div>
          {error}
        </div>
      )}
      
      {!loading && !error && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          {predicates.map((predicate, index) => (
            <button
              key={index}
              onClick={() => onPredicateSelect(predicate.text)}
              style={{
                padding: '20px',
                fontSize: '18px',
                fontWeight: 'bold',
                backgroundColor: '#ffffff',
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f8ff'
                e.currentTarget.style.borderColor = '#2196F3'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff'
                e.currentTarget.style.borderColor = '#e0e0e0'
              }}
            >
              <div style={{ fontSize: '32px' }}>{predicate.emoji}</div>
              <div style={{ color: '#333' }}>{inputText}{predicate.text}</div>
              <div style={{ 
                fontSize: '12px', 
                color: '#888',
                opacity: 0.7
              }}>
                {getCategoryKorean(predicate.category)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default PredicateList