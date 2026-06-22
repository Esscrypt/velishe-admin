"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, GripVertical, List, FileDown } from "lucide-react";
import ModelForm from "@/components/ModelForm";
import BoardsSettings from "@/components/BoardsSettings";
import PasswordDialog, { getCachedPasswordHash, clearCachedPasswordHash } from "@/components/PasswordDialog";
import { Button } from "@/components/ui/button";
import { generateCombinedPortfolioPdf } from "@/lib/combined-portfolio-pdf";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
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
  booked?: boolean;
  targetLocation?: string;
  board?: "mainboard" | "development";
  gender?: "male" | "female";
  featuredImage?: string;
  gallery?: GalleryItem[];
  published?: boolean;
}

function BoardColumn({
  id,
  title,
  modelIds,
  modelsById,
  selectionOrder,
  onToggleSelect,
  onEdit,
  onDelete,
}: Readonly<{
  id: "mainboard" | "development";
  title: string;
  modelIds: string[];
  modelsById: Map<string, Model>;
  selectionOrder: string[];
  onToggleSelect: (id: string) => void;
  onEdit: (model: Model) => void;
  onDelete: (id: string) => void;
}>) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="flex-1 min-w-0">
      <h2 className="font-semibold text-lg mb-3">{title} ({modelIds.length})</h2>
      <SortableContext items={modelIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`min-h-[120px] rounded-md p-1 transition-colors ${isOver ? "bg-blue-50" : ""}`}
        >
          {modelIds.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm border border-dashed rounded-md">
              Drag a model here
            </div>
          ) : (
            modelIds.map((mid) => {
              const model = modelsById.get(mid);
              if (!model) return null;
              return (
                <SortableItem
                  key={mid}
                  model={model}
                  selectionIndex={selectionOrder.indexOf(mid) + 1}
                  onToggleSelect={onToggleSelect}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              );
            })
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableItem({ model, selectionIndex, onToggleSelect, onEdit, onDelete }: Readonly<{ model: Model; selectionIndex: number; onToggleSelect: (id: string) => void; onEdit: (model: Model) => void; onDelete: (id: string) => void }>) {
  const selected = selectionIndex > 0;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: model.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg shadow p-4 mb-4 flex items-center gap-4"
    >
      <label className="relative flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(model.id)}
          aria-label={`Select ${model.name} for PDF`}
          className="w-5 h-5 accent-blue-600 cursor-pointer"
        />
        {selected && (
          <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[11px] font-semibold leading-none">
            {selectionIndex}
          </span>
        )}
      </label>
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-5 h-5 text-gray-400" />
      </div>
      {model.featuredImage && model.featuredImage.trim() !== "" ? (
        <img
          src={model.featuredImage}
          alt={model.name}
          className="w-16 h-20 object-cover rounded"
        />
      ) : null}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">{model.name}</h3>
          {model.booked && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              Booked{model.targetLocation ? ` \u2014 ${model.targetLocation}` : ""}
            </span>
          )}
          {(model.published === false || !model.featuredImage || model.featuredImage.trim() === "") && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
              {!model.featuredImage || model.featuredImage.trim() === "" ? "No images \u2014 hidden from site" : "Draft \u2014 hidden from site"}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">Slug: {model.slug}</p>
        <p className="text-sm text-gray-600">ID: {model.id}</p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(model)}
        >
          <Edit className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(model.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [originalModels, setOriginalModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const passwordDialogActionRef = useRef<((passwordHash: string) => void) | null>(null);
  const [passwordDialogTitle, setPasswordDialogTitle] = useState("Admin Authentication");
  const [passwordDialogDescription, setPasswordDialogDescription] = useState("Please enter your admin password to continue.");
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const modelsById = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);
  const columns = useMemo(
    () => ({
      mainboard: models.filter((m) => m.board === "mainboard").map((m) => m.id),
      development: models.filter((m) => m.board === "development").map((m) => m.id),
    }),
    [models],
  );

  const findContainer = (id: string): "mainboard" | "development" | null => {
    if (id === "mainboard" || id === "development") return id;
    const m = modelsById.get(id);
    return m ? ((m.board as "mainboard" | "development") ?? "mainboard") : null;
  };
  const [isReordering, setIsReordering] = useState(false);
  const [loadingEditModel, setLoadingEditModel] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/models?limit=10000");
      const data = await response.json();
      // Ensure data is always an array
      const modelsArray = Array.isArray(data) ? data : [];
      setModels(modelsArray);
      setOriginalModels(modelsArray);
      setHasPendingChanges(false);
    } catch (error) {
      console.error("Error fetching models:", error);
      setModels([]); // Set empty array on error
      setOriginalModels([]);
      setHasPendingChanges(false);
    } finally {
      setLoading(false);
    }
  };


  const fetchSingleModel = async (id: string) => {
    try {
      const response = await fetch(`/api/models/${id}`);
      if (!response.ok) {
        console.error(`Failed to fetch model ${id}`);
        return null;
      }
      const model = await response.json();
      return model;
    } catch (error) {
      console.error(`Error fetching model ${id}:`, error);
      return null;
    }
  };

  const updateModelInList = (updatedModel: Model) => {
    // Normalize ID to string for consistent comparison
    const normalizedId = String(updatedModel.id);
    const normalizedModel = { ...updatedModel, id: normalizedId };
    
    setModels((prevModels) => {
      const index = prevModels.findIndex((m) => String(m.id) === normalizedId);
      if (index === -1) {
        // Model not found, add it (for new models)
        return [...prevModels, normalizedModel];
      }
      // Update existing model
      const newModels = [...prevModels];
      newModels[index] = normalizedModel;
      return newModels;
    });
    // Also update original models if it exists there
    setOriginalModels((prevOriginal) => {
      const index = prevOriginal.findIndex((m) => String(m.id) === normalizedId);
      if (index === -1) {
        return [...prevOriginal, normalizedModel];
      }
      const newOriginal = [...prevOriginal];
      newOriginal[index] = normalizedModel;
      return newOriginal;
    });
  };

  useEffect(() => {
    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performDelete = async (id: string, passwordHash: string) => {
    try {
      const response = await fetch(`/api/models/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordHash }),
      });

      if (response.ok) {
        // Remove model from list instead of reloading all
        setModels((prevModels) => prevModels.filter((m) => m.id !== id));
        setOriginalModels((prevOriginal) => prevOriginal.filter((m) => m.id !== id));
        setSelectedIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        const error = await response.json();
        alert(`Failed to delete model: ${error.error || "Unknown error"}`);
        // Clear cache on auth failure
        if (response.status === 401) {
          clearCachedPasswordHash();
        }
      }
    } catch (error) {
      console.error("Error deleting model:", error);
      alert("Failed to delete model");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this model?")) return;

    const cachedHash = getCachedPasswordHash();
    if (cachedHash) {
      await performDelete(id, cachedHash);
      return;
    }

    // Show password dialog
    setPasswordDialogTitle("Delete Model");
    setPasswordDialogDescription("Please enter your admin password to delete this model.");
    passwordDialogActionRef.current = (hash: string) => performDelete(id, hash);
    setShowPasswordDialog(true);
  };

  const handleEdit = async (model: Model) => {
    setLoadingEditModel(true);
    try {
      // Fetch full model data with all images before opening form
      const fullModel = await fetchSingleModel(model.id);
      if (!fullModel) {
        alert("Failed to fetch model data. Please try again.");
        return;
      }

      const cachedHash = getCachedPasswordHash();
      if (cachedHash) {
        setEditingModel(fullModel);
        setShowForm(true);
      } else {
        setPasswordDialogTitle("Edit Model");
        setPasswordDialogDescription("Please enter your admin password to edit this model.");
        passwordDialogActionRef.current = () => {
          setEditingModel(fullModel);
          setShowForm(true);
        };
        setShowPasswordDialog(true);
      }
    } finally {
      setLoadingEditModel(false);
    }
  };

  const handleAddModel = () => {
    const cachedHash = getCachedPasswordHash();
    if (cachedHash) {
      setEditingModel(null);
      setShowForm(true);
    } else {
      setPasswordDialogTitle("Add Model");
      setPasswordDialogDescription("Please enter your admin password to add a new model.");
      passwordDialogActionRef.current = () => {
        setEditingModel(null);
        setShowForm(true);
      };
      setShowPasswordDialog(true);
    }
  };

  const handleFormClose = async (updatedModelId?: string) => {
    const wasEditing = !!editingModel;
    setShowForm(false);
    setEditingModel(null);
    
    // If model ID provided, it means a model was saved (either updated or newly created)
    if (updatedModelId) {
      if (wasEditing) {
        // Editing existing model - only reload that specific model
        const updatedModel = await fetchSingleModel(updatedModelId);
        if (updatedModel) {
          updateModelInList(updatedModel);
        }
      } else {
        // New model was created - need to reload all to get the new model in the list
        fetchModels();
      }
    }
    // If no model ID provided, form was closed without saving - no reload needed
  };

  const performSaveLayout = async (passwordHash: string) => {
    setIsReordering(true);
    try {
      const response = await fetch("/api/models/board-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainboard: columns.mainboard,
          development: columns.development,
          passwordHash,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to save: ${error.error || "Unknown error"}`);
        setModels(originalModels);
        if (response.status === 401) clearCachedPasswordHash();
      } else {
        setOriginalModels(models);
        setHasPendingChanges(false);
      }
    } catch (error) {
      console.error("Error saving board layout:", error);
      setModels(originalModels);
    } finally {
      setIsReordering(false);
    }
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setModels((prev) => {
      const activeIdx = prev.findIndex((m) => m.id === activeId);
      if (activeIdx === -1) return prev;
      const next = [...prev];
      const moved = { ...next[activeIdx], board: overContainer };
      next.splice(activeIdx, 1);
      const overIdx =
        overId === overContainer ? next.length : next.findIndex((m) => m.id === overId);
      next.splice(overIdx === -1 ? next.length : overIdx, 0, moved);
      return next;
    });
    setHasPendingChanges(true);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    setModels((prev) => {
      const oldIndex = prev.findIndex((m) => m.id === activeId);
      const newIndex =
        overId === "mainboard" || overId === "development"
          ? prev.length - 1
          : prev.findIndex((m) => m.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
    setHasPendingChanges(true);
  };

  const handleSaveReorder = async () => {
    const cachedHash = getCachedPasswordHash();
    if (cachedHash) {
      await performSaveLayout(cachedHash);
      return;
    }
    setPasswordDialogTitle("Save Layout");
    setPasswordDialogDescription("Please enter your admin password to save the board layout.");
    passwordDialogActionRef.current = (hash: string) => performSaveLayout(hash);
    setShowPasswordDialog(true);
  };

  const handleCancelReorder = () => {
    setModels(originalModels);
    setHasPendingChanges(false);
  };

  // Loading state is now shown inline with the progress bar

  const handlePasswordSuccess = (passwordHash: string) => {
    const action = passwordDialogActionRef.current;
    passwordDialogActionRef.current = null;
    if (typeof action === "function") {
      action(passwordHash);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectionOrder = Array.from(selectedIds);
  const allSelected = models.length > 0 && selectedIds.size === models.length;

  const handleToggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(models.map((m) => m.id)));
  };

  const handleGeneratePdf = async () => {
    if (selectedIds.size === 0 || generatingPdf) return;
    setGeneratingPdf(true);
    try {
      const selected = selectionOrder
        .map((id) => models.find((m) => m.id === id))
        .filter((m): m is Model => m !== undefined);
      await generateCombinedPortfolioPdf(selected);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Models Admin</h1>
          <div className="flex items-center gap-4">
            <Link href="/academy-wishlist">
              <Button variant="outline">
                <List className="w-5 h-5" />
                Academy Wishlist
              </Button>
            </Link>
            {models.length > 0 && (
              <Button variant="outline" onClick={handleToggleSelectAll}>
                {allSelected ? "Clear" : "Select all"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleGeneratePdf}
              disabled={selectedIds.size === 0 || generatingPdf}
            >
              <FileDown className="w-5 h-5" />
              {generatingPdf
                ? "Generating PDF..."
                : `Generate PDF${selectedIds.size > 0 ? ` (${selectedIds.size} selected)` : ""}`}
            </Button>
            {hasPendingChanges && (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelReorder}
                  disabled={isReordering}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveReorder}
                  disabled={isReordering}
                >
                  {isReordering ? "Saving Layout..." : "Save Layout"}
                </Button>
              </>
            )}
            <Button onClick={handleAddModel}>
              <Plus className="w-5 h-5" />
              Add Model
            </Button>
          </div>
        </div>

        <BoardsSettings password={getCachedPasswordHash() || ""} />

        {!loading && (() => {
          const incomplete = models.filter(
            (m) => m.published === false || !m.featuredImage || m.featuredImage.trim() === ""
          );
          return incomplete.length > 0 ? (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {incomplete.length} model{incomplete.length === 1 ? "" : "s"} ({incomplete.map((m) => m.slug || m.name || m.id).join(", ")}) {incomplete.length === 1 ? "is" : "are"} hidden from the public site because {incomplete.length === 1 ? "it has" : "they have"} no images. Edit to add images and publish.
            </div>
          ) : null;
        })()}

        {loading && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: "100%" }}></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">Loading models...</p>
          </div>
        )}

        {loadingEditModel && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: "100%" }}></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">Loading model data...</p>
          </div>
        )}

        {showForm && (
          <ModelForm
            model={editingModel}
            onClose={() => handleFormClose()}
            onSave={(modelId?: string) => handleFormClose(modelId)}
            password={getCachedPasswordHash() || ""}
          />
        )}

        {!loading && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-col md:flex-row gap-6">
              <BoardColumn
                id="mainboard"
                title="Mainboard"
                modelIds={columns.mainboard}
                modelsById={modelsById}
                selectionOrder={selectionOrder}
                onToggleSelect={handleToggleSelect}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
              <BoardColumn
                id="development"
                title="Development"
                modelIds={columns.development}
                modelsById={modelsById}
                selectionOrder={selectionOrder}
                onToggleSelect={handleToggleSelect}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          </DndContext>
        )}

      </div>

      <PasswordDialog
        open={showPasswordDialog}
        onClose={() => {
          setShowPasswordDialog(false);
          passwordDialogActionRef.current = null;
        }}
        onSuccess={handlePasswordSuccess}
        title={passwordDialogTitle}
        description={passwordDialogDescription}
      />
    </div>
  );
}

