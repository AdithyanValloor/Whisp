import express from "express";
import { protect } from "../auth/auth.middleware.js";
import { deleteFileController, getDownloadUrl, getUploadUrl } from "./s3.controller.js";
    

const router = express.Router();

router.post("/upload-url", protect, getUploadUrl);
router.get("/download-url", protect, getDownloadUrl);
router.delete("/file", protect, deleteFileController);

export {router as s3Router};