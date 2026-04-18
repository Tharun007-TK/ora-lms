// ============================================================
// Ora primitives — Button, Input, Select, Checkbox, Radio, Badge, Avatar
// ============================================================
const { useState, useRef, useEffect, useId } = React;

// ---------- Button ----------
const BTN_SIZE = {
  sm: "h-7 px-2.5 text-[12px] gap-1.5 rounded-[5px]",
  md: "h-8 px-3 text-[13px] gap-1.5 rounded-md",
  lg: "h-10 px-4 text-[14px] gap-2 rounded-md",
};

const Button = ({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  children,
  className = "",
  ...rest
}) => {
  const variants = {
    primary:
      "bg-[var(--ink)] text-[var(--paper)] border border-transparent hover:bg-[var(--gray-800)] active:bg-[var(--gray-700)] dark:bg-[var(--gray-900)] dark:text-[var(--ink)] dark:hover:bg-[var(--gray-800)]",
    secondary:
      "bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-sunken)] active:bg-[var(--gray-100)]",
    ghost:
      "bg-transparent text-[var(--text-primary)] border border-transparent hover:bg-[var(--surface-sunken)] active:bg-[var(--gray-100)]",
    danger:
      "bg-[var(--danger-fg)] text-white border border-transparent hover:brightness-[0.92] active:brightness-[0.85]",
    ember:
      "bg-[var(--ember)] text-white border border-transparent hover:brightness-[0.95] active:brightness-[0.88]",
  };
  const disabledCls = disabled || loading ? "opacity-50 cursor-not-allowed pointer-events-none" : "";
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium whitespace-nowrap transition-[background,border-color,color] duration-[var(--dur-fast)] focus-ora select-none ${BTN_SIZE[size]} ${variants[variant]} ${disabledCls} ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <I.Loader size={14} className="spin-ora" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {iconLeft ? React.cloneElement(iconLeft, { size: size === "lg" ? 16 : 14 }) : null}
          {children ? <span>{children}</span> : null}
          {iconRight ? React.cloneElement(iconRight, { size: size === "lg" ? 16 : 14 }) : null}
        </>
      )}
    </button>
  );
};

// ---------- Input ----------
const Input = ({
  label,
  helper,
  error,
  hint,
  id,
  prefix,
  suffix,
  textarea = false,
  rows = 4,
  className = "",
  ...rest
}) => {
  const autoId = useId();
  const inputId = id || autoId;
  const borderCls = error
    ? "border-[var(--danger-fg)] focus-within:border-[var(--danger-fg)]"
    : "border-[var(--border)] focus-within:border-[var(--gray-700)] dark:focus-within:border-[var(--gray-500)]";
  const ringCls = error
    ? "focus-within:shadow-[0_0_0_3px_rgba(163,45,45,0.2)]"
    : "focus-within:shadow-[var(--focus-ring)]";
  const field = textarea ? (
    <textarea
      id={inputId}
      rows={rows}
      className="w-full bg-transparent outline-none text-[13px] leading-[1.5] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2 resize-none"
      {...rest}
    />
  ) : (
    <input
      id={inputId}
      className="w-full bg-transparent outline-none text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 h-8"
      {...rest}
    />
  );

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={inputId} className="t-label block mb-1.5 text-[var(--text-primary)]">
          {label}
          {hint ? <span className="t-caption ml-1.5 font-normal">{hint}</span> : null}
        </label>
      ) : null}
      <div
        className={`flex items-stretch bg-[var(--surface-raised)] rounded-md border transition-[border-color,box-shadow] duration-[var(--dur-fast)] ${borderCls} ${ringCls}`}
      >
        {prefix ? (
          <span className="flex items-center pl-2.5 pr-1 text-[var(--text-muted)]">{prefix}</span>
        ) : null}
        {field}
        {suffix ? (
          <span className="flex items-center pr-2.5 pl-1 text-[var(--text-muted)]">{suffix}</span>
        ) : null}
      </div>
      {error ? (
        <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-[var(--danger-fg)]">
          <I.AlertCircle size={12} />
          <span>{error}</span>
        </div>
      ) : helper ? (
        <div className="t-caption mt-1.5">{helper}</div>
      ) : null}
    </div>
  );
};

// ---------- Checkbox ----------
const Checkbox = ({ checked = false, indeterminate = false, onChange, disabled, label, description, id }) => {
  const autoId = useId();
  const cbId = id || autoId;
  const stateCls = disabled
    ? "opacity-50 pointer-events-none"
    : "";
  const box = checked || indeterminate
    ? "bg-[var(--ink)] border-[var(--ink)] dark:bg-[var(--gray-900)] dark:border-[var(--gray-900)]"
    : "bg-[var(--surface-raised)] border-[var(--border-strong)] hover:border-[var(--gray-700)]";
  return (
    <label htmlFor={cbId} className={`inline-flex items-start gap-2.5 cursor-pointer ${stateCls}`}>
      <span className="relative flex items-center justify-center mt-[1px]">
        <input
          id={cbId}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange && onChange(e.target.checked)}
          disabled={disabled}
        />
        <span
          className={`w-[15px] h-[15px] rounded-[3px] border transition-colors flex items-center justify-center peer-focus-visible:shadow-[var(--focus-ring)] ${box}`}
        >
          {indeterminate ? (
            <I.Minus size={10} className="text-[var(--paper)] dark:text-[var(--ink)]" strokeWidth={2.5} />
          ) : checked ? (
            <I.Check size={10} className="text-[var(--paper)] dark:text-[var(--ink)]" strokeWidth={2.5} />
          ) : null}
        </span>
      </span>
      {(label || description) && (
        <span className="flex flex-col">
          {label ? <span className="t-label text-[var(--text-primary)]">{label}</span> : null}
          {description ? <span className="t-caption mt-0.5">{description}</span> : null}
        </span>
      )}
    </label>
  );
};

// ---------- Radio ----------
const Radio = ({ checked = false, onChange, disabled, label, description, name, value, id }) => {
  const autoId = useId();
  const rId = id || autoId;
  const stateCls = disabled ? "opacity-50 pointer-events-none" : "";
  const box = checked
    ? "border-[var(--ink)] dark:border-[var(--gray-900)]"
    : "border-[var(--border-strong)] hover:border-[var(--gray-700)]";
  return (
    <label htmlFor={rId} className={`inline-flex items-start gap-2.5 cursor-pointer ${stateCls}`}>
      <span className="relative flex items-center justify-center mt-[1px]">
        <input
          id={rId}
          type="radio"
          name={name}
          value={value}
          className="peer sr-only"
          checked={checked}
          onChange={() => onChange && onChange(value)}
          disabled={disabled}
        />
        <span className={`w-[15px] h-[15px] rounded-full border bg-[var(--surface-raised)] transition-colors flex items-center justify-center peer-focus-visible:shadow-[var(--focus-ring)] ${box}`}>
          {checked ? <span className="w-[7px] h-[7px] rounded-full bg-[var(--ink)] dark:bg-[var(--gray-900)]" /> : null}
        </span>
      </span>
      {(label || description) && (
        <span className="flex flex-col">
          {label ? <span className="t-label text-[var(--text-primary)]">{label}</span> : null}
          {description ? <span className="t-caption mt-0.5">{description}</span> : null}
        </span>
      )}
    </label>
  );
};

// ---------- Badge / Pill ----------
const Badge = ({ tone = "neutral", dot = false, children, className = "" }) => {
  const tones = {
    neutral: "bg-[var(--gray-100)] text-[var(--text-secondary)] dark:bg-[var(--gray-100)] dark:text-[var(--gray-800)]",
    info:    "bg-[var(--info-bg)] text-[var(--info-text)]",
    success: "bg-[var(--success-bg)] text-[var(--success-text)]",
    warning: "bg-[var(--warning-bg)] text-[var(--warning-text)]",
    danger:  "bg-[var(--danger-bg)] text-[var(--danger-text)]",
    ember:   "bg-[rgba(216,90,48,0.10)] text-[var(--ember)]",
  };
  const dotColor = {
    neutral: "bg-[var(--gray-500)]",
    info: "bg-[var(--info-fg)]",
    success: "bg-[var(--success-fg)]",
    warning: "bg-[var(--warning-fg)]",
    danger: "bg-[var(--danger-fg)]",
    ember: "bg-[var(--ember)]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-1.5 h-[20px] rounded-full text-[11px] font-medium leading-none ${tones[tone]} ${className}`}>
      {dot ? <span className={`w-1.5 h-1.5 rounded-full ${dotColor[tone]}`} /> : null}
      {children}
    </span>
  );
};

// ---------- Avatar ----------
const AVA_SIZE = { xs: 20, sm: 24, md: 32, lg: 40, xl: 56 };
const AVA_TEXT = { xs: 9, sm: 10, md: 12, lg: 14, xl: 18 };
const avaBgFor = (name) => {
  const hues = [8, 38, 78, 148, 188, 218, 258, 318];
  const i = [...(name || "A")].reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length;
  return `oklch(0.85 0.04 ${hues[i]})`;
};
const Avatar = ({ name = "", size = "md", status, className = "" }) => {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
  const px = AVA_SIZE[size];
  const statusColors = {
    online: "bg-[var(--success-fg)]",
    busy: "bg-[var(--danger-fg)]",
    away: "bg-[var(--warning-fg)]",
    offline: "bg-[var(--gray-400)]",
  };
  return (
    <span className={`relative inline-flex ${className}`} style={{ width: px, height: px }}>
      <span
        className="inline-flex items-center justify-center rounded-full font-medium text-[var(--gray-900)] w-full h-full select-none"
        style={{
          background: avaBgFor(name),
          fontSize: AVA_TEXT[size],
          letterSpacing: "0.02em",
        }}
      >
        {initials || "?"}
      </span>
      {status ? (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-[var(--surface)] ${statusColors[status]}`}
          style={{ width: Math.max(6, px * 0.28), height: Math.max(6, px * 0.28) }}
        />
      ) : null}
    </span>
  );
};

// ---------- Kbd ----------
const Kbd = ({ children }) => (
  <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-[4px] border border-[var(--border)] bg-[var(--surface-raised)] text-[11px] text-[var(--text-secondary)] font-mono leading-none">
    {children}
  </kbd>
);

// ---------- Card ----------
const Card = ({ variant = "default", interactive = false, className = "", children, ...rest }) => {
  const variants = {
    default: "bg-[var(--surface-raised)] border border-[var(--border)]",
    raised: "bg-[var(--surface-raised)] border border-[var(--border)] shadow-[0_1px_0_rgba(10,10,10,0.03),0_8px_24px_rgba(10,10,10,0.04)]",
    flat: "bg-[var(--surface-sunken)] border border-[var(--border)]",
  };
  const inter = interactive
    ? "transition-[border-color,background] duration-[var(--dur-fast)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-sunken)] cursor-pointer focus-ora"
    : "";
  return (
    <div
      className={`rounded-lg ${variants[variant]} ${inter} ${className}`}
      tabIndex={interactive ? 0 : undefined}
      {...rest}
    >
      {children}
    </div>
  );
};

Object.assign(window, { Button, Input, Checkbox, Radio, Badge, Avatar, Kbd, Card });
