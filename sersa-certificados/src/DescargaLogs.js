import React, { useEffect, useState } from 'react';

function DescargaLogs({ idCertificado, backendUrl, token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const res = await fetch(`${backendUrl}/downloadLogs/${idCertificado}`, {
          headers: { 'Authorization': token }
        });
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        setError('Error al cargar logs de descarga');
      }
      setLoading(false);
    }
    if (idCertificado) fetchLogs();
  }, [idCertificado, backendUrl, token]);

  return (
    <div>
      <h4>Logs de Descarga</h4>
      {loading && <div>Cargando...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <ul>
        {logs.map(log => (
          <li key={log.id_download_log}>
            <b>{log.paso}</b> [{log.estado}] - {log.mensaje} <span style={{ color: '#888' }}>{log.fecha}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DescargaLogs;
