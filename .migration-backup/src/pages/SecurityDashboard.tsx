import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Shield, Key, Activity, Bell, Smartphone, 
  Clock, MapPin, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LoginHistory {
  id: string;
  login_time: string;
  ip_address: string | null;
  user_agent: string | null;
  location: string | null;
  success: boolean;
}

interface ActiveSession {
  id: string;
  device_name: string | null;
  browser: string | null;
  ip_address: string | null;
  last_active: string;
  created_at: string;
  expires_at: string;
}

interface SecurityAlert {
  id: string;
  alert_type: string;
  alert_message: string;
  is_read: boolean;
  created_at: string;
}

const SecurityDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [inactiveSessions, setInactiveSessions] = useState<ActiveSession[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastLogin, setLastLogin] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSecurityData();
    }
  }, [user]);

  const fetchSecurityData = async () => {
    if (!user) return;

    try {
      const [historyRes, sessionsRes, alertsRes] = await Promise.all([
        supabase
          .from('login_history')
          .select('*')
          .eq('user_id', user.id)
          .eq('success', true)
          .order('login_time', { ascending: false })
          .limit(10),
        supabase
          .from('active_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('last_active', { ascending: false }),
        supabase
          .from('security_alerts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      if (historyRes.data) {
        setLoginHistory(historyRes.data);
        // Get the most recent successful login
        if (historyRes.data.length > 0) {
          setLastLogin(historyRes.data[0].login_time);
        }
      }
      
      if (sessionsRes.data) {
        const now = new Date();
        const active = sessionsRes.data.filter(
          session => new Date(session.expires_at) > now
        );
        const inactive = sessionsRes.data.filter(
          session => new Date(session.expires_at) <= now
        );
        setActiveSessions(active);
        setInactiveSessions(inactive);
      }
      
      if (alertsRes.data) setSecurityAlerts(alertsRes.data);
    } catch (error) {
      console.error('Error fetching security data:', error);
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('active_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Session revoked successfully');
      fetchSecurityData();
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error('Failed to revoke session');
    }
  };

  const handleMarkAlertRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;

      setSecurityAlerts(alerts =>
        alerts.map(alert =>
          alert.id === alertId ? { ...alert, is_read: true } : alert
        )
      );
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading security data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur hidden lg:block">
        <div className="flex h-14 items-center px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-4 text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Dashboard
          </h1>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto p-4 space-y-6 pb-24">
        {/* Last Login Info */}
        {lastLogin && (
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last login</p>
                <p className="font-semibold">
                  {format(new Date(lastLogin), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Security Alerts */}
        {securityAlerts.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Security Alerts</h2>
            </div>
            <div className="space-y-3">
              {securityAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    alert.is_read ? 'bg-muted/30' : 'bg-primary/5 border-primary/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <AlertTriangle className={`h-5 w-5 mt-0.5 ${alert.is_read ? 'text-muted-foreground' : 'text-primary'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium capitalize">{alert.alert_type.replace('_', ' ')}</span>
                          {!alert.is_read && <Badge variant="default" className="text-xs">New</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.alert_message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    {!alert.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAlertRead(alert.id)}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Sessions with Tabs */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Sessions</h2>
          </div>
          
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">
                Active ({activeSessions.length})
              </TabsTrigger>
              <TabsTrigger value="inactive">
                Inactive ({inactiveSessions.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="mt-4">
              {activeSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active sessions found</p>
              ) : (
                <div className="space-y-3">
                  {activeSessions.map((session) => (
                    <div key={session.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{session.device_name || 'Unknown Device'}</span>
                            <Badge variant="default" className="text-xs">Active</Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {session.browser && (
                              <div className="flex items-center gap-2">
                                <Activity className="h-3 w-3" />
                                <span>{session.browser}</span>
                              </div>
                            )}
                            {session.ip_address && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>{session.ip_address}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>Last active: {format(new Date(session.last_active), 'MMM dd, HH:mm')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>Expires: {format(new Date(session.expires_at), 'MMM dd, HH:mm')}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeSession(session.id)}
                        >
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="inactive" className="mt-4">
              {inactiveSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No inactive sessions found</p>
              ) : (
                <div className="space-y-3">
                  {inactiveSessions.map((session) => (
                    <div key={session.id} className="p-4 rounded-lg border bg-muted/30 opacity-75">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{session.device_name || 'Unknown Device'}</span>
                            <Badge variant="secondary" className="text-xs">Expired</Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {session.browser && (
                              <div className="flex items-center gap-2">
                                <Activity className="h-3 w-3" />
                                <span>{session.browser}</span>
                              </div>
                            )}
                            {session.ip_address && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>{session.ip_address}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>Last active: {format(new Date(session.last_active), 'MMM dd, HH:mm')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>Expired: {format(new Date(session.expires_at), 'MMM dd, HH:mm')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        {/* Login History */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Recent Login Activity</h2>
          </div>
          {loginHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No login history found</p>
          ) : (
            <div className="space-y-3">
              {loginHistory.map((login) => (
                <div key={login.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start gap-3">
                    {login.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {login.success ? 'Successful login' : 'Failed login attempt'}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(login.login_time), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                        {login.ip_address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            <span>{login.ip_address}</span>
                          </div>
                        )}
                        {login.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            <span>{login.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Security Actions</h2>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/settings?section=security')}
            >
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default SecurityDashboard;
