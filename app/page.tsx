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
      {model.featuredImage && (
        <img
          src={model.featuredImage}
          alt={model.name}
          className="w-16 h-20 object-cover rounded"
        />
      )}
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
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordDialogAction, setPasswordDialogAction] = useState<((passwordHash: string) => void) | null>(null);
  const [passwordDialogTitle, setPasswordDialogTitle] = useState("Admin Authentication");
  const [passwordDialogDescription, setPasswordDialogDescription] = useState("Please enter your admin password to continue.");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchModels = async () => {
    try {
      const response = await fetch("/api/models");
      const data = await response.json();
      // Ensure data is always an array
      setModels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching models:", error);
      setModels([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
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
        fetchModels();
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

  const handleFormClose = () => {
    setShowForm(false);
    setEditingModel(null);
    fetchModels();
  };

  const performReorder = async (orderedIds: string[], passwordHash: string) => {
    try {
      const response = await fetch("/api/models/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds, passwordHash }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to reorder: ${error.error || "Unknown error"}`);
        fetchModels(); // Revert on error
        // Clear cache on auth failure
        if (response.status === 401) {
          clearCachedPasswordHash();
        }
      }
    } catch (error) {
      console.error("Error reordering models:", error);
      fetchModels(); // Revert on error
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = models.findIndex((m) => m.id === active.id);
      const newIndex = models.findIndex((m) => m.id === over.id);

      const newModels = arrayMove(models, oldIndex, newIndex);
      setModels(newModels);

      const cachedHash = getCachedPasswordHash();
      if (cachedHash) {
        await performReorder(newModels.map((m) => m.id), cachedHash);
        return;
      }

      // Show password dialog
      setPasswordDialogTitle("Reorder Models");
      setPasswordDialogDescription("Please enter your admin password to save the new order.");
      setPasswordDialogAction(() => (hash: string) => performReorder(newModels.map((m) => m.id), hash));
      setShowPasswordDialog(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

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
            <Button onClick={handleAddModel}>
              <Plus className="w-5 h-5" />
              Add Model
            </Button>
          </div>
        </div>

        {showForm && (
          <ModelForm
            model={editingModel}
            onClose={handleFormClose}
            onSave={handleFormClose}
            password={getCachedPassword() || ""}
          />
        )}

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

