import { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { Search, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

export default function CourseSearch({ onSelect, selectedCourse }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [courseDetail, setCourseDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showTees, setShowTees] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (value) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setResults([]); setShowResults(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get(`/courses/search?q=${encodeURIComponent(value)}`);
        setResults(data.courses || []);
        setShowResults(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
  };

  const selectCourse = async (course) => {
    setShowResults(false);
    setQuery(`${course.clubName} — ${course.courseName}`);
    setLoadingDetail(true);
    try {
      const detail = await api.get(`/courses/${course.courseId}`);
      setCourseDetail(detail);
      if (onSelect) {
        onSelect({
          courseApiId: course.courseId,
          courseName: detail.courseName,
          clubName: detail.clubName,
          address: detail.location?.address || '',
          city: detail.location?.city || '',
          county: detail.location?.state || '',
          country: detail.location?.country || '',
          latitude: detail.location?.lat,
          longitude: detail.location?.lng,
          tees: detail.tees || [],
          provider: detail.provider,
        });
      }
    } catch (err) {
      console.error('Failed to load course detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const input = 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none';

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">Search Course Database</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search by club or course name..."
          className={`${input} pl-10`}
        />
        {loading && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />}
      </div>

      {/* Search results dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((course) => (
            <button
              key={`${course.courseId}-${course.courseName}`}
              type="button"
              onClick={() => selectCourse(course)}
              className="w-full text-left px-4 py-3 hover:bg-green-50 border-b last:border-0 transition"
            >
              <p className="font-medium text-gray-900 text-sm">{course.clubName}</p>
              <p className="text-xs text-gray-500">{course.courseName}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {[course.city, course.state, course.country].filter(Boolean).join(', ')}
              </p>
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
          No courses found for "{query}"
        </div>
      )}

      {/* Course detail card */}
      {loadingDetail && (
        <div className="mt-3 bg-gray-50 rounded-lg p-4 text-sm text-gray-500 animate-pulse">Loading course data...</div>
      )}

      {courseDetail && !loadingDetail && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-green-900">{courseDetail.clubName}</p>
              <p className="text-sm text-green-700">{courseDetail.courseName}</p>
              {courseDetail.location && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {[courseDetail.location.address, courseDetail.location.city, courseDetail.location.country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
              {courseDetail.provider === 'englandgolf' ? 'England Golf' : 'GolfCourseAPI'}
            </span>
          </div>

          {/* Tees summary */}
          {courseDetail.tees?.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowTees(!showTees)}
                className="text-xs font-medium text-green-800 flex items-center gap-1 hover:underline"
              >
                {showTees ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {courseDetail.tees.length} tee{courseDetail.tees.length !== 1 ? 's' : ''} available
              </button>
              {showTees && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-green-700 border-b border-green-200">
                        <th className="pb-1 pr-3">Tee</th>
                        <th className="pb-1 pr-3">Gender</th>
                        <th className="pb-1 pr-3">Slope</th>
                        <th className="pb-1 pr-3">CR</th>
                        <th className="pb-1 pr-3">Par</th>
                        <th className="pb-1">Yards</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseDetail.tees.map((tee, i) => (
                        <tr key={i} className="border-b border-green-100 last:border-0">
                          <td className="py-1 pr-3 font-medium">{tee.teeName}</td>
                          <td className="py-1 pr-3 capitalize">{tee.gender}</td>
                          <td className="py-1 pr-3">{tee.slopeRating}</td>
                          <td className="py-1 pr-3">{tee.courseRating}</td>
                          <td className="py-1 pr-3">{tee.par}</td>
                          <td className="py-1">{tee.totalYards?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
