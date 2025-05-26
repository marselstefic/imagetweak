import { ImageParameters } from "./ImageParameters";

export interface ImageMetaData {
  uploadId: string;
  user: string | undefined;
  imageName: string[];
  startTime: string;
  imageParameters: ImageParameters;
}
