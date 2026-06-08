import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { MapPin, Plus, Pencil, X } from 'lucide-react';
import CourseSearch from '../../components/ui/CourseSearch';

export default function ClubManagement() {
  const [clubs, setClubs] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | club object

  useEffect(() => {
    Promise.all([
      api.get('/clubs?limit=200'),
      api.get('/admin/regions'),
    ]).then(([c, r]) => {
      setClubs(c.clubs || c);
      setRegions(r);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const refreshClubs = () => {
    api.get('/clubs?limit=200').then(c => setClubs(c.clubs || c)).catch(console.error);
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Club Management</h1>
        <button onClick={() => setModal('create')} className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition">
          <Plus className="w-4 h-4" /> Add Club
        </button>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500 border-b">
              <th className="px-4 py-3">Club</th>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Course Data</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clubs.map(club => (
              <tr key={club.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{club.name}</p>
                  <p className="text-xs text-gray-400">/{club.slug}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{club.region?.name || '—'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {[club.city, club.county].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-4 py-3">
                  {club.slopeRating ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      SR {club.slopeRating} / CR {club.courseRating} / Par {club.par}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Not linked</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${club.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {club.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setModal(club)} className="text-green-700 hover:underline text-xs flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <ClubModal
          club={modal === 'create' ? null : modal}
          regions={regions}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refreshClubs(); }}
        />
      )}
    </div>
  );
}

function ClubModal({ club, regions, onClose, onSaved }) {
  const isEdit = !!club;
  const [form, setForm] = useState({
    name: club?.name || '',
    slug: club?.slug || '',
    address: club?.address || '',
    city: club?.city || '',
    county: club?.county || '',
    postcode: club?.postcode || '',
    regionId: club?.regionId || '',
    phone: club?.phone || '',
    email: club?.email || '',
    website: club?.website || '',
    description: club?.description || '',
    slopeRating: club?.slopeRating || '',
    courseRating: club?.courseRating || '',
    par: club?.par || '',
    latitude: club?.latitude || '',
    longitude: club?.longitude || '',
    isActive: club?.isActive ?? true,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (field === 'name' && !isEdit) {
      setForm(prev => ({
        ...prev,
        name: val,
        slug: String(val).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      }));
    } else {
      setForm(prev => ({ ...prev, [field]: val }));
    }
  };

  const handleCourseSelect = (courseData) => {
    setForm(prev => ({
      ...prev,
      address: courseData.address || prev.address,
      city: courseData.city || prev.city,
      county: courseData.county || prev.county,
      latitude: courseData.latitude || prev.latitude,
      longitude: courseData.longitude || prev.longitude,
      slopeRating: courseData.tees?.[0]?.slopeRating || prev.slopeRating,
      courseRating: courseData.tees?.[0]?.courseRating || prev.courseRating,
      par: courseData.tees?.[0]?.par || prev.par,
      name: prev.name || courseData.clubName,
      slug: prev.slug || String(courseData.clubName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        slopeRating: form.slopeRating ? Number(form.slopeRating) : null,
        courseRating: form.courseRating ? Number(form.courseRating) : null,
        par: form.par ? Number(form.par) : null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      };
      if (isEdit) {
        await api.put(`/clubs/${club.id}`, payload);
      } else {
        await api.post('/clubs', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none text-sm';
  const label = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold">{isEdit ? 'Edit Club' : 'Add New Club'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}

        {/* Course Search — auto-fills fields */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-blue-700 mb-2 font-medium">Auto-fill from course database (optional)</p>
          <CourseSearch onSelect={handleCourseSelect} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Club Name *</label>
              <input type="text" required value={form.name} onChange={update('name')} className={input} />
            </div>
            <div>
              <label className={label}>URL Slug *</label>
              <input type="text" required value={form.slug} onChange={update('slug')} className={input} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Address</label>
              <input type="text" value={form.address} onChange={update('address')} className={input} />
            </div>
            <div>
              <label className={label}>City</label>
              <input type="text" value={form.city} onChange={update('city')} className={input} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={label}>County</label>
              <input type="text" value={form.county} onChange={update('county')} className={input} />
            </div>
            <div>
              <label className={label}>Postcode</label>
              <input type="text" value={form.postcode} onChange={update('postcode')} className={input} />
            </div>
            <div>
              <label className={label}>Region</label>
              <select value={form.regionId} onChange={update('regionId')} className={input}>
                <option value="">Select region...</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={label}>Phone</label>
              <input type="text" value={form.phone} onChange={update('phone')} className={input} />
            </div>
            <div>
              <label className={label}>Email</label>
              <input type="email" value={form.email} onChange={update('email')} className={input} />
            </div>
            <div>
              <label className={label}>Website</label>
              <input type="url" value={form.website} onChange={update('website')} placeholder="https://" className={input} />
            </div>
          </div>

          <div>
            <label className={label}>Description</label>
            <textarea value={form.description} onChange={update('description')} rows={2} className={input} />
          </div>

          {/* Course rating data */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Course Data
              <span className="text-xs font-normal text-gray-400">(auto-filled from search or enter manually)</span>
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={label}>Slope Rating</label>
                <input type="number" value={form.slopeRating} onChange={update('slopeRating')} placeholder="e.g. 131" className={input} />
              </div>
              <div>
                <label className={label}>Course Rating</label>
                <input type="number" step="0.1" value={form.courseRating} onChange={update('courseRating')} placeholder="e.g. 72.3" className={input} />
              </div>
              <div>
                <label className={label}>Par</label>
                <input type="number" value={form.par} onChange={update('par')} placeholder="e.g. 72" className={input} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className={label}>Latitude</label>
                <input type="number" step="any" value={form.latitude} onChange={update('latitude')} className={input} />
              </div>
              <div>
                <label className={label}>Longitude</label>
                <input type="number" step="any" value={form.longitude} onChange={update('longitude')} className={input} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={update('isActive')} className="rounded" />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 transition text-sm">
              {saving ? 'Saving...' : (isEdit ? 'Update Club' : 'Create Club')}
            </button>
            <button type="button" onClick={onClose} className="px-6 py-2.5 border rounded-lg text-gray-600 hover:bg-gray-50 transition text-sm">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
