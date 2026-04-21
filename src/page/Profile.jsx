import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Mail, Shield, Save, Loader2, Camera } from "lucide-react";
import { toast } from "../ui/toast";
import "./Profile.css";
import ChangePasswordModal from "../ui/ChangePasswordModal";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSaving(true);
    const result = await updateProfile(fullName, email);
    setIsSaving(false);

    if (result.success) {
      toast.success("Profile updated successfully!");
    } else {
      // The backend should return "Email already in use" detail which we catch here
      toast.error(result.error || "Failed to update profile");
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Profile Settings</h1>
        <p className="page-subtitle">Manage your account information and security</p>
      </div>

      <div className="profile-card">
        <form onSubmit={handleSave}>
          <div className="avatar-container">
            <div className="profile-avatar-large">
              {user?.full_name?.[0]?.toUpperCase() || <User size={40} />}
              <div className="avatar-edit-badge">
                <Camera size={16} color="white" />
              </div>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-main)' }}>{user?.full_name || 'Your Profile'}</h2>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{user?.email}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="profile-input"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="profile-input"
                  placeholder="name@example.com"
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Note: Changing your email will update your login credentials.</p>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary"
                style={{ minWidth: '160px' }}
              >
                {isSaving ? (
                  <Loader2 className="spinner" size={20} />
                ) : (
                  <>
                    <Save size={20} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="security-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Shield size={24} color="var(--accent)" />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Security & Account</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Manage your password and security settings</p>
          </div>
        </div>
        <div style={{ marginTop: '1.5rem' }}>
           <button 
             className="btn-secondary" 
             style={{ width: '100%', justifyContent: 'center' }}
             onClick={() => setIsPasswordModalOpen(true)}
           >
             Change Password
           </button>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </div>
  );
}
