import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Phone, MessageCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../lib/i18n';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'whatsapp'>('whatsapp');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string; otp?: string }>({});

  const { login, loginWithWhatsApp, verifyWhatsAppOTP, isLoading, error, clearError } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as LocationState)?.from || '/';

  const validatePhone = (phoneNumber: string) => {
    // Dominican phone number validation
    const phoneRegex = /^(\+1|1)?[-.\s]?(\()?809|829|849(\))?[-.\s]?\d{3}[-.\s]?\d{4}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');
    
    // Format as 809-123-4567
    if (cleaned.length >= 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else if (cleaned.length >= 6) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    }
    return cleaned;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: undefined }));
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const newErrors: typeof errors = {};
    
    if (!phone) {
      newErrors.phone = t('auth.phoneRequired');
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'Número de teléfono inválido';
    }
    
    if (!password) {
      newErrors.password = t('auth.passwordRequired');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await login(phone, password);
      navigate(from, { replace: true });
    } catch (error) {
      // Error is handled by the auth context
    }
  };

  const handleWhatsAppLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!phone) {
      setErrors({ phone: t('auth.phoneRequired') });
      return;
    }

    if (!validatePhone(phone)) {
      setErrors({ phone: 'Número de teléfono inválido' });
      return;
    }

    try {
      await loginWithWhatsApp(phone);
      setIsOtpSent(true);
      toast.success('Código enviado por WhatsApp');
    } catch (error) {
      // Error is handled by the auth context
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Código debe tener 6 dígitos' });
      return;
    }

    try {
      await verifyWhatsAppOTP(phone, otp);
      navigate(from, { replace: true });
    } catch (error) {
      // Error is handled by the auth context
    }
  };

  const handleResendOtp = async () => {
    try {
      await loginWithWhatsApp(phone);
      toast.success('Código reenviado por WhatsApp');
    } catch (error) {
      // Error is handled by the auth context
    }
  };

  const handleBackToPhone = () => {
    setIsOtpSent(false);
    setOtp('');
    setErrors({});
    clearError();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 dark:from-blue-900/20 dark:via-gray-900 dark:to-red-900/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-dominican-gradient rounded-full flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">W</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            {isOtpSent ? 'Verifica tu teléfono' : t('auth.login')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isOtpSent 
              ? `Enviamos un código de 6 dígitos a ${phone}`
              : t('app.tagline')
            }
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-dominican rounded-lg border border-gray-200 dark:border-gray-700">
          {!isOtpSent ? (
            <>
              {/* Login Method Toggle */}
              <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setLoginMethod('whatsapp')}
                  className={cn(
                    'flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-colors',
                    loginMethod === 'whatsapp'
                      ? 'bg-whatsapp text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('password')}
                  className={cn(
                    'flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-colors',
                    loginMethod === 'password'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  <span>Contraseña</span>
                </button>
              </div>

              <form onSubmit={loginMethod === 'whatsapp' ? handleWhatsAppLogin : handlePasswordLogin} className="space-y-4">
                {/* Phone Number Field */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('auth.phone')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder={t('auth.phonePlaceholder')}
                      className={cn(
                        'input pl-10',
                        errors.phone && 'input-error'
                      )}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Formato: 809-123-4567
                  </p>
                </div>

                {/* Password Field (only for password login) */}
                {loginMethod === 'password' && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('auth.password')}
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password) {
                            setErrors(prev => ({ ...prev, password: undefined }));
                          }
                        }}
                        placeholder={t('auth.passwordPlaceholder')}
                        className={cn(
                          'input pr-10',
                          errors.password && 'input-error'
                        )}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    'w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                    loginMethod === 'whatsapp'
                      ? 'bg-whatsapp hover:bg-green-600 text-white focus:ring-green-500'
                      : 'btn-primary'
                  )}
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    <>
                      {loginMethod === 'whatsapp' ? (
                        <MessageCircle className="h-5 w-5" />
                      ) : (
                        <Phone className="h-5 w-5" />
                      )}
                      <span>
                        {loginMethod === 'whatsapp' ? 'Enviar Código por WhatsApp' : t('auth.loginButton')}
                      </span>
                    </>
                  )}
                </button>

                {/* Forgot Password Link */}
                {loginMethod === 'password' && (
                  <div className="text-center">
                    <a
                      href="#"
                      className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                    >
                      {t('auth.forgotPassword')}
                    </a>
                  </div>
                )}
              </form>
            </>
          ) : (
            /* OTP Verification Form */
            <form onSubmit={handleOtpVerification} className="space-y-6">
              {/* Back Button */}
              <button
                type="button"
                onClick={handleBackToPhone}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Cambiar número</span>
              </button>

              {/* OTP Input */}
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Código de verificación
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                    if (errors.otp) {
                      setErrors(prev => ({ ...prev, otp: undefined }));
                    }
                  }}
                  placeholder="123456"
                  className={cn(
                    'input text-center text-lg tracking-widest',
                    errors.otp && 'input-error'
                  )}
                  maxLength={6}
                  disabled={isLoading}
                />
                {errors.otp && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.otp}</p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Verify Button */}
              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="btn-primary w-full"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  'Verificar Código'
                )}
              </button>

              {/* Resend Code */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Reenviar código
                </button>
              </div>
            </form>
          )}

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ¿No tienes cuenta?{' '}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                {t('auth.register')}
              </Link>
            </p>
          </div>

          {/* Dominican Cultural Touch */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              🇩🇴 Hecho con amor en República Dominicana
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}