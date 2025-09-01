import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import LoginForm from './LoginForm';
import CertForm from './CertForm';
import Footer from './Footer';
import Spinner from './Spinner';
import ProtectedRoute from './ProtectedRoute';
import './App.css';

function App() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [certData, setCertData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="container" style={{ maxWidth: 500, margin: '2em auto', background: '#fff', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '2em', textAlign: 'center' }}>
      <a href="https://www.sersa.com.ar" target="_blank" rel="noopener noreferrer">
        <img
          src="https://ss-static-01.esmsv.com/id/68416/galeriaimagenes/obtenerimagen/?width=237&height=67&id=sitio_logo&ultimaModificacion=2025-09-01+17%3A31%3A23"
          alt="SERSA"
          style={{ height: '50px' }}
        />
      </a>
      <h2>Renovación de Certificados</h2>
      {loading && <Spinner />}
      <Routes>
        <Route path="/" element={
          <LoginForm
            onLogin={async (e) => {
              e.preventDefault();
              setLoading(true);
              const username = e.target.username.value;
              const password = e.target.password.value;
              if (!username || !password) {
                setError('Completa usuario y contraseña');
                setLoading(false);
                return;
              }
              const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
              });
              const data = await res.json();
              if (data.token) {
                setToken(data.token);
                setError('');
                navigate('/cert'); // <--- navega sin recargar
              } else {
                setError('Login fallido');
              }
              setLoading(false);
            }}
            error={error}
          />
        } />
        <Route path="/cert" element={
          <ProtectedRoute token={token}>
            <CertForm
              onCert={async (e) => {
                e.preventDefault();
                setLoading(true); // Deshabilita los botones
                const marca = e.target.marca.value;
                const modelo = e.target.modelo.value;
                const numeroSerie = e.target.numeroSerie.value;
                if (!numeroSerie) {
                  setError('Ingrese el número de serie');
                  setLoading(false);
                  return;
                }

                try {
                  const res = await fetch('/api/certs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': token },
                    body: JSON.stringify({ marca, modelo, numeroSerie })
                  });
                  const data = await res.json();

                  if (data.pem) {
                    // Descargar automáticamente
                    const fabricante = 'SE';
                    const fecha = new Date();
                    const dd = String(fecha.getDate()).padStart(2, '0');
                    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
                    const aaaa = fecha.getFullYear();
                    const nombreArchivo = `${fabricante}${marca}${modelo}${numeroSerie}-${dd}-${mm}-${aaaa}.pem`;

                    const blob = new Blob([data.pem], { type: 'application/x-pem-file' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = nombreArchivo;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    setToken('');
                    setCertData(null);
                    setError('');
                    navigate('/');
                  } else {
                    setError(data.message || 'Error desconocido');
                    setToken('');
                    setCertData(null);
                    navigate('/');
                  }
                } catch (err) {
                  setError('Error de conexión');
                  setToken('');
                  setCertData(null);
                  navigate('/');
                }
                setLoading(false); // Habilita los botones nuevamente
              }}
              error={error}
              onLogout={() => {
                setToken('');
                setCertData(null);
                setError('');
                navigate('/'); // <--- navega sin recargar
              }}
              certData={certData}
              loading={loading}
            />
          </ProtectedRoute>
        } />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;

