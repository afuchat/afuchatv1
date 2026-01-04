import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SEO } from '@/components/SEO';

const TermsOfUse = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background select-none">
      <SEO 
        title="Terms of Use — AfuChat"
        description="Read AfuChat's Terms of Use. Learn about user rights, content policies, virtual currency, Creator Earnings program, and account guidelines."
        image="https://afuchat.com/og/terms.jpg"
      />
      <PageHeader 
        title="Terms of Use" 
        icon={<FileText className="h-5 w-5 text-primary" />}
      />

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Terms of Use</h1>
          <p className="text-muted-foreground mb-8">Version 2.2.0 | Last Updated: December 28, 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Acceptance of Terms</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              By accessing or using AfuChat, you agree to be bound by these Terms of Use and all applicable laws and regulations. These terms constitute a legally binding agreement between you and AfuChat. If you do not agree with any part of these terms, you must not use our services.
            </p>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You must be at least 13 years old to use our service. If you are under 18, you must have permission from a parent or legal guardian. By using AfuChat, you represent and warrant that you meet these age requirements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Description of Service</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              AfuChat is a comprehensive social networking platform that provides users with various features including:
            </p>
            <ul className="list-disc list-inside text-foreground/90 leading-relaxed mb-4 ml-4">
              <li>Social posting and interaction</li>
              <li>Direct messaging and group chats</li>
              <li>Moments/stories sharing</li>
              <li>Virtual currency (Nexa) and digital gifts system</li>
              <li>Marketplace for virtual items</li>
              <li>Mini-programs and integrated services</li>
              <li>AI-powered features and chatbot</li>
              <li>Gamification elements and leaderboards</li>
              <li>Business and affiliate programs</li>
              <li>Premium subscriptions with verified status</li>
              <li>Telegram Mini App and bot integration</li>
              <li>Mobile-optimized web experience</li>
            </ul>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We reserve the right to modify, suspend, or discontinue any part of our services at any time without prior notice. We strive to provide reliable service but do not guarantee uninterrupted or error-free access.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">User Accounts and Registration</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              To use AfuChat, you must create an account by providing accurate, current, and complete information including a unique handle, display name, and valid email address or phone number. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You agree to immediately notify us of any unauthorized use of your account or any other breach of security. We are not liable for any loss or damage arising from your failure to protect your account information.
            </p>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You may not:
            </p>
            <ul className="list-disc list-inside text-foreground/90 leading-relaxed mb-4 ml-4">
              <li>Transfer your account to another person</li>
              <li>Create multiple accounts to abuse our services</li>
              <li>Use automated means to create accounts or interact with our services</li>
              <li>Impersonate another person or entity</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">User Content and Conduct</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You retain all ownership rights to the content you post on AfuChat. However, by posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, distribute, and display your content in connection with operating and providing our services.
            </p>
            <p className="text-foreground/90 leading-relaxed mb-4">
              This license continues even if you stop using our services, for content that has been shared with others and they have not deleted. You can delete your content and account at any time, which will remove your content from public view, subject to technical limitations and legal requirements.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Prohibited Content and Conduct</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You agree not to post or share content that:
            </p>
            <ul className="list-disc list-inside text-foreground/90 leading-relaxed mb-4 ml-4">
              <li>Is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable</li>
              <li>Infringes on intellectual property rights, privacy rights, or other rights of any party</li>
              <li>Contains viruses or malicious code</li>
              <li>Promotes illegal activities or violence</li>
              <li>Is spam, commercial solicitation, or unauthorized advertising</li>
              <li>Impersonates another person or entity</li>
              <li>Contains false or misleading information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">AI-Generated Content</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              AfuChat offers AI-powered features including chatbots, content generation, and automatic translations. AI-generated content may not always be accurate, appropriate, or reliable. You acknowledge that AI systems can make mistakes and you should verify important information from authoritative sources.
            </p>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We are not responsible for any decisions you make based on AI-generated content. You use AI features at your own risk and should exercise independent judgment. AI-generated content does not represent the views or opinions of AfuChat.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Virtual Currency and Transactions</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              AfuChat uses a virtual currency called "Nexa" that can be earned through platform activities or purchased. Nexa has no real-world monetary value and cannot be exchanged for cash or legal tender. All transactions involving Nexa are final and non-refundable.
            </p>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You may use Nexa to purchase virtual gifts, marketplace items, and access certain features within the platform. We reserve the right to modify the value, earning rates, and availability of Nexa at any time. Upon account termination, any remaining Nexa balance will be forfeited without compensation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Creator Earnings Program</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              AfuChat offers a Creator Earnings program that allows eligible content creators in Uganda to earn real money (UGX) based on daily engagement on their posts. Participation in this program is subject to the following terms:
            </p>
            <ul className="list-disc list-inside text-foreground/90 leading-relaxed mb-4 ml-4">
              <li><strong>Eligibility:</strong> You must have at least 10 followers and 500+ weekly views to qualify. Eligibility is checked daily.</li>
              <li><strong>Daily Calculation:</strong> Earnings are calculated based on TODAY's engagement only (views, likes, replies). Past engagement cannot be retroactively credited.</li>
              <li><strong>No Fraud:</strong> Fake engagement, bot interactions, self-likes, engagement farming, or any fraudulent activity will result in permanent ban and forfeiture of earnings.</li>
              <li><strong>Withdrawals:</strong> Minimum withdrawal is 5,000 UGX, available only on weekends via MTN or Airtel Mobile Money. A 10% platform fee applies.</li>
              <li><strong>Team Approval:</strong> All withdrawals are reviewed by our team. We may reject or delay suspicious requests.</li>
              <li><strong>No Guarantees:</strong> Earnings depend on your share of the daily pool. There is no guaranteed minimum.</li>
              <li><strong>Tax Responsibility:</strong> You are responsible for any applicable taxes on your earnings.</li>
              <li><strong>Program Changes:</strong> We reserve the right to modify, suspend, or terminate the program at any time without notice.</li>
            </ul>
            <p className="text-foreground/90 leading-relaxed mb-4">
              By participating in the Creator Earnings program, you agree to these terms and acknowledge that missed earnings due to ineligibility cannot be recovered.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Prohibited Conduct</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              In addition to content restrictions, you agree not to:
            </p>
            <ul className="list-disc list-inside text-foreground/90 leading-relaxed mb-4 ml-4">
              <li>Interfere with or disrupt our services or servers</li>
              <li>Attempt to gain unauthorized access to any part of our services, other users' accounts, or connected systems</li>
              <li>Use our services for any illegal purpose or in violation of any local, state, national, or international law</li>
              <li>Harvest or collect information about other users without their consent</li>
              <li>Create or distribute unsolicited communications (spam)</li>
              <li>Manipulate or exploit our systems, including the virtual currency or gamification systems</li>
              <li>Engage in any activity that could damage, disable, or impair our services</li>
              <li>Violate any third-party rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Content Moderation</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We reserve the right, but are not obligated, to monitor, review, and moderate user content and activities on our platform. We may remove or restrict access to any content that violates these Terms of Use, our Community Guidelines, or applicable laws, at our sole discretion and without prior notice.
            </p>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We may also take action against accounts that repeatedly violate our policies, including warnings, temporary suspensions, or permanent bans. Our moderation decisions are final, though you may appeal by contacting our support team.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Account Termination and Suspension</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We reserve the right to suspend or terminate your account at any time, with or without cause, and with or without notice, if we believe you have violated these Terms of Use or engaged in conduct that we deem inappropriate or harmful to other users or our services.
            </p>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You may also terminate your account at any time through your account settings. Upon termination, your right to use our services will immediately cease. Provisions of these Terms that by their nature should survive termination will remain in effect, including ownership provisions, warranty disclaimers, and limitations of liability.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Intellectual Property Rights</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              The AfuChat service, including all content, features, and functionality, is owned by AfuChat and is protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Our trademarks, service marks, and logos may not be used without our prior written consent. All other trademarks, service marks, and logos used on our platform are the property of their respective owners.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Disclaimer of Warranties</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              AfuChat is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that our services will be uninterrupted, secure, or error-free, or that any defects will be corrected.
            </p>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We make no warranties about the accuracy, reliability, completeness, or timeliness of content, services, software, or communications provided through our platform. Your use of AfuChat is at your sole risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              To the fullest extent permitted by applicable law, AfuChat and its affiliates, officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses resulting from your access to or use of (or inability to access or use) our services.
            </p>
            <p className="text-foreground/90 leading-relaxed mb-4">
              In no event shall our total liability to you for all claims related to our services exceed the amount you paid us in the past twelve months, or $100, whichever is greater. Some jurisdictions do not allow the exclusion of certain warranties or the limitation of liability, so some of the above limitations may not apply to you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Indemnification</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You agree to defend, indemnify, and hold harmless AfuChat and its affiliates, officers, directors, employees, and agents from and against any claims, damages, obligations, losses, liabilities, costs, or expenses arising from your use of our services, your violation of these Terms, or your violation of any third-party rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Governing Law and Dispute Resolution</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the Republic of Uganda, without regard to its conflict of law provisions.
            </p>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Any disputes arising out of or relating to these Terms or our services shall be resolved through the courts of Uganda, or through alternative dispute resolution mechanisms available under Ugandan law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We reserve the right to modify or replace these Terms at any time. We will provide notice of significant changes by posting the new Terms on this page and updating the "Last Updated" date. Your continued use of our services after any changes indicates your acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              If you have any questions about these Terms of Use or need to report a violation, please contact us through:
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
              We will respond to your inquiries within a reasonable timeframe.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
};

export default TermsOfUse;
