"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface DuplicateCandidate {
  key: string;
  newPreview: string;
  matchedPreview: string | null;
}

interface DuplicateWarningDialogProps {
  candidates: DuplicateCandidate[];
  onResolve: (skipKeys: string[]) => void;
}

export default function DuplicateWarningDialog({
  candidates,
  onResolve,
}: Readonly<DuplicateWarningDialogProps>) {
  const [skip, setSkip] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(candidates.map((c) => [c.key, true]))
  );

  const toggle = (key: string) =>
    setSkip((prev) => ({ ...prev, [key]: !prev[key] }));

  const setAll = (value: boolean) =>
    setSkip(Object.fromEntries(candidates.map((c) => [c.key, value])));

  const skipCount = candidates.filter((c) => skip[c.key]).length;

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onResolve([]);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Possible duplicate images</DialogTitle>
          <DialogDescription>
            {candidates.length === 1
              ? "1 image looks like a photo already on this model. Choose whether to skip it."
              : `${candidates.length} images look like photos already on this model. Choose which to skip.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setAll(true)}>
            Skip all
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setAll(false)}>
            Keep all
          </Button>
        </div>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto py-1">
          {candidates.map((c) => (
            <label
              key={c.key}
              className="flex items-center gap-3 rounded-md border border-gray-200 p-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!!skip[c.key]}
                onChange={() => toggle(c.key)}
                className="h-4 w-4"
              />
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.newPreview}
                  alt="New upload"
                  className="h-16 w-12 rounded object-cover"
                />
                <span className="text-xs text-gray-400">≈</span>
                {c.matchedPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.matchedPreview}
                    alt="Existing photo"
                    className="h-16 w-12 rounded object-cover opacity-80"
                  />
                ) : (
                  <span className="text-xs text-gray-400">existing photo</span>
                )}
              </div>
              <span className="ml-auto text-sm text-gray-600">
                {skip[c.key] ? "Skip" : "Keep"}
              </span>
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => onResolve(candidates.filter((c) => skip[c.key]).map((c) => c.key))}
          >
            {skipCount > 0 ? `Skip ${skipCount} and continue` : "Keep all and continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
