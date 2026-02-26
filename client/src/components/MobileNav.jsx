import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function MobileNav() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const items = [
    { to: '/dashboard',      icon: '🏠', label: 'Home' },
    { to: '/complaints',     icon: '📋', label: t('nav.complaints') },
    { to: '/map',            icon: '🗺',  label: t('nav.map') },
    { to: '/leaderboard',    icon: '🏆', label: 'Ranks' },
    ...(user?.role === 'citizen' || user?.role === 'admin'
      ? [{ to: '/complaints/new', icon: '✏️', label: 'Report' }]
      : []),
    ...(user?.role === 'department' || user?.role === 'admin'
      ? [{ to: '/dept-dashboard', icon: '🏛', label: 'Dept' }]
      : []),
    ...(user?.role === 'admin'
      ? [{ to: '/admin', icon: '⚙️', label: 'Admin' }]
      : []),
    { to: '/profile',        icon: '👤', label: 'Me' },
  ].slice(0, 5); // max 5 tabs

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 z-50 safe-area-pb">
      <div className="flex items-stretch">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-civic-600 dark:text-civic-400'
                  : 'text-stone-500 dark:text-stone-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`text-xl leading-none transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className={`truncate max-w-[52px] text-center leading-tight ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 w-6 h-0.5 bg-civic-500 rounded-t-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
