import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import App from '../../App'

describe('App - 기존 단어 유지 테스트', () => {
  it('천지인 입력 기본 테스트', () => {
    render(<App />)
    
    console.log('=== 천지인 입력 테스트 시작 ===')
    
    // 1. ㅂ 버튼 클릭 (초성)
    const bButton = screen.getByText('ㅂㅍ')
    fireEvent.click(bButton)
    console.log('1. ㅂ 클릭 후')
    
    // 텍스트 확인
    let currentText = document.querySelector('[style*="color: rgb(33, 150, 243)"]')?.textContent
    console.log('   현재 파란색 텍스트:', currentText || '없음')
    
    // 2. ㅣ 버튼 클릭 (중성 시작)
    const iButton = screen.getByText('ㅣ')
    fireEvent.click(iButton)
    console.log('2. ㅣ 클릭 후')
    
    currentText = document.querySelector('[style*="color: rgb(33, 150, 243)"]')?.textContent
    console.log('   현재 파란색 텍스트:', currentText || '없음')
    
    // 3. ㆍ 버튼 클릭 (중성 완성: ㅣ + ㆍ = ㅏ)
    const dotButton = screen.getByText('ㆍ')
    fireEvent.click(dotButton)
    console.log('3. ㆍ 클릭 후 (바가 나와야 함)')
    
    currentText = document.querySelector('[style*="color: rgb(33, 150, 243)"]')?.textContent
    console.log('   현재 파란색 텍스트:', currentText || '없음')
    
    // 4. ㅂ 버튼 다시 클릭 (종성)
    fireEvent.click(bButton)
    console.log('4. ㅂ 종성 클릭 후 (밥이 나와야 함)')
    
    const finalText = document.querySelector('[style*="color: rgb(33, 150, 243)"]')?.textContent
    console.log('   최종 파란색 텍스트:', finalText || '없음')
    
    console.log('=== 천지인 입력 테스트 완료 ===')
    
    // 실제 텍스트가 있는지 검증
    expect(finalText).toBeTruthy()
    expect(finalText).toBe('밥')
  })
  
  it('핵심 문제 테스트: 말하기 → ㄱ버튼 → 키입력 시 단어 유지', async () => {
    render(<App />)
    
    console.log('=== 핵심 문제 테스트 시작 ===')
    
    // 1. "밥" 입력
    const bButton = screen.getByText('ㅂㅍ')
    const iButton = screen.getByText('ㅣ')
    const dotButton = screen.getByText('ㆍ')
    
    fireEvent.click(bButton)  // ㅂ
    fireEvent.click(iButton)  // ㅣ
    fireEvent.click(dotButton) // ㆍ -> ㅏ
    fireEvent.click(bButton)  // ㅂ (종성)
    
    let currentText = document.querySelector('[style*="color: rgb(33, 150, 243)"]')?.textContent
    console.log('1. "밥" 입력 완료:', currentText)
    expect(currentText).toBe('밥')
    
    // 2. 말하기 버튼(🗣️) 클릭
    const speakButton = screen.getByText('🗣️')
    fireEvent.click(speakButton)
    console.log('2. 말하기 버튼 클릭 완료')
    
    // 텍스트가 여전히 있는지 확인
    currentText = document.querySelector('[style*="color: rgb(33, 150, 243)"]')?.textContent
    console.log('   말하기 버튼 클릭 후 텍스트:', currentText)
    
    // 3. ㄱ버튼이 활성화되었는지 확인하고 클릭
    const keyboardToggleButton = screen.getByText('ㄱ')
    console.log('3. ㄱ버튼 상태:', keyboardToggleButton.disabled ? 'disabled' : 'enabled')
    
    fireEvent.click(keyboardToggleButton)
    console.log('   ㄱ버튼 클릭 완료')
    
    // 텍스트가 여전히 있는지 확인
    currentText = document.querySelector('[style*="color: rgb(33, 150, 243)"]')?.textContent
    console.log('   ㄱ버튼 클릭 후 텍스트:', currentText)
    
    // 4. 잠시 대기 후 키보드에서 아무 키나 입력 (setTimeout 때문에)
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const euButton = screen.getByText('ㅡ')
    fireEvent.click(euButton)
    console.log('4. ㅡ 키 입력 후')
    
    // 여기서 "밥"이 사라지면 안됨
    currentText = document.querySelector('[style*="color: rgb(33, 150, 243)"]')?.textContent
    console.log('   키 입력 후 텍스트:', currentText)
    
    console.log('=== 핵심 문제 테스트 완료 ===')
    
    // 핵심 검증: "밥"이 여전히 있어야 함
    console.log('최종 검증 - 현재 텍스트:', currentText)
    expect(currentText).toContain('밥')
  })
  
  it('말하기 버튼 상태 변화 추적', () => {
    render(<App />)
    
    // 말하기 버튼 찾기
    const speakButton = screen.getByText('🗣️')
    console.log('말하기 버튼 초기 상태:', speakButton.disabled ? 'disabled' : 'enabled')
    
    // ㄱ버튼 찾기
    const keyboardToggleButton = screen.getByText('ㄱ')
    console.log('ㄱ버튼 초기 상태:', keyboardToggleButton.disabled ? 'disabled' : 'enabled')
    
    // 말하기 버튼 클릭 시뮬레이션 (텍스트가 없어도)
    fireEvent.click(speakButton)
    console.log('말하기 버튼 클릭 후 ㄱ버튼 상태:', keyboardToggleButton.disabled ? 'disabled' : 'enabled')
  })
  
  it('shouldClearOnNextInput 상태 변화 추적 테스트', () => {
    // App 컴포넌트의 내부 상태를 확인하기 위한 테스트
    const { container } = render(<App />)
    
    // 초기 상태에서는 키보드가 보여야 함
    const keyboard = container.querySelector('[data-testid="cheongjiinKeyboard"]') || 
                    container.querySelector('div') // 키보드 컨테이너 찾기
    
    console.log('초기 키보드 상태:', keyboard ? '보임' : '숨겨짐')
    
    // 말하기 버튼 클릭 시뮬레이션
    const speakButton = screen.getByText('🗣️')
    fireEvent.click(speakButton)
    
    console.log('말하기 버튼 클릭 후 키보드 상태 변화 예상')
    
    // ㄱ버튼 클릭 시뮬레이션
    const keyboardToggleButton = screen.getByText('ㄱ')
    fireEvent.click(keyboardToggleButton)
    
    console.log('ㄱ버튼 클릭 후 키보드 복귀 예상')
  })
})