# Requirements Document

## Introduction

Aplicación web para una clínica veterinaria que permite registrar clientes y sus mascotas, así como gestionar citas médicas. La aplicación consta de un frontend web y un backend en Node.js, con base de datos desplegada en AWS.

## Glossary

- **Sistema**: La aplicación web de clínica veterinaria en su conjunto (frontend + backend)
- **Cliente**: Persona dueña de una o más mascotas que se registra en el sistema
- **Mascota**: Animal registrado en el sistema asociado a un Cliente
- **Cita**: Reserva de un horario para atención veterinaria de una Mascota
- **Panel_de_Administración**: Interfaz web donde el personal de la clínica gestiona clientes, mascotas y citas
- **API**: Backend en Node.js que expone endpoints REST para las operaciones del sistema
- **Base_de_Datos**: Servicio de base de datos en AWS que almacena toda la información persistente

## Requirements

### Requirement 1: Registro de Clientes

**User Story:** Como personal de la clínica, quiero registrar clientes con sus datos de contacto, para poder identificarlos y comunicarme con ellos.

#### Acceptance Criteria

1. WHEN el personal ingresa los datos de un nuevo cliente (nombre completo entre 1 y 100 caracteres, teléfono entre 7 y 15 dígitos, correo electrónico con formato válido, dirección máximo 200 caracteres), THE API SHALL crear el registro del Cliente en la Base_de_Datos y retornar el Cliente creado con un identificador único
2. WHEN el personal solicita la lista de clientes, THE API SHALL retornar los Clientes registrados con sus datos de contacto paginados en grupos de máximo 50 registros por página
3. WHEN el personal busca un cliente por nombre o teléfono, THE API SHALL retornar los Clientes cuyo nombre o teléfono contengan parcialmente el criterio de búsqueda, hasta un máximo de 50 resultados
4. WHEN el personal actualiza los datos de un Cliente existente, THE API SHALL persistir los cambios en la Base_de_Datos y retornar el Cliente actualizado
5. IF el personal intenta registrar un Cliente sin nombre completo o sin al menos un dato de contacto (teléfono o correo electrónico), THEN THE API SHALL rechazar la solicitud con un mensaje de error indicando los campos obligatorios faltantes
6. IF el personal intenta actualizar un Cliente con un identificador que no existe en la Base_de_Datos, THEN THE API SHALL rechazar la solicitud con un mensaje de error indicando que el Cliente no fue encontrado
7. IF el personal intenta registrar un Cliente con un correo electrónico o teléfono que ya está asociado a otro Cliente existente, THEN THE API SHALL rechazar la solicitud con un mensaje de error indicando el dato duplicado

### Requirement 2: Registro de Mascotas

**User Story:** Como personal de la clínica, quiero registrar mascotas asociadas a un cliente, para llevar un control de los pacientes animales.

#### Acceptance Criteria

1. WHEN el personal ingresa los datos de una nueva mascota (nombre, especie, raza, fecha de nacimiento, peso, número de microchip, notas médicas) asociada a un Cliente existente, THE API SHALL crear el registro de la Mascota en la Base_de_Datos vinculada al Cliente, donde nombre tiene entre 1 y 100 caracteres, especie tiene entre 1 y 50 caracteres, raza tiene un máximo de 50 caracteres, peso está entre 0.01 y 999.99 kg, número de microchip es un campo opcional de máximo 25 caracteres alfanuméricos (puede ser nulo), y notas médicas tiene un máximo de 2000 caracteres
2. WHEN el personal consulta el perfil de un Cliente, THE API SHALL retornar la lista de Mascotas activas asociadas a dicho Cliente, excluyendo las marcadas como inactivas
3. WHEN el personal actualiza los datos de una Mascota existente, THE API SHALL validar los campos con las mismas restricciones que en el registro, persistir los cambios en la Base_de_Datos y retornar la Mascota actualizada
4. WHEN el personal elimina una Mascota del sistema, THE API SHALL marcar el registro como inactivo en la Base_de_Datos sin eliminarlo permanentemente
5. IF el personal intenta registrar o actualizar una Mascota sin nombre, sin especie, sin un Cliente asociado válido, o con valores fuera de los rangos permitidos, THEN THE API SHALL rechazar la solicitud con un mensaje de error indicando los campos inválidos
6. IF el personal intenta consultar, actualizar o eliminar una Mascota que no existe o que ya está inactiva, THEN THE API SHALL rechazar la solicitud con un mensaje de error indicando que la Mascota no fue encontrada

### Requirement 3: Programación de Citas

**User Story:** Como personal de la clínica, quiero programar citas para las mascotas, para organizar la agenda de atención veterinaria.

#### Acceptance Criteria

1. WHEN el personal programa una nueva cita indicando Mascota, fecha, hora, motivo de consulta (máximo 500 caracteres) y duración estimada (entre 15 y 120 minutos, en incrementos de 15 minutos), THE API SHALL crear la Cita en la Base_de_Datos y retornar la Cita creada con un identificador único
2. WHEN el personal consulta las citas de un día específico, THE API SHALL retornar todas las Citas programadas para esa fecha ordenadas por hora, o una lista vacía si no existen Citas para dicha fecha
3. WHEN el personal consulta las citas de una Mascota específica, THE API SHALL retornar el historial de Citas de dicha Mascota ordenado por fecha descendente, limitado a un máximo de 100 resultados por consulta
4. WHEN el personal cancela una Cita existente que se encuentra en estado "programada", THE API SHALL actualizar el estado de la Cita a "cancelada" en la Base_de_Datos
5. WHEN el personal marca una Cita existente que se encuentra en estado "programada" como completada, THE API SHALL actualizar el estado de la Cita a "completada" en la Base_de_Datos
6. IF el personal intenta programar una Cita cuyo rango de tiempo (hora de inicio + duración estimada) se solapa con el rango de tiempo de otra Cita activa, THEN THE API SHALL rechazar la solicitud indicando el conflicto de horario
7. IF el personal intenta programar una Cita sin Mascota asociada, sin fecha, sin hora, con una fecha en el pasado, o con una duración fuera del rango permitido, THEN THE API SHALL rechazar la solicitud con un mensaje de error indicando los campos inválidos
8. IF el personal intenta cancelar o completar una Cita que ya se encuentra en estado "cancelada" o "completada", THEN THE API SHALL rechazar la solicitud indicando que la transición de estado no es permitida

### Requirement 4: Interfaz Web de Gestión

**User Story:** Como personal de la clínica, quiero una interfaz web intuitiva, para poder gestionar clientes, mascotas y citas de forma eficiente.

#### Acceptance Criteria

1. THE Panel_de_Administración SHALL presentar una navegación principal con secciones para Clientes, Mascotas y Citas
2. WHEN el usuario navega a la sección de Clientes, THE Panel_de_Administración SHALL mostrar un listado paginado de clientes con un campo de búsqueda y botones para crear y editar
3. WHEN el usuario navega a la sección de Mascotas, THE Panel_de_Administración SHALL mostrar un listado paginado de mascotas con un campo de búsqueda y botones para crear y editar
4. WHEN el usuario navega a la sección de Citas, THE Panel_de_Administración SHALL mostrar una vista de agenda diaria con las citas programadas organizadas por hora
5. WHEN el usuario realiza una operación exitosa (crear, actualizar, cancelar), THE Panel_de_Administración SHALL mostrar una notificación de confirmación visible durante al menos 3 segundos
6. IF una operación falla debido a errores de validación o del servidor, THEN THE Panel_de_Administración SHALL mostrar un mensaje de error junto al campo o formulario correspondiente indicando la causa del fallo
7. WHEN una sección no contiene registros, THE Panel_de_Administración SHALL mostrar un mensaje indicando que no hay datos disponibles y un botón para crear el primer registro

### Requirement 5: Persistencia en AWS

**User Story:** Como equipo de desarrollo, quiero que la base de datos esté en AWS, para garantizar disponibilidad y escalabilidad del almacenamiento.

#### Acceptance Criteria

1. THE API SHALL conectarse a una instancia de Base_de_Datos gestionada en AWS para todas las operaciones de lectura y escritura
2. THE API SHALL utilizar variables de entorno para configurar la conexión a la Base_de_Datos (host, puerto, nombre de base de datos y credenciales) sin credenciales hardcodeadas en el código fuente
3. IF la conexión a la Base_de_Datos no se establece dentro de 5 segundos, THEN THE API SHALL retornar un error HTTP 503 (Service Unavailable) al cliente con un mensaje indicando que el servicio no está disponible temporalmente
4. THE Base_de_Datos SHALL mantener la integridad referencial entre Clientes, Mascotas y Citas, de modo que no sea posible crear una Mascota sin un Cliente existente, ni crear una Cita sin una Mascota existente
5. IF se intenta eliminar un Cliente que tiene Mascotas asociadas o una Mascota que tiene Citas activas, THEN THE API SHALL rechazar la operación con un mensaje de error indicando que existen registros dependientes

### Requirement 6: Autenticación y Gestión de Usuarios del Personal

**User Story:** Como administrador de la clínica, quiero registrar usuarios del personal (veterinarios y recepcionistas) para que puedan iniciar sesión y realizar operaciones en el sistema de forma segura.

#### Acceptance Criteria

1. WHEN un administrador crea un nuevo usuario indicando nombre completo (1-100 caracteres), correo electrónico con formato válido, contraseña (mínimo 8 caracteres) y rol (veterinario o recepcionista), THE API SHALL crear el registro del usuario con la contraseña hasheada y retornar el usuario creado sin exponer la contraseña
2. WHEN un usuario registrado envía sus credenciales (correo electrónico y contraseña) al endpoint de login, THE API SHALL verificar las credenciales y retornar un token JWT válido junto con los datos básicos del usuario (id, nombre, rol)
3. WHEN un usuario envía una solicitud a cualquier endpoint protegido con un token JWT válido en el header Authorization, THE API SHALL procesar la solicitud normalmente
4. IF un usuario envía una solicitud a un endpoint protegido sin token, con un token expirado, o con un token inválido, THEN THE API SHALL rechazar la solicitud con un error HTTP 401 indicando que la autenticación es requerida
5. IF un administrador intenta crear un usuario con un correo electrónico que ya existe en el sistema, THEN THE API SHALL rechazar la solicitud con un error indicando que el correo ya está registrado
6. WHEN el personal consulta la lista de usuarios, THE API SHALL retornar los usuarios activos con su nombre, correo electrónico y rol, sin exponer contraseñas

### Requirement 7: Validación y Manejo de Errores

**User Story:** Como personal de la clínica, quiero que el sistema valide los datos ingresados, para evitar información incorrecta o incompleta.

#### Acceptance Criteria

1. WHEN la API recibe una solicitud con datos de entrada que incluyen correo electrónico, teléfono o fechas, THE API SHALL validar que el correo electrónico contenga exactamente un carácter "@" seguido de un dominio con al menos un punto, que el teléfono contenga entre 7 y 15 dígitos numéricos (permitiendo opcionalmente un prefijo "+"), y que las fechas cumplan el formato ISO 8601 (YYYY-MM-DD) y representen una fecha calendario válida; si alguna validación falla, THE API SHALL retornar un error HTTP 400 con un mensaje indicando qué campo falló la validación y el formato esperado
2. IF la API recibe una solicitud con un identificador de recurso que no existe en la Base_de_Datos, THEN THE API SHALL retornar un error HTTP 404 con un mensaje indicando el tipo de recurso y el identificador que no fue encontrado
3. THE API SHALL retornar todas las respuestas de error en formato JSON con un campo "message" que identifique el campo o recurso involucrado y la razón del fallo, y un campo "statusCode" numérico correspondiente al código HTTP de la respuesta
4. IF la API recibe una solicitud con un cuerpo JSON malformado, THEN THE API SHALL retornar un error HTTP 400 con un mensaje indicando que el cuerpo de la solicitud no es JSON válido
5. WHEN la API recibe una solicitud con campos de texto (nombre, dirección, motivo de consulta, notas médicas), THE API SHALL rechazar con un error HTTP 400 cualquier campo que exceda 500 caracteres de longitud, indicando el campo que excede el límite
