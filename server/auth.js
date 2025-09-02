const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const SECRET = process.env.TOKEN_SECRET || 'mi_clave_secreta';


const users = [{ username: 'admin', password: bcrypt.hashSync('1234', 10) }];

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login de usuario
 *     description: Obtiene un token JWT si las credenciales son válidas.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token JWT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });
  }
  const user = users.find(u => u.username === username);
  console.log(`Usuario encontrado: ${user ? 'Sí' : 'No'}`);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }
  const token = jwt.sign({ username }, SECRET, { expiresIn: '1h' });
  res.json({ token });
});

module.exports = router;