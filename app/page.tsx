"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
import ModelForm from "@/components/ModelForm";
import PasswordDialog, { getCachedPasswordHash, getCachedPassword, clearCachedPasswordHash } from "@/components/PasswordDialog";
import { Button } from "@/components/ui/button";
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

function SortableItem({ model, onEdit, onDelete }: Readonly<{ model: Model; onEdit: (model: Model) => void; onDelete: (id: string) => void }>) {
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
        <h3 className="font-semibold text-lg">{model.name}</h3>
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
  const [passwordDialogAction, setPasswordDialogAction] = useState<((passwordHash: string) => void) | null>(null);
  const [passwordDialogTitle, setPasswordDialogTitle] = useState("Admin Authentication");
  const [passwordDialogDescription, setPasswordDialogDescription] = useState("Please enter your admin password to continue.");
  const [hasPendingReorder, setHasPendingReorder] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/models");
      const data = await response.json();
      // Ensure data is always an array
      const modelsArray = Array.isArray(data) ? data : [];
      setModels(modelsArray);
      setOriginalModels(modelsArray);
      setHasPendingReorder(false);
    } catch (error) {
      console.error("Error fetching models:", error);
      setModels([]); // Set empty array on error
      setOriginalModels([]);
      setHasPendingReorder(false);
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
    setPasswordDialogAction(() => (hash: string) => performDelete(id, hash));
    setShowPasswordDialog(true);
  };

  const handleEdit = (model: Model) => {
    const cachedHash = getCachedPasswordHash();
    if (cachedHash) {
      setEditingModel(model);
      setShowForm(true);
    } else {
      setPasswordDialogTitle("Edit Model");
      setPasswordDialogDescription("Please enter your admin password to edit this model.");
      setPasswordDialogAction(() => () => {
        setEditingModel(model);
        setShowForm(true);
      });
      setShowPasswordDialog(true);
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
      setPasswordDialogAction(() => () => {
        setEditingModel(null);
        setShowForm(true);
      });
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

  const performReorder = async (orderedIds: string[], passwordHash: string) => {
    setIsReordering(true);
    try {
      const response = await fetch("/api/models/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds, passwordHash }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to reorder: ${error.error || "Unknown error"}`);
        // Revert on error - restore original order
        setModels(originalModels);
        // Clear cache on auth failure
        if (response.status === 401) {
          clearCachedPasswordHash();
        }
      } else {
        // Success - update original models to match current order
        // No need to reload, the order is already correct in state
        setOriginalModels(models);
        setHasPendingReorder(false);
      }
    } catch (error) {
      console.error("Error reordering models:", error);
      // Revert on error - restore original order
      setModels(originalModels);
    } finally {
      setIsReordering(false);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = models.findIndex((m) => m.id === active.id);
      const newIndex = models.findIndex((m) => m.id === over.id);

      const newModels = arrayMove(models, oldIndex, newIndex);
      setModels(newModels);
      setHasPendingReorder(true);
    }
  };

  const handleSaveReorder = async () => {
    const orderedIds = models.map((m) => m.id);
    const cachedHash = getCachedPasswordHash();
    
    if (cachedHash) {
      await performReorder(orderedIds, cachedHash);
      return;
    }

    // Show password dialog
    setPasswordDialogTitle("Reorder Models");
    setPasswordDialogDescription("Please enter your admin password to save the new order.");
    setPasswordDialogAction(() => (hash: string) => performReorder(orderedIds, hash));
    setShowPasswordDialog(true);
  };

  const handleCancelReorder = () => {
    setModels(originalModels);
    setHasPendingReorder(false);
  };

  // Loading state is now shown inline with the progress bar

  const handlePasswordSuccess = (passwordHash: string) => {
    if (passwordDialogAction) {
      passwordDialogAction(passwordHash);
      setPasswordDialogAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Models Admin</h1>
          <div className="flex items-center gap-4">
            {hasPendingReorder && (
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
                  {isReordering ? "Saving Order..." : "Save Order"}
                </Button>
              </>
            )}
            <Button onClick={handleAddModel}>
              <Plus className="w-5 h-5" />
              Add Model
            </Button>
          </div>
        </div>

        {loading && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: "100%" }}></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">Loading models...</p>
          </div>
        )}

        {showForm && (
          <ModelForm
            model={editingModel}
            onClose={() => handleFormClose()}
            onSave={(modelId?: string) => handleFormClose(modelId)}
            password={getCachedPassword() || ""}
          />
        )}

        {!loading && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={models.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              {models.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No models found. Click "Add Model" to create one.
                </div>
              ) : (
                models.map((model) => (
                  <SortableItem
                    key={model.id}
                    model={model}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <PasswordDialog
        open={showPasswordDialog}
        onClose={() => {
          setShowPasswordDialog(false);
          setPasswordDialogAction(null);
        }}
        onSuccess={handlePasswordSuccess}
        title={passwordDialogTitle}
        description={passwordDialogDescription}
      />
    </div>
  );
}

