const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const multer = require("multer");

const app = express();
const port = process.env.PORT || 5000;

// Middleware para manejar JSON y URL-encoded
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware para manejar multipart/form-data
const upload = multer();
app.use(upload.any());

// Conexión PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Endpoint principal
app.get("/", (req, res) => {
    return res.status(200).send({
        message: "Servidor funcionando correctamente."
    });
});

// Función para extraer datos de JotForm
const extractJotFormData = (body) => {
    console.log("Datos recibidos:", body);

    let formData = {};

    // Manejo específico para JotForm
    if (body.q8_nombre && body.q4_email && body.q5_mensaje && body.q7_fecha) {
        formData = {
            nombre: body.q8_nombre,
            email: body.q4_email,
            mensaje: body.q5_mensaje,
            fecha: `${body.q7_fecha.year}-${body.q7_fecha.month}-${body.q7_fecha.day}`
        };
    }
    // Si los datos vienen como multipart/form-data
    else if (Array.isArray(body)) {
        formData = {};
        body.forEach((field) => {
            formData[field.fieldname] = field.value;
        });
    }
    // Datos JSON estándar o en la raíz del objeto
    else {
        formData = body;
    }

    return formData;
};

// Endpoint webhook
app.post("/webhook", async (req, res) => {
    console.log("Headers recibidos:", req.headers);
    console.log("Body recibido:", req.body);

    try {
        const formData = extractJotFormData(req.body);
        console.log("Datos extraídos:", formData);

        const { nombre, email, mensaje, fecha } = formData;

        // Verificación de datos
        if (!nombre || !email || !mensaje || !fecha) {
            console.log("Datos incompletos:", { nombre, email, mensaje, fecha });
            return res.status(400).json({
                error: "Datos incompletos",
                recibido: formData,
                camposFaltantes: {
                    nombre: !nombre,
                    email: !email,
                    mensaje: !mensaje,
                    fecha: !fecha
                }
            });
        }

        // Insertar en base de datos
        const result = await pool.query(
            "INSERT INTO formulario (nombre, email, mensaje, fecha) VALUES ($1, $2, $3, $4) RETURNING *",
            [nombre, email, mensaje, fecha]
        );

        console.log("Registro insertado:", result.rows[0]);

        return res.status(200).json({
            message: "Datos guardados con éxito",
            datos: {
                nombre,
                email,
                mensaje,
                fecha
            }
        });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({
            error: "Error del servidor",
            detalles: error.message
        });
    }
});

// Iniciar servidor
const server = app.listen(port, () => {
    console.log(`Servidor escuchando en puerto ${port}`);
});

module.exports = app;
