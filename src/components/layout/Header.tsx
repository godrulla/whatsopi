import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Search, Bell, ShoppingCart, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../lib/i18n';
import { useTheme } from '../../contexts/ThemeContext';
import { useCart } from '../../hooks/useCart';
import { NotificationButton } from '../common/NotificationButton';
import { SearchBar } from '../common/SearchBar';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuth();
  const { t, currentLanguage, setLanguage } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { cartItems, getTotalItems } = useCart();
  const location = useLocation();

  const totalCartItems = getTotalItems();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greetings.morning');
    if (hour < 18) return t('greetings.afternoon');
    return t('greetings.evening');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  WhatsOpí
                </span>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t('app.tagline')}
                </div>
              </div>
            </Link>
          </div>

          {/* Center Section - Search (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <SearchBar />
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search Button (Mobile) */}
            <Link
              to="/products"
              className="md:hidden p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Search className="h-5 w-5" />
            </Link>

            {/* Cart Button */}
            <Link
              to="/cart"
              className="relative p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {totalCartItems > 9 ? '9+' : totalCartItems}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <NotificationButton />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Toggle theme"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Language Selector */}
            <select
              value={currentLanguage}
              onChange={(e) => setLanguage(e.target.value as 'es-DO' | 'ht' | 'en')}
              className="text-sm border-0 bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
            >
              <option value="es-DO">🇩🇴 ES</option>
              <option value="ht">🇭🇹 HT</option>
              <option value="en">🇺🇸 EN</option>
            </select>

            {/* User Menu */}
            <div className="relative">
              <div className="flex items-center space-x-3">
                {/* User Avatar */}
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.name || 'Usuario'}
                    </p>
                    <div className="flex items-center space-x-2">
                      {user?.digitalReputationScore && user.digitalReputationScore > 0 && (
                        <span className="text-xs text-yellow-600 dark:text-yellow-400">
                          ⭐ {user.digitalReputationScore}
                        </span>
                      )}
                      {user?.verificationStatus === 'verified' && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          ✓
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Cerrar sesión"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Greeting Banner (Mobile) */}
      <div className="lg:hidden bg-gradient-to-r from-blue-50 to-red-50 dark:from-blue-900/20 dark:to-red-900/20 px-4 py-2">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {getGreeting()} {user?.name ? `${user.name.split(' ')[0]}!` : ''}
        </p>
      </div>
    </header>
  );
};