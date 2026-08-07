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
import { Lock, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useState } from "react";
import bcrypt from "bcryptjs";

interface PasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (passwordHash: string) => void;
  title?: string;
  description?: string;
}

const PASSWORD_HASH_CACHE_KEY = "admin_password_hash";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const MAX_PASSWORD_RETRIES = 5;

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
  const [retryCount, setRetryCount] = useState(0);
  const [lockedOut, setLockedOut] = useState(false);

  const remainingRetries = Math.max(0, MAX_PASSWORD_RETRIES - retryCount);
  const hasFailedAttempt = retryCount > 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    setPassword("");
    setError("");
    setRetryCount(0);
    setLockedOut(false);

    let cancelled = false;

    const unlockWithCachedHash = async () => {
      const cachedHash = await getVerifiedCachedPasswordHash();
      if (cancelled || !cachedHash) {
        return;
      }
      onSuccess(cachedHash);
      onClose();
    };

    void unlockWithCachedHash();

    return () => {
      cancelled = true;
    };
  }, [open, onSuccess, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedOut) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const trimmedPassword = password.trim();
      if (!trimmedPassword) {
        setError("Password cannot be empty");
        setLoading(false);
        return;
      }

      const storedHashResponse = await fetch("/api/admin-password-hash");
      if (!storedHashResponse.ok) {
        setError("Unable to verify password. Please try again.");
        setLoading(false);
        return;
      }

      const { hash: storedHash } = (await storedHashResponse.json()) as {
        hash?: string;
      };
      if (!storedHash) {
        setError("Admin password is not configured.");
        setLoading(false);
        return;
      }

      const passwordHash = await hashPassword(trimmedPassword);
      const isValid = await bcrypt.compare(passwordHash, storedHash);

      if (!isValid) {
        const nextRetryCount = retryCount + 1;
        setRetryCount(nextRetryCount);
        setPassword("");

        if (nextRetryCount >= MAX_PASSWORD_RETRIES) {
          setLockedOut(true);
          setError(
            `Too many incorrect attempts. Access locked after ${MAX_PASSWORD_RETRIES} tries.`
          );
        } else {
          const attemptsLeft = MAX_PASSWORD_RETRIES - nextRetryCount;
          setError(
            `Incorrect password. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`
          );
        }
        setLoading(false);
        return;
      }

      // Cache only the hash, not the raw password
      cachePasswordHash(passwordHash);

      onSuccess(passwordHash);
      setPassword("");
      setRetryCount(0);
      setLockedOut(false);
      onClose();
    } catch (err) {
      setError("Failed to process password. Please try again.");
      console.error("Error verifying password:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && !lockedOut) {
      handleSubmit(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className={`h-5 w-5 ${hasFailedAttempt || lockedOut ? "text-red-600" : "text-gray-600"}`} />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {(hasFailedAttempt || lockedOut) && (
              <div
                className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                  lockedOut
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                }`}
                role="status"
                aria-live="polite"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">
                    {lockedOut
                      ? "Authentication locked"
                      : "Incorrect password"}
                  </p>
                  <p className="mt-0.5">
                    {lockedOut
                      ? `You used all ${MAX_PASSWORD_RETRIES} attempts. Close this dialog and try again later.`
                      : `${remainingRetries} of ${MAX_PASSWORD_RETRIES} attempts left.`}
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (!lockedOut) {
                      setError("");
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter admin password"
                  autoFocus
                  disabled={loading || lockedOut}
                  aria-invalid={Boolean(error)}
                  className={
                    hasFailedAttempt || lockedOut || error
                      ? "border-red-500 pr-10 focus-visible:ring-red-500"
                      : "pr-10"
                  }
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
            <Button
              type="submit"
              disabled={loading || lockedOut || !password.trim()}
              className={lockedOut ? "bg-red-600 hover:bg-red-600" : undefined}
            >
              {loading ? "Verifying..." : lockedOut ? "Locked" : "Continue"}
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
 * Return the cached SHA-256 password hash only if it still matches the server hash.
 */
export async function getVerifiedCachedPasswordHash(): Promise<string | null> {
  const cachedHash = getCachedPasswordHash();
  if (!cachedHash) {
    return null;
  }

  try {
    const storedHashResponse = await fetch("/api/admin-password-hash");
    if (!storedHashResponse.ok) {
      return null;
    }

    const { hash: storedHash } = (await storedHashResponse.json()) as {
      hash?: string;
    };
    if (!storedHash) {
      return null;
    }

    const isValid = await bcrypt.compare(cachedHash, storedHash);
    if (!isValid) {
      clearCachedPasswordHash();
      return null;
    }

    return cachedHash;
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
