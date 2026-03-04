import { useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Upload, Trash2, ImageIcon, Video, X, ZoomIn, Loader2,
  Camera, Film, ChevronLeft, ChevronRight
} from "lucide-react";

interface OSAnexosProps {
  ordemServicoId: number;
}

const MAX_FILE_SIZE_MB = 15;
const ACCEPTED_TYPES = {
  imagem: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"],
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function OSAnexos({ ordemServicoId }: OSAnexosProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: anexos = [], refetch } = trpc.osAnexos.list.useQuery({ ordemServicoId });

  const uploadMutation = trpc.osAnexos.upload.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(`Erro no upload: ${e.message}`),
  });

  const deleteMutation = trpc.osAnexos.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Arquivo removido!"); },
    onError: (e) => toast.error(e.message),
  });

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_FILE_SIZE_MB) {
        toast.error(`"${file.name}" excede ${MAX_FILE_SIZE_MB}MB`);
        continue;
      }
      const isImagem = ACCEPTED_TYPES.imagem.includes(file.type);
      const isVideo = ACCEPTED_TYPES.video.includes(file.type);
      if (!isImagem && !isVideo) {
        toast.error(`"${file.name}" não é um formato suportado`);
        continue;
      }
      setUploading(prev => [...prev, file.name]);
      try {
        const base64 = await fileToBase64(file);
        await uploadMutation.mutateAsync({
          ordemServicoId,
          nomeArquivo: file.name,
          tipo: isImagem ? "imagem" : "video",
          mimeType: file.type,
          tamanhoBytes: file.size,
          base64,
        });
        toast.success(`"${file.name}" enviado!`);
      } catch {
        // error already handled by onError
      } finally {
        setUploading(prev => prev.filter(n => n !== file.name));
      }
    }
  }, [ordemServicoId, uploadMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const imagens = (anexos as any[]).filter(a => a.tipo === "imagem");
  const videos = (anexos as any[]).filter(a => a.tipo === "video");

  const lightboxItems = imagens; // only images in lightbox
  const currentLightbox = lightboxIndex !== null ? lightboxItems[lightboxIndex] : null;

  return (
    <div className="space-y-4">
      {/* ─── Upload Zone ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
          isDragging
            ? "border-red-500 bg-red-500/10"
            : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/30"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={e => e.target.files && processFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            <Camera className="w-6 h-6 text-slate-400" />
            <Film className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-300 font-medium text-sm">
            {isDragging ? "Solte os arquivos aqui" : "Arraste fotos/vídeos ou clique para selecionar"}
          </p>
          <p className="text-slate-500 text-xs">
            JPG, PNG, WEBP, MP4, WEBM · Máx. {MAX_FILE_SIZE_MB}MB por arquivo
          </p>
        </div>
      </div>

      {/* ─── Uploading Progress ───────────────────────────────────────── */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map(name => (
            <div key={name} className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-red-400 shrink-0" />
              <span className="text-slate-300 text-sm truncate">{name}</span>
              <span className="text-slate-500 text-xs ml-auto">Enviando...</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── Image Gallery ────────────────────────────────────────────── */}
      {imagens.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 text-sm font-medium">Fotos</span>
            <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">{imagens.length}</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {imagens.map((anexo: any, idx: number) => (
              <div key={anexo.id} className="relative group rounded-lg overflow-hidden bg-slate-800 aspect-square">
                <img
                  src={anexo.url}
                  alt={anexo.nomeArquivo ?? "foto"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-8 h-8 text-white hover:bg-white/20"
                    onClick={() => setLightboxIndex(idx)}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-8 h-8 text-red-400 hover:bg-red-500/20"
                    onClick={() => deleteMutation.mutate({ id: anexo.id })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {/* Size badge */}
                {anexo.tamanhoBytes && (
                  <div className="absolute bottom-1 left-1 bg-black/60 rounded px-1 py-0.5 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatBytes(anexo.tamanhoBytes)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Video List ───────────────────────────────────────────────── */}
      {videos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Video className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 text-sm font-medium">Vídeos</span>
            <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">{videos.length}</Badge>
          </div>
          <div className="space-y-2">
            {videos.map((anexo: any) => (
              <div key={anexo.id} className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700">
                <video
                  src={anexo.url}
                  controls
                  className="w-full max-h-64 bg-black"
                  preload="metadata"
                />
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Film className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-300 text-sm truncate">{anexo.nomeArquivo ?? "vídeo"}</span>
                    {anexo.tamanhoBytes && (
                      <span className="text-slate-500 text-xs shrink-0">{formatBytes(anexo.tamanhoBytes)}</span>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 text-red-400 hover:bg-red-500/10 shrink-0"
                    onClick={() => deleteMutation.mutate({ id: anexo.id })}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Empty State ─────────────────────────────────────────────── */}
      {(anexos as any[]).length === 0 && uploading.length === 0 && (
        <div className="text-center py-4 text-slate-500 text-sm">
          Nenhuma foto ou vídeo anexado ainda.
        </div>
      )}

      {/* ─── Lightbox ────────────────────────────────────────────────── */}
      <Dialog open={lightboxIndex !== null} onOpenChange={() => setLightboxIndex(null)}>
        <DialogContent className="max-w-4xl bg-black/95 border-slate-800 p-0">
          {currentLightbox && (
            <div className="relative flex items-center justify-center min-h-[60vh]">
              {/* Close */}
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 z-10 text-white hover:bg-white/10"
                onClick={() => setLightboxIndex(null)}
              >
                <X className="w-5 h-5" />
              </Button>
              {/* Prev */}
              {lightboxIndex! > 0 && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute left-2 z-10 text-white hover:bg-white/10"
                  onClick={() => setLightboxIndex(i => i! - 1)}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
              )}
              {/* Image */}
              <img
                src={currentLightbox.url}
                alt={currentLightbox.nomeArquivo ?? "foto"}
                className="max-w-full max-h-[80vh] object-contain rounded"
              />
              {/* Next */}
              {lightboxIndex! < lightboxItems.length - 1 && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 z-10 text-white hover:bg-white/10"
                  onClick={() => setLightboxIndex(i => i! + 1)}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              )}
              {/* Counter */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 rounded-full px-3 py-1 text-white text-xs">
                {lightboxIndex! + 1} / {lightboxItems.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
