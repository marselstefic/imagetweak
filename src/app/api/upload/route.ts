import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
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
    const metadata = JSON.parse(metadataText);

    const files = formData.getAll("files") as Blob[];
    if (!files.length) {
      return NextResponse.json(
        { error: "At least one file must be uploaded" },
        { status: 400 }
      );
    }

    const uploadResults = await Promise.all(
      files.map(async (fileBlob) => {
        const mimeType = fileBlob.type;
        const fileExtension = mimeType.split("/")[1] || "jpg";
        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        const fileName = uuid() + "." + fileExtension;

        const s3Key = await uploadImage(buffer, fileName, mimeType);
        return { originalName: fileName, s3Key };
      })
    );

    // Save metadata + uploadResults to DB here if needed

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
