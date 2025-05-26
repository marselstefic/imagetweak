import React, { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { Upload, Image } from "antd";
import type { UploadFile, UploadProps } from "antd";

type FileUploadProps = {
  onImageChange: (images: Map<string, File>) => void; // Changed to File instead of base64 string
  onImageSelect: (image: string) => void;
};

const FileUpload: React.FC<FileUploadProps> = ({ onImageChange, onImageSelect }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");

  //im keeping getBase64 only for preview generation
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
        setPreviewImage(base64);
        setPreviewOpen(true);
        onImageSelect(base64);  // still sends base64 for preview use
      } catch (error) {
        console.error('Error converting file to base64:', error);
      }
    } else {
      console.error('File origin object is not available');
    }
  };

  const handleChange: UploadProps["onChange"] = async ({ fileList: newList }) => {
    setFileList(newList);

    const fileMap: Map<string, File> = new Map();

    for (const file of newList) {
      if (file.originFileObj) {
        fileMap.set(file.name, file.originFileObj);
      }
    }

    onImageChange(fileMap);

    // Generate preview for first file in the list
    if (newList.length > 0 && newList[0].originFileObj) {
      const base64 = await getBase64(newList[0].originFileObj);
      newList[0].preview = base64;
    }
  };

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
