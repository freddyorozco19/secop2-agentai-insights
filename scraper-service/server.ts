import { createServer } from "http";
import { getProcessDocuments, downloadDocument } from "../src/lib/secop/scraper";

const PORT = parseInt(process.env.SCRAPER_PORT ?? "3100", 10);

const server = createServer(async (req, res) => {
  const url = req.url ?? "/";
  res.setHeader("Content-Type", "application/json");

  try {
    if (url === "/health") {
      res.writeHead(200);
      res.end(JSON.stringify({ status: "ok", timestamp: Date.now() }));
      return;
    }

    const docsMatch = url.match(/^\/documents\/(.+)$/);
    if (docsMatch) {
      const noticeUID = decodeURIComponent(docsMatch[1]);
      const documents = await getProcessDocuments(noticeUID);
      res.writeHead(200);
      res.end(JSON.stringify({ noticeUID, count: documents.length, documents }));
      return;
    }

    const downloadMatch = url.match(/^\/download\/(.+)$/);
    if (downloadMatch) {
      const documentFileId = decodeURIComponent(downloadMatch[1]);
      const { buffer, contentType } = await downloadDocument(documentFileId);
      res.setHeader("Content-Type", contentType);
      res.writeHead(200);
      res.end(buffer);
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Ruta no encontrada." }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno.";
    const status = message.includes("no encontrado") ? 404 : 503;
    res.writeHead(status);
    res.end(JSON.stringify({ error: message }));
  }
});

server.listen(PORT, () => {
  console.log(`SECOP scraper service escuchando en http://0.0.0.0:${PORT}`);
});
