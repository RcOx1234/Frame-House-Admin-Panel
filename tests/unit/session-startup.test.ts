import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks=vi.hoisted(()=>({getDoc:vi.fn(),setDoc:vi.fn(),updateDoc:vi.fn(),getAuthClient:vi.fn()}));
vi.mock('firebase/firestore',()=>({collection:vi.fn(),deleteDoc:vi.fn(),doc:vi.fn(()=>({})),getDoc:mocks.getDoc,getDocs:vi.fn(),limit:vi.fn(),orderBy:vi.fn(),query:vi.fn(),serverTimestamp:()=> 'server-timestamp',setDoc:mocks.setDoc,updateDoc:mocks.updateDoc}));
vi.mock('../../src/firebase',()=>({getDb:()=>({}),getAuthClient:mocks.getAuthClient}));
const input={uid:'test-user',email:'admin@framehouse.com',role:'admin' as const,deviceId:'device'};
beforeEach(()=>{
  vi.resetModules();vi.clearAllMocks();
  vi.stubGlobal('window',{setTimeout,clearTimeout});vi.stubGlobal('navigator',{userAgent:'Mozilla/5.0 Chrome Windows NT'});
  mocks.getDoc.mockResolvedValue({exists:()=>true});mocks.setDoc.mockResolvedValue(undefined);mocks.updateDoc.mockResolvedValue(undefined);mocks.getAuthClient.mockReturnValue({currentUser:{uid:'test-user'}});
});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()});
describe('nonblocking session metadata',()=>{
  it('restores essential session immediately even when location never returns',async()=>{
    const fetch=vi.fn(()=>new Promise(()=>{}));vi.stubGlobal('fetch',fetch);vi.useFakeTimers();
    const {upsertSessionOnAuthRestore}=await import('../../src/services/sessions');
    await expect(upsertSessionOnAuthRestore(input)).resolves.toBe('test-user_device');
    expect(mocks.setDoc).toHaveBeenCalledOnce();expect(mocks.setDoc.mock.calls[0][1]).not.toHaveProperty('country');
    expect(mocks.setDoc.mock.calls[0][1]).not.toHaveProperty('blocked');expect(mocks.setDoc.mock.calls[0][1]).not.toHaveProperty('forceLogout');
  });
  it('login still clears remote logout, while location is outside the write',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false}));
    const {upsertSessionOnLogin}=await import('../../src/services/sessions');await upsertSessionOnLogin(input);
    expect(mocks.setDoc.mock.calls[0][1]).toMatchObject({forceLogout:false,isActive:true});
    expect(mocks.setDoc.mock.calls[0][1]).not.toHaveProperty('blocked');
  });
  it('updates only location metadata, with a single lookup reused on subsequent restore',async()=>{
    const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({country_name:'Ecuador',city:'Manta'})});vi.stubGlobal('fetch',fetch);
    const {upsertSessionOnAuthRestore}=await import('../../src/services/sessions');await upsertSessionOnAuthRestore(input);
    await vi.waitFor(()=>expect(mocks.updateDoc).toHaveBeenCalledWith(expect.anything(),{country:'Ecuador',city:'Manta'}));
    await upsertSessionOnAuthRestore(input);expect(fetch).toHaveBeenCalledOnce();
  });
  it('does not enrich metadata after sign-out or overwrite a known location on lookup failure',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({country_name:'Ecuador',city:'Manta'})}));mocks.getAuthClient.mockReturnValue({currentUser:null});
    const {upsertSessionOnAuthRestore}=await import('../../src/services/sessions');await upsertSessionOnAuthRestore(input);await new Promise(resolve=>setTimeout(resolve,0));expect(mocks.updateDoc).not.toHaveBeenCalled();
  });
});
describe('tab-local login synchronization',()=>{
  it('ignores a legacy abandoned persistent flag',async()=>{
    vi.stubGlobal('localStorage',{getItem:()=> '1'});
    const {waitForLoginFlow}=await import('../../src/utils/loginFlow');await waitForLoginFlow();
  });
  it('waits for a real current-tab login then releases restore immediately',async()=>{
    const {beginLoginFlow,waitForLoginFlow}=await import('../../src/utils/loginFlow');const finish=beginLoginFlow();let done=false;const wait=waitForLoginFlow().then(()=>{done=true});
    await Promise.resolve();expect(done).toBe(false);finish();await wait;expect(done).toBe(true);await waitForLoginFlow();
  });
});
