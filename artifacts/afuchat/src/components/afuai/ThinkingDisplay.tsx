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
  /**
   * NEW: Connects seamlessly to the AI message below
   * - Removes bottom border & rounding
   * - Uses same background as your message bubble
   * - Creates a single unified card (perfect for live AI messages)
   */
  connectedToMessage?: boolean;
}

// PRO VERSION v3 — Professional + Connected to Message
// • Visually blends into AIMessageContent (no gap, shared styling)
// • Premium typography & spacing (matches your 13.5px message style)
// • Smoother finalize (no jump, instant checkmarks)
// • Subtle gradient + glassmorphic header
// • Ready to drop directly above <AIMessageContent /> in one container
export const ThinkingDisplay: React.FC<ThinkingDisplayProps> = ({
  thought,
  isStreaming,
  isComplete,
  className,
  typingSpeed = 20,
  connectedToMessage = false,
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

  // Reset only on new thinking session
  useEffect(() => {
    if (isStreaming && !prevIsStreamingRef.current) {
      setDisplayedSteps([]);
      setCurrentStepIndex(0);
      setCurrentCharIndex(0);
    }
    prevIsStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Incremental typing engine
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
      setDisplayedSteps(prev => {
        const newSteps = [...prev];
        if (newSteps[currentStepIndex]) newSteps[currentStepIndex].isComplete = true;
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
    return undefined;
  }, [isStreaming, currentStepIndex, currentCharIndex, steps, typingSpeed]);

  // Smooth finalize — keeps every typed character, just adds checkmarks + final text
  useEffect(() => {
    if (!isComplete) return;

    setDisplayedSteps(prev => {
      const newSteps = [...prev];
      const targetLength = steps.length;
      for (let i = 0; i < targetLength; i++) {
        if (i < newSteps.length) {
          newSteps[i] = { text: steps[i], isComplete: true };
        } else {
          newSteps.push({ text: steps[i], isComplete: true });
        }
      }
      return newSteps;
    });

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
        "overflow-hidden border bg-gradient-to-b from-primary/5 via-background to-transparent shadow-sm transition-all",
        connectedToMessage
          ? "rounded-t-2xl border-b-0 rounded-b-none bg-transparent border-primary/30" // seamless connection
          : "rounded-2xl border-primary/50",
        isStreaming && !isComplete && "animate-pulse-subtle border-primary/60",
        !isStreaming && !isComplete && "border-border/60",
        className
      )}
    >
      {/* Premium Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/40 bg-background/90 backdrop-blur-md">
        <div className="relative flex items-center justify-center">
          <BrainCircuit className={cn(
            "h-4 w-4 text-primary transition-all",
            isStreaming && !isComplete && "animate-pulse"
          )} />
          {isStreaming && !isComplete && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full animate-ping" />
          )}
        </div>

        <span className="text-[11.5px] font-semibold text-primary uppercase tracking-[0.6px]">
          {progressText}
        </span>

        {isStreaming && !isComplete && (
          <Loader2 className="h-3.5 w-3.5 ml-auto text-primary animate-spin" />
        )}
      </div>

      {/* Steps Area — matches your message typography */}
      <div
        ref={containerRef}
        className="px-5 py-5 max-h-[260px] overflow-y-auto space-y-4 bg-background/70 text-sm scroll-smooth"
      >
        {displayedSteps.map((step, index) => (
          <div
            key={index}
            className="flex items-start gap-3.5 animate-in slide-in-from-left-3 duration-300"
          >
            <div
              className={cn(
                "flex-shrink-0 mt-0.5 w-6 h-6 rounded-2xl flex items-center justify-center text-[10px] font-bold transition-all border",
                step.isComplete
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  : "bg-muted text-muted-foreground border-border/60"
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
                  "text-[13.5px] leading-[1.65] tracking-[-0.15px] text-foreground/90",
                  step.text.startsWith('User requested:') || step.text.startsWith('User:')
                    ? "text-primary font-medium"
                    : ""
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

        {/* Waiting dots when next step is coming */}
        {isStreaming && !isComplete && displayedSteps.length > 0 && 
         displayedSteps[displayedSteps.length - 1]?.isComplete && currentStepIndex < steps.length && (
          <div className="flex items-center gap-3 pl-9">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
              <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Updated Collapsible version — also matches message style (for chat history)
export const CollapsibleThinking: React.FC<{
  thought: string;
  defaultExpanded?: boolean;
  className?: string;
  connectedToMessage?: boolean;
}> = ({ thought, defaultExpanded = false, className, connectedToMessage = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const steps = useMemo(() => thought.split('\n').filter(line => line.trim()), [thought]);

  return (
    <div
      className={cn(
        "overflow-hidden border bg-muted/30",
        connectedToMessage
          ? "rounded-t-2xl border-b-0 rounded-b-none border-primary/30 bg-transparent"
          : "rounded-2xl border-border/60",
        className
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-[11.5px] font-semibold text-muted-foreground hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <BrainCircuit className="h-4 w-4 text-primary" />
          <span>Reasoning complete • {steps.length} steps</span>
        </div>
        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {isExpanded && (
        <div className="px-5 pb-6 pt-1 border-t border-border/40 bg-background/70 space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-3.5">
              <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <p className={cn(
                "text-[13.5px] leading-[1.65] text-foreground/90",
                step.startsWith('User requested:') || step.startsWith('User:')
                  ? "text-primary font-medium"
                  : ""
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
