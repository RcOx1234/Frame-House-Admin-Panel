import { ClipboardList, Images, Monitor, Settings2, ArrowUpRight, LogOut, SlidersHorizontal } from 'lucide-react';
export type StudioSection = 'registros' | 'galeria' | 'sesiones' | 'configuraciones';
const sections = [
  { id: 'registros', label: 'Registros', detail: 'Cotizaciones y clientes', icon: ClipboardList },
  { id: 'galeria', label: 'Galería', detail: 'Tu trabajo, en escena', icon: Images },
  { id: 'sesiones', label: 'Sesiones', detail: 'Dispositivos y accesos', icon: Monitor },
  { id: 'configuraciones', label: 'Configuraciones', detail: 'Preferencias e integraciones', icon: Settings2 },
] as const;
export function StudioNav({ section, role, onNavigate, onLogout, onTools }: { section: StudioSection; role: 'admin' | 'guest'; onNavigate: (s: StudioSection) => void; onLogout: () => void; onTools: () => void }) {
  return <aside className="studio-nav">
    <a href="https://frame-house.vercel.app" target="_blank" rel="noreferrer" className="studio-brand" aria-label="Frame House, abrir sitio web"><img src="/frame-house-logo.png" width="38" height="38" alt=""/><span>FRAME HOUSE<small>ADMIN STUDIO</small></span></a>
    <div className="studio-nav-caption">ESPACIO DE TRABAJO</div>
    <nav aria-label="Navegación principal">{sections.filter(s => role === 'admin' || s.id !== 'configuraciones').map(({ id, label, detail, icon: Icon }) => <button key={id} type="button" aria-current={section === id ? 'page' : undefined} onClick={() => onNavigate(id)}><Icon size={19} strokeWidth={1.6}/><span>{label}<small>{detail}</small></span><span className="nav-dot"/></button>)}</nav>
    <div className="studio-nav-bottom"><a href="https://frame-house.vercel.app" target="_blank" rel="noreferrer">Ver sitio web <ArrowUpRight size={16}/></a><button type="button" onClick={onTools}><SlidersHorizontal size={16}/> Herramientas</button><div className="studio-profile"><span className="studio-avatar">{role === 'admin' ? 'A' : 'I'}</span><span>{role === 'admin' ? 'Administrador' : 'Invitado'}<small>{role === 'admin' ? 'Control total' : 'Solo lectura'}</small></span><button type="button" onClick={onLogout} aria-label="Salir"><LogOut size={17}/></button></div></div>
  </aside>;
}
