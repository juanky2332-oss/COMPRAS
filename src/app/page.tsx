'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, Camera, FileText, Search, AlertCircle, Building2, Package,
  Type, Image as ImageIcon, Info, Tag, Loader2, CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SapMatch {
  sapCode: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  confidenceLabel: string;
}

interface Supplier {
  code: string;
  name: string;
  frequency: number;
  relevantItems: string[];
  matchReason: string;
}

interface ItemInfo {
  description: string;
  quantity?: string;
  unit?: string;
  reference?: string;
  notes?: string;
  materialType?: string;
}

interface ItemState {
  item: ItemInfo;
  sap: { status: 'loading' | 'done'; matches: SapMatch[]; searchNote?: string } | null;
  supplier: { status: 'loading' | 'done'; suppliers: Supplier[] } | null;
}

type Phase = 'idle' | 'extracting' | 'searching' | 'done' | 'error';

// ─── Small helpers ────────────────────────────────────────────────────────────

const confidenceBadge: Record<string, string> = {
  high:   'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-blue-100  text-blue-800  border-blue-200',
  low:    'bg-amber-100 text-amber-800  border-amber-200',
};

function PanelLoader() {
  return (
    <div className="flex items-center gap-2 py-4 text-gray-400">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-xs">Buscando…</span>
    </div>
  );
}

function NoResult({ type }: { type: 'sap' | 'supplier' }) {
  return (
    <p className="text-xs text-gray-400 italic py-3">
      {type === 'sap'
        ? 'No encontrado en histórico SAP'
        : 'No se encontró proveedor en histórico'}
    </p>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({ state, index }: { state: ItemState; index: number }) {
  const { item, sap, supplier } = state;
  const sapDone    = sap?.status === 'done';
  const supDone    = supplier?.status === 'done';
  const hasSap     = sapDone && (sap?.matches.length ?? 0) > 0;
  const hasSupp    = supDone && (supplier?.suppliers.length ?? 0) > 0;
  const bothDone   = sapDone && supDone;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-start gap-3">
        <div className={clsx(
          'w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold mt-0.5',
          bothDone
            ? (hasSap || hasSupp ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700')
            : 'bg-gray-200 text-gray-500'
        )}>
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 text-sm leading-snug">{item.description}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {item.materialType && (
              <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                {item.materialType}
              </span>
            )}
            {item.quantity && (
              <span className="text-xs text-gray-500">Cant: {item.quantity}{item.unit ? ' ' + item.unit : ''}</span>
            )}
            {item.reference && (
              <span className="text-xs text-gray-500 font-mono">Ref: {item.reference}</span>
            )}
          </div>
          {item.notes && (
            <p className="text-xs text-gray-400 mt-1 italic">{item.notes}</p>
          )}
        </div>
        {bothDone && (
          bothDone && (hasSap || hasSupp)
            ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            : <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
        )}
      </div>

      {/* ── Two panels ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">

        {/* SAP panel */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Package className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Código SAP</span>
          </div>

          {(!sap || sap.status === 'loading') && <PanelLoader />}

          {sap?.status === 'done' && (
            hasSap ? (
              <div className="space-y-2">
                {sap.searchNote && (
                  <div className="flex items-start gap-1.5 p-2 bg-amber-50 rounded-lg border border-amber-200 mb-2">
                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 leading-snug">{sap.searchNote}</p>
                  </div>
                )}
                {sap.matches.map((m, i) => (
                  <div key={i} className="p-2.5 bg-blue-50 rounded-lg border border-blue-100 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-blue-700 text-sm">{m.sapCode}</span>
                      <span className={clsx(
                        'text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap',
                        confidenceBadge[m.confidence]
                      )}>
                        {m.confidenceLabel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-snug">{m.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <NoResult type="sap" />
            )
          )}
        </div>

        {/* Supplier panel */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Building2 className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Proveedor</span>
          </div>

          {(!supplier || supplier.status === 'loading') && <PanelLoader />}

          {supplier?.status === 'done' && (
            hasSupp ? (
              <div className="space-y-2">
                {supplier.suppliers.map((s, i) => (
                  <div key={i} className="p-2.5 bg-purple-50 rounded-lg border border-purple-100 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-purple-900 leading-snug">{s.name}</span>
                      <span className="text-xs text-purple-500 font-mono bg-purple-100 px-1.5 py-0.5 rounded shrink-0">
                        {s.code}
                      </span>
                    </div>
                    {s.matchReason && (
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-purple-400 shrink-0" />
                        <span className="text-xs text-purple-600 italic leading-snug">{s.matchReason}</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400">{s.frequency} pedidos en histórico</p>
                    {s.relevantItems.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {s.relevantItems.slice(0, 2).map((it, j) => (
                          <span key={j} className="text-xs bg-white text-gray-500 px-1.5 py-0.5 rounded border border-purple-100">
                            {it.length > 40 ? it.slice(0, 40) + '…' : it}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <NoResult type="supplier" />
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [mode, setMode]           = useState<'image' | 'text'>('image');
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [phase, setPhase]         = useState<Phase>('idle');
  const [items, setItems]         = useState<ItemState[]>([]);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);
  const abortRef                  = useRef<AbortController | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setItems([]);
    setErrorMsg(null);
    setPhase('idle');
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  });

  const canAnalyze = mode === 'image' ? !!file : textInput.trim().length > 5;

  const handleAnalyze = async () => {
    if (!canAnalyze) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPhase('extracting');
    setItems([]);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      if (mode === 'image' && file) formData.append('file', file);
      else formData.append('text', textInput.trim());

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
        signal: ctrl.signal,
      });

      if (!res.body) throw new Error('Sin respuesta del servidor');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: Record<string, unknown>;
          try { event = JSON.parse(line); } catch { continue; }

          switch (event.type) {
            case 'extracting':
              setPhase('extracting');
              break;

            case 'start':
              setPhase('searching');
              setItems(
                new Array(event.total as number).fill(null).map(() => ({
                  item: { description: '…' },
                  sap: null,
                  supplier: null,
                }))
              );
              break;

            case 'item':
              setItems(prev => {
                const next = [...prev];
                next[event.index as number] = {
                  ...next[event.index as number],
                  item: event.item as ItemInfo,
                  sap: { status: 'loading', matches: [] },
                  supplier: { status: 'loading', suppliers: [] },
                };
                return next;
              });
              break;

            case 'sap':
              setItems(prev => {
                const next = [...prev];
                next[event.index as number] = {
                  ...next[event.index as number],
                  sap: {
                    status: 'done',
                    matches: (event.sapMatches as SapMatch[]) ?? [],
                    searchNote: event.searchNote as string | undefined,
                  },
                };
                return next;
              });
              break;

            case 'supplier':
              setItems(prev => {
                const next = [...prev];
                next[event.index as number] = {
                  ...next[event.index as number],
                  supplier: {
                    status: 'done',
                    suppliers: (event.suppliers as Supplier[]) ?? [],
                  },
                };
                return next;
              });
              break;

            case 'done':
              setPhase('done');
              break;

            case 'error':
              setPhase('error');
              setErrorMsg(event.message as string);
              break;
          }
        }
      }

      // Ensure phase is done even if 'done' event missed
      setPhase(p => (p === 'searching' ? 'done' : p));
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') return;
      setPhase('error');
      setErrorMsg(e instanceof Error ? e.message : 'Error desconocido');
    }
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setFile(null);
    setPreview(null);
    setTextInput('');
    setItems([]);
    setErrorMsg(null);
    setPhase('idle');
  };

  const switchMode = (m: 'image' | 'text') => { setMode(m); handleReset(); };

  const isLoading  = phase === 'extracting' || phase === 'searching';
  const doneCount  = items.filter(s => s.sap?.status === 'done' || s.supplier?.status === 'done').length;
  const foundCount = items.filter(s =>
    (s.sap?.matches.length ?? 0) > 0 || (s.supplier?.suppliers.length ?? 0) > 0
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">COMPRAS AI</h1>
              <p className="text-xs text-gray-500">Vidal Golosinas · Molina de Segura</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border">
            <span className="w-2 h-2 bg-green-400 rounded-full" />
            SAP + Proveedores
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {phase === 'idle' && (
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Identifica materiales al instante</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Sube una foto, recorte o escribe el texto. La IA busca el
              {' '}<strong>código SAP</strong> y el <strong>proveedor</strong> de cada artículo por separado y muestra los resultados según los va encontrando.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Left: input ── */}
          <div className="space-y-4">
            {/* Mode tabs */}
            <div className="bg-white rounded-xl border border-gray-200 p-1 flex gap-1">
              <button
                onClick={() => switchMode('image')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                  mode === 'image' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                )}
              >
                <ImageIcon className="w-4 h-4" /> Imagen / Recorte
              </button>
              <button
                onClick={() => switchMode('text')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                  mode === 'text' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                )}
              >
                <Type className="w-4 h-4" /> Pegar texto
              </button>
            </div>

            {/* Dropzone */}
            {mode === 'image' && !file && (
              <div
                {...getRootProps()}
                className={clsx(
                  'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
                  isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 bg-white'
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-700">
                      {isDragActive ? 'Suelta aquí' : 'Arrastra o haz clic para subir'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Foto, captura, recorte o PDF · Máx. 20 MB</p>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Camera className="w-3 h-3" /> Foto</span>
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF</span>
                    <span className="flex items-center gap-1"><Upload className="w-3 h-3" /> Captura</span>
                  </div>
                </div>
              </div>
            )}

            {/* Image preview */}
            {mode === 'image' && file && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {preview
                  ? <img src={preview} alt="Preview" className="w-full max-h-80 object-contain bg-gray-50" />
                  : (
                    <div className="h-40 bg-gray-50 flex items-center justify-center gap-3">
                      <FileText className="w-12 h-12 text-gray-400" />
                      <span className="text-gray-600 text-sm">{file.name}</span>
                    </div>
                  )
                }
              </div>
            )}

            {/* Textarea */}
            {mode === 'text' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                  <p className="text-xs text-gray-500">Pega aquí un email, presupuesto, albarán o lista de materiales</p>
                </div>
                <textarea
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder={`Ej:\n- 2 ud. Rodamiento SKF 6205-2RS\n- Correa dentada 14M-2240 x 40mm\n- Filtro aire compresor Atlas Copco GA37`}
                  className="w-full h-52 p-4 text-sm text-gray-800 resize-none focus:outline-none placeholder-gray-400"
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleAnalyze}
                disabled={isLoading || !canAnalyze}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />
                    {phase === 'extracting' ? 'Analizando con IA…' : 'Buscando…'}
                  </>
                ) : (
                  <><Search className="w-4 h-4" />
                    {mode === 'text' ? 'Buscar materiales' : 'Analizar imagen'}
                  </>
                )}
              </button>
              {(file || textInput || items.length > 0) && (
                <button onClick={handleReset} className="px-4 py-3 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors text-sm">
                  Limpiar
                </button>
              )}
            </div>

            {/* Legend */}
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Confianza del código SAP</p>
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs px-2 py-1 rounded-full border font-medium bg-green-100 text-green-800 border-green-200">Alta — coincidencia exacta</span>
                <span className="text-xs px-2 py-1 rounded-full border font-medium bg-blue-100 text-blue-800 border-blue-200">Probable — muy similar</span>
                <span className="text-xs px-2 py-1 rounded-full border font-medium bg-amber-100 text-amber-800 border-amber-200">Posible — revisar</span>
              </div>
            </div>
          </div>

          {/* ── Right: results ── */}
          <div className="space-y-4">
            {/* Summary bar */}
            {items.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    {items.length} artículo{items.length !== 1 ? 's' : ''} identificado{items.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-500">
                    {phase === 'done'
                      ? `${foundCount} con resultado · ${items.length - foundCount} sin coincidencia`
                      : `Procesando ${doneCount} de ${items.length}…`
                    }
                  </p>
                </div>
                {phase === 'done' && (
                  <div className={clsx(
                    'text-2xl font-bold',
                    foundCount === items.length ? 'text-green-600' : foundCount > 0 ? 'text-blue-600' : 'text-orange-500'
                  )}>
                    {items.length > 0 ? Math.round((foundCount / items.length) * 100) : 0}%
                  </div>
                )}
                {isLoading && (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                )}
              </div>
            )}

            {/* Initial loading */}
            {phase === 'extracting' && items.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="font-semibold text-gray-700">Analizando con IA…</p>
                <p className="text-sm text-gray-500 mt-1">Identificando artículos en el contenido</p>
              </div>
            )}

            {/* Error */}
            {phase === 'error' && errorMsg && (
              <div className="bg-red-50 rounded-2xl border border-red-200 p-5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">Error en el análisis</p>
                  <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Item cards */}
            {items.map((state, i) => (
              <ResultCard key={i} state={state} index={i} />
            ))}

            {/* Idle placeholder */}
            {phase === 'idle' && (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                <div className="flex justify-center gap-4 mb-4 text-gray-300">
                  <Package className="w-8 h-8" />
                  <Building2 className="w-8 h-8" />
                </div>
                <p className="text-gray-400 text-sm">
                  Cada artículo mostrará su <strong className="text-gray-500">código SAP</strong> y su <strong className="text-gray-500">proveedor</strong> por separado
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-16 border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between text-xs text-gray-400">
          <span>Vidal Golosinas · Molina de Segura</span>
          <span>COMPRAS AI — GPT-4o</span>
        </div>
      </footer>
    </div>
  );
}
