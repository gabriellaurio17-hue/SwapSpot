import React from 'react';

function Logo({ variant = 'light', size = 'md', withWordmark = true }) {
  const isDark = variant === 'dark';
  return (
    <span className={`brand brand-${variant} brand-${size}`}>
      <svg className="brand-mark" viewBox="0 0 48 48" role="img" aria-label="SwapSpot">
        <rect x="0" y="0" width="48" height="48" rx="14" fill={isDark ? '#E3B341' : '#6B0F1A'} />
        <path d="M24 8c-7 0-12.5 5.3-12.5 12 0 8.6 12.5 20 12.5 20s12.5-11.4 12.5-20C36.5 13.3 31 8 24 8z" fill={isDark ? '#5A0B18' : '#E3B341'} />
        <path d="M19 18.5h9.5l-2.6-2.6M29 22.5h-9.5l2.6 2.6" fill="none" stroke={isDark ? '#E3B341' : '#5A0B18'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {withWordmark && <span className="wordmark"><span>Swap</span><em>Spot</em></span>}
    </span>
  );
}

export default React.memo(Logo);
