import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useLookupData } from '../hooks/useLookupData';

export default function ProfilePage() {
  const { user, profile, profileLoading, updateProfile, uploadPhoto, fetchProfile } = useAuthStore();
  const { ranks, units, districts, designations, getUnitsByDistrict } = useLookupData();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoRef = useRef(null);

  // Form state
  const [form, setForm] = useState({
    officer_name: '',
    rank_id: '',
    kgid: '',
    unit_id: '',
    district_id: '',
    designation_id: '',
    mobile_no: '',
    photo_url: '',
  });

  // Detect first-time (no profile) — auto-open edit mode
  const isFirstTime = !profile && !profileLoading;

  useEffect(() => {
    if (profile) {
      setForm({
        officer_name: profile.officer_name || '',
        rank_id: profile.rank_id ? String(profile.rank_id) : '',
        kgid: profile.kgid || '',
        unit_id: profile.unit_id ? String(profile.unit_id) : '',
        district_id: profile.district_id ? String(profile.district_id) : '',
        designation_id: profile.designation_id ? String(profile.designation_id) : '',
        mobile_no: profile.mobile_no || '',
        photo_url: profile.photo_url || '',
      });
      setEditing(false);
    } else if (isFirstTime) {
      setEditing(true);
    }
  }, [profile, isFirstTime]);

  const filteredUnits = useMemo(
    () => form.district_id ? getUnitsByDistrict(parseInt(form.district_id)) : units,
    [form.district_id, getUnitsByDistrict, units]
  );

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setPhotoUploading(true);
    setError('');
    try {
      const photoUrl = await uploadPhoto(file);
      set('photo_url', photoUrl);
      setSuccess('Photo uploaded successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Photo upload failed:', err);
      setError('Failed to upload photo: ' + (err.message || 'Unknown error'));
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.officer_name.trim()) {
      setError('Officer name is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateProfile({
        officer_name: form.officer_name.trim(),
        rank_id: form.rank_id ? parseInt(form.rank_id) : null,
        kgid: form.kgid.trim(),
        unit_id: form.unit_id ? parseInt(form.unit_id) : null,
        district_id: form.district_id ? parseInt(form.district_id) : null,
        designation_id: form.designation_id ? parseInt(form.designation_id) : null,
        mobile_no: form.mobile_no.trim(),
        photo_url: form.photo_url,
      });
      setSuccess('Profile saved successfully!');
      setEditing(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Profile save failed:', err);
      setError('Failed to save profile: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        officer_name: profile.officer_name || '',
        rank_id: profile.rank_id ? String(profile.rank_id) : '',
        kgid: profile.kgid || '',
        unit_id: profile.unit_id ? String(profile.unit_id) : '',
        district_id: profile.district_id ? String(profile.district_id) : '',
        designation_id: profile.designation_id ? String(profile.designation_id) : '',
        mobile_no: profile.mobile_no || '',
        photo_url: profile.photo_url || '',
      });
    }
    setEditing(false);
    setError('');
  };

  // Resolved names for display
  const rankName = profile?.rank?.RankName || '—';
  const unitName = profile?.unit?.UnitName || '—';
  const districtName = profile?.district?.DistrictName || '—';
  const designationName = profile?.designation?.DesignationName || '—';

  if (profileLoading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="spinner" />
          <span>Loading profile…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <div className="profile-header-content">
          <span className="material-icons profile-header-icon">badge</span>
          <div>
            <h1 className="profile-header-title">Officer Profile</h1>
            <p className="profile-header-subtitle">
              {isFirstTime
                ? 'Set up your profile to auto-fill FIR forms'
                : 'Your officer details are used to auto-fill complaint forms'}
            </p>
          </div>
        </div>
        {!editing && profile && (
          <button className="btn btn-primary profile-edit-btn" onClick={() => setEditing(true)}>
            <span className="material-icons">edit</span> Edit Profile
          </button>
        )}
      </div>

      {/* First-time setup banner */}
      {isFirstTime && (
        <div className="profile-banner profile-banner-info">
          <span className="material-icons">info</span>
          <div>
            <strong>Welcome!</strong> Please fill in your officer details below. This information will be automatically filled into FIR forms you create.
          </div>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="profile-banner profile-banner-success">
          <span className="material-icons">check_circle</span>
          <span>{success}</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="profile-banner profile-banner-error">
          <span className="material-icons">error</span>
          <span>{error}</span>
        </div>
      )}

      <div className="profile-grid">
        {/* Photo Card */}
        <div className="profile-card profile-photo-card">
          <div className="profile-photo-wrapper">
            {form.photo_url ? (
              <img src={form.photo_url} alt="Officer" className="profile-photo-img" />
            ) : (
              <div className="profile-photo-placeholder">
                <span className="material-icons">person</span>
              </div>
            )}
            {editing && (
              <button
                type="button"
                className="profile-photo-overlay"
                onClick={() => photoRef.current?.click()}
                disabled={photoUploading}
              >
                {photoUploading ? (
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                ) : (
                  <>
                    <span className="material-icons">camera_alt</span>
                    <span>{form.photo_url ? 'Change Photo' : 'Upload Photo'}</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
          </div>
          <div className="profile-photo-info">
            <div className="profile-photo-name">
              {form.officer_name || user?.email || 'Officer'}
            </div>
            {profile?.rank?.RankName && (
              <div className="profile-photo-rank">{profile.rank.RankName}</div>
            )}
            {form.kgid && (
              <div className="profile-photo-kgid">KGID: {form.kgid}</div>
            )}
          </div>
        </div>

        {/* Details Card */}
        <div className="profile-card profile-details-card">
          <div className="profile-card-header">
            <span className="material-icons">assignment_ind</span>
            <span>Officer Details</span>
          </div>

          {editing ? (
            /* Edit Mode */
            <div className="profile-form">
              <div className="profile-form-row">
                <div className="profile-form-field">
                  <label className="profile-label required">Full Name</label>
                  <input
                    className="form-input profile-input"
                    value={form.officer_name}
                    onChange={e => set('officer_name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="profile-form-field">
                  <label className="profile-label">KGID Number</label>
                  <input
                    className="form-input profile-input"
                    value={form.kgid}
                    onChange={e => set('kgid', e.target.value)}
                    placeholder="e.g. KGD123456"
                  />
                </div>
              </div>

              <div className="profile-form-row">
                <div className="profile-form-field">
                  <label className="profile-label">Rank</label>
                  <select
                    className="form-select profile-input"
                    value={form.rank_id}
                    onChange={e => set('rank_id', e.target.value)}
                  >
                    <option value="">— Select Rank —</option>
                    {ranks.map(r => (
                      <option key={r.RankID} value={r.RankID}>{r.RankName}</option>
                    ))}
                  </select>
                </div>
                <div className="profile-form-field">
                  <label className="profile-label">Designation</label>
                  <select
                    className="form-select profile-input"
                    value={form.designation_id}
                    onChange={e => set('designation_id', e.target.value)}
                  >
                    <option value="">— Select Designation —</option>
                    {designations.map(d => (
                      <option key={d.DesignationID} value={d.DesignationID}>{d.DesignationName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="profile-form-row">
                <div className="profile-form-field">
                  <label className="profile-label">District</label>
                  <select
                    className="form-select profile-input"
                    value={form.district_id}
                    onChange={e => {
                      set('district_id', e.target.value);
                      set('unit_id', '');
                    }}
                  >
                    <option value="">— Select District —</option>
                    {districts.map(d => (
                      <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>
                    ))}
                  </select>
                </div>
                <div className="profile-form-field">
                  <label className="profile-label">Police Station / Unit</label>
                  <select
                    className="form-select profile-input"
                    value={form.unit_id}
                    onChange={e => set('unit_id', e.target.value)}
                  >
                    <option value="">— Select Unit —</option>
                    {filteredUnits.map(u => (
                      <option key={u.UnitID} value={u.UnitID}>{u.UnitName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="profile-form-row">
                <div className="profile-form-field">
                  <label className="profile-label">Mobile Number</label>
                  <input
                    className="form-input profile-input"
                    value={form.mobile_no}
                    onChange={e => set('mobile_no', e.target.value)}
                    placeholder="e.g. 9876543210"
                    type="tel"
                  />
                </div>
                <div className="profile-form-field">
                  <label className="profile-label">Email (Login)</label>
                  <input
                    className="form-input profile-input"
                    value={user?.email || ''}
                    disabled
                    title="Email is managed via Supabase Authentication"
                  />
                </div>
              </div>

              <div className="profile-form-actions">
                {profile && (
                  <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={saving}>
                    Cancel
                  </button>
                )}
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      Saving…
                    </>
                  ) : (
                    <>
                      <span className="material-icons">save</span>
                      {profile ? 'Save Changes' : 'Create Profile'}
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="profile-view">
              <div className="profile-view-grid">
                <div className="profile-view-item">
                  <div className="profile-view-label">Full Name</div>
                  <div className="profile-view-value">{profile?.officer_name || '—'}</div>
                </div>
                <div className="profile-view-item">
                  <div className="profile-view-label">KGID Number</div>
                  <div className="profile-view-value profile-view-mono">{profile?.kgid || '—'}</div>
                </div>
                <div className="profile-view-item">
                  <div className="profile-view-label">Rank</div>
                  <div className="profile-view-value">{rankName}</div>
                </div>
                <div className="profile-view-item">
                  <div className="profile-view-label">Designation</div>
                  <div className="profile-view-value">{designationName}</div>
                </div>
                <div className="profile-view-item">
                  <div className="profile-view-label">District</div>
                  <div className="profile-view-value">{districtName}</div>
                </div>
                <div className="profile-view-item">
                  <div className="profile-view-label">Police Station / Unit</div>
                  <div className="profile-view-value">{unitName}</div>
                </div>
                <div className="profile-view-item">
                  <div className="profile-view-label">Mobile Number</div>
                  <div className="profile-view-value">{profile?.mobile_no || '—'}</div>
                </div>
                <div className="profile-view-item">
                  <div className="profile-view-label">Email</div>
                  <div className="profile-view-value">{user?.email || '—'}</div>
                </div>
              </div>

              <div className="profile-autofill-note">
                <span className="material-icons">auto_awesome</span>
                <span>These details are automatically filled into the <strong>Officer-in-charge</strong> section when you create a new FIR.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
