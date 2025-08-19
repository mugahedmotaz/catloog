import { useEffect } from 'react';

export type SEOProps = {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: Record<string, any> | Record<string, any>[];
};

function upsertMeta(attr: 'name' | 'property', key: string, content?: string) {
  if (!content) return;
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href?: string) {
  if (!href) return;
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertRobots(noindex?: boolean) {
  const content = noindex ? 'noindex,nofollow' : 'index,follow';
  upsertMeta('name', 'robots', content);
}

function removeTag(selector: string) {
  const el = document.querySelector(selector);
  if (el) el.parentElement?.removeChild(el);
}

export default function SEO({ title, description, canonical, image, noindex, jsonLd }: SEOProps) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) upsertMeta('name', 'description', description);

    const envBase = (import.meta as any)?.env?.VITE_SITE_URL as string | undefined;
    const base = envBase ? envBase.replace(/\/$/, '') : (typeof window !== 'undefined' ? window.location.origin : undefined);
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : undefined;
    const computedCanonical = canonical || (base && currentPath ? `${base}${currentPath}` : undefined);
    if (computedCanonical) upsertLink('canonical', computedCanonical);

    // Open Graph
    upsertMeta('property', 'og:type', 'website');
    if (title) upsertMeta('property', 'og:title', title);
    if (description) upsertMeta('property', 'og:description', description);
    if (computedCanonical) upsertMeta('property', 'og:url', computedCanonical);
    if (image) upsertMeta('property', 'og:image', image);

    // Twitter
    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    if (title) upsertMeta('name', 'twitter:title', title);
    if (description) upsertMeta('name', 'twitter:description', description);
    if (image) upsertMeta('name', 'twitter:image', image);

    // Robots
    upsertRobots(noindex);

    // JSON-LD
    const scriptId = 'seo-jsonld';
    removeTag(`#${scriptId}`);
    if (jsonLd) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      // don't tear down common tags; just remove json-ld on unmount/update via id above
    };
  }, [title, description, canonical, image, noindex, JSON.stringify(jsonLd)]);

  return null;
}
