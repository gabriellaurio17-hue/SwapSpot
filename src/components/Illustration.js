import React from 'react';

function Illustration({ type = 'calculator', className = '' }) {
  const product = {
    calculator: <><rect x="31" y="16" width="58" height="88" rx="10" fill="#354654" /><rect x="39" y="24" width="42" height="23" rx="3" fill="#D7E7CB" /><path d="M45 33h15" stroke="#52625A" strokeWidth="3" strokeLinecap="round" />{[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => <circle key={n} cx={47 + (n % 3) * 13} cy={58 + Math.floor(n / 3) * 13} r="4" fill={n === 8 ? '#D4A62A' : '#87939A'} />)}</>,
    book: <><path d="M28 24c16-7 29-5 34 0v74c-8-6-20-7-34-1z" fill="#7A1223" /><path d="M62 24c11-6 23-6 34 0v73c-12-5-23-5-34 1z" fill="#F2D98C" /><path d="M38 39h17M38 48h17M72 39h15M72 48h15" stroke="#F8EFD9" strokeWidth="3" strokeLinecap="round" /></>,
    shirt: <><path d="m44 24 18-8 18 8 20 16-13 15-9-7v51H44V48l-9 7-13-15z" fill="#D4A62A" /><path d="m49 22 13 10 13-10" fill="none" stroke="#F6E7B4" strokeWidth="4" /></>,
    multimeter: <><rect x="29" y="16" width="62" height="88" rx="12" fill="#E4A52D" /><rect x="38" y="25" width="44" height="25" rx="4" fill="#303E3B" /><path d="m45 39 7-6 6 5 6-7 8 5" fill="none" stroke="#C7E2BF" strokeWidth="2" /><circle cx="60" cy="65" r="12" fill="#35414A" /><circle cx="60" cy="65" r="4" fill="#E7DDD0" /><path d="M52 83h16M45 95l-9 12M75 95l10 12" stroke="#38434A" strokeWidth="3" strokeLinecap="round" /></>,
  }[type] || null;

  return <svg className={`product-art art-${type} ${className}`} viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="107" rx="43" ry="7" fill="#5A0B18" opacity=".12" />{product}</svg>;
}

export default React.memo(Illustration);