import React from 'react';

interface BrandLogoProps {
  variant?: 'dark' | 'light';
  showWordmark?: boolean;
  className?: string;
}

/**
 * Vector SVG Logo for The Fresh Laundry matching the reference image:
 * Circular blue-purple icon with a washing machine drum & water wave,
 * plus two-line wordmark "The" (small) above "Fresh Laundry" (bold).
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'dark',
  showWordmark = true,
  className = '',
}) => {
  const mainTextColor = variant === 'light' ? 'text-white' : 'text-[#102A67]';
  const subTextColor = variant === 'light' ? 'text-white/80' : 'text-[#3159D9]';

  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <svg
        width="36"
        height="36"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="tflLogoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3159D9" />
            <stop offset="100%" stopColor="#7452E8" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="19" fill="url(#tflLogoGrad)" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
        {/* Washing Machine Outer Frame */}
        <rect
          x="10.5"
          y="9.5"
          width="19"
          height="21"
          rx="4"
          stroke="#FFFFFF"
          strokeWidth="2"
        />
        {/* Control Dial Dots */}
        <circle cx="14.5" cy="13" r="1" fill="#FFFFFF" />
        <circle cx="17.5" cy="13" r="1" fill="#FFFFFF" />
        {/* Drum Circle */}
        <circle cx="20" cy="21.5" r="5.5" stroke="#FFFFFF" strokeWidth="1.8" />
        {/* Water Wave Inside Drum */}
        <path
          d="M15.5 21.5C16.8 20 18.5 23 20 21.5C21.5 20 23.2 23 24.5 21.5"
          stroke="#A5B4FC"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      {showWordmark && (
        <span className="flex flex-col leading-none text-left">
          <span className={`text-[10px] font-semibold tracking-wider uppercase ${subTextColor}`}>
            The
          </span>
          <span className={`text-base sm:text-lg font-bold tracking-tight ${mainTextColor}`}>
            Fresh Laundry
          </span>
        </span>
      )}
    </span>
  );
};
