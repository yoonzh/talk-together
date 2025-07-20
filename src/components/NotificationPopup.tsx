// AIDEV-NOTE: 시스템 설정 변경 알림 팝업 컴포넌트
// 자동완성 설정, AI 모델 변경 등의 명령어 실행 후 3초간 표시되는 피드백 팝업

import React, { useEffect } from 'react'

interface NotificationPopupProps {
  message: string | null
  duration?: number
  onClose: () => void
}

export const NotificationPopup: React.FC<NotificationPopupProps> = ({ 
  message, 
  duration = 3000,
  onClose 
}) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [message, duration, onClose])

  if (!message) return null
  
  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#e3f2fd',
      border: '2px solid #2196F3',
      borderRadius: '12px',
      padding: '20px 30px',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#2196F3',
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      animation: 'notificationFadeIn 0.3s ease-out',
      maxWidth: '80%',
      textAlign: 'center'
    }}>
      <style>
        {`
          @keyframes notificationFadeIn {
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
        `}
      </style>
      {message}
    </div>
  )
}