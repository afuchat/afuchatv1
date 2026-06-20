import { Mail, MessageCircle, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SupportContactProps {
  variant?: 'default' | 'compact';
  showTitle?: boolean;
}

export const SupportContact = ({ variant = 'default', showTitle = true }: SupportContactProps) => {
  const supportEmail = 'support@afuchat.com';

  if (variant === 'compact') {
    return (
      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">Need help?</p>
            <a 
              href={`mailto:${supportEmail}`}
              className="text-sm text-primary hover:underline"
            >
              {supportEmail}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Contact Support
          </CardTitle>
          <CardDescription>
            Get help from our support team
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
            <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Email Support</p>
              <a 
                href={`mailto:${supportEmail}`}
                className="text-sm text-primary hover:underline break-all"
              >
                {supportEmail}
              </a>
              <p className="text-xs text-muted-foreground mt-2">
                Response time: 24-48 hours
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
            <MessageCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">In-App Support</p>
              <p className="text-xs text-muted-foreground">
                Use the support option in your settings for quick assistance
              </p>
            </div>
          </div>
        </div>

        <Button 
          className="w-full"
          onClick={() => window.location.href = `mailto:${supportEmail}`}
        >
          <Mail className="h-4 w-4 mr-2" />
          Send Email
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Before contacting support:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Check our FAQ section</li>
            <li>Include relevant details about your issue</li>
            <li>Attach screenshots if applicable</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
