import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

export default function PrivacyPage() {
  return (
    <div>
      <PageHeader title="Privacy Policy" subtitle="Last updated: June 2026" icon={Shield} gradient="gray" compact />
      <div className="max-w-3xl mx-auto px-4 py-10">

      <div className="prose prose-green max-w-none space-y-6 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Introduction</h2>
          <p>UK Golf Knockout Network ("we", "us", "our") is committed to protecting your personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. This policy explains what data we collect, why, and your rights.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. Data Controller</h2>
          <p>UK Golf Knockout Network is the data controller for personal data processed through this platform. Contact: <a href="mailto:privacy@ukgolfknockout.com" className="text-green-700 hover:underline">privacy@ukgolfknockout.com</a>.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. Data We Collect</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Account Data:</strong> Name, email address, date of birth, phone number</li>
            <li><strong>Golf Data:</strong> WHS Handicap ID, handicap index, home club, match scores, tournament entries</li>
            <li><strong>Usage Data:</strong> Pages visited, features used, device type, IP address</li>
            <li><strong>Payment Data:</strong> Processed by Stripe — we do not store card numbers</li>
            <li><strong>Communications:</strong> Match chat messages, feed posts, comments</li>
            <li><strong>Location Data:</strong> Club postcodes for weather forecasts (not GPS tracking)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">4. Legal Basis for Processing</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Contract:</strong> Processing tournament entries, payments, and match management</li>
            <li><strong>Consent:</strong> Marketing emails, analytics cookies, photo uploads</li>
            <li><strong>Legitimate Interest:</strong> Platform security, fraud prevention, service improvement</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">5. How We Use Your Data</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Managing your account and tournament participation</li>
            <li>Processing payments and entry fees</li>
            <li>Displaying leaderboards, match results, and player statistics</li>
            <li>Sending match reminders, draw notifications, and score verification requests</li>
            <li>Syncing handicap data from the World Handicap System</li>
            <li>Showing relevant sponsor content and marketplace offers</li>
            <li>Improving platform features and user experience</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">6. Data Sharing</h2>
          <p>We share your data with:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Other players:</strong> Name, handicap, club, and match results are visible to other platform users</li>
            <li><strong>Clubs:</strong> Your entries and results at their tournaments</li>
            <li><strong>Stripe:</strong> Payment processing</li>
            <li><strong>SendGrid:</strong> Email delivery</li>
            <li><strong>Open-Meteo:</strong> Weather data (no personal data shared)</li>
          </ul>
          <p>We do not sell your personal data to third parties.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">7. Data Retention</h2>
          <p>We retain your account data for as long as your account is active. Match results and tournament history are retained indefinitely for leaderboard and historical purposes. You can request deletion of your account and personal data at any time.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">8. Your Rights (UK GDPR)</h2>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Rectification:</strong> Correct inaccurate data via your profile page</li>
            <li><strong>Erasure:</strong> Request deletion of your account and data</li>
            <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
            <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
            <li><strong>Withdraw Consent:</strong> Withdraw consent for marketing at any time</li>
          </ul>
          <p>To exercise these rights, email <a href="mailto:privacy@ukgolfknockout.com" className="text-green-700 hover:underline">privacy@ukgolfknockout.com</a>.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">9. Cookies</h2>
          <p>We use essential cookies for authentication and platform functionality. Analytics and marketing cookies are optional — you can manage your preferences via the cookie banner. See our cookie banner for detailed controls.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">10. Security</h2>
          <p>We protect your data using encryption in transit (HTTPS/TLS), hashed passwords (bcrypt), rate limiting, and secure authentication tokens. We conduct regular security reviews.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">11. Children</h2>
          <p>The Platform is not intended for children under 16. Junior players (16-17) require parental consent.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">12. Changes</h2>
          <p>We may update this policy periodically. We will notify you of significant changes via email.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">13. Complaints</h2>
          <p>If you have concerns about how we handle your data, you can contact the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener" className="text-green-700 hover:underline">ico.org.uk</a>.</p>
        </section>
      </div>

      <div className="mt-8 pt-6 border-t text-sm text-gray-500 dark:text-gray-400">
        See also: <Link to="/terms" className="text-green-700 hover:underline">Terms of Service</Link>
      </div>
      </div>
    </div>
  );
}
