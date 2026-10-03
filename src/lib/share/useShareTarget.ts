import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorShareTarget, type ShareReceivedEvent } from '@capgo/capacitor-share-target';

interface UseShareTargetOptions {
  onReceiveShare: (sharedText: string) => void;
}

export function useShareTarget({ onReceiveShare }: UseShareTargetOptions) {
  useEffect(() => {
    // 1. Web Share Target PWA query params parsing
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        const text = url.searchParams.get('text');
        const title = url.searchParams.get('title');
        const sharedContent = text || title;

        if (sharedContent && sharedContent.trim()) {
          onReceiveShare(sharedContent.trim());

          // Clear the query params from the URL without triggering a page reload
          url.searchParams.delete('text');
          url.searchParams.delete('title');
          const cleanUrl = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '');
          window.history.replaceState({}, document.title, cleanUrl || '/');
        }
      } catch (err) {
        console.warn('Share target parsing error:', err);
      }
    }

    // 2. Native Android Capacitor Share Target listener
    let isMounted = true;
    let removeListener: (() => void) | undefined;

    if (Capacitor.isNativePlatform()) {
      CapacitorShareTarget.addListener('shareReceived', (event: ShareReceivedEvent) => {
        if (!isMounted) return;
        const textContent = (event.texts && event.texts.length > 0)
          ? event.texts.join('\n')
          : (event.title || '');

        if (textContent.trim()) {
          onReceiveShare(textContent.trim());
        }
      })
        .then((handle) => {
          removeListener = () => handle.remove();
        })
        .catch((err) => {
          console.warn('Failed to register native CapacitorShareTarget listener:', err);
        });
    }

    return () => {
      isMounted = false;
      if (removeListener) {
        removeListener();
      }
    };
  }, [onReceiveShare]);
}
