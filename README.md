# CodeQuest

Proyecto original, sencillo y escalable para que programadores junior practiquen sus habilidades con retos de código en los lenguajes más populares.

Tabla de contenidos

Tecnologías

Instalación

Configuración

Uso

Estructura del proyecto

Características

Contribuir

Licencia

Tecnologías

Next.js (App Router)

TypeScript

Supabase (Auth, Postgres)

PostgreSQL

Tailwind CSS

react-simple-code-editor + Prism.js

Instalación

Clona el repositorio:

git clone <https://github.com/tu-usuario/codequest.git>
cd codequest

Instala dependencias:

npm install
o
pnpm install

Configuración

Crea un archivo .env.local en la raíz con tus credenciales de Supabase:

NEXT_PUBLIC_SUPABASE_URL=<https://mi-proyecto.supabase.co>
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_apikey_publica

Configura las tablas y políticas RLS en Supabase:

Tabla challenges con columnas: id, titulo, descripcion, lenguaje, nivel, etiquetas, codigo_base, test_cases.

Tabla submissions con challenge_id, user_id, resultado y políticas de lectura/escritura.

Tabla o vista users_extended con id y email.

Uso

Inicia el servidor de desarrollo:

npm run dev

Abre en el navegador [http://localhost:3000](http://localhost:3000).

Estructura del proyecto

src/app/
├─ admin/
│  ├─ layout.tsx
│  ├─ page.tsx
│  ├─ crear/page.tsx
│  ├─ retos/page.tsx
│  └─ submissions/page.tsx
├─ retos/
│  └─ [id]/page.tsx
├─ historial/page.tsx
├─ perfil/page.tsx
└─ lib/supabase.ts

Características

Exploración de retos con filtros por título, lenguaje, nivel y etiquetas.

Editor en línea con resaltado de sintaxis y validación inmediata.

Historial de envíos y resultados.

Perfil de usuario con estadísticas y progreso.

Leaderboard global.

Panel de administración para gestionar retos.

Contribuir

Haz un fork del repositorio.

Crea una branch: git checkout -b feature/nombre.

Realiza tus cambios y commits.

Envía un pull request describiendo tu mejora.

Licencia

Este proyecto está bajo la licencia MIT.
