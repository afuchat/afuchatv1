import React, { useState, useEffect, useRef } from 'react';
import { BrainCircuit, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThinkingStep {
  text: string;
  isComplete: boolean;
}

interface ThinkingDisplayProps {
  thought: string;
  isStreaming: boolean;
  isComplete: boolean;
  className?: string;
}

// DeepSeek-style real-time thinking display
export const ThinkingDisplay: React.FC<ThinkingDisplayProps> = ({
  thought,
  isStreaming,
  isComplete,
  className
}) => {
  const [displayedSteps, setDisplayedSteps] = useState<ThinkingStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Parse thought into steps
  const steps = thought.split('\n').filter(line => line.trim());
  
  useEffect(() => {
    if (isComplete) {
      // Show all steps immediately when complete
      setDisplayedSteps(steps.map(text => ({ text, isComplete: true })));
      return;
    }
    
    if (!isStreaming || steps.length === 0) return;
    
    // Streaming animation - type out each step character by character
    if (currentStepIndex < steps.length) {
      const currentStep = steps[currentStepIndex];
      
      if (currentCharIndex < currentStep.length) {
        const timer = setTimeout(() => {
          setDisplayedSteps(prev => {
            const newSteps = [...prev];
            if (!newSteps[currentStepIndex]) {
              newSteps[currentStepIndex] = { text: '', isComplete: false };
            }
            newSteps[currentStepIndex] = {
              text: currentStep.substring(0, currentCharIndex + 1),
              isComplete: false
            };
            return newSteps;
          });
          setCurrentCharIndex(prev => prev + 1);
        }, 20); // Typing speed
        
        return () => clearTimeout(timer);
      } else {
        // Move to next step
        setDisplayedSteps(prev => {
          const newSteps = [...prev];
          if (newSteps[currentStepIndex]) {
            newSteps[currentStepIndex].isComplete = true;
          }
          return newSteps;
        });
        
        if (currentStepIndex < steps.length - 1) {
          const timer = setTimeout(() => {
            setCurrentStepIndex(prev => prev + 1);
            setCurrentCharIndex(0);
          }, 300); // Delay between steps
          
          return () => clearTimeout(timer);
        }
      }
    }
  }, [isStreaming, isComplete, currentStepIndex, currentCharIndex, steps]);
  
  // Reset when thought changes
  useEffect(() => {
    setDisplayedSteps([]);
    setCurrentStepIndex(0);
    setCurrentCharIndex(0);
  }, [thought]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedSteps]);
  
  const isTyping = isStreaming && !isComplete && currentStepIndex < steps.length;
  
  return (
    <div className={cn(
      "overflow-hidden rounded-xl border bg-gradient-to-b from-primary/5 to-transparent",
      isStreaming && !isComplete ? "border-primary/40 animate-pulse" : "border-border/40",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/30 bg-background/60">
        <div className="relative">
          <BrainCircuit className={cn(
            "h-4 w-4 text-primary",
            isStreaming && !isComplete && "animate-pulse"
          )} />
          {isStreaming && !isComplete && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-ping" />
          )}
        </div>
        <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
          {isComplete ? 'Reasoning' : 'Thinking...'}
        </span>
        {isStreaming && !isComplete && (
          <Loader2 className="h-3 w-3 ml-auto text-primary animate-spin" />
        )}
      </div>
      
      {/* Thinking Steps */}
      <div 
        ref={containerRef}
        className="px-3 py-3 max-h-[200px] overflow-y-auto space-y-2 bg-background/40"
      >
        {displayedSteps.map((step, index) => (
          <div 
            key={index}
            className={cn(
              "flex items-start gap-2 animate-in slide-in-from-left-2 duration-200",
            )}
          >
            <span className={cn(
              "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5",
              step.isComplete 
                ? "bg-primary/20 text-primary" 
                : "bg-muted text-muted-foreground"
            )}>
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-xs leading-relaxed",
                step.text.startsWith('User requested:') 
                  ? "text-primary font-medium" 
                  : "text-foreground/80"
              )}>
                {step.text}
                {!step.isComplete && isTyping && currentStepIndex === index && (
                  <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse rounded-sm" />
                )}
              </p>
            </div>
          </div>
        ))}
        
        {/* Waiting indicator for next step */}
        {isStreaming && !isComplete && displayedSteps.length > 0 && 
         currentStepIndex < steps.length && 
         displayedSteps[displayedSteps.length - 1]?.isComplete && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="w-5 h-5 flex-shrink-0" />
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Collapsible version for past messages
export const CollapsibleThinking: React.FC<{
  thought: string;
  defaultExpanded?: boolean;
  className?: string;
}> = ({ thought, defaultExpanded = false, className }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const steps = thought.split('\n').filter(line => line.trim());
  
  return (
    <div className={cn(
      "overflow-hidden rounded-xl border border-border/40 bg-muted/20",
      className
    )}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tight hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-3.5 w-3.5 text-primary" />
          <span>Reasoning ({steps.length} steps)</span>
        </div>
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-border/20 pt-2 bg-background/40 space-y-1.5">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary mt-0.5">
                {index + 1}
              </span>
              <p className={cn(
                "text-xs leading-relaxed",
                step.startsWith('User requested:') 
                  ? "text-primary font-medium" 
                  : "text-muted-foreground"
              )}>
                {step}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThinkingDisplay;
