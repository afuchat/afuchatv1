import React from 'react';
import { Github, Globe, Briefcase, Code2, Sparkles, ExternalLink, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  displayName,
  handle,
  onContact,
}) => {
  const hasLinks = githubUrl || portfolioUrl;
  
  if (!hasLinks && !tagline && !availableForHire) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-4 relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5"
    >
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-grid-white/5 opacity-50" />
      
      {/* Floating code particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ 
            y: [0, -20, 0],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-4 right-8 text-primary/20 text-xs font-mono"
        >
          {'</>'}
        </motion.div>
        <motion.div
          animate={{ 
            y: [0, -15, 0],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-6 left-6 text-accent/20 text-xs font-mono"
        >
          {'{ }'}
        </motion.div>
        <motion.div
          animate={{ 
            rotate: [0, 360],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl"
        />
      </div>

      <div className="relative p-4 space-y-4">
        {/* Developer header */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
            <Code2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              Developer
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            </h3>
            {tagline && (
              <p className="text-xs text-muted-foreground line-clamp-1">{tagline}</p>
            )}
          </div>
          {availableForHire && (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Badge 
                variant="outline" 
                className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-semibold text-[10px] px-2 py-0.5 shadow-sm"
              >
                <Briefcase className="h-3 w-3 mr-1" />
                Available for Hire
              </Badge>
            </motion.div>
          )}
        </div>

        {/* Links row */}
        {hasLinks && (
          <div className="flex flex-wrap gap-2">
            {githubUrl && (
              <a
                href={githubUrl.startsWith('http') ? githubUrl : `https://${githubUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-card/80 border border-border/50 hover:border-primary/50 hover:bg-card transition-all duration-200"
              >
                <Github className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  GitHub
                </span>
                <ExternalLink className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              </a>
            )}
            {portfolioUrl && (
              <a
                href={portfolioUrl.startsWith('http') ? portfolioUrl : `https://${portfolioUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-card/80 border border-border/50 hover:border-primary/50 hover:bg-card transition-all duration-200"
              >
                <Globe className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  Portfolio
                </span>
                <ExternalLink className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              </a>
            )}
          </div>
        )}

        {/* Contact / Hire button */}
        {availableForHire && onContact && (
          <Button 
            onClick={onContact}
            size="sm"
            className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all duration-200"
          >
            <Mail className="h-4 w-4 mr-2" />
            Contact for Work
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default DeveloperProfileSection;
