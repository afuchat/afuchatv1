import { Button } from '@/components/ui/button';
import { SwipeableSheet, SwipeableSheetContent } from '@/components/ui/swipeable-sheet';
import { LogOut, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/contexts/SettingsContext';

interface ProfileActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onEditProfile: () => void;
}

const ProfileActionsSheet = ({ isOpen, onClose, onLogout, onEditProfile }: ProfileActionsSheetProps) => {
  const navigate = useNavigate();
  const { openSettings } = useSettings();

  return (
    <SwipeableSheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SwipeableSheetContent>
        <div className="space-y-3">
          <Button
            variant="ghost"
            className="w-full justify-start h-12 text-base hover:bg-muted/80 rounded-xl font-medium"
            onClick={() => { onClose(); onEditProfile(); }}
          >
            <User className="h-5 w-5 mr-3 text-muted-foreground" />
            <span>Edit Profile</span>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start h-12 text-base hover:bg-muted/80 rounded-xl font-medium"
            onClick={() => { onClose(); openSettings(); }}
          >
            <Settings className="h-5 w-5 mr-3 text-muted-foreground" />
            <span>Settings</span>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start h-12 text-base text-destructive hover:bg-destructive/10 rounded-xl font-medium"
            onClick={() => { onClose(); onLogout(); }}
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span>Log Out</span>
          </Button>
        </div>
      </SwipeableSheetContent>
    </SwipeableSheet>
  );
};

export default ProfileActionsSheet;
