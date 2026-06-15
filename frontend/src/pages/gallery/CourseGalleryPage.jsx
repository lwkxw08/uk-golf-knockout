import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import PageHeader from '../../components/layout/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { Camera, Heart, Star, ChevronLeft, ChevronRight, Upload, X } from 'lucide-react';

export default function CourseGalleryPage() {
  const { clubId } = useParams();
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [club, setClub] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // grid | byHole
  const [byHole, setByHole] = useState({});
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [filterHole, setFilterHole] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ imageUrl: '', holeNumber: '', caption: '' });

  useEffect(() => {
    loadPhotos();
    api.get(`/gallery/club/${clubId}/by-hole`).then((d) => setByHole(d.byHole || {})).catch(() => {});
  }, [clubId, page, filterHole]);

  const loadPhotos = () => {
    const params = new URLSearchParams({ page, limit: 20 });
    if (filterHole) params.set('holeNumber', filterHole);
    api.get(`/gallery/club/${clubId}?${params.toString()}`)
      .then((d) => {
        setPhotos(d.photos || []);
        setTotal(d.total || 0);
        if (d.photos?.[0]?.club) setClub(d.photos[0].club);
      })
      .catch(() => {});
  };

  const likePhoto = (photoId) => {
    api.post(`/gallery/${photoId}/like`).then((d) => {
      setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, likes: d.likes } : p));
    }).catch(() => {});
  };

  const toggleFeature = (photoId) => {
    api.put(`/gallery/${photoId}/feature`).then(() => loadPhotos()).catch(() => {});
  };

  const submitPhoto = (e) => {
    e.preventDefault();
    api.post(`/gallery/club/${clubId}`, {
      imageUrl: uploadForm.imageUrl,
      holeNumber: uploadForm.holeNumber ? Number(uploadForm.holeNumber) : null,
      caption: uploadForm.caption,
    }).then(() => {
      setShowUpload(false);
      setUploadForm({ imageUrl: '', holeNumber: '', caption: '' });
      loadPhotos();
    }).catch(() => alert('Failed to upload photo'));
  };

  const holeNumbers = Object.keys(byHole).map(Number).sort((a, b) => a - b);
  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <PageHeader title={`${club?.name || 'Course'} Photo Gallery`} subtitle={`${total} photos`} icon={Camera} gradient="teal" compact />
      <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-end mb-6">
        <div className="flex gap-2">
          <button onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded text-sm ${viewMode === 'grid' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            Grid
          </button>
          <button onClick={() => setViewMode('byHole')}
            className={`px-3 py-1.5 rounded text-sm ${viewMode === 'byHole' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            By Hole
          </button>
          {user && (
            <button onClick={() => setShowUpload(true)}
              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 flex items-center gap-1">
              <Upload className="w-4 h-4" /> Upload
            </button>
          )}
        </div>
      </div>

      {/* Hole filter pills */}
      {viewMode === 'grid' && holeNumbers.length > 0 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-2">
          <button onClick={() => { setFilterHole(null); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${!filterHole ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            All
          </button>
          {holeNumbers.map((h) => (
            <button key={h} onClick={() => { setFilterHole(h); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${filterHole === h ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              Hole {h} ({byHole[h]?.length || 0})
            </button>
          ))}
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}>
                <img src={photo.imageUrl} alt={photo.caption || `Hole ${photo.holeNumber}`}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition" />
                <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">{photo.holeNumber ? `Hole ${photo.holeNumber}` : 'General'}</span>
                    <span className="text-xs flex items-center gap-0.5">
                      <Heart className="w-3 h-3" /> {photo.likes}
                    </span>
                  </div>
                  {photo.caption && <p className="text-xs mt-0.5 truncate">{photo.caption}</p>}
                </div>
                {photo.isFeatured && (
                  <div className="absolute top-2 left-2 bg-amber-500 text-white px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5">
                    <Star className="w-3 h-3" /> Featured
                  </div>
                )}
              </div>
            ))}
          </div>
          {photos.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No photos yet. Be the first to upload!</p>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 bg-gray-100 rounded text-sm disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 bg-gray-100 rounded text-sm disabled:opacity-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* By Hole view */}
      {viewMode === 'byHole' && (
        <div className="space-y-8">
          {holeNumbers.map((holeNum) => (
            <div key={holeNum}>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold">
                  {holeNum}
                </span>
                Hole {holeNum}
                <span className="text-xs text-gray-400">({byHole[holeNum].length} photos)</span>
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {byHole[holeNum].map((photo) => (
                  <div key={photo.id} className="flex-shrink-0 w-48 rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                    onClick={() => setSelectedPhoto(photo)}>
                    <img src={photo.imageUrl} alt={photo.caption || `Hole ${holeNum}`}
                      className="w-48 h-32 object-cover" />
                    <div className="p-2">
                      <p className="text-xs text-gray-600 truncate">{photo.caption || `Hole ${holeNum}`}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-gray-400">
                          {photo.uploadedBy ? `${photo.uploadedBy.firstName} ${photo.uploadedBy.lastName}` : 'Unknown'}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Heart className="w-2.5 h-2.5" /> {photo.likes}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {holeNumbers.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hole-by-hole photos yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Photo lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="max-w-3xl w-full bg-white rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto.imageUrl} alt={selectedPhoto.caption} className="w-full max-h-[60vh] object-contain bg-black" />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  {selectedPhoto.holeNumber && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded mr-2">Hole {selectedPhoto.holeNumber}</span>}
                  {selectedPhoto.isFeatured && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Featured</span>}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => likePhoto(selectedPhoto.id)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-500 transition">
                    <Heart className="w-4 h-4" /> {selectedPhoto.likes}
                  </button>
                  {user && (user.role === 'ADMIN' || user.role === 'CLUB_MANAGER') && (
                    <button onClick={() => toggleFeature(selectedPhoto.id)}
                      className="text-xs text-amber-600 hover:text-amber-700">
                      {selectedPhoto.isFeatured ? 'Unfeature' : 'Feature'}
                    </button>
                  )}
                </div>
              </div>
              {selectedPhoto.caption && <p className="text-gray-700 mt-2">{selectedPhoto.caption}</p>}
              {selectedPhoto.uploadedBy && (
                <p className="text-xs text-gray-400 mt-1">
                  Uploaded by {selectedPhoto.uploadedBy.firstName} {selectedPhoto.uploadedBy.lastName}
                </p>
              )}
              <button onClick={() => setSelectedPhoto(null)}
                className="mt-3 text-sm text-gray-500 hover:text-gray-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Upload Photo</h3>
              <button onClick={() => setShowUpload(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={submitPhoto} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input type="url" required value={uploadForm.imageUrl}
                  onChange={(e) => setUploadForm({ ...uploadForm, imageUrl: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hole Number (optional)</label>
                <select value={uploadForm.holeNumber}
                  onChange={(e) => setUploadForm({ ...uploadForm, holeNumber: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">General / Clubhouse</option>
                  {Array.from({ length: 18 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>Hole {i + 1}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caption (optional)</label>
                <input type="text" value={uploadForm.caption}
                  onChange={(e) => setUploadForm({ ...uploadForm, caption: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Beautiful view from the tee..." />
              </div>
              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
                Upload Photo
              </button>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
