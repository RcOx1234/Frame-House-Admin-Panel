# Frame House Admin Studio — audit

Branch: `redesign/frame-house-studio`. Base: `b4d0b5e`.

## Scope and behavior

- New permanent desktop navigation and safe-area mobile navigation for the existing sections.
- New split login with lazy Remotion artwork, reduced-motion support, and background-tab pause.
- Frame House brand tokens across the entire panel, including light/dark themes, tables, gallery, forms, dialogs, sessions, settings and access-status screens.
- Project editor grouped into information, media and publication; original values and validators retained. Visible field labels and dialog keyboard focus management added.
- Gallery search, categories, cards, empty/error state and retry. Guest gallery does not request admin-only settings.
- Existing session/security logic, Firebase schemas, Firestore rules, CRUD handlers, field names and export formats preserved. No production data edited.

## ImageKit findings

Official documentation: https://imagekit.io/docs/api-keys and https://imagekit.io/docs/integration/javascript.

The current browser SDK still uses Upload V1, with a server-generated HMAC-SHA1 signature of token + expire. There is no evidence that V1 was retired. Rotated/expired keys, mismatched key pairs, provider quotas and restricted-key permissions remain possible causes. No live account credentials were accessed or replaced.

The old test only generated a local signature and could falsely imply a valid provider connection. The new `verifyImageKitIntegration` admin-only callable checks the private credential with a read-only ImageKit list request, uses a 10-second timeout, and gives actionable permission/authentication/rate-limit errors. It does not upload, delete, return media data, or expose a private key. A successful read does not prove upload permission or public/private pair matching; the UI makes this limit explicit.

Private-key saves now reject a public key or embedded whitespace. Uploads validate auth shape and expiry and explain provider 401/403/429 errors.

### Backend deployment requirement

Vercel deploys the frontend only. Before using the new provider test, deploy the reviewed Firebase callables from this branch in the existing Firebase project:

```
npm ci --prefix functions
npm run build --prefix functions
firebase deploy --only functions:verifyImageKitIntegration,functions:setImageKitPrivateKey --project <existing-project-id>
```

This was not executed: the connected tools provide Vercel/GitHub access, but no authenticated Firebase deployment session. No production Firebase functions, secrets, IAM or security rules changed. Existing V1 uploads keep the existing signing endpoint.

## Validation

- Frontend TypeScript + Vite build: passed.
- Firebase Functions TypeScript build: passed.
- Chromium UI suite with isolated fixtures: nine tests passed. Covers search, navigation, editor, settings/theme, responsive widths 390/430/768, login roles/password visibility/reduced motion, guest controls, keyboard focus, signed ImageKit multipart/expired credentials, and actual Remotion frame movement.
- Visual inspection of dashboard, login, mobile gallery and project editor screenshots.
- No real login or live upload claimed; Safari on a physical iPhone still needs device testing.
- QA fixtures run only through `vite.qa.config.ts`; they are excluded from the production build. There is no production authentication bypass.
- Original build has large Firebase/Excel bundles; Excel remains dynamically loaded. Remotion is an independent lazy chunk.

## File audit

- `.gitignore`
- `docs/DESIGN.md`
- `functions/src/index.ts`
- `package-lock.json`
- `package.json`
- `playwright.config.ts`
- `src/App.tsx`
- `src/components/BlockedScreen.tsx`
- `src/components/BrandMotion.tsx`
- `src/components/ConfiguracionesSection.tsx`
- `src/components/CotizacionesGrid.tsx`
- `src/components/CotizacionesTable.tsx`
- `src/components/DetailsModal.tsx`
- `src/components/GallerySection.tsx`
- `src/components/LoginCard.tsx`
- `src/components/MediaAssetInput.tsx`
- `src/components/ProjectDetailsModal.tsx`
- `src/components/ProjectFormModal.tsx`
- `src/components/ProjectMediaCarousel.tsx`
- `src/components/ProjectMediaEditor.tsx`
- `src/components/SessionClosedScreen.tsx`
- `src/components/SessionExpiredScreen.tsx`
- `src/components/SessionExpiryBanner.tsx`
- `src/components/SessionsSection.tsx`
- `src/components/SidePanel.tsx`
- `src/components/StatsCard.tsx`
- `src/components/StudioNav.tsx`
- `src/hooks/useDialogFocus.ts`
- `src/hooks/useProjects.ts`
- `src/index.css`
- `src/pages/AdminPanel.tsx`
- `src/services/mediaUpload.ts`
- `tailwind.config.js`
- `tests/fixtures.ts`
- `tests/studio.spec.ts`
- `tests/ui.html`
- `tests/ui.tsx`
- `vite.qa.config.ts`

## Ajustes solicitados después de revisar la vista previa

- Eliminados el componente SidePanel y sus dos accesos (botón superior y Herramientas). Los controles de vista, modo registros, actualizar, exportar y salir permanecen en el encabezado.
- Navegación nueva: solo nombres e iconos; perfil de administrador colocado encima del enlace al sitio, con margen inferior y bloque propio.
- Exportación Excel identificada con texto e icono de hoja, estado ocupado y manejo de errores; mismo contenido y formato .xlsx.
- ImageKit: errores de creación, versión, lectura, borrado y Firestore se traducen a diagnósticos por etapa; errores y confirmaciones visibles en el modal. Rotación con ALREADY_EXISTS por código numérico. Sin registrar ni devolver excepciones crudas/keys.
- Firebase predeploy compila antes de publicar; runtime Node.js 22. Guía completa: docs/IMAGEKIT-DEPLOY.md.
- No se desplegó Firebase ni se cambiaron IAM, APIs o secretos reales. El diagnóstico definitivo de la infraestructura requiere el despliegue y los logs del proyecto.

## Optimización de entrada y carga

Se retiraron la consulta de ubicación y la marca persistente de login de las esperas necesarias para entrar; la autorización y el guardado esencial de sesión siguen siendo obligatorios. Panel y secciones se descargan bajo demanda; tipografías locales; errores de verificación recuperables. Archivo JavaScript inicial: 833.75 → 710.27 kB sin comprimir. Detalle y límites de medición: docs/LOADING-AUDIT.md. Cambios exclusivos del frontend, sin nuevo despliegue de Firebase.
