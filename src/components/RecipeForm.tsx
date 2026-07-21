"use client";

import { useState } from "react";
import type { Recipe } from "@/lib/types";

export function RecipeForm({ onAdd }: { onAdd: (r: Omit<Recipe, "id" | "createdAt">) => void }) {
  const [who, setWho] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImage(file: File): Promise<{ mediaType: string; base64: string }> {
    const dataUrl: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(new Error("Couldn't read that image."));
      r.readAsDataURL(file);
    });
    const [, base64] = dataUrl.split(",");
    return { mediaType: file.type, base64 };
  }

  async function submit(image?: { mediaType: string; base64: string }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() || undefined, image }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed.");
      onAdd({ title: data.title, ingredients: data.ingredients, addedBy: who.trim() || "someone" });
      setText("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <p className="eyebrow mb-2">Add a recipe</p>
      <input
        className="field mb-2"
        placeholder="Your name (so you both know who added what)"
        value={who}
        onChange={(e) => setWho(e.target.value)}
      />
      <textarea
        className="field mb-3"
        rows={5}
        placeholder="Paste a recipe, or just its ingredients — one per line."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {error && <p className="text-sm text-[#9c3a28] mb-3">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={() => submit()}>
          {busy ? "Reading…" : "Add from text"}
        </button>
        <label className={`btn btn-ghost cursor-pointer ${busy ? "opacity-50 pointer-events-none" : ""}`}>
          Add from photo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const img = await handleImage(file);
                await submit(img);
              } catch (err: any) {
                setError(err.message);
              } finally {
                e.target.value = "";
              }
            }}
          />
        </label>
      </div>
    </div>
  );
}
