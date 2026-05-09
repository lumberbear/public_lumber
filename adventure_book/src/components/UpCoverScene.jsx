export default function UpCoverScene() {
  const bC = ["#FF2222","#FF5500","#FF9900","#FFDD00","#AAEE00","#22CC55","#00DDFF","#2255FF","#7722FF","#EE22FF","#FF2299","#FF7744","#FFEE44","#44FF99","#44AAFF","#AA44FF","#FF44AA","#FF6600"];
  const balls = [];
  for (let i = 0; i < 115; i++) {
    const a = (i * 137.508 * Math.PI) / 180;
    const r = Math.sqrt(i / 115) * 118;
    balls.push({ x: 160 + r * Math.cos(a), y: 115 + r * Math.sin(a) * 0.78, c: bC[i % bC.length] });
  }
  const lines = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 1.05 - 0.52;
    return (
      <line
        key={i}
        x1="160" y1="345"
        x2={160 + Math.cos(a) * 115}
        y2={115 + Math.sin(a) * 90}
        stroke="#ccc" strokeWidth="0.7" opacity="0.4"
      />
    );
  });
  return (
    <svg width="320" height="420" viewBox="0 0 320 420" xmlns="http://www.w3.org/2000/svg">
      {lines}
      {balls.map((b, i) => (
        <g key={i}>
          <ellipse cx={b.x} cy={b.y} rx={10.5} ry={12.5} fill={b.c} opacity="0.94" />
          <ellipse cx={b.x - 3.2} cy={b.y - 4} rx={2.8} ry={2} fill="white" opacity="0.42" />
        </g>
      ))}
      <g transform="translate(110,308)">
        <rect x="0" y="22" width="100" height="62" fill="#c9a84c" />
        <rect x="10" y="22" width="5" height="62" fill="#b8943c" opacity="0.4" />
        <polygon points="50,0 -14,28 114,28" fill="#3e2208" />
        <polygon points="50,2 -11,28 111,28" fill="#4e2a0a" />
        <rect x="66" y="-16" width="13" height="22" fill="#6b3810" />
        <rect x="64" y="-18" width="17" height="5" fill="#4e2808" />
        <rect x="34" y="46" width="32" height="38" fill="#7a4a20" rx="2" />
        <circle cx="50" cy="55" r="3" fill="#c8a050" />
        <rect x="5" y="30" width="24" height="17" fill="#a8d8f0" rx="1" />
        <line x1="17" y1="30" x2="17" y2="47" stroke="#78b8d8" strokeWidth="1.2" />
        <line x1="5" y1="38" x2="29" y2="38" stroke="#78b8d8" strokeWidth="1.2" />
        <rect x="71" y="30" width="24" height="17" fill="#a8d8f0" rx="1" />
        <line x1="83" y1="30" x2="83" y2="47" stroke="#78b8d8" strokeWidth="1.2" />
        <line x1="71" y1="38" x2="95" y2="38" stroke="#78b8d8" strokeWidth="1.2" />
        <rect x="-4" y="81" width="108" height="6" fill="#b08830" rx="1" />
      </g>
    </svg>
  );
}
