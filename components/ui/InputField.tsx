import type { ChangeEventHandler, ReactNode } from 'react'

type BaseFieldProps = {
  label: string
  name: string
  description?: string
  id?: string
  required?: boolean
  error?: string | null
  children?: ReactNode
}

type InputVariant =
  | {
      as?: 'input'
      type?: string
      value?: string
      onChange?: ChangeEventHandler<HTMLInputElement>
      placeholder?: string
      autoComplete?: string
    }
  | {
      as: 'select'
      value?: string
      onChange?: ChangeEventHandler<HTMLSelectElement>
      options: { label: string; value: string }[]
      autoComplete?: string
    }

type InputFieldProps = BaseFieldProps & InputVariant

export function InputField(props: InputFieldProps) {
  const { label, name, description, required, error, id } = props
  const inputId = id ?? name
  const shared =
    'w-full rounded-xl border bg-surface-muted/80 px-3 py-2 text-sm text-slate-100 transition focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none'
  const borderClass = error ? 'border-amber-500/80' : 'border-white/10'

  return (
    <label className="space-y-1 text-xs text-slate-400" htmlFor={inputId}>
      <span className="uppercase tracking-[0.2em] text-slate-300">{label}</span>
      {props.as === 'select' ? (
        <select
          id={inputId}
          name={name}
          required={required}
          value={props.value}
          onChange={props.onChange}
          autoComplete={props.autoComplete}
          aria-invalid={Boolean(error)}
          className={`${shared} ${borderClass}`}
        >
          <option value="">Select</option>
          {props.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={inputId}
          type={props.type || 'text'}
          name={name}
          required={required}
          value={props.value}
          onChange={props.onChange}
          placeholder={props.placeholder}
          autoComplete={props.autoComplete}
          aria-invalid={Boolean(error)}
          className={`${shared} ${borderClass}`}
        />
      )}
      {description ? (
        <span className="block text-[0.7rem] text-slate-500">{description}</span>
      ) : null}
      {error ? (
        <span className="block text-[0.7rem] text-amber-300">{error}</span>
      ) : null}
    </label>
  )
}
