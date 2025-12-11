import "../styles/auth/AuthPage.css";
import "../styles/auth/PasswordReset.css";
import "../styles/auth/LoginInfo.css";
import React from "react";

export default function LoginRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <img
        id="background-image"
        src="/images/background.jpg"
        alt="Fondo de nubes"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -1,
        }}
      />
      {children}
    </>
  );
}

