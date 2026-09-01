"use client";

import { useCallback, useMemo } from "react";
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { BlogImageMeta } from "@/components/BlogImageManager";
import {
  createEmptyParagraphBlock,
  newBlockId,
  parseBlocksDocument,
  serializeBlocksDocument,
  type BlogBlock,
  type BlogMediaLayout,
} from "@/lib/blog-blocks";

type BlogBlockEditorProps = {
  value: string;
  onChange: (value: string) => void;
  images: BlogImageMeta[];
};

function SortableBlockRow({
  block,
  images,
  onChange,
  onDelete,
}: {
  block: BlogBlock;
  images: BlogImageMeta[];
  onChange: (next: BlogBlock) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-white p-3 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing rounded p-1 hover:bg-gray-100"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          {block.type}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {block.type === "paragraph" || block.type === "quote" ? (
        <textarea
          value={block.text}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
          rows={block.type === "quote" ? 3 : 4}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder={
            block.type === "quote" ? "Quote text" : "Paragraph text (Markdown inline supported)"
          }
        />
      ) : null}

      {block.type === "heading" ? (
        <div className="space-y-2">
          <select
            value={block.level}
            onChange={(event) =>
              onChange({
                ...block,
                level: Number(event.target.value) === 3 ? 3 : 2,
              })
            }
            className="rounded-md border px-2 py-1 text-sm"
          >
            <option value={2}>Heading 2</option>
            <option value={3}>Heading 3</option>
          </select>
          <input
            value={block.text}
            onChange={(event) => onChange({ ...block, text: event.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Heading text"
          />
        </div>
      ) : null}

      {block.type === "media" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Media</Label>
            <select
              value={block.mediaId}
              onChange={(event) =>
                onChange({ ...block, mediaId: event.target.value })
              }
              className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
            >
              <option value="">Select media…</option>
              {images.map((image) => (
                <option key={image.id} value={image.id}>
                  {image.order === 0 ? "Cover" : `Gallery #${image.order}`}
                  {image.kind === "video" ? " (video)" : ""}
                  {image.alt ? ` — ${image.alt}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Layout</Label>
            <select
              value={block.layout}
              onChange={(event) =>
                onChange({
                  ...block,
                  layout: event.target.value as BlogMediaLayout,
                })
              }
              className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
            >
              <option value="full">Full width</option>
              <option value="left">Float left</option>
              <option value="right">Float right</option>
            </select>
          </div>
          {block.mediaId ? (
            <div className="sm:col-span-2 overflow-hidden rounded border bg-gray-50">
              {images.find((image) => image.id === block.mediaId)?.hasData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/blog-images/${block.mediaId}`}
                  alt=""
                  className="h-32 w-full object-cover"
                />
              ) : (
                <div className="flex h-32 items-center justify-center text-sm text-gray-500">
                  Video embed
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function BlogBlockEditor({
  value,
  onChange,
  images,
}: BlogBlockEditorProps) {
  const document = useMemo(() => {
    const parsed = parseBlocksDocument(value);
    if (parsed) return parsed;
    return {
      format: "blocks" as const,
      version: 1,
      blocks: [createEmptyParagraphBlock()],
    };
  }, [value]);

  const blocks = document.blocks;

  const commit = useCallback(
    (nextBlocks: BlogBlock[]) => {
      onChange(serializeBlocksDocument(nextBlocks));
    },
    [onChange],
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = blocks.findIndex((block) => block.id === active.id);
      const newIndex = blocks.findIndex((block) => block.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      commit(arrayMove(blocks, oldIndex, newIndex));
    },
    [blocks, commit],
  );

  const addBlock = useCallback(
    (block: BlogBlock) => {
      commit([...blocks, block]);
    },
    [blocks, commit],
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Build the post with blocks. Upload media below, then insert it where you
        want it in the story. The cover is still used on the journal index and
        when sharing links.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map((block) => block.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {blocks.map((block) => (
              <SortableBlockRow
                key={block.id}
                block={block}
                images={images}
                onChange={(next) =>
                  commit(blocks.map((item) => (item.id === block.id ? next : item)))
                }
                onDelete={() =>
                  commit(
                    blocks.length > 1
                      ? blocks.filter((item) => item.id !== block.id)
                      : [createEmptyParagraphBlock()],
                  )
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addBlock(createEmptyParagraphBlock())}
        >
          + Paragraph
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            addBlock({ id: newBlockId(), type: "heading", level: 2, text: "" })
          }
        >
          + Heading
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addBlock({ id: newBlockId(), type: "quote", text: "" })}
        >
          + Quote
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={images.length === 0}
          onClick={() =>
            addBlock({
              id: newBlockId(),
              type: "media",
              mediaId: images[0]?.id ?? "",
              layout: "full",
            })
          }
        >
          + Media
        </Button>
      </div>
    </div>
  );
}
