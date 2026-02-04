'use client';

interface USDCIconProps {
  size?: number;
  className?: string;
}

// Official USDC Blue: #2775CA (from Circle brand guidelines)
export default function USDCIcon({ size = 20, className = '' }: USDCIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* USDC Token Logo - Blue circle with white $ */}
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <path
        d="M20.022 18.124c0-2.124-1.28-2.852-3.84-3.156-1.828-.228-2.196-.692-2.196-1.5 0-.808.644-1.32 1.912-1.32 1.124 0 1.728.38 2.036 1.32.076.228.228.38.456.38h1.044c.304 0 .532-.228.456-.532-.228-1.296-1.296-2.36-2.852-2.624V9.232c0-.304-.228-.532-.532-.532h-.912c-.304 0-.532.228-.532.532v1.424c-1.876.304-3.068 1.524-3.068 3.116 0 2.008 1.22 2.78 3.78 3.084 1.72.268 2.256.616 2.256 1.54 0 .924-.76 1.564-1.912 1.564-1.448 0-1.988-.608-2.16-1.468-.076-.268-.228-.38-.456-.38h-1.12c-.304 0-.532.228-.456.532.304 1.6 1.428 2.508 3.136 2.812v1.424c0 .304.228.532.532.532h.912c.304 0 .532-.228.532-.532v-1.424c1.876-.304 3.18-1.524 3.18-3.332z"
        fill="white"
      />
      <path
        d="M12.628 24.852c-4.56-1.58-6.94-6.612-5.32-11.096 1.064-2.888 3.504-4.9 6.396-5.508.304-.076.456-.304.456-.608v-.912c0-.304-.152-.532-.456-.608-.076 0-.228 0-.304.076-4.94 1.58-7.928 6.944-6.348 11.884 1.024 3.192 3.576 5.668 6.652 6.692.304.076.608-.076.684-.38.076-.076.076-.152.076-.304v-.912c0-.228-.152-.456-.456-.608-.304.076-.304.076-.38.076v.208zM20.176 6.116c-.304-.076-.608.076-.684.38-.076.076-.076.152-.076.304v.912c0 .304.152.532.456.608 4.56 1.58 6.94 6.612 5.32 11.096-1.064 2.888-3.504 4.9-6.396 5.508-.304.076-.456.304-.456.608v.912c0 .304.152.532.456.608.076 0 .228 0 .304-.076 4.94-1.58 7.928-6.944 6.348-11.884-1.024-3.192-3.576-5.668-6.652-6.692-.076-.076-.076-.076-.152-.076l-.076-.076-.076-.076c-.076-.076-.076-.076-.076-.076l.076-.076v.124z"
        fill="white"
        fillOpacity="0.5"
      />
    </svg>
  );
}

// USDC amount display component with icon
export function USDCAmount({
  amount,
  size = 'md',
  showIcon = true,
  className = ''
}: {
  amount: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showIcon?: boolean;
  className?: string;
}) {
  const sizes = {
    sm: { icon: 14, text: 'text-sm' },
    md: { icon: 18, text: 'text-base' },
    lg: { icon: 24, text: 'text-xl' },
    xl: { icon: 32, text: 'text-3xl' },
  };

  const { icon, text } = sizes[size];

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {showIcon && <USDCIcon size={icon} />}
      <span className={`font-bold ${text}`}>
        {amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
      </span>
      <span className={`text-gray-400 font-normal ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        USDC
      </span>
    </span>
  );
}

// Compact version for tight spaces
export function USDCBadge({ amount, className = '' }: { amount: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/30 px-2 py-1 rounded-full ${className}`}>
      <USDCIcon size={14} />
      <span className="text-blue-400 font-medium text-sm">{amount} USDC</span>
    </span>
  );
}
