import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  type?: string;
  image?: string;
}

export function SEO({
  title = 'Skeptic | The AI Website Auditor',
  description = 'AI tool that analyzes websites and finds UX, SEO, and conversion problems to improve performance and turn more visitors into paying customers.',
  canonical,
  type = 'website',
  image = 'https://ai-conversion-optimizer.com/og-image.jpg', // Placeholder for actual OG image
}: SEOProps) {
  const siteName = 'Skeptic';
  const fullTitle = title === siteName ? title : `${title} | ${siteName}`;

  return (
    <Helmet>
      {/* Standard Metadata Settings */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:image" content={image} />
      {canonical && <meta property="og:url" content={canonical} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Search Engine Directives */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
    </Helmet>
  );
}
