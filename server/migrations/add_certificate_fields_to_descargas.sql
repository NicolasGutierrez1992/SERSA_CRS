-- Agregar columnas adicionales a la tabla descargas para almacenar información de certificados generados

ALTER TABLE descargas 
ADD COLUMN IF NOT EXISTS certificado_nombre VARCHAR(255),
ADD COLUMN IF NOT EXISTS marca VARCHAR(100),
ADD COLUMN IF NOT EXISTS modelo VARCHAR(100), 
ADD COLUMN IF NOT EXISTS numero_serie VARCHAR(100),
ADD COLUMN IF NOT EXISTS certificado_pem TEXT;

-- Crear índices para mejorar las consultas
CREATE INDEX IF NOT EXISTS idx_descargas_certificado_nombre ON descargas(certificado_nombre);
CREATE INDEX IF NOT EXISTS idx_descargas_marca_modelo ON descargas(marca, modelo);
CREATE INDEX IF NOT EXISTS idx_descargas_numero_serie ON descargas(numero_serie);

-- Comentarios para documentar las nuevas columnas
COMMENT ON COLUMN descargas.certificado_nombre IS 'Nombre descriptivo del certificado generado';
COMMENT ON COLUMN descargas.marca IS 'Marca del controlador para certificados generados dinámicamente';
COMMENT ON COLUMN descargas.modelo IS 'Modelo del controlador para certificados generados dinámicamente';
COMMENT ON COLUMN descargas.numero_serie IS 'Número de serie del controlador';
COMMENT ON COLUMN descargas.certificado_pem IS 'Contenido del certificado PEM generado (opcional, para backup)';