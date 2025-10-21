import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Divider,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  Download,
  Assessment,
  Notifications,
  ExitToApp,
  AccountCircle,
  Security,
  Warning,
  History
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import logoSersa from './assets/LOGOSersa.png';

const DRAWER_WIDTH = 240;

const Layout = ({ children, onLogout, user }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [downloadLimits, setDownloadLimits] = useState({ pending: 0, limit: 0, percentage: 0 });
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user?.rol === 'Administrador') {
      fetchNotificationCount();
    } else {
      fetchDownloadLimits();
    }
  }, [user]);  const fetchNotificationCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const userRol = localStorage.getItem('userRol');
      
      if (!token) {
        console.log('No token found for notification count');
        return;
      }
      
      // Solo obtener notificaciones si es admin
      if (userRol !== 'Administrador' && user?.id_rol !== 1) {
        console.log('User is not admin, skipping notification count');
        return;
      }

      console.log('Fetching notification count for admin user');
      
      // Usar la URL completa del backend
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/notifications/count`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Notification count response status:', response.status);
      console.log('Notification count response headers:', Object.fromEntries(response.headers.entries()));

      // Verificar si el token expiró (401 Unauthorized)
      if (response.status === 401) {
        console.log('Token expired in fetchNotificationCount, checking with global handler...');
        try {
          const errorData = await response.json();
          // Usar el manejador global para verificar si es token expirado
          if (window.checkTokenExpired && window.checkTokenExpired(errorData)) {
            return; // El manejador global ya hizo logout
          }
        } catch (e) {
          // Si no se puede parsear, es probable que sea token expirado
          if (window.handleGlobalLogout) {
            window.handleGlobalLogout('jwt expired');
          }
        }
        return;
      }
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('Notification count data:', data);
          setNotificationCount(data.count || 0);
        } else {
          console.error('Notification count response is not JSON:', contentType);
          // Intentar leer como texto para debugging
          const text = await response.text();
          console.error('Response text:', text.substring(0, 200));
        }
      } else {
        console.error('Notification count response not ok:', response.status, response.statusText);
        if (response.status !== 404) {
          console.error('Error fetching notification count:', response.status);
        }
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };const fetchDownloadLimits = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found for download limits');
        return;
      }

      // Usar la URL completa del backend
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/downloads/limits`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Download limits response status:', response.status);
      
      // Verificar si el token expiró (401 Unauthorized)
      if (response.status === 401) {
        console.log('Token expired in fetchDownloadLimits, using global handler...');
        try {
          const errorData = await response.json();
          // Usar el manejador global para verificar si es token expirado
          if (window.checkTokenExpired && window.checkTokenExpired(errorData)) {
            return; // El manejador global ya hizo logout
          }
        } catch (e) {
          // Si no se puede parsear, es probable que sea token expirado
          if (window.handleGlobalLogout) {
            window.handleGlobalLogout('jwt expired');
          }
        }
        return;
      }
        
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('Download limits data:', data);
          setDownloadLimits(data);
        } else {
          console.error('Download limits response is not JSON:', contentType);
        }
      } else {
        console.error('Download limits response not ok:', response.status, response.statusText);
        // No mostrar error si el endpoint no existe aún
        if (response.status !== 404) {
          console.error('Error fetching download limits:', response.status);
        }
      }
    } catch (error) {
      console.error('Error fetching download limits:', error);
      // No mostrar error al usuario por problemas de límites
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };  const handleLogout = () => {
    handleMenuClose();
    // Limpiar estados al hacer logout
    setDownloadLimits({ pending: 0, limit: 0, percentage: 0 });
    setNotificationCount(0);
    // Cerrar el menu si está abierto
    setAnchorEl(null);
    onLogout('Sesión cerrada'); // Logout manual con mensaje
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getLimitColor = () => {
    if (!downloadLimits.limit) return 'default';
    const percentage = downloadLimits.percentage || 0;
    if (percentage >= 100) return 'error';
    if (percentage >= 80) return 'warning';
    return 'success';
  };

  // Menú para administradores
  const adminMenuItems = [
    { text: 'Descargar Certificados', icon: <Download />, path: '/certificados' },
    { text: 'Usuarios', icon: <People />, path: '/admin/usuarios' },
    { text: 'Descargas', icon: <Download />, path: '/admin/descargas' },
    //{ text: 'Reportes', icon: <Assessment />, path: '/admin/reportes' },
    { text: 'Métricas', icon: <Dashboard />, path: '/admin/metrics' },
    { text: 'Auditoría', icon: <Security />, path: '/admin/auditoria' }
  //  { 
   //   text: 'Notificaciones', 
   //   icon: notificationCount > 0 ? 
   //     <Badge badgeContent={notificationCount} color="error">
   //       <Notifications />
   //     </Badge> : 
   //     <Notifications />, 
    //  path: '/admin/notificaciones' 
   // }
  ];
  // Menú para usuarios (Mayorista/Distribuidor)
  const userMenuItems = [
    { text: 'Descargar Certificados', icon: <Download />, path: '/certificados' },
    ...(user?.rol === 'Mayorista' ? [
      { text: 'Mis Usuarios', icon: <People />, path: '/mayorista/panel' }
    ] : []),
    
    { text: 'Mi Historial', icon: <History />, path: '/historial' }
    
  ];

  const menuItems = user?.rol === 'Administrador' || user?.id_rol === 1 ? adminMenuItems : userMenuItems;
  // Debug info - verificar estado de user
  console.log('User data in Layout:', user);
  console.log('User rol:', user?.rol);
  console.log('User id_rol:', user?.id_rol);
  console.log('User is null/undefined?', user === null || user === undefined);
  console.log('User is truthy?', !!user);

  // Contenido del drawer
  const drawer = (
    <div>
      {/* Espaciador para el AppBar */}
      <Toolbar />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            selected={isActive(item.path)}
            onClick={() => {
              navigate(item.path);
              if (isMobile) {
                setMobileOpen(false);
              }
            }}
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'rgba(25, 118, 210, 0.12)',
                borderRight: '3px solid #1976d2',
                '& .MuiListItemIcon-root': {
                  color: 'primary.main',
                },
                '& .MuiListItemText-primary': {
                  color: 'primary.main',
                  fontWeight: 'bold',
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
              },
            }}
          >
            <ListItemIcon>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>      {/* Información de límites para usuarios no admin */}
      {user && (user?.rol !== 'Administrador' && user?.id_rol !== 1) && downloadLimits.limit > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="caption" color="textSecondary" gutterBottom>
              Estado de Descargas
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Chip
                size="small"
                label={`Pendientes: ${downloadLimits.pending}`}
                color={downloadLimits.pending > 0 ? 'warning' : 'default'}
                sx={{ fontSize: '0.7rem' }}
              />
              <Chip
                size="small"
                label={`Límite: ${downloadLimits.limit}`}
                color="default"
                sx={{ fontSize: '0.7rem' }}
              />
              {downloadLimits.percentage >= 80 && (
                <Chip
                  size="small"
                  icon={<Warning fontSize="small" />}
                  label={`${Math.round(downloadLimits.percentage)}% usado`}
                  color={downloadLimits.percentage >= 100 ? 'error' : 'warning'}
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
              {downloadLimits.percentage >= 100 && (
                <Typography 
                  variant="caption" 
                  color="error" 
                  sx={{ 
                    fontSize: '0.65rem',
                    textAlign: 'center',
                    mt: 0.5
                  }}
                >
                  Límite alcanzado. Contacte al administrador.
                </Typography>
              )}
            </Box>
          </Box>
        </>
      )}
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}      <AppBar
        position="fixed"
        sx={{
          width: user && user.nombre ? { sm: `calc(100% - ${DRAWER_WIDTH}px)` } : '100%',
          ml: user && user.nombre ? { sm: `${DRAWER_WIDTH}px` } : 0,
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >        <Toolbar>
          {user && user.nombre && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          )}          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <img 
              src={logoSersa} 
              alt="SERSA Logo" 
              style={{ 
                height: '32px', 
                width: 'auto',
                marginRight: '12px',
                display: 'block'
              }} 
            />
            <Typography variant="h6" noWrap component="div">
               Certificados SAM4s
            </Typography>
          </Box>{/* Indicador de límites para usuarios no admin */}
          {user && (user?.rol !== 'Administrador' && user?.id_rol !== 1) && downloadLimits.limit > 0 && (
            <Box sx={{ mr: 2 }}>
              <Chip
                icon={downloadLimits.percentage >= 80 ? <Warning /> : <Download />}
                label={`${downloadLimits.pending}/${downloadLimits.limit}`}
                color={getLimitColor()}
                variant={downloadLimits.percentage >= 100 ? "filled" : "outlined"}
                size="small"
                sx={{ color: 'white', borderColor: 'white' }}
              />
            </Box>          )}
            {user && user.nombre && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', md: 'block' } }}>
                {user?.nombre} ({user?.rol})
              </Typography>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenuClick}
                color="inherit"
              >
                <AccountCircle />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl) && user && user.nombre}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={() => {
                  handleMenuClose();
                  navigate('/cambiar-password');
                }}>
                  Cambiar Contraseña
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ExitToApp sx={{ mr: 1 }} />
                  Cerrar Sesión
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>      {/* Drawer - Solo visible si hay usuario logueado */}
      {user && user.nombre && (
        <Box
          component="nav"
          sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
          aria-label="mailbox folders"
        >
          {/* Drawer móvil */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: DRAWER_WIDTH,
              },
            }}
          >
            {drawer}
          </Drawer>
          
          {/* Drawer desktop */}
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: DRAWER_WIDTH,
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
      )}

      {/* Contenido principal */}      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: user && user.nombre ? { sm: `calc(100% - ${DRAWER_WIDTH}px)` } : '100%',
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Toolbar /> {/* Espaciador para el AppBar */}
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
