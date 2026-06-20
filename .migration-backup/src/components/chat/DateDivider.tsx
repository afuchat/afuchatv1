import { format, isToday, isYesterday } from 'date-fns';

export const DateDivider = ({ date }: { date: string | Date }) => {
  const d = new Date(date);
  let content = '';

  if (isToday(d)) {
    content = 'Today';
  } else if (isYesterday(d)) {
    content = 'Yesterday';
  } else {
    content = format(d, 'MMMM d, yyyy');
  }

  return (
    <div className="flex items-center justify-center py-3">
      <div className="bg-card/90 backdrop-blur-sm shadow-sm px-3 py-1.5 rounded-lg text-xs font-medium text-foreground/70">
        {content}
      </div>
    </div>
  );
};
