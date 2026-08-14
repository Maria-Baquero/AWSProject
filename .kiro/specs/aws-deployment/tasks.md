# Implementation Plan: AWS Deployment

## Overview

Este plan implementa el despliegue completo de la aplicación veterinaria en AWS. Los scripts se crean en un directorio `deploy/` en la raíz del proyecto e incluyen: configuración del servidor EC2, proxy reverso Nginx, gestión de procesos con PM2, ejecución de migraciones, despliegue automatizado y verificación post-despliegue (smoke tests). También se modifica el backend para servir el frontend estático con SPA routing.

## Tasks

- [x] 1. Configurar estructura del proyecto para despliegue
  - [x] 1.1 Crear directorio deploy/ y archivo de configuración PM2
    - Crear el directorio `deploy/` en la raíz del proyecto
    - Crear `ecosystem.config.js` con la configuración de PM2: nombre "veterinary-api", script "./dist/server.js", max_memory_restart "256M", logs en /home/ec2-user/app/logs/, variables de entorno de producción
    - Crear archivo `.env.example` actualizado con todas las variables necesarias para producción (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET, JWT_EXPIRATION, PORT, NODE_ENV)
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 10.1_

  - [x] 1.2 Crear script setup-ec2.sh para configuración inicial del servidor
    - Crear `deploy/setup-ec2.sh` que instale Node.js 20 LTS, PM2, Nginx, PostgreSQL client 15
    - El script debe crear el directorio /home/ec2-user/app/logs/
    - Habilitar Nginx como servicio de systemd para arranque automático
    - Configurar PM2 con systemd para arranque automático al iniciar la EC2
    - El script debe terminar con código 0 si todo es exitoso y mostrar las versiones instaladas
    - _Requirements: 3.3, 5.5, 6.4, 8.1_

- [x] 2. Implementar modificación del backend para servir frontend estático
  - [x] 2.1 Agregar middleware de archivos estáticos y SPA routing en Express
    - Modificar `src/app.ts` para servir archivos estáticos desde `frontend/dist/` usando `express.static`
    - Agregar middleware de fallback SPA: rutas que no comienzan con `/api/` y no coinciden con archivos estáticos devuelven `index.html`
    - Las rutas `/api/*` deben seguir siendo procesadas por los controladores existentes
    - Manejar el caso donde `frontend/dist/index.html` no existe: responder con HTTP 500 y mensaje de error
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 2.2 Escribir tests unitarios para SPA routing y servicio de archivos estáticos
    - **Property 1: SPA Routing — Rutas no-API devuelven index.html**
    - **Property 2: API Routing — Rutas /api/ son procesadas por el backend**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5**

- [x] 3. Checkpoint - Verificar que el backend sirve frontend correctamente
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Crear scripts de despliegue y configuración de Nginx
  - [x] 4.1 Crear script setup-nginx.sh para configuración del proxy reverso
    - Crear `deploy/setup-nginx.sh` que genere `/etc/nginx/conf.d/veterinary-app.conf`
    - Configurar proxy_pass al puerto 3000 con headers: Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto
    - Configurar cache de archivos estáticos (js, css, png, jpg, svg, woff, woff2) con Cache-Control public y max-age 604800
    - Configurar client_max_body_size 10M para rechazar requests mayores con HTTP 413
    - Configurar timeouts de proxy a 60 segundos (genera HTTP 504 si el backend no responde)
    - Eliminar configuración default de Nginx si existe
    - Verificar configuración con `nginx -t` antes de reiniciar; si falla, mostrar error y no reiniciar
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 4.2 Crear script deploy.sh para despliegue automatizado
    - Crear `deploy/deploy.sh` que acepte dos parámetros obligatorios: IP de EC2 y ruta al archivo .pem
    - Validar parámetros: si falta alguno, mostrar mensaje de uso y terminar con código 1
    - Compilar backend (`npm run build`) y frontend (`cd frontend && npm run build`) localmente
    - Empaquetar archivos con tar (dist/, frontend/dist/, package.json, package-lock.json, migrations/, ecosystem.config.js) excluyendo node_modules
    - Transferir archivos con SCP a la EC2
    - En la EC2: descomprimir, instalar dependencias de producción, reiniciar PM2 y guardar estado
    - Limpiar archivo tar local al finalizar
    - _Requirements: 8.2, 8.3, 8.4_

  - [x] 4.3 Crear script run-migrations.sh para ejecutar migraciones en RDS
    - Crear `deploy/run-migrations.sh` que cargue variables del archivo .env
    - Ejecutar archivos de migración SQL contra RDS usando psql con las credenciales del .env
    - Terminar con código 0 si las migraciones fueron exitosas
    - Mostrar host y database antes de ejecutar
    - _Requirements: 8.5_

- [x] 5. Implementar seguridad de credenciales y configuración de producción
  - [x] 5.1 Crear script de generación de credenciales seguras
    - Crear `deploy/generate-env.sh` que genere un archivo .env con credenciales seguras
    - DB_PASSWORD: generada con mínimo 16 caracteres, incluyendo mayúsculas, minúsculas, dígitos y caracteres especiales
    - JWT_SECRET: generado con mínimo 32 caracteres alfanuméricos criptográficamente seguros
    - Establecer permisos 600 en el archivo .env generado
    - Incluir placeholder para DB_HOST (endpoint de RDS) que el usuario debe completar
    - _Requirements: 10.1, 10.4, 10.5_

  - [x] 5.2 Configurar manejo de errores de producción en el backend
    - Verificar/agregar middleware de error en `src/app.ts` que en NODE_ENV=production NO incluya stack traces ni valores de variables de entorno en las respuestas de error
    - Asegurar que el error handler genérico devuelva solo un mensaje genérico en producción
    - _Requirements: 10.6_

  - [x] 5.3 Escribir tests para verificar que las credenciales no se exponen en respuestas
    - **Property 3: Variables de entorno no expuestas en respuestas**
    - **Validates: Requirements 10.2, 10.6**

- [x] 6. Checkpoint - Verificar scripts de despliegue y seguridad
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implementar smoke tests y SSL opcional
  - [x] 7.1 Crear script smoke-test.sh de verificación post-despliegue
    - Crear `deploy/smoke-test.sh` que acepte la IP de la EC2 como parámetro
    - Test 1: verificar que el frontend responde con HTTP 200 en la ruta raíz (timeout 10s)
    - Test 2: verificar que /api/auth/me responde con HTTP 401 (timeout 10s)
    - Test 3: verificar que /api/auth/login responde con HTTP 401 o 400 ante credenciales inválidas (timeout 10s)
    - Para cada verificación mostrar: nombre, código esperado, código obtenido, estado (PASS/FAIL)
    - Terminar con código 0 si todos PASS, código 1 si alguno FAIL
    - Si el servidor no responde o timeout, reportar como FAIL indicando que el endpoint no respondió
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 7.2 Crear script setup-ssl.sh para configuración opcional de HTTPS
    - Crear `deploy/setup-ssl.sh` que acepte el dominio como parámetro obligatorio
    - Instalar Certbot y el plugin de Nginx
    - Obtener certificado SSL con Let's Encrypt para el dominio
    - Configurar renovación automática con timer de systemd (2 veces al día)
    - Si la renovación falla, registrar el error sin detener Nginx
    - Validar parámetro de dominio; si no se proporciona, mostrar uso y salir con código 1
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 8. Integrar configuración PM2 con log rotation
  - [x] 8.1 Configurar PM2 log rotation y límites de reinicio
    - Actualizar `ecosystem.config.js` con: max_restarts 15, min_uptime "15000" (para ventana de reintentos)
    - Crear script `deploy/setup-pm2-logrotate.sh` que instale pm2-logrotate y configure: max_size 10M, retain 10 archivos
    - Documentar en el ecosystem.config.js que los logs van a /home/ec2-user/app/logs/ con error_file y out_file
    - _Requirements: 6.2, 6.3, 6.5_

- [x] 9. Documentación de infraestructura AWS (referencia para creación manual)
  - [x] 9.1 Crear archivo de documentación de infraestructura
    - Crear `deploy/INFRASTRUCTURE.md` con instrucciones paso a paso para crear la infraestructura en la consola AWS
    - Documentar la VPC (10.0.0.0/16), subnets (pública 10.0.1.0/24, privadas 10.0.2.0/24, 10.0.3.0/24), Internet Gateway y tablas de rutas
    - Documentar Security Groups: sg-web-server (puertos 80, 443, 22 restringido) y sg-database (5432 solo desde sg-web-server)
    - Documentar EC2: AMI Amazon Linux 2023, t2.micro, Elastic IP, 8GB gp3, Key Pair
    - Documentar RDS: PostgreSQL 15/16, db.t3.micro, 20GB gp2, Single-AZ, sin acceso público, backups 7 días, encriptación KMS, subnet group con ambas subnets privadas
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 10. Final checkpoint - Verificar todos los artefactos de despliegue
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- La infraestructura AWS (VPC, subnets, security groups, EC2, RDS) se crea manualmente en la consola de AWS siguiendo la documentación generada en el task 9.1
- Los scripts de despliegue asumen que la infraestructura ya está creada y la EC2 es accesible por SSH
- Property tests validate universal correctness properties del SPA routing y seguridad de credenciales

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "4.1", "4.3", "5.1"] },
    { "id": 2, "tasks": ["2.2", "4.2", "5.2"] },
    { "id": 3, "tasks": ["5.3", "7.1", "7.2"] },
    { "id": 4, "tasks": ["8.1"] },
    { "id": 5, "tasks": ["9.1"] }
  ]
}
```
