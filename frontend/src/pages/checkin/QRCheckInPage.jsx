import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { QrCode, CheckCircle2, MapPin, Clock, Users, Loader2, Camera, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';

export default function QRCheckInPage() {
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const [match, setMatch] = useState(null);
  const [checkInStatus, setCheckInStatus] = useState(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState(null);
  const [scanMode, setScanMode] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [matchRes, statusRes] = await Promise.all([
          api.get(`/live-match/${matchId}/live`),
          api.get(`/checkin/${matchId}/status`),
        ]);
        setMatch(matchRes);
        setCheckInStatus(statusRes);

        // Check if auto-checkin via QR scan (token in URL)
        if (searchParams.get('autoCheckin') === 'true') {
          handleCheckIn();
        }
      } catch (err) {
        setError('Failed to load match details');
      }
      setLoading(false);
    };
    load();
  }, [matchId]);

  const handleCheckIn = async () => {
    setChecking(true);
    setError(null);
    try {
      let lat, lon;
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch {}

      const res = await api.post(`/checkin/${matchId}/checkin`, {
        latitude: lat || null,
        longitude: lon || null,
      });
      setCheckedIn(true);
      setCheckInStatus(prev => ({
        ...prev,
        bothCheckedIn: res.bothCheckedIn,
        checkIns: [...(prev?.checkIns || []), res.checkIn],
      }));
    } catch (err) {
      setError(err.message || 'Check-in failed');
    }
    setChecking(false);
  };

  const generateQR = async () => {
    try {
      const res = await api.get(`/checkin/${matchId}/qr`);
      setQrData(res.qrData);
      setShowQR(true);
    } catch {
      setError('Failed to generate QR code');
    }
  };

  const startScanner = async () => {
    setScanMode(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setError('Camera access denied. Please allow camera access to scan QR codes.');
      setScanMode(false);
    }
  };

  const stopScanner = () => {
    setScanMode(false);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <QrCode className="w-8 h-8 text-green-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Match Check-In</h1>
        <p className="text-sm text-gray-500 mt-1">Confirm your arrival at the club</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Match info card */}
      {match && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="text-center mb-3">
            <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
              {match.tournament?.name}
            </span>
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                <span className="text-sm font-bold text-blue-700">{match.playerA?.firstName?.[0]}{match.playerA?.lastName?.[0]}</span>
              </div>
              <p className="text-xs font-medium text-gray-800 mt-1">{match.playerA?.firstName} {match.playerA?.lastName}</p>
            </div>
            <span className="text-lg font-bold text-gray-400">vs</span>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <span className="text-sm font-bold text-red-700">{match.playerB?.firstName?.[0]}{match.playerB?.lastName?.[0]}</span>
              </div>
              <p className="text-xs font-medium text-gray-800 mt-1">{match.playerB?.firstName} {match.playerB?.lastName}</p>
            </div>
          </div>
          {match.venue && (
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mt-3">
              <MapPin className="w-3 h-3" /> {match.venue.name}
            </div>
          )}
          {match.match?.scheduledDate && (
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mt-1">
              <Clock className="w-3 h-3" /> {new Date(match.match.scheduledDate).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      )}

      {/* Check-in status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> Check-In Status
        </h3>
        <div className="space-y-2">
          {[match?.playerA, match?.playerB].filter(Boolean).map(p => {
            const isCheckedIn = checkInStatus?.checkIns?.some(c => c.player?.id === p.id);
            return (
              <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                <span className="text-sm text-gray-800">{p.firstName} {p.lastName}</span>
                {isCheckedIn ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                    <CheckCircle2 className="w-4 h-4" /> Checked in
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Awaiting</span>
                )}
              </div>
            );
          })}
        </div>

        {checkInStatus?.bothCheckedIn && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-sm font-semibold text-green-800">Both players checked in!</p>
            <p className="text-xs text-green-600 mt-0.5">Match is ready to begin</p>
            <Link to={`/match/${matchId}/live`} className="inline-block mt-2 text-xs font-medium text-green-700 hover:text-green-800">
              Go to Live Match →
            </Link>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!checkedIn && !checkInStatus?.bothCheckedIn && (
        <div className="space-y-3">
          <button onClick={handleCheckIn} disabled={checking}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
            {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {checking ? 'Checking in...' : 'Check In Now'}
          </button>

          <div className="flex gap-3">
            <button onClick={generateQR} className="flex-1 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-medium rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
              <QrCode className="w-4 h-4" /> Show My QR
            </button>
            <button onClick={scanMode ? stopScanner : startScanner} className="flex-1 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-medium rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
              <Camera className="w-4 h-4" /> {scanMode ? 'Stop Scan' : 'Scan QR'}
            </button>
          </div>
        </div>
      )}

      {checkedIn && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
          <p className="font-semibold text-green-800">You're checked in!</p>
          <p className="text-xs text-green-600 mt-1">Waiting for your opponent to arrive</p>
        </div>
      )}

      {/* QR Code display */}
      {showQR && qrData && (
        <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <h3 className="font-semibold text-gray-900 mb-3">Your Check-In QR Code</h3>
          <div className="bg-gray-100 rounded-lg p-8 inline-block">
            <QrCode className="w-32 h-32 text-gray-800 mx-auto" />
            <p className="text-xs text-gray-500 mt-2">Show to opponent or club staff</p>
          </div>
          <button onClick={() => setShowQR(false)} className="mt-3 text-sm text-gray-500 hover:text-gray-700">Close</button>
        </div>
      )}

      {/* Camera scanner */}
      {scanMode && (
        <div className="mt-4 bg-black rounded-xl overflow-hidden">
          <video ref={videoRef} className="w-full" playsInline />
          <div className="bg-gray-900 px-4 py-2 text-center">
            <p className="text-xs text-gray-400">Point camera at opponent's QR code</p>
          </div>
        </div>
      )}
    </div>
  );
}
