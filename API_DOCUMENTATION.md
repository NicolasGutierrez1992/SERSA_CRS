# SERSA CRS - Documentación de API

## Resumen

Este documento describe los endpoints de la API REST de SERSA CRS (Sistema de Gestión de Certificados para Controladores Fiscales).

## Autenticación

Todos los endpoints (excepto login) requieren un token JWT en el header Authorization:
```
Authorization: Bearer <token>
```

## Endpoints

### Autenticación

#### POST /auth/login
Iniciar sesión con CUIT y contraseña.

**Request:**
```json
{
  "cuit": "20123456789",
  "password": "contraseña123"
}
```

**Response (Login exitoso):**
```json
{
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "id_rol": 1,
  "id_usuario": 123,
  "nombre": "Juan Pérez"
}
```

**Response (Debe cambiar contraseña):**
```json
{
  "must_change_password": true,
  "id_usuario": 123,
  "message": "Debe cambiar su contraseña antes de continuar"
}
```

#### POST /auth/change-password
Cambiar contraseña (primer login o cambio voluntario).

**Request:**
```json
{
  "id_usuario": 123,
  "newPassword": "NuevaContraseña123!",
  "currentPassword": "contraseña_actual" // Opcional
}
```

#### POST /auth/admin/reset-password
Resetear contraseña de un usuario (solo admin).

**Request:**
```json
{
  "id_usuario": 123,
  "nuevaPassword": "PasswordTemporal123!"
}
```

### Usuarios

#### GET /users
Listar todos los usuarios (solo admin).

**Query params:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 50)
- `role`: Filtrar por rol
- `status`: Filtrar por estado

#### POST /users
Crear nuevo usuario (solo admin).

**Request:**
```json
{
  "nombre": "Juan Pérez",
  "cuit": "20123456789", 
  "mail": "juan@example.com",
  "password": "Password123!",
  "id_rol": 2,
  "limite_descargas": 10
}
```

#### PUT /users/:id
Editar usuario existente (solo admin).

#### DELETE /users/:id
Eliminar usuario (soft delete, solo admin).

#### GET /users/roles
Listar roles disponibles (solo admin).

### Descargas

#### POST /downloads/start
Iniciar proceso de descarga de certificado.

**Request:**
```json
{
  "certificateId": "uuid-del-certificado"
}
```

**Response:**
```json
{
  "downloadId": "uuid-de-la-descarga",
  "message": "Descarga iniciada correctamente",
  "pendingCount": 3,
  "limit": 10,
  "percentage": 30
}
```

#### GET /downloads/:id/status
Obtener estado y logs de una descarga.

**Response:**
```json
{
  "id_descarga": "uuid",
  "estado": "Pendiente de Facturar",
  "logs": [
    {"timestamp": "2025-01-01T00:00:00Z", "message": "Descarga iniciada", "step": "INIT"}
  ],
  "certificado_nombre": "Certificado Ejemplo",
  "usuario_nombre": "Juan Pérez"
}
```

#### GET /downloads
Listar todas las descargas con filtros (solo admin).

**Query params:**
- `estado`: Filtrar por estado
- `usuario_id`: Filtrar por usuario
- `controlador_id`: Filtrar por controlador
- `fecha_desde`: Fecha desde (YYYY-MM-DD)
- `fecha_hasta`: Fecha hasta (YYYY-MM-DD)
- `page`: Página
- `limit`: Elementos por página

#### GET /downloads/usuario/:id
Listar descargas de un usuario específico.

#### PUT /downloads/:id/estado
Cambiar estado de una descarga (solo admin).

**Request:**
```json
{
  "estado": "Facturado"
}
```

#### PUT /downloads/batch/estado
Cambio masivo de estado de descargas (solo admin).

**Request:**
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"],
  "estado": "Facturado"
}
```

#### GET /downloads/certificates/available
Obtener certificados disponibles para descarga.

**Query params:**
- `controlador_id`: Filtrar por controlador
- `search`: Búsqueda por nombre o controlador

#### GET /downloads/certificates/:id/preview
Obtener detalle de certificado antes de descarga.

#### GET /downloads/usuario/:id/summary
Obtener resumen de descargas para un usuario.

**Response:**
```json
{
  "total_descargas": 15,
  "pendientes": 3,
  "facturadas": 12,
  "limite_descargas": 10,
  "nombre": "Juan Pérez",
  "percentage_used": 30,
  "can_download": true
}
```

### Auditoría

#### GET /audit
Consultar historial de auditoría (solo admin).

**Query params:**
- `accion`: Filtrar por tipo de acción
- `actor_id`: Filtrar por usuario que realizó la acción
- `objetivo_tipo`: Filtrar por tipo de objeto afectado
- `desde`: Fecha desde
- `hasta`: Fecha hasta
- `page`: Página
- `limit`: Elementos por página

**Response:**
```json
{
  "auditorias": [
    {
      "id_auditoria": "uuid",
      "actor_id": 1,
      "actor_nombre": "Admin",
      "accion": "CREATE_USER",
      "objetivo_tipo": "users",
      "objetivo_id": "123",
      "timestamp": "2025-01-01T00:00:00Z",
      "ip": "192.168.1.1",
      "antes": null,
      "despues": {"nombre": "Juan", "rol": 2}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```

### Reportes

#### GET /reportes/usuarios/csv
Exportar listado de usuarios en CSV (solo admin).

#### GET /reportes/descargas/csv
Exportar listado de descargas en CSV (solo admin).

#### GET /reportes/auditoria/csv
Exportar auditoría en CSV (solo admin).

### Métricas

#### GET /metrics
Obtener métricas del dashboard (solo admin).

**Response:**
```json
{
  "total_usuarios": 50,
  "total_descargas": 1500,
  "pendientes_facturar": 200,
  "descargas_mes": 150,
  "usuarios_activos": 45,
  "top_usuarios": [
    {"nombre": "Juan Pérez", "descargas": 50},
    {"nombre": "María García", "descargas": 45}
  ]
}
```

## Códigos de Estado

- `200`: Éxito
- `201`: Creado
- `400`: Solicitud inválida
- `401`: No autorizado
- `403`: Prohibido
- `404`: No encontrado
- `500`: Error interno del servidor

## Roles de Usuario

1. **Administrador** (id_rol: 1)
   - Acceso completo a todos los endpoints
   - Gestión de usuarios
   - Cambio de estados de descarga
   - Acceso a auditoría y reportes

2. **Mayorista** (id_rol: 2)
   - Descarga de certificados
   - Ver su historial de descargas
   - Cambiar su contraseña

3. **Distribuidor** (id_rol: 3)
   - Mismo acceso que Mayorista
   - Límites independientes

## Políticas de Contraseña

- Mínimo 10 caracteres
- Al menos una mayúscula
- Al menos una minúscula  
- Al menos un número
- Al menos un carácter especial (!@#$%^&*(),.?":{}|<>)

## Límites de Descarga

- Cada usuario tiene un límite configurable de descargas pendientes
- Al alcanzar 80% del límite se envía alerta por email
- Al alcanzar 100% se bloquean nuevas descargas
- Solo admin puede cambiar estados de "Pendiente de Facturar" a "Facturado"

## Notificaciones por Email

El sistema envía emails automáticos a administradores cuando:
- Un usuario alcanza 80% de su límite
- Un usuario alcanza 100% de su límite  
- Un usuario intenta descargar estando bloqueado

## Configuración de Entorno

Variables de entorno requeridas:

```env
DATABASE_URL=postgresql://user:password@host:port/database
TOKEN_SECRET=secret_key_for_jwt
REFRESH_SECRET=secret_key_for_refresh_tokens
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=email@example.com
SMTP_PASS=email_password
SMTP_FROM=noreply@example.com
```
