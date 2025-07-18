import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TextDisplay from '../../components/TextDisplay'

// AIDEV-NOTE: 커서 기능 테스트 - 입력 상태별 커서 스타일 확인
describe('커서 기능 테스트', () => {
  it('입력 대기 상태: vertical bar 커서 표시', () => {
    console.log('=== 입력 대기 상태 커서 테스트 ===')
    
    render(
      <TextDisplay 
        inputText="" 
        selectedPredicate=""
        isComposing={false}
        currentChar={{ initial: '', medial: '', final: '' }}
      />
    )
    
    // vertical bar 커서 확인
    const cursor = screen.getByText('|')
    expect(cursor).toBeInTheDocument()
    
    // 커서 스타일 확인
    const cursorStyle = window.getComputedStyle(cursor)
    expect(cursor).toHaveStyle({ color: '#2196F3' })
    
    console.log('입력 대기 상태 커서 테스트 완료')
  })

  it('한글 조합 중: 블록 스타일 반전 커서', () => {
    console.log('=== 한글 조합 중 커서 테스트 ===')
    
    render(
      <TextDisplay 
        inputText="가" 
        selectedPredicate=""
        isComposing={true}
        currentChar={{ initial: 'ㄱ', medial: 'ㅏ', final: '' }}
      />
    )
    
    // 조합 중인 글자가 블록 스타일로 표시되는지 확인
    const composingChar = screen.getByText('가')
    expect(composingChar).toBeInTheDocument()
    
    // 반전 스타일 확인 (배경색이 있어야 함)
    expect(composingChar).toHaveStyle({ 
      backgroundColor: '#2196F3',
      color: '#ffffff'
    })
    
    console.log('한글 조합 중 커서 테스트 완료')
  })

  it('조합 완성 후: vertical bar 커서 표시', () => {
    console.log('=== 조합 완성 후 커서 테스트 ===')
    
    render(
      <TextDisplay 
        inputText="안녕" 
        selectedPredicate=""
        isComposing={false}
        currentChar={{ initial: '', medial: '', final: '' }}
      />
    )
    
    // 완성된 텍스트 확인
    const completedText = screen.getByText('안녕')
    expect(completedText).toBeInTheDocument()
    
    // vertical bar 커서 확인
    const cursor = screen.getByText('|')
    expect(cursor).toBeInTheDocument()
    
    console.log('조합 완성 후 커서 테스트 완료')
  })

  it('초성만 입력된 상태: 블록 스타일 표시', () => {
    console.log('=== 초성만 입력 상태 테스트 ===')
    
    render(
      <TextDisplay 
        inputText="ㄱ" 
        selectedPredicate=""
        isComposing={true}
        currentChar={{ initial: 'ㄱ', medial: '', final: '' }}
      />
    )
    
    // 초성이 블록 스타일로 표시되는지 확인
    const initialChar = screen.getByText('ㄱ')
    expect(initialChar).toBeInTheDocument()
    
    // 반전 스타일 확인
    expect(initialChar).toHaveStyle({ 
      backgroundColor: '#2196F3',
      color: '#ffffff'
    })
    
    console.log('초성만 입력 상태 테스트 완료')
  })

  it('텍스트와 서술어 모두 있을 때 커서 위치', () => {
    console.log('=== 텍스트+서술어 커서 위치 테스트 ===')
    
    render(
      <TextDisplay 
        inputText="밥" 
        selectedPredicate="이 맛있어요"
        isComposing={false}
        currentChar={{ initial: '', medial: '', final: '' }}
      />
    )
    
    // 텍스트와 서술어 확인
    const inputText = screen.getByText('밥')
    const predicate = screen.getByText('이 맛있어요')
    const cursor = screen.getByText('|')
    
    expect(inputText).toBeInTheDocument()
    expect(predicate).toBeInTheDocument()
    expect(cursor).toBeInTheDocument()
    
    console.log('텍스트+서술어 커서 위치 테스트 완료')
  })

  it('복합 조합 중: ㅘ 입력 상태 커서', () => {
    console.log('=== 복합 모음 조합 중 커서 테스트 ===')
    
    render(
      <TextDisplay 
        inputText="과" 
        selectedPredicate=""
        isComposing={true}
        currentChar={{ initial: 'ㄱ', medial: 'ㅘ', final: '' }}
      />
    )
    
    // 복합 모음이 조합된 글자가 블록 스타일로 표시되는지 확인
    const complexChar = screen.getByText('과')
    expect(complexChar).toBeInTheDocument()
    
    // 반전 스타일 확인
    expect(complexChar).toHaveStyle({ 
      backgroundColor: '#2196F3',
      color: '#ffffff'
    })
    
    console.log('복합 모음 조합 중 커서 테스트 완료')
  })
})