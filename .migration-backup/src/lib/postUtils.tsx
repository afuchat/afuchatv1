import React from 'react';

/**
 * Extracts URLs from text content including plain domains
 */
export function extractUrls(text: string): string[] {
  // Match both https?:// URLs and plain domain names like afuchat.com.afu (multi-part TLDs)
  const urlRegex = /(https?:\/\/[^\s]+|(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s]*)?)/g;
  const matches = text.match(urlRegex);
  
  // Normalize URLs - add https:// to plain domains if needed
  return matches?.map(url => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }) || [];
}

/**
 * Extracts hashtags from text content
 */
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const matches = Array.from(text.matchAll(hashtagRegex));
  return matches.map(match => match[1]);
}
