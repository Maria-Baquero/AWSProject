# Implementation Plan: Veterinary Clinic Web Application

## Overview

Plan de implementación para la aplicación web de clínica veterinaria. Se construye de forma incremental: primero la estructura del proyecto y modelos de datos, luego la capa de servicios backend (autenticación, clientes, mascotas, citas), y finalmente el frontend React. Cada paso se valida con tests antes de avanzar al siguiente.

## Tasks

- [x] 1. Configurar estructura del proyecto y dependencias base
  - [x] 1.1 Inicializar proyecto Node.js/TypeScript con Express y configurar estructura de carpetas
    - Crear `package.json` con dependencias: express, pg, jsonwebtoken, bcrypt, zod, uuid, cors, dotenv
    - Crear `tsconfig.json` para backend
    - Crear estructura de carpetas: `src/controllers`, `src/services`, `src/repositories`, `src/middlewares`, `src/validators`, `src/errors`, `src/types`
    - Crear archivo `.env.example` con variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION`
    - _Requirements: 5.2_

  - [x] 1.2 Crear clases de error personalizadas y middleware de errores
    - Implementar `AppError`, `ValidationError`, `NotFoundError`, `ConflictError`, `ServiceUnavailableError`, `UnauthorizedError`
    - Implementar middleware `errorHandler` que transforma errores en respuestas JSON con `statusCode` y `message`
    - _Requirements: 7.3, 7.4_

  - [x] 1.3 Configurar conexión a PostgreSQL con pool y timeout
    - Crear módulo de conexión usando `pg.Pool` con `connectionTimeoutMillis: 5000`
    - Configurar lectura de credenciales desde variables de entorno
    - Implementar manejo de error de conexión que retorna HTTP 503
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 1.4 Crear script de migración SQL para el esquema de base de datos
    - Crear archivo SQL con tablas: `users`, `clients`, `pets`, `appointments`
    - Incluir constraints de integridad referencial, checks de validación, índices
    - Incluir constraint `chk_contact` para requerir al menos un dato de contacto en clientes
    - _Requirements: 5.4_

- [x] 2. Implementar módulo de autenticación y usuarios
  - [x] 2.1 Implementar esquemas de validación Zod para usuarios y login
    - Crear `CreateUserDTO` schema: fullName (1-100), email (formato válido, único), password (mín 8), role (veterinarian | receptionist)
    - Crear `LoginDTO` schema: email y password requeridos
    - _Requirements: 6.1, 7.1_

  - [x] 2.2 Implementar repositorio de usuarios (UserRepository)
    - Métodos: `create`, `findByEmail`, `findById`, `findAll`, `update`, `deactivate`
    - Queries SQL parametrizadas contra la tabla `users`
    - _Requirements: 6.1, 6.6_

  - [x] 2.3 Implementar servicio de autenticación (AuthService) y servicio de usuarios (UserService)
    - Hash de contraseñas con bcrypt (salt rounds: 12)
    - Generación de JWT con payload {id, email, role}
    - Verificación de credenciales en login
    - Verificar unicidad de email antes de crear usuario
    - _Requirements: 6.1, 6.2, 6.5_

  - [x] 2.4 Implementar middleware de autenticación JWT
    - Extraer token del header `Authorization: Bearer <token>`
    - Verificar validez del token y extraer payload del usuario
    - Rechazar con 401 si token ausente, expirado o inválido
    - _Requirements: 6.3, 6.4_

  - [x] 2.5 Implementar controladores y rutas de autenticación y usuarios
    - `POST /api/auth/login` - login con credenciales
    - `GET /api/auth/me` - obtener usuario autenticado
    - `POST /api/users` - crear usuario
    - `GET /api/users` - listar usuarios activos
    - Aplicar middleware de autenticación a rutas protegidas
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [x] 2.6 Write property tests para autenticación
    - **Property 19: Autenticación con credenciales válidas**
    - **Property 20: Rechazo de requests sin autenticación**
    - **Validates: Requirements 6.2, 6.4**

- [x] 3. Checkpoint - Verificar módulo de autenticación
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implementar módulo de clientes
  - [x] 4.1 Implementar esquemas de validación Zod para clientes
    - Crear `CreateClientDTO` schema con refine para requerir al menos teléfono o email
    - Validar: fullName (1-100), phone (regex `^\+?\d{7,15}$`), email (formato válido), address (máx 200)
    - Crear `UpdateClientDTO` schema parcial
    - _Requirements: 1.1, 1.5, 7.1_

  - [x] 4.2 Implementar repositorio de clientes (ClientRepository)
    - Métodos: `create`, `findAll` (paginado, máx 50), `search` (por nombre/teléfono, máx 50), `findById`, `update`
    - Verificación de unicidad de email y teléfono antes de crear/actualizar
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7_

  - [x] 4.3 Implementar servicio de clientes (ClientService)
    - Lógica de negocio: crear, buscar, paginar, actualizar
    - Validar unicidad de email/teléfono (lanzar ConflictError si duplicado)
    - Validar existencia del cliente antes de actualizar (lanzar NotFoundError si no existe)
    - _Requirements: 1.1, 1.4, 1.6, 1.7_

  - [x] 4.4 Implementar controlador y rutas de clientes
    - `POST /api/clients` - crear cliente
    - `GET /api/clients?page=N&search=X` - listar/buscar clientes paginados
    - `GET /api/clients/:id` - obtener cliente por ID
    - `PUT /api/clients/:id` - actualizar cliente
    - Aplicar middleware de autenticación y validación
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 4.5 Write property tests para clientes
    - **Property 1: Round-trip de creación de cliente**
    - **Property 2: Límites de paginación**
    - **Property 3: Búsqueda parcial retorna coincidencias**
    - **Property 4: Rechazo de datos de cliente inválidos**
    - **Property 5: Unicidad de contacto**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.7**

- [x] 5. Implementar módulo de mascotas
  - [x] 5.1 Implementar esquemas de validación Zod para mascotas
    - Crear `CreatePetDTO` schema: name (1-100), species (1-50), breed (máx 50), weight (0.01-999.99), microchipNumber (máx 25 alfanumérico, nullable), medicalNotes (máx 2000), clientId (uuid requerido)
    - Crear `UpdatePetDTO` schema parcial
    - _Requirements: 2.1, 2.5, 7.1_

  - [x] 5.2 Implementar repositorio de mascotas (PetRepository)
    - Métodos: `create`, `findByClient` (solo activas), `findById` (solo activas), `update`, `deactivate` (soft-delete)
    - Verificar que client_id existe antes de crear
    - _Requirements: 2.1, 2.2, 2.4, 5.4_

  - [x] 5.3 Implementar servicio de mascotas (PetService)
    - Lógica de negocio: crear mascota vinculada a cliente, listar activas, actualizar, soft-delete
    - Validar existencia del cliente padre (lanzar NotFoundError)
    - Verificar que no hay citas activas antes de desactivar (lanzar ConflictError si hay dependientes)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 5.5_

  - [x] 5.4 Implementar controlador y rutas de mascotas
    - `POST /api/pets` - crear mascota
    - `GET /api/pets?clientId=X` - listar mascotas activas de un cliente
    - `GET /api/pets/:id` - obtener mascota por ID
    - `PUT /api/pets/:id` - actualizar mascota
    - `DELETE /api/pets/:id` - soft-delete
    - Aplicar middleware de autenticación y validación
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 5.5 Write property tests para mascotas
    - **Property 6: Creación de mascota con datos válidos**
    - **Property 7: Filtrado de mascotas inactivas**
    - **Property 8: Soft-delete preserva registro**
    - **Property 9: Rechazo de datos de mascota inválidos**
    - **Validates: Requirements 2.1, 2.2, 2.4, 2.5**

- [x] 6. Checkpoint - Verificar módulos de clientes y mascotas
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implementar módulo de citas
  - [x] 7.1 Implementar esquemas de validación Zod para citas
    - Crear `CreateAppointmentDTO` schema: petId (uuid), date (ISO 8601, no en pasado), time (HH:mm), reason (máx 500), duration (15-120, múltiplo de 15)
    - _Requirements: 3.1, 3.7, 7.1_

  - [x] 7.2 Implementar repositorio de citas (AppointmentRepository)
    - Métodos: `create`, `findByDate` (ordenado por hora ASC), `findByPet` (ordenado por fecha DESC, máx 100), `updateStatus`, `checkConflict`
    - Implementar query de detección de conflictos con OVERLAPS
    - _Requirements: 3.1, 3.2, 3.3, 3.6_

  - [x] 7.3 Implementar servicio de citas (AppointmentService)
    - Lógica de negocio: crear cita (verificar conflictos primero), listar por fecha/mascota, cancelar, completar
    - Máquina de estados: solo "scheduled" puede transicionar a "cancelled" o "completed"
    - Verificar existencia de la mascota antes de crear (lanzar NotFoundError)
    - Verificar que la mascota está activa antes de crear cita
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 3.8, 5.4_

  - [x] 7.4 Implementar controlador y rutas de citas
    - `POST /api/appointments` - crear cita
    - `GET /api/appointments?date=YYYY-MM-DD` - listar citas del día
    - `GET /api/appointments?petId=X` - historial de citas de mascota
    - `PATCH /api/appointments/:id/cancel` - cancelar cita
    - `PATCH /api/appointments/:id/complete` - completar cita
    - Aplicar middleware de autenticación y validación
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 7.5 Write property tests para citas
    - **Property 10: Detección de conflictos de horario**
    - **Property 11: Ordenamiento de citas por hora**
    - **Property 12: Máquina de estados de citas**
    - **Property 13: Rechazo de citas con datos inválidos**
    - **Validates: Requirements 3.2, 3.4, 3.5, 3.6, 3.7, 3.8**

  - [x] 7.6 Write property tests para integridad referencial y validación
    - **Property 14: Integridad referencial en creación**
    - **Property 15: Protección de eliminación con dependientes**
    - **Property 16: Validación de formatos de email, teléfono y fecha**
    - **Property 17: Formato consistente de errores**
    - **Property 18: Rechazo de campos de texto excesivos**
    - **Validates: Requirements 5.4, 5.5, 7.1, 7.3, 7.5**

- [x] 8. Checkpoint - Verificar módulo de citas y backend completo
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Configurar proyecto frontend React
  - [x] 9.1 Inicializar proyecto React con TypeScript y configurar dependencias
    - Crear proyecto con Vite + React + TypeScript
    - Instalar dependencias: react-router-dom, axios, @tanstack/react-query, tailwindcss (o CSS framework)
    - Configurar estructura: `src/pages`, `src/components`, `src/services`, `src/hooks`, `src/types`
    - Configurar proxy de desarrollo para la API backend
    - _Requirements: 4.1_

  - [x] 9.2 Implementar servicio HTTP y contexto de autenticación
    - Crear cliente axios con interceptores para JWT (agregar token a requests, manejar 401)
    - Crear AuthContext con login, logout y estado del usuario
    - Crear página de Login con formulario de email/password
    - Crear ProtectedRoute component para rutas que requieren autenticación
    - _Requirements: 6.2, 6.3, 6.4_

- [x] 10. Implementar vistas del frontend
  - [x] 10.1 Implementar navegación principal y layout
    - Crear componente Layout con sidebar/navbar con secciones: Clientes, Mascotas, Citas
    - Configurar React Router con rutas para cada sección
    - Implementar componente de notificación (toast) para confirmaciones y errores
    - _Requirements: 4.1, 4.5, 4.6_

  - [x] 10.2 Implementar vista de Clientes
    - Crear página de listado paginado de clientes con campo de búsqueda
    - Crear formulario de creación/edición de cliente con validación de campos
    - Mostrar mensajes de error junto a campos con validación fallida
    - Mostrar estado vacío con botón para crear primer cliente
    - _Requirements: 4.2, 4.5, 4.6, 4.7_

  - [x] 10.3 Implementar vista de Mascotas
    - Crear página de listado paginado de mascotas con campo de búsqueda
    - Crear formulario de creación/edición de mascota con selector de cliente
    - Implementar soft-delete con confirmación visual
    - Mostrar estado vacío con botón para crear primera mascota
    - _Requirements: 4.3, 4.5, 4.6, 4.7_

  - [x] 10.4 Implementar vista de Citas (agenda diaria)
    - Crear página de agenda diaria mostrando citas organizadas por hora
    - Crear formulario de creación de cita con selector de mascota, fecha, hora y duración
    - Implementar botones de cancelar y completar cita con confirmación
    - Mostrar estado vacío con botón para crear primera cita
    - _Requirements: 4.4, 4.5, 4.6, 4.7_

  - [x] 10.5 Write unit tests para componentes React
    - Tests de renderizado para ClientList, PetList, AppointmentCalendar
    - Tests de notificaciones de éxito (visibles al menos 3 segundos)
    - Tests de mensajes de error junto a campos
    - Tests de estados vacíos
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 11. Integración y cableado final
  - [x] 11.1 Crear servidor Express principal y conectar todos los módulos
    - Crear `src/app.ts` que registre todos los middlewares, rutas y el error handler
    - Crear `src/server.ts` como entry point que inicie el servidor
    - Configurar CORS para permitir requests del frontend
    - Verificar que todos los endpoints funcionan end-to-end
    - _Requirements: 5.1, 5.2, 6.3_

  - [x] 11.2 Write integration tests end-to-end
    - Test del flujo completo: login → crear cliente → crear mascota → crear cita → cancelar cita
    - Verificar integridad referencial con base de datos real (testcontainers)
    - Verificar que errores de BD retornan 503 cuando hay timeout
    - _Requirements: 5.1, 5.3, 5.4, 5.5_

- [x] 12. Checkpoint final - Verificar aplicación completa
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los property tests validan propiedades universales de corrección
- Los unit tests validan ejemplos específicos y edge cases
- Se usa TypeScript tanto en backend como en frontend
- Se usa Vitest como test runner y fast-check para property-based testing

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4"] },
    { "id": 4, "tasks": ["2.5", "2.6"] },
    { "id": 5, "tasks": ["4.1", "5.1", "7.1"] },
    { "id": 6, "tasks": ["4.2", "5.2", "7.2"] },
    { "id": 7, "tasks": ["4.3", "5.3", "7.3"] },
    { "id": 8, "tasks": ["4.4", "5.4", "7.4"] },
    { "id": 9, "tasks": ["4.5", "5.5", "7.5", "7.6"] },
    { "id": 10, "tasks": ["9.1"] },
    { "id": 11, "tasks": ["9.2", "10.1"] },
    { "id": 12, "tasks": ["10.2", "10.3", "10.4"] },
    { "id": 13, "tasks": ["10.5", "11.1"] },
    { "id": 14, "tasks": ["11.2"] }
  ]
}
```
