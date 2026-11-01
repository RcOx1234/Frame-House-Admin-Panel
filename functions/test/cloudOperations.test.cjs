const {test} = require('node:test');
const assert = require('node:assert/strict');
const {HttpsError} = require('firebase-functions/v2/https');
const {runCloudOperation,persistPrivateKey} = require('../lib/cloudOperations');

test('a first key creates a secret then adds exactly its UTF-8 value as a version',async()=>{
  const calls=[];
  await persistPrivateKey({createSecret:async x=>calls.push(['create',x]),addSecretVersion:async x=>calls.push(['add',x])},'test-project','IMAGEKIT_PRIVATE_KEY_TEST','private_fake');
  assert.equal(calls[0][1].parent,'projects/test-project');
  assert.equal(calls[1][1].parent,'projects/test-project/secrets/IMAGEKIT_PRIVATE_KEY_TEST');
  assert.equal(calls[1][1].payload.data.toString('utf8'),'private_fake');
});
test('key rotation accepts gRPC ALREADY_EXISTS even without English error text',async()=>{
  let added=0;
  await persistPrivateKey({createSecret:async()=>{throw {code:6}},addSecretVersion:async()=>{added++}},'p','s','private_fake');
  assert.equal(added,1);
});
test('creation permission errors explain exact permission without revealing exception contents',async()=>{
  let added=false;
  await assert.rejects(persistPrivateKey({createSecret:async()=>{throw Object.assign(new Error('private_DO_NOT_EXPOSE'),{code:7})},addSecretVersion:async()=>{added=true}},'p','s','private_fake'),e=>{
    assert.equal(e.code,'failed-precondition');
    assert.match(e.message,/secretmanager.secrets.create/);
    assert.equal(e.details.stage,'create-secret');
    assert.equal(JSON.stringify(e).includes('DO_NOT_EXPOSE'),false);
    return true;
  });
  assert.equal(added,false);
});
test('version permission errors identify versions.add',async()=>{
  await assert.rejects(persistPrivateKey({createSecret:async()=>{},addSecretVersion:async()=>{throw {code:7}}},'p','s','private_fake'),e=>e.details.stage==='add-secret-version' && e.message.includes('secretmanager.versions.add'));
});
test('disabled API is distinguished from missing IAM permissions',async()=>{
  await assert.rejects(runCloudOperation('create-secret',async()=>{throw Object.assign(new Error('Secret Manager API has not been used, SERVICE_DISABLED'),{code:7})}),e=>e.details.reason==='api-disabled');
});
test('missing secret and provider outage are actionable errors',async()=>{
  await assert.rejects(runCloudOperation('read-secret',async()=>{throw {code:5}}),e=>e.details.reason==='resource-missing');
  await assert.rejects(runCloudOperation('read-secret',async()=>{throw {code:14}}),e=>e.code==='unavailable');
});
test('explicit HttpsError is preserved',async()=>{
  const error=new HttpsError('permission-denied','Denied');
  await assert.rejects(runCloudOperation('read-integration',async()=>{throw error}),e=>e===error);
});
