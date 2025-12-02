"use client";

import { useState, useEffect, useCallback } from "react";
import { hashPassword } from "@/lib/client-auth";
import PasswordDialog, { getCachedPassword, getCachedPasswordHash } from "@/components/PasswordDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GripVertical, Upload, X, ChevronLeft, ChevronRight } from "lucide-react";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  useSortable,
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface GalleryItem {
  id?: string;
  type: "image" | "video";
  src: string;
  alt: string;
  data?: string; // Base64 data
}

interface Model {
  id: string;
  slug: string;
  name: string;
  stats: {
    height: string;
    bust: string;
    waist: string;
    hips: string;
    shoeSize: string;
    hairColor: string;
    eyeColor: string;
  };
  instagram?: string;
  featuredImage?: string;
  gallery?: GalleryItem[];
}

interface ModelFormProps {
  model?: Model | null;
  onClose: () => void;
  onSave: (modelId?: string) => void;
  password?: string;
}

function SortableGalleryItem({
  item,
  password,
  modelId,
  onDelete,
  onFullscreen,
}: Readonly<{
  item: GalleryItem;
  password: string;
  modelId?: string;
  onDelete: (itemId: string) => void;
  onFullscreen: (item: GalleryItem) => void;
}>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id || item.src });

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
      <button
        type="button"
        className="w-full h-32 p-0 border-0 bg-transparent cursor-pointer"
        onClick={() => onFullscreen(item)}
        aria-label={`View ${item.alt} in fullscreen`}
      >
      <img
        src={item.src}
        alt={item.alt}
          className="w-full h-32 object-cover rounded pointer-events-none"
      />
      </button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="absolute top-1 right-1"
        onClick={async () => {
          if (item.id && password && modelId) {
            try {
              const passwordHash = await hashPassword(password);
              const response = await fetch(`/api/images/${item.id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passwordHash }),
              });

              if (!response.ok) {
                alert("Failed to delete image from database");
                return;
              }
              onDelete(item.id);
            } catch (error) {
              console.error("Error deleting image:", error);
              alert("Failed to delete image");
            }
          } else {
            onDelete(item.id || item.src);
          }
        }}
      >
        ×
      </Button>
    </div>
  );
}

interface SortableImageItemProps {
  img: {
    file: File;
    preview: string;
    data: string;
    width: number;
    height: number;
    size: number;
    type: string;
    resizedData?: string;
  };
  index: number;
  onRemove: (index: number) => void;
  onMakeFeatured: (index: number) => void;
  onFullscreen: (index: number) => void;
  formatFileSize: (bytes: number) => string;
}

function SortableImageItem({
  img,
  index,
  onRemove,
  onMakeFeatured,
  onFullscreen,
  formatFileSize,
}: Readonly<SortableImageItemProps>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(index) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const resizedSize = img.resizedData 
    ? Math.round((img.resizedData.length * 3) / 4)
    : img.size;
  const isResized = resizedSize < img.size;
  const sizeReduction = isResized 
    ? Math.round(((img.size - resizedSize) / img.size) * 100)
    : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group border rounded-lg overflow-hidden bg-gray-50"
    >
      {index === 0 && (
        <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded z-10">
          Featured
        </div>
      )}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-8 z-10 cursor-grab active:cursor-grabbing bg-black/50 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-3 h-3 text-white" />
      </div>
      <button
        type="button"
        className="w-full h-32 p-0 border-0 bg-transparent cursor-pointer"
        onClick={() => onFullscreen(index)}
        aria-label={`View ${img.file.name} in fullscreen`}
      >
        <img
          src={img.preview}
          alt={`Preview ${index + 1}`}
          className="w-full h-32 object-cover pointer-events-none"
        />
      </button>
      <div className="p-2 space-y-1 text-xs">
        <div className="font-medium truncate" title={img.file.name}>
          {img.file.name}
        </div>
        <div className="text-gray-600 space-y-0.5">
          <div className="font-semibold">{img.width} × {img.height}px</div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className={isResized ? "line-through text-gray-400" : ""}>
              {formatFileSize(img.size)}
            </span>
            {isResized && (
              <>
                <span>→</span>
                <span className="text-green-600 font-medium">
                  {formatFileSize(resizedSize)}
                </span>
                <span className="text-green-600">(-{sizeReduction}%)</span>
              </>
            )}
          </div>
          <div className="text-gray-500">{img.type.split("/")[1]?.toUpperCase() || "IMAGE"}</div>
        </div>
        {index !== 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full mt-1 text-xs"
            onClick={() => onMakeFeatured(index)}
          >
            Make Featured
          </Button>
        )}
      </div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function ModelForm({ model, onClose, onSave, password: initialPassword }: Readonly<ModelFormProps>) {
  const [formData, setFormData] = useState({
    id: model?.id || "",
    slug: model?.slug || "",
    name: model?.name || "",
    stats: {
      height: model?.stats?.height || "",
      bust: model?.stats?.bust || "",
      waist: model?.stats?.waist || "",
      hips: model?.stats?.hips || "",
      shoeSize: model?.stats?.shoeSize || "",
      hairColor: model?.stats?.hairColor || "",
      eyeColor: model?.stats?.eyeColor || "",
    },
    instagram: model?.instagram || "",
    featuredImage: model?.featuredImage || "",
    gallery: model?.gallery || [],
  });

  const [password, setPassword] = useState(initialPassword || "");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [images, setImages] = useState<Array<{ 
    file: File; 
    preview: string; 
    data: string;
    width: number;
    height: number;
    size: number;
    type: string;
    resizedData?: string;
  }>>([]);
  const [fullscreenImage, setFullscreenImage] = useState<number | null>(null);
  const [fullscreenGalleryItem, setFullscreenGalleryItem] = useState<GalleryItem | null>(null);
  const [resizeOptions, setResizeOptions] = useState<Array<{
    label: string;
    maxWidth: number;
    maxHeight: number;
    savings: number;
    croppedWidth: number;
    croppedHeight: number;
  }> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update form data when model prop changes
  useEffect(() => {
    if (model) {
      // Combine featured image with gallery for unified drag-and-drop
      // The first item in the combined list will be the featured image (order 0)
      const featuredImageId = (model as any).featuredImageId;
      const combinedGallery = model.featuredImage && featuredImageId
        ? [
            {
              id: featuredImageId,
              type: "image" as const,
              src: model.featuredImage,
              alt: `${model.name} - Featured`,
            },
            ...(model.gallery || [])
          ]
        : (model.gallery || []);
      
      setFormData({
        id: model.id || "",
        slug: model.slug || "",
        name: model.name || "",
        stats: {
          height: model.stats?.height || "",
          bust: model.stats?.bust || "",
          waist: model.stats?.waist || "",
          hips: model.stats?.hips || "",
          shoeSize: model.stats?.shoeSize || "",
          hairColor: model.stats?.hairColor || "",
          eyeColor: model.stats?.eyeColor || "",
        },
        instagram: model.instagram || "",
        featuredImage: model.featuredImage || "",
        gallery: combinedGallery,
      });
    } else {
      // Reset form when creating new model
      setFormData({
        id: "",
        slug: "",
        name: "",
        stats: {
          height: "",
          bust: "",
          waist: "",
          hips: "",
          shoeSize: "",
          hairColor: "",
          eyeColor: "",
        },
        instagram: "",
        featuredImage: "",
        gallery: [],
      });
    }
  }, [model]);

  // Helper function to generate slug from name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/[\s_-]+/g, "-") // Replace spaces, underscores, and multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith("stats.")) {
      const statField = field.split(".")[1];
      setFormData({
        ...formData,
        stats: {
          ...formData.stats,
          [statField]: value,
        },
      });
    } else {
      const updatedFormData = {
        ...formData,
        [field]: value,
      };
      
      // Auto-generate slug from name when name changes (only for new models)
      if (field === "name" && !model && value) {
        updatedFormData.slug = generateSlug(value);
      }
      
      setFormData(updatedFormData);
    }
  };

  // Resize image using canvas with WebP compression
  const resizeImage = (
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number = 0.85
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height && width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        } else if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
      return;
    }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Could not create blob"));
      return;
    }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          },
          "image/webp",
          quality
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Automatically resize image to reduce upload size
  const autoResizeImage = async (
    file: File,
    maxWidth: number = 1200,
    maxHeight: number = 1600
  ): Promise<{ resizedData: string; resizedFile: File; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        let { width, height } = img;

        // Only resize if image is larger than max dimensions
        const needsResize = width > maxWidth || height > maxHeight;
        
        if (!needsResize) {
          // No resize needed, return original
          const originalData = await fileToBase64(file);
          resolve({
            resizedData: originalData,
            resizedFile: file,
            width,
            height,
          });
          return;
        }

        // Calculate new dimensions maintaining aspect ratio
        if (width > height && width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        } else if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error("Could not create blob"));
              return;
            }
            
            // Convert blob to File
            const resizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
              type: "image/webp",
            });
            
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                resizedData: reader.result as string,
                resizedFile,
                width: Math.round(width),
                height: Math.round(height),
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          },
          "image/webp",
          0.85
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Calculate resize options for an image
  const calculateResizeOptions = (img: typeof images[0]) => {
    const options = [
      { label: "Original", maxWidth: img.width, maxHeight: img.height },
      { label: "Large (1920×2560)", maxWidth: 1920, maxHeight: 2560 },
      { label: "Medium (1200×1600)", maxWidth: 1200, maxHeight: 1600 },
      { label: "Small (1080×1440)", maxWidth: 1080, maxHeight: 1440 },
      { label: "Thumbnail (800×1067)", maxWidth: 800, maxHeight: 1067 },
    ];

    return options.map((option) => {
      let { width, height } = { width: img.width, height: img.height };
      const aspectRatio = width / height;

      // Calculate new dimensions maintaining aspect ratio
      if (width > height && width > option.maxWidth) {
        height = option.maxWidth / aspectRatio;
        width = option.maxWidth;
      } else if (height > option.maxHeight) {
        width = option.maxHeight * aspectRatio;
        height = option.maxHeight;
      }

      // Estimate file size reduction (rough approximation)
      const areaReduction = ((img.width * img.height) - (width * height)) / (img.width * img.height);
      const estimatedSavings = Math.round(img.size * areaReduction * 0.7); // 0.7 is a rough compression factor

      const croppedWidth = Math.max(0, img.width - width);
      const croppedHeight = Math.max(0, img.height - height);

      return {
        ...option,
        savings: estimatedSavings,
        croppedWidth: Math.round(croppedWidth),
        croppedHeight: Math.round(croppedHeight),
      };
    });
  };

  // Apply resize option to an image
  const applyResize = async (imageIndex: number, option: { maxWidth: number; maxHeight: number }) => {
    const img = images[imageIndex];
    if (!img) return;

    try {
      const resizedData = await resizeImage(img.file, option.maxWidth, option.maxHeight);
      setImages((prev) => {
        const newImages = [...prev];
        newImages[imageIndex] = {
          ...newImages[imageIndex],
          data: resizedData,
          resizedData,
        };
        return newImages;
      });
      setResizeOptions(null);
    } catch (error) {
      console.error("Error resizing image:", error);
      alert("Failed to resize image");
    }
  };

  // Handle file drop
  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (files.length === 0) return;

    setUploading(true);
    try {
      const newImages = await Promise.all(
        files.map(async (file) => {
          // Automatically resize image to reduce upload size
          const { resizedData, resizedFile, width, height } = await autoResizeImage(file);
          const preview = URL.createObjectURL(resizedFile);
          
          return {
            file: resizedFile, // Use resized file for upload
            preview,
            data: resizedData, // Use resized data
            width,
            height,
            size: resizedFile.size,
            type: resizedFile.type,
            resizedData, // Resized data
          };
        })
      );

      // If editing existing model, add to gallery at position 2 (after featured)
      // If creating new model, add to images array
      if (model && formData.gallery.length > 0) {
        const newGalleryItems = newImages.map((img, index) => ({
          id: `new-${Date.now()}-${index}`,
          type: "image" as const,
          src: img.preview,
          alt: `${formData.name || "Image"} - ${formData.gallery.length + index}`,
          data: img.data,
        }));
        
        // Insert at position 2 (after featured image at position 1)
        const updatedGallery = [
          formData.gallery[0], // Keep featured image first
          ...newGalleryItems,
          ...formData.gallery.slice(1), // Rest of existing gallery
        ];
        
        setFormData({ ...formData, gallery: updatedGallery });
      } else {
        // New model: add to images array
        setImages((prev) => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error("Error processing images:", error);
      alert("Failed to process images");
    } finally {
      setUploading(false);
    }
  }, [model, formData]);

  // Handle file input
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) =>
      file.type.startsWith("image/")
    );

    if (files.length === 0) return;

    setUploading(true);
    try {
      const newImages = await Promise.all(
        files.map(async (file) => {
          // Automatically resize image to reduce upload size
          const { resizedData, resizedFile, width, height } = await autoResizeImage(file);
          const preview = URL.createObjectURL(resizedFile);
          
          return {
            file: resizedFile, // Use resized file for upload
            preview,
            data: resizedData, // Use resized data
            width,
            height,
            size: resizedFile.size,
            type: resizedFile.type,
            resizedData, // Resized data
          };
        })
      );

      // If editing existing model, add to gallery at position 2 (after featured)
      // If creating new model, add to images array
      if (model && formData.gallery.length > 0) {
        const newGalleryItems = newImages.map((img, index) => ({
          id: `new-${Date.now()}-${index}`,
          type: "image" as const,
          src: img.preview,
          alt: `${formData.name || "Image"} - ${formData.gallery.length + index}`,
          data: img.data,
        }));
        
        // Insert at position 2 (after featured image at position 1)
        const updatedGallery = [
          formData.gallery[0], // Keep featured image first
          ...newGalleryItems,
          ...formData.gallery.slice(1), // Rest of existing gallery
        ];
        
        setFormData({ ...formData, gallery: updatedGallery });
      } else {
        // New model: add to images array
        setImages((prev) => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error("Error processing images:", error);
      alert("Failed to process images");
    } finally {
      setUploading(false);
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  // Move image to first position (make it featured)
  const makeFeatured = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const newImages = [...prev];
      const [moved] = newImages.splice(index, 1);
      return [moved, ...newImages];
    });
  };

  // Navigate fullscreen images
  const navigateFullscreen = (direction: "prev" | "next") => {
    if (fullscreenImage === null) return;
    const newIndex = direction === "prev" 
      ? (fullscreenImage - 1 + images.length) % images.length
      : (fullscreenImage + 1) % images.length;
    setFullscreenImage(newIndex);
    setResizeOptions(null); // Close resize options when navigating
  };

  // Open fullscreen with resize options
  const openFullscreen = (index: number) => {
    setFullscreenImage(index);
    if (images[index]) {
      setResizeOptions(calculateResizeOptions(images[index]));
    }
  };

  const handlePasswordSuccess = (passwordHash: string) => {
    // Get the actual password from cache
    const cachedPassword = getCachedPassword();
    if (cachedPassword) {
      setPassword(cachedPassword);
      setShowPasswordDialog(false);
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    }
  };

  const requestPassword = (action: () => void) => {
    const cachedPassword = getCachedPassword();
    if (cachedPassword) {
      setPassword(cachedPassword);
      action();
    } else {
      setPendingAction(() => action);
      setShowPasswordDialog(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      requestPassword(() => {
        // Re-trigger submit after password is set
        const form = e.target as HTMLFormElement;
        form.requestSubmit();
      });
      return;
    }

    if (images.length === 0 && !formData.featuredImage) {
      alert("Please add at least one image");
      return;
    }

    setSaving(true);

    try {
      const passwordHash = await hashPassword(password);
      
      // For existing models: upload only new images, then update model, then reorder if needed
      if (model) {
        const url = `/api/models/${model.id}`;
        const modelId = model.id;
        
        // Identify new images (those with data and IDs starting with "new-" or no real ID)
        const newGalleryItems = formData.gallery?.filter((item) => 
          item.data && (item.id?.startsWith("new-") || !item.id)
        ) || [];

        // Upload new images via PUT requests in parallel
        if (newGalleryItems.length > 0) {
          const uploadPromises = newGalleryItems.map(async (item, index) => {
            // Find the corresponding File object from images array or from the item
            let file: File | null = null;
            
            // Try to find file from images array (for newly uploaded files)
            const imageMatch = images.find(img => img.preview === item.src || img.data === item.data);
            if (imageMatch) {
              file = imageMatch.file;
            } else if (item.data && item.data.startsWith("data:")) {
              // Convert base64 data URI back to File if needed
              // This is a fallback - ideally we should keep the File object
              const response = await fetch(item.data);
              const blob = await response.blob();
              file = new File([blob], `image-${Date.now()}.webp`, { type: blob.type });
            }

            if (!file) {
              return { success: false, index, error: "File not found" };
            }

            const uploadFormData = new FormData();
            uploadFormData.append("file", file);
            uploadFormData.append("modelId", modelId); // Use modelId instead of slug
            // First new item might be featured if it's at position 0
            const isFirstNewItem = formData.gallery && formData.gallery[0] === item;
            uploadFormData.append("type", isFirstNewItem ? "featured" : "gallery");
            uploadFormData.append("passwordHash", passwordHash);

            try {
              const response = await fetch("/api/upload", {
                method: "PUT",
                body: uploadFormData,
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || error.details || "Unknown error");
              }

              return { success: true, index, item };
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              return { success: false, index, item, error: errorMessage };
            }
          });

          const results = await Promise.allSettled(uploadPromises);
          
          // Check for failures
          const failures = results
            .map((result, idx) => {
              if (result.status === "rejected") {
                return { index: idx, error: result.reason?.message || "Unknown error" };
              }
              if (result.status === "fulfilled" && !result.value.success) {
                return { index: result.value.index, error: result.value.error };
              }
              return null;
            })
            .filter((failure): failure is { index: number; error: string } => failure !== null);

          if (failures.length > 0) {
            const failureMessages = failures.map(f => `Image ${f.index + 1}: ${f.error}`).join("\n");
            alert(`Failed to upload ${failures.length} new image(s):\n${failureMessages}`);
            return;
          }
        }

        // Only send stats and non-image fields to the model update endpoint
        // Images are handled separately via /api/upload
        const { id, featuredImage, gallery, ...dataToSend } = formData;

        const response = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: dataToSend.slug,
            name: dataToSend.name,
            stats: dataToSend.stats,
            instagram: dataToSend.instagram || null,
            passwordHash,
            // featuredImage and gallery are NOT sent - they're handled via /api/upload
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(`Failed to save model: ${error.error || "Unknown error"}`);
          return;
        }

        // Reorder images if gallery order has changed
        if (formData.gallery && formData.gallery.length > 0) {
          setIsReordering(true);
          try {
            // Create mapping of imageId -> order (starting from 0)
            // The first image (index 0) is the featured image
            const imageOrders: Record<string, number> = {};
            formData.gallery.forEach((img, index) => {
              if (img.id && !img.id.startsWith("new-")) {
                imageOrders[img.id] = index;
              }
            });
            
            if (Object.keys(imageOrders).length > 0) {
              const reorderResponse = await fetch("/api/images/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  modelId: model.id,
                  imageOrders,
                  passwordHash,
                }),
              });
              
              if (!reorderResponse.ok) {
                console.error("Failed to reorder images, but model was saved");
              }
            }
          } catch (error) {
            console.error("Error reordering images:", error);
            // Don't fail the whole save if reordering fails
          } finally {
            setIsReordering(false);
          }
        }

        for (const img of images) {
          URL.revokeObjectURL(img.preview);
        }
        setImages([]);
        onSave(model.id);
        return;
      }

      // For new models: 
      // 1. Create empty model (just name/slug) → get ID
      // 2. Upload images using modelId
      // 3. Update stats using PUT /api/models/[id]
      
      // Step 1: Create empty model with minimal data
      const createResponse = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          // Don't send stats, instagram, featuredImage, or gallery - will update later
          passwordHash,
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        alert(`Failed to create model: ${error.error || "Unknown error"}`);
        return;
      }

      const newModel = await createResponse.json();
      const modelId = newModel.id; // Use ID instead of slug

      // Step 2: Upload all images in parallel using modelId
      if (images.length > 0) {
        const uploadPromises = images.map(async (img, index) => {
          const formData = new FormData();
          formData.append("file", img.file);
          formData.append("modelId", modelId); // Use modelId instead of slug
          formData.append("type", index === 0 ? "featured" : "gallery");
          formData.append("passwordHash", passwordHash);

          try {
            const response = await fetch("/api/upload", {
              method: "PUT",
              body: formData,
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || error.details || "Unknown error");
            }

            return { success: true, index, type: index === 0 ? "featured" : "gallery" };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, index, type: index === 0 ? "featured" : "gallery", error: errorMessage };
          }
        });

        const results = await Promise.allSettled(uploadPromises);
        
        // Check for failures
        const failures = results
          .map((result, idx) => {
            if (result.status === "rejected") {
              return { index: idx, error: result.reason?.message || "Unknown error" };
            }
            if (result.status === "fulfilled" && !result.value.success) {
              return { index: result.value.index, error: result.value.error };
            }
            return null;
          })
          .filter((failure): failure is { index: number; error: string } => failure !== null);

        if (failures.length > 0) {
          const failureMessages = failures.map(f => `Image ${f.index + 1}: ${f.error}`).join("\n");
          alert(`Failed to upload ${failures.length} image(s):\n${failureMessages}`);
          return;
        }
      }

      // Step 3: Update stats and other fields
      const updateResponse = await fetch(`/api/models/${modelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: formData.slug,
          name: formData.name,
          stats: formData.stats,
          instagram: formData.instagram || null,
          passwordHash,
        }),
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        alert(`Failed to update model stats: ${error.error || "Unknown error"}`);
        return;
      }

      // Clean up preview URLs
      for (const img of images) {
        URL.revokeObjectURL(img.preview);
      }
      setImages([]);
      onSave(modelId);
    } catch (error) {
      console.error("Error saving model:", error);
      alert("Failed to save model");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{model ? "Edit Model" : "Add Model"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
              <Input
              id="name"
                type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
            {!model && formData.name && (
              <p className="text-sm text-muted-foreground">
                Slug will be: {generateSlug(formData.name)}
              </p>
            )}
            </div>

            <div className="space-y-2">
            <Label>Images</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop or click to upload. New images will be added after the featured image.
            </p>
            
            {/* Drag and drop area */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => e.preventDefault()}
              role="button"
              tabIndex={0}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById("image-upload")?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  document.getElementById("image-upload")?.click();
                }
              }}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop images here, or click to select
              </p>
              <p className="text-xs text-gray-500">
                {model ? "New images will be added after the featured image" : "First image will be used as featured image"}
              </p>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInput}
                disabled={uploading}
                className="hidden"
              />
          </div>

            {/* Image previews with drag-and-drop reordering */}
            {images.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => {
                  const { active, over } = event;
                  if (!over || active.id === over.id) return;
                  
                  const oldIndex = images.findIndex((_, i) => String(i) === active.id);
                  const newIndex = images.findIndex((_, i) => String(i) === over.id);
                  
                  if (oldIndex !== -1 && newIndex !== -1) {
                    setImages((prev) => arrayMove(prev, oldIndex, newIndex));
                  }
                }}
              >
                <SortableContext
                  items={images.map((_, index) => String(index))}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                    {images.map((img, index) => (
                      <SortableImageItem
                        key={`${img.file.name}-${index}`}
                        img={img}
                        index={index}
                        onRemove={removeImage}
                        onMakeFeatured={makeFeatured}
                        onFullscreen={openFullscreen}
                        formatFileSize={formatFileSize}
                      />
                    ))}
          </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Fullscreen image viewer for uploaded images */}
            {fullscreenImage !== null && images[fullscreenImage] && (
              <Dialog open={true} onOpenChange={() => {
                setFullscreenImage(null);
                setResizeOptions(null);
              }}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black/95">
                  <DialogHeader className="sr-only">
                    <DialogTitle>Fullscreen Image Viewer</DialogTitle>
                    <DialogDescription>Viewing image {fullscreenImage + 1} of {images.length}</DialogDescription>
                  </DialogHeader>
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={images[fullscreenImage].preview}
                      alt={`Fullscreen ${fullscreenImage + 1}`}
                      className="max-w-full max-h-[95vh] object-contain"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 right-4 text-white hover:bg-white/20 z-20"
                      onClick={() => {
                        setFullscreenImage(null);
                        setResizeOptions(null);
                      }}
                    >
                      <X className="w-6 h-6" />
                    </Button>
                    {images.length > 1 && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-20"
                          onClick={() => navigateFullscreen("prev")}
                        >
                          <ChevronLeft className="w-8 h-8" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-20"
                          onClick={() => navigateFullscreen("next")}
                        >
                          <ChevronRight className="w-8 h-8" />
                        </Button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded z-20">
                          {fullscreenImage + 1} / {images.length}
          </div>
                      </>
                    )}
                    
                    {/* Resize options panel */}
                    {resizeOptions && (
                      <div className="absolute bottom-4 left-4 right-4 bg-black/90 rounded-lg p-4 max-h-[40vh] overflow-y-auto z-20">
                        <div className="text-white font-semibold mb-3">Resize Options</div>
                        <div className="grid grid-cols-1 gap-2">
                          {resizeOptions.map((option, idx) => {
                            const currentImg = images[fullscreenImage];
                            const isOriginal = option.maxWidth === currentImg.width && option.maxHeight === currentImg.height;
                            
                            return (
                              <button
                                key={`resize-option-${option.label}-${idx}`}
                                type="button"
                                className="flex items-center justify-between p-3 bg-white/10 rounded hover:bg-white/20 transition-colors cursor-pointer w-full text-left"
                                onClick={() => {
                                  if (!isOriginal) {
                                    applyResize(fullscreenImage, option);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    if (!isOriginal) {
                                      applyResize(fullscreenImage, option);
                                    }
                                  }
                                }}
                              >
                                <div className="flex-1">
                                  <div className="text-white font-medium">{option.label}</div>
                                  <div className="text-white/70 text-xs mt-1">
                                    {option.croppedWidth > 0 || option.croppedHeight > 0 ? (
                                      <span>
                                        Would crop: {option.croppedWidth}px × {option.croppedHeight}px
                                      </span>
                                    ) : (
                                      <span>No cropping needed</span>
            )}
          </div>
                                </div>
                                <div className="text-right">
                                  {option.savings > 0 && (
                                    <div className="text-green-400 text-sm font-medium">
                                      Save {formatFileSize(option.savings)}
                                    </div>
                                  )}
                                  {isOriginal && (
                                    <div className="text-white/50 text-xs">Current</div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-3 w-full text-white hover:bg-white/20"
                          onClick={() => setResizeOptions(null)}
                        >
                          Close Options
                        </Button>
                      </div>
                    )}
                    
                    {/* Toggle resize options button */}
                    {!resizeOptions && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute bottom-4 left-4 text-white hover:bg-white/20 z-20"
                        onClick={() => {
                          if (images[fullscreenImage]) {
                            setResizeOptions(calculateResizeOptions(images[fullscreenImage]));
                          }
                        }}
                      >
                        Resize Options
                      </Button>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Gallery images (existing + new uploads) - includes featured image as first item */}
            {formData.gallery && formData.gallery.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label>Gallery Images (drag to reorder - first image is featured)</Label>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => {
                  const { active, over } = event;
                  if (!over || active.id === over.id) return;
                  
                  const oldIndex = formData.gallery.findIndex(
                    (item) => item.id === active.id || item.src === active.id
                  );
                  const newIndex = formData.gallery.findIndex(
                    (item) => item.id === over.id || item.src === over.id
                  );
                  const newGallery = arrayMove(formData.gallery, oldIndex, newIndex);
                  
                  // Update featured image to be the first item
                  const updatedFormData = {
                    ...formData,
                    gallery: newGallery,
                    featuredImage: newGallery[0]?.src || formData.featuredImage,
                  };
                  setFormData(updatedFormData);
                }}
              >
                <SortableContext
                  items={formData.gallery.map((item) => item.id || item.src)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid grid-cols-4 gap-2 mb-2">
                      {formData.gallery.map((item, index) => (
                        <div key={item.id || item.src} className="relative">
                          {index === 0 && (
                            <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded z-10">
                              Featured
                            </div>
                          )}
                      <SortableGalleryItem
                        item={item}
                        password={password}
                        modelId={model?.id}
                        onDelete={(itemId) => {
                          const newGallery = formData.gallery.filter(
                            (img) => img.id !== itemId
                          );
                              // Update featured image if we deleted the first one
                              const updatedFormData = {
                                ...formData,
                                gallery: newGallery,
                                featuredImage: newGallery[0]?.src || "",
                              };
                              setFormData(updatedFormData);
                            }}
                            onFullscreen={(item) => setFullscreenGalleryItem(item)}
                          />
                        </div>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              </div>
            )}
          </div>

            {/* Fullscreen viewer for existing gallery images */}
            {fullscreenGalleryItem && (
              <Dialog open={true} onOpenChange={() => setFullscreenGalleryItem(null)}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black/95">
                  <DialogHeader className="sr-only">
                    <DialogTitle>Fullscreen Image Viewer</DialogTitle>
                    <DialogDescription>Viewing gallery image: {fullscreenGalleryItem.alt}</DialogDescription>
                  </DialogHeader>
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={fullscreenGalleryItem.src}
                      alt={fullscreenGalleryItem.alt}
                      className="max-w-full max-h-[95vh] object-contain"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 right-4 text-white hover:bg-white/20 z-20"
                      onClick={() => setFullscreenGalleryItem(null)}
                    >
                      <X className="w-6 h-6" />
                    </Button>
          </div>
                </DialogContent>
              </Dialog>
            )}

          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              type="url"
              value={formData.instagram}
              onChange={(e) => handleInputChange("instagram", e.target.value)}
            />
          </div>

          {!password && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
              ⚠️ Please enter the admin password in the field at the top of the page.
          </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                type="text"
                value={formData.stats.height}
                onChange={(e) =>
                  handleInputChange("stats.height", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bust">Bust</Label>
              <Input
                id="bust"
                type="text"
                value={formData.stats.bust}
                onChange={(e) =>
                  handleInputChange("stats.bust", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waist">Waist</Label>
              <Input
                id="waist"
                type="text"
                value={formData.stats.waist}
                onChange={(e) =>
                  handleInputChange("stats.waist", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hips">Hips</Label>
              <Input
                id="hips"
                type="text"
                value={formData.stats.hips}
                onChange={(e) =>
                  handleInputChange("stats.hips", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shoe-size">Shoe Size</Label>
              <Input
                id="shoe-size"
                type="text"
                value={formData.stats.shoeSize}
                onChange={(e) =>
                  handleInputChange("stats.shoeSize", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hair-color">Hair Color</Label>
              <Input
                id="hair-color"
                type="text"
                value={formData.stats.hairColor}
                onChange={(e) =>
                  handleInputChange("stats.hairColor", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eye-color">Eye Color</Label>
              <Input
                id="eye-color"
                type="text"
                value={formData.stats.eyeColor}
                onChange={(e) =>
                  handleInputChange("stats.eyeColor", e.target.value)
                }
              />
            </div>
          </div>

          {isReordering && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800 mb-4">
              Reordering images...
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || isReordering}>
              {saving ? "Saving..." : isReordering ? "Reordering..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <PasswordDialog
        open={showPasswordDialog}
        onClose={() => {
          setShowPasswordDialog(false);
          setPendingAction(null);
        }}
        onSuccess={handlePasswordSuccess}
        title="Admin Authentication"
        description="Please enter your admin password to continue."
      />
    </Dialog>
  );
}

