import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Users, Radio, Shield, Loader2, RefreshCw } from 'lucide-react';
import { UserAvatar } from '@/components/avatar/UserAvatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GroupChannel {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_group: boolean;
  is_channel: boolean;
  is_verified: boolean;
  created_at: string;
  created_by: string;
  member_count?: number;
  creator?: {
    display_name: string;
    handle: string;
  };
}

export const AdminGroupChannelVerification = () => {
  const [groups, setGroups] = useState<GroupChannel[]>([]);
  const [channels, setChannels] = useState<GroupChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    fetchGroupsAndChannels();
  }, []);

  const fetchGroupsAndChannels = async () => {
    setLoading(true);
    try {
      // Fetch groups (is_group = true, is_channel = false)
      const { data: groupsData } = await supabase
        .from('chats')
        .select(`
          id, name, description, avatar_url, is_group, is_channel, is_verified, created_at, created_by,
          profiles!chats_created_by_fkey(display_name, handle)
        `)
        .eq('is_group', true)
        .eq('is_channel', false)
        .order('created_at', { ascending: false });

      // Fetch channels (is_channel = true)
      const { data: channelsData } = await supabase
        .from('chats')
        .select(`
          id, name, description, avatar_url, is_group, is_channel, is_verified, created_at, created_by,
          profiles!chats_created_by_fkey(display_name, handle)
        `)
        .eq('is_channel', true)
        .order('created_at', { ascending: false });

      // Get member counts for all groups and channels
      const allIds = [...(groupsData || []), ...(channelsData || [])].map(g => g.id);
      
      const memberCounts: Record<string, number> = {};
      if (allIds.length > 0) {
        const { data: membersData } = await supabase
          .from('chat_members')
          .select('chat_id')
          .in('chat_id', allIds);

        if (membersData) {
          membersData.forEach(m => {
            memberCounts[m.chat_id] = (memberCounts[m.chat_id] || 0) + 1;
          });
        }
      }

      const formatData = (data: any[]) => data?.map(item => ({
        ...item,
        member_count: memberCounts[item.id] || 0,
        creator: item.profiles
      })) || [];

      setGroups(formatData(groupsData || []));
      setChannels(formatData(channelsData || []));
    } catch (error) {
      console.error('Error fetching groups/channels:', error);
      toast.error('Failed to load groups and channels');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (chatId: string, verify: boolean) => {
    setVerifying(chatId);
    try {
      const { error } = await supabase
        .from('chats')
        .update({ is_verified: verify })
        .eq('id', chatId);

      if (error) throw error;

      // Update local state
      setGroups(prev => prev.map(g => g.id === chatId ? { ...g, is_verified: verify } : g));
      setChannels(prev => prev.map(c => c.id === chatId ? { ...c, is_verified: verify } : c));

      toast.success(verify ? 'Verified successfully' : 'Verification removed');
    } catch (error) {
      console.error('Error updating verification:', error);
      toast.error('Failed to update verification status');
    } finally {
      setVerifying(null);
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  const renderTable = (items: GroupChannel[], type: 'group' | 'channel') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Creator</TableHead>
          <TableHead>Members</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
              No {type}s found
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <UserAvatar
                    userId={item.id}
                    avatarUrl={item.avatar_url}
                    name={item.name || type}
                    size={36}
                  />
                  <div>
                    <p className="font-medium flex items-center gap-1">
                      {item.name || `Unnamed ${type}`}
                      {item.is_verified && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <p>{item.creator?.display_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">@{item.creator?.handle || 'unknown'}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{item.member_count} members</Badge>
              </TableCell>
              <TableCell>
                {item.is_verified ? (
                  <Badge className="bg-primary text-primary-foreground">Verified</Badge>
                ) : (
                  <Badge variant="secondary">Unverified</Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(item.created_at)}
              </TableCell>
              <TableCell className="text-right">
                {verifying === item.id ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                ) : item.is_verified ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVerify(item.id, false)}
                    className="gap-1"
                  >
                    <XCircle className="h-4 w-4" />
                    Remove
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleVerify(item.id, true)}
                    className="gap-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Verify
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Group & Channel Verification
          </h2>
          <p className="text-sm text-muted-foreground">Manage verification status for groups and channels</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchGroupsAndChannels} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="groups">
        <TabsList>
          <TabsTrigger value="groups" className="gap-2">
            <Users className="h-4 w-4" />
            Groups ({groups.length})
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-2">
            <Radio className="h-4 w-4" />
            Channels ({channels.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Groups
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {renderTable(groups, 'group')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Radio className="h-5 w-5 text-purple-500" />
                Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {renderTable(channels, 'channel')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{groups.length}</div>
            <p className="text-xs text-muted-foreground">Total Groups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{groups.filter(g => g.is_verified).length}</div>
            <p className="text-xs text-muted-foreground">Verified Groups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{channels.length}</div>
            <p className="text-xs text-muted-foreground">Total Channels</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{channels.filter(c => c.is_verified).length}</div>
            <p className="text-xs text-muted-foreground">Verified Channels</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
