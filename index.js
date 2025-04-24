console.log("✅ TEST DE VERIFICATION");

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

const app = express();
app.use(cors());

// ✅ Chemin ABSOLU vers ton dossier "LGT-Maintenance"
const BASE_DIR = process.env.BASE_DIR || path.join(__dirname, 'data');

// 🔍 Affichage du chemin utilisé
console.log("📂 BASE_DIR =", BASE_DIR);

// 🔍 Test lecture du contenu du dossier racine
try {
  const contenu = fs.readdirSync(BASE_DIR, { withFileTypes: true });
  console.log("📄 Dossiers trouvés dans BASE_DIR :");
  contenu.forEach((item) => {
    if (item.isDirectory()) {
      console.log("   📁", item.name);
    }
  });
} catch (err) {
  console.error("❌ Erreur lecture BASE_DIR :", err.message);
}

// ✅ Route : liste les opérations disponibles pour un système
app.get("/api/operations", (req, res) => {
  const { systeme } = req.query;

  if (!systeme) {
    return res.status(400).json({ error: "Système non précisé." });
  }

  const systemePath = path.join(BASE_DIR, systeme);
  console.log("📂 Lecture du dossier :", systemePath);
  fs.readdir(systemePath, (err, entries) => {
    if (err) {
      console.error("❌ Erreur lecture dossier :", err);
      return res.status(500).json({ error: "Erreur lecture dossier." });
    }

    const sousDossiers = entries.filter((entry) => {
      const fullPath = path.join(systemePath, entry);
      return fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory();
    });
    console.log("📁 Sous-dossiers trouvés :", sousDossiers);
      res.json(sousDossiers);
    });
  });

// ✅ Route : renvoie un fichier PDF ou Excel associé à une opération
app.get('/fichier', (req, res) => {
  const { systeme, operation, type } = req.query;

  if (!systeme || !operation || !type) {
    return res.status(400).send("Paramètres manquants");
  }

  let fileName;
  let contentType;

  if (type === "protocole") {
    fileName = `${operation}-V1.00.pdf`;
    contentType = "application/pdf";
  } else if (type === "tracabilite") {
    fileName = `FT-${operation}.xlsx`;
    contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else {
    return res.status(400).send("Type de fichier inconnu");
  }

  const cheminFichier = path.join(BASE_DIR, systeme, operation, fileName);
  console.log("🔍 Chemin construit :", cheminFichier);

  if (!fs.existsSync(cheminFichier)) {
    console.error("Fichier introuvable :", cheminFichier);
    return res.status(404).send("Fichier non trouvé");
  }

  res.setHeader("Content-Type", contentType);
  res.sendFile(cheminFichier);
});

// ✅ Nouvelle route avec extraction par tableau
app.get('/api/details', async (req, res) => {
  const { systeme, operation } = req.query;

  const filePath = path.join(BASE_DIR, systeme, operation, `${operation}-V1.00.pdf`);

  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const lines = data.text.split('\n').map(line => line.trim()).filter(Boolean);

    let outillages = [];
    let pieces = [];

    let mode = null;

    for (const line of lines) {
      const clean = line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      if (clean.includes("outillages necessaires")) {
        mode = "outillages";
        continue;
      }

      if (clean.includes("pieces detachees necessaires")) {
        mode = "pieces";
        continue;
      }

      if (mode === "outillages") {
        if (!clean.includes("famille") && !clean.includes("designation") && !clean.includes("reference")) {
          outillages.push(line);
        }
      }

      if (mode === "pieces") {
        if (!clean.includes("erp") && !clean.includes("designation") && !clean.includes("qte")) {
          pieces.push(line);
        }
      }
    }

    res.json({ outillages, pieces });
  } catch (err) {
    console.error("❌ Erreur lecture PDF :", err.message);
    res.status(500).json({ error: "Erreur lecture PDF" });
  }
});


// ✅ Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur backend en écoute sur http://localhost:${PORT}`);
});
