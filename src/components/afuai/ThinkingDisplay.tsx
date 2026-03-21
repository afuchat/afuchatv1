import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrainCircuit, ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react';
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
  /** Optional typing speed in ms (default: 20) */
  typingSpeed?: number;
}

// PRO VERSION v2 — No more jumping when task completes
// Fixed: When `isComplete` becomes true, steps now smoothly finalize
//        • Last partial step instantly completes (no text replacement/jump)
//        • All previous steps keep their exact typed text
//        • Checkmarks appear without DOM flicker or reset
//        • Final thought can safely contain more steps (they get added completed)

export const ThinkingDisplay: React.FC<ThinkingDisplayProps> = ({
  thought,
  isStreaming,
  isComplete,
  className,
  typingSpeed = 20,
}) => {
  const [displayedSteps, setDisplayedSteps] = useState<ThinkingStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const prevIsStreamingRef = useRef(false);

  const steps = useMemo(() => 
    thought.split('\n').filter(line => line.trim()), 
    [thought]
  );

  // Reset only when a brand-new thinking session starts
  useEffect(() => {
    if (isStreaming && !prevIsStreamingRef.current) {
      setDisplayedSteps([]);
      setCurrentStepIndex(0);
      setCurrentCharIndex(0);
    }
    prevIsStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // === INCREMENTAL TYPING (only while streaming & not complete) ===
  useEffect(() => {
    if (isComplete || !isStreaming || steps.length === 0) return;

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
            isComplete: false,
          };
          return newSteps;
        });
        setCurrentCharIndex(prev => prev + 1);
      }, typingSpeed);

      return () => clearTimeout(timer);
    } else {
      // Mark current step complete and move to next
      setDisplayedSteps(prev => {
        const newSteps = [...prev];
        if (newSteps[currentStepIndex]) {
          newSteps[currentStepIndex].isComplete = true;
        }
        return newSteps;
      });

      if (currentStepIndex < steps.length - 1) {
        const nextTimer = setTimeout(() => {
          setCurrentStepIndex(prev => prev + 1);
          setCurrentCharIndex(0);
        }, 280);

        return () => clearTimeout(nextTimer);
      }
    }
  }, [isStreaming, currentStepIndex, currentCharIndex, steps, typingSpeed]);

  // === SMOOTH FINALIZE ON COMPLETE (NO JUMP) ===
  // This is the key fix: we only update isComplete flag + finish last step text
  // Existing typed text never disappears or gets replaced from scratch
  useEffect(() => {
    if (!isComplete) return;

    setDisplayedSteps(prev => {
      const newSteps = [...prev];

      const targetLength = steps.length;

      for (let i = 0; i < targetLength; i++) {
        if (i < newSteps.length) {
          // Existing step → keep its typed text (no jump), just mark complete
          // For the very last step, snap to full final text (instant finish)
          newSteps[i] = {
            text: steps[i],                    // use final authoritative text
            isComplete: true,
          };
        } else {
          // Rare case: final thought added extra steps
          newSteps.push({ text: steps[i], isComplete: true });
        }
      }

      return newSteps;
    });

    // Snap indices so typing engine stops
    setCurrentStepIndex(steps.length);
    setCurrentCharIndex(0);
  }, [isComplete, steps]);

  // Auto-scroll
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedSteps]);

  const isTyping = isStreaming && !isComplete && currentStepIndex < steps.length;

  const progressText = isComplete
    ? `Reasoning complete • ${steps.length} steps`
    : steps.length > 0
    ? `Thinking • Step ${Math.min(currentStepIndex + 1, steps.length)}/${steps.length}`
    : 'Thinking...';

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-gradient-to-b from-primary/5 via-background to-transparent shadow-sm",
        isStreaming && !isComplete
          ? "border-primary/50 animate-pulse-subtle"
          : "border-border/60",
        className
      )}
    >
      {/* Pro Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="relative flex items-center justify-center">
          <BrainCircuit className={cn(
            "h-4 w-4 text-primary transition-all",
            isStreaming && !isComplete && "animate-pulse"
          )} />
          {isStreaming && !isComplete && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full animate-ping" />
          )}
        </div>

        <span className="text-[11px] font-semibold text-primary uppercase tracking-[0.5px]">
          {progressText}
        </span>

        {isStreaming && !isComplete && (
          <Loader2 className="h-3.5 w-3.5 ml-auto text-primary animate-spin" />
        )}
      </div>

      {/* Steps Container */}
      <div
        ref={containerRef}
        className="px-4 py-4 max-h-[240px] overflow-y-auto space-y-3 bg-background/60 text-sm scroll-smooth"
      >
        {displayedSteps.map((step, index) => (
          <div
            key={index}
            className="flex items-start gap-3 animate-in slide-in-from-left-3 duration-300"
          >
            <div
              className={cn(
                "flex-shrink-0 mt-0.5 w-6 h-6 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all",
                step.isComplete
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {step.isComplete ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                index + 1
              )}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <p
                className={cn(
                  "text-[13px] leading-relaxed tracking-[-0.1px]",
                  step.text.startsWith('User requested:') || step.text.startsWith('User:')
                    ? "text-primary font-medium"
                    : "text-foreground/90"
                )}
              >
                {step.text}
                {!step.isComplete && isTyping && currentStepIndex === index && (
                  <span className="inline-block w-1 h-4 bg-primary ml-0.5 align-middle animate-pulse rounded" />
                )}
              </p>
            </div>
          </div>
        ))}

        {/* Waiting dots */}
        {isStreaming &&
          !isComplete &&
          displayedSteps.length > 0 &&
          displayedSteps[displayedSteps.length - 1]?.isComplete &&
          currentStepIndex < steps.length && (
            <div className="flex items-center gap-3 pl-9">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

// Collapsible version (unchanged — already perfect for history)
export const CollapsibleThinking: React.FC<{
  thought: string;
  defaultExpanded?: boolean;
  className?: string;
}> = ({ thought, defaultExpanded = false, className }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const steps = useMemo(() => thought.split('\n').filter(line => line.trim()), [thought]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-muted/30",
        className
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-[11px] font-semibold text-muted-foreground hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <BrainCircuit className="h-4 w-4 text-primary" />
          <span>Reasoning complete • {steps.length} steps</span>
        </div>
        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-5 pt-1 border-t border-border/40 bg-background/70 space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <p
                className={cn(
                  "text-[13px] leading-relaxed text-foreground/90",
                  step.startsWith('User requested:') || step.startsWith('User:')
                    ? "text-primary font-medium"
                    : ""
                )}
              >
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
