import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initializeDatabase } from './services/database/DatabaseManager'

/**
 * 앱 부트스트랩 - 데이터베이스 초기화 후 React 앱 시작
 */
async function bootstrap() {
  try {
    console.log('🚀 [Bootstrap] 앱 초기화 시작...')
    
    // 데이터베이스 및 캐시 서비스 초기화 (마이그레이션 포함)
    await initializeDatabase()
    
    console.log('✅ [Bootstrap] 데이터베이스 초기화 완료')
    
    // React 앱 마운트
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
    
    console.log('✅ [Bootstrap] React 앱 시작 완료')
    
  } catch (error) {
    console.error('❌ [Bootstrap] 앱 초기화 실패:', error)
    
    // 초기화 실패 시 에러 화면 표시
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    root.render(
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1 style={{ color: '#dc3545', marginBottom: '20px' }}>
          앱 초기화 실패
        </h1>
        <p style={{ color: '#6c757d', textAlign: 'center', maxWidth: '500px' }}>
          데이터베이스 연결에 실패했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.
        </p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          페이지 새로고침
        </button>
        <details style={{ marginTop: '20px', fontSize: '12px', color: '#6c757d' }}>
          <summary>기술적 세부사항</summary>
          <pre style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f1f3f4' }}>
            {error instanceof Error ? error.message : String(error)}
          </pre>
        </details>
      </div>
    )
  }
}

// HMR 지원 (개발 환경)
if (import.meta.hot) {
  import.meta.hot.accept()
  
  // Hot reload 시 로그
  import.meta.hot.dispose(() => {
    console.log('🔄 [HMR] 모듈 교체 - 데이터베이스 연결 유지됨')
  })
}

// 앱 시작
bootstrap()