import { Upload, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const FileUpload = () => (
  <Upload>
    <Button icon={<UploadOutlined />}>Click to Upload</Button>
  </Upload>
);

export default FileUpload;