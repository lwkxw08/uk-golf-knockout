import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { MapPin, Plus, Pencil, X, ChevronDown, ChevronUp } from 'lucide-react';
import CourseSearch from '../../components/ui/CourseSearch';

// Map API county/state codes to region names for auto-matching
const COUNTY_REGION_MAP = {
  // South East
  SRY: 'South East', KEN: 'South East', SXE: 'South East', SXW: 'South East',
  HAM: 'South East', BRK: 'South East', OXF: 'South East', BKM: 'South East',
  HRT: 'South East', BDF: 'South East', ESS: 'South East', LND: 'South East',
  // South West
  DEV: 'South West', SOM: 'South West', DOR: 'South West', WIL: 'South West',
  GLS: 'South West', CON: 'South West', AVN: 'South West',
  // Midlands
  WMD: 'Midlands', STS: 'Midlands', WAR: 'Midlands', WOR: 'Midlands',
  SHR: 'Midlands', NTH: 'Midlands', LEC: 'Midlands', DRB: 'Midlands',
  NTT: 'Midlands', HEF: 'Midlands', RUT: 'Midlands', LIN: 'Midlands',
  // North West
  LAN: 'North West', CHS: 'North West', CMA: 'North West', MER: 'North West', GTM: 'North West',
  // North East
  DUR: 'North East', NBL: 'North East', TYW: 'North East', CLV: 'North East',
  NYK: 'North East', WYK: 'North East', SYK: 'North East', HMB: 'North East', ERY: 'North East',
  // East Anglia
  NFK: 'East Anglia', SFK: 'East Anglia', CAM: 'East Anglia',
  // Scotland
  SCT: 'Scotland', ABD: 'Scotland', ANG: 'Scotland', ARL: 'Scotland',
  AYR: 'Scotland', BAN: 'Scotland', BEW: 'Scotland', BUT: 'Scotland',
  CAI: 'Scotland', CLK: 'Scotland', DFS: 'Scotland', DNB: 'Scotland',
  ELN: 'Scotland', FIF: 'Scotland', INV: 'Scotland', KKD: 'Scotland',
  KRS: 'Scotland', LKS: 'Scotland', MLN: 'Scotland', MOY: 'Scotland',
  NAI: 'Scotland', OKI: 'Scotland', PEE: 'Scotland', PER: 'Scotland',
  RFW: 'Scotland', ROC: 'Scotland', ROX: 'Scotland', SEL: 'Scotland',
  SHI: 'Scotland', STI: 'Scotland', SUT: 'Scotland', WIG: 'Scotland', WLN: 'Scotland', ZET: 'Scotland',
  // Wales
  WLS: 'Wales', AGY: 'Wales', CGN: 'Wales', CMN: 'Wales',
  DEN: 'Wales', FLN: 'Wales', GLA: 'Wales', GWN: 'Wales',
  MER: 'Wales', MGM: 'Wales', MON: 'Wales', MTG: 'Wales',
  PEM: 'Wales', POW: 'Wales', RAD: 'Wales',
};

export default function ClubManagement() {
  const [clubs, setClubs] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

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
    courseApiId: club?.courseApiId || '',
    courseProvider: club?.courseProvider || '',
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
  const [tees, setTees] = useState([]);
  const [showTees, setShowTees] = useState(false);
  const [showScorecard, setShowScorecard] = useState(null); // tee index
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
    // Try to auto-match region from county code
    const regionName = COUNTY_REGION_MAP[courseData.county] || null;
    const matchedRegion = regionName ? regions.find(r => r.name === regionName) : null;

    // Extract UK postcode from address string (e.g. "Southview Road, Pinner Hill HA5 3YA, United Kingdom")
    const postcodeMatch = (courseData.address || '').match(/\b([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/i);
    const postcode = postcodeMatch ? postcodeMatch[1].toUpperCase() : '';

    setForm(prev => ({
      ...prev,
      courseApiId: courseData.courseApiId || prev.courseApiId,
      courseProvider: courseData.provider || prev.courseProvider,
      address: courseData.address || prev.address,
      city: courseData.city || prev.city,
      county: courseData.county || prev.county,
      postcode: postcode || prev.postcode,
      latitude: courseData.latitude || prev.latitude,
      longitude: courseData.longitude || prev.longitude,
      slopeRating: courseData.tees?.[0]?.slopeRating || prev.slopeRating,
      courseRating: courseData.tees?.[0]?.courseRating || prev.courseRating,
      par: courseData.tees?.[0]?.par || prev.par,
      name: prev.name || courseData.clubName,
      slug: prev.slug || String(courseData.clubName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      regionId: matchedRegion?.id || prev.regionId,
    }));

    // Store tee data to send to backend
    if (courseData.tees && courseData.tees.length > 0) {
      setTees(courseData.tees.map(t => ({
        teeId: t.teeId,
        teeName: t.teeName,
        gender: t.gender || 'male',
        slopeRating: t.slopeRating,
        courseRating: t.courseRating,
        bogeyRating: t.bogeyRating,
        par: t.par,
        totalYards: t.totalYards,
        totalMeters: t.totalMeters,
        numberOfHoles: t.numberOfHoles || 18,
        holes: (t.holes || []).map(h => ({
          holeNumber: h.holeNumber,
          par: h.par,
          yards: h.yardage || h.yards || null,
          meters: h.meters || null,
          strokeIndex: h.handicap || h.strokeIndex || null,
        })),
      })));
      setShowTees(true);
    }
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
        regionId: form.regionId || null,
        tees: tees.length > 0 ? tees : undefined,
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
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
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

          {/* Tee Data Section */}
          {tees.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <button
                type="button"
                onClick={() => setShowTees(!showTees)}
                className="w-full flex justify-between items-center text-sm font-medium text-green-800"
              >
                <span>{tees.length} Tee{tees.length !== 1 ? 's' : ''} from Course Database</span>
                {showTees ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showTees && (
                <div className="mt-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-green-700 border-b border-green-200">
                        <th className="pb-1.5 pr-2">Tee</th>
                        <th className="pb-1.5 pr-2">Gender</th>
                        <th className="pb-1.5 pr-2">Slope</th>
                        <th className="pb-1.5 pr-2">CR</th>
                        <th className="pb-1.5 pr-2">Par</th>
                        <th className="pb-1.5 pr-2">Yards</th>
                        <th className="pb-1.5">Scorecard</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tees.map((tee, i) => (
                        <tr key={i} className="border-b border-green-100 last:border-0">
                          <td className="py-1.5 pr-2 font-medium">{tee.teeName}</td>
                          <td className="py-1.5 pr-2 capitalize">{tee.gender}</td>
                          <td className="py-1.5 pr-2">{tee.slopeRating}</td>
                          <td className="py-1.5 pr-2">{tee.courseRating}</td>
                          <td className="py-1.5 pr-2">{tee.par}</td>
                          <td className="py-1.5 pr-2">{tee.totalYards?.toLocaleString()}</td>
                          <td className="py-1.5">
                            {tee.holes?.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowScorecard(showScorecard === i ? null : i)}
                                className="text-green-700 hover:underline"
                              >
                                {showScorecard === i ? 'Hide' : 'View'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Inline Scorecard with editable stroke index */}
                  {showScorecard !== null && tees[showScorecard]?.holes?.length > 0 && (
                    <div className="mt-3 bg-white rounded-lg border border-green-200 p-3 overflow-x-auto">
                      <p className="text-xs font-medium text-green-800 mb-2">
                        {tees[showScorecard].teeName} Tees — Scorecard
                      </p>
                      <ScorecardTable
                        holes={tees[showScorecard].holes}
                        editable
                        onHoleChange={(holeNumber, field, value) => {
                          setTees(prev => prev.map((t, ti) => {
                            if (ti !== showScorecard) return t;
                            return {
                              ...t,
                              holes: t.holes.map(h =>
                                h.holeNumber === holeNumber ? { ...h, [field]: value } : h
                              ),
                            };
                          }));
                        }}
                      />
                      <p className="text-xs text-amber-600 mt-2">
                        ⚠ Stroke Index not available from GolfCourseAPI — please enter manually for each hole.
                        Will auto-populate from England Golf API when connected.
                      </p>
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-green-600 mt-2">
                Tee data will be saved with the club and available for tournament setup.
              </p>
            </div>
          )}

          {/* Course rating data (manual override) */}
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

function ScorecardTable({ holes, editable = false, onHoleChange }) {
  const front = holes.filter(h => h.holeNumber <= 9);
  const back = holes.filter(h => h.holeNumber > 9 && h.holeNumber <= 18);
  const sum = (arr, key) => arr.reduce((s, h) => s + (h[key] || 0), 0);
  const hasMissingSI = holes.some(h => !h.strokeIndex);

  const headerCell = 'px-1.5 py-1 text-center font-bold text-green-800 bg-green-100';
  const dataCell = 'px-1.5 py-1 text-center';
  const totalCell = 'px-1.5 py-1 text-center font-bold bg-green-50';

  const renderSICell = (h) => {
    if (editable) {
      return (
        <td key={h.holeNumber} className={`${dataCell} ${!h.strokeIndex ? 'bg-amber-50' : ''}`}>
          <input
            type="number"
            min="1"
            max="18"
            value={h.strokeIndex || ''}
            onChange={(e) => onHoleChange?.(h.holeNumber, 'strokeIndex', e.target.value ? Number(e.target.value) : null)}
            className="w-8 text-center text-xs border rounded px-0.5 py-0.5 focus:ring-1 focus:ring-green-400 outline-none"
            placeholder="—"
          />
        </td>
      );
    }
    return <td key={h.holeNumber} className={dataCell}>{h.strokeIndex || '—'}</td>;
  };

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-green-50">
          <th className={headerCell}>Hole</th>
          {front.map(h => <th key={h.holeNumber} className={headerCell}>{h.holeNumber}</th>)}
          <th className={headerCell}>Out</th>
          {back.map(h => <th key={h.holeNumber} className={headerCell}>{h.holeNumber}</th>)}
          <th className={headerCell}>In</th>
          <th className={headerCell}>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-t border-green-200">
          <td className={`${dataCell} font-medium`}>Par</td>
          {front.map(h => <td key={h.holeNumber} className={dataCell}>{h.par}</td>)}
          <td className={totalCell}>{sum(front, 'par')}</td>
          {back.map(h => <td key={h.holeNumber} className={dataCell}>{h.par}</td>)}
          <td className={totalCell}>{sum(back, 'par')}</td>
          <td className={totalCell}>{sum(front, 'par') + sum(back, 'par')}</td>
        </tr>
        <tr className="border-t border-green-200">
          <td className={`${dataCell} font-medium`}>Yards</td>
          {front.map(h => <td key={h.holeNumber} className={dataCell}>{h.yards}</td>)}
          <td className={totalCell}>{sum(front, 'yards')}</td>
          {back.map(h => <td key={h.holeNumber} className={dataCell}>{h.yards}</td>)}
          <td className={totalCell}>{sum(back, 'yards')}</td>
          <td className={totalCell}>{sum(front, 'yards') + sum(back, 'yards')}</td>
        </tr>
        <tr className={`border-t ${hasMissingSI && editable ? 'border-amber-300 bg-amber-50/50' : 'border-green-200'}`}>
          <td className={`${dataCell} font-medium ${hasMissingSI && editable ? 'text-amber-700' : ''}`}>
            S.I.{hasMissingSI && editable && ' *'}
          </td>
          {front.map(renderSICell)}
          <td className={totalCell}></td>
          {back.map(renderSICell)}
          <td className={totalCell}></td>
          <td className={totalCell}></td>
        </tr>
      </tbody>
    </table>
  );
}
