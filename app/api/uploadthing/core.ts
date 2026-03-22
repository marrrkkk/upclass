import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({
    image: {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      // If you throw, the user will not be able to upload
      if (!session?.user?.id) throw new UploadThingError("Unauthorized");

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.ufsUrl);

      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return { uploadedBy: metadata.userId };
    }),

  resourceUploader: f({
    pdf: {
      maxFileSize: "16MB",
      maxFileCount: 1,
    },
    text: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
      maxFileSize: "16MB",
      maxFileCount: 1,
    },
    "application/vnd.ms-powerpoint": {
      maxFileSize: "16MB",
      maxFileCount: 1,
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "16MB",
      maxFileCount: 1,
    },
    "application/msword": {
      maxFileSize: "16MB",
      maxFileCount: 1,
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      maxFileSize: "16MB",
      maxFileCount: 1,
    },
    "application/vnd.ms-excel": {
      maxFileSize: "16MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user?.id) throw new UploadThingError("Unauthorized");

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Resource upload complete for userId:", metadata.userId);
      console.log("file url", file.ufsUrl);
      console.log("file name", file.name);
      console.log("file size", file.size);

      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
        name: file.name,
        size: file.size?.toString() || "0",
      };
    }),

  messageMediaUploader: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 10,
    },
    video: {
      maxFileSize: "64MB",
      maxFileCount: 10,
    },
    audio: {
      maxFileSize: "16MB",
      maxFileCount: 10,
    },
  })
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user?.id) throw new UploadThingError("Unauthorized");

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Message media upload complete for userId:", metadata.userId);
      console.log("file url", file.ufsUrl);
      console.log("file name", file.name);
      console.log("file size", file.size);

      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
        name: file.name,
        size: file.size?.toString() || "0",
        type: file.type || "image",
      };
    }),

  submissionAttachmentUploader: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 5,
    },
    pdf: {
      maxFileSize: "16MB",
      maxFileCount: 5,
    },
    text: {
      maxFileSize: "4MB",
      maxFileCount: 5,
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "16MB",
      maxFileCount: 5,
    },
  })
    .middleware(async () => {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user?.id) throw new UploadThingError("Unauthorized");

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
        name: file.name,
        size: file.size?.toString() || "0",
        type: file.type || "application/octet-stream",
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
