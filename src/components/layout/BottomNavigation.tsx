import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingBag, User, Store } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../lib/i18n';
import { useCart } from '../../hooks/useCart';

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { getTotalItems } = useCart();

  const totalCartItems = getTotalItems();

  const navigationItems = [
    {
      name: t('navigation.home'),
      href: '/',
      icon: Home,
      current: location.pathname === '/',
    },
    {
      name: t('navigation.colmados'),
      href: '/colmados',
      icon: Store,
      current: location.pathname === '/colmados',
    },
    {
      name: t('navigation.products'),
      href: '/products',
      icon: Search,
      current: location.pathname === '/products' || location.pathname.startsWith('/products/'),
    },
    {
      name: t('navigation.orders'),
      href: '/orders',
      icon: ShoppingBag,
      current: location.pathname === '/orders' || location.pathname.startsWith('/orders/'),
      badge: totalCartItems > 0 ? totalCartItems : undefined,
    },
    {
      name: t('navigation.profile'),
      href: '/profile',
      icon: User,
      current: location.pathname === '/profile' || 
              location.pathname === '/reputation' || 
              location.pathname === '/credit' ||
              location.pathname === '/settings',
    },
  ];

  // Add colmado dashboard for colmado owners
  if (user?.role === 'colmado_owner') {
    navigationItems.splice(4, 0, {
      name: 'Mi Colmado',
      href: '/colmado/dashboard',
      icon: Store,
      current: location.pathname.startsWith('/colmado/'),
    });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-5 h-16">
        {navigationItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center space-y-1 text-xs font-medium transition-colors ${
                item.current
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="relative">
                <Icon 
                  className={`h-5 w-5 ${
                    item.current ? 'text-blue-600 dark:text-blue-400' : ''
                  }`} 
                />
                {item.badge && (
                  <span className="absolute -top-2 -right-2 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="truncate max-w-full">
                {item.name}
              </span>
              {item.current && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Dominican flag accent */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-white to-red-600" />
    </nav>
  );
};