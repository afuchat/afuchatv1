import { useNavigate } from 'react-router-dom';
import { Sparkles, MessageCircle, Users, Gift, Gamepad2, Shield, Smartphone, Zap, Globe, Star } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { SEO } from '@/components/SEO';

const WhatsNew = () => {
  const navigate = useNavigate();

  const currentVersion = {
    version: "2.2.0",
    releaseDate: "December 28, 2025",
    highlights: [
      "Mobile-first experience with optimized performance",
      "Enhanced real-time messaging and notifications",
      "Improved Creator Earnings program for Ugandan creators",
      "New seasonal gifts and marketplace features"
    ]
  };

  const features = [
    {
      icon: MessageCircle,
      title: "Real-time Messaging",
      description: "Instant messaging with read receipts, reactions, voice messages, and group chats. Stay connected with friends and communities.",
      badge: "Core"
    },
    {
      icon: Users,
      title: "Social Feed",
      description: "Share posts, photos, and moments with your followers. Engage with likes, comments, and reposts.",
      badge: "Core"
    },
    {
      icon: Gift,
      title: "Virtual Gifts & Nexa",
      description: "Send beautiful virtual gifts to friends using Nexa points. Earn Nexa through daily activities and engagement.",
      badge: "Popular"
    },
    {
      icon: Gamepad2,
      title: "Mini Games",
      description: "Play Memory, Puzzle, and Trivia games to earn Nexa. Challenge friends and climb the leaderboards.",
      badge: "Fun"
    },
    {
      icon: Star,
      title: "Creator Earnings",
      description: "Eligible Ugandan creators can earn real money (UGX) based on daily engagement. Withdraw via Mobile Money.",
      badge: "Earn"
    },
    {
      icon: Shield,
      title: "Premium Subscription",
      description: "Get verified status, AI-powered features, custom chat themes, and exclusive badges with Premium.",
      badge: "Premium"
    },
    {
      icon: Smartphone,
      title: "Mobile Optimized",
      description: "AfuChat is fully optimized for mobile browsers with a native app-like experience.",
      badge: "New"
    },
    {
      icon: Globe,
      title: "Multi-language",
      description: "Available in English, Spanish, French, Arabic, and Swahili. More languages coming soon.",
      badge: "Global"
    },
    {
      icon: Zap,
      title: "AI Features",
      description: "AI-powered post generation, translations, and chat assistants for Premium users.",
      badge: "AI"
    }
  ];

  const recentUpdates = [
    {
      version: "2.2.0",
      date: "December 2025",
      changes: [
        "Mobile-only experience for optimized performance",
        "Enhanced pull-to-refresh on all feeds",
        "Improved offline-first functionality",
        "New seasonal Christmas gifts collection",
        "Updated Terms and Privacy policies"
      ]
    },
    {
      version: "2.1.0",
      date: "November 2025",
      changes: [
        "Telegram Mini App integration",
        "AI-generated chat themes and wallpapers",
        "Enhanced real-time notifications",
        "Improved message reactions and replies",
        "Red Envelope feature for group gifting"
      ]
    },
    {
      version: "2.0.0",
      date: "October 2025",
      changes: [
        "Complete UI redesign with dark mode",
        "Creator Earnings program launch",
        "Marketplace for virtual items",
        "Group and channel chats",
        "Mini Programs platform"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="What's New — AfuChat v2.2.0"
        description="Discover the latest features and improvements in AfuChat. Mobile-first experience, enhanced messaging, Creator Earnings, and more."
        image="https://afuchat.com/og/whats-new.jpg"
      />
      <PageHeader
        title="What's New" 
        icon={<Sparkles className="h-5 w-5 text-primary" />}
      />

      <main className="container max-w-4xl mx-auto px-4 py-8 pb-24">
        {/* Hero Section */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">Version {currentVersion.version}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">What's New in AfuChat</h1>
          <p className="text-muted-foreground text-lg mb-6">
            Discover the latest features and improvements
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {currentVersion.highlights.map((highlight, index) => (
              <Badge key={index} variant="secondary" className="text-sm">
                {highlight}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Released: {currentVersion.releaseDate}
          </p>
        </motion.div>

        {/* Features Grid */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Platform Features</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{feature.title}</h3>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {feature.badge}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Version History */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Version History</h2>
          <div className="space-y-6">
            {recentUpdates.map((update, index) => (
              <motion.div
                key={update.version}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        v{update.version}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{update.date}</span>
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                          Current
                        </Badge>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {update.changes.map((change, changeIndex) => (
                        <li key={changeIndex} className="flex items-start gap-2 text-sm text-foreground/90">
                          <span className="text-primary mt-1">•</span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <motion.section 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-2">Have Feedback?</h3>
              <p className="text-muted-foreground mb-4">
                We'd love to hear your thoughts on the new features and improvements.
              </p>
              <Button onClick={() => navigate('/support')}>
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </motion.section>
      </main>
    </div>
  );
};

export default WhatsNew;
