import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Check, X, ExternalLink, Eye, RefreshCw, Package } from 'lucide-react';
import { format } from 'date-fns';

interface MiniProgram {
  id: string;
  name: string;
  description: string | null;
  url: string;
  icon_url: string | null;
  category: string | null;
  developer_id: string;
  status: string;
  created_at: string;
  developer_email?: string | null;
  profiles?: {
    display_name: string | null;
    handle: string | null;
  } | null;
}

export const AdminMiniProgramsPanel = () => {
  const [programs, setPrograms] = useState<MiniProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mini_programs')
        .select(`
          id,
          name,
          description,
          url,
          icon_url,
          category,
          developer_id,
          status,
          created_at,
          developer_email,
          profiles!mini_programs_developer_id_fkey(display_name, handle)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrograms((data as unknown as MiniProgram[]) || []);
    } catch (error) {
      console.error('Error fetching mini programs:', error);
      toast.error('Failed to load mini programs');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('mini_programs')
        .update({ 
          status,
          is_published: status === 'approved' // Auto-publish when approved
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(`App ${status === 'approved' ? 'approved and published' : 'rejected'} successfully`);
      await fetchPrograms();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>;
    }
  };

  const pendingCount = programs.filter(p => p.status === 'pending').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Mini Programs
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingCount} pending</Badge>
              )}
            </CardTitle>
            <CardDescription>Review and approve submitted mini programs</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPrograms} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : programs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No mini programs submitted yet</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead className="hidden md:table-cell">Developer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {program.icon_url ? (
                          <img 
                            src={program.icon_url} 
                            alt={program.name}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-sm">{program.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {program.description || 'No description'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs capitalize">
                        {program.category || 'Other'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">
                        {program.profiles?.display_name || program.profiles?.handle || 'Unknown'}
                      </div>
                      {program.developer_email && (
                        <div className="text-xs text-muted-foreground">{program.developer_email}</div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(program.status)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {format(new Date(program.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(program.url, '_blank')}
                          title="Preview App"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {program.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                              onClick={() => updateStatus(program.id, 'approved')}
                              disabled={processingId === program.id}
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => updateStatus(program.id, 'rejected')}
                              disabled={processingId === program.id}
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {program.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => updateStatus(program.id, 'rejected')}
                            disabled={processingId === program.id}
                            title="Revoke"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {program.status === 'rejected' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                            onClick={() => updateStatus(program.id, 'approved')}
                            disabled={processingId === program.id}
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
