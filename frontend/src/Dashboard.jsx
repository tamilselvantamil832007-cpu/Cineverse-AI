import React, { useEffect, useState } from 'react';
import { Ticket, Users, Building2, Sparkles, Lightbulb, BarChart3, Plus, Flame, Popcorn, Clapperboard, Star, ArrowRight, Play } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
const RANGES = [['7d', '7D'], ['30d', '30D'], ['3m', '3M'], ['1y', '1Y']];
const num = (v) => Number(v || 0).toLocaleString('en-IN');
const inr = (v) => (v >= 1e7 ? '₹' + (v / 1e7).toFixed(1) + 'Cr' : v >= 1e5 ? '₹' + (v / 1e5).toFixed(1) + 'L' : '₹' + num(Math.round(v)));

const curve = (pts) => pts.reduce((d, [x, y], i) => {
  if (!i) return `M${x},${y}`;
  const mx = (pts[i - 1][0] + x) / 2;
  return `${d} C${mx},${pts[i - 1][1]} ${mx},${y} ${x},${y}`;
}, '');

function Spark({ data = [], color }) {
  const W = 150, H = 56, hi = Math.max(...data, 1), lo = Math.min(...data, 0);
  const pts = data.map((v, i) => [(i / Math.max(data.length - 1, 1)) * W, H - 4 - ((v - lo) / (hi - lo || 1)) * (H - 10)]);
  return <svg viewBox={`0 0 ${W} ${H}`} className="db-spark"><path d={curve(pts)} fill="none" stroke={color} strokeWidth="2" /></svg>;
}

function Chart({ labels = [], values = [] }) {
  const [hover, setHover] = useState(null);
  const W = 600, H = 250, L = 44, B = 30, T = 18;
  const top = Math.max(4, Math.ceil(Math.max(...values, 1) / 4) * 4);
  const pts = values.map((v, i) => [L + (i / Math.max(values.length - 1, 1)) * (W - L - 16), T + (1 - v / top) * (H - T - B)]);
  const line = curve(pts), area = pts.length ? `${line} L${pts.at(-1)[0]},${H - B} L${pts[0][0]},${H - B} Z` : '';
  const h = hover !== null ? pts[hover] : null;
  return (
    <div className="db-chart">
      <svg viewBox={`0 0 ${W} ${H}`}>
        <defs><linearGradient id="dbA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f7bff" stopOpacity=".45" /><stop offset="1" stopColor="#2f7bff" stopOpacity="0" /></linearGradient></defs>
        {[0, 1, 2, 3, 4].map((i) => {
          const y = T + (i / 4) * (H - T - B);
          return <g key={i}><line x1={L} x2={W - 8} y1={y} y2={y} stroke="#ffffff12" /><text x={L - 8} y={y + 4} textAnchor="end" className="db-ax">{num(Math.round(top * (1 - i / 4)))}</text></g>;
        })}
        <path d={area} fill="url(#dbA)" /><path d={line} fill="none" stroke="#3b8bff" strokeWidth="3" strokeLinecap="round" />
        {pts.map(([x, y], i) => (
          <g key={i}>
            <text x={x} y={H - 8} textAnchor="middle" className="db-ax">{labels[i]}</text>
            <circle cx={x} cy={y} r={hover === i ? 6 : 4} fill="#3b8bff" stroke="#cfe2ff" strokeWidth="1.5" />
            <rect x={x - 20} y={0} width="40" height={H} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          </g>
        ))}
      </svg>
      {h && <div className="db-tip" style={{ left: `${(h[0] / W) * 100}%`, top: `${(h[1] / H) * 100}%` }}><Sparkles size={12} /> {num(values[hover])} bookings<small>{labels[hover]}</small></div>}
    </div>
  );
}

function Poster({ m }) {
  const [bad, setBad] = useState(false);
  return (
    <div className="db-poster">
      {bad ? <div className="db-poster-fallback"><Clapperboard size={26} /></div> : <img src={m.poster} alt={m.title} onError={() => setBad(true)} />}
      <div className="db-poster-info"><b>{m.title}</b><span><Star size={12} fill="#ffc83d" stroke="#ffc83d" /> {m.score}</span></div>
    </div>
  );
}

export default function Dashboard({ movies, recs, onOpenMovie, go }) {
  const [range, setRange] = useState('7d');
  const [data, setData] = useState(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    fetch(`${API}/admin/dashboard?range=${range}`).then((r) => r.json()).then((d) => { setData(d); setOffline(false); }).catch(() => setOffline(true));
  }, [range]);

  const s = data?.stats || {};
  const cards = [
    ['bookings', 'Total Bookings', Ticket, '#2f9bff', num],
    ['revenue', 'Total Revenue', Ticket, '#b86bff', inr],
    ['users', 'Active Users', Users, '#19d3c5', num],
    ['theatres', 'Total Theatres', Building2, '#ff9a3c', num],
  ];
  const picks = (recs.length ? recs : movies).slice(0, 4).map((r) => movies.find((m) => m.id === (r.movie_id || r.id))).filter(Boolean);
  const crowd = data?.crowd, level = crowd?.level || 'Low';

  return (
    <div className="db">
      <section className="db-banner">
        <div>
          <h1>Welcome to <b>CINEVERSE</b></h1>
          <p>Your Smart Cinema Booking Platform</p>
          <span className="db-pill"><Sparkles size={15} /> Powered by AI</span>
        </div>
        <div className="db-art" aria-hidden="true"><Popcorn size={92} /><Clapperboard size={74} /><i>Movies.<br />Moments.<br />Memories.</i></div>
      </section>

      {offline && <div className="db-off">Backend not reachable — start FastAPI (uvicorn app.main:app --reload) to load live numbers.</div>}

      <section className="db-stats">
        {cards.map(([k, label, Icon, color, f]) => (
          <div className="db-stat" key={k} style={{ '--c': color }}>
            <span className="db-ico"><Icon size={28} /></span>
            <div><small>{label}</small><b>{s[k] ? f(s[k].value) : '—'}</b><em>{s[k] ? `▲ ${s[k].change}%` : ''}</em></div>
            <Spark data={s[k]?.spark} color={color} />
          </div>
        ))}
      </section>

      <div className="db-row">
        <section className="db-card">
          <header><Sparkles className="db-accent" /><div><h3>AI Movie Recommendations</h3><small>Based on your interests</small></div><button onClick={() => go('home')}>View All <ArrowRight size={14} /></button></header>
          <div className="db-posters">{picks.map((m) => <button key={m.id} onClick={() => onOpenMovie(m)}><Poster m={m} /></button>)}</div>
        </section>
        <section className="db-card">
          <header><BarChart3 className="db-accent" /><h3>Booking Analytics</h3>
            <div className="db-tabs">{RANGES.map(([k, l]) => <button key={k} className={range === k ? 'on' : ''} onClick={() => setRange(k)}>{l}</button>)}</div>
          </header>
          <Chart labels={data?.series.labels} values={data?.series.values} />
        </section>
      </div>

      <div className="db-row db-row3">
        <section className="db-card db-mini">
          <Lightbulb size={34} className="db-bulb" />
          <div><h3>Smart Insights</h3><p><Flame size={14} color="#ff7a3c" /> {data?.insight ? `${data.insight.day} shows are ${data.insight.percent}% more crowded!` : 'Insights appear once bookings come in.'}</p></div>
        </section>
        <section className="db-card db-mini">
          <Users size={34} className="db-accent" />
          <div><h3>Crowd Prediction</h3><span className={'db-level ' + level}>{level} Demand</span></div>
          <div className="db-bars">{(crowd?.slots || []).map((x) => <div key={x.time} title={`${x.time} · ${x.percent}%`}><i style={{ height: `${x.percent}%` }} /><small>{x.time.replace(' ', '').toLowerCase()}</small></div>)}</div>
        </section>
        <section className="db-card db-mini db-qa">
          <h3>Quick Actions</h3>
          <div><button onClick={() => go('home')}>Browse Movies <Plus size={14} /></button><button onClick={() => go('admin')}>View Reports <BarChart3 size={14} /></button><button onClick={() => go('admin')}>Manage Shows <Play size={14} /></button></div>
        </section>
      </div>
    </div>
  );
}
