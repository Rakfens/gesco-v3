// ui/Input.tsx — Input moderne avec labels flottants et états visuels
import React from 'react';

interface InputProps {
  label?: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  success?: string;
  disabled?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  helpText?: string;
  style?: React.CSSProperties;
  className?: string;
  list?: string;
}

export const Input: React.FC<InputProps> = ({
  label, type = 'text', value, onChange, placeholder,
  error, success, disabled = false, required = false,
  icon = null, iconRight = null, helpText,
  style = {}, className, ...props
}) => {
  const borderColor = error ? 'var(--danger)' : success ? 'var(--success)' : 'var(--border)';
  const focusShadow = error
    ? '0 0 0 3px var(--danger-light)'
    : success
    ? '0 0 0 3px var(--success-light)'
    : '0 0 0 3px var(--accent-dim)';

  return (
    <div style={{ marginBottom: label || helpText || error ? 18 : 0 }}>
      {label && (
        <label style={{
          fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
          display: 'block', marginBottom: 6,
        }}>
          {label}
          {required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-muted)',
            display: 'flex', pointerEvents: 'none', zIndex: 1,
          }}>{icon}</div>
        )}
        <input
          className={className} type={type} value={value} onChange={onChange}
          placeholder={placeholder} disabled={disabled}
          style={{
            width: '100%',
            padding: `9px 14px${icon ? ' 14px 38px' : ''}${iconRight ? ' 38px 14px' : ''}`,
            background: disabled ? 'var(--bg-tertiary)' : 'var(--card)',
            border: `1px solid ${borderColor}`,
            borderRadius: 'var(--radius-md)',
            color: 'var(--text)',
            fontSize: 13,
            fontFamily: 'var(--font)',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'all var(--transition-fast)',
            boxShadow: 'var(--shadow-xs)',
          }}
          onFocus={e => {
            e.target.style.borderColor = 'var(--accent)';
            e.target.style.boxShadow = focusShadow;
          }}
          onBlur={e => {
            e.target.style.borderColor = borderColor;
            e.target.style.boxShadow = 'var(--shadow-xs)';
          }}
          {...props}
        />
        {iconRight && (
          <div style={{
            position: 'absolute', right: 12, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex',
          }}>{iconRight}</div>
        )}
      </div>
      {helpText && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{helpText}</div>}
      {error && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, fontWeight: 500 }}>{error}</div>}
    </div>
  );
};

interface SelectProps {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  label, value, onChange, options = [],
  error, disabled = false, required = false, placeholder = '...',
  style = {}, className, ...props
}) => (
  <div style={{ marginBottom: 18 }}>
    {label && (
      <label style={{
        fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
        display: 'block', marginBottom: 6,
      }}>
        {label}
        {required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
      </label>
    )}
    <select
      className={className} value={value} onChange={onChange} disabled={disabled}
      style={{
        width: '100%',
        padding: '9px 14px',
        background: disabled ? 'var(--bg-tertiary)' : 'var(--card)',
        border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        color: 'var(--text)',
        fontSize: 13,
        fontFamily: 'var(--font)',
        outline: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        boxSizing: 'border-box',
        boxShadow: 'var(--shadow-xs)',
        transition: 'all var(--transition-fast)',
        ...style,
      }}
      onFocus={e => {
        e.target.style.borderColor = 'var(--accent)';
        e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)';
      }}
      onBlur={e => {
        e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)';
        e.target.style.boxShadow = 'var(--shadow-xs)';
      }}
      {...props}
    >
      <option value="">{placeholder}</option>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
    {error && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, fontWeight: 500 }}>{error}</div>}
  </div>
);

export default Input;
