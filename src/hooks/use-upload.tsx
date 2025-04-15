import { useCallback } from "react";
import { upload } from "@vercel/blob/client";
import logger from "@/utils/logger";



export const useUpload = () => {
  const uploadFile = async (file: File, pathPrefix: string): Promise<string> => {
    const filename = `${pathPrefix}/${Date.now()}-${file.name}`;
    const blob = await upload(filename, file, {
      access: "public",
      handleUploadUrl: "/api/upload-token",
      clientPayload: JSON.stringify({
        __development__: "bypass-auth-for-localhost",
      }),
      onUploadProgress: ({ percentage }) =>
        logger.log(`Upload progress: ${percentage}%`),
    });
    return blob.url;
  };

  return { uploadFile };
};