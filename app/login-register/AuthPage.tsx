"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import Image from "next/image";

type Props = {
  onNavigateToPasswordReset: () => void;
};

export default function AuthPage({
  onNavigateToPasswordReset,
}: Props) {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isReturningFromPasswordReset, setIsReturningFromPasswordReset] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const { t } = useTranslation();

  // Evitar problemas de hidratación esperando a que el componente se monte
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = (toLogin: boolean): void => {
    if (isAnimating) return; // Prevenir múltiples clics durante la animación
    
    setIsAnimating(true);
    setIsLogin(toLogin);
    
    // Resetear el estado de animación después de que termine
    setTimeout(() => {
      setIsAnimating(false);
    }, 500); // Duración de la animación
  };

  // Efecto para detectar cuando regresa de PasswordReset
  React.useEffect(() => {
    // Verificar si venimos de PasswordReset (por ejemplo, por URL o estado)
    const isFromPasswordReset = window.location.search.includes('from=password-reset') || 
                               sessionStorage.getItem('fromPasswordReset') === 'true';
    
    if (isFromPasswordReset) {
      setIsReturningFromPasswordReset(true);
      sessionStorage.removeItem('fromPasswordReset'); // Limpiar el flag
      
      // Resetear el estado después de la animación
      setTimeout(() => {
        setIsReturningFromPasswordReset(false);
      }, 500);
    }
  }, []);

  // Componente del logo SVG
  const LogoIcon = ({ height, width }: { height: number; width: number }) => {
    return (
      <div style={{ width: `${width}px`, height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image
          src="/pita_icon.svg"
          alt="Pita Express Logo"
          width={width}
          height={height}
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    );
  };

  // Evitar problemas de hidratación: mostrar contenido solo cuando esté montado
  if (!mounted) {
    return (
      <div className="auth-wrapper">
        <div className="auth-tabs">
          <button className="auth-tab active">Login</button>
          <button className="auth-tab">Register</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      {/* Mobile/Tablet Tabs Navigation */}
      <div className="auth-tabs">
        <button
          className={`auth-tab ${isLogin ? 'active' : ''}`}
          onClick={() => handleToggle(true)}
        >
          {t('auth.common.login')}
        </button>
        <button
          className={`auth-tab ${!isLogin ? 'active' : ''}`}
          onClick={() => handleToggle(false)}
        >
          {t('auth.common.register')}
        </button>
      </div>

      {/* Desktop Sliding Panel */}
      <div className={`auth-container ${!isLogin ? "right-panel-active" : ""} ${isReturningFromPasswordReset ? 'returning-from-password-reset' : ''}`}>
        <div className="form-container sign-up-container">
          <RegisterForm />
        </div>

        <div className="form-container sign-in-container">
          <LoginForm onNavigateToPasswordReset={onNavigateToPasswordReset} idPrefix="desktop" />
        </div>

        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <div className="lottie-panel-icon">
                <LogoIcon height={120} width={120} />
              </div>
              <h2 style={{ fontWeight:"bold", fontSize: "1.25rem" }}>{t('auth.panels.welcomeBack')}</h2>
              <h3 style={{ fontWeight: "600", fontSize: "1rem", marginTop: "0.5rem" }}>{t('auth.panels.welcomeToCompany')}</h3>
              <p className="text-sm">{t('auth.panels.welcomeMessage')}</p>
              <button className="ghost-button" onClick={() => handleToggle(true)}>
                {t('auth.common.login')}
              </button>
            </div>

            <div className="overlay-panel overlay-right">
              <div className="lottie-panel-icon">
                <LogoIcon height={120} width={120} />
              </div>
              <h2 style={{ fontWeight: "bold", fontSize: "1.25rem" }}>{t('auth.panels.helloFriend')}</h2>
              <h3 style={{ fontWeight: "600", fontSize: "1rem", marginTop: "0.5rem" }}>{t('auth.panels.welcomeToCompany')}</h3>
              <p className="text-sm">{t('auth.panels.helloMessage')}</p>
              <button className="ghost-button" onClick={() => handleToggle(false)}>
                {t('auth.common.register')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Forms */}
      <div className="auth-mobile-forms">
        <div className={`mobile-form-container ${isLogin ? 'active' : ''} ${isAnimating ? 'animating' : ''} ${isReturningFromPasswordReset ? 'returning-from-password-reset' : ''}`}>
          {isLogin ? (
            <div className="mobile-form">
              <div className="mobile-form-header">
                <div className="lottie-mobile-icon">
                  <LogoIcon height={80} width={80} />
                </div>
                <h2>{t('auth.login.welcomeBack')}</h2>
                <h3 style={{ fontWeight: "600", fontSize: "1rem", marginTop: "0.5rem" }}>{t('auth.login.welcomeToCompany')}</h3>
                <p>{t('auth.login.welcomeMessage')}</p>
              </div>
              <LoginForm onNavigateToPasswordReset={onNavigateToPasswordReset} idPrefix="mobile" />
            </div>
          ) : (
            <div className="mobile-form">
              <div className="mobile-form-header">
                <div className="lottie-mobile-icon">
                  <LogoIcon height={80} width={80} />
                </div>
                <h2>{t('auth.register.helloFriend')}</h2>
                <h3 style={{ fontWeight: "600", fontSize: "1rem", marginTop: "0.5rem" }}>{t('auth.register.welcomeToCompany')}</h3>
                <p>{t('auth.register.helloMessage')}</p>
              </div>
              <RegisterForm />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

