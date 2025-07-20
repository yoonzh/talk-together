// AIDEV-NOTE: 도움말 표시 컴포넌트 - 설정 명령어 가이드와 AI 프롬프트 표시
// "도움말" 명령어 실행 시 서술어 목록 영역에 표시되는 도움말 UI

import React from 'react'
import { getDisplayPrompt } from '../utils/promptTemplates'

export const HelpDisplay: React.FC = () => {
  const aiPrompt = getDisplayPrompt()

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f9f9f9',
      maxHeight: '400px',
      overflowY: 'auto'
    }}>
      <h3 style={{ 
        color: '#2196F3', 
        marginBottom: '20px',
        textAlign: 'center',
        fontSize: '20px'
      }}>
        ⚙️ 설정 명령어 도움말
      </h3>
      
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ color: '#333', fontSize: '16px', marginBottom: '10px' }}>🔄 자동완성 설정</h4>
        <ul style={{ marginLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
          <li><code style={{ backgroundColor: '#e8f4f8', padding: '2px 6px', borderRadius: '3px' }}>글자완성5초</code> - 5초 후 자동완성</li>
          <li><code style={{ backgroundColor: '#e8f4f8', padding: '2px 6px', borderRadius: '3px' }}>글자완성0초</code> - 자동완성 비활성화</li>
          <li><code style={{ backgroundColor: '#e8f4f8', padding: '2px 6px', borderRadius: '3px' }}>글자완성3초</code> - 3초 후 자동완성</li>
        </ul>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ color: '#333', fontSize: '16px', marginBottom: '10px' }}>🤖 AI 모델 변경</h4>
        <ul style={{ marginLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
          <li><code style={{ backgroundColor: '#e8f4f8', padding: '2px 6px', borderRadius: '3px' }}>챗지피티</code> - ChatGPT 사용</li>
          <li><code style={{ backgroundColor: '#e8f4f8', padding: '2px 6px', borderRadius: '3px' }}>제미나이</code> - Gemini 사용</li>
        </ul>
      </div>

      <div style={{ marginBottom: '25px' }}>
        <h4 style={{ color: '#333', fontSize: '16px', marginBottom: '10px' }}>❓ 기타</h4>
        <ul style={{ marginLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
          <li><code style={{ backgroundColor: '#e8f4f8', padding: '2px 6px', borderRadius: '3px' }}>도움말</code> - 이 도움말 표시</li>
        </ul>
      </div>
      
      <div style={{ 
        marginTop: '25px', 
        padding: '15px', 
        backgroundColor: '#fff3cd',
        borderRadius: '8px',
        border: '1px solid #ffeaa7'
      }}>
        <h4 style={{ color: '#856404', marginBottom: '10px', fontSize: '14px' }}>💡 AI에게 전달되는 프롬프트</h4>
        <div style={{ 
          fontSize: '10px', 
          color: '#6c5600',
          backgroundColor: '#fffbf0',
          padding: '10px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          lineHeight: '1.4',
          whiteSpace: 'pre-wrap',
          maxHeight: '150px',
          overflowY: 'auto',
          border: '1px solid #f1c40f'
        }}>
          {aiPrompt}
        </div>
      </div>
    </div>
  )
}