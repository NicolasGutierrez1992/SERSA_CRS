# 🖼️ Agregando Logo SERSA al AppBar

## ✅ **Código Implementado**

He modificado el `Layout.js` para incluir el logo de SERSA junto al título del sistema:

```javascript
<Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
  <img 
    src="/logo-sersa.png" 
    alt="SERSA Logo" 
    style={{ 
      height: '32px', 
      marginRight: '12px',
      filter: 'brightness(0) invert(1)' // Hace el logo blanco para el AppBar azul
    }} 
  />
  <Typography variant="h6" noWrap component="div">
    SERSA - Sistema de Certificados
  </Typography>
</Box>
```

## 📁 **Pasos para Agregar la Imagen**

### **1. Guardar el Logo:**
1. **Guarda la imagen** que tienes como `logo-sersa.png`
2. **Colócala** en la carpeta: `c:\Users\Nicol\OneDrive\Documentos\GitHub\SERSA_CRS\sersa-certificados\public\logo-sersa.png`

### **2. Estructura de Archivos:**
```
sersa-certificados/
├── public/
│   ├── favicon.ico
│   ├── index.html
│   ├── logo-sersa.png    ← Tu logo aquí
│   └── manifest.json
├── src/
│   ├── Layout.js         ← Código ya modificado
│   └── ...
```

## 🎨 **Características del Logo**

### **Dimensiones:**
- **Altura**: 32px (ajustado al AppBar)
- **Ancho**: Proporcional automático
- **Margen derecho**: 12px del texto

### **Filtros Aplicados:**
```css
filter: 'brightness(0) invert(1)'
```
- **brightness(0)**: Convierte a negro
- **invert(1)**: Invierte a blanco
- **Resultado**: Logo blanco para contrastar con AppBar azul

## 🎯 **Resultado Visual**

### **AppBar con Logo:**
```
┌─────────────────────────────────────────────────────┐
│ ☰  [🏢] SERSA - Sistema de Certificados    👤 ▼     │
│     ^logo                                           │
└─────────────────────────────────────────────────────┘
```

### **Responsive Behavior:**
- **Desktop**: Logo + texto completo visible
- **Tablet**: Logo + texto (puede truncar si es muy largo)
- **Mobile**: Logo + texto responsivo con `noWrap`

## 🔧 **Alternativas de Configuración**

### **Si el Logo es Muy Grande:**
```javascript
style={{ 
  height: '24px',        // Altura menor
  maxWidth: '120px',     // Ancho máximo
  objectFit: 'contain',  // Mantiene proporciones
  marginRight: '8px'
}}
```

### **Si el Logo ya es Blanco:**
```javascript
style={{ 
  height: '32px', 
  marginRight: '12px'
  // Remover filter si el logo ya es blanco
}}
```

### **Para Logo Colorido (sin filtro):**
```javascript
style={{ 
  height: '32px', 
  marginRight: '12px',
  // Mantiene colores originales
}}
```

## 📱 **Testing Responsivo**

### **Para Verificar:**
1. **Desktop**: Logo debe verse claro junto al texto
2. **Tablet**: Logo y texto deben mantenerse visibles
3. **Mobile**: Logo debe adaptarse sin romper el layout
4. **Colores**: Logo debe contrastar bien con fondo azul del AppBar

## 🛠️ **Formatos de Imagen Soportados**

### **Recomendados:**
- ✅ **PNG**: Mejor para logos con transparencia
- ✅ **SVG**: Escalable y crisp en todas las resoluciones
- ✅ **JPG**: Para logos fotograficos

### **Configuración para SVG:**
```javascript
<img 
  src="/logo-sersa.svg" 
  alt="SERSA Logo" 
  style={{ 
    height: '32px', 
    marginRight: '12px',
    fill: 'white'  // Para SVGs
  }} 
/>
```

¡El logo SERSA ahora aparecerá en el AppBar junto al título del sistema! 🖼️