import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';

const FAQS = [
  {
    category: 'Getting Started',
    questions: [
      { q: 'How do I register?', a: 'Click "Register" on the homepage or login page. You\'ll need to provide your name, email, and WHS handicap index. Once verified, you can enter tournaments immediately.' },
      { q: 'Do I need a handicap to play?', a: 'Yes — all Luna Golf competitions use WHS handicaps to ensure fair matchplay. Your handicap is automatically synced from the WHS system, so it stays up to date.' },
      { q: 'Is there a fee to join Luna Golf?', a: 'Registration is free. Individual tournament entry fees are set by the organiser and typically range from £10–£30. Annual membership gives you access to all competitions for a fixed fee.' },
      { q: 'Which clubs are in the network?', a: 'We have partner clubs across all regions of the UK. Check the Tournaments page to see events near you, or use the postcode search to find clubs in your area.' },
    ]
  },
  {
    category: 'Competitions & Format',
    questions: [
      { q: 'How does the knockout format work?', a: 'Players are drawn against each other in a bracket format. Win your match and progress to the next round. Lose, and you\'re out. Regional knockout winners advance to the national final.' },
      { q: 'How are handicaps applied in matchplay?', a: 'The difference between players\' handicaps determines the strokes given. For example, if you\'re off 12 and your opponent is off 8, you receive 4 strokes at the hardest holes (by stroke index).' },
      { q: 'What happens if we can\'t arrange our match in time?', a: 'Each round has a deadline. If both players fail to arrange the match, the organiser may award a walkover or extend the deadline at their discretion.' },
      { q: 'Can I play in multiple tournaments?', a: 'Yes! You can enter as many tournaments as you like. Many players compete in their club knockout, regional league, and national events simultaneously.' },
      { q: 'What is the league format?', a: 'Leagues run alongside knockouts. Each player plays a fixed number of matches against other players in their group. Points are awarded for wins (10), draws (5), losses (2), plus bonus points for decisive victories.' },
    ]
  },
  {
    category: 'During a Match',
    questions: [
      { q: 'How do I submit my match result?', a: 'Both players submit the result through the app. Once both confirmations match, the result is recorded and the bracket updates automatically.' },
      { q: 'What is the live match tracker?', a: 'If both players use the live scoring feature, spectators can follow the match hole-by-hole in real time — seeing who\'s up, birdies, and momentum swings.' },
      { q: 'Can I chat with my opponent?', a: 'Yes — each match has a built-in chat for arranging dates, times, and discussing the match. You can also share a round post to find playing partners.' },
      { q: 'What if there\'s a dispute about the result?', a: 'Contact the tournament organiser through the platform. All confirmed results require both players to agree. If there\'s a discrepancy, the organiser has the final say.' },
    ]
  },
  {
    category: 'For Clubs',
    questions: [
      { q: 'How does our club join Luna Golf?', a: 'Contact us through the Club Portal registration. We\'ll set you up with a club manager account, add your course details, and you can start entering players immediately.' },
      { q: 'What does it cost for clubs?', a: 'There\'s no upfront cost to join. Clubs receive a revenue share of entry fees paid by their members. We also offer premium features like marketplace offers and sponsor management.' },
      { q: 'Can we run our own internal knockouts?', a: 'Absolutely. Club managers can create club-only tournaments that are invisible to other clubs. Perfect for internal championships.' },
      { q: 'How do members sign up through our club?', a: 'Players register on Luna Golf and select your club as their home club. The club manager can also invite players directly via email.' },
    ]
  },
  {
    category: 'Technical',
    questions: [
      { q: 'Is there a mobile app?', a: 'Luna Golf is a Progressive Web App (PWA). On your phone, visit lunagolf.co.uk and tap "Add to Home Screen" — it works just like a native app with offline support and push notifications.' },
      { q: 'How is my handicap kept up to date?', a: 'We sync directly with the WHS system. Your handicap index is automatically updated, so your competition strokes are always accurate.' },
      { q: 'Is my data secure?', a: 'Yes. We comply with UK GDPR, use encrypted connections (HTTPS), and never share your personal data with third parties without consent. See our Privacy Policy for full details.' },
    ]
  },
];

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border dark:border-gray-700 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
        <span className="font-medium text-gray-900 dark:text-white pr-4">{question}</span>
        {open ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-6 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t dark:border-gray-700 pt-3">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div>
      <PageHeader title="Frequently Asked Questions" subtitle="Everything you need to know about Luna Golf" icon={HelpCircle} gradient="blue" compact />
      <div className="max-w-4xl mx-auto px-4 py-12">

        {FAQS.map((section, i) => (
          <div key={i} className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{section.category}</h2>
            <div className="space-y-3">
              {section.questions.map((faq, j) => (
                <FAQItem key={j} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </div>
        ))}

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-8 text-center mt-12">
          <h3 className="font-bold text-green-800 dark:text-green-300 text-lg mb-2">Still have questions?</h3>
          <p className="text-green-700 dark:text-green-400 text-sm mb-4">We're here to help. Get in touch and we'll get back to you within 24 hours.</p>
          <Link to="/contact" className="inline-block bg-green-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-800 transition">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
