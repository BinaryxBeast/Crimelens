// ============================================================
// Default Avatar SVGs for Offenders (Male / Female)
// Used when no photo is uploaded
// ============================================================

export const MALE_AVATAR_SVG = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <rect width="120" height="120" rx="16" fill="#1a2332"/>
  <circle cx="60" cy="42" r="20" fill="#3a7bd5"/>
  <ellipse cx="60" cy="95" rx="32" ry="28" fill="#3a7bd5"/>
  <circle cx="60" cy="42" r="16" fill="#4a8be5" opacity="0.6"/>
  <rect x="48" y="58" width="24" height="8" rx="4" fill="#3a7bd5"/>
  <text x="60" y="115" text-anchor="middle" fill="#6ba3f7" font-size="9" font-family="Inter,sans-serif" font-weight="600">MALE</text>
</svg>
`)}`;

export const FEMALE_AVATAR_SVG = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <rect width="120" height="120" rx="16" fill="#2d1a2e"/>
  <circle cx="60" cy="42" r="20" fill="#b24592"/>
  <ellipse cx="60" cy="95" rx="32" ry="28" fill="#b24592"/>
  <circle cx="60" cy="42" r="16" fill="#d45baf" opacity="0.6"/>
  <rect x="48" y="58" width="24" height="8" rx="4" fill="#b24592"/>
  <path d="M38 32 Q40 18 60 16 Q80 18 82 32" stroke="#d45baf" stroke-width="3" fill="none" opacity="0.5"/>
  <text x="60" y="115" text-anchor="middle" fill="#e07cc4" font-size="9" font-family="Inter,sans-serif" font-weight="600">FEMALE</text>
</svg>
`)}`;

export function getDefaultAvatar(gender) {
  if (gender && gender.toLowerCase() === 'female') return FEMALE_AVATAR_SVG;
  return MALE_AVATAR_SVG;
}
