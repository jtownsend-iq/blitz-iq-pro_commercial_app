"use client"

import { useRef, useState, useEffect, useId } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export type SelectProps = {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  className?: string
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  error,
  label,
  className = '',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)
  const selectId = useId()

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          // Set initial highlighted to current selection when opening
          const currentIndex = options.findIndex((opt) => opt.value === value)
          setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0)
        } else {
          const option = options[highlightedIndex]
          if (option && !option.disabled) {
            onChange(option.value)
            setIsOpen(false)
            buttonRef.current?.focus()
          }
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        buttonRef.current?.focus()
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex((prev) => {
            const next = prev + 1
            return next >= options.length ? 0 : next
          })
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex((prev) => {
            const next = prev - 1
            return next < 0 ? options.length - 1 : next
          })
        }
        break
      case 'Home':
        e.preventDefault()
        setHighlightedIndex(0)
        break
      case 'End':
        e.preventDefault()
        setHighlightedIndex(options.length - 1)
        break
    }
  }

  // Scroll highlighted option into view
  useEffect(() => {
    if (!isOpen) return
    const listbox = listboxRef.current
    const highlighted = listbox?.querySelector(`[data-index="${highlightedIndex}"]`)
    highlighted?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex, isOpen])

  const borderColor = error
    ? 'border-red-500/50'
    : isOpen
    ? 'border-brand'
    : 'border-white/10'

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-[0.8rem] font-medium text-slate-200"
        >
          {label}
        </label>
      )}

      <button
        ref={buttonRef}
        id={selectId}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border ${borderColor} bg-white/5 px-3 py-2.5 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60 ${
          isOpen ? 'ring-2 ring-brand/30' : ''
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? `${selectId}-label` : undefined}
      >
        <span className={selectedOption ? 'text-slate-100' : 'text-slate-500'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform motion-reduce:transition-none ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul
          ref={listboxRef}
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-white/10 bg-slate-900/95 py-1 shadow-[0_18px_45px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value
            const isHighlighted = index === highlightedIndex

            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                data-index={index}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value)
                    setIsOpen(false)
                    buttonRef.current?.focus()
                  }
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm transition motion-reduce:transition-none ${
                  option.disabled
                    ? 'cursor-not-allowed opacity-40'
                    : isHighlighted
                    ? 'bg-brand/10 text-slate-50'
                    : 'text-slate-200 hover:bg-white/5'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <Check className="h-4 w-4 text-brand" aria-hidden="true" />
                )}
              </li>
            )
          })}
        </ul>
      )}

      {error && (
        <p className="mt-1.5 text-[0.7rem] text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
