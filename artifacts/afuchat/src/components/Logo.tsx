import { afuLogo } from '@/assets/logo';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo = ({ size = 'md', className = '' }: LogoProps) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  return (
    <img
      src={afuLogo}
      alt="AfuChat"
      className={`${sizeClasses[size]} ${className} object-contain pointer-events-none select-none`}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};

export default Logo;
