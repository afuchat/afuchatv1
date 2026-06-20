import React from 'react';
import { Github, Globe, Briefcase, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface DeveloperProfileSectionProps {
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  tagline?: string | null;
  availableForHire?: boolean;
  displayName: string;
  handle: string;
  onContact?: () => void;
}

export const DeveloperProfileSection: React.FC<DeveloperProfileSectionProps> = ({
  githubUrl,
  portfolioUrl,
  tagline,
  availableForHire,
  onContact,
}) => {
  const hasLinks = githubUrl || portfolioUrl;
  
  if (!hasLinks && !tagline && !availableForHire) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="mt-3"
    >
      {/* Tagline */}
      {tagline && (
        <p className="text-sm text-muted-foreground mb-3 italic">"{tagline}"</p>
      )}

      {/* Icon Links Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* GitHub */}
        {githubUrl && (
          <motion.a
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            href={githubUrl.startsWith('http') ? githubUrl : `https://${githubUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-card border border-border/50 hover:border-foreground/30 hover:bg-accent transition-all duration-200 group"
            title="GitHub"
          >
            <Github className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </motion.a>
        )}

        {/* Portfolio */}
        {portfolioUrl && (
          <motion.a
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            href={portfolioUrl.startsWith('http') ? portfolioUrl : `https://${portfolioUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-card border border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-all duration-200 group"
            title="Portfolio"
          >
            <Globe className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </motion.a>
        )}

        {/* Available for Hire Badge */}
        {availableForHire && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Badge 
              variant="outline" 
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium text-xs px-2.5 py-1 gap-1.5"
            >
              <Briefcase className="h-3 w-3" />
              Open to Work
            </Badge>
          </motion.div>
        )}

        {/* Contact Button */}
        {availableForHire && onContact && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onContact}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-md shadow-primary/25"
            title="Contact for Work"
          >
            <Mail className="h-4 w-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default DeveloperProfileSection;
