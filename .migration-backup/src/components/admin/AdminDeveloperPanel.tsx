import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Code, Search, User, Loader2, Shield, X } from 'lucide-react';

interface UserProfile {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
}

interface Developer {
  id: string;
  user_id: string;
  granted_at: string;
  features_enabled: string[] | null;
  user?: UserProfile;
}

const AdminDeveloperPanel = () => {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchDevelopers = async () => {
    try {
      const { data, error } = await supabase
        .from('developer_roles')
        .select('*')
        .order('granted_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map(dev => dev.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, handle, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const devsWithUsers = data.map(dev => ({
          ...dev,
          user: profileMap.get(dev.user_id)
        }));

        setDevelopers(devsWithUsers);
      } else {
        setDevelopers([]);
      }
    } catch (error) {
      console.error('Error fetching developers:', error);
      toast.error('Failed to load developers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevelopers();
  }, []);

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url')
        .or(`handle.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      // Filter out users who are already developers
      const developerIds = new Set(developers.map(d => d.user_id));
      const filtered = (data || []).filter(u => !developerIds.has(u.id));
      
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, developers]);

  const promoteToDeveloper = async (userId: string) => {
    setProcessing(userId);
    try {
      const { error } = await supabase
        .from('developer_roles')
        .insert({
          user_id: userId,
          features_enabled: ['api_access', 'beta_features', 'custom_integrations', 'developer_analytics']
        });

      if (error) throw error;

      toast.success('User promoted to developer!');
      setSearchQuery('');
      setSearchResults([]);
      fetchDevelopers();
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error('Failed to promote user');
    } finally {
      setProcessing(null);
    }
  };

  const revokeDeveloper = async (userId: string) => {
    setProcessing(userId);
    try {
      const { error } = await supabase
        .from('developer_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Developer access revoked');
      fetchDevelopers();
    } catch (error) {
      console.error('Error revoking developer:', error);
      toast.error('Failed to revoke access');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Code className="w-5 h-5" />
          Developer Management
        </h2>
        <Badge variant="outline">
          {developers.length} developers
        </Badge>
      </div>

      {/* Search & Promote Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Promote User to Developer
          </CardTitle>
          <CardDescription>
            Search for a trusted user and grant them developer access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by username or display name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y">
              {searchResults.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt="" 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{user.display_name}</p>
                      <p className="text-xs text-muted-foreground">@{user.handle}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => promoteToDeveloper(user.id)}
                    disabled={processing === user.id}
                  >
                    {processing === user.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Promote'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {searchQuery && !searching && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No users found
            </p>
          )}
        </CardContent>
      </Card>

      {/* Current Developers List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Developers</CardTitle>
          <CardDescription>
            Users with developer access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {developers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No developers yet
            </p>
          ) : (
            <div className="space-y-2">
              {developers.map(dev => (
                <div key={dev.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {dev.user?.avatar_url ? (
                      <img 
                        src={dev.user.avatar_url} 
                        alt="" 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{dev.user?.display_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">@{dev.user?.handle || 'unknown'}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => revokeDeveloper(dev.user_id)}
                    disabled={processing === dev.user_id}
                  >
                    {processing === dev.user_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-1" />
                        Revoke
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDeveloperPanel;
