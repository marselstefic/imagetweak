import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/actions";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const metadataBlob = formData.get("metadata") as Blob | null;
    if (!metadataBlob) {
      return NextResponse.json(
        { error: "Metadata is required" },
        { status: 400 }
      );
    }

    const metadataText = await metadataBlob.text();
    const metadata = JSON.parse(metadataText) as {
      uploadId: string;
      user: string;
      imageName: string[]; // <-- This is the key
      startTime: string;
      imageParameters: any;
    };

    const files = formData.getAll("files") as File[];
    if (!files.length) {
      return NextResponse.json(
        { error: "At least one file must be uploaded" },
        { status: 400 }
      );
    }

    if (files.length !== metadata.imageName.length) {
      return NextResponse.json(
        { error: "Number of files doesn't match number of image names" },
        { status: 400 }
      );
    }

    const uploadResults = await Promise.all(
      files.map(async (file, index) => {
        const fileName = metadata.imageName[index]; // ✅ Use the name from metadata
        const mimeType = file.type;
        const buffer = Buffer.from(await file.arrayBuffer());

        const s3Key = await uploadImage(buffer, fileName, mimeType);
        return {
          originalName: file.name,
          fileName,
          s3Key,
        };
      })
    );

    return NextResponse.json({
      success: true,
      message: "Files uploaded successfully",
      uploadedFiles: uploadResults,
      metadata,
    });
  } catch (error) {
    console.error("Error uploading images:", error);
    return NextResponse.json(
      { error: "Error uploading images", details: (error as Error).message },
      { status: 500 }
    );
  }
}
