import type { ChangeEventHandler, ReactNode } from 'react'

type BaseFieldProps = {
  label: string
  name: string
  description?: string
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
  const { label, name, description, required, error } = props
  const shared =
    'w-full rounded-xl border bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30'
  const borderClass = error ? 'border-amber-500' : 'border-white/10'

  return (
    <label className="space-y-1 text-xs text-slate-400">
      <span className="uppercase tracking-[0.2em] text-slate-300">{label}</span>
      {props.as === 'select' ? (
        <select
          name={name}
          required={required}
          value={props.value}
          onChange={props.onChange}
          autoComplete={props.autoComplete}
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
          type={props.type || 'text'}
          name={name}
          required={required}
          value={props.value}
          onChange={props.onChange}
          placeholder={props.placeholder}
          autoComplete={props.autoComplete}
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
