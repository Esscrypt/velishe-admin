"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import PasswordDialog, { getCachedPasswordHash, clearCachedPasswordHash } from "@/components/PasswordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AcademyWishlistEntry {
  id: number;
  email: string;
  phoneNumber: string;
  emailSent: boolean;
  confirmed: boolean;
  createdAt: string;
}

export default function AcademyWishlistPage() {
  const [entries, setEntries] = useState<AcademyWishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const passwordDialogActionRef = useRef<((passwordHash: string) => void) | null>(null);
  const [passwordDialogTitle, setPasswordDialogTitle] = useState("Admin Authentication");
  const [passwordDialogDescription, setPasswordDialogDescription] = useState("Please enter your admin password to continue.");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newEmailSent, setNewEmailSent] = useState(false);
  const [newConfirmed, setNewConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/academy-wishlist");
      if (response.ok) {
        const data = await response.json();
        setEntries(Array.isArray(data) ? data : []);
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error("Error fetching academy wishlist entries:", error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const performToggle = async (entry: AcademyWishlistEntry, field: "emailSent" | "confirmed", value: boolean, passwordHash: string) => {
    setUpdatingId(entry.id);
    try {
      const response = await fetch(`/api/academy-wishlist/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passwordHash,
          [field]: value,
        }),
      });
      if (response.ok) {
        const updated = await response.json();
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, [field]: updated[field] } : e))
        );
      } else {
        const err = await response.json();
        alert(err.error || "Failed to update");
        if (response.status === 401) clearCachedPasswordHash();
      }
    } catch (error) {
      console.error("Error updating entry:", error);
      alert("Failed to update");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCheckboxChange = (entry: AcademyWishlistEntry, field: "emailSent" | "confirmed", value: boolean) => {
    const cachedHash = getCachedPasswordHash();
    if (cachedHash) {
      performToggle(entry, field, value, cachedHash);
      return;
    }
    setPasswordDialogTitle("Update entry");
    setPasswordDialogDescription("Please enter your admin password to update this entry.");
    passwordDialogActionRef.current = (hash: string) => performToggle(entry, field, value, hash);
    setShowPasswordDialog(true);
  };

  const performDelete = async (id: number, passwordHash: string) => {
    try {
      const response = await fetch(`/api/academy-wishlist/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordHash }),
      });
      if (response.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      } else {
        const err = await response.json();
        alert(err.error || "Failed to delete");
        if (response.status === 401) clearCachedPasswordHash();
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      alert("Failed to delete");
    }
  };

  const handleDelete = (entry: AcademyWishlistEntry) => {
    if (!confirm(`Delete entry for ${entry.email}?`)) return;
    const cachedHash = getCachedPasswordHash();
    if (cachedHash) {
      performDelete(entry.id, cachedHash);
      return;
    }
    setPasswordDialogTitle("Delete entry");
    setPasswordDialogDescription("Please enter your admin password to delete this entry.");
    passwordDialogActionRef.current = (hash: string) => performDelete(entry.id, hash);
    setShowPasswordDialog(true);
  };

  const performCreate = async (passwordHash: string) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/academy-wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passwordHash,
          email: newEmail.trim(),
          phoneNumber: newPhoneNumber.trim(),
          emailSent: newEmailSent,
          confirmed: newConfirmed,
        }),
      });
      if (response.ok) {
        const created = await response.json();
        setEntries((prev) => [created, ...prev]);
        setShowAddForm(false);
        setNewEmail("");
        setNewPhoneNumber("");
        setNewEmailSent(false);
        setNewConfirmed(false);
      } else {
        const err = await response.json();
        alert(err.error || "Failed to create");
        if (response.status === 401) clearCachedPasswordHash();
      }
    } catch (error) {
      console.error("Error creating entry:", error);
      alert("Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSubmit = () => {
    if (!newEmail.trim() || !newPhoneNumber.trim()) {
      alert("Email and phone number are required.");
      return;
    }
    const cachedHash = getCachedPasswordHash();
    if (cachedHash) {
      performCreate(cachedHash);
      return;
    }
    setPasswordDialogTitle("Add entry");
    setPasswordDialogDescription("Please enter your admin password to add an entry.");
    passwordDialogActionRef.current = (hash: string) => performCreate(hash);
    setShowPasswordDialog(true);
  };

  const handlePasswordSuccess = (passwordHash: string) => {
    const action = passwordDialogActionRef.current;
    passwordDialogActionRef.current = null;
    if (typeof action === "function") {
      action(passwordHash);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6 md:mb-8">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link href="/" className="shrink-0">
              <Button variant="ghost" size="icon" aria-label="Back to models">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Academy Wishlist</h1>
          </div>
          <Button
            onClick={() => setShowAddForm((v) => !v)}
            className="w-full sm:w-auto shrink-0"
          >
            <Plus className="w-5 h-5" />
            Add entry
          </Button>
        </div>

        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">New entry</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="mt-1"
                />
              </div>
              <div className="min-w-0">
                <Label htmlFor="new-phone">Phone number</Label>
                <Input
                  id="new-phone"
                  type="tel"
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4">
              <label className="flex items-center gap-2 cursor-pointer min-h-[44px] touch-manipulation">
                <input
                  type="checkbox"
                  checked={newEmailSent}
                  onChange={(e) => setNewEmailSent(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm">Email sent</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer min-h-[44px] touch-manipulation">
                <input
                  type="checkbox"
                  checked={newConfirmed}
                  onChange={(e) => setNewConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm">Confirmed</span>
              </label>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewEmail("");
                  setNewPhoneNumber("");
                  setNewEmailSent(false);
                  setNewConfirmed(false);
                }}
                className="sm:order-2"
              >
                Cancel
              </Button>
              <Button onClick={handleAddSubmit} disabled={submitting} className="sm:order-1">
                {submitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: "100%" }} />
            </div>
            <p className="text-sm text-gray-600 mt-2">Loading entries...</p>
          </div>
        )}

        {!loading && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {entries.length === 0 ? (
              <div className="text-center py-12 px-4 text-gray-500">
                No academy wishlist entries. Click &quot;Add entry&quot; to create one.
              </div>
            ) : (
              <>
                {/* Mobile: card list */}
                <div className="md:hidden divide-y divide-gray-100">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate" title={entry.email}>
                            {entry.email}
                          </p>
                          <p className="text-sm text-gray-600 truncate" title={entry.phoneNumber}>
                            {entry.phoneNumber}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(entry.createdAt)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(entry)}
                          className="text-destructive hover:text-destructive shrink-0 touch-manipulation min-h-[44px] min-w-[44px]"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <label className="flex items-center gap-2 cursor-pointer min-h-[44px] touch-manipulation">
                          <input
                            type="checkbox"
                            checked={entry.emailSent}
                            onChange={(e) => handleCheckboxChange(entry, "emailSent", e.target.checked)}
                            disabled={updatingId === entry.id}
                            className="w-4 h-4 rounded border-gray-300"
                            aria-label="Email sent"
                          />
                          <span className="text-sm">Email sent</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer min-h-[44px] touch-manipulation">
                          <input
                            type="checkbox"
                            checked={entry.confirmed}
                            onChange={(e) => handleCheckboxChange(entry, "confirmed", e.target.checked)}
                            disabled={updatingId === entry.id}
                            className="w-4 h-4 rounded border-gray-300"
                            aria-label="Confirmed"
                          />
                          <span className="text-sm">Confirmed</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop: table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-medium">Email</th>
                        <th className="text-left py-3 px-4 font-medium">Phone</th>
                        <th className="text-left py-3 px-4 font-medium">Created</th>
                        <th className="text-left py-3 px-4 font-medium">Email sent</th>
                        <th className="text-left py-3 px-4 font-medium">Confirmed</th>
                        <th className="w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id} className="border-b last:border-0">
                          <td className="py-3 px-4">{entry.email}</td>
                          <td className="py-3 px-4">{entry.phoneNumber}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{formatDate(entry.createdAt)}</td>
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={entry.emailSent}
                              onChange={(e) => handleCheckboxChange(entry, "emailSent", e.target.checked)}
                              disabled={updatingId === entry.id}
                              className="w-4 h-4 rounded border-gray-300"
                              aria-label="Email sent"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={entry.confirmed}
                              onChange={(e) => handleCheckboxChange(entry, "confirmed", e.target.checked)}
                              disabled={updatingId === entry.id}
                              className="w-4 h-4 rounded border-gray-300"
                              aria-label="Confirmed"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(entry)}
                              className="text-destructive hover:text-destructive"
                              aria-label="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
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
