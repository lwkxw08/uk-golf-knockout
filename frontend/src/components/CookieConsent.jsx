import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Cookie } from 'lucide-react';

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [prefs, setPrefs] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setTimeout(() => setShow(true), 1500);
    }
  }, []);

  const acceptAll = () => {
    const consent = { necessary: true, analytics: true, marketing: true, timestamp: Date.now() };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setShow(false);
  };

  const acceptSelected = () => {
    const consent = { ...prefs, timestamp: Date.now() };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setShow(false);
  };

  const rejectAll = () => {
    const consent = { necessary: true, analytics: false, marketing: false, timestamp: Date.now() };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-2xl border p-6">
        <div className="flex items-start gap-4">
          <Cookie className="w-8 h-8 text-green-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">We use cookies</h3>
            <p className="text-sm text-gray-600 mb-4">
              We use cookies and similar technologies to ensure the platform functions correctly,
              analyse usage patterns, and improve your experience. For more details, see our{' '}
              <Link to="/privacy" className="text-green-700 hover:underline">Privacy Policy</Link> and{' '}
              <Link to="/terms" className="text-green-700 hover:underline">Terms of Service</Link>.
            </p>

            {showPreferences && (
              <div className="mb-4 space-y-3 bg-gray-50 rounded-lg p-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked disabled className="accent-green-700 w-4 h-4" />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Essential Cookies</span>
                    <span className="text-xs text-gray-500 ml-2">(always active)</span>
                    <p className="text-xs text-gray-500">Required for login, navigation, and core functionality.</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.analytics}
                    onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })}
                    className="accent-green-700 w-4 h-4"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Analytics Cookies</span>
                    <p className="text-xs text-gray-500">Help us understand how the platform is used.</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.marketing}
                    onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })}
                    className="accent-green-700 w-4 h-4"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Marketing Cookies</span>
                    <p className="text-xs text-gray-500">Used for relevant sponsor offers and promotions.</p>
                  </div>
                </label>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={acceptAll}
                className="bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
              >
                Accept All
              </button>
              {showPreferences ? (
                <button
                  onClick={acceptSelected}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium transition"
                >
                  Save Preferences
                </button>
              ) : (
                <button
                  onClick={() => setShowPreferences(true)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium transition"
                >
                  Manage Preferences
                </button>
              )}
              <button
                onClick={rejectAll}
                className="text-gray-500 hover:text-gray-700 px-5 py-2 rounded-lg text-sm font-medium transition"
              >
                Reject Non-Essential
              </button>
            </div>
          </div>
          <button onClick={rejectAll} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
