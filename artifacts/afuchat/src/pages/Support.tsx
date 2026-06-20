import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MessageCircle, HelpCircle, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { SEO } from '@/components/SEO';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const contactSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(100, { message: "Name must be less than 100 characters" }),
  email: z.string().trim().email({ message: "Invalid email address" }).max(255, { message: "Email must be less than 255 characters" }),
  subject: z.string().trim().min(1, { message: "Subject is required" }).max(200, { message: "Subject must be less than 200 characters" }),
  message: z.string().trim().min(10, { message: "Message must be at least 10 characters" }).max(2000, { message: "Message must be less than 2000 characters" })
});

type ContactFormData = z.infer<typeof contactSchema>;

const Support = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: ''
    }
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.functions.invoke('send-support-email', {
        body: data
      });

      if (error) throw error;

      toast.success('Support request sent successfully! We\'ll get back to you soon.');
      form.reset();
    } catch (error: any) {
      console.error('Error sending support request:', error);
      toast.error('Failed to send support request. Please try emailing us directly at support@afuchat.com');
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    {
      question: "How do I create an account?",
      answer: "Click 'Sign Up' on the welcome page. You can register with your email or use Google/GitHub OAuth. Complete your profile with a display name, username, and optional profile picture. Check your email for verification (if email confirmation is enabled)."
    },
    {
      question: "How do I reset or change my password?",
      answer: "For logged-in users: Go to Settings > Account > Change Password. For forgotten passwords: Click 'Forgot Password' on the sign-in page and follow the email instructions to reset your password securely."
    },
    {
      question: "How do I update my profile picture?",
      answer: "Go to your profile and click 'Edit Profile' or navigate to Settings > Profile. Upload a new image (JPG, PNG, or GIF, max 5MB). You can also upload a profile picture during sign-up."
    },
    {
      question: "What are Nexa points and how do I earn them?",
      answer: "Nexa is our main virtual currency. Earn Nexa by: daily login streaks, completing your profile, posting content, engaging with others, playing games, and achieving milestones. Use Nexa to send gifts, purchase shop items, transfer to other users, or convert to ACoin for premium features."
    },
    {
      question: "How do I send gifts or Nexa to other users?",
      answer: "Navigate to the Gifts page or the user's profile. Select a gift or use the Transfer feature to send Nexa directly. Add an optional message and confirm the transaction. The recipient will be notified immediately."
    },
    {
      question: "What is the difference between public and private accounts?",
      answer: "Public accounts: Anyone can see your posts and profile. Private accounts: Only approved followers can see your content. You can toggle this in Settings > Profile > Privacy Settings."
    },
    {
      question: "How do chat and messaging work?",
      answer: "Access Chats from the navigation menu. Start a 1-on-1 chat with any user or create group chats. Messages support text, images, files, voice messages, and reactions. Use read receipts to see when messages are read."
    },
    {
      question: "What are AI features and are they free?",
      answer: "AfuChat includes AI features for post generation, translation, and image descriptions. Currently, these features are marked as 'Coming Soon' and will be available in future updates. When launched, basic AI features will be free with usage limits."
    },
    {
      question: "How do I report inappropriate content or users?",
      answer: "Click the three-dot menu on any post or visit a user's profile and select 'Report'. Choose a reason (spam, harassment, inappropriate content, etc.) and submit. Our moderation team reviews reports within 24-48 hours."
    },
    {
      question: "What are verified and business badges?",
      answer: "Verified badges (blue checkmark) confirm authentic accounts of notable individuals or organizations. Business badges identify business accounts. Apply for verification in Settings > Verification Request with required documentation."
    },
    {
      question: "How do I delete my account?",
      answer: "Go to Settings > Account > Delete Account. This action is permanent and will delete all your data including posts, messages, and profile information. You'll have a 30-day grace period before permanent deletion."
    },
    {
      question: "Can I use AfuChat on multiple devices?",
      answer: "Yes! AfuChat syncs across all your devices. Sign in with the same account on web, mobile, or desktop. Your messages, posts, and settings will sync automatically. Manage active sessions in Settings > Security."
    },
    {
      question: "What happens to my data if I delete my account?",
      answer: "Most data is deleted within 30-90 days. Some data may persist in backups for up to 180 days for technical reasons. Public content cached by others may remain visible. See our Privacy Policy for complete details."
    },
    {
      question: "How do I enable or disable notifications?",
      answer: "Go to Settings > Notifications to customize: push notifications, email notifications, and notification types (follows, likes, replies, mentions). You can also enable/disable sound and vibration for different notification categories."
    },
    {
      question: "What are Mini Programs?",
      answer: "Mini Programs are lightweight third-party applications that run within AfuChat. Browse available programs in the Mini Programs section, install with one click, and access them from your menu. Developers can create custom Mini Programs using our SDK."
    },
    {
      question: "How does the referral system work?",
      answer: "Share your unique referral link (found in your Profile > Referrals tab). When someone signs up using your link, they receive 1 week free Premium subscription and you earn 500 Nexa! Track your referrals and rewards in your profile."
    },
    {
      question: "Can I schedule posts for later?",
      answer: "Post scheduling is currently not available but is planned for a future update. For now, posts are published immediately when you create them."
    },
    {
      question: "How do I block or unblock someone?",
      answer: "Visit the user's profile, click the three-dot menu, and select 'Block'. Blocked users cannot see your content or contact you. Unblock users from Settings > Privacy > Blocked Users."
    },
    {
      question: "What is the difference between Following and Followers?",
      answer: "Following: Accounts you choose to follow (you'll see their posts in your feed). Followers: Users who follow you (they see your posts). Both lists are accessible from your profile page."
    },
    {
      question: "How do I change my username?",
      answer: "Go to Settings > Profile > Edit Profile and update your username (handle). Usernames are case-insensitive and must be unique. Note: Changing your username updates your profile URL."
    },
    {
      question: "What is Business Mode?",
      answer: "Business Mode allows organizations to access additional features like affiliate management, business dashboard, and analytics. Apply for business verification through Settings > Verification Request with required business documentation."
    },
    {
      question: "How does the Nexa and leveling system work?",
      answer: "You earn Nexa (experience points) by engaging with the platform - posting content, daily logins, completing profile, and achievements. Your Nexa determines your grade level, which unlocks special features, badges, and shop items. Check your current level on your profile page."
    },
    {
      question: "What are gifts and how do I send them?",
      answer: "Gifts are virtual items you can send to other users using your Nexa. Visit the Gifts page to browse available gifts, select one, search for a recipient, add an optional message, and confirm. Seasonal gifts are available during special events with limited-time availability."
    },
    {
      question: "What are tips and how do they work?",
      answer: "Tips allow you to support content creators by sending them Nexa directly on their posts. Click the tip button on any post, enter the amount (minimum varies), add an optional message, and confirm. Recipients are notified immediately and receive the Nexa in their account."
    },
    {
      question: "Can I use AfuChat on mobile?",
      answer: "Yes! AfuChat is fully responsive and works great on mobile browsers (iOS Safari, Chrome, etc.). The app is optimized for touch interactions and provides a native app-like experience."
    },
    {
      question: "How do I enable push notifications?",
      answer: "Go to Settings > Notifications and click 'Enable Push Notifications'. Allow notifications when your browser prompts you. You can customize which types of notifications you receive (follows, likes, messages, etc.) and manage notification preferences anytime."
    },
    {
      question: "What languages does AfuChat support?",
      answer: "AfuChat currently supports English, Spanish (Español), French (Français), Arabic (العربية), and Swahili (Kiswahili). Change your language preference in Settings > Language. The interface and most content will be displayed in your selected language."
    },
    {
      question: "How do I become an affiliate?",
      answer: "Visit the Affiliate Request page through Settings > Affiliate Program. You must first connect with a business account that you want to be affiliated with. Fill out the request form with relevant information, and the business will review and approve your request. Once approved, you'll earn commissions on referrals."
    },
    {
      question: "What is the difference between Nexa transfers and tips?",
      answer: "Nexa Transfers: Direct peer-to-peer transfers of any amount between users (accessible via Transfer page). Tips: Rewards for specific posts showing appreciation for content (accessible via tip button on posts). Both use your Nexa balance."
    },
    {
      question: "How do I play games and earn rewards?",
      answer: "Navigate to the Games section from the menu. Choose from available games (Memory, Puzzle, Trivia, Nexa Collector). Play to earn Nexa based on your score and difficulty level. You can also challenge friends to compete for higher scores and bragging rights."
    },
    {
      question: "What are Red Envelopes?",
      answer: "Red Envelopes are a fun way to distribute Nexa to multiple users in group chats. Create an envelope with a total Nexa amount and number of recipients. The first users to claim will randomly receive a portion. It's perfect for celebrations and events."
    },
    {
      question: "How does the Shop work?",
      answer: "The Shop offers exclusive items you can purchase with XP: profile accessories, special themes, avatar customizations, and limited-edition items. Some items are featured or on discount. Purchased items appear in your inventory and can be equipped or used."
    },
    {
      question: "How does Creator Earnings work?",
      answer: "Creator Earnings is a program for Ugandan creators to earn real money (UGX) from their content engagement. 5,000 UGX is distributed daily among eligible creators based on today's views, likes, and replies. To be eligible, you need 10+ followers and 500+ weekly views. Withdraw to MTN or Airtel Money on weekends. Note: Only today's engagement counts - past engagement cannot be credited retroactively."
    },
    {
      question: "Why didn't I receive my Creator Earnings?",
      answer: "Earnings are only credited if you're eligible at the time of engagement. You must have 10+ followers and 500+ weekly views. If you weren't eligible when engagement happened, those earnings are missed and cannot be credited retroactively. Become eligible as soon as possible to start earning from new engagement."
    },
    {
      question: "Can I download my data?",
      answer: "Yes! You have the right to download a copy of your data. Contact support@afuchat.com with 'Data Export Request' in the subject line. We'll provide a complete export of your posts, messages, profile data, and activity within 30 days as required by data protection laws."
    },
    {
      question: "What should I do if my account is hacked?",
      answer: "Immediately: 1) Try to change your password if you still have access. 2) Contact support@afuchat.com with 'Security Alert - Account Compromised' in the subject. 3) Check Settings > Security > Active Sessions and terminate suspicious sessions. 4) Enable two-factor authentication once you regain access."
    },
    {
      question: "How do I enable two-factor authentication (2FA)?",
      answer: "Two-factor authentication adds an extra layer of security to your account. Go to Settings > Security > Two-Factor Authentication and follow the setup instructions. You'll need an authenticator app (Google Authenticator, Authy, etc.) to scan the QR code."
    },
    {
      question: "What's new in Version 2.2.0?",
      answer: "Version 2.2.0 includes enhanced real-time feed updates with pull-to-refresh, Telegram Mini App integration, and AI-powered features for premium users. We've also improved chat customization with AI-generated themes and wallpapers."
    },
    {
      question: "How does Telegram integration work?",
      answer: "AfuChat integrates with Telegram in two ways: 1) Telegram Bot - interact with AfuChat features directly in Telegram using inline buttons. 2) Telegram Mini App - access the full AfuChat experience within Telegram. Link your accounts in Settings > Telegram Linking to sync your data across both platforms."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Support Center" />

      {/* Main Content */}
      <main className="container max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24">
        <SEO 
          title="Support Center — AfuChat"
          description="Get help with AfuChat. Find answers to frequently asked questions, contact our support team, and learn how to use all features."
          image="https://afuchat.com/og/support.jpg"
        />
        <div className="text-center mb-12">
          <HelpCircle className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Support Center</h1>
          <p className="text-muted-foreground text-lg mb-2">
            We're here to help you get the most out of AfuChat
          </p>
          <button
            onClick={() => navigate('/whats-new')}
            className="inline-flex items-center gap-2 text-primary hover:underline text-sm mb-2"
          >
            <Sparkles className="h-4 w-4" />
            See what's new in v2.2.0
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Contact Us
              </CardTitle>
              <CardDescription>
                Send us a message and we'll respond within 24-48 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="How can we help?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your issue or question in detail..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Quick Contact Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Direct Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Prefer to email us directly? Send your inquiries to:
                </p>
                <a 
                  href="mailto:support@afuchat.com"
                  className="text-lg font-medium text-primary hover:underline"
                >
                  support@afuchat.com
                </a>
                <p className="text-xs text-muted-foreground mt-4">
                  Average response time: 24-48 hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Support Hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monday - Friday</span>
                  <span className="font-medium">9:00 AM - 6:00 PM EST</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Saturday - Sunday</span>
                  <span className="font-medium">Limited Support</span>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Emergency issues are prioritized 24/7
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
            <CardDescription>
              Find quick answers to common questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Additional Help */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Can't find what you're looking for?{' '}
            <a href="mailto:support@afuchat.com" className="text-primary hover:underline">
              Contact our support team
            </a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Support;
