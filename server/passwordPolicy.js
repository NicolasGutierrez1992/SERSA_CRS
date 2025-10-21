// Valida que la contraseña cumpla la política requerida
function validarPasswordPolicy(password) {
  if (typeof password !== 'string') return false;
  if (password.length < 10) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
  return true;
}

module.exports = { validarPasswordPolicy };
