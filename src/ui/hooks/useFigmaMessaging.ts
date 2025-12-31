import { useCallback, useEffect } from 'react';
import type { PluginMessageToCode, PluginMessageToUi } from '@/types';

type MessageHandler = (message: PluginMessageToUi) => void;

/**
 * Figma 플러그인 메시지 통신 훅
 * Single Responsibility: 메시지 송수신만 담당
 */
export const useFigmaMessaging = (onMessage: MessageHandler): ((msg: PluginMessageToCode) => void) => {
  useEffect(() => {
    const handleMessage = (event: MessageEvent<{ pluginMessage: PluginMessageToUi }>): void => {
      const message = event.data.pluginMessage;
      if (message) {
        onMessage(message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onMessage]);

  const sendMessage = useCallback((message: PluginMessageToCode): void => {
    parent.postMessage({ pluginMessage: message }, '*');
  }, []);

  return sendMessage;
};
