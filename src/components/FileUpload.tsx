import React, { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Upload, Image } from 'antd';
import type { UploadFile, UploadProps } from 'antd';

const App: React.FC = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [firstPreview, setFirstPreview] = useState<string>('');
  const [firstFilename, setFirstFilename] = useState<string>('');

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview && file.originFileObj) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || (file.preview as string));
    setPreviewOpen(true);
  };

  const handleChange: UploadProps['onChange'] = async ({ fileList: newList }) => {
    setFileList(newList);

    if (newList.length > 0) {
      const first = newList[0];
      if (!first.url && !first.preview && first.originFileObj) {
        const base64 = await getBase64(first.originFileObj);
        first.preview = base64;
        setFirstPreview(base64);
      } else {
        setFirstPreview(first.url || (first.preview as string));
      }

      setFirstFilename(first.name || '');
    } else {
      setFirstPreview('');
      setFirstFilename('');
    }
  };

  const remainingCount = fileList.length - 1;

  return (
    <>
      <div className="flex justify-center items-center gap-6 mt-8 flex-wrap">
        {/* First Preview Image */}
        {firstPreview && (
          <div className="flex flex-col items-center w-[300px]">
            <div className="relative w-full h-[300px] bg-black overflow-hidden rounded-lg">
              <Image
                src={firstPreview}
                className="object-cover w-full h-full"
                onClick={() => handlePreview(fileList[0])}
                preview={false}
              />
            </div>
            <p className="mt-1 text-xs text-gray-600 truncate w-full text-center">{firstFilename}</p>
          </div>
        )}

        {/* +N More & Upload Button */}
        <div className="flex flex-col gap-4 items-center justify-center">
          {remainingCount > 0 && (
            <div className="w-[100px] h-[100px] bg-gray-100 rounded-lg flex items-center justify-center text-xl font-semibold text-gray-600 shadow-md">
              +{remainingCount} more
            </div>
          )}

          {fileList.length < 5 && (
            <Upload
              fileList={fileList}
              onPreview={handlePreview}
              onChange={handleChange}
              showUploadList={false}
              listType="picture-card"
            >
              <div className="w-[100px] h-[100px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 cursor-pointer">
                <PlusOutlined />
                <div className="mt-1 text-xs">Upload</div>
              </div>
            </Upload>
          )}
        </div>
      </div>

      {/* Hidden Preview Modal */}
      <Image
        style={{ display: 'none' }}
        src={previewImage}
        preview={{
          visible: previewOpen,
          onVisibleChange: (visible) => setPreviewOpen(visible),
        }}
      />
    </>
  );
};

export default App;
