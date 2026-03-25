import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Search, 
  ShoppingBag, 
  Star, 
  Clock, 
  TrendingUp,
  MessageCircle,
  Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';
import { SearchBar } from '../components/common/SearchBar';
import { cn } from '../utils/cn';

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user?.name?.split(' ')[0] || 'amigo';
    
    if (hour < 12) return `¡Buenos días, ${firstName}!`;
    if (hour < 18) return `¡Buenas tardes, ${firstName}!`;
    return `¡Buenas noches, ${firstName}!`;
  };

  const quickActions = [
    {
      title: 'Buscar Productos',
      description: 'Encuentra lo que necesitas',
      icon: Search,
      href: '/products',
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Colmados Cercanos',
      description: 'Descubre colmados cerca',
      icon: MapPin,
      href: '/colmados',
      color: 'bg-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Mis Pedidos',
      description: 'Revisa tus compras',
      icon: ShoppingBag,
      href: '/orders',
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'Mi Reputación',
      description: 'Ve tu puntuación',
      icon: Star,
      href: '/reputation',
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
  ];

  const featuredColmados = [
    {
      id: '1',
      name: 'Colmado La Esquina',
      distance: '0.2 km',
      rating: 4.8,
      image: '/images/colmado-1.jpg',
      isOpen: true,
      deliveryTime: '15-20 min',
    },
    {
      id: '2',
      name: 'Super Mercado Familia',
      distance: '0.5 km',
      rating: 4.6,
      image: '/images/colmado-2.jpg',
      isOpen: true,
      deliveryTime: '20-25 min',
    },
    {
      id: '3',
      name: 'Colmado El Rincón',
      distance: '0.8 km',
      rating: 4.7,
      image: '/images/colmado-3.jpg',
      isOpen: false,
      deliveryTime: '25-30 min',
    },
  ];

  const trendingProducts = [
    {
      id: '1',
      name: 'Arroz Goya 5 lbs',
      price: 180,
      image: '/images/arroz-goya.jpg',
      colmado: 'Colmado La Esquina',
    },
    {
      id: '2',
      name: 'Pollo Fresco (lb)',
      price: 85,
      image: '/images/pollo-fresco.jpg',
      colmado: 'Super Mercado Familia',
    },
    {
      id: '3',
      name: 'Leche Entera 1L',
      price: 65,
      image: '/images/leche-rica.jpg',
      colmado: 'Colmado El Rincón',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-dominican-gradient rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {getGreeting()}
            </h1>
            <p className="text-white/80">
              {user?.role === 'colmado_owner' 
                ? 'Gestiona tu colmado y conecta con más clientes'
                : 'Descubre los mejores productos de tu barrio'
              }
            </p>
            {user?.digitalReputationScore && user.digitalReputationScore > 0 && (
              <div className="flex items-center mt-3 space-x-2">
                <Star className="h-4 w-4 text-yellow-300" />
                <span className="text-white/90">
                  Tu reputación: {user.digitalReputationScore}/100
                </span>
              </div>
            )}
          </div>
          <div className="hidden sm:block">
            <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-3xl">🇩🇴</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <SearchBar placeholder="¿Qué necesitas hoy? Ej: arroz, pollo, leche..." />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.href}
                className={cn(
                  'p-4 rounded-lg border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200 hover:scale-105',
                  action.bgColor
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg mb-3 flex items-center justify-center',
                  action.color
                )}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                  {action.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {action.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Featured Colmados */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Colmados Recomendados
          </h2>
          <Link
            to="/colmados"
            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 text-sm font-medium"
          >
            Ver todos
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featuredColmados.map((colmado) => (
            <Link
              key={colmado.id}
              to={`/colmados/${colmado.id}`}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative">
                <div className="absolute top-3 left-3">
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    colmado.isOpen
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  )}>
                    {colmado.isOpen ? 'ABIERTO' : 'CERRADO'}
                  </span>
                </div>
                <div className="absolute top-3 right-3 bg-white dark:bg-gray-800 rounded-full px-2 py-1">
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    {colmado.distance}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  {colmado.name}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span>{colmado.rating}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{colmado.deliveryTime}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Trending Products */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Productos Populares
            </h2>
          </div>
          <Link
            to="/products?trending=true"
            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 text-sm font-medium"
          >
            Ver más
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {trendingProducts.map((product) => (
            <Link
              key={product.id}
              to={`/products/${product.id}`}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
              <div className="p-3">
                <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                  {product.name}
                </h3>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-1">
                  RD${product.price}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {product.colmado}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* WhatsApp Support Banner */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <MessageCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-medium text-green-800 dark:text-green-200">
              ¿Necesitas ayuda?
            </h3>
            <p className="text-sm text-green-600 dark:text-green-300">
              Nuestro equipo está disponible por WhatsApp 24/7
            </p>
          </div>
          <button
            onClick={() => window.open('https://wa.me/18091234567', '_blank')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Contactar
          </button>
        </div>
      </div>

      {/* AI-Powered Features Banner */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
        <div className="flex items-center space-x-3">
          <Zap className="h-8 w-8" />
          <div>
            <h3 className="font-semibold text-lg">
              Impulsado por Inteligencia Artificial
            </h3>
            <p className="text-white/90 text-sm">
              Recomendaciones personalizadas, búsqueda inteligente y asistente virtual
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}