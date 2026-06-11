import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: June 2026</p>

      <div className="prose prose-green max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
          <p>By accessing or using the UK Golf Knockout Network ("Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">2. Eligibility</h2>
          <p>You must be at least 16 years old to create an account. Players under 18 require parental or guardian consent. You must hold a valid golf handicap issued through the World Handicap System (WHS) to participate in competitions.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">3. Account Registration</h2>
          <p>You agree to provide accurate information during registration, including your real name, email, and handicap details. You are responsible for maintaining the security of your account credentials. You must notify us immediately of any unauthorised access.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">4. Tournament Participation</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Entry fees are non-refundable unless a tournament is cancelled by the organisers.</li>
            <li>Players must complete matches within the specified deadlines.</li>
            <li>Both players must submit and verify match scores through the Platform.</li>
            <li>Disputes will be resolved by tournament administrators in accordance with the Rules of Golf.</li>
            <li>Walkovers may be awarded if a player fails to respond to match arrangement requests.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">5. Code of Conduct</h2>
          <p>Players must behave in a sportsmanlike manner at all times. Harassment, abuse, cheating, or unsportsmanlike behaviour may result in disqualification and account suspension.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">6. Payments</h2>
          <p>Payments are processed securely via Stripe. By making a payment, you agree to Stripe's terms of service. The Platform does not store card details. Refunds are handled on a case-by-case basis by the tournament organisers.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">7. Intellectual Property</h2>
          <p>All content, branding, and software on the Platform are owned by UK Golf Knockout Network. You may not copy, distribute, or create derivative works without permission. User-generated content (photos, comments) remains your property but you grant us a licence to display it on the Platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">8. Limitation of Liability</h2>
          <p>The Platform is provided "as is" without warranties. We are not liable for any injuries, losses, or damages arising from tournament participation, weather conditions, or course conditions. Our total liability shall not exceed the fees you have paid to us in the preceding 12 months.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">9. Termination</h2>
          <p>We may suspend or terminate accounts that violate these terms. You may delete your account at any time by contacting support.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">10. Changes to Terms</h2>
          <p>We may update these terms periodically. Continued use of the Platform constitutes acceptance of the updated terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">11. Governing Law</h2>
          <p>These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">12. Contact</h2>
          <p>For questions about these terms, contact us at <a href="mailto:support@ukgolfknockout.com" className="text-green-700 hover:underline">support@ukgolfknockout.com</a>.</p>
        </section>
      </div>

      <div className="mt-8 pt-6 border-t text-sm text-gray-500">
        See also: <Link to="/privacy" className="text-green-700 hover:underline">Privacy Policy</Link>
      </div>
    </div>
  );
}
