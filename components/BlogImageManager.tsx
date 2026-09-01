"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BlogVideoProvider } from "@/lib/blog-video-url";

export type BlogImageMeta = {
  id: string;
  alt: string;
  order: number;
  kind: "image" | "video";
  videoUrl: string | null;
  videoProvider: BlogVideoProvider | null;
  hasData: boolean;
};

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

function encodeToWebp(
  image: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }
    ctx.drawImage(image, 0, 0, width, height);
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create blob"))),
      "image/webp",
      quality,
    );
  });
}

async function prepareUploadFile(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = objectUrl;
    });

    let scale = Math.min(1, 3000 / img.width, 4000 / img.height);
    let quality = 0.95;
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 12; attempt++) {
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      blob = await encodeToWebp(img, width, height, quality);
      if (blob.size <= MAX_UPLOAD_BYTES) break;
      if (scale > 0.55) scale *= 0.85;
      else if (quality > 0.88) quality = Math.max(0.88, quality - 0.03);
      else scale *= 0.8;
    }

    if (!blob) throw new Error("Could not resize image");
    return new File([blob], file.name.replace(/\.\w+$/, ".webp"), {
      type: "image/webp",
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function SortableBlogImage({
  image,
  onDelete,
}: {
  image: BlogImageMeta;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 z-10 cursor-grab active:cursor-grabbing bg-black/50 rounded p-1"
      >
        <GripVertical className="w-4 h-4 text-white" />
      </div>
      {image.hasData ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/blog-images/${image.id}`}
          alt={image.alt || ""}
          className="w-full h-32 object-cover rounded"
        />
      ) : (
        <div className="flex h-32 w-full items-center justify-center rounded bg-gray-200 text-xs text-gray-600">
          {image.kind === "video"
            ? `Video (${image.videoProvider || "url"})`
            : "No preview"}
        </div>
      )}
      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1 rounded">
        {image.order === 0 ? "Cover" : `Gallery #${image.order}`}
        {image.kind === "video" ? " · Video" : ""}
      </div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="absolute top-1 right-1 h-7 w-7 p-0"
        onClick={() => onDelete(image.id)}
      >
        ×
      </Button>
    </div>
  );
}

type BlogImageManagerProps = {
  postId: number;
  passwordHash: string;
  images: BlogImageMeta[];
  onImagesChange: () => Promise<void>;
};

export default function BlogImageManager({
  postId,
  passwordHash,
  images,
  onImagesChange,
}: BlogImageManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoAlt, setVideoAlt] = useState("");
  const [addingVideo, setAddingVideo] = useState(false);

  const sortedImages = useMemo(
    () => [...images].sort((a, b) => a.order - b.order),
    [images],
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploading(true);
      try {
        const hasCover = sortedImages.some((image) => image.order === 0);
        let coverAssigned = hasCover;
        for (let index = 0; index < files.length; index++) {
          const prepared = await prepareUploadFile(files[index]);
          const formData = new FormData();
          formData.set("passwordHash", passwordHash);
          formData.set("file", prepared);
          formData.set("postId", String(postId));
          formData.set("asCover", !coverAssigned ? "true" : "false");
          const response = await fetch("/api/blog-images/upload", {
            method: "POST",
            body: formData,
          });
          if (!response.ok) {
            const err = (await response.json().catch(() => null)) as {
              error?: string;
            } | null;
            alert(err?.error || "Image upload failed");
            break;
          }
          if (!coverAssigned) coverAssigned = true;
        }
        await onImagesChange();
      } finally {
        setUploading(false);
      }
    },
    [onImagesChange, passwordHash, postId, sortedImages],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/"),
      );
      void uploadFiles(files);
    },
    [uploadFiles],
  );

  const handleFileInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []).filter((file) =>
        file.type.startsWith("image/"),
      );
      void uploadFiles(files);
      event.target.value = "";
    },
    [uploadFiles],
  );

  const persistOrder = useCallback(
    async (ordered: BlogImageMeta[]) => {
      const imageOrders = Object.fromEntries(
        ordered.map((image, index) => [image.id, index]),
      );
      setReordering(true);
      try {
        const response = await fetch("/api/blog-images/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            passwordHash,
            postId,
            imageOrders,
          }),
        });
        if (!response.ok) {
          alert("Failed to save image order");
          return;
        }
        await onImagesChange();
      } finally {
        setReordering(false);
      }
    },
    [onImagesChange, passwordHash, postId],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = sortedImages.findIndex((image) => image.id === active.id);
      const newIndex = sortedImages.findIndex((image) => image.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      void persistOrder(arrayMove(sortedImages, oldIndex, newIndex));
    },
    [persistOrder, sortedImages],
  );

  const handleDelete = useCallback(
    async (imageId: string) => {
      const response = await fetch(`/api/blog-images/${imageId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordHash }),
      });
      if (!response.ok) {
        alert("Failed to delete image");
        return;
      }
      await onImagesChange();
    },
    [onImagesChange, passwordHash],
  );

  const handleAddVideo = useCallback(async () => {
    const trimmed = videoUrl.trim();
    if (!trimmed) return;
    setAddingVideo(true);
    try {
      const formData = new FormData();
      formData.set("passwordHash", passwordHash);
      formData.set("postId", String(postId));
      formData.set("videoUrl", trimmed);
      formData.set("alt", videoAlt.trim());
      formData.set(
        "asCover",
        sortedImages.some((image) => image.order === 0) ? "false" : "true",
      );
      const response = await fetch("/api/blog-images/video", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        alert(err?.error || "Failed to add video");
        return;
      }
      setVideoUrl("");
      setVideoAlt("");
      await onImagesChange();
    } finally {
      setAddingVideo(false);
    }
  }, [onImagesChange, passwordHash, postId, sortedImages, videoAlt, videoUrl]);

  return (
    <div className="space-y-3 border-t pt-4">
      <Label>Media</Label>
      <p className="text-sm text-muted-foreground">
        Upload images or paste a YouTube / Vimeo / Instagram URL. First item is
        the cover; drag to reorder.
      </p>
      <div
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => event.preventDefault()}
        role="button"
        tabIndex={0}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
        onClick={() => document.getElementById("blog-image-upload")?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            document.getElementById("blog-image-upload")?.click();
          }
        }}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-sm text-gray-600 mb-2">
          {uploading
            ? "Uploading…"
            : "Drag and drop images here, or click to select"}
        </p>
        <p className="text-xs text-gray-500">
          First media becomes the cover. Drag handles to reorder.
        </p>
        <Input
          id="blog-image-upload"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          disabled={uploading || reordering}
          className="hidden"
        />
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <Label htmlFor="blog-video-url">Add video URL</Label>
        <Input
          id="blog-video-url"
          type="url"
          placeholder="https://www.youtube.com/watch?v=… or Instagram / Vimeo"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          disabled={addingVideo || reordering}
        />
        <Input
          type="text"
          placeholder="Optional alt / title"
          value={videoAlt}
          onChange={(event) => setVideoAlt(event.target.value)}
          disabled={addingVideo || reordering}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={addingVideo || !videoUrl.trim()}
          onClick={() => void handleAddVideo()}
        >
          {addingVideo ? "Adding…" : "Add video"}
        </Button>
      </div>

      {sortedImages.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedImages.map((image) => image.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedImages.map((image) => (
                <SortableBlogImage
                  key={image.id}
                  image={image}
                  onDelete={(id) => void handleDelete(id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : null}
    </div>
  );
}
