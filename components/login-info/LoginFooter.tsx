"use client";

import React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";

export default function LoginFooter() {
  const { t } = useTranslation();

  return (
    <footer className="login-footer">
      <div className="section-divider"></div>
      <div className="footer-content">
        <h3 className="footer-company-name" suppressHydrationWarning>{t('loginInfo.footer.companyName')}</h3>
        <p className="footer-tagline" suppressHydrationWarning>{t('loginInfo.footer.tagline')}</p>
        <div className="footer-divider"></div>
        <div className="footer-links">
          <Link href="/privacy-policy" className="footer-link" suppressHydrationWarning>
            🔗 {t('loginInfo.footer.links.privacy')}
          </Link>
          <span className="footer-link-separator">|</span>
          <Link href="/terms-of-service" className="footer-link" suppressHydrationWarning>
            🔗 {t('loginInfo.footer.links.terms')}
          </Link>
          <span className="footer-link-separator">|</span>
          <Link href="/code-of-ethics" className="footer-link" suppressHydrationWarning>
            🔗 {t('loginInfo.footer.links.ethics')}
          </Link>
        </div>
        <p className="footer-copyright" suppressHydrationWarning>{t('loginInfo.footer.copyright')}</p>
      </div>
    </footer>
  );
}

