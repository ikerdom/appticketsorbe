import { createUploadthing, type FileRouter } from "uploadthing/next";
import { requireCurrentUser } from "@/lib/data";

const f = createUploadthing();

export const ourFileRouter = {
  ticketAttachment: f({
    image: { maxFileSize: "4MB", maxFileCount: 10 },
    pdf: { maxFileSize: "8MB", maxFileCount: 5 },
    "application/msword": { maxFileSize: "8MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "8MB", maxFileCount: 5 }
  })
    .middleware(async () => {
      const user = await requireCurrentUser();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    })
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
