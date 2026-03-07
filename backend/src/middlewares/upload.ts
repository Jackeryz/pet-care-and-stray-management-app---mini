import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";

// Ensure uploads directory exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.memoryStorage();

// Filter to accept images only
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed!"));
  }
};

// Create multer instance with memory storage
const multerUpload = multer({ storage, fileFilter });

// Middleware to process and save image with correct orientation
export const upload = {
  single: (fieldName: string) => (
    req: any,
    res: any,
    next: any
  ) => {
    multerUpload.single(fieldName)(req, res, async (err: any) => {
      if (err) {
        return next(err);
      }

      if (!req.file) {
        return next();
      }

      try {
        // Process image with sharp to handle EXIF orientation automatically
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const filename =
          fieldName +
          "-" +
          uniqueSuffix +
          ".jpg";
        const filepath = path.join(uploadDir, filename);

        // sharp automatically handles EXIF orientation with rotate()
        await sharp(req.file.buffer)
          .rotate() // Auto-rotates based on EXIF orientation
          .jpeg({ quality: 90, progressive: true })
          .toFile(filepath);

        // Replace file info with processed file details
        req.file.filename = filename;
        req.file.path = filepath;

        next();
      } catch (error) {
        console.error("Image processing error:", error);
        next(error);
      }
    });
  },
};
