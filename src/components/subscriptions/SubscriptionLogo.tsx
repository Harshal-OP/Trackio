'use client';

import { getSubscriptionLogo } from '@/lib/subscription-logos';

interface SubscriptionLogoProps {
  logoKey?: string | null;
  fallbackIcon?: string;
  fallbackColor?: string;
  shape?: 'circle' | 'square';
  className?: string;
}

export function SubscriptionLogo({
  logoKey,
  fallbackIcon = 'credit_card',
  fallbackColor = '#19e65e',
  shape = 'square',
  className = '',
}: SubscriptionLogoProps) {
  const logo = getSubscriptionLogo(logoKey);

  const rounded = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  if (logo) {
    return (
      <div className={`flex items-center justify-center border border-black/10 bg-white ${rounded} ${className}`}>
        <svg
          viewBox="0 0 24 24"
          role="img"
          aria-label={logo.label}
          className="size-[62%]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path fill={`#${logo.hex}`} d={logo.path} />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center border ${rounded} ${className}`}
      style={{
        backgroundColor: `${fallbackColor}15`,
        borderColor: `${fallbackColor}30`,
      }}
    >
      <span className="material-symbols-outlined text-[20px]" style={{ color: fallbackColor }}>
        {fallbackIcon}
      </span>
    </div>
  );
}
