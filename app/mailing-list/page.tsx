"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PasswordDialog, {
  clearCachedPasswordHash,
  getVerifiedCachedPasswordHash,
} from "@/components/PasswordDialog";
import { Button } from "@/components/ui/button";

type Subscriber = {
  id: number;
  email: string;
  confirmed: boolean;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
};

function isSubscribed(row: Subscriber): boolean {
  return row.confirmed && !row.unsubscribedAt;
}

function statusLabel(row: Subscriber): string {
  if (row.unsubscribedAt) return "unsubscribed";
  if (row.confirmed) return "confirmed";
  return "pending";
}

export default function MailingListAdminPage() {
  const [rows, setRows] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [passwordHash, setPasswordHash] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const passwordDialogActionRef = useRef<((hash: string) => void) | null>(null);

  const fetchRows = async (hash: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/mailing-list?passwordHash=${encodeURIComponent(hash)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setRows(Array.isArray(data) ? data : []);
      } else if (response.status === 401) {
        clearCachedPasswordHash();
        passwordDialogActionRef.current = (h: string) => {
          setPasswordHash(h);
          fetchRows(h);
        };
        setShowPasswordDialog(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      const cached = await getVerifiedCachedPasswordHash();
      if (cached) {
        setPasswordHash(cached);
        fetchRows(cached);
      } else {
        passwordDialogActionRef.current = (hash: string) => {
          setPasswordHash(hash);
          fetchRows(hash);
        };
        setShowPasswordDialog(true);
      }
    })();
  }, []);

  const setSubscribed = async (id: number, subscribed: boolean) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/mailing-list/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordHash, subscribed }),
      });
      if (response.ok) {
        await fetchRows(passwordHash);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">Mailing list</h1>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <div className="bg-white border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">Email</th>
                  <th className="p-3">Subscribed</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="p-6 text-gray-500" colSpan={4}>
                      No subscribers yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="p-3">{row.email}</td>
                      <td className="p-3">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSubscribed(row)}
                            disabled={updatingId === row.id}
                            onChange={(event) =>
                              void setSubscribed(row.id, event.target.checked)
                            }
                            className="h-4 w-4 accent-black"
                          />
                          <span className="text-gray-600">
                            {isSubscribed(row) ? "Yes" : "No"}
                          </span>
                        </label>
                      </td>
                      <td className="p-3">{statusLabel(row)}</td>
                      <td className="p-3">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PasswordDialog
        open={showPasswordDialog}
        onClose={() => {
          setShowPasswordDialog(false);
          passwordDialogActionRef.current = null;
        }}
        onSuccess={(hash) => {
          setShowPasswordDialog(false);
          passwordDialogActionRef.current?.(hash);
        }}
        title="Mailing list"
        description="Enter your admin password to view subscribers."
      />
    </div>
  );
}
