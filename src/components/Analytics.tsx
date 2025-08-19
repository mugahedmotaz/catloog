import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

const gaId = (import.meta as any).env?.VITE_GA4_ID as string | undefined;
const pixelId = (import.meta as any).env?.VITE_META_PIXEL_ID as string | undefined;

function loadGA(id: string) {
  if (document.getElementById('ga4-script')) return;
  const script = document.createElement('script');
  script.async = true;
  script.id = 'ga4-script';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(){
    // @ts-ignore
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag as any;
  if (typeof window.gtag === 'function') {
    window.gtag('js', new Date());
    window.gtag('config', id);
  }
}

function loadPixel(id: string) {
  if (document.getElementById('fb-pixel')) return;
  // Initialize fbq function safely
  const w = window as Window & { fbq?: any; _fbq?: any };
  if (!w.fbq) {
    const fbq: any = function (...args: any[]) {
      if ((fbq as any).callMethod) {
        (fbq as any).callMethod.apply(fbq, args);
      } else {
        ((fbq as any).queue = (fbq as any).queue || []).push(args);
      }
    };
    (fbq as any).push = fbq;
    (fbq as any).loaded = true;
    (fbq as any).version = '2.0';
    (fbq as any).queue = [];
    w.fbq = fbq;
    w._fbq = fbq;
  }

  const script = document.createElement('script');
  script.async = true;
  script.id = 'fb-pixel';
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  const firstScript = document.getElementsByTagName('script')[0];
  firstScript?.parentNode?.insertBefore(script, firstScript);

  w.fbq('init', id);
}

export function Analytics() {
  const location = useLocation();

  // init scripts
  useEffect(() => {
    // respect DNT if needed
    const dnt = (navigator as any).doNotTrack === '1' || (window as any).doNotTrack === '1';
    if (dnt) return;

    if (gaId) loadGA(gaId);
    if (pixelId) loadPixel(pixelId);
  }, []);

  // track route changes
  useEffect(() => {
    // GA4 SPA page_view
    if (gaId && window.gtag) {
      window.gtag('config', gaId, {
        page_path: location.pathname + location.search,
      });
    }
    // Meta Pixel PageView
    if (pixelId && window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [location, gaId, pixelId]);

  return null;
}
