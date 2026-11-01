import { test, expect } from '@playwright/test';

// Isolated fixture server only: these tests never authenticate to or mutate Firebase.
test('desktop: search, navigation, gallery editor and settings keep their content', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/tests/ui.html');
  await expect(page.getByRole('heading',{name:'Registros.',exact:true})).toBeVisible();
  await expect(page.getByText('Estudio de prueba',{exact:true})).toBeVisible();
  await page.getByRole('searchbox').fill('sin-coincidencias');
  await expect(page.getByText('Estudio de prueba',{exact:true})).toHaveCount(0);
  await page.getByRole('searchbox').fill('');
  await page.screenshot({path:'/tmp/fh-dashboard-desktop.png',fullPage:true});
  await page.getByRole('navigation').getByRole('button',{name:/Galería/}).click();
  await expect(page.getByRole('heading',{name:'Proyecto de prueba',exact:true})).toBeVisible();
  await page.screenshot({path:'/tmp/fh-gallery-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Nuevo proyecto',exact:true}).click();
  const dialog = page.getByRole('dialog',{name:'Nuevo proyecto'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Título',{exact:true})).toBeVisible();
  await dialog.getByLabel('Título',{exact:true}).fill('Proyecto borrador QA');
  await dialog.getByLabel('Cliente',{exact:true}).fill('Cliente QA');
  await page.screenshot({path:'/tmp/fh-editor-desktop.png',fullPage:true});
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.getByRole('navigation').getByRole('button',{name:/Sesiones/}).click();
  await expect(page.getByText('Equipo de prueba',{exact:true}).first()).toBeVisible();
  await page.screenshot({path:'/tmp/fh-sessions-desktop.png',fullPage:true});
  await page.getByRole('navigation').getByRole('button',{name:/Configuraciones/}).click();
  await expect(page.getByRole('heading',{name:'Configuraciones del panel'})).toBeVisible();
  await page.getByRole('button',{name:'Claro',exact:true}).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.screenshot({path:'/tmp/fh-settings-light.png',fullPage:true});
  expect(errors).toEqual([]);
});

for (const width of [390,430,768]) {
  test(`responsive ${width}px: navigation, editor and layout fit`, async ({page})=>{
    await page.setViewportSize({width,height:932});
    await page.goto('/tests/ui.html');
    await expect(page.getByRole('heading',{name:'Registros.',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.getByRole('navigation').getByRole('button',{name:/Galería/}).click();
    await page.getByRole('button',{name:'Nuevo proyecto',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Nuevo proyecto'})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({path:`/tmp/fh-editor-${width}.png`,fullPage:true});
    await page.getByRole('dialog').getByRole('button',{name:'Cerrar',exact:true}).click();
    await page.screenshot({path:`/tmp/fh-gallery-${width}.png`,fullPage:true});
  });
}
test('login: role selection, password visibility and reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:1440,height:960});
  await page.goto('/tests/ui.html?login');
  await expect(page.getByRole('heading',{name:'Frame House Admin Panel'})).toBeVisible();
  await page.getByLabel('Soy Administrador').check();
  await expect(page.getByText('admin@framehouse.com',{exact:true})).toBeVisible();
  await page.getByLabel('Contraseña',{exact:true}).fill('example');
  await page.getByRole('button',{name:'Mostrar contraseña'}).click();
  await expect(page.getByLabel('Contraseña',{exact:true})).toHaveAttribute('type','text');
  await expect(page.locator('.login-art-scene svg')).toBeVisible();
  await page.screenshot({path:'/tmp/fh-login-desktop.png',fullPage:true});
  await page.setViewportSize({width:430,height:932});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({path:'/tmp/fh-login-mobile.png',fullPage:true});
});

test('guest: read-only controls stay read-only',async({page})=>{
  await page.goto('/tests/ui.html?guest');
  await expect(page.getByRole('navigation').getByRole('button',{name:/Configuraciones/})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Eliminar',exact:true})).toHaveCount(0);
  await page.getByRole('navigation').getByRole('button',{name:/Galería/}).click();
  await expect(page.getByRole('button',{name:'Nuevo proyecto',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Editar',exact:true})).toHaveCount(0);
});

test('project editor keeps keyboard focus and returns to its trigger',async({page})=>{
  await page.goto('/tests/ui.html');
  await page.getByRole('navigation').getByRole('button',{name:/Galería/}).click();
  const trigger = page.getByRole('button',{name:'Nuevo proyecto',exact:true});
  await trigger.click();
  const dialog = page.getByRole('dialog',{name:'Nuevo proyecto'});
  await expect(dialog).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button',{name:'Guardar',exact:true})).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button',{name:'Cerrar',exact:true})).toBeFocused();
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
  await expect(trigger).toBeFocused();
});

test('ImageKit sends signed v1 fields and handles expired credentials',async({page})=>{
  await page.goto('/tests/ui.html');
  const result = await page.evaluate(async()=>{
    const {uploadToImageKit} = await import('/src/services/mediaUpload.ts');
    const file = new File(['test'],'test.png',{type:'image/png'});
    try { await uploadToImageKit(file,{auth:{publicKey:'public_test',token:'token',signature:'signature',expire:1,urlEndpoint:'https://ik.imagekit.io/test'}}); }
    catch(e) { return (e as Error).message; }
    return '';
  });
  expect(result).toContain('venció');
  await page.route('https://upload.imagekit.io/api/v1/files/upload',async route=>{
    const data = route.request().postDataBuffer()!.toString();
    expect(data).toContain('name="signature"');
    expect(data).toContain('name="publicKey"');
    expect(data).not.toContain('private_');
    await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:'Invalid key'})});
  });
  const error = await page.evaluate(async()=>{
    const {uploadToImageKit} = await import('/src/services/mediaUpload.ts');
    try { await uploadToImageKit(new File(['test'],'test.png'),{auth:{publicKey:'public_test',token:'token',signature:'signature',expire:Math.floor(Date.now()/1000)+300,urlEndpoint:'https://ik.imagekit.io/test'}}); }
    catch(e) { return (e as Error).message; }
    return '';
  });
  expect(error).toContain('Media Read and write');
});

test('Remotion artwork loads and its frame geometry moves',async({page})=>{
  await page.goto('/tests/ui.html?login');
  const art=page.locator('.login-art-scene svg');
  await expect(art).toBeVisible();
  const frame = art.locator('g[style]').first();
  const before = await frame.getAttribute('style');
  await expect.poll(()=>frame.getAttribute('style')).not.toBe(before);
});
