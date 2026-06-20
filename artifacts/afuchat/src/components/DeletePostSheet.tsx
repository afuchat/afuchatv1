import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetClose,
  SheetDescription 
} from '@/components/ui/sheet';
import { Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DeletePostSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

const DeletePostSheet = ({ isOpen, onClose, onConfirm, isDeleting = false }: DeletePostSheetProps) => {
  const { t } = useTranslation();
  
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[50vh] rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/50 p-6"
      >
          <SheetHeader className="text-left space-y-3 mb-6">
            <SheetTitle className="text-2xl font-bold">{t('feed.deletePost')}</SheetTitle>
            <SheetDescription className="text-sm">
              {t('feed.deletePostConfirm')}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3">
            <Button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              disabled={isDeleting}
              className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold h-12 rounded-xl"
            >
              {isDeleting ? (
                <>
                  
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common.delete')}
                </>
              )}
            </Button>

            <SheetClose asChild>
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl font-semibold"
                disabled={isDeleting}
              >
                {t('common.cancel')}
              </Button>
            </SheetClose>
          </div>
      </SheetContent>
    </Sheet>
  );
};

export default DeletePostSheet;
