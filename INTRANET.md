# Intranet Fe y Alegría 14: guía para publicar

Todo el sistema está listo. Para ponerlo en línea solo falta conectarlo a un proyecto de Firebase del colegio y **definir qué cuentas administran**.

## Qué hay

| Página | Quién entra | Qué hace |
|---|---|---|
| `index.html`, `aula.html` | Público | Web del colegio y portal de cada aula |
| `login.html` | Todos | "Continuar con Google" con cuenta `@feyalegria14.edu.pe`. Cada cuenta va a su página |
| `perfil.html` | Estudiantes | Asistencia de hoy, notas, calendario, historial, justificaciones, horario, foto oficial |
| `docente.html` | Docentes | Asistencia de su aula (tutor), notas de sus áreas, justificaciones, resumen CSV |
| `admin-login.html` → `admin.html` | Administración (acceso aparte) | Estudiantes uno por uno (datos, ficha personal, notas, asistencia, foto), docentes, accesos, importar CSV |
| `comunidad.html` | Estudiantes y docentes | El Patio: publicaciones con texto, fotos, video y encuestas; moderación |

## Qué puede hacer cada uno

| Quién | Ver | Cambiar |
|---|---|---|
| Estudiante | Solo sus datos | Nada (solo publica en El Patio) |
| Tutor de un aula | Estudiantes de esa aula | Asistencia y justificaciones de esa aula |
| Docente de un área | Estudiantes de las aulas donde dicta | Notas de sus áreas, solo en esas aulas |
| Administración | Todo, incluida la ficha personal (DNI, apoderado, teléfono) | Todo: datos, notas, asistencia, fotos, docentes, accesos |

Estas reglas están en `firestore.rules` y `storage.rules` y las aplica el servidor de Google: no se pueden saltar desde el navegador. Cada cambio queda firmado con el correo de quien lo hizo (`actualizadoPor`). Solo pueden entrar cuentas `@feyalegria14.edu.pe` que estén registradas como estudiante, docente o administración.

## Cómo publicar (una sola vez)

Necesitas: Google Workspace del colegio con el dominio `feyalegria14.edu.pe`, Node.js y una cuenta de Google con permiso para crear proyectos.

1. **Crear el proyecto.** En https://console.firebase.google.com crea un proyecto y agrega una **app web**. Copia `apiKey`, `authDomain`, `projectId`, `storageBucket` y `appId` en `js/firebase-config.js`.
2. **Login con Google.** Authentication > Método de acceso > activa solo **Google**.
3. **Base de datos.** Firestore Database > Crear base de datos, en modo producción y región `southamerica-east1` (São Paulo, la más cercana).
4. **Plan Blaze y Storage.** Actívalo en Configuración > Uso y facturación y pon una alerta de presupuesto (por ejemplo, 5 USD). Luego ve a Storage > Comenzar. Blaze hace falta para las fotos de El Patio y las fotos de perfil; el uso de un colegio suele quedar dentro de lo gratuito.
5. **Publicar web y reglas.** En la carpeta del proyecto:
   ```
   npx firebase-tools login
   npx firebase-tools use --add          (elige el proyecto)
   npx firebase-tools deploy
   ```
   Esto publica la web, `firestore.rules`, `firestore.indexes.json` y `storage.rules`. La web queda en `https://<proyecto>.web.app`.
6. **Dominio propio (opcional).** Hosting > Agregar dominio personalizado. Después agrégalo también en Authentication > Configuración > Dominios autorizados.
7. **Cuentas de administración** (ver abajo).
8. **Cargar estudiantes y docentes.** Entra por `admin-login.html` con una cuenta de administración y ve a **Importar**. Descarga la plantilla, llénala en Excel, guárdala como CSV y súbela. También puedes crearlos uno por uno.

## Cuentas de administración

La primera cuenta se carga desde tu computadora. Las demás se agregan desde el panel, en **Accesos**.

1. Abre `herramientas/admins.json` y pon el correo real de quien administra:
   ```json
   [
     { "correo": "direccion@feyalegria14.edu.pe", "nombre": "Dirección" }
   ]
   ```
2. Descarga la clave de servicio: Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada. Guárdala como `herramientas/clave-servicio.json`.
   - **Esta clave da acceso total a la base de datos.** No la subas a la web, a GitHub ni la envíes por chat. `.gitignore` y `firebase.json` ya la excluyen.
3. Ejecuta:
   ```
   cd herramientas
   npm install firebase-admin
   node importar.mjs admins.json --admins
   ```
4. Entra por **`admin-login.html`** (acceso aparte, no enlazado desde la web pública) con esa cuenta. Desde **Accesos** puedes dar o quitar acceso a otras cuentas (secretaría, coordinación). El panel no deja quitar la última cuenta de administración.

## Importar desde Excel (CSV)

En `admin.html` > Importar. Se aceptan CSV separados por `;` (Excel en español) o por `,`.

- **Estudiantes:** `correo, nombres, apellidos, nivel, grado, seccion, codigo, dni, nacimiento, apoderado, parentesco, telefono, direccion`. En nivel va `primaria` o `secundaria`.
- **Docentes:** `correo, nombres, apellidos, tutoria, areas`. En tutoria van aulas como `s3B` o `p5D`. En areas, cada aula con sus áreas separadas por `/`, y cada aula separada por `|`. Ejemplo: `s3B:Matemática/Tutoría | s3A:Matemática`.
- Todo se revisa antes de guardar. Si hay un error no se carga nada, y el panel dice la fila y el motivo.
- Volver a importar a un estudiante existente solo actualiza los campos que trae el archivo. Sus notas, asistencia y foto no se tocan.

## Probar sin publicar

- **Demostraciones con datos ficticios** (funcionan mientras `js/firebase-config.js` diga `PEGAR_AQUI`): `perfil.html?demo`, `docente.html?demo`, `admin.html?demo`, `comunidad.html?demo`.
- **Emuladores de Firebase** (login, reglas y datos reales en tu computadora): instala Java 21 y ejecuta `npx firebase-tools emulators:start --project demo-fya14`. Aparte, ejecuta `node servidor.mjs` y abre http://localhost:8080/login.html?emu. Para cargar datos de prueba en PowerShell: `$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8081"; node herramientas/importar.mjs herramientas/ejemplo-estudiantes.json`.

## Antes de abrirlo a las familias

- Fechas de bimestres y feriados: `js/calendario.js`.
- Horarios, tutores y comunicados de ejemplo del portal de aulas: `js/data-aulas.js`. Reemplázalos por los reales o quita el aviso de "contenido de ejemplo" cuando lo estén.
- El Patio: comunica a las familias las normas de uso. Los docentes reciben los reportes.

## Formato de datos (referencia)

| Campo | Valores |
|---|---|
| `correo` | Correo institucional; también es el id del documento |
| `nivel` / `grado` / `seccion` | `"p"` o `"s"`; 1 a 6 en primaria y 1 a 5 en secundaria; `"A"` a `"D"` |
| `notas` | `{ "Área": [bim I, bim II, bim III, bim IV] }` con `"AD"`, `"A"`, `"B"`, `"C"` o `""` |
| `asistencia` | `{ "AAAA-MM-DD": { "e": "P" \| "T" \| "F" \| "J", "h": "7:41", "j": {...} } }` |
| `j` | `{ "motivo", "presentada": "AAAA-MM-DD", "por", "estado": "aprobada" \| "pendiente" \| "observada", "obs" }` |
| `fichas/{correo}` | `dni`, `nacimiento`, `apoderado`, `parentesco`, `telefono`, `direccion`, `observaciones` (solo administración) |
