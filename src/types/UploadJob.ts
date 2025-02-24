export interface UploadJob {
  uploadId: string;
  userId: string;
  startTime: string;
  status: string;
  fileSize?: number;
}
