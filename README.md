# HASES RR.HH. — Web

Cliente Angular para el sistema de ciclo de vida del trabajador en HASES.
Consume la API REST de [`hases-api`](../hases-api).

- **Framework:** Angular 19 (standalone components, lazy load por ruta)
- **Estilos:** CSS global con tokens de marca HASES (`src/styles.css`)
- **Estado:** Signals + servicios inyectados
- **HTTP:** `provideHttpClient` con interceptor JWT
- **Tipos del API:** `openapi-typescript` genera `src/app/core/openapi.gen.ts`

## Estructura

```
hases-web/
├── src/
│   ├── app/
│   │   ├── core/               # auth.service, interceptor, guards, api.service, types
│   │   ├── shared/             # shell layout
│   │   ├── features/
│   │   │   ├── auth/           # login
│   │   │   ├── dashboard/      # KPIs y últimas postulaciones
│   │   │   ├── vacancies/      # gestión de vacantes
│   │   │   ├── applications/   # lista + detalle (datos, docs, entrevistas, IPS, inducción, EPP)
│   │   │   ├── interviews/     # plantillas y preguntas
│   │   │   ├── induction/      # módulos organizacionales
│   │   │   └── admin/          # usuarios, catálogos
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   └── app.component.ts
│   ├── environments/           # apiUrl por ambiente
│   └── styles.css              # tokens de marca + componentes
├── DESIGN.md                   # sistema de diseño (Stitch / DESIGN.md)
└── package.json
```

## Configuración

El `apiUrl` por ambiente vive en `src/environments/environment*.ts`.

```ts
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1',
};
```

Ajusta `environment.prod.ts` para producción.

## Desarrollo

Requiere Node.js 20+ y npm 10+. La API debe estar corriendo en
`environment.apiUrl`.

```bash
npm install
npm start          # ng serve en http://localhost:4200
```

Login por defecto (mientras no se cambie):

- Usuario: `admin@local.test`
- Contraseña: `admin123`

## Generación de tipos desde OpenAPI

El backend mantiene el contrato autoritativo en
`hases-api/openapi/openapi.yaml`. Cuando cambien endpoints:

```bash
npm run generate:api
```

Esto reescribe `src/app/core/openapi.gen.ts`. Los servicios pueden importar
los tipos `paths` y `components.schemas` de ese archivo cuando se necesite
chequeo estricto contra el contrato.

## Build

```bash
npm run build                  # build de producción → dist/web
npm run build -- --configuration=development
```

## Despliegue

El bundle generado en `dist/web/browser` se sirve desde cualquier hosting
estático (Vercel, Netlify, Nginx). Rutas Angular requieren fallback a
`index.html` (rewrites tipo SPA).

## Notas de UX

- Layout en `shared/shell.component.ts`: topbar con marca + logout, sidebar
  con secciones según rol.
- `auth.interceptor.ts` añade `Authorization: Bearer …` y, ante un `401`,
  redirige a `/login` preservando el `returnUrl`.
- `roleGuard('admin')` y `roleGuard('admin','hr')` protegen rutas de
  administración.
- Todos los formularios usan estilos compartidos (`.card`, `.form-grid`,
  `.btn--primary`, `.data-table`).

## Tests

```bash
npm test           # Karma + Jasmine (esqueleto inicial Angular)
```

## Licencia

Uso interno HASES.
