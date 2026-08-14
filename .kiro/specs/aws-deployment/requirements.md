# Requirements Document

## Introduction

Este documento define los requisitos formales para el despliegue de la aplicación web de clínica veterinaria en Amazon Web Services (AWS). La solución abarca la infraestructura de red (VPC, subnets, security groups), la instancia de cómputo (EC2), la base de datos gestionada (RDS PostgreSQL), el proxy reverso (Nginx), el gestor de procesos (PM2), y los scripts de automatización para despliegue y verificación.

## Glossary

- **VPC**: Virtual Private Cloud — red virtual aislada en AWS con rango CIDR 10.0.0.0/16
- **EC2**: Elastic Compute Cloud — instancia de servidor virtual que ejecuta la aplicación
- **RDS**: Relational Database Service — servicio gestionado de base de datos PostgreSQL
- **Security_Group**: Firewall virtual que controla el tráfico de entrada y salida a un recurso AWS
- **Nginx**: Servidor web que actúa como proxy reverso frente a la aplicación Node.js
- **PM2**: Gestor de procesos para aplicaciones Node.js en producción
- **Script_Despliegue**: Conjunto de scripts bash que automatizan la configuración y despliegue de la aplicación
- **Smoke_Test**: Script de verificación automática que valida el funcionamiento básico post-despliegue
- **SPA_Routing**: Patrón de enrutamiento para Single Page Applications donde el servidor devuelve index.html para rutas no-API
- **Subnet_Publica**: Subred con acceso a Internet a través del Internet Gateway (10.0.1.0/24)
- **Subnet_Privada**: Subred sin acceso directo desde Internet, usada para recursos internos como RDS

## Requirements

### Requisito 1: Infraestructura de Red (VPC y Networking)

**User Story:** Como administrador de infraestructura, quiero una VPC configurada con subnets públicas y privadas, para que los recursos estén aislados correctamente según su nivel de exposición a Internet.

#### Criterios de Aceptación

1. THE VPC SHALL tener el rango CIDR 10.0.0.0/16 con un Internet Gateway asociado, DNS resolution habilitado y DNS hostnames habilitado
2. THE VPC SHALL contener una Subnet_Publica (10.0.1.0/24) en la zona de disponibilidad us-east-1a con ruta a Internet Gateway y con la opción de auto-asignación de IP pública habilitada
3. THE VPC SHALL contener al menos dos Subnet_Privada (10.0.2.0/24 en us-east-1a, 10.0.3.0/24 en us-east-1b) asociadas a una tabla de rutas que contenga únicamente la ruta local (10.0.0.0/16) sin ruta hacia el Internet Gateway ni hacia un NAT Gateway
4. WHEN se crea la tabla de rutas pública, THE VPC SHALL enrutar el tráfico 0.0.0.0/0 hacia el Internet Gateway
5. THE VPC SHALL asociar la Subnet_Publica a la tabla de rutas pública y las Subnet_Privada a una tabla de rutas privada independiente

### Requisito 2: Security Groups y Control de Acceso de Red

**User Story:** Como administrador de seguridad, quiero security groups que limiten el acceso a cada recurso según el principio de mínimo privilegio, para que la base de datos no sea accesible desde Internet y el SSH esté restringido.

#### Criterios de Aceptación

1. THE Security_Group sg-web-server SHALL permitir tráfico de entrada TCP en puertos 80 y 443 desde 0.0.0.0/0
2. THE Security_Group sg-web-server SHALL permitir tráfico de entrada TCP en puerto 22 exclusivamente desde la IP del administrador, configurada como un único CIDR /32 parametrizable en la definición de la infraestructura
3. THE Security_Group sg-web-server SHALL permitir todo el tráfico de salida (todos los protocolos, todos los puertos, destino 0.0.0.0/0)
4. THE Security_Group sg-database SHALL permitir tráfico de entrada TCP en puerto 5432 exclusivamente desde el Security_Group sg-web-server como única regla de ingreso
5. IF un intento de conexión al puerto 5432 de RDS se origina desde una IP que no pertenece a sg-web-server, THEN THE Security_Group sg-database SHALL rechazar la conexión sin enviar respuesta al origen (deny implícito)
6. THE Security_Group sg-database SHALL permitir todo el tráfico de salida (todos los protocolos, todos los puertos, destino 0.0.0.0/0)
7. THE Security_Group sg-database SHALL no contener ninguna regla de entrada que permita tráfico desde 0.0.0.0/0 en ningún puerto

### Requisito 3: Instancia EC2 y Configuración del Servidor

**User Story:** Como desarrollador, quiero una instancia EC2 configurada con Node.js, PM2 y Nginx, para que la aplicación pueda ejecutarse en producción de forma estable y accesible.

#### Criterios de Aceptación

1. THE EC2 SHALL usar una AMI Amazon Linux 2023 con tipo de instancia t2.micro o t3.micro
2. THE EC2 SHALL tener un Elastic IP asociado para mantener una dirección IP pública fija
3. THE EC2 SHALL tener Node.js 20 LTS, PM2, Nginx y el cliente PostgreSQL 15 instalados, verificables mediante los comandos node --version, pm2 --version, nginx -v y psql --version
4. THE EC2 SHALL estar ubicada en la Subnet_Publica con el Security_Group sg-web-server asignado
5. THE EC2 SHALL tener un volumen EBS de al menos 8 GB tipo gp3
6. THE EC2 SHALL tener un Key Pair SSH asociado para acceso remoto mediante archivo .pem

### Requisito 4: Base de Datos RDS PostgreSQL

**User Story:** Como desarrollador, quiero una instancia RDS PostgreSQL gestionada en subnets privadas, para que los datos de la aplicación estén almacenados de forma segura con backups automáticos.

#### Criterios de Aceptación

1. THE RDS SHALL usar el motor PostgreSQL versión 15 o 16 con clase de instancia db.t3.micro, almacenamiento gp2 de 20 GB y despliegue en una sola zona de disponibilidad (Single-AZ)
2. THE RDS SHALL estar ubicada en las Subnet_Privada con el Security_Group sg-database asignado
3. THE RDS SHALL tener el acceso público deshabilitado
4. THE RDS SHALL tener backups automáticos con retención de 7 días y protección contra eliminación habilitada
5. THE RDS SHALL tener encriptación en reposo habilitada mediante AWS KMS
6. THE RDS SHALL usar un Subnet Group que incluya ambas Subnet_Privada (us-east-1a y us-east-1b)
7. THE RDS SHALL tener una base de datos inicial creada con el nombre especificado en la variable de entorno DB_NAME del archivo .env de la EC2

### Requisito 5: Proxy Reverso con Nginx

**User Story:** Como administrador del sistema, quiero que Nginx actúe como proxy reverso frente a la aplicación Node.js, para que las peticiones HTTP del puerto 80 se redirijan correctamente al puerto 3000 del backend.

#### Criterios de Aceptación

1. WHEN una petición HTTP llega al puerto 80, THE Nginx SHALL redirigirla al puerto 3000 de localhost mediante proxy_pass
2. THE Nginx SHALL incluir los headers Host, X-Real-IP, X-Forwarded-For y X-Forwarded-Proto en las peticiones reenviadas al backend, donde X-Real-IP contiene la IP del cliente original, X-Forwarded-For contiene la cadena de IPs del cliente, y X-Forwarded-Proto contiene el esquema de la petición original (http o https)
3. WHEN una petición solicita un archivo estático (js, css, png, jpg, svg, woff, woff2), THE Nginx SHALL responder con el header Cache-Control con directiva public y max-age de 604800 segundos (7 días)
4. IF el body de una petición excede 10 MB, THEN THE Nginx SHALL rechazar la petición con un código de estado HTTP 413 sin reenviarla al backend
5. THE Nginx SHALL estar habilitado como servicio de systemd para iniciar automáticamente con el sistema operativo
6. IF el backend no responde dentro de 60 segundos, THEN THE Nginx SHALL devolver un código de estado HTTP 504 al cliente

### Requisito 6: Gestión de Procesos con PM2

**User Story:** Como desarrollador, quiero que PM2 gestione el proceso de la aplicación Node.js, para que se reinicie automáticamente si falla y persista entre reinicios del servidor.

#### Criterios de Aceptación

1. THE PM2 SHALL ejecutar el archivo dist/server.js como proceso llamado "veterinary-api"
2. WHEN el proceso de la aplicación falla o se detiene inesperadamente, THE PM2 SHALL reiniciarlo automáticamente con un máximo de 15 reintentos en una ventana de 15 minutos para prevenir bucles de reinicio infinitos
3. WHEN la aplicación supera 256 MB de uso de memoria, THE PM2 SHALL reiniciar el proceso
4. THE PM2 SHALL estar configurado con systemd para arrancar automáticamente al iniciar la EC2
5. THE PM2 SHALL escribir logs de error y salida en el directorio /home/ec2-user/app/logs/ con rotación automática cuando cada archivo alcance 10 MB, conservando un máximo de 10 archivos rotados
6. THE PM2 SHALL cargar las variables de entorno desde el archivo .env ubicado en el directorio de la aplicación al iniciar el proceso

### Requisito 7: Servicio de Frontend Estático (SPA Routing)

**User Story:** Como usuario de la aplicación, quiero acceder al frontend React desde el mismo servidor, para que la navegación del lado del cliente funcione correctamente sin un servidor dedicado para archivos estáticos.

#### Criterios de Aceptación

1. THE EC2 SHALL servir los archivos estáticos del frontend compilado (HTML, JS, CSS, imágenes, fuentes) desde la ruta frontend/dist/ con los tipos MIME correspondientes
2. WHEN una petición llega a una ruta que coincide con un archivo existente en frontend/dist/, THE EC2 SHALL responder con el contenido de dicho archivo y código HTTP 200
3. WHEN una petición llega a una ruta que no comienza con /api/ y no coincide con un archivo estático existente, THE EC2 SHALL responder con el archivo index.html del frontend y código HTTP 200
4. WHEN una petición llega a una ruta que comienza con /api/, THE EC2 SHALL procesarla mediante los controladores de la API del backend sin devolver el archivo index.html
5. IF el archivo frontend/dist/index.html no existe al momento de recibir una petición de fallback SPA, THEN THE EC2 SHALL responder con código HTTP 500 y un mensaje de error indicando que el frontend no está disponible
6. THE EC2 SHALL servir el frontend y la API desde el mismo origen (mismo host y puerto), eliminando la necesidad de configuración CORS para las peticiones del frontend al backend

### Requisito 8: Scripts de Automatización del Despliegue

**User Story:** Como desarrollador, quiero scripts automatizados para configurar el servidor y desplegar la aplicación, para que el proceso sea repetible y menos propenso a errores humanos.

#### Criterios de Aceptación

1. THE Script_Despliegue setup-ec2.sh SHALL instalar todas las dependencias necesarias (Node.js 20, PM2, Nginx, PostgreSQL client) en una EC2 nueva y terminar con código de salida 0 si todas las instalaciones fueron exitosas
2. THE Script_Despliegue deploy.sh SHALL aceptar dos parámetros obligatorios (IP de la EC2 y ruta al archivo .pem), y IF alguno falta, THEN SHALL mostrar un mensaje de uso y terminar con código de salida 1
3. THE Script_Despliegue deploy.sh SHALL compilar el backend y frontend localmente, transferir los archivos a la EC2 mediante SCP e instalar dependencias de producción
4. WHEN se ejecuta deploy.sh, THE Script_Despliegue SHALL reiniciar la aplicación con PM2 y guardar el estado para persistencia
5. THE Script_Despliegue run-migrations.sh SHALL ejecutar los archivos de migración SQL contra la instancia RDS usando las credenciales del archivo .env y terminar con código de salida 0 si las migraciones fueron exitosas
6. THE Script_Despliegue setup-nginx.sh SHALL crear la configuración del proxy reverso, verificarla con nginx -t y reiniciar el servicio, y IF nginx -t falla, THEN SHALL mostrar el error y terminar sin reiniciar Nginx

### Requisito 9: Verificación Post-Despliegue (Smoke Tests)

**User Story:** Como desarrollador, quiero verificar automáticamente que la aplicación funciona correctamente después de cada despliegue, para detectar problemas de configuración de forma inmediata.

#### Criterios de Aceptación

1. WHEN se ejecuta el smoke test, THE Smoke_Test SHALL verificar que el frontend responde con código HTTP 200 en la ruta raíz dentro de un tiempo máximo de 10 segundos por petición
2. WHEN se ejecuta el smoke test, THE Smoke_Test SHALL verificar que la API responde con código HTTP 401 en el endpoint /api/auth/me dentro de un tiempo máximo de 10 segundos por petición
3. WHEN se ejecuta el smoke test, THE Smoke_Test SHALL verificar que el endpoint de login responde con código HTTP 401 o 400 ante credenciales inválidas dentro de un tiempo máximo de 10 segundos por petición
4. WHEN se ejecuta el smoke test, THE Smoke_Test SHALL mostrar para cada verificación individual el nombre de la verificación, el código HTTP esperado, el código HTTP obtenido y el estado (PASS o FAIL)
5. WHEN todas las verificaciones del smoke test resultan PASS, THE Smoke_Test SHALL terminar con código de salida 0, y WHEN al menos una verificación resulta FAIL, THE Smoke_Test SHALL terminar con código de salida 1
6. IF una petición del smoke test no recibe respuesta dentro del tiempo máximo o el servidor es inalcanzable, THEN THE Smoke_Test SHALL reportar dicha verificación como FAIL indicando que el endpoint no respondió

### Requisito 10: Seguridad de Credenciales y Variables de Entorno

**User Story:** Como administrador de seguridad, quiero que las credenciales sensibles estén protegidas adecuadamente, para que nunca se expongan en código fuente, logs públicos ni respuestas de la API.

#### Criterios de Aceptación

1. THE EC2 SHALL almacenar todas las credenciales sensibles (DB_PASSWORD, JWT_SECRET, DB_USER, DB_HOST, DB_PORT) en un archivo .env con permisos 600 y propietario exclusivo del usuario que ejecuta la aplicación (ec2-user)
2. IF una respuesta de la API o un archivo servido es solicitado, THEN THE EC2 SHALL garantizar que ninguna variable definida en el archivo .env aparezca como valor literal en el cuerpo de la respuesta HTTP
3. THE EC2 SHALL excluir el archivo .env del control de versiones mediante .gitignore
4. THE EC2 SHALL usar una contraseña de RDS generada mediante un generador criptográficamente seguro con un mínimo de 16 caracteres que incluya al menos una letra mayúscula, una minúscula, un dígito y un carácter especial
5. THE EC2 SHALL usar un JWT_SECRET generado mediante un generador criptográficamente seguro de al menos 32 caracteres alfanuméricos
6. IF la aplicación genera un error en producción, THEN THE EC2 SHALL responder sin incluir stack traces ni valores de variables de entorno en el cuerpo de la respuesta
7. WHILE la aplicación está en ejecución, THE EC2 SHALL garantizar que los logs generados por PM2 no contengan valores literales de las variables DB_PASSWORD ni JWT_SECRET

### Requisito 11: SSL/HTTPS (Configuración Opcional)

**User Story:** Como administrador del sistema, quiero la opción de habilitar HTTPS con certificados SSL, para que la comunicación entre los usuarios y el servidor esté cifrada cuando se disponga de un dominio.

#### Criterios de Aceptación

1. WHERE un dominio está configurado y apuntando a la EC2, THE EC2 SHALL tener Certbot instalado y THE Nginx SHALL tener un certificado SSL obtenido mediante Let's Encrypt configurado para servir tráfico HTTPS en el puerto 443
2. WHERE SSL está habilitado, WHEN una petición HTTP llega al puerto 80, THE Nginx SHALL responder con una redirección permanente (HTTP 301) hacia la misma ruta en HTTPS (puerto 443)
3. WHERE SSL está habilitado, THE EC2 SHALL tener un timer de systemd configurado para ejecutar la renovación del certificado 2 veces al día, renovando cuando falten menos de 30 días para la expiración
4. WHERE SSL está habilitado, IF la renovación automática del certificado falla, THEN THE EC2 SHALL registrar el error en los logs de systemd sin detener el servicio Nginx activo
