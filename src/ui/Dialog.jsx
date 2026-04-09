import React from "react";
import "./ui.css"; 

export default function Dialog({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div 
        className="dialog-box" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="header-dialog">
          {title && <h2 style={{textAlign:"center", color: "#fff"}}>{title}</h2>}
          <div className="dialog-body">{children}</div>
        </div>
      </div>
    </div>
  );
}
