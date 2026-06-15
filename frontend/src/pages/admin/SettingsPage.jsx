import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Settings, Save, Eye, EyeOff, Mail, CreditCard, Globe, CheckCircle } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showSecrets, setShowSecrets] = useState({});
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.get('/settings');
      setSettings(data);
      const vals = {};
      data.forEach(s => { vals[s.key] = s.value; });
      setEditValues(vals);
    } catch {
      // Seed defaults if none exist
      try {
        await api.post('/settings/seed-defaults');
        const data = await api.get('/settings');
        setSettings(data);
        const vals = {};
        data.forEach(s => { vals[s.key] = s.value; });
        setEditValues(vals);
      } catch (err) {
        setError('Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key) => {
    setSaving(key);
    setError('');
    setSuccess('');
    try {
      const setting = settings.find(s => s.key === key);
      await api.put(`/settings/${key}`, {
        value: editValues[key],
        label: setting?.label,
        category: setting?.category,
        isSecret: setting?.isSecret,
      });
      setSuccess(`${key} updated successfully`);
      setTimeout(() => setSuccess(''), 3000);
      loadSettings();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  const categoryIcons = {
    email: Mail,
    payments: CreditCard,
    general: Globe,
  };

  const groupedSettings = settings.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const categoryLabels = {
    email: 'Email Configuration (SendGrid)',
    payments: 'Payment Processing (Stripe)',
    general: 'General Settings',
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Platform Settings" subtitle="Configure email, payments, and platform options" icon={Settings} gradient="gray" compact />
      <div className="max-w-4xl mx-auto px-4 py-8">

      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg mb-4 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}
      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="space-y-8">
        {Object.entries(groupedSettings).map(([category, items]) => {
          const Icon = categoryIcons[category] || Globe;
          return (
            <div key={category} className="bg-white border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Icon className="w-5 h-5 text-green-700" />
                <h2 className="font-semibold text-gray-900">{categoryLabels[category] || category}</h2>
              </div>

              <div className="space-y-4">
                {items.map(setting => (
                  <div key={setting.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="sm:w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-700">{setting.label || setting.key}</label>
                    </div>
                    <div className="flex-1 flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={setting.isSecret && !showSecrets[setting.key] ? 'password' : 'text'}
                          value={editValues[setting.key] || ''}
                          onChange={(e) => setEditValues({ ...editValues, [setting.key]: e.target.value })}
                          placeholder={setting.isSecret ? 'Enter API key...' : 'Enter value...'}
                          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                        />
                        {setting.isSecret && (
                          <button
                            type="button"
                            onClick={() => setShowSecrets({ ...showSecrets, [setting.key]: !showSecrets[setting.key] })}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showSecrets[setting.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => handleSave(setting.key)}
                        disabled={saving === setting.key}
                        className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50 transition flex items-center gap-1"
                      >
                        {saving === setting.key ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <><Save className="w-3.5 h-3.5" /> Save</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {category === 'email' && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-blue-800 font-medium">Setup Instructions</p>
                  <ol className="text-xs text-blue-700 list-decimal list-inside mt-1 space-y-1">
                    <li>Sign up at <a href="https://sendgrid.com" target="_blank" rel="noopener" className="underline">sendgrid.com</a></li>
                    <li>Create an API Key with "Mail Send" permissions</li>
                    <li>Verify your sender email address</li>
                    <li>Paste the API key and from email above</li>
                  </ol>
                </div>
              )}

              {category === 'payments' && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-blue-800 font-medium">Setup Instructions</p>
                  <ol className="text-xs text-blue-700 list-decimal list-inside mt-1 space-y-1">
                    <li>Go to <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener" className="underline">Stripe Dashboard → API Keys</a></li>
                    <li>Copy your Secret Key (starts with sk_) and Publishable Key (starts with pk_)</li>
                    <li>For webhooks: Developers → Webhooks → Add endpoint → enter your site URL + /api/payments/webhook</li>
                    <li>Copy the Webhook signing secret</li>
                  </ol>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
