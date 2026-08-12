import { Award } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import AchievementsGrid from '../../components/achievements/AchievementsGrid';

export default function AchievementsPage() {
  return (
    <div>
      <PageHeader
        title="My achievements"
        subtitle="Badges you have unlocked, and the ones still to chase"
        icon={Award}
        gradient="amber"
        compact
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Achievements' }]}
      />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <AchievementsGrid />
      </div>
    </div>
  );
}
