type WebApp = {
  ready: () => void;
  expand: () => void;
  colorScheme?: string;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  HapticFeedback?: {
    impactOccurred: (style: "light") => void;
    notificationOccurred: (type: "success" | "error") => void;
  };
};
declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp };
  }
}
export const getTelegram = () => window.Telegram?.WebApp;
export function initializeTelegram() {
  const app = getTelegram();
  if (!app) return;
  app.ready();
  app.expand();
  try {
    app.setHeaderColor?.("#f7f7f2");
    app.setBackgroundColor?.("#f7f7f2");
  } catch {
    /* Older Telegram versions keep their native colors. */
  }
}
export function haptic(ok?: boolean) {
  try {
    const app = getTelegram();
    if (ok === undefined) app?.HapticFeedback?.impactOccurred("light");
    else app?.HapticFeedback?.notificationOccurred(ok ? "success" : "error");
  } catch {
    /* Haptics are optional outside supported Telegram clients. */
  }
}
