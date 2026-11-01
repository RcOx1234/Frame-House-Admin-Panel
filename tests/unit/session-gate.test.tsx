// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
const mocks=vi.hoisted(()=>({getSession:vi.fn(),restore:vi.fn(),signOut:vi.fn(),user:{uid:'test-user',email:'admin@framehouse.com'}}));
vi.mock('firebase/auth',()=>({onAuthStateChanged:(_auth:unknown,cb:(user:unknown)=>void)=>{cb(mocks.user);return()=>{}},signOut:mocks.signOut}));
vi.mock('firebase/firestore',()=>({doc:()=>({}),onSnapshot:()=>()=>{}}));
vi.mock('../../src/firebase',()=>({getAuthClient:()=>({}),getDb:()=>({})}));
vi.mock('../../src/services/sessions',()=>({getSessionById:mocks.getSession,upsertSessionOnAuthRestore:mocks.restore,sessionIdFor:()=> 'sid',acknowledgeRemoteLogout:vi.fn(),markSessionInactive:vi.fn(),touchSession:vi.fn()}));
vi.mock('../../src/services/settingsFirestore',()=>({subscribeGeneralSettings:()=>()=>{}}));
vi.mock('../../src/context/ThemeContext',()=>({useTheme:()=>({setTheme:vi.fn()})}));
vi.mock('../../src/components/LoginCard',()=>({LoginCard:()=> <div>Login</div>}));
import App from '../../src/App';
beforeEach(()=>{localStorage.clear();vi.clearAllMocks();mocks.getSession.mockResolvedValue(null);mocks.restore.mockResolvedValue('sid');mocks.signOut.mockResolvedValue(undefined)});
afterEach(cleanup);
it('does not render protected content before the session write is acknowledged',async()=>{
  let release!:()=>void;mocks.restore.mockImplementation(()=>new Promise<void>(r=>{release=r}));render(<App/>);
  await waitFor(()=>expect(mocks.restore).toHaveBeenCalled());expect(screen.queryByRole('heading',{level:2,name:/Registros/})).toBeNull();
  release();await screen.findByRole('heading',{level:2,name:/Registros/});
});
it('a leftover persistent login flag does not stall a restored session',async()=>{
  localStorage.setItem('fh_login_flow','1');render(<App/>);await screen.findByRole('heading',{level:2,name:/Registros/});
});
it.each([{blocked:true},{forceLogout:true}])('does not admit a blocked/remote-logout session: %j',async flags=>{
  mocks.getSession.mockResolvedValue(flags);render(<App/>);await waitFor(()=>expect(mocks.signOut).toHaveBeenCalled());expect(screen.queryByRole('heading',{level:2,name:/Registros/})).toBeNull();expect(mocks.restore).not.toHaveBeenCalled();
});
it('handles a verification failure and retries without bypassing the session gate',async()=>{
  mocks.getSession.mockRejectedValueOnce(new Error('offline'));render(<App/>);
  await screen.findByRole('alert');expect(screen.queryByRole('heading',{level:2,name:/Registros/})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Reintentar'}));await screen.findByRole('heading',{level:2,name:/Registros/});
});

it('a very slow verification offers retry without admitting protected content',async()=>{
  vi.useFakeTimers();
  try {
    mocks.getSession.mockImplementation(()=>new Promise(()=>{}));render(<App/>);
    await act(async()=>{await vi.advanceTimersByTimeAsync(12_000)});
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('heading',{level:2,name:/Registros/})).toBeNull();expect(mocks.restore).not.toHaveBeenCalled();
  } finally { vi.useRealTimers(); }
});
it('an expired session still signs out rather than opening the workspace',async()=>{
  localStorage.setItem('fh_last_active_at',String(Date.now()-11*60_000));render(<App/>);
  await waitFor(()=>expect(mocks.signOut).toHaveBeenCalled());expect(mocks.restore).not.toHaveBeenCalled();
  expect(screen.queryByRole('heading',{level:2,name:/Registros/})).toBeNull();
});
