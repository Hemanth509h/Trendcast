import React, { useState } from "react";
import Dialog from "./Dialog";
import { useAuth } from "../context/AuthContext";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "./toast";

export default function ChangePasswordModal({ isOpen, onClose }) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsSaving(true);
    const result = await changePassword(currentPassword, newPassword);
    setIsSaving(false);

    if (result.success) {
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } else {
      toast.error(result.error || "Failed to change password");
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} showHeader={false}>
      <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
        <h2 className="dialog-title-large">Update Security</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="profile-input"
                placeholder="••••••••"
                required
              />
              <button 
                type="button" 
                onClick={() => setShowCurrent(!showCurrent)}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="profile-input"
                placeholder="••••••••"
                required
              />
              <button 
                type="button" 
                onClick={() => setShowNew(!showNew)}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="profile-input"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="password-btn-group">
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1, height: '48px' }}>
              Cancel
            </button>
            <button type="submit" className="btn-premium" disabled={isSaving}>
              {isSaving ? <Loader2 className="spinner" size={20} /> : "Update Password"}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
