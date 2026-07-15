import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * RealtimeStatus — animated pill that shows the Supabase Realtime connection state.
 * States: connecting → live → error
 */
export default function RealtimeStatus() {
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'live' | 'error'

  useEffect(() => {
    // Use a dedicated heartbeat channel to track connection
    const channelName = `__realtime_status__${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') {
          setStatus('live');
        } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
          setStatus('error');
        } else {
          setStatus('connecting');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const config = {
    live: {
      label: 'LIVE',
      dot:   '#4caf50',
      text:  '#4caf50',
      bg:    'rgba(76,175,80,0.10)',
      border:'rgba(76,175,80,0.25)',
      pulse: true,
    },
    connecting: {
      label: 'Connecting…',
      dot:   '#ff9800',
      text:  '#ff9800',
      bg:    'rgba(255,152,0,0.08)',
      border:'rgba(255,152,0,0.20)',
      pulse: false,
    },
    error: {
      label: 'Offline',
      dot:   '#ef5350',
      text:  '#ef5350',
      bg:    'rgba(239,83,80,0.08)',
      border:'rgba(239,83,80,0.20)',
      pulse: false,
    },
  }[status];

  return (
    <div
      title={`Supabase Realtime: ${status}`}
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         6,
        padding:     '3px 10px',
        borderRadius: 20,
        background:  config.bg,
        border:      `1px solid ${config.border}`,
        fontSize:    11,
        fontWeight:  700,
        letterSpacing: 0.5,
        color:       config.text,
        userSelect:  'none',
        transition:  'all 0.3s ease',
      }}
    >
      {/* Animated dot */}
      <span
        style={{
          width:        7,
          height:       7,
          borderRadius: '50%',
          background:   config.dot,
          flexShrink:   0,
          animation:    config.pulse ? 'pulse-dot 2s infinite' : 'none',
          display:      'inline-block',
        }}
      />
      {config.label}
    </div>
  );
}
