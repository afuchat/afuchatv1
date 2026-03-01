import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SEO } from '@/components/SEO';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background select-none">
      <SEO 
        title="Privacy Policy — AfuChat"
        description="Learn how AfuChat protects your privacy. We're committed to data security, transparency, and your rights under GDPR and other regulations."
        image="https://afuchat.com/og/privacy.jpg"
      />
      <PageHeader 
        title="Privacy Policy" 
        icon={<Shield className="h-5 w-5 text-primary" />}
      />

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Version 2.2.0 | Last Updated: March 2, 2026</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Welcome to AfuChat. Your privacy is important to us, and we are committed to protecting your personal information and being transparent about how we collect, use, and share your data.
            </p>
            <p className="text-foreground/90 leading-relaxed mb-4">
              By accessing or using AfuChat, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use our services.
            </p>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We comply with major privacy regulations including GDPR (General Data Protection Regulation), CCPA (California Consumer Privacy Act), and other applicable data protection laws worldwide to ensure your rights are protected.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Information You Provide Directly</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              When you create an account, we collect your display name, handle, email address, phone number (optional), profile photo, bio, and any other information you choose to provide. When you use our services, we collect the content you create, share, and interact with, including posts, messages, comments, photos, videos, and voice recordings.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Information Collected Automatically</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We automatically collect certain information when you use AfuChat, including your IP address, device information (device type, operating system, browser type), usage data (features you use, actions you take, time and duration of activities), location information (if you grant permission), and cookies and similar tracking technologies to enhance your experience.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Information from Third Parties</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We may receive information about you from other users, third-party services you connect to your account, and publicly available sources to enhance our services and verify information you provide.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Service Provision and Improvement</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We use your information to provide, maintain, and improve our services, including creating and managing your account, facilitating communication between users, processing transactions (virtual currency, gifts, marketplace items), and personalizing your experience based on your preferences and activity.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Platform Enhancement</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Your data helps us understand how users interact with our platform, develop new features and services, analyze trends and usage patterns, and conduct research and testing to improve user experience and platform performance.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Safety and Security</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We use your information to protect the security of our platform and users, detect and prevent fraud, spam, and abuse, enforce our Terms of Use and policies, verify user identity when necessary, and respond to legal requests and prevent illegal activities.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Communications</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We may use your information to send you service-related notifications, updates about new features and improvements, promotional communications (with your consent), and respond to your inquiries and support requests.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Legal Compliance</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We process your information to comply with legal obligations, respond to legal processes and government requests, protect our rights and property, and resolve disputes and enforce agreements.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Creator Earnings Program</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              If you participate in our Creator Earnings program, we collect and process engagement data (views, likes, replies) on your posts to calculate your share of daily earnings. We also collect your mobile money phone number and network provider for processing withdrawals. This financial data is handled securely and used solely for payment processing purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">AI and Machine Learning</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">AI-Powered Features</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              AfuChat uses artificial intelligence and machine learning technologies to provide various features including content recommendations, AI chat assistants, automatic translations, image and content analysis, and spam and abuse detection. These AI systems are designed to enhance your experience while respecting your privacy.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Data Processing for AI</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              When you interact with AI features, we may process your content, messages, and usage patterns to train and improve our AI models. However, we implement strict privacy safeguards including data anonymization, secure processing environments, and user control over AI feature usage. You can opt out of certain AI features in your settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              AfuChat may integrate with third-party services to provide certain features. These integrations are designed to enhance your experience while respecting your privacy. We only share necessary information with third-party services and require them to protect your data appropriately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Information Sharing and Disclosure</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              <strong>We do not sell your personal information to third parties for monetary consideration.</strong>
            </p>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We may share your information in the following circumstances: with other users as per your privacy settings and actions (public posts, direct messages, profile information), with service providers who help us operate our platform (cloud hosting, payment processing, analytics), with business partners for integrated features and services (with your consent), when required by law or legal process, in connection with a business transaction (merger, acquisition, sale of assets), and with your explicit consent for specific purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We implement comprehensive security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Technical Safeguards</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Our technical security measures include encryption of data in transit and at rest using industry-standard protocols, secure authentication systems including two-factor authentication options, regular security audits and vulnerability assessments, access controls and monitoring systems, and secure backup and disaster recovery procedures.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Organizational Measures</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We maintain organizational security through employee training on data protection and privacy, limited access to personal information on a need-to-know basis, confidentiality agreements with employees and contractors, incident response procedures for data breaches, and regular review and update of security policies and practices.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Privacy Rights</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Depending on your location, you may have certain rights regarding your personal information:
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Access Your Data</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You have the right to request a copy of the personal information we hold about you. You can export your data through your account settings or contact us for assistance.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Correct Your Information</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You can update and correct your personal information at any time through your profile settings. If you need help correcting information, please contact our support team.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Request Data Deletion</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You have the right to request deletion of your personal information. You can delete your account through account settings, which will initiate the removal of your data subject to legal retention requirements. Some information may be retained for legitimate business purposes or legal compliance.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Control Your Privacy Settings</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You can control who sees your posts and profile information, manage your notification preferences, opt out of certain data collection and AI features, disable location tracking, and control cookie preferences through your privacy settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us, and we will take steps to delete such information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">International Data Transfers</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that are different from the laws of your country. We take appropriate safeguards to ensure that your personal information remains protected in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Changes to This Privacy Policy</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes. Changes are effective when posted.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              For privacy concerns, questions about this policy, or to exercise your privacy rights, please contact us through:
            </p>
            <div className="space-y-3 mb-4">
              <a 
                href="mailto:support@afuchat.com" 
                className="flex items-center gap-2 text-primary hover:underline w-fit"
              >
                <span>Email: support@afuchat.com</span>
              </a>
              <button
                onClick={() => navigate('/support')}
                className="flex items-center gap-2 text-primary hover:underline w-fit cursor-pointer"
              >
                <span>In-app Support Center</span>
              </button>
            </div>
            <p className="text-foreground/90 leading-relaxed">
              We are committed to resolving any privacy concerns you may have and will respond to your inquiries within a reasonable timeframe.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
