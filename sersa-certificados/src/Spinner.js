import React from 'react';

function Spinner() {
  return (
    <div className="spinner">
      <span className="spinner-dot"></span>
      <span className="spinner-dot"></span>
      <span className="spinner-dot"></span>
      <span style={{marginLeft: 8}}>Cargando...</span>
    </div>
  );
}

export default Spinner;