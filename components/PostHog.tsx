'use client';

import posthog from 'posthog-js';
import { useEffect } from 'react';

// Pageviews (including client-side navigations) and autocapture come from
// the `defaults` snapshot; nothing else needs wiring.
export default function PostHog() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    // No token (e2e, previews without the env) means no tracking.
    if (!token) return;
    posthog.init(token, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      defaults: '2026-08-30'
    });
  }, []);
  return null;
}
