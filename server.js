const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 5000;

// Middleware para parsear tanto JSON como datos de formulario
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Conexión a la base de datos PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Middleware para verificar la conexión a la base de datos
app.use(async (req, res, next) => {
    try {
        await pool.query('SELECT 1');
        next();
    } catch (error) {
        console.error('Error de conexión a la base de datos:', error);
        res.status(500).send('Error de conexión a la base de datos');
    }
});

// Endpoint principal
app.get("/", (req, res) => {
    return res.status(200).send({
        message: "Servidor funcionando correctamente.",
        timestamp: new Date().toISOString()
    });
});

// Función auxiliar para extraer datos del formato de JotForm
const extractJotFormData = (body) => {
    console.log('Datos recibidos de JotForm:', body);

    let formData;
    
    // Maneja diferentes formatos de datos de JotForm
    if (body.rawRequest) {
        formData = body.rawRequest;
    } else if (body.submissionID && body.formData) {
        formData = body.formData;
    } else if (body.q3_nombre || body.q4_email || body.q5_mensaje) {
        // Si los datos vienen con los IDs de campo de JotForm
        formData = {
            nombre: body.q3_nombre,
            email: body.q4_email,
            mensaje: body.q5_mensaje
        };
    } else {
        // Si los datos vienen directamente en el body
        formData = body;
    }

    return {
        nombre: formData.nombre || formData.q3_nombre || '',
        email: formData.email || formData.q4_email || '',
        mensaje: formData.mensaje || formData.q5_mensaje || '',
        fecha: new Date().toISOString()
    };
};

// Endpoint del webhook para JotForm
app.post("/webhook", async (req, res) => {
    try {
        const data = extractJotFormData(req.body);
        
        // Validación de datos
        if (!data.nombre || !data.email || !data.mensaje) {
            console.log('Datos faltantes:', data);
            return res.status(400).json({
                error: 'Datos incompletos',
                receivedData: data
            });
        }

        // Inserta datos en la base de datos
        await pool.query(
            "INSERT INTO formulario (nombre, email, mensaje, fecha) VALUES ($1, $2, $3, $4)",
            [data.nombre, data.email, data.mensaje, data.fecha]
        );

        // Respuesta exitosa
        res.status(200).json({
            message: "Datos guardados con éxito",
            savedData: {
                nombre: data.nombre,
                email: data.email,
                fecha: data.fecha
            }
        });

    } catch (error) {
        console.error("Error en el procesamiento del webhook:", error);
        res.status(500).json({
            error: "Error interno del servidor",
            details: error.message
        });
    }
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: err.message
    });
});

// Inicia el servidor
const server = app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
    console.log('Recibida señal SIGTERM. Cerrando servidor...');
    server.close(async () => {
        await pool.end();
        console.log('Servidor cerrado exitosamente');
        process.exit(0);
    });
});

module.exports = app;