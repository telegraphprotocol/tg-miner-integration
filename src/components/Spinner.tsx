'use client';

interface Props {
  size?: 'sm' | 'lg';
  className?: string;
}

export default function Spinner({ size = 'sm', className = '' }: Props) {
  return <span className={`spinner ${size === 'lg' ? 'spinner-lg' : ''} ${className}`.trim()} />;
}
