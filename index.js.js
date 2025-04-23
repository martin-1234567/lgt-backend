const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());

const BASE_DIR = path.join(__dirname, "LGT Maintenance");

app.get("/api/operations", (req, res) => {
  const { systeme } = req.query;

  if (!systeme) {
    return res.status(400).json({ error: "Système non précisé." });
  }

  const systemePath = path.join(BASE_DIR, systeme);

  fs.readdir(systemePath, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error("Erreur lecture dossier :", err);
      return res.status(500).json({ error: "Erreur lors de la lecture du dossier." });
    }

    const dossiers = files
      .filter((f) => f.isDirectory())
      .map((f) => f.name);

    res.json(dossiers); // Ex: ["LGT-1100.0020", "LGT-1200.0030", ...]
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Serveur backend en écoute sur http://localhost:${PORT}`);
});


