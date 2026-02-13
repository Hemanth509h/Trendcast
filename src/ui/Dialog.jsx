import React from "react";
export default function Dialog({ isopen, isclose, title, children }) {
  return (
    <>
      {isopen && (
        <div
          className="dialog-overlay"
          onClick={isclose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            className="dialog-box"
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "8px",
              minWidth: "300px",
              maxWidth: "600px",
            }}
          >
            <div
              className="header-dialog"
              onClick={(e) => e.stopPropagation()} // prevent close on click inside
            >
              <h2 style={{textAlign:"center"}}>{title}</h2>
              <div className="dialog-body" style={{}}>{children}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
