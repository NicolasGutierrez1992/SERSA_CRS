const soap = require('soap');
const fs = require('fs');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const {verifyToken} = require('./middleware');
require('dotenv').config({ override: true });
const { logearNode } = require('./wsaa');
const { cuit, fabricante, wsCertWsdl, certPath, keyPath, wsaaUrl, service, rootPath} = require('./config');
const { compile } = require('morgan');
const SECRET = process.env.TOKEN_SECRET || 'mi_clave_secreta';

async function renovarCertificado({ marca, modelo, numeroSerie }) {
    console.log('[renovarCertificado] INICIO');
    if (!cuit || !fabricante || !marca || !modelo || !numeroSerie) {
        console.error('[renovarCertificado] Faltan parámetros');
        throw new Error('Todos los parámetros son requeridos');
    }
    console.log(`[renovarCertificado] CUIT: ${cuit}, Fabricante: ${fabricante}, Marca: ${marca}, Modelo: ${modelo}, Número de Serie: ${numeroSerie}`);
    // Obtengo el token y sign del WSAA
    console.log('[renovarCertificado] Llamando a logearNode...');
    const { token, sign, expirationTime } = await logearNode({ pfxPath: certPath, pfxPassword: keyPath, service, wsaaUrl });
    console.log('[renovarCertificado] Token:', token ? token.substring(0, 20) + '...' : 'null');
    console.log('[renovarCertificado] Sign:', sign ? sign.substring(0, 20) + '...' : 'null');
    console.log('[renovarCertificado] ExpirationTime:', expirationTime);

    console.log('[renovarCertificado] Creando cliente SOAP...');
    const client = await soap.createClientAsync(wsCertWsdl);
    console.log('[renovarCertificado] Cliente SOAP creado');

    const args = {
        cuit,
        fabricante,
        marca,
        modelo,
        numeroSerie,
        token,
        sign
    };
    console.log('[renovarCertificado] Args para renovarCertificado:', args);

    console.log('[renovarCertificado] Llamando a renovarCertificado en el WS...');
    const [result] = await client.renovarCertificadoAsync(args);
    console.log('[renovarCertificado] Resultado de renovarCertificadoResponse:', result);
    let buffer = '';
    if (result && result.return) {
        const rta = result.return;

        console.log('[renovarCertificado] Procesando respuesta del WS...');
        console.log(`[renovarCertificado] Certificado recibido para: ${numeroSerie}`);      
        const rootFileRTI = fs.existsSync(rootPath) ? fs.readFileSync(rootPath, 'utf8').replace(/\r?\n/g, '') : '';

        //const outputFileName = `Certificados/${fabricante}${marca}${modelo}${numeroSerie}-${(new Date()).toLocaleDateString('sv-SE')}.pem`;
        //fs.mkdirSync('Certificados', { recursive: true });
        //const outputFile = fs.createWriteStream(outputFileName);
        
        // guardo el certificado en un buffer para poder devolverlo como respuesta
        buffer  = '-----BEGIN CMS-----\n';
        // Escribe el root RTI como CMS
        console.log(`[renovarCertificado] Escribo Root RTI ` , rootFileRTI);
        if (rootFileRTI) {
            
            let cadena = rootFileRTI;
            while (cadena.length > 64) {
                buffer += cadena.substring(0, 64) + "\n";
                cadena = cadena.substring(64);
            }
            buffer += cadena + "\n";
            buffer += "-----END CMS-----\n";
            console.log(`[renovarCertificado] Root Cert RTI OK para: ${numeroSerie}`);
        }

        // Escribe la cadena de certificación[1]
        console.log(`[renovarCertificado] Escribo cadena de certificación ` , rta.cadenaCertificacion);
        if (rta.cadenaCertificacion && rta.cadenaCertificacion[1]) {
            let cadena = rta.cadenaCertificacion[1].replace(/\r?\n/g, '');
            buffer += "-----BEGIN CERTIFICATE-----\n";
            while (cadena.length > 64) {
                buffer += cadena.substring(0, 64) + "\n";
                cadena = cadena.substring(64);
            }
            buffer += cadena + "\n";
            buffer += "-----END CERTIFICATE-----\n";
            console.log(`[renovarCertificado] 1º cert OK para: ${numeroSerie}`);
        }

        // Escribe el certificado principal
        console.log(`[renovarCertificado] Escribo certificado principal ` , rta.certificado);
        if (rta.certificado) {
            let cadena = rta.certificado.replace(/\r?\n/g, '');
            buffer += "-----BEGIN CERTIFICATE-----\n";
            
            while (cadena.length > 64) {
                buffer += cadena.substring(0, 64) + "\n";
                cadena = cadena.substring(64);  
            }
            buffer += cadena + "\n";
            buffer += "-----END CERTIFICATE-----\n";
            console.log(`[renovarCertificado] 2º cert OK para: ${numeroSerie}`);
        }
    }
    return (buffer === '' ? null : buffer);

    
}

router.post('/Certs', verifyToken, async (req, res) => {
    console.log('[POST /Certs] Solicitud recibida');
    console.log('[POST /Certs] Headers:', req.headers);
    console.log('[POST /Certs] Body:', req.body);

    if (!req.headers.authorization) {
        console.error('[POST /Certs] No autorizado: falta header Authorization');
        return res.status(401).json({ message: 'No autorizado 1' });
    }
    const token = req.headers.authorization;
    if (!token) {
        console.error('[POST /Certs] No autorizado: token vacío');
        return res.status(401).json({ message: 'No autorizado 2' });
    }
    try {
        const decoded = jwt.verify(token, SECRET);
        console.log('[POST /Certs] Token JWT válido:', decoded);
    } catch (err) {
        console.error('[POST /Certs] Token inválido:', err.message);
        return res.status(401).json({ message: 'Token inválido 4' });
    }

    const { modelo, marca, numeroSerie } = req.body;
    if (!modelo || !marca || !numeroSerie) {
        console.error('[POST /Certs] Modelo, marca y número de serie son requeridos');
        return res.status(400).json({ message: 'Modelo, marca y número de serie son requeridos' });
    }
    try {
        console.log('[POST /Certs] Llamando a renovarCertificado...');
        const resultado = await renovarCertificado({ marca, modelo, numeroSerie });
        console.log('[POST /Certs] Resultado de renovarCertificado:', resultado);
        if (!resultado) {
            console.error('[POST /Certs] Error al renovar el certificado');
            return res.status(500).json({ message: 'Error al renovar el certificado' });
        }
        res.status(200).json({ pem:resultado });
    } catch (err) {
        console.error('[POST /Certs] Error en el proceso:', err.message);
        res.status(500).json({ message: 'Error interno: ' + err.message });
    }
});

module.exports = router;