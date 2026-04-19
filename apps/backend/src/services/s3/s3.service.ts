import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuid } from "uuid";
import { s3, BUCKET_NAME } from "../../config/s3.js";

const MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "application/pdf": ".pdf",
};

const UPLOAD_URL_EXPIRY = 600;
const DOWNLOAD_URL_EXPIRY = 300;

type UploadContext =
  | { type: "chat"; chatId: string }
  | { type: "profile"; userId: string }
  | { type: "group"; groupId: string };

export const generateUploadUrl = async (
  context: UploadContext,
  fileType: string,
  fileSize: number,
) => {
  const ext = MIME_TO_EXT[fileType];
  if (!ext) throw new Error(`Unsupported file type: ${fileType}`);

  let key: string;
  
  switch (context.type) {
    case "chat":
      key = `chat/${context.chatId}/${uuid()}${ext}`;
      break;
    case "profile":
      key = `profile/${context.userId}/${uuid()}${ext}`;
      break;
    case "group":
      key = `group/${context.groupId}/${uuid()}${ext}`;
      break;
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: UPLOAD_URL_EXPIRY,
  });

  return { uploadUrl, key };
};

export const generateDownloadUrl = async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3, command, {
    expiresIn: DOWNLOAD_URL_EXPIRY,
  });

  return url;
};

export const deleteFile = async (key: string) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3.send(command);

  return true;
};
