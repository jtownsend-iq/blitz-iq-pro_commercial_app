import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { useId } from 'react'

type BaseFieldProps = {
  label: string
  name: string
  description?: string
  required?: boolean
  error?: string | null
  helperAction?: ReactNode
  id?: string
  fullWidth?: boolean
}

type InputVariant =
  | (BaseFieldProps &
      Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'id' | 'children'> & {
        as?: 'input'
      })
  | (BaseFieldProps &
      Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name' | 'id' | 'children'> & {
        as: 'select'
        options: { label: string; value: string }[]
      })
  | (BaseFieldProps &
      Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name' | 'id' | 'children'> & {
        as: 'textarea'
      })

export type InputFieldProps = InputVariant

const fieldBase =
  'w-full rounded-xl border bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed'
const borderClasses = {
  default: 'border-white/10',
  error: 'border-amber-500/80',
}

export function InputField(props: InputFieldProps) {
  const { label, name, description, required, error, helperAction, id, fullWidth } = props
  const autoId = useId()
  const inputId = id ?? `${name}-${autoId}`
  const describedBy = [
    description ? `${inputId}-description` : null,
    error ? `${inputId}-error` : null,
  ]
    .filter(Boolean)
    .join(' ')

  const sharedProps = {
    id: inputId,
    name,
    required,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy || undefined,
  }

  const fieldClasses = `${fieldBase} ${error ? borderClasses.error : borderClasses.default}`

  let control: ReactNode
  if (props.as === 'select') {
    const selectProps = { ...(props as Extract<InputFieldProps, { as: 'select' }>) }
    const { options } = selectProps
    delete (selectProps as Partial<InputFieldProps> & Record<string, unknown>).options
    delete (selectProps as Partial<InputFieldProps> & Record<string, unknown>).label
    delete (selectProps as Partial<InputFieldProps> & Record<string, unknown>).name
    delete (selectProps as Partial<InputFieldProps> & Record<string, unknown>).description
    delete (selectProps as Partial<InputFieldProps> & Record<string, unknown>).required
    delete (selectProps as Partial<InputFieldProps> & Record<string, unknown>).error
    delete (selectProps as Partial<InputFieldProps> & Record<string, unknown>).helperAction
    delete (selectProps as Partial<InputFieldProps> & Record<string, unknown>).id
    delete (selectProps as Partial<InputFieldProps> & Record<string, unknown>).fullWidth
    delete (selectProps as Partial<InputFieldProps> & Record<string, unknown>).as
    const elementProps = selectProps as Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name' | 'id' | 'children'>
    control = (
      <select
        {...sharedProps}
        className={fieldClasses}
        {...elementProps}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  } else if (props.as === 'textarea') {
    const textareaProps = { ...(props as Extract<InputFieldProps, { as: 'textarea' }>) }
    delete (textareaProps as Partial<InputFieldProps> & Record<string, unknown>).label
    delete (textareaProps as Partial<InputFieldProps> & Record<string, unknown>).name
    delete (textareaProps as Partial<InputFieldProps> & Record<string, unknown>).description
    delete (textareaProps as Partial<InputFieldProps> & Record<string, unknown>).required
    delete (textareaProps as Partial<InputFieldProps> & Record<string, unknown>).error
    delete (textareaProps as Partial<InputFieldProps> & Record<string, unknown>).helperAction
    delete (textareaProps as Partial<InputFieldProps> & Record<string, unknown>).id
    delete (textareaProps as Partial<InputFieldProps> & Record<string, unknown>).fullWidth
    delete (textareaProps as Partial<InputFieldProps> & Record<string, unknown>).as
    const elementProps = textareaProps as Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name' | 'id' | 'children'>
    const rows = elementProps.rows ?? 4
    control = (
      <textarea
        {...sharedProps}
        rows={rows}
        className={`${fieldClasses} resize-none`}
        {...elementProps}
      />
    )
  } else {
    const inputProps = { ...(props as Extract<InputFieldProps, { as?: 'input' }>) }
    delete (inputProps as Partial<InputFieldProps> & Record<string, unknown>).label
    delete (inputProps as Partial<InputFieldProps> & Record<string, unknown>).name
    delete (inputProps as Partial<InputFieldProps> & Record<string, unknown>).description
    delete (inputProps as Partial<InputFieldProps> & Record<string, unknown>).required
    delete (inputProps as Partial<InputFieldProps> & Record<string, unknown>).error
    delete (inputProps as Partial<InputFieldProps> & Record<string, unknown>).helperAction
    delete (inputProps as Partial<InputFieldProps> & Record<string, unknown>).id
    delete (inputProps as Partial<InputFieldProps> & Record<string, unknown>).fullWidth
    delete (inputProps as Partial<InputFieldProps> & Record<string, unknown>).as
    const elementProps = inputProps as Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'id' | 'children'>
    const type = elementProps.type ?? 'text'
    control = (
      <input
        {...sharedProps}
        type={type}
        className={fieldClasses}
        {...elementProps}
      />
    )
  }

  return (
    <label
      className={`flex flex-col gap-1 text-xs text-slate-400 ${fullWidth ? 'w-full' : ''}`}
      htmlFor={inputId}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="uppercase tracking-[0.18em] text-slate-300">
          {label}
          {required ? <span className="text-amber-300"> *</span> : null}
        </span>
        {helperAction ? <span className="text-[0.7rem] text-slate-400">{helperAction}</span> : null}
      </div>
      {control}
      {description ? (
        <span id={`${inputId}-description`} className="text-[0.7rem] text-slate-500">
          {description}
        </span>
      ) : null}
      {error ? (
        <span id={`${inputId}-error`} className="text-[0.7rem] text-amber-300" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}
