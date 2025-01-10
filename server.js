const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 5000;

// Middleware para parsear JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Conexión a la base de datos PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Endpoint principal
app.get("/", (req, res) => {
    return res.status(200).send({
        message: "Servidor funcionando correctamente.",
        timestamp: new Date().toISOString()
    });
});

// Endpoint del webhook para JotForm
app.post("/webhook", async (req, res) => {
    // Log completo de la solicitud
    console.log('Headers:', req.headers);
    console.log('Body completo:', JSON.stringify(req.body, null, 2));

    try {
        // Extraer datos usando los nombres de campos exactos
        const { nombre, email, mensaje } = req.body;
        const fecha = new Date().toISOString();

        console.log('Datos extraídos:', { nombre, email, mensaje, fecha });

        // Verificar si los datos están presentes
        if (!nombre || !email || !mensaje) {
            console.log('Datos faltantes en la solicitud');
            return res.status(400).json({
                error: 'Datos incompletos',
                receivedData: { nombre, email, mensaje },
                originalBody: req.body
            });
        }

        // Insertar en la base de datos
        const result = await pool.query(
            "INSERT INTO formulario (nombre, email, mensaje, fecha) VALUES ($1, $2, $3, $4) RETURNING *",
            [nombre, email, mensaje, fecha]
        );

        console.log('Datos insertados:', result.rows[0]);

        // Respuesta exitosa
        return res.status(200).json({
            message: "Datos guardados con éxito",
            savedData: {
                nombre,
                email,
                mensaje,
                fecha
            }
        });

    } catch (error) {
        console.error("Error en el procesamiento:", error);
        return res.status(500).json({
            error: "Error en el servidor",
            details: error.message,
            stack: error.stack
        });
    }
});

// Inicia el servidor
const server = app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});

module.exports = app;