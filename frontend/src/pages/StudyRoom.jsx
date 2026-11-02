import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorX, MessageSquare, X, Send, Users, Settings, MoreHorizontal, Download, Trash2, PenTool, Eraser, Undo2, Redo2, Loader2, AlertTriangle, Check, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';

const COLORS = ['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
const STROKE_WIDTHS = [2, 4, 6, 8, 12];

export default function StudyRoom() {
  const { sessionId } = useParams();
  const socket = useSocket();
  const navigate = useNavigate();
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [screenStream, setScreenStream] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [tool, setTool] = useState('pen');
  const [canvasRef, setCanvasRef] = useState(null);
  const [whiteboardRef, setWhiteboardRef] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [drawHistory, setDrawHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [joined, setJoined] = useState(false);
  const [connectionState, setConnectionState] = useState('connecting');
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const peerConnections = useRef({});
  const usernameRef = useRef('');

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      usernameRef.current = payload.id;
    }
  }, []);

  useEffect(() => {
    if (!socket || !sessionId) return;

    socket.emit('join-session', sessionId);
    setJoined(true);

    socket.on('user-joined', ({ userId }) => {
      setParticipants(prev => [...prev.filter(p => p !== userId), userId]);
      createPeerConnection(userId, true);
    });

    socket.on('user-left', ({ userId }) => {
      setParticipants(prev => prev.filter(p => p !== userId));
      if (peerConnections.current[userId]) {
        peerConnections.current[userId].close();
        delete peerConnections.current[userId];
      }
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });

    socket.on('webrtc-offer', async ({ from, offer }) => {
      await createPeerConnection(from, false);
      const pc = peerConnections.current[from];
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { sessionId, to: from, answer });
    });

    socket.on('webrtc-answer', async ({ from, answer }) => {
      const pc = peerConnections.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('webrtc-ice-candidate', async ({ from, candidate }) => {
      const pc = peerConnections.current[from];
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('ICE candidate error:', e);
        }
      }
    });

    socket.on('chat-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('whiteboard-draw', (data) => {
      if (data.userId !== usernameRef.current && ctx) {
        drawOnCanvas(ctx, data);
      }
    });

    socket.on('whiteboard-clear', () => {
      if (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        setDrawHistory([]);
        setHistoryIndex(-1);
      }
    });

    socket.on('screen-share-start', ({ userId }) => {
      console.log('Screen share started by', userId);
    });

    socket.on('screen-share-stop', ({ userId }) => {
      console.log('Screen share stopped by', userId);
    });

    return () => {
      socket.emit('leave-session', sessionId);
      setJoined(false);
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    };
  }, [socket, sessionId]);

  const createPeerConnection = useCallback(async (userId, isInitiator) => {
    if (peerConnections.current[userId]) return;

    const pc = new RTCPeerConnection(iceServers);
    peerConnections.current[userId] = pc;

    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    if (screenStream) {
      screenStream.getTracks().forEach(track => {
        pc.addTrack(track, screenStream);
      });
    }

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.set(userId, stream);
        return next;
      });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', { sessionId, to: userId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
    };

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', { sessionId, to: userId, offer });
    }
  }, [socket, sessionId, localStream, screenStream]);

  useEffect(() => {
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        Object.values(peerConnections.current).forEach(pc => {
          stream.getTracks().forEach(track => {
            const sender = pc.getSenders().find(s => s.track.kind === track.kind);
            if (sender) sender.replaceTrack(track);
            else pc.addTrack(track, stream);
          });
        });
      } catch (err) {
        console.error('Media access error:', err);
        setConnectionState('media-error');
      }
    };
    initMedia();
  }, []);

  useEffect(() => {
    if (canvasRef) {
      const context = canvasRef.getContext('2d');
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = strokeColor;
      context.lineWidth = strokeWidth;
      setCtx(context);
    }
  }, [canvasRef, strokeColor, strokeWidth]);

  const drawOnCanvas = (context, data) => {
    context.strokeStyle = data.color;
    context.lineWidth = data.width;
    context.globalCompositeOperation = data.tool === 'eraser' ? 'destination-out' : 'source-over';

    context.beginPath();
    context.moveTo(data.x0, data.y0);
    context.lineTo(data.x1, data.y1);
    context.stroke();
  };

  const handleCanvasMouseDown = (e) => {
    if (!ctx || tool === 'pan') return;
    const rect = canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
  };

  const handleCanvasMouseMove = (e) => {
    if (!drawing || !ctx || !canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();

    socket.emit('whiteboard-draw', {
      sessionId,
      x0: e.clientX - rect.left,
      y0: e.clientY - rect.top,
      x1: x,
      y1: y,
      color: tool === 'eraser' ? '#ffffff' : strokeColor,
      width: strokeWidth,
      tool,
      userId: usernameRef.current
    });
  };

  const handleCanvasMouseUp = () => {
    if (drawing) {
      setDrawing(false);
      saveHistory();
    }
  };

  const saveHistory = () => {
    if (!canvasRef) return;
    const imageData = canvasRef.toDataURL();
    const newHistory = drawHistory.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setDrawHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0 && ctx && canvasRef) {
      setHistoryIndex(historyIndex - 1);
      const img = new Image();
      img.src = drawHistory[historyIndex - 1];
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
        ctx.drawImage(img, 0, 0);
      };
    }
  };

  const redo = () => {
    if (historyIndex < drawHistory.length - 1 && ctx && canvasRef) {
      setHistoryIndex(historyIndex + 1);
      const img = new Image();
      img.src = drawHistory[historyIndex + 1];
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
        ctx.drawImage(img, 0, 0);
      };
    }
  };

  const clearCanvas = () => {
    if (ctx && canvasRef) {
      ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
      setDrawHistory([]);
      setHistoryIndex(-1);
      socket.emit('whiteboard-clear', { sessionId });
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setAudioEnabled(track.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setVideoEnabled(track.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setScreenSharing(false);
      socket.emit('screen-share-stop', { sessionId });
      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video' && !localStream.getVideoTracks().includes(s.track));
        if (sender && localStream.getVideoTracks()[0]) sender.replaceTrack(localStream.getVideoTracks()[0]);
      });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setScreenStream(stream);
        setScreenSharing(true);
        socket.emit('screen-share-start', { sessionId });

        stream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };

        Object.values(peerConnections.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(stream.getVideoTracks()[0]);
        });
      } catch (err) {
        console.error('Screen share error:', err);
      }
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const message = {
      sessionId,
      text: newMessage,
      senderId: usernameRef.current,
      timestamp: new Date().toISOString()
    };
    socket.emit('chat-message', message);
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const leaveRoom = () => {
    if (confirm('Leave the study room?')) {
      navigate('/sessions');
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={leaveRoom} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white font-semibold">Study Room</h1>
            <p className="text-xs text-gray-400">Session: {sessionId}</p>
          </div>
          <div className={`flex items-center gap-2 px-2 py-1 rounded ${connectionState === 'connected' ? 'bg-green-900/50' : 'bg-yellow-900/50'}`}>
            <span className={`w-2 h-2 rounded-full ${connectionState === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-xs text-gray-300 capitalize">{connectionState}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setChatOpen(!chatOpen)} className={`p-2 rounded-lg transition-colors ${chatOpen ? 'bg-purple-600' : 'bg-gray-700'}`}>
            <MessageSquare className="w-5 h-5 text-white" />
          </button>
          <button onClick={() => setWhiteboardOpen(!whiteboardOpen)} className={`p-2 rounded-lg transition-colors ${whiteboardOpen ? 'bg-purple-600' : 'bg-gray-700'}`}>
            <PenTool className="w-5 h-5 text-white" />
          </button>
          <button onClick={leaveRoom} className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
            <Users className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative">
          {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
            <video
              key={userId}
              ref={el => remoteVideoRefs.current[userId] = el}
              srcObject={stream}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ))}
          {remoteStreams.size === 0 && (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
              <Video className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">Waiting for peer to join...</p>
              <p className="text-sm">Share the session link to invite them</p>
            </div>
          )}
          {localStream && (
            <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <video ref={localVideoRef} srcObject={localStream} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {chatOpen && (
          <aside className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-medium text-white">Chat</h3>
              <button onClick={() => setChatOpen(false)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.senderId === usernameRef.current ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${msg.senderId === usernameRef.current ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-gray-700 text-white rounded-tl-none'}`}>
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-xs opacity-50 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <button onClick={sendMessage} disabled={!newMessage.trim()} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </aside>
        )}

        {whiteboardOpen && (
          <aside className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-medium text-white">Whiteboard</h3>
              <button onClick={() => setWhiteboardOpen(false)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 border-b border-gray-700 flex flex-wrap gap-2">
              <div className="flex items-center gap-1">
                {COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setStrokeColor(color)}
                    className={`w-6 h-6 rounded transition-transform ${strokeColor === color ? 'scale-110 ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 px-2">
                <PenTool className="w-4 h-4 text-gray-400" />
                <select
                  value={strokeWidth}
                  onChange={e => setStrokeWidth(parseInt(e.target.value))}
                  className="bg-gray-700 border border-gray-600 rounded text-white text-xs py-1 px-2 focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  {STROKE_WIDTHS.map(w => <option key={w} value={w}>{w}px</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setTool('pen')} className={`p-2 rounded ${tool === 'pen' ? 'bg-purple-600' : 'bg-gray-700'} hover:bg-gray-600`} title="Pen">
                  <PenTool className="w-4 h-4 text-white" />
                </button>
                <button onClick={() => setTool('eraser')} className={`p-2 rounded ${tool === 'eraser' ? 'bg-purple-600' : 'bg-gray-700'} hover:bg-gray-600`} title="Eraser">
                  <Eraser className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={undo} disabled={historyIndex <= 0} className={`p-2 rounded ${historyIndex <= 0 ? 'opacity-50' : 'bg-gray-700'} hover:bg-gray-600`} title="Undo">
                  <Undo2 className="w-4 h-4 text-white" />
                </button>
                <button onClick={redo} disabled={historyIndex >= drawHistory.length - 1} className={`p-2 rounded ${historyIndex >= drawHistory.length - 1 ? 'opacity-50' : 'bg-gray-700'} hover:bg-gray-600`} title="Redo">
                  <Redo2 className="w-4 h-4 text-white" />
                </button>
                <button onClick={clearCanvas} className="p-2 rounded bg-gray-700 hover:bg-gray-600" title="Clear">
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            <div className="flex-1 relative p-4">
              <canvas
                ref={setCanvasRef}
                className="w-full h-full border border-gray-700 rounded cursor-crosshair bg-white"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
            </div>
          </aside>
        )}

        <footer className="bg-gray-800 border-t border-gray-700 px-4 py-3 flex items-center justify-center gap-4">
          <button onClick={toggleAudio} className={`p-3 rounded-full transition-colors ${audioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
            {audioEnabled ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
          </button>
          <button onClick={toggleVideo} className={`p-3 rounded-full transition-colors ${videoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
            {videoEnabled ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
          </button>
          <button onClick={toggleScreenShare} className={`p-3 rounded-full transition-colors ${screenSharing ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'}`}>
            {screenSharing ? <MonitorX className="w-6 h-6 text-white" /> : <Monitor className="w-6 h-6 text-white" />}
          </button>
          <div className="w-px h-8 bg-gray-700 mx-2" />
          <button onClick={() => setChatOpen(!chatOpen)} className={`p-3 rounded-full transition-colors ${chatOpen ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
            <MessageSquare className="w-6 h-6 text-white" />
          </button>
          <button onClick={() => setWhiteboardOpen(!whiteboardOpen)} className={`p-3 rounded-full transition-colors ${whiteboardOpen ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
            <PenTool className="w-6 h-6 text-white" />
          </button>
        </footer>
      </main>
    </div>
  );
}