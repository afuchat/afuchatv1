import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Github, Code, Rocket, BarChart3, Zap, Loader2 } from 'lucide-react';
import { clearDeveloperCache } from '@/hooks/useDeveloperStatus';

interface DeveloperApplicationFormProps {
  onSuccess: () => void;
}

const SKILL_OPTIONS = [
  'React',
  'TypeScript',
  'Node.js',
  'Python',
  'Mobile Development',
  'API Development',
  'UI/UX Design',
  'Database Management',
  'DevOps',
  'Other'
];

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner (0-1 years)' },
  { value: 'intermediate', label: 'Intermediate (1-3 years)' },
  { value: 'advanced', label: 'Advanced (3-5 years)' },
  { value: 'expert', label: 'Expert (5+ years)' },
];

const DeveloperApplicationForm = ({ onSuccess }: DeveloperApplicationFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    github_username: '',
    portfolio_url: '',
    experience_level: '',
    reason: '',
    skills: [] as string[],
  });

  const handleSkillToggle = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to apply');
      return;
    }

    if (!formData.reason.trim()) {
      toast.error('Please explain why you want to become a developer');
      return;
    }

    if (!formData.experience_level) {
      toast.error('Please select your experience level');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('developer_applications')
        .insert({
          user_id: user.id,
          github_username: formData.github_username || null,
          portfolio_url: formData.portfolio_url || null,
          experience_level: formData.experience_level,
          reason: formData.reason,
          skills: formData.skills,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already submitted an application');
        } else {
          throw error;
        }
        return;
      }

      clearDeveloperCache(user.id);
      toast.success('Application submitted! We will review it shortly.');
      onSuccess();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="w-5 h-5" />
          Developer Application
        </CardTitle>
        <CardDescription>
          Apply to become an AfuChat Developer and unlock exclusive features
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Benefits Preview */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Code className="w-4 h-4 text-primary" />
            <span className="text-sm">API Access</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Rocket className="w-4 h-4 text-primary" />
            <span className="text-sm">Beta Features</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm">Custom Integrations</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm">Developer Analytics</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="github">GitHub Username (optional)</Label>
            <Input
              id="github"
              placeholder="your-username"
              value={formData.github_username}
              onChange={(e) => setFormData(prev => ({ ...prev, github_username: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio">Portfolio URL (optional)</Label>
            <Input
              id="portfolio"
              type="url"
              placeholder="https://your-portfolio.com"
              value={formData.portfolio_url}
              onChange={(e) => setFormData(prev => ({ ...prev, portfolio_url: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Experience Level</Label>
            <Select
              value={formData.experience_level}
              onValueChange={(value) => setFormData(prev => ({ ...prev, experience_level: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your experience level" />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map(level => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Skills</Label>
            <div className="grid grid-cols-2 gap-2">
              {SKILL_OPTIONS.map(skill => (
                <div key={skill} className="flex items-center space-x-2">
                  <Checkbox
                    id={skill}
                    checked={formData.skills.includes(skill)}
                    onCheckedChange={() => handleSkillToggle(skill)}
                  />
                  <label htmlFor={skill} className="text-sm cursor-pointer">
                    {skill}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Why do you want to become a developer?</Label>
            <Textarea
              id="reason"
              placeholder="Tell us about your goals and what you'd like to build..."
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={4}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Github className="w-4 h-4 mr-2" />
                Submit Application
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default DeveloperApplicationForm;
