import "dotenv/config";

import express from "express";
import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json({ limit: "5mb" }));

// ✅ Use environment variables (DO NOT hardcode secrets)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !INTERNAL_SECRET) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

app.post("/generate", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || authHeader !== `Bearer ${INTERNAL_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { html, path } = req.body;

    if (!html || !path) {
      return res.status(400).json({ error: "Missing html or path" });
    }

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu"
  ]
});

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "domcontentloaded"
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true
    });

    await browser.close();

    const { error } = await supabase.storage
      .from("certificates")
      .upload(path, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true
      });

    if (error) {
      console.error("Storage upload error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ path });

  } catch (err) {
    console.error("PDF generation error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`PDF service running on port ${PORT}`);
});