import React from "react";

export function KazuloLogo({ variant = "sidebar" }) {
  const showText = variant !== "icon";

  return (
    <div className={`kazulo-logo kazulo-logo--${variant}`}>
      <img src="/kazulo-logo.png" alt="Kazulo" className="kazulo-logo-img" />
      {showText && (
        <div className="kazulo-logo-text">
          <h1>KAZULO</h1>
          <p>Workflow Industrial</p>
        </div>
      )}
    </div>
  );
}
