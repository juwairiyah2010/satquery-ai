import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  'Student / Researcher',
  'Government / Disaster Management',
  'Agriculture',
  'Urban Planning',
  'Environmental Monitoring',
  'Other'
]

export default function ProfilePage() {
  const { user, updateProfile, changePassword, deleteAccount, logout } = useAuth()
  const navigate = useNavigate()

  // Profile Form state
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [organization, setOrganization] = useState(user?.organization || '')
  const [role, setRole] = useState(user?.role || 'Researcher')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passSaving, setPassSaving] = useState(false)
  const [passSuccess, setPassSuccess] = useState('')
  const [passError, setPassError] = useState('')

  // Delete Account Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileSuccess('')
    setProfileError('')

    const res = await updateProfile({
      fullName,
      organization,
      role
    })

    setProfileSaving(false)
    if (res.success) {
      setProfileSuccess('Profile details updated successfully.')
    } else {
      setProfileError(res.error || 'Failed to update profile.')
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmNewPassword) {
      setPassError('New passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setPassError('New password must be at least 8 characters long.')
      return
    }

    setPassSaving(true)
    setPassSuccess('')
    setPassError('')

    const res = await changePassword({
      currentPassword,
      newPassword,
      confirmNewPassword
    })

    setPassSaving(false)
    if (res.success) {
      setPassSuccess('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } else {
      setPassError(res.error || 'Failed to change password.')
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== 'delete') {
      alert('Please type "delete" to confirm account removal.')
      return
    }
    setDeleting(true)
    const res = await deleteAccount()
    setDeleting(false)
    if (res.success) {
      navigate('/login', { replace: true })
    } else {
      alert(res.error || 'Failed to delete account.')
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px', width: '100%' }} className="fade-up">
      
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 4px' }}>
          👤 User Profile & Workspace Settings
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          Manage your geospatial credentials, organizational affiliation, and security settings.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* ══ SECTION 1: ACCOUNT DETAILS & PROFILE ══ */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Personal Information
            </h2>
            <span className="badge badge-green" style={{ fontSize: 10 }}>
              ✓ Verified Clearance
            </span>
          </div>

          {profileSuccess && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px', color: '#166534', fontSize: 12.5, marginBottom: 14 }}>
              ✓ {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="auth-error-banner" style={{ marginBottom: 14 }}>
              {profileError}
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="auth-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Read-Only)</span></label>
                <input
                  type="email"
                  className="auth-input"
                  value={user?.email || ''}
                  disabled
                  style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 14 }}>
              <div className="form-group">
                <label className="form-label">Organization / Ministry</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. ISRO / NRSC / FSI"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Operational Role</label>
                <select
                  className="auth-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary-action"
              disabled={profileSaving}
              style={{ marginTop: 20 }}
            >
              {profileSaving ? 'Saving changes…' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* ══ SECTION 2: CHANGE PASSWORD ══ */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>
            Change Password
          </h2>

          {passSuccess && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px', color: '#166534', fontSize: 12.5, marginBottom: 14 }}>
              ✓ {passSuccess}
            </div>
          )}
          {passError && (
            <div className="auth-error-banner" style={{ marginBottom: 14 }}>
              {passError}
            </div>
          )}

          <form onSubmit={handleChangePassword}>
            <div className="form-group" style={{ maxWidth: 420 }}>
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="auth-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 14, maxWidth: 640 }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Re-enter new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-secondary-action"
              disabled={passSaving}
              style={{ marginTop: 20 }}
            >
              {passSaving ? 'Updating password…' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* ══ SECTION 3: DANGER ZONE ══ */}
        <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 10, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c53030', fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
            <span>⚠️</span> DANGER ZONE
          </div>
          <p style={{ fontSize: 12.5, color: '#742a2a', margin: '0 0 16px', lineHeight: 1.5 }}>
            Permanently delete your account and all associated satellite analyses, evidence records, and saved decision reports. This action is irreversible.
          </p>

          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700,
              background: '#e53e3e', color: '#ffffff', border: 'none', cursor: 'pointer'
            }}
          >
            Delete My Account & Data
          </button>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="report-backdrop">
          <div className="auth-card fade-up" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c53030', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
              <span>⚠️</span> Confirm Account Deletion
            </div>
            <p style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.5, margin: '0 0 16px' }}>
              Are you sure you want to permanently delete your account and associated data?
              Type <strong>delete</strong> below to proceed:
            </p>
            <input
              type="text"
              className="auth-input"
              placeholder="Type delete to confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }}
                style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 12 }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText.trim().toLowerCase() !== 'delete'}
                style={{
                  padding: '8px 14px', borderRadius: 6, border: 'none',
                  background: '#e53e3e', color: '#fff', fontWeight: 700, fontSize: 12,
                  cursor: deleteConfirmText.trim().toLowerCase() === 'delete' ? 'pointer' : 'not-allowed',
                  opacity: deleteConfirmText.trim().toLowerCase() === 'delete' ? 1 : 0.5
                }}
              >
                {deleting ? 'Deleting account…' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
