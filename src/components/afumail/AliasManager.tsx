import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag, AtSign, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Alias {
  id: string;
  alias_email: string;
  label: string | null;
  is_active: boolean;
  is_plus_address: boolean;
  created_at: string;
}

interface AliasManagerProps {
  mailboxEmail: string | null;
  onClose: () => void;
}

export function AliasManager({ mailboxEmail, onClose }: AliasManagerProps) {
  const { user } = useAuth();
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAlias, setNewAlias] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [aliasType, setAliasType] = useState<'custom' | 'plus'>('custom');
  const [creating, setCreating] = useState(false);

  const fetchAliases = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('afumail_aliases')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) setAliases(data as Alias[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAliases(); }, [fetchAliases]);

  const handleCreate = async () => {
    if (!user || !newAlias.trim()) return;
    setCreating(true);

    let aliasEmail: string;
    if (aliasType === 'plus') {
      // Plus-addressing: username+tag@afuchat.com
      if (!mailboxEmail) {
        toast.error('Mailbox not initialized');
        setCreating(false);
        return;
      }
      const base = mailboxEmail.split('@')[0];
      const tag = newAlias.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (!tag) {
        toast.error('Invalid tag');
        setCreating(false);
        return;
      }
      aliasEmail = `${base}+${tag}@afuchat.com`;
    } else {
      // Custom alias
      const prefix = newAlias.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
      if (prefix.length < 3) {
        toast.error('Alias must be at least 3 characters');
        setCreating(false);
        return;
      }
      aliasEmail = `${prefix}@afuchat.com`;
    }

    const { error } = await supabase.from('afumail_aliases').insert({
      user_id: user.id,
      alias_email: aliasEmail,
      label: newLabel.trim() || null,
      is_plus_address: aliasType === 'plus',
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('This alias is already taken');
      } else {
        toast.error('Failed to create alias');
      }
    } else {
      toast.success(`Alias ${aliasEmail} created`);
      setNewAlias('');
      setNewLabel('');
      fetchAliases();
    }
    setCreating(false);
  };

  const toggleActive = async (alias: Alias) => {
    await supabase
      .from('afumail_aliases')
      .update({ is_active: !alias.is_active })
      .eq('id', alias.id);
    setAliases(prev => prev.map(a => a.id === alias.id ? { ...a, is_active: !a.is_active } : a));
  };

  const deleteAlias = async (id: string) => {
    await supabase.from('afumail_aliases').delete().eq('id', id);
    setAliases(prev => prev.filter(a => a.id !== id));
    toast.success('Alias deleted');
  };

  const baseHandle = mailboxEmail?.split('@')[0] || 'you';

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Email Aliases</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>Done</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Info */}
        <div className="rounded-xl bg-muted/50 p-4 flex gap-3 text-sm text-muted-foreground">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground mb-1">Alias emails</p>
            <p>Create custom aliases (e.g. <strong>hello@afuchat.com</strong>) or plus-addresses (e.g. <strong>{baseHandle}+shop@afuchat.com</strong>). All emails sent to aliases arrive in your main inbox.</p>
          </div>
        </div>

        {/* Create form */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setAliasType('custom')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                aliasType === 'custom'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <AtSign className="h-4 w-4 inline mr-1.5" />
              Custom Alias
            </button>
            <button
              onClick={() => setAliasType('plus')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                aliasType === 'plus'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Plus className="h-4 w-4 inline mr-1.5" />
              Plus Address
            </button>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                placeholder={aliasType === 'custom' ? 'alias name' : 'tag name'}
                className="pr-32"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {aliasType === 'custom' ? '@afuchat.com' : `${baseHandle}+...@afuchat.com`}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (optional, e.g. Shopping, Work)"
              className="flex-1"
            />
            <Button onClick={handleCreate} disabled={creating || !newAlias.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Aliases list */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Your Aliases ({aliases.length})</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : aliases.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No aliases yet. Create one above.</p>
          ) : (
            aliases.map(alias => (
              <div
                key={alias.id}
                className={`flex items-center gap-3 p-3 rounded-xl border border-border transition-opacity ${
                  !alias.is_active ? 'opacity-50' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alias.alias_email}</p>
                  {alias.label && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {alias.label}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {alias.is_plus_address ? 'Plus address' : 'Custom alias'}
                    {!alias.is_active && ' · Inactive'}
                  </p>
                </div>
                <button onClick={() => toggleActive(alias)} className="text-muted-foreground hover:text-foreground">
                  {alias.is_active
                    ? <ToggleRight className="h-6 w-6 text-primary" />
                    : <ToggleLeft className="h-6 w-6" />
                  }
                </button>
                <button onClick={() => deleteAlias(alias.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Plus-addressing auto-support info */}
        <div className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">💡 Auto plus-addressing</p>
          <p>You can use <strong>{baseHandle}+anything@afuchat.com</strong> anywhere — it will automatically arrive in your inbox, no setup needed. Creating plus-address aliases here lets you label and manage them.</p>
        </div>
      </div>
    </div>
  );
}
