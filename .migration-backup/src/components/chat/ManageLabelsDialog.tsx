import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tag, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface LabelType {
  id: string;
  name: string;
  color: string;
}

interface ManageLabelsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const LABEL_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', 
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', 
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', 
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
];

export const ManageLabelsDialog = ({ isOpen, onClose }: ManageLabelsDialogProps) => {
  const { user } = useAuth();
  const [labels, setLabels] = useState<LabelType[]>([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#8b5cf6');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadLabels();
    }
  }, [isOpen, user]);

  const loadLabels = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('chat_labels')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading labels:', error);
      return;
    }

    setLabels(data || []);
  };

  const handleCreateLabel = async () => {
    if (!user || !newLabelName.trim()) {
      toast.error('Please enter a label name');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('chat_labels')
        .insert({
          user_id: user.id,
          name: newLabelName.trim(),
          color: selectedColor,
        });

      if (error) throw error;

      toast.success('Label created');
      setNewLabelName('');
      setSelectedColor('#8b5cf6');
      loadLabels();
    } catch (error: any) {
      console.error('Error creating label:', error);
      if (error.code === '23505') {
        toast.error('Label name already exists');
      } else {
        toast.error('Failed to create label');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('chat_labels')
        .delete()
        .eq('id', labelId);

      if (error) throw error;

      toast.success('Label deleted');
      loadLabels();
    } catch (error) {
      console.error('Error deleting label:', error);
      toast.error('Failed to delete label');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Manage Labels
          </DialogTitle>
          <DialogDescription>
            Create labels to categorize and filter your chats
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Label */}
          <div className="space-y-4 p-4 rounded-xl border bg-card">
            <Label>Create New Label</Label>
            
            <Input
              placeholder="Label name..."
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleCreateLabel();
                }
              }}
            />

            <div className="space-y-2">
              <Label className="text-xs">Color</Label>
              <div className="grid grid-cols-8 gap-2">
                {LABEL_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`h-10 w-10 rounded-lg border-2 transition-all hover:scale-110 ${
                      selectedColor === color
                        ? 'border-foreground shadow-lg ring-2 ring-offset-2 ring-foreground'
                        : 'border-border hover:border-foreground/50'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {newLabelName && (
              <div className="flex items-center gap-2">
                <Label className="text-xs">Preview:</Label>
                <Badge
                  style={{
                    backgroundColor: selectedColor,
                    color: 'white',
                  }}
                >
                  {newLabelName}
                </Badge>
              </div>
            )}

            <Button
              onClick={handleCreateLabel}
              disabled={loading || !newLabelName.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Label
            </Button>
          </div>

          {/* Existing Labels */}
          <div className="space-y-2">
            <Label>Your Labels ({labels.length})</Label>
            <ScrollArea className="h-[200px] rounded-lg border">
              <div className="p-4 space-y-2">
                {labels.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No labels yet. Create one to get started!
                  </p>
                ) : (
                  labels.map((label) => (
                    <div
                      key={label.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <Badge
                        style={{
                          backgroundColor: label.color,
                          color: 'white',
                        }}
                        className="text-sm"
                      >
                        {label.name}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteLabel(label.id)}
                        disabled={loading}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <Button onClick={onClose} variant="outline" className="w-full">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
};
