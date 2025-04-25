import React, { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { Upload, Image } from "antd";
import type { UploadFile, UploadProps } from "antd";
import path from 'path';

type FileUploadProps = {
  onImageChange: (images: Map<string, string>) => void;
  onImageSelect: (image: string) => void;
};

const FileUpload: React.FC<FileUploadProps> = ({ onImageChange, onImageSelect }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

    const handlePreview = async (file: UploadFile) => {
      if (file.originFileObj) {
        try {
          const base64 = await getBase64(file.originFileObj);
          onImageSelect(base64);  // Call your callback with the base64 value
        } catch (error) {
          console.error('Error converting file to base64:', error);
        }
      } else {
        console.error('File origin object is not available');
      }
    };

  const handleChange: UploadProps["onChange"] = async ({ fileList: newList }) => {
    setFileList(newList);

    const base64Images: Map<string,string> = new Map();

    for (const file of newList) {
      if (file.originFileObj) {
        const base64 = await getBase64(file.originFileObj);
        base64Images.set(path.parse(file.name).name, base64);
      }
    }

    // Send base64 images to parent
    onImageChange(base64Images);

    if (newList.length > 0) {
      const first = newList[0];
      const base64 = await getBase64(first.originFileObj!);
      first.preview = base64;
    } else {
    }
  };

  const remainingCount = fileList.length - 1;

  const uploadButton = (
    <button style={{ border: 0, background: 'none' }} type="button">
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
          wrapperStyle={{ display: 'none' }}
          preview={{
            visible: previewOpen,
            onVisibleChange: (visible) => setPreviewOpen(visible),
            afterOpenChange: (visible) => !visible && setPreviewImage(''),
          }}
          src={previewImage}
          className="custom-upload"
        />
      )}
    </>
  );
};

export default FileUpload;
