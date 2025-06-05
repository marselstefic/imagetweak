import React, { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { Upload, Image } from "antd";
import type { UploadFile, UploadProps } from "antd";

type FileUploadProps = {
  onImageChange: (files: File[]) => void;
  onImageSelect: (image: [string, number] | null) => void;
};

const FileUpload: React.FC<FileUploadProps> = ({ onImageChange, onImageSelect }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");

  // Helper to convert a File to base64 for preview
  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const handlePreview = async (file: UploadFile) => {
    if (!file.preview && file.originFileObj) {
      file.preview = await getBase64(file.originFileObj);
    }
    if (file.preview) {
      const index = fileList.findIndex((f) => f.uid === file.uid);
      onImageSelect([file.preview as string, index]);
    } else {
      onImageSelect(null);
    }
  };

  const handleChange: UploadProps["onChange"] = async (info) => {
    const newFileList = await Promise.all(
      info.fileList.map(async (file) => {
        if (!file.preview && file.originFileObj) {
          file.preview = await getBase64(file.originFileObj);
        }
        return file;
      })
    );

    setFileList(newFileList);

    const files: File[] = newFileList
      .map((f) => f.originFileObj)
      .filter((f): f is File => f instanceof File);

    onImageChange(files);

    // Auto-select the last added image
    if (newFileList.length > 0) {
      const last = newFileList[newFileList.length - 1];
      onImageSelect([last.preview as string, newFileList.length - 1]);
    }
  };

  const uploadButton = (
    <button style={{ border: 0, background: "none" }} type="button">
      <PlusOutlined />
      <div>Upload</div>
    </button>
  );

  return (
    <>
      <Upload
        listType="picture-card"
        fileList={fileList}
        onPreview={handlePreview}
        onChange={handleChange}
        className="custom-upload-sm"
      >
        {fileList.length >= 8 ? null : uploadButton}
      </Upload>

      {previewImage && (
        <Image
          wrapperStyle={{ display: "none" }}
          preview={{
            visible: previewOpen,
            onVisibleChange: (visible) => setPreviewOpen(visible),
            afterOpenChange: (visible) => !visible && setPreviewImage(""),
          }}
          src={previewImage}
          className="custom-upload"
        />
      )}
    </>
  );
};

export default FileUpload;
