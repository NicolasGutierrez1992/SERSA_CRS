import React from 'react';

function CertForm({ onCert, error, onLogout, loading }) {
  return (
    <form onSubmit={onCert}>
      <select name="marca" disabled={loading}>
        <option value="SH">SAM4s</option>
      </select>
      <select name="modelo" disabled={loading}>
        <option value="IA">Ellix 40 F</option>
        <option value="RA">NR 330 F</option>
      </select>
      <input type="text" name="numeroSerie" defaultValue="0000001371" placeholder="Número de Serie" maxLength={20} disabled={loading} />
      <button type="submit" disabled={loading}>Obtener Certificado</button>
      <button type="button" onClick={onLogout} disabled={loading}>Cerrar sesión</button>
      {error && <div style={{ color: 'red', marginTop: '1em' }}>{error}</div>}
    </form>
  );
}

export default CertForm;

