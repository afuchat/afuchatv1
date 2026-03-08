import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Trash2, Shield, AlertTriangle, FileDown, Scale, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SettingsSection, SettingsRow, SettingsInfoBox } from './SettingsUI';

export const DataPrivacySettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleDownloadData = async () => {
    if (!user) { toast.error('You must be signed in'); return; }
    setIsDownloadingData(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Session expired'); return; }
      const response = await fetch('https://rhnsjqqtdzlkvqazfcbg.supabase.co/functions/v1/export-user-data', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to export data');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `afuchat-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Data downloaded!');
    } catch (error) { toast.error('Failed to download data'); }
    finally { setIsDownloadingData(false); }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (deleteConfirmText !== 'DELETE') { toast.error('Please type DELETE to confirm'); return; }
    setIsDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Session expired'); return; }
      const response = await fetch('https://rhnsjqqtdzlkvqazfcbg.supabase.co/functions/v1/delete-user-account', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to delete');
      toast.success('Account deleted');
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      toast.error('Failed to delete account');
      setIsDeletingAccount(false);
      setDeleteConfirmText('');
    }
  };

  const dataItems = [
    'Profile information', 'Posts and replies', 'Messages from chats',
    'Followers and following', 'Tips and gifts', 'Achievements and activity',
    'Game scores and purchases',
  ];

  const rights = [
    'Access your personal data', 'Request data correction',
    'Request data deletion', 'Export data in portable format',
    'Object to data processing',
  ];

  return (
    <div className="space-y-0">
      <SettingsSection title="Export Data">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <FileDown className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">Download Your Data</p>
              <p className="text-xs text-muted-foreground">Export all your data as JSON</p>
            </div>
          </div>

          <Button variant="outline" onClick={handleDownloadData} disabled={isDownloadingData} className="w-full" size="sm">
            {isDownloadingData ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Preparing...</> : <><Download className="h-3.5 w-3.5 mr-1.5" />Download Data</>}
          </Button>

          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">What's included:</p>
            <div className="grid grid-cols-2 gap-1">
              {dataItems.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-1 w-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Your Rights">
        <div className="p-4 space-y-2">
          {rights.map((right, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Scale className="h-3 w-3 text-green-500" />
              </div>
              {right}
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Danger Zone">
        <div className="p-4 space-y-3">
          <SettingsInfoBox variant="destructive" icon={AlertTriangle}>
            <p className="font-semibold">Delete Account</p>
            <p className="text-xs mt-0.5 opacity-80">Permanently delete your account and all data. This cannot be undone.</p>
          </SettingsInfoBox>
          <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="w-full" size="sm">
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete My Account
          </Button>
        </div>
      </SettingsSection>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Your profile and posts</li>
                <li>All messages and chats</li>
                <li>Followers and following</li>
                <li>Tips, gifts, and purchases</li>
              </ul>
              <p className="font-semibold text-destructive">This cannot be undone!</p>
              <div className="space-y-1.5">
                <p className="text-sm">Type <strong>DELETE</strong> to confirm:</p>
                <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Type DELETE" className="font-mono" />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeletingAccount || deleteConfirmText !== 'DELETE'} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
