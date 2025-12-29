"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hashPassword } from "@/lib/client-auth";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface PasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (passwordHash: string) => void;
  title?: string;
  description?: string;
}

const PASSWORD_HASH_CACHE_KEY = "admin_password_hash";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export default function PasswordDialog({
  open,
  onClose,
  onSuccess,
  title = "Admin Authentication",
  description = "Please enter your admin password to continue.",
}: Readonly<PasswordDialogProps>) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword("");
      setError("");
      // Check for cached password hash
      const cachedHash = getCachedPasswordHash();
      if (cachedHash) {
        onSuccess(cachedHash);
        onClose();
      }
    }
  }, [open, onSuccess, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const trimmedPassword = password.trim();
      if (!trimmedPassword) {
        setError("Password cannot be empty");
        setLoading(false);
        return;
      }

      const passwordHash = await hashPassword(trimmedPassword);
      
      // Cache only the hash, not the raw password
      cachePasswordHash(passwordHash);
      
      onSuccess(passwordHash);
      setPassword("");
      onClose();
    } catch (err) {
      setError("Failed to process password. Please try again.");
      console.error("Error hashing password:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleSubmit(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-gray-600" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter admin password"
                  autoFocus
                  disabled={loading}
                  className={error ? "border-red-500 pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !password.trim()}>
              {loading ? "Verifying..." : "Continue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Get cached password hash if it's still valid
 */
export function getCachedPasswordHash(): string | null {
  if (typeof window === "undefined") return null;
  
  try {
    const cached = sessionStorage.getItem(PASSWORD_HASH_CACHE_KEY);
    if (!cached) return null;
    
    const { hash, timestamp } = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid (within duration)
    if (now - timestamp < CACHE_DURATION) {
      return hash;
    }
    
    // Cache expired, remove it
    sessionStorage.removeItem(PASSWORD_HASH_CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

/**
 * Cache password hash with timestamp
 */
export function cachePasswordHash(hash: string): void {
  if (typeof window === "undefined") return;
  
  try {
    const data = {
      hash,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(PASSWORD_HASH_CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to cache password hash:", err);
  }
}

/**
 * Clear cached password hash
 */
export function clearCachedPasswordHash(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PASSWORD_HASH_CACHE_KEY);
}

