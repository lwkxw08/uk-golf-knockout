import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Plus, Edit2, Trash2, DollarSign } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

export default function PricingManagement() {
  const [pricing, setPricing] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(null);
  const [showTierForm, setShowTierForm] = useState(null);

  const fetchData = () => {
    Promise.all([
      api.get('/admin/pricing'),
      api.get('/admin/subscription-tiers'),
    ]).then(([p, t]) => { setPricing(p); setTiers(t); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(fetchData, []);

  const [form, setForm] = useState({ pricingKey: '', amountPence: 0, description: '', effectiveFrom: '' });
  const [tierForm, setTierForm] = useState({ name: '', slug: '', amountPence: 0, features: '', sortOrder: 0 });

  const openCreatePricing = () => {
    setForm({ pricingKey: '', amountPence: 0, description: '', effectiveFrom: new Date().toISOString().slice(0, 10) });
    setShowForm('create');
  };
  const openEditPricing = (p) => {
    setForm({ ...p, effectiveFrom: p.effectiveFrom ? p.effectiveFrom.slice(0, 10) : '' });
    setShowForm(p.id);
  };

  const openCreateTier = () => {
    setTierForm({ name: '', slug: '', amountPence: 0, features: '', sortOrder: 0 });
    setShowTierForm('create');
  };
  const openEditTier = (t) => {
    setTierForm({ ...t, features: (t.features || []).join(', ') });
    setShowTierForm(t.id);
  };

  const savePricing = async (e) => {
    e.preventDefault();
    try {
      if (showForm === 'create') {
        await api.post('/admin/pricing', form);
      } else {
        await api.put(`/admin/pricing/${showForm}`, form);
      }
      setShowForm(null);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const deletePricing = async (id) => {
    if (!confirm('Delete this pricing?')) return;
    await api.delete(`/admin/pricing/${id}`);
    fetchData();
  };

  const saveTier = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...tierForm, features: tierForm.features.split(',').map(f => f.trim()).filter(Boolean) };
      if (showTierForm === 'create') {
        await api.post('/admin/subscription-tiers', payload);
      } else {
        await api.put(`/admin/subscription-tiers/${showTierForm}`, payload);
      }
      setShowTierForm(null);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const deleteTier = async (id) => {
    if (!confirm('Delete this tier?')) return;
    await api.delete(`/admin/subscription-tiers/${id}`);
    fetchData();
  };

  const input = 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none';

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div>
      <PageHeader title="Pricing Management" subtitle="Manage platform pricing and club subscription plans" icon={DollarSign} gradient="green" compact />
      <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Platform Pricing */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Platform Pricing</h2>
          <button onClick={openCreatePricing} className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1"><Plus className="w-4 h-4" /> Add</button>
        </div>
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3">Key</th>
              <th className="text-left px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Description</th>
              <th className="text-left px-4 py-3">Effective From</th>
              <th className="px-4 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {pricing.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium font-mono text-sm">{p.pricingKey}</td>
                  <td className="px-4 py-3 font-semibold">&pound;{(p.amountPence / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600">{p.description}</td>
                  <td className="px-4 py-3 text-gray-500">{p.effectiveFrom ? new Date(p.effectiveFrom).toLocaleDateString('en-GB') : '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => openEditPricing(p)} className="text-blue-600 hover:text-blue-800 mr-2"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deletePricing(p.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pricing.length === 0 && <p className="text-center text-gray-500 py-6">No pricing configured</p>}
        </div>
      </div>

      {/* Subscription Tiers */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Club Subscription Tiers</h2>
          <button onClick={openCreateTier} className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1"><Plus className="w-4 h-4" /> Add Tier</button>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {tiers.map(t => (
            <div key={t.id} className="bg-white border rounded-xl p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg">{t.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => openEditTier(t)} className="text-blue-600 hover:text-blue-800"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteTier(t.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-3xl font-bold text-green-700 mb-3">&pound;{(t.amountPence / 100).toFixed(0)}<span className="text-sm font-normal text-gray-500">/year</span></p>
              <ul className="space-y-1">
                {(t.features || []).map((f, i) => <li key={i} className="text-sm text-gray-600 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />{f}</li>)}
              </ul>
              <p className="text-xs text-gray-400 mt-3">{t._count?.clubSubscriptions || 0} active subscriptions</p>
            </div>
          ))}
          {tiers.length === 0 && <p className="text-gray-500 col-span-3 text-center py-8">No subscription tiers configured</p>}
        </div>
      </div>

      {/* Pricing Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">{showForm === 'create' ? 'New Pricing' : 'Edit Pricing'}</h3>
            <form onSubmit={savePricing} className="space-y-3">
              <input type="text" required value={form.pricingKey} onChange={(e) => setForm({ ...form, pricingKey: e.target.value })} placeholder="Pricing key (e.g. player_membership_annual)" className={input} disabled={showForm !== 'create'} />
              <input type="number" min="0" required value={form.amountPence} onChange={(e) => setForm({ ...form, amountPence: Number(e.target.value) })} placeholder="Amount (pence)" className={input} />
              <p className="text-xs text-gray-500 -mt-2">&pound;{(form.amountPence / 100).toFixed(2)}</p>
              <input type="text" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className={input} />
              <input type="date" required value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} className={input} />
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-lg font-medium">Save</button>
                <button type="button" onClick={() => setShowForm(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tier Form Modal */}
      {showTierForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">{showTierForm === 'create' ? 'New Tier' : 'Edit Tier'}</h3>
            <form onSubmit={saveTier} className="space-y-3">
              <input type="text" required value={tierForm.name} onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })} placeholder="Tier name (e.g. Standard)" className={input} />
              <input type="text" required value={tierForm.slug} onChange={(e) => setTierForm({ ...tierForm, slug: e.target.value })} placeholder="Slug (e.g. standard)" className={input} />
              <input type="number" min="0" required value={tierForm.amountPence} onChange={(e) => setTierForm({ ...tierForm, amountPence: Number(e.target.value) })} placeholder="Annual price (pence)" className={input} />
              <p className="text-xs text-gray-500 -mt-2">&pound;{(tierForm.amountPence / 100).toFixed(2)}/year</p>
              <textarea value={tierForm.features} onChange={(e) => setTierForm({ ...tierForm, features: e.target.value })} placeholder="Features (comma separated)" rows={3} className={input} />
              <input type="number" value={tierForm.sortOrder} onChange={(e) => setTierForm({ ...tierForm, sortOrder: Number(e.target.value) })} placeholder="Sort order" className={input} />
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-lg font-medium">Save</button>
                <button type="button" onClick={() => setShowTierForm(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
