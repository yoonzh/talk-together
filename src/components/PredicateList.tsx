import React, { useState, useEffect } from 'react'
import openaiService from '../services/openaiService'


interface PredicateCandidate {
  text: string
  emoji: string
  category: string
}

interface PredicateListProps {
  inputText: string
  onPredicateSelect: (predicate: string) => void
  shouldGenerate?: boolean
  forcePredicatesClear?: boolean
  onPredicatesCleared?: () => void
}

const PredicateList: React.FC<PredicateListProps> = ({ 
  inputText, 
  onPredicateSelect, 
  shouldGenerate = false, 
  forcePredicatesClear = false,
  onPredicatesCleared
}) => {
  const [predicates, setPredicates] = useState<PredicateCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelSwitchMessage, setModelSwitchMessage] = useState<string | null>(null)
  
  // AIDEV-NOTE: 강제로 서술어 목록 지우기 처리
  useEffect(() => {
    if (forcePredicatesClear) {
      setPredicates([])
      onPredicatesCleared?.()
    }
  }, [forcePredicatesClear, onPredicatesCleared])

  useEffect(() => {
    const generatePredicates = async () => {
      if (!inputText.trim() || !shouldGenerate) {
        // AIDEV-NOTE: shouldGenerate가 false일 때 기존 목록을 유지하여 사용자가 다른 서술어를 선택할 수 있도록 함
        if (!inputText.trim()) {
          setPredicates([])
        }
        return
      }
      
      setLoading(true)
      setError(null)
      
      try {
        const aiPredicates = await openaiService.generatePredicates(inputText.trim())
        
        // 모델 전환 키워드인 경우 빈 배열이 반환되므로 UI 메시지 처리
        const normalized = inputText.trim().toLowerCase()
        if ((normalized === '챗지피티' || normalized === 'chatgpt') && aiPredicates.length === 0) {
          setModelSwitchMessage('이제부터 똑똑이로 ChatGPT를 사용합니다.')
          setTimeout(() => setModelSwitchMessage(null), 5000)
        } else if ((normalized === '제미나이' || normalized === 'gemini') && aiPredicates.length === 0) {
          setModelSwitchMessage('이제부터 똑똑이로 Gemini를 사용합니다.')
          setTimeout(() => setModelSwitchMessage(null), 5000)
        }
        
        setPredicates(aiPredicates)
      } catch (err) {
        setError('서술어 생성에 실패했습니다')
      } finally {
        setLoading(false)
      }
    }
    
    if (shouldGenerate) {
      generatePredicates()
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
      {modelSwitchMessage && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '120px',
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#2196F3',
          backgroundColor: '#e3f2fd',
          border: '2px solid #2196F3',
          borderRadius: '12px',
          margin: '20px',
          animation: 'fadeIn 0.5s ease-in-out'
        }}>
          <style>
            {`
              @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
              }
            `}
          </style>
          <span style={{ marginRight: '10px' }}>🤖</span>
          {modelSwitchMessage}
        </div>
      )}

      {loading && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100px',
          fontSize: '18px',
          color: '#666'
        }}>
          <style>
            {`
              @keyframes loadingDots {
                0%, 20% { opacity: 0; }
                50% { opacity: 1; }
                80%, 100% { opacity: 0; }
              }
              .loading-dot-1 { animation: loadingDots 1.4s infinite 0s; }
              .loading-dot-2 { animation: loadingDots 1.4s infinite 0.2s; }
              .loading-dot-3 { animation: loadingDots 1.4s infinite 0.4s; }
            `}
          </style>
          🤖 똑똑이가 어떤 말을 할지 생각 중이에요
          <span className="loading-dot-1">.</span>
          <span className="loading-dot-2">.</span>
          <span className="loading-dot-3">.</span>
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
              <div style={{ color: '#333' }}>{predicate.text}</div>
              <div style={{ 
                fontSize: '12px', 
                color: '#888',
                opacity: 0.7
              }}>
                {predicate.category}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default PredicateList
