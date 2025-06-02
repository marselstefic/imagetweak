"use client";

import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { uploadImageMetaData } from "@/lib/actions";
import { ImageMetaData } from "@/types/ImageMetaData";
import { ImageParameters } from "@/types/ImageParameters";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { UserResource } from "@clerk/types";
import { Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Link2, Link2Off } from "lucide-react";

export default function Home() {
  const { isSignedIn, user } = useUser();
  const [activeUser, setActiveUser] = useState<
    UserResource | undefined | null
  >();

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [imageUploaded, setImageUploaded] = useState(false);
  const [overwriteToggle, setOverwriteToggle] = useState(false);
  const [overwrittenFilename, setOverwrittenFilename] = useState("");

  const [brightness, setBrightness] = useState([50]);
  const [contrast, setContrast] = useState([50]);
  const [saturation, setSaturation] = useState([50]);
  const [opacity, setOpacity] = useState([100]);
  const [resX, setResX] = useState("512");
  const [resY, setResY] = useState("512");
  const [rotation, setRotation] = useState("0");
  const [outputFormat, setOutputFormat] = useState("png");
  const [aspectLocked, setAspectLocked] = useState(true);

  const [progress, setProgress] = useState(0);

  const { toast } = useToast();

  useEffect(() => {
    if (isSignedIn) {
      setActiveUser(user);
    }
  }, [isSignedIn, user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setProgress(1);

    if (!activeUser?.id) {
      toast({ variant: "destructive", title: "User not authenticated" });
      return;
    }

    const uploadId = uuidv4();
    const imageNames = imageFiles.map((file) => uuidv4() + "_" + file.name);

    const imageParameters: ImageParameters = {
      overwrittenFilename,
      resX: parseInt(resX),
      resY: parseInt(resY),
      rotationState: parseInt(rotation),
      brightness: brightness[0],
      contrast: contrast[0],
      saturation: saturation[0],
      opacity: opacity[0],
      outputFormat,
    };

    const imageMetaData: ImageMetaData = {
      uploadId,
      user: activeUser.id,
      imageName: imageNames,
      startTime: getFormattedDate(),
      imageParameters,
    };

    const formData = new FormData();
    formData.append(
      "metadata",
      new Blob([JSON.stringify(imageMetaData)], { type: "application/json" })
    );
    imageFiles.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const result = await response.json();
      imageMetaData.imageName = result.uploadedFiles.map(
        (file: any) => file.s3Key
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description:
          "An error occurred uploading your images to S3. Please try again.",
      });
      return;
    }

    setProgress(30);

    try {
      await uploadImageMetaData(imageMetaData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Metadata Upload Failed",
        description:
          "An error occurred saving metadata to DynamoDb. Please try again.",
      });
      return;
    }

    setProgress(60);

    console.log(imageParameters)

    try {
      const response = await fetch(
        "https://9v6q30w9i6.execute-api.eu-central-1.amazonaws.com/ImageProcessing",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(imageMetaData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Lambda processing failed");
      }

      toast({
        title: "Upload Complete",
        description: "Image uploaded, metadata saved, and processing started.",
        duration: 5000,
      });
      setProgress(100);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: "Image upload succeeded, but processing failed.",
      });
    }
  };

  const getFormattedDate = () => {
    const now = new Date();
    return `${now.getDate()}.${
      now.getMonth() + 1
    }.${now.getFullYear()}_${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
  };

  const handleResXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newX = e.target.value;
    setResX(newX);

    const parsedNewX = parseFloat(newX);
    const parsedResX = parseFloat(resX);
    const parsedResY = parseFloat(resY);

    if (aspectLocked && parsedNewX > 0 && parsedResX > 0 && parsedResY > 0) {
      const ratio = parsedNewX / parsedResX;
      const newY = Math.round(parsedResY * ratio);
      setResY(newY.toString());
    }
  };

  const handleResYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newY = e.target.value;
    setResY(newY);

    const parsedNewY = parseFloat(newY);
    const parsedResX = parseFloat(resX);
    const parsedResY = parseFloat(resY);

    if (aspectLocked && parsedNewY > 0 && parsedResX > 0 && parsedResY > 0) {
      const ratio = parsedNewY / parsedResY;
      const newX = Math.round(parsedResX * ratio);
      setResX(newX.toString());
    }
  };

  return (
    <div className="flex justify-center min-h-screen w-full">
      <main className="flex flex-col px-48 pt-8 w-full items-center">
        <SignedOut>SIGN UP TO SEE THIS PAGE!!!!</SignedOut>

        <SignedIn>
          <div className="shadow-md w-full">
            <div className={`flex flex-row w-full h-96`}>
              {/* File upload component */}
              <div
                className={`${
                  imageUploaded ? "md:w-1/3" : "w-full"
                } flex flex-col items-center p-6 bg-white border-4 border-dashed border-blue-100`}
              >
                <div className="text-2xl text-center w-full p-6">
                  Upload Library
                </div>

                <FileUpload
                  onImageChange={(filesMap) => {
                    const files = Array.from(filesMap.values());
                    setImageFiles(files);
                    setImageUploaded(true);

                    if (files.length > 0) {
                      const objectUrl = URL.createObjectURL(files[0]);
                      setSelectedImage(objectUrl);

                      const img = new Image();
                      img.onload = () => {
                        setResX(img.width.toString());
                        setResY(img.height.toString());
                      };
                      img.src = objectUrl; // ✅ this is the correct and available image URL
                    }
                  }}
                  onImageSelect={setSelectedImage}
                />
              </div>

              {/* Image view (right side) */}
              {imageUploaded && (
                <>
                  <div className="md:w-2/3 flex items-center justify-center h-full bg-white border border-blue-100">
                    <div className="h-full p-10">
                      <img
                        src={selectedImage}
                        alt="Uploaded Preview"
                        className="object-cover h-full"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Settings (bottom side) */}
          {imageUploaded && (
            <div className="bg-blue-50 p-6 shadow-md w-full flex-col">
              <div className="px-6 w-full">
                <Tabs defaultValue="colors" className="w-full">
                  <TabsList className="gap-x-8">
                    <TabsTrigger value="colors">Colors</TabsTrigger>
                    <TabsTrigger value="scaling">Scaling</TabsTrigger>
                    <TabsTrigger value="format">Format</TabsTrigger>
                  </TabsList>
                  <form onSubmit={handleSubmit} className="w-full">
                    <TabsContent value="colors">
                      <div className="flex flex-wrap flex-row p-4 my-2">
                        <div className="flex flex-row gap-x-3">
                          <div className="flex items-center">
                            <Label>Overwrite Filename</Label>
                          </div>
                          <div className="flex items-center">
                            <Checkbox
                              checked={overwriteToggle}
                              onCheckedChange={setOverwriteToggle}
                            />
                          </div>
                          <div className="flex items-center">
                            <Separator
                              orientation="vertical"
                              style={{
                                backgroundColor: "#909090",
                                height: "12px",
                              }}
                            />
                          </div>
                          <div className="flex items-center">
                            {overwriteToggle && (
                              <input
                                className="border"
                                value={overwrittenFilename}
                                onChange={(e) =>
                                  setOverwrittenFilename(e.target.value)
                                }
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap w-full h-full">
                          {[
                            {
                              label: "Brightness",
                              value: brightness,
                              setter: setBrightness,
                            },
                            {
                              label: "Contrast",
                              value: contrast,
                              setter: setContrast,
                            },
                            {
                              label: "Saturation",
                              value: saturation,
                              setter: setSaturation,
                            },
                            {
                              label: "Opacity",
                              value: opacity,
                              setter: setOpacity,
                            },
                          ].map(({ label, value, setter }) => (
                            <div
                              key={label}
                              className="flex flex-col md:flex-row gap-x-4 pr-5"
                            >
                              <div>
                                <Label>{label}</Label>
                              </div>
                              <div className="min-w-36 pt-2.5 md:max-w-56">
                                <Slider
                                  defaultValue={[50]}
                                  max={100}
                                  step={1}
                                  value={value}
                                  onValueChange={setter}
                                />
                              </div>
                              <div>
                                <Label>{value}</Label>
                              </div>
                              <Separator
                                orientation="vertical"
                                style={{ backgroundColor: "#909090" }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="scaling">
                      <div className="flex flex-wrap items-center gap-4 p-4">
                        <div className="flex flex-col">
                          <Label>Resolution (Width)</Label>
                          <Input value={resX} onChange={handleResXChange} />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="self-end mb-1"
                          onClick={() => setAspectLocked(!aspectLocked)}
                        >
                          {aspectLocked ? (
                            <Link2 className="w-5 h-5" />
                          ) : (
                            <Link2Off className="w-5 h-5" />
                          )}
                        </Button>
                        <div className="flex flex-col">
                          <Label>Resolution (Height)</Label>
                          <Input value={resY} onChange={handleResYChange} />
                        </div>
                        <div className="flex flex-col">
                          <Label>Rotation (°)</Label>
                          <Input
                            value={rotation}
                            onChange={(e) => setRotation(e.target.value)}
                          />
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="format">
                      <div className="flex flex-col p-4 gap-4">
                        <Label>Output Format</Label>
                        <Select
                          value={outputFormat}
                          onValueChange={setOutputFormat}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="png">PNG</SelectItem>
                            <SelectItem value="jpg">JPG</SelectItem>
                            <SelectItem value="jpeg">JPEG</SelectItem>
                            <SelectItem value="webp">WEBP</SelectItem>
                            <SelectItem value="tiff">TIFF</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                    <Button style={{ backgroundImage: "var(--gradient)" }}>
                      Save & Upload <Upload />
                    </Button>
                  </form>
                </Tabs>
              </div>
            </div>
          )}
          {progress != 0 && <Progress value={progress} />}
          <Toaster />
        </SignedIn>
      </main>
    </div>
  );
}
