import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'AfuChat';
const SITE_URL = 'https://afuchat.com';
const DEFAULT_DESCRIPTION = 'AfuChat — The all-in-one social super-app. Post, chat, shop, send gifts, and use built-in AI. Fast, private, and data-friendly.';
const DEFAULT_IMAGE = 'https://cdn.afuchat.com/og/afuchat-og.jpg';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'profile' | 'article';
  jsonLd?: object | object[];
  noindex?: boolean;
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
}

export function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  jsonLd,
  noindex = false,
  author,
  publishedAt,
  updatedAt,
}: SEOHeadProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Social Super-App`;
  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL;
  const resolvedImage = image || DEFAULT_IMAGE;

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };

  const jsonLdArray = [
    websiteJsonLd,
    ...(jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []),
  ];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {author && <meta name="author" content={author} />}
      {publishedAt && <meta property="article:published_time" content={publishedAt} />}
      {updatedAt && <meta property="article:modified_time" content={updatedAt} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type === 'profile' ? 'profile' : type === 'article' ? 'article' : 'website'} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedImage} />
      <meta name="twitter:site" content="@afuchat" />

      {/* JSON-LD structured data */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLdArray)}
      </script>
    </Helmet>
  );
}

export function ProfileSEO({ handle, displayName, bio, avatarUrl }: {
  handle: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
}) {
  const description = bio
    ? `${displayName} (@${handle}) on AfuChat — ${bio}`
    : `${displayName} (@${handle}) on AfuChat`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: displayName,
    alternateName: `@${handle}`,
    description: bio || undefined,
    image: avatarUrl || undefined,
    url: `${SITE_URL}/@${handle}`,
    sameAs: [`${SITE_URL}/@${handle}`],
  };

  return (
    <SEOHead
      title={`${displayName} (@${handle})`}
      description={description}
      image={avatarUrl || DEFAULT_IMAGE}
      url={`/@${handle}`}
      type="profile"
      jsonLd={jsonLd}
      author={displayName}
    />
  );
}

export function PostSEO({ postId, content, authorName, authorHandle, imageUrl, createdAt }: {
  postId: string;
  content: string;
  authorName: string;
  authorHandle: string;
  imageUrl?: string | null;
  createdAt?: string;
}) {
  const snippet = content.length > 160 ? content.slice(0, 157) + '…' : content;
  const description = `${authorName} on AfuChat: "${snippet}"`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    headline: snippet,
    author: {
      '@type': 'Person',
      name: authorName,
      alternateName: `@${authorHandle}`,
      url: `${SITE_URL}/@${authorHandle}`,
    },
    datePublished: createdAt,
    image: imageUrl || undefined,
    url: `${SITE_URL}/post/${postId}`,
    sharedContent: { '@type': 'WebPage', url: `${SITE_URL}/post/${postId}` },
  };

  return (
    <SEOHead
      title={`${authorName}: "${snippet.slice(0, 60)}"`}
      description={description}
      image={imageUrl || DEFAULT_IMAGE}
      url={`/post/${postId}`}
      type="article"
      jsonLd={jsonLd}
      author={authorName}
      publishedAt={createdAt}
    />
  );
}
