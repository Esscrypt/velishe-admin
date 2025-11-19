"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
import ModelForm from "@/components/ModelForm";
import { hashPassword } from "@/lib/client-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [password, setPassword] = useState("");

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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this model?")) return;

    if (!password) {
      const pwd = prompt("Enter admin password:");
      if (!pwd) return;
      setPassword(pwd);
    }

    try {
      const passwordHash = await hashPassword(password);
      const response = await fetch(`/api/models/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordHash }),
      });

      if (response.ok) {
        fetchModels();
        setPassword(""); // Clear password after successful operation
      } else {
        const error = await response.json();
        alert(`Failed to delete model: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting model:", error);
      alert("Failed to delete model");
    }
  };

  const handleEdit = (model: Model) => {
    setEditingModel(model);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingModel(null);
    fetchModels();
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      if (!password) {
        const pwd = prompt("Enter admin password to reorder:");
        if (!pwd) {
          fetchModels(); // Revert UI
          return;
        }
        setPassword(pwd);
      }

      const oldIndex = models.findIndex((m) => m.id === active.id);
      const newIndex = models.findIndex((m) => m.id === over.id);

      const newModels = arrayMove(models, oldIndex, newIndex);
      setModels(newModels);

      // Update order in database
      try {
        const passwordHash = await hashPassword(password);
        const orderedIds = newModels.map((m) => m.id);
        const response = await fetch("/api/models/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds, passwordHash }),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(`Failed to reorder: ${error.error || "Unknown error"}`);
          fetchModels(); // Revert on error
        }
      } catch (error) {
        console.error("Error reordering models:", error);
        fetchModels(); // Revert on error
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Models Admin</h1>
          <div className="flex items-center gap-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-48"
            />
            <Button
              onClick={() => {
                setEditingModel(null);
                setShowForm(true);
              }}
            >
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
            password={password}
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
    </div>
  );
}

