import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Megaphone, Plus, Eye, MousePointer, TrendingUp, Pause, Play, 
  Trash2, DollarSign, Target, BarChart3, ImageIcon, Link, FileText
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface AdCampaign {
  id: string;
  ad_type: string;
  placement: string;
  status: string;
  title: string | null;
  content: string | null;
  image_url: string | null;
  target_url: string | null;
  daily_budget: number;
  total_spent: number;
  impressions: number;
  clicks: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

interface Post {
  id: string;
  content: string;
  image_url: string | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  active: 'bg-green-500/10 text-green-500',
  paused: 'bg-orange-500/10 text-orange-500',
  completed: 'bg-blue-500/10 text-blue-500',
  rejected: 'bg-destructive/10 text-destructive',
};

const AdManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [userAcoin, setUserAcoin] = useState(0);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [adType, setAdType] = useState<string>('custom_ad');
  const [placement, setPlacement] = useState<string>('all');
  const [dailyBudget, setDailyBudget] = useState<string>('10');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Fetch user's ACoin balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('acoin')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUserAcoin(profile.acoin || 0);
      }

      // Fetch user's campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('ad_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Fetch user's posts for promoted post option
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, content, image_url')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setUserPosts(postsData || []);
    } catch (error) {
      console.error('Error fetching ad data:', error);
      toast.error('Failed to load ad data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!user) return;
    
    const budget = parseInt(dailyBudget);
    if (isNaN(budget) || budget < 10) {
      toast.error('Minimum daily budget is 10 ACoin');
      return;
    }

    if (budget > userAcoin) {
      toast.error('Insufficient ACoin balance');
      return;
    }

    if (adType === 'promoted_post' && !selectedPostId) {
      toast.error('Please select a post to promote');
      return;
    }

    if (adType === 'custom_ad' && (!title || !content)) {
      toast.error('Please fill in title and content');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_ad_campaign', {
        p_ad_type: adType,
        p_placement: placement,
        p_daily_budget: budget,
        p_title: title || null,
        p_content: content || null,
        p_image_url: imageUrl || null,
        p_target_url: targetUrl || null,
        p_post_id: adType === 'promoted_post' ? selectedPostId : null,
        p_product_id: null,
        p_end_date: null
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };
      if (result.success) {
        toast.success('Ad campaign created!');
        setShowCreateDialog(false);
        resetForm();
        fetchData();
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (campaign: AdCampaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    
    try {
      const { error } = await supabase
        .from('ad_campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id);

      if (error) throw error;
      
      toast.success(`Campaign ${newStatus === 'active' ? 'resumed' : 'paused'}`);
      fetchData();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('ad_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      
      toast.success('Campaign deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };

  const resetForm = () => {
    setAdType('custom_ad');
    setPlacement('all');
    setDailyBudget('10');
    setTitle('');
    setContent('');
    setImageUrl('');
    setTargetUrl('');
    setSelectedPostId('');
  };

  const totalSpent = campaigns.reduce((sum, c) => sum + c.total_spent, 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader 
        title="Ad Manager" 
        subtitle="Promote your content"
        icon={<Megaphone className="h-5 w-5 text-primary" />}
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Coming Soon Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Megaphone className="h-12 w-12 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Coming Soon
          </h2>
          
          <p className="text-muted-foreground text-center max-w-md mb-6">
            The Ad Manager feature is currently under development. Soon you'll be able to promote your content and reach more users.
          </p>
          
          <Button onClick={() => navigate('/home')} variant="outline">
            Go Back Home
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default AdManager;
