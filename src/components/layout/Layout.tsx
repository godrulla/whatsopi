import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNavigation } from './BottomNavigation';
import { VoiceButton } from '../voice/VoiceButton';
import { OfflineIndicator } from '../offline/OfflineIndicator';
import { useAuth } from '../../contexts/AuthContext';
import { useOffline } from '../../contexts/OfflineContext';
import { useTheme } from '../../contexts/ThemeContext';

export const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const { theme } = useTheme();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <Header 
        onToggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="sticky top-16 z-40">
          <OfflineIndicator />
        </div>
      )}

      {/* Main Content Area */}
      <main className="pb-20 pt-16 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Floating Voice Button */}
      <div className="fixed bottom-24 right-4 z-50">
        <VoiceButton />
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <img
                src="/logo-dominican.png"
                alt="WhatsOpí"
                className="h-8 w-8"
              />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                WhatsOpí
              </span>
            </div>
            <button
              onClick={closeSidebar}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Profile Section */}
          {user && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-red-500 flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.phone}
                  </p>
                  {user.digitalReputationScore > 0 && (
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-yellow-600 dark:text-yellow-400">
                        ⭐ {user.digitalReputationScore}/100
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="mt-4 px-4">
            <div className="space-y-2">
              {/* Quick Actions */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Acciones Rápidas
                </h3>
                <div className="space-y-1">
                  <SidebarLink to="/products" icon="🛍️" text="Buscar Productos" onClick={closeSidebar} />
                  <SidebarLink to="/colmados" icon="🏪" text="Colmados Cercanos" onClick={closeSidebar} />
                  <SidebarLink to="/orders" icon="📋" text="Mis Pedidos" onClick={closeSidebar} />
                  <SidebarLink to="/cart" icon="🛒" text="Mi Carrito" onClick={closeSidebar} />
                </div>
              </div>

              {/* Account */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Mi Cuenta
                </h3>
                <div className="space-y-1">
                  <SidebarLink to="/profile" icon="👤" text="Mi Perfil" onClick={closeSidebar} />
                  <SidebarLink to="/reputation" icon="⭐" text="Mi Reputación" onClick={closeSidebar} />
                  <SidebarLink to="/credit" icon="💳" text="Crédito" onClick={closeSidebar} />
                  <SidebarLink to="/settings" icon="⚙️" text="Configuración" onClick={closeSidebar} />
                </div>
              </div>

              {/* Colmado Owner Section */}
              {user?.role === 'colmado_owner' && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Mi Colmado
                  </h3>
                  <div className="space-y-1">
                    <SidebarLink to="/colmado/dashboard" icon="📊" text="Dashboard" onClick={closeSidebar} />
                    <SidebarLink to="/colmado/products" icon="📦" text="Mis Productos" onClick={closeSidebar} />
                    <SidebarLink to="/colmado/orders" icon="📋" text="Pedidos Recibidos" onClick={closeSidebar} />
                  </div>
                </div>
              )}

              {/* Support */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Soporte
                </h3>
                <div className="space-y-1">
                  <SidebarLink to="/help" icon="❓" text="Ayuda" onClick={closeSidebar} />
                  <button
                    onClick={() => window.open('https://wa.me/18091234567', '_blank')}
                    className="flex items-center space-x-3 w-full px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span>💬</span>
                    <span>WhatsApp Support</span>
                  </button>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};

interface SidebarLinkProps {
  to: string;
  icon: string;
  text: string;
  onClick: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon, text, onClick }) => {
  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        window.location.href = to;
        onClick();
      }}
      className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      <span className="text-lg">{icon}</span>
      <span>{text}</span>
    </a>
  );
};