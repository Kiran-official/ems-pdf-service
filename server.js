import express from "express";
import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json({ limit: "5mb" }));

const SUPABASE_URL = "https://hqvetmuoyshzonrlvolc.supabase.co";
const SUPABASE_SERVICE_ROLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxdmV0bXVveXNoem9ucmx2b2xjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTMyMzk2NiwiZXhwIjoyMDg2ODk5OTY2fQ.lSp-KanrIAV4jc4dRITqcVOFuIWMu_eL_XH1MgDOOHs";
const INTERNAL_SECRET = "ems_internal_9xF2kL7pQz81Tn4";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !INTERNAL_SECRET) {
  throw new Error("Missing environment variables");
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
  executablePath: "/usr/bin/chromium",
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--single-process',
    '--no-zygote'
  ],
  headless: true
});

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });

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
      return res.status(500).json({ error: error.message });
    }

    return res.json({ path });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`PDF service running on port ${PORT}`);
});
