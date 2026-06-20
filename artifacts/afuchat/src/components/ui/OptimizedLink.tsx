import { Link, LinkProps } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OptimizedLinkProps extends LinkProps {
  className?: string;
  children: React.ReactNode;
}

export const OptimizedLink = ({ className, children, ...props }: OptimizedLinkProps) => {
  return (
    <Link {...props} className={cn('gpu-accelerated', className)}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
      >
        {children}
      </motion.div>
    </Link>
  );
};
