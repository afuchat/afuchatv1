import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import logoIcon from '@/assets/logo-icon.svg';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      icons={{
        success: <img src={logoIcon} alt="" className="h-5 w-5" />,
        error: <img src={logoIcon} alt="" className="h-5 w-5 opacity-60" />,
        info: <img src={logoIcon} alt="" className="h-5 w-5" />,
        warning: <img src={logoIcon} alt="" className="h-5 w-5 opacity-80" />,
        loading: <img src={logoIcon} alt="" className="h-5 w-5 animate-spin" style={{ animationDuration: '1.2s' }} />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-none group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
