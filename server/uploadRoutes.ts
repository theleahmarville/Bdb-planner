import { Router } from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import { storagePut } from "./storage";
import { authService } from "./_core/sdk";

const router = Router();

// Use memory storage — files go directly to S3, never touch disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});


// Separate multer instance for audio files
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 }, // 16MB max (Whisper limit)
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/") || file.mimetype === "video/webm") {
      cb(null, true);
    } else {
      cb(new Error(`Audio type not allowed: ${file.mimetype}`));
    }
  },
});

// POST /api/upload/image — vision board images
router.post("/image", upload.single("file"), async (req, res) => {
  try {
    let user;
    try {
      user = await authService.authenticateRequest(req as any);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const ext = req.file.originalname.split(".").pop() ?? "jpg";
    const fileKey = `users/${user.id}/vision-board/${nanoid()}.${ext}`;
    const { url } = await storagePut(fileKey, req.file.buffer, req.file.mimetype);

    res.json({ url, fileKey, fileName: req.file.originalname, fileType: "image" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    res.status(500).json({ error: message });
  }
});

// POST /api/upload/attachment — section PDFs and files
router.post("/attachment", upload.single("file"), async (req, res) => {
  try {
    let user;
    try {
      user = await authService.authenticateRequest(req as any);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const ext = req.file.originalname.split(".").pop() ?? "bin";
    const section = (req.body.section as string) || "general";
    const fileKey = `users/${user.id}/attachments/${section}/${nanoid()}.${ext}`;
    const { url } = await storagePut(fileKey, req.file.buffer, req.file.mimetype);

    const fileType = req.file.mimetype === "application/pdf" ? "pdf" : "image";

    res.json({
      url,
      fileKey,
      fileName: req.file.originalname,
      fileType,
      fileSizeBytes: req.file.size,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    res.status(500).json({ error: message });
  }
});

// POST /api/upload/note-attachment — photos and PDFs attached to notes
router.post("/note-attachment", upload.single("file"), async (req, res) => {
  try {
    let user;
    try {
      user = await authService.authenticateRequest(req as any);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }
    const ext = req.file.originalname.split(".").pop() ?? "bin";
    const noteId = (req.body.noteId as string) || "unknown";
    const fileKey = `users/${user.id}/notes/${noteId}/${nanoid()}.${ext}`;
    const { url } = await storagePut(fileKey, req.file.buffer, req.file.mimetype);
    const isImage = req.file.mimetype.startsWith("image/");
    res.json({
      url,
      fileKey,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSizeBytes: req.file.size,
      isImage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    res.status(500).json({ error: message });
  }
});


// POST /api/upload/voice — audio recordings for Zion voice transcription
router.post("/voice", audioUpload.single("file"), async (req, res) => {
  try {
    let user;
    try {
      user = await authService.authenticateRequest(req as any);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No audio file provided" });
      return;
    }

    const fileKey = `users/${user.id}/voice/${nanoid()}.webm`;
    const { url } = await storagePut(fileKey, req.file.buffer, "audio/webm");

    res.json({ url, fileKey });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    res.status(500).json({ error: message });
  }
});

export { router as uploadRouter };
