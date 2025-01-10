const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 5000;

// Middleware para parsear JSON
app.use(bodyParser.json());

// Conexión a la base de datos PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Variable de entorno configurada en Railway o Render
    ssl: { rejectUnauthorized: false }, // Desactiva verificación de SSL si estás usando Railway
});

// Endpoint principal (para verificar que el servidor está corriendo)
app.get("/", (req, res) => {
    return res.status(200).send({
        message: "Servidor funcionando correctamente.",
    });
});

// Endpoint del webhook para JotForm (DEBE SER POST, y usando query parameters)
app.post("/webhook", async (req, res) => {
    // Accediendo a los parámetros desde la URL (query string)
    const { nombre, email, mensaje, fecha } = req.query; // Cambié req.body por req.query

    console.log("Datos recibidos:", req.query); // Verifica que lleguen correctamente

    try {
        // Inserta los datos en la tabla formulario
        await pool.query(
            "INSERT INTO formulario (nombre, email, mensaje, fecha) VALUES ($1, $2, $3, $4)",
            [nombre, email, mensaje, fecha]
        );
        res.status(200).send("Datos guardados con éxito.");
    } catch (error) {
        console.error("Error al insertar datos en la base de datos:", error);
        res.status(500).send("Error interno del servidor.");
    }
});

// Inicia el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});

module.exports = app;
