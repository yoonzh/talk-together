import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CheongjiinKeyboard from '../../components/CheongjiinKeyboard'

// AIDEV-NOTE: "콜라" 입력 테스트 - 종성 후 초성 입력 문제 해결 확인
describe('콜라 입력 테스트', () => {
  it('콜라 입력: 종성 ㄹ 후 초성 ㄹ 정상 입력', () => {
    console.log('=== 콜라 입력 테스트 ===')
    
    let inputText = ''
    const mockOnTextChange = (text: string) => {
      inputText = text
      console.log(`텍스트 변경: "${text}"`)
    }
    
    render(<CheongjiinKeyboard onTextChange={mockOnTextChange} />)
    
    // 키보드 버튼들
    const gButton = screen.getByText('ㄱㅋ')
    const nrButton = screen.getByText('ㄴㄹ') 
    const dotButton = screen.getByText('ㆍ')
    const euButton = screen.getByText('ㅡ')
    const iButton = screen.getByText('ㅣ')
    const spaceButton = screen.getByText('⎵')
    
    // 1. "콜" 입력
    console.log('1. 콜 입력 시작')
    
    // ㅋ (ㄱ을 두번 클릭)
    fireEvent.click(gButton)
    fireEvent.click(gButton)
    console.log('1-1. ㅋ 입력 완료')
    
    // ㅗ (ㆍ + ㅡ)
    fireEvent.click(dotButton)
    fireEvent.click(euButton)
    console.log('1-2. ㅗ 입력 완료')
    
    // ㄹ (종성)
    fireEvent.click(nrButton)
    fireEvent.click(nrButton) // ㄹ
    console.log('1-3. 종성 ㄹ 입력 완료')
    
    expect(inputText).toBe('콜')
    console.log('콜 입력 검증 완료')
    
    // 2. space키로 조합 완성 (공백 없이)
    console.log('2. space키로 조합 완성')
    fireEvent.click(spaceButton)
    
    expect(inputText).toBe('콜') // 공백이 추가되지 않아야 함
    console.log('조합 완성 검증 완료')
    
    // 3. "라" 입력
    console.log('3. 라 입력 시작')
    
    // ㄹ (초성)
    fireEvent.click(nrButton)
    fireEvent.click(nrButton) // ㄹ
    console.log('3-1. 초성 ㄹ 입력 완료')
    
    // ㅏ (ㅣ + ㆍ)
    fireEvent.click(iButton)
    fireEvent.click(dotButton)
    console.log('3-2. ㅏ 입력 완료')
    
    expect(inputText).toBe('콜라')
    console.log('콜라 입력 검증 완료')
    
    // 4. 완성 상태에서 space키 두 번 (첫 번째: 조합 완성, 두 번째: 띄어쓰기 추가)
    console.log('4. 완성 상태에서 space키 연속 입력 테스트')
    fireEvent.click(spaceButton) // 첫 번째: "라" 조합 완성
    fireEvent.click(spaceButton) // 두 번째: 띄어쓰기 추가
    
    expect(inputText).toBe('콜라 ')
    console.log('띄어쓰기 추가 검증 완료')
  })

  it('조합 중 space키 동작: 초성만 있을 때', () => {
    console.log('=== 초성만 있을 때 space키 테스트 ===')
    
    let inputText = ''
    const mockOnTextChange = (text: string) => {
      inputText = text
    }
    
    render(<CheongjiinKeyboard onTextChange={mockOnTextChange} />)
    
    const gButton = screen.getByText('ㄱㅋ')
    const spaceButton = screen.getByText('⎵')
    
    // 초성 ㄱ만 입력
    fireEvent.click(gButton)
    expect(inputText).toBe('ㄱ')
    
    // space키 - 초성만으로는 조합 완성되지 않음
    fireEvent.click(spaceButton)
    expect(inputText).toBe('') // 불완전한 조합은 제거됨
    
    console.log('초성만 있을 때 space키 테스트 완료')
  })

  it('조합 중 space키 동작: 초성+중성 종성 대기 상태', () => {
    console.log('=== 종성 대기 상태 space키 테스트 ===')
    
    let inputText = ''
    const mockOnTextChange = (text: string) => {
      inputText = text
    }
    
    render(<CheongjiinKeyboard onTextChange={mockOnTextChange} />)
    
    const gButton = screen.getByText('ㄱㅋ')
    const iButton = screen.getByText('ㅣ')
    const dotButton = screen.getByText('ㆍ')
    const spaceButton = screen.getByText('⎵')
    
    // "가" 상태 (종성 입력 대기)
    fireEvent.click(gButton) // ㄱ
    fireEvent.click(iButton) // ㅣ
    fireEvent.click(dotButton) // ㆍ -> ㅏ
    
    expect(inputText).toBe('가')
    
    // space키로 조합 완성 (공백 없이)
    fireEvent.click(spaceButton)
    expect(inputText).toBe('가')
    
    console.log('종성 대기 상태 space키 테스트 완료')
  })
})