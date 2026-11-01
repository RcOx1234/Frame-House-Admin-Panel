# ImageKit: desplegar las Functions actualizadas

Proyecto comprobado en la configuración del panel: **frame-house-datos**.
Región: **us-central1**. Rama: **redesign/frame-house-studio**.

## Qué se corrigió y qué falta comprobar

Guardar la private key utiliza Firebase + Google Secret Manager; todavía no llama a la API de subida de ImageKit. Un error en este paso no demuestra un cambio de claves en ImageKit.

Se corrigieron el manejo de errores por etapa, la rotación de secretos existentes mediante el código gRPC ALREADY_EXISTS y la visibilidad de los errores dentro del modal. Las respuestas nuevas identifican la versión `frame-house-imagekit-2026-11-01-v2`.

No se pudo consultar la cuenta de servicio, sus permisos ni los logs reales de Firebase desde las conexiones disponibles. Por eso falta desplegar este código y comprobar si el problema concreto era una versión antigua, Secret Manager API deshabilitada, permisos IAM u otro error. El código no concede permisos por sí mismo.

## 1. Descargar los cambios en tu computadora

Abre la terminal de Cursor o PowerShell **dentro de Frame-House-Admin-Panel**, la carpeta que contiene `firebase.json`, `package.json`, `src` y `functions`. No ejecutes estos comandos en Frame-House (la web pública) ni dentro de `src`.

Si tienes cambios locales sin guardar, consérvalos antes de cambiar de rama.

```powershell
git fetch origin
git switch redesign/frame-house-studio
git pull --ff-only origin redesign/frame-house-studio
```

Los archivos completos ya están en esta rama; no tienes que crear Functions a mano en la consola ni pegar allí el TypeScript.

| Archivo | Para qué sirve |
| --- | --- |
| `functions/src/index.ts` | Las cuatro funciones de Firebase: guardar, firmar, eliminar y probar ImageKit |
| `functions/src/cloudOperations.ts` | Guardado y rotación seguros; diagnóstico de API, IAM, cuotas y recursos |
| `functions/package.json` y `functions/package-lock.json` | Dependencias, pruebas y runtime Node.js 22 |
| `firebase.json` | Carpeta de Functions y compilación automática antes del despliegue |
| `functions/test/cloudOperations.test.cjs` | Pruebas sin credenciales ni cambios reales |

## 2. Instalar, comprobar e iniciar sesión

Usa Node.js 22 para coincidir con el runtime del backend. En la misma terminal, desde la raíz del repositorio:

```powershell
npm ci --prefix functions
npm test --prefix functions
npx firebase-tools login
npx firebase-tools projects:list
```

En el navegador inicia sesión con la cuenta Google que administra **frame-house-datos**. Comprueba que ese proyecto aparezca en la lista. No compartas la private key ni un archivo JSON de cuenta de servicio.

## 3. Revisar Google Cloud si faltan API o permisos

Abre https://console.cloud.google.com/ y selecciona **frame-house-datos**.

1. En **APIs y servicios → Biblioteca**, busca **Secret Manager API** (`secretmanager.googleapis.com`) y actívala si está deshabilitada. El proyecto necesita facturación compatible con Cloud Functions; comprueba el plan Blaze de Firebase si el despliegue informa que falta facturación.
2. En **Cloud Run → Functions** (o **Cloud Functions**), abre `setImageKitPrivateKey`. En los detalles de configuración/seguridad, identifica su **cuenta de servicio de ejecución**. Repite la comprobación para las otras tres funciones. Usa la identidad real mostrada, no la cuenta de tu usuario y no una cuenta elegida al azar.
3. En **IAM y administración → IAM**, revisa los permisos de esa cuenta. En Functions de segunda generación suele ser `NUMERO_PROYECTO-compute@developer.gserviceaccount.com`; una cuenta personalizada puede ser diferente.
4. Para guardar una clave nueva se necesitan **ambos** permisos: `secretmanager.secrets.create` y `secretmanager.versions.add`. Para firmar y probar se necesita `secretmanager.versions.access`. Para “Eliminar key”, `secretmanager.secrets.delete`.
5. La cuenta también necesita acceso de lectura/escritura a los documentos de integración en Firestore. El SDK Admin usa IAM; cambiar las reglas Firestore del navegador no arregla sus permisos.

Si necesitas otorgar permisos, hazlo a la cuenta de ejecución que acabas de verificar. Una opción es que el administrador cree en **IAM y administración → Roles → Crear rol** un rol de proyecto con esos cuatro permisos de Secret Manager y lo asigne a la cuenta. Ese rol da esas operaciones sobre los secretos del proyecto. Para limitarlo más, se puede dar el permiso de creación a nivel de proyecto y los permisos de añadir/leer/eliminar por secreto existente. No hace falta otorgar Owner/Editor del proyecto.

`Secret Version Adder` por sí solo **no crea** un secreto; `Secret Accessor` por sí solo **no guarda** claves. Esta diferencia es relevante para el error al pulsar Guardar.

## 4. Desplegar solo las cuatro Functions del panel

Desde la raíz de **Frame-House-Admin-Panel**, ejecuta:

```powershell
npx firebase-tools deploy --only "functions:setImageKitPrivateKey,functions:getImageKitUploadAuth,functions:deleteImageKitPrivateKey,functions:verifyImageKitIntegration" --project frame-house-datos
```

`firebase.json` compila automáticamente `functions/src` a `functions/lib` antes de desplegar, para evitar subir JavaScript viejo. No subas `src/index.ts` a Vercel: Vercel publica el frontend, Firebase publica estas Functions.

Este comando actualiza el backend existente, compartido por la vista previa y el panel actual. No publica la rama frontend en producción y no despliega reglas Firestore.

Si una Function todavía no existe, el comando la creará con el mismo nombre exportado en el código. Si la cuenta Google no tiene permisos de despliegue, debe hacerlo el administrador del proyecto.

## 5. Comprobarlo en el panel

1. Espera a que Firebase termine y muestre las cuatro funciones sin errores en `us-central1`.
2. Recarga la vista previa. Entra como Administrador → Configuraciones.
3. Guarda primero la integración (Public key y URL endpoint), usando **Guardar cambios**, antes de guardar su private key.
4. Abre **Ver detalles y editar** y pega la private key completa. Si rotaste las claves, public key y private key deben pertenecer al mismo par.
5. Pulsa **Guardar private key**. Debe aparecer la confirmación dentro del modal. La clave se almacena en Secret Manager, no en Firestore ni Vercel.
6. Pulsa **Probar conexión**. Esta prueba consulta ImageKit sin crear archivos. Verifica la private key y el acceso de lectura. Después realiza una subida normal para confirmar que el par de claves y los permisos de escritura funcionan.

La integración debe tener acceso **Media Read and write** en ImageKit → Developer options → API keys.

## Si todavía falla

Los errores de las Functions actualizadas incluyen `stage`, `reason` y `backendRelease` sin revelar claves. Comprueba que `backendRelease` sea `frame-house-imagekit-2026-11-01-v2`.

| `stage` | Qué revisar |
| --- | --- |
| `read-integration` | Proyecto Firebase y permisos IAM de Firestore |
| `create-secret` | Secret Manager API, facturación y `secretmanager.secrets.create` |
| `add-secret-version` | `secretmanager.versions.add` |
| `read-secret` | Secreto existente, versión habilitada y `secretmanager.versions.access` |
| `delete-secret` | `secretmanager.secrets.delete` |
| `write-integration` | La clave ya se guardó; falta actualizar el estado en Firestore |

Si solo aparece `internal` sin esos campos, puede seguir ejecutándose código anterior o el fallo puede ocurrir antes de entrar al controlador. Ve a **Firebase Console → Functions → setImageKitPrivateKey → Logs** (o a los logs del servicio Cloud Run). También puedes ejecutar:

```powershell
npx firebase-tools functions:log --only setImageKitPrivateKey --project frame-house-datos
```

Comparte únicamente el mensaje, la etapa y la versión del backend. No compartas claves, tokens ni el contenido de secretos.

## Referencias oficiales

- Firebase: errores de callables: https://firebase.google.com/docs/functions/callable
- Firebase: despliegue y cuenta de servicio: https://firebase.google.com/docs/functions/manage-functions
- Google: permisos de Secret Manager: https://docs.cloud.google.com/secret-manager/docs/access-control
- ImageKit: claves y permisos: https://imagekit.io/docs/api-keys
