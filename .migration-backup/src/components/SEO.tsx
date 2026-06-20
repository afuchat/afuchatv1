import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

export const SEO = ({
  title = "AfuChat — Social Network, Messaging, Shopping & AI Assistant Platform",
  description = "Join AfuChat, the ultimate social media platform combining posting, instant messaging, online shopping, and AI chat. Connect with friends, share moments, chat privately, discover products, and get AI assistance all in one app. Free to join, easy to use, mobile-friendly social networking.",
  keywords = "social media, social network, messaging app, instant messaging, chat app, online shopping, AI assistant, post photos, share updates, connect with friends, social networking, mobile chat, group chat, private messaging, online community, social platform, buy and sell, marketplace, e-commerce, AI chatbot",
  image = "https://storage.googleapis.com/gpt-engineer-file-uploads/whhFMyYxVrYCuMq4BfursQL7NCK2/social-images/social-1762461646897-1000016150.jpg",
  url = window.location.href,
  type = "website"
}: SEOProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper function to update or create meta tag
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);

    // Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', url, true);
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:site_name', 'AfuChat', true);

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);

    // Additional SEO tags
    updateMetaTag('robots', 'index, follow');
    updateMetaTag('googlebot', 'index, follow');
    updateMetaTag('application-name', 'AfuChat');
  }, [title, description, keywords, image, url, type]);

  return null;
};
