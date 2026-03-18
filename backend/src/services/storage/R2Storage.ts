import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";
import path from "path";
import { StorageProvider } from "./StorageProvider.js";
import { env } from "../../config/env.js";

/**
 * Cloudflare R2 storage provider for production.
 * R2 is S3-compatible, so we use the AWS SDK.
 */
export class R2Storage implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    this.bucket = env.r2BucketName;
    this.publicUrl = env.r2PublicUrl.replace(/\/$/, "");

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2AccessKeyId,
        secretAccessKey: env.r2SecretAccessKey,
      },
    });
  }

  async upload(
    file: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<string> {
    const ext = path.extname(filename) || this.getExtFromMime(mimetype);
    const key = `uploads/${uuid()}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: mimetype,
      }),
    );

    return `${this.publicUrl}/${key}`;
  }

  async delete(fileUrl: string): Promise<void> {
    const key = this.keyFromUrl(fileUrl);
    if (!key) return;

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  getUrl(filePath: string): string {
    if (filePath.startsWith("http")) return filePath;
    return `${this.publicUrl}/${filePath}`;
  }

  private keyFromUrl(url: string): string | null {
    if (url.startsWith(this.publicUrl)) {
      return url.slice(this.publicUrl.length + 1);
    }
    if (url.startsWith("uploads/")) return url;
    return null;
  }

  private getExtFromMime(mimetype: string): string {
    const mimeToExt: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
    };
    return mimeToExt[mimetype] || "";
  }
}
