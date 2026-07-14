import './AvatarInitials.css';

/**
 * AvatarInitials — colored circular avatar showing initials.
 * Used in DataTable row render functions for primary entity columns
 * (customers, contractors, users, branches, etc.).
 *
 * Props:
 *   name       {string}  — full name; first letter(s) used as initials
 *   colorIndex {number}  — 0–3, rotates through 4 pastel colors (default: derived from name)
 *   size       {number}  — px size override (default: 32)
 */
const AvatarInitials = ({ name = '', colorIndex, size }) => {
  // Derive initials: first char of first two words
  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2
    ? `${words[0][0]}${words[1][0]}`
    : (words[0]?.[0] || '?');

  // Derive color index from name if not provided
  const idx = colorIndex !== undefined
    ? colorIndex % 4
    : (name.charCodeAt(0) || 0) % 4;

  const style = size ? { width: size, height: size, fontSize: size * 0.375 } : undefined;

  return (
    <span
      className={`avatar-initials avatar-initials--${idx}`}
      style={style}
      aria-label={name}
      title={name}
    >
      {initials.toUpperCase()}
    </span>
  );
};

export default AvatarInitials;
