import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', type: 'general' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    // Simulate send
    await new Promise(r => setTimeout(r, 1000));
    setSubmitted(true);
    setSending(false);
  };

  return (
    <div>
      <PageHeader title="Contact Us" subtitle="Get in touch — we'd love to hear from you" icon={Mail} gradient="blue" compact />
      <div className="max-w-5xl mx-auto px-4 py-12">

        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
              <Mail className="w-6 h-6 text-green-700 dark:text-green-400 mb-3" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">Email</h3>
              <a href="mailto:hello@lunagolf.co.uk" className="text-sm text-green-700 dark:text-green-400 hover:underline">hello@lunagolf.co.uk</a>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">We aim to respond within 24 hours</p>
            </div>

            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
              <Phone className="w-6 h-6 text-green-700 dark:text-green-400 mb-3" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">Phone</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Available Mon–Fri, 9am–5pm</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">For urgent club enquiries</p>
            </div>

            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
              <MapPin className="w-6 h-6 text-green-700 dark:text-green-400 mb-3" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">Location</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">United Kingdom</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">lunagolf.co.uk</p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
              <h3 className="font-bold text-green-800 dark:text-green-300 mb-2">Club Enquiries</h3>
              <p className="text-sm text-green-700 dark:text-green-400">Interested in joining the Luna Golf network as a partner club? Select "Club Partnership" below and we'll be in touch within 48 hours with a full information pack.</p>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-2">
            {submitted ? (
              <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Message Sent!</h2>
                <p className="text-gray-600 dark:text-gray-400">Thank you for getting in touch. We'll respond to your enquiry within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Send us a message</h2>

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Name *</label>
                    <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
                    <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enquiry Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500">
                    <option value="general">General Enquiry</option>
                    <option value="club">Club Partnership</option>
                    <option value="player">Player Support</option>
                    <option value="technical">Technical Issue</option>
                    <option value="feedback">Feedback / Suggestion</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
                  <input type="text" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                    className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message *</label>
                  <textarea required rows={6} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                    className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none" />
                </div>

                <button type="submit" disabled={sending}
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50">
                  <Send className="w-4 h-4" />
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
