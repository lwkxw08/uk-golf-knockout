import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Check if already dismissed this session
    if (sessionStorage.getItem('pwa-dismissed')) setDismissed(true);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa-dismissed', 'true');
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50 animate-fade-in">
      <button onClick={handleDismiss} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
          <Download className="w-5 h-5 text-green-700 dark:text-green-400" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm text-gray-800 dark:text-gray-100">Install Golf Knockout</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add to your home screen for quick access and score entry mid-round.</p>
          <button
            onClick={handleInstall}
            className="mt-3 bg-green-700 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-green-800 transition"
          >
            Install App
          </button>
        </div>
      </div>
    </div>
  );
}
