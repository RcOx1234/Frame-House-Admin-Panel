import {createRoot} from 'react-dom/client';
import {ThemeProvider} from '../src/context/ThemeContext';
import {AdminPanel} from '../src/pages/AdminPanel';
import {LoginCard} from '../src/components/LoginCard';
import '../src/index.css';
const qs = new URLSearchParams(location.search);
localStorage.setItem('fh_theme', qs.get('theme') || 'dark');
createRoot(document.getElementById('root')!).render(<ThemeProvider>{qs.has('login') ? <div className="panel-shell studio-login-shell"><LoginCard onSuccess={()=>{}}/></div> : <AdminPanel role={qs.has('guest') ? 'guest' : 'admin'} onLogout={()=>{}} sessionContext={{uid:'fixture',deviceId:'fixture',sessionId:'fixture'}}/>}</ThemeProvider>);
