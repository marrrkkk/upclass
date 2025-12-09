"use client";

import { useState } from "react";
import { UploadButton, UploadDropzone } from "@/lib/uploadthing";

export function UploadTest() {
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

    return (
        <div className="flex flex-col items-center gap-8 p-8 rounded-xl border bg-card shadow-sm max-w-2xl mx-auto">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">UploadThing Test</h2>
                <p className="text-muted-foreground">
                    Test your UploadThing integration by uploading an image
                </p>
            </div>

            <div className="w-full space-y-8">
                {/* Upload Button */}
                <div className="text-center">
                    <h3 className="font-semibold mb-4">Upload Button</h3>
                    <UploadButton
                        endpoint="imageUploader"
                        onClientUploadComplete={(res) => {
                            console.log("Files: ", res);
                            if (res && res[0]) {
                                setUploadedUrl(res[0].ufsUrl);
                            }
                            alert("Upload Completed!");
                        }}
                        onUploadError={(error: Error) => {
                            alert(`ERROR! ${error.message}`);
                        }}
                    />
                </div>

                {/* Upload Dropzone */}
                <div className="text-center">
                    <h3 className="font-semibold mb-4">Upload Dropzone</h3>
                    <UploadDropzone
                        endpoint="imageUploader"
                        onClientUploadComplete={(res) => {
                            console.log("Files: ", res);
                            if (res && res[0]) {
                                setUploadedUrl(res[0].ufsUrl);
                            }
                            alert("Upload Completed!");
                        }}
                        onUploadError={(error: Error) => {
                            alert(`ERROR! ${error.message}`);
                        }}
                    />
                </div>
            </div>

            {/* Display uploaded image */}
            {uploadedUrl && (
                <div className="text-center w-full">
                    <h3 className="font-semibold mb-4">Uploaded Image</h3>
                    <div className="rounded-lg overflow-hidden border">
                        <img
                            src={uploadedUrl}
                            alt="Uploaded"
                            className="max-w-full h-auto"
                        />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 break-all">
                        URL: {uploadedUrl}
                    </p>
                </div>
            )}
        </div>
    );
}
