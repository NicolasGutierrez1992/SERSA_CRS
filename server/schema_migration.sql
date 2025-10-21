-- Migración del esquema de base de datos para SERSA CRS
-- Actualizando tabla users según requerimientos

-- Primero, agregar columnas que faltan en la tabla users si no existen
DO $$
BEGIN
    -- Agregar columnas una por una con verificación
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'cuit') THEN
        ALTER TABLE public.users ADD COLUMN cuit TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'limite_descargas') THEN
        ALTER TABLE public.users ADD COLUMN limite_descargas INTEGER DEFAULT 5;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'must_change_password') THEN
        ALTER TABLE public.users ADD COLUMN must_change_password BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_by') THEN
        ALTER TABLE public.users ADD COLUMN created_by INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
        ALTER TABLE public.users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'ultimo_login') THEN
        ALTER TABLE public.users ADD COLUMN ultimo_login TIMESTAMP;
    END IF;
END $$;

-- Crear secuencia para id_usuario si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'users_id_usuario_seq') THEN
        CREATE SEQUENCE users_id_usuario_seq;
        ALTER TABLE public.users ALTER COLUMN id_usuario SET DEFAULT nextval('users_id_usuario_seq');
        SELECT setval('users_id_usuario_seq', COALESCE(MAX(id_usuario), 1)) FROM users;
    END IF;
END $$;

-- Tabla de descargas según requerimientos

CREATE TABLE IF NOT EXISTS public.descargas (
    id_descarga UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario INTEGER REFERENCES users(id_usuario),
    id_certificado UUID,
    controlador_id TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado TEXT DEFAULT 'Pendiente de Facturar' CHECK (estado IN ('Pendiente de Facturar', 'Facturado')),
    logs JSONB,
    checksum TEXT,
    tamaño BIGINT,
    ip_origen TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de certificados
CREATE TABLE IF NOT EXISTS public.certificados_v2 (
    id_certificado UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    controlador_id TEXT,
    metadata JSONB,
    archivo_referencia TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de auditoría
CREATE TABLE IF NOT EXISTS public.auditoria (
    id_auditoria UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id INTEGER REFERENCES users(id_usuario),
    accion TEXT NOT NULL,
    objetivo_tipo TEXT NOT NULL,
    objetivo_id TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip TEXT,
    antes JSONB,
    despues JSONB
);

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id_notificacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL,
    destinatario_id INTEGER REFERENCES users(id_usuario),
    estado_envio TEXT DEFAULT 'Pendiente' CHECK (estado_envio IN ('Pendiente', 'Enviado', 'Error')),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payload JSONB
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_descargas_usuario ON public.descargas(id_usuario);
CREATE INDEX IF NOT EXISTS idx_descargas_estado ON public.descargas(estado);
CREATE INDEX IF NOT EXISTS idx_descargas_fecha ON public.descargas(fecha);
CREATE INDEX IF NOT EXISTS idx_auditoria_actor ON public.auditoria(actor_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_timestamp ON public.auditoria(timestamp);

-- Insertar roles básicos si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id_rol = 1) THEN
        INSERT INTO roles (id_rol, rol) VALUES (1, 'Administrador');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id_rol = 2) THEN
        INSERT INTO roles (id_rol, rol) VALUES (2, 'Mayorista');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id_rol = 3) THEN
        INSERT INTO roles (id_rol, rol) VALUES (3, 'Distribuidor');
    END IF;
END $$;

-- Crear usuario administrador por defecto si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE cuit = 'admin') THEN
        INSERT INTO users (cuit, nombre, mail, password, id_rol, status, must_change_password, limite_descargas)
        VALUES ('admin', 'Administrador', 'admin@sersa.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 1, TRUE, 0);
    END IF;
END $$;
