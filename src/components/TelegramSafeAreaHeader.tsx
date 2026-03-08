import { useIsTelegram } from '@/hooks/useIsTelegram';

/**
 * Branded safe area bar for Telegram Mini App.
 * Sits in the top safe area (notch / Telegram header region) and shows the brand name.
 * Only renders inside Telegram.
 */
export const TelegramSafeAreaHeader = () => {
  const isTelegram = useIsTelegram();
  
  if (!isTelegram) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-end justify-center bg-background"
      style={{
        height: 'var(--tg-safe-top, 0px)',
        paddingLeft: 'var(--tg-safe-left, 0px)',
        paddingRight: 'var(--tg-safe-right, 0px)',
      }}
    >
      <span className="text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase pb-0.5">
        AfuChat
      </span>
    </div>
  );
};
