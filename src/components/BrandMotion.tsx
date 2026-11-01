import { useEffect, useState } from 'react';
import { Player } from '@remotion/player';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
export function FrameScene({ still = false }: { still?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = still ? 0 : frame / fps;
  return <AbsoluteFill style={{ overflow: 'hidden', background: '#100909' }}>
    <svg viewBox="0 0 640 640" width="100%" height="100%" fill="none" aria-hidden="true">
      <defs><radialGradient id="glow"><stop stopColor="#D61E2B" stopOpacity=".45"/><stop offset="1" stopColor="#100909" stopOpacity="0"/></radialGradient><linearGradient id="edge" x2="1" y2="1"><stop stopColor="#F7F4EF"/><stop offset=".5" stopColor="#D61E2B"/><stop offset="1" stopColor="#60151B"/></linearGradient></defs>
      <circle cx="330" cy="325" r="310" fill="url(#glow)"/>
      <g stroke="#F7F4EF" strokeOpacity=".05">{Array.from({ length: 13 }, (_, i) => <g key={i}><path d={`M${i * 56} 0V640`}/><path d={`M0 ${i * 56}H640`}/></g>)}</g>
      {[0,1,2,3].map(i => <g key={i} style={{ transformOrigin: '320px 320px', rotate: `${-22 + i * 12 + Math.sin(t * Math.PI / 6) * 5}deg`, translate: `0 ${Math.sin(t * Math.PI / 6 + i * .5) * 10}px` }}><rect x={130 + i * 27} y={130 + i * 27} width={380 - i * 54} height={380 - i * 54} rx="8" stroke="url(#edge)" strokeWidth={i === 3 ? 3 : 1.2} opacity={.25 + i * .23}/></g>)}
      <path d="M288 292h66m-66 0v63m0-30h47" stroke="#F7F4EF" strokeWidth="13"/>
      <path d="M93 107v-18h18m418 0h18v18M93 533v18h18m418 0h18v-18" stroke="#D61E2B" strokeWidth="2"/>
      <circle cx="495" cy="153" r="5" fill="#D61E2B"/>
      <text x="88" y="590" fill="#B7B0A7" fontSize="10" letterSpacing="3" fontFamily="monospace">IDEA / FRAME / CREATE</text>
    </svg>
  </AbsoluteFill>;
}
export default function BrandMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    const visibility = () => setVisible(!document.hidden);
    media.addEventListener('change', update); document.addEventListener('visibilitychange', visibility);
    return () => { media.removeEventListener('change', update); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  return <Player key={`${reduced}-${visible}`} component={FrameScene} inputProps={{ still: reduced }} durationInFrames={360} compositionWidth={640} compositionHeight={640} fps={30} autoPlay={!reduced && visible} loop controls={false} clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} style={{ width: '100%', aspectRatio: '1' }} aria-label="Composición animada Frame House"/>;
}
