import { Link } from 'react-router-dom';

const GRADIENTS = {
  green: 'from-green-900 via-green-800 to-emerald-900',
  blue: 'from-blue-900 via-blue-800 to-indigo-900',
  purple: 'from-purple-900 via-purple-800 to-indigo-900',
  amber: 'from-amber-900 via-amber-800 to-orange-900',
  red: 'from-red-900 via-red-800 to-rose-900',
  gray: 'from-gray-900 via-gray-800 to-gray-900',
  teal: 'from-teal-900 via-teal-800 to-emerald-900',
};

export default function PageHeader({ title, subtitle, icon: Icon, gradient = 'green', actions, breadcrumbs, children, compact }) {
  const grad = GRADIENTS[gradient] || GRADIENTS.green;
  return (
    <section className={`relative overflow-hidden ${compact ? 'py-8 md:py-10' : 'py-12 md:py-16'}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      <div className="relative max-w-7xl mx-auto px-4">
        {breadcrumbs && (
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-4">
            <Link to="/" className="hover:text-white/90 transition">Home</Link>
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-2">
                <span>/</span>
                {bc.to ? <Link to={bc.to} className="hover:text-white/90 transition">{bc.label}</Link> : <span className="text-white/90">{bc.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {Icon && (
              <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
                <Icon className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">{title}</h1>
              {subtitle && <p className="text-white/70 mt-1 text-sm md:text-base">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </section>
  );
}
