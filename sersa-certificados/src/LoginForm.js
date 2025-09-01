import React from 'react';

function LoginForm({ onLogin, error }) {
  return (
    <form onSubmit={onLogin}>
      <input type="text" name="username" defaultValue="admin" placeholder="Usuario" />
      <input type="password" name="password" defaultValue="1234" placeholder="Contraseña" />
      <button type="submit">Iniciar sesión</button>
      {error && <div style={{ color: 'red', marginTop: '1em' }}>{error}</div>}
    </form>
  );
}

export default LoginForm;

