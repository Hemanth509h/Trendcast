import React from "react";
import "./ui.css"; 

export default function Dialog({ isOpen, onClose, title, children, showHeader = true }) {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div 
        className="dialog-box" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="header-dialog">
          {showHeader && title && (
            <h2 className="dialog-title-standard" style={{textAlign:"center", color: "var(--text-main)", marginBottom: '1.5rem'}}>
              {title}
            </h2>
          )}
          <div className="dialog-body">{children}</div>
        </div>
      </div>
    </div>
  );
}
