import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

/**
 * Serve images via API route
 * Path format: /api/images/serve/models/slug/image.webp
 * Images are stored in the admin panel's filesystem when uploaded
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    
    // Security: ensure path is within public directory
    const publicDir = join(process.cwd(), "public");
    const imagePath = join(publicDir, ...path);
    
    if (!imagePath.startsWith(publicDir)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    
    if (!existsSync(imagePath)) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    
    const imageBuffer = await readFile(imagePath);
    const filename = path[path.length - 1];
    const ext = filename.split(".").pop()?.toLowerCase();
    
    // Determine content type
    let contentType = "image/webp";
    if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    else if (ext === "png") contentType = "image/png";
    else if (ext === "gif") contentType = "image/gif";
    else if (ext === "mp4") contentType = "video/mp4";
    else if (ext === "webm") contentType = "video/webm";
    
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 }
    );
  }
}
