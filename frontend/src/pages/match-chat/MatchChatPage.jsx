import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, Send, ArrowLeft, Calendar, MapPin, Clock, ExternalLink } from 'lucide-react';
import { io } from 'socket.io-client';
import { api } from '../../api/client';

export default function MatchChatPage() {
  const { matchId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [match, setMatch] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const [bookingLinks, setBookingLinks] = useState([]);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [chatRes, matchRes, meRes] = await Promise.all([
          api.get(`/chat/${matchId}/messages`),
          api.get(`/live-match/${matchId}/live`),
          api.get('/players/me').catch(() => null),
        ]);
        setMessages(chatRes);
        setMatch(matchRes);
        if (meRes) setCurrentPlayer(meRes);

        // Load weather for venue
        if (matchRes?.venue?.id) {
          api.get(`/weather/forecast?clubId=${matchRes.venue.id}`).then(setWeather).catch(() => {});
          api.get(`/tee-time/match/${matchId}`).then(r => setBookingLinks(r.bookingLinks || [])).catch(() => {});
        }
      } catch (err) {
        console.error('Failed to load chat:', err);
      }
      setLoading(false);
    };
    loadData();

    // Socket.io for real-time messages
    const baseUrl = window.location.origin.replace(/:\d+$/, ':3001');
    const socket = io(baseUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('match:join', matchId);
    });

    socket.on('chat:message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.emit('match:leave', matchId);
      socket.disconnect();
    };
  }, [matchId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text) return;
    setNewMessage('');
    try {
      await api.post(`/chat/${matchId}/messages`, { content: text });
    } catch {
      setNewMessage(text);
    }
  };

  const getOpponent = () => {
    if (!match || !currentPlayer) return null;
    return match.playerA?.id === currentPlayer.id ? match.playerB : match.playerA;
  };

  const opponent = getOpponent();

  const quickMessages = [
    'What time works for you?',
    'Shall we play in the morning or afternoon?',
    'I can do any day this week',
    'Shall I book the tee time?',
    'See you on the first tee! 🏌️',
    'Good luck! 🤝',
  ];

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading chat...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 to-emerald-900 border-b border-green-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link to="/dashboard" className="text-green-200 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-white text-sm">
              {opponent ? `${opponent.firstName} ${opponent.lastName}` : 'Match Chat'}
            </h2>
            <p className="text-xs text-green-200">
              {match?.tournament?.name}
              {match?.match?.scheduledDate && ` • ${new Date(match.match.scheduledDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`}
            </p>
          </div>
          {match?.venue && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {match.venue.name}
            </div>
          )}
        </div>
      </div>

      {/* Weather & Booking bar */}
      {(weather || bookingLinks.length > 0) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center gap-4 text-xs">
            {weather?.forecast?.[0] && (
              <div className="flex items-center gap-2 text-blue-700">
                <span>{weather.forecast[0].description}</span>
                <span>{weather.forecast[0].tempMax}°C</span>
                {weather.forecast[0].precipitation > 0 && <span>💧{weather.forecast[0].precipitation}mm</span>}
                <span>💨{weather.forecast[0].windSpeed}km/h</span>
              </div>
            )}
            {bookingLinks.length > 0 && (
              <a href={bookingLinks[0].url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-green-700 hover:text-green-800 font-medium ml-auto">
                <Calendar className="w-3 h-3" /> Book Tee Time <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No messages yet</p>
              <p className="text-gray-400 text-xs mt-1">Send a message to arrange your match</p>
            </div>
          )}
          {messages.map(msg => {
            const isMe = currentPlayer && msg.sender?.id === currentPlayer.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isMe ? 'order-2' : ''}`}>
                  {!isMe && (
                    <span className="text-xs text-gray-500 ml-1 mb-0.5 block">{msg.sender?.firstName}</span>
                  )}
                  <div className={`rounded-2xl px-4 py-2 ${isMe ? 'bg-green-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                  <span className={`text-[10px] text-gray-400 mt-0.5 block ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick replies */}
      <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 border-gray-100 px-4 py-2 overflow-x-auto">
        <div className="max-w-2xl mx-auto flex gap-2">
          {quickMessages.map((qm, i) => (
            <button key={i} onClick={() => setNewMessage(qm)}
              className="flex-shrink-0 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full px-3 py-1.5 transition-colors">
              {qm}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..." className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-green-400" />
          <button onClick={sendMessage} disabled={!newMessage.trim()}
            className="w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 text-white flex items-center justify-center transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
