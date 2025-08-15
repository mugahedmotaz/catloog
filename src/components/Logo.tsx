import logoSrc from '../assets/logo.png';

export type LogoProps = {
  // Fixed size in pixels (ignored if responsive=true)
  size?: number;
  // Rounded Tailwind preset
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  // Accessible alt text
  alt?: string;
  // Extra className
  className?: string;
  // Enable responsive sizing using Tailwind utility classes
  responsive?: boolean;
  // Responsive preset scale
  preset?: 'lg' | 'xl' | 'hero';
};

const roundedMap: Record<NonNullable<LogoProps['rounded']>, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

export function Logo({ size = 180, rounded = 'xl', alt = 'Logo', className = '', responsive = false, preset = 'xl' }: LogoProps) {
  const roundedClass = roundedMap[rounded] ?? 'rounded-xl';

  // Predefined responsive class sets to ensure Tailwind picks them up (no dynamic construction)
  const presetClasses = {
    // Increase base (mobile) one step; keep sm/md/lg/xl same
    // lg: base 20 (up from 16), then 20/24/28/32
    lg: 'h-20 w-20 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 xl:h-32 xl:w-32',
    // xl: base 24 (up from 20), then 24/28/32/36
    xl: 'h-24 w-24 sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32 xl:h-36 xl:w-36',
    // hero: base 28 (up from 24), then 28/32/36/40
    hero: 'h-28 w-28 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 xl:h-40 xl:w-40',
  } as const;

  if (responsive) {
    const resClasses = presetClasses[preset] ?? presetClasses.xl;
    return (
      <img
        src={logoSrc}
        alt={alt}
        className={`object-contain ${roundedClass} ${resClasses} ${className}`.trim()}
      />
    );
  }

  // Fixed-size fallback
  return (
    <img
      src={logoSrc}
      alt={alt}
      width={size}
      height={size}
      className={`object-contain ${roundedClass} ${className}`.trim()}
      style={{ width: size, height: size }}
    />
  );
}

export default Logo;
