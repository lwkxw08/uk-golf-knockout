import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Plus, Edit2, Trash2, ExternalLink, Megaphone } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

export default function SponsorManagement() {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editSponsor, setEditSponsor] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchSponsors = () => {
    api.get('/admin/sponsors').then(setSponsors).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(fetchSponsors, []);

  const [form, setForm] = useState({ name: '', tier: 'LOCAL', websiteUrl: '', logoUrl: '', contactEmail: '', contactPhone: '', annualFeePence: 0 });

  const openCreate = () => { setForm({ name: '', tier: 'LOCAL', websiteUrl: '', logoUrl: '', contactEmail: '', contactPhone: '', annualFeePence: 0 }); setEditSponsor(null); setShowForm(true); };
  const openEdit = (s) => { setForm({ name: s.name, tier: s.tier, websiteUrl: s.websiteUrl || '', logoUrl: s.logoUrl || '', contactEmail: s.contactEmail || '', contactPhone: s.contactPhone || '', annualFeePence: s.annualFeePence || 0 }); setEditSponsor(s); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editSponsor) {
        await api.put(`/admin/sponsors/${editSponsor.id}`, form);
      } else {
        await api.post('/admin/sponsors', form);
      }
      setShowForm(false);
      fetchSponsors();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this sponsor?')) return;
    try {
      await api.delete(`/admin/sponsors/${id}`);
      fetchSponsors();
    } catch (err) { alert(err.message); }
  };

  const input = 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none';

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div>
      <PageHeader title="Sponsor Management" subtitle="Manage sponsor ads and partnerships" icon={Megaphone} gradient="amber" compact
        actions={<button onClick={openCreate} className="bg-white text-green-800 hover:bg-green-50 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Add Sponsor</button>}
      />
      <div className="max-w-5xl mx-auto px-4 py-8">

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b">
            <th className="text-left px-4 py-3">Name</th>
            <th className="text-left px-4 py-3">Tier</th>
            <th className="text-left px-4 py-3">Contact</th>
            <th className="text-left px-4 py-3">Fee/yr</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>
            {sponsors.map(s => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  {s.name}
                  {s.websiteUrl && <a href={s.websiteUrl} target="_blank" rel="noreferrer" className="ml-2 text-green-600"><ExternalLink className="w-3 h-3 inline" /></a>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    s.tier === 'NATIONAL' ? 'bg-purple-100 text-purple-700' :
                    s.tier === 'REGIONAL' ? 'bg-blue-100 text-blue-700' :
                    s.tier === 'LOCAL' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>{s.tier}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{s.contactEmail || '-'}</td>
                <td className="px-4 py-3">&pound;{((s.annualFeePence || 0) / 100).toFixed(0)}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => openEdit(s)} className="text-blue-600 hover:text-blue-800 mr-3"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sponsors.length === 0 && <p className="text-center text-gray-500 py-8">No sponsors yet</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">{editSponsor ? 'Edit Sponsor' : 'New Sponsor'}</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sponsor name" className={input} />
              <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} className={input}>
                <option value="NATIONAL">National</option>
                <option value="REGIONAL">Regional</option>
                <option value="LOCAL">Local</option>
                <option value="CLUB">Club</option>
              </select>
              <input type="url" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} placeholder="Website URL" className={input} />
              <input type="url" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="Logo URL" className={input} />
              <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="Contact email" className={input} />
              <input type="tel" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="Contact phone" className={input} />
              <div>
                <label className="block text-sm text-gray-600 mb-1">Annual Fee (pence)</label>
                <input type="number" min="0" value={form.annualFeePence} onChange={(e) => setForm({ ...form, annualFeePence: Number(e.target.value) })} className={input} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-lg font-medium">Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
