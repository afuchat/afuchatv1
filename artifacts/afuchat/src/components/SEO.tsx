import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'AfuChat';
const SITE_URL = 'https://afuchat.com';
const DEFAULT_IMAGE = 'https://storage.googleapis.com/gpt-engineer-file-uploads/whhFMyYxVrYCuMq4BfursQL7NCK2/social-images/social-1762461646897-1000016150.jpg';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

export const SEO = ({
  title = `${SITE_NAME} — Social Super-App: Post, Chat, Shop & AI`,
  description = 'Join AfuChat — the all-in-one social super-app. Post like X, chat like Telegram, send gifts, shop, and use built-in AI. Fast, private, and data-friendly.',
  keywords = 'social media, social network, messaging app, chat, online shopping, AI assistant, post photos, share updates, connect, community, marketplace, gifts, e-commerce, AI chatbot, super app',
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
}: SEOProps) => {
  const resolvedUrl = url
    ? (url.startsWith('http') ? url : `${SITE_URL}${url}`)
    : SITE_URL;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <link rel="canonical" href={resolvedUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={resolvedUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter / X Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@afuchat" />
    </Helmet>
  );
};
