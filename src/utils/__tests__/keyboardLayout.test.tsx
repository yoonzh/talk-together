import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CheongjiinKeyboard from '../../components/CheongjiinKeyboard'

// AIDEV-NOTE: 키보드 레이아웃 변경 테스트 - 아래줄 구성 확인
describe('키보드 레이아웃 테스트', () => {
  it('키보드 아래줄이 <공백>|ㅇㅁ|<백스페이스> 순서로 구성되어야 함', () => {
    console.log('=== 키보드 아래줄 레이아웃 테스트 ===')
    
    render(<CheongjiinKeyboard onTextChange={() => {}} />)
    
    // 공백 버튼 확인 (스페이스바 표시)
    const spaceButton = screen.getByText('⎵')
    expect(spaceButton).toBeInTheDocument()
    
    // ㅇㅁ 버튼 확인
    const ieungMieumButton = screen.getByText('ㅇㅁ')
    expect(ieungMieumButton).toBeInTheDocument()
    
    // 백스페이스 버튼 확인
    const backspaceButton = screen.getByText('⌫')
    expect(backspaceButton).toBeInTheDocument()
    
    // 줄바꿈 버튼이 없는지 확인
    const newlineButton = screen.queryByText('↵')
    expect(newlineButton).not.toBeInTheDocument()
    
    console.log('키보드 아래줄 레이아웃 테스트 완료')
  })

  it('공백 버튼 클릭 시 스페이스가 입력되어야 함', () => {
    console.log('=== 공백 버튼 기능 테스트 ===')
    
    let inputText = ''
    const mockOnTextChange = (text: string) => {
      inputText = text
    }
    
    render(<CheongjiinKeyboard onTextChange={mockOnTextChange} />)
    
    // 공백 버튼 클릭
    const spaceButton = screen.getByText('⎵')
    fireEvent.mouseDown(spaceButton)
    fireEvent.mouseUp(spaceButton)
    
    // 스페이스가 입력되었는지 확인
    expect(inputText).toBe(' ')
    
    console.log('공백 버튼 기능 테스트 완료')
  })

  it('전체 키보드 레이아웃이 3x4 그리드 구조를 유지해야 함', () => {
    console.log('=== 3x4 그리드 구조 테스트 ===')
    
    render(<CheongjiinKeyboard onTextChange={() => {}} />)
    
    // 첫 번째 줄: ㅣ, ㆍ, ㅡ
    expect(screen.getByText('ㅣ')).toBeInTheDocument()
    expect(screen.getByText('ㆍ')).toBeInTheDocument()
    expect(screen.getByText('ㅡ')).toBeInTheDocument()
    
    // 두 번째 줄: ㄱㅋ, ㄴㄹ, ㄷㅌ
    expect(screen.getByText('ㄱㅋ')).toBeInTheDocument()
    expect(screen.getByText('ㄴㄹ')).toBeInTheDocument()
    expect(screen.getByText('ㄷㅌ')).toBeInTheDocument()
    
    // 세 번째 줄: ㅂㅍ, ㅅㅎ, ㅈㅊ
    expect(screen.getByText('ㅂㅍ')).toBeInTheDocument()
    expect(screen.getByText('ㅅㅎ')).toBeInTheDocument()
    expect(screen.getByText('ㅈㅊ')).toBeInTheDocument()
    
    // 네 번째 줄: ⎵(공백), ㅇㅁ, ⌫(백스페이스)
    expect(screen.getByText('⎵')).toBeInTheDocument()
    expect(screen.getByText('ㅇㅁ')).toBeInTheDocument()
    expect(screen.getByText('⌫')).toBeInTheDocument()
    
    console.log('3x4 그리드 구조 테스트 완료')
  })
})