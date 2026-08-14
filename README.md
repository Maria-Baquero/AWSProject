# 🐾 Veterinary Clinic — Sistema de Gestión

Sistema web completo para la gestión de una clínica veterinaria, desplegado en AWS con arquitectura segura y escalable.

Permite gestionar clientes, mascotas y citas médicas con autenticación JWT, interfaz moderna y base de datos relacional en la nube, realizado con Kiro.

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Arquitectura AWS](#-arquitectura-aws)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación Local](#-instalación-local)
- [Variables de Entorno](#-variables-de-entorno)
- [Scripts Disponibles](#-scripts-disponibles)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API Endpoints](#-api-endpoints)
- [Despliegue en AWS](#-despliegue-en-aws)
- [Testing](#-testing)
- [Licencia](#-licencia)

---

## ✨ Características

- **Gestión de Clientes** — Registro, búsqueda paginada y edición de dueños de mascotas
- **Gestión de Mascotas** — Alta, baja lógica, búsqueda y edición con datos médicos
- **Gestión de Citas** — Agenda diaria, creación con detección de conflictos, completar/cancelar
- **Autenticación JWT** — Login seguro con tokens, protección de rutas y roles
- **Interfaz Responsive** — SPA moderna con diseño adaptado a móvil y escritorio
- **Paginación y Búsqueda** — En todas las vistas de listado
- **Validación** — En frontend y backend con mensajes en español
- **Despliegue Automatizado** — Scripts de deploy, configuración de Nginx y PM2

---

## 🛠 Tecnologías

### Backend

| Tecnología | Uso |
|---|---|
| 🟢 **Node.js** | Runtime del servidor |
| 🔷 **TypeScript** | Tipado estático |
| ⚡ **Express** | Framework HTTP |
| 🐘 **PostgreSQL** | Base de datos relacional |
| 🔑 **JSON Web Tokens** | Autenticación stateless |
| 🛡️ **Zod** | Validación de esquemas |
| 🔐 **bcrypt** | Hashing de contraseñas |
| 📦 **pg** | Driver PostgreSQL para Node.js |

### Frontend

| Tecnología | Uso |
|---|---|
| ⚛️ **React 19** | Biblioteca de UI |
| 🔷 **TypeScript** | Tipado estático |
| ⚡ **Vite** | Build tool y dev server |
| 🎨 **Tailwind CSS** | Estilos utility-first |
| 🔄 **TanStack Query** | Gestión de estado del servidor |
| 🧭 **React Router 7** | Enrutamiento SPA |
| 📡 **Axios** | Cliente HTTP |

### Infraestructura y DevOps

| Tecnología | Uso |
|---|---|
| ☁️ **AWS EC2** | Servidor de aplicación |
| 🗄️ **AWS RDS** | Base de datos gestionada |
| 🌐 **AWS VPC** | Red virtual aislada |
| 🔀 **Nginx** | Reverse proxy y servidor de estáticos |
| 🔄 **PM2** | Process manager en producción |
| 🧪 **Vitest** | Testing unitario e integración |
| 🎯 **fast-check** | Property-based testing |

---

## 🏗 Arquitectura AWS

```
Internet → Internet Gateway → VPC (10.0.0.0/16)
                                ├── Subnet Pública (10.0.1.0/24)
                                │     └── EC2 t2.micro (Node.js + Nginx)
                                │           • Express API (puerto 3000)
                                │           • Frontend estático (Vite build)
                                │           • Nginx reverse proxy (puerto 80/443)
                                │           • PM2 process manager
                                │
                                ├── Subnet Privada 1 (10.0.2.0/24, us-east-1a)
                                │     └── RDS PostgreSQL db.t3.micro
                                │
                                └── Subnet Privada 2 (10.0.3.0/24, us-east-1b)
                                      └── (Requerida por RDS para HA)
```

### Seguridad

- 🔒 RDS en subnets privadas — sin acceso público desde Internet
- 🛡️ Security Groups restrictivos — BD solo accesible desde EC2
- 🔑 SSH restringido a IP específica
- 🔐 Contraseñas hasheadas con bcrypt
- 🎫 JWT con expiración configurable
- 🔗 Conexión SSL a PostgreSQL en producción

---

## 📦 Requisitos Previos

- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** >= 15 (local para desarrollo, RDS para producción)

---

## 🚀 Instalación Local

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd veterinary-AWS
```

### 2. Instalar dependencias del backend

```bash
npm install
```

### 3. Instalar dependencias del frontend

```bash
cd frontend
npm install
cd ..
```

### 4. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus credenciales locales de PostgreSQL
```

### 5. Crear la base de datos y ejecutar migraciones

```bash
createdb veterinary_clinic
psql -d veterinary_clinic -f migrations/001_initial_schema.sql
```

### 6. Iniciar en desarrollo

```bash
# Terminal 1 — Backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

La aplicación estará disponible en `http://localhost:5173` con proxy al backend en puerto 3000.

---

## 🔐 Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base de datos | `veterinary_clinic` |
| `DB_USER` | Usuario de PostgreSQL | `postgres` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | `your_password` |
| `JWT_SECRET` | Clave secreta para firmar tokens | `your_jwt_secret` |
| `JWT_EXPIRATION` | Tiempo de expiración del token | `24h` |
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno de ejecución | `development` / `production` |

---

## 📜 Scripts Disponibles

### Backend (raíz del proyecto)

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia el servidor en modo desarrollo con ts-node |
| `npm run build` | Compila TypeScript a JavaScript en `dist/` |
| `npm start` | Ejecuta el servidor compilado (producción) |
| `npm test` | Ejecuta los tests con Vitest |
| `npm run test:watch` | Tests en modo watch |

### Frontend (`frontend/`)

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia Vite dev server con HMR |
| `npm run build` | Compila TypeScript y genera build de producción |
| `npm run preview` | Previsualiza el build de producción |
| `npm run lint` | Ejecuta ESLint |
| `npm test` | Ejecuta tests con Vitest |

---

## 📁 Estructura del Proyecto

```
veterinary-AWS/
├── src/                          # Código fuente del backend
│   ├── config/                   # Configuración (database pool)
│   ├── controllers/              # Controladores HTTP
│   ├── errors/                   # Clases de error personalizadas
│   ├── middlewares/              # Middleware (auth, validation, errors)
│   ├── repositories/            # Capa de acceso a datos (SQL)
│   ├── routes/                   # Definición de rutas Express
│   ├── services/                 # Lógica de negocio
│   ├── types/                    # Interfaces TypeScript
│   ├── validators/               # Esquemas Zod de validación
│   ├── app.ts                    # Configuración de Express
│   └── server.ts                 # Punto de entrada
│
├── frontend/                     # Aplicación React
│   ├── src/
│   │   ├── components/           # Componentes reutilizables
│   │   ├── hooks/                # Custom hooks (auth, toast)
│   │   ├── pages/                # Páginas/vistas
│   │   ├── services/             # Servicios API (axios)
│   │   ├── types/                # Interfaces TypeScript
│   │   └── App.tsx               # Componente raíz con rutas
│   ├── package.json
│   └── vite.config.ts
│
├── migrations/                   # Scripts SQL de migración
│   └── 001_initial_schema.sql
│
├── deploy/                       # Scripts de despliegue AWS
│   ├── deploy.sh                 # Script principal de despliegue
│   ├── setup-ec2.sh              # Configuración inicial de EC2
│   ├── setup-nginx.sh            # Configuración de Nginx
│   ├── setup-ssl.sh              # Configuración de SSL/HTTPS
│   ├── setup-pm2-logrotate.sh    # Rotación de logs
│   ├── run-migrations.sh         # Ejecutar migraciones en producción
│   ├── smoke-test.sh             # Test de verificación post-deploy
│   ├── generate-env.sh           # Generador de variables de entorno
│   ├── INFRASTRUCTURE.md         # Guía completa de infraestructura AWS
│   └── guia-simplificada-aws.md  # Guía resumida
│
├── tests/                        # Tests del backend
├── ecosystem.config.js           # Configuración PM2
├── tsconfig.json                 # Config TypeScript backend
├── vitest.config.ts              # Config Vitest backend
├── package.json
└── .env.example
```

---

## 🌐 API Endpoints

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/register` | Registrar usuario |

### Clientes

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/clients` | Listar clientes (paginado) |
| GET | `/api/clients/:id` | Obtener cliente por ID |
| POST | `/api/clients` | Crear cliente |
| PUT | `/api/clients/:id` | Actualizar cliente |

### Mascotas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/pets` | Listar mascotas (paginado/búsqueda) |
| GET | `/api/pets/all` | Listar todas las mascotas |
| GET | `/api/pets/:id` | Obtener mascota por ID |
| POST | `/api/pets` | Crear mascota |
| PUT | `/api/pets/:id` | Actualizar mascota |
| DELETE | `/api/pets/:id` | Desactivar mascota (soft delete) |

### Citas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/appointments?date=YYYY-MM-DD` | Citas por fecha |
| GET | `/api/appointments?petId=uuid` | Citas por mascota |
| POST | `/api/appointments` | Crear cita |
| PATCH | `/api/appointments/:id/cancel` | Cancelar cita |
| PATCH | `/api/appointments/:id/complete` | Completar cita |

> Todos los endpoints (excepto auth) requieren header `Authorization: Bearer <token>`

---

## ☁️ Despliegue en AWS

La guía completa paso a paso se encuentra en [`deploy/INFRASTRUCTURE.md`](deploy/INFRASTRUCTURE.md).

### Resumen rápido

```bash
# 1. Configurar EC2
scp -i key.pem deploy/setup-ec2.sh ec2-user@<IP>:/home/ec2-user/
ssh -i key.pem ec2-user@<IP>
./setup-ec2.sh

# 2. Desplegar aplicación
./deploy/deploy.sh <ELASTIC_IP> <KEY_PATH>

# 3. Ejecutar migraciones
ssh -i key.pem ec2-user@<IP>
cd /home/ec2-user/app && ./run-migrations.sh

# 4. Configurar Nginx
./setup-nginx.sh

# 5. Verificar
./smoke-test.sh
```

### Costos estimados

| Escenario | Costo mensual |
|-----------|---------------|
| Con Free Tier | ~$0/mes |
| Post Free Tier | ~$25-30/mes |

---

## 🧪 Testing

```bash
# Tests del backend
npm test

# Tests del frontend
cd frontend && npm test

# Tests en modo watch
npm run test:watch
```

El proyecto utiliza **Vitest** como test runner y **fast-check** para property-based testing en el backend.

---

## 👨‍💻 Desarrollo

### Convenciones

- **Backend**: Arquitectura en capas (Controller → Service → Repository)
- **Frontend**: Componentes funcionales con hooks
- **Base de datos**: snake_case en columnas, camelCase en código
- **API**: Respuestas paginadas `{ data, total, page, totalPages }`
- **Validación**: Zod en backend, validación manual en frontend
- **Errores**: Clases personalizadas con HTTP status codes

### Flujo de una petición

```
Frontend (React) → Axios → Nginx (proxy) → Express → Controller → Service → Repository → PostgreSQL
```

---

## 📄 Licencia

Este proyecto es de uso educativo y personal.
