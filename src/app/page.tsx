'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, Camera, FileText, Search, CheckCircle, XCircle,
  AlertCircle, Building2, Package, ChevronDown, ChevronUp,
  Type, Image as ImageIcon, Info, Tag,
} from 'lucide-react';
import clsx from 'clsx';

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

interface SearchResult {
  item: {
    description: string;
    quantity?: string;
    unit?: string;
    reference?: string;
    notes?: string;
    materialType?: string;
  };
  sapMatches: SapMatch[];
  suppliers: Supplier[];
  found: boolean;
  searchNote?: string;
  message?: string;
}

interface AnalysisResponse {
  results: SearchResult[];
  itemsFound?: number;
  message?: string;
  error?: string;
}

const confidenceBadge = {
  high: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-blue-100 text-blue-800 border-blue-200',
  low: 'bg-amber-100 text-amber-800 border-amber-200',
};

function ResultCard({ result, index }: { result: SearchResult; index: number }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={clsx(
            'w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold',
            result.found ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
          )}>
            {index + 1}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{result.item.description}</p>
            <div className="flex gap-2 mt-0.5 flex-wrap">
              {result.item.quantity && (
                <span className="text-xs text-gray-500">Cant: {result.item.quantity} {result.item.unit || ''}</span>
              )}
              {result.item.reference && (
                <span className="text-xs text-gray-500">Ref: {result.item.reference}</span>
              )}
              {result.item.materialType && (
                <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">{result.item.materialType}</span>
              )}
              {result.sapMatches.length > 0 && (
                <span className="text-xs font-medium text-blue-600">{result.sapMatches.length} cód. SAP</span>
              )}
              {result.suppliers.length > 0 && (
                <span className="text-xs font-medium text-purple-600">{result.suppliers.length} proveedor{result.suppliers.length > 1 ? 'es' : ''}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {result.found ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-orange-500" />
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-3">
          {result.item.notes && (
            <p className="text-xs text-gray-500 mt-3 italic">{result.item.notes}</p>
          )}

          {result.searchNote && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 mt-3">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">{result.searchNote}</p>
            </div>
          )}

          {!result.found && result.message && (
            <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-700">{result.message}</p>
            </div>
          )}

          {/* SAP Codes */}
          {result.sapMatches.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-semibold text-gray-700">Códigos SAP</h4>
              </div>
              <div className="space-y-2">
                {result.sapMatches.map((match, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                    <span className="font-mono font-bold text-blue-700 text-sm whitespace-nowrap">{match.sapCode}</span>
                    <span className="text-xs text-gray-600 flex-1 leading-relaxed">{match.description}</span>
                    <span className={clsx(
                      'text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap shrink-0',
                      confidenceBadge[match.confidence]
                    )}>
                      {match.confidenceLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suppliers */}
          {result.suppliers.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-semibold text-gray-700">Proveedores que pueden tenerlo</h4>
              </div>
              <div className="space-y-2">
                {result.suppliers.map((supplier, i) => (
                  <div key={i} className="p-2.5 bg-purple-50 rounded-lg border border-purple-100">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-purple-900">{supplier.name}</span>
                      <span className="text-xs text-purple-600 font-mono bg-purple-100 px-2 py-0.5 rounded shrink-0">
                        {supplier.code}
                      </span>
                    </div>
                    {/* Why this supplier */}
                    {supplier.matchReason && (
                      <div className="flex items-center gap-1 mt-1">
                        <Tag className="w-3 h-3 text-purple-400 shrink-0" />
                        <span className="text-xs text-purple-600 italic">{supplier.matchReason}</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{supplier.frequency} pedidos en histórico</p>
                    {supplier.relevantItems.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {supplier.relevantItems.slice(0, 3).map((item, j) => (
                          <span key={j} className="text-xs bg-white text-gray-500 px-1.5 py-0.5 rounded border border-purple-100">
                            {item.length > 45 ? item.substring(0, 45) + '…' : item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.found && result.message && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">{result.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<'image' | 'text'>('image');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;
    setFile(f);
    setResponse(null);
    setError(null);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
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
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const formData = new FormData();
      if (mode === 'image' && file) {
        formData.append('file', file);
      } else {
        formData.append('text', textInput.trim());
      }

      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data: AnalysisResponse = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error del servidor');
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setTextInput('');
    setResponse(null);
    setError(null);
  };

  const switchMode = (newMode: 'image' | 'text') => {
    setMode(newMode);
    handleReset();
  };

  const foundCount = response?.results.filter(r => r.found).length ?? 0;
  const totalCount = response?.results.length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
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
          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            Búsqueda en histórico SAP
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {!response && !loading && (
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Identifica materiales al instante
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Sube una foto, recorte, PDF o escribe el texto. Te devolvemos los <strong>códigos SAP</strong> y los <strong>proveedores</strong> más probables según tu histórico de compras.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Mode tabs */}
            <div className="bg-white rounded-xl border border-gray-200 p-1 flex gap-1">
              <button
                onClick={() => switchMode('image')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                  mode === 'image' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                <ImageIcon className="w-4 h-4" />
                Imagen / Recorte
              </button>
              <button
                onClick={() => switchMode('text')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                  mode === 'text' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                <Type className="w-4 h-4" />
                Pegar texto
              </button>
            </div>

            {mode === 'image' && !file && (
              <div
                {...getRootProps()}
                className={clsx(
                  'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200',
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
                    <p className="text-sm text-gray-500 mt-1">Foto, captura, recorte o PDF · Máx. 20MB</p>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Camera className="w-3 h-3" /> Foto</span>
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF</span>
                    <span className="flex items-center gap-1"><Upload className="w-3 h-3" /> Captura</span>
                  </div>
                </div>
              </div>
            )}

            {mode === 'image' && file && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full max-h-80 object-contain bg-gray-50" />
                ) : (
                  <div className="h-40 bg-gray-50 flex items-center justify-center gap-3">
                    <FileText className="w-12 h-12 text-gray-400" />
                    <span className="text-gray-600 text-sm">{file.name}</span>
                  </div>
                )}
              </div>
            )}

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

            <div className="flex gap-3">
              <button
                onClick={handleAnalyze}
                disabled={loading || !canAnalyze}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    {mode === 'text' ? 'Buscar materiales' : 'Analizar imagen'}
                  </>
                )}
              </button>
              {(file || textInput) && (
                <button onClick={handleReset} className="px-4 py-3 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
                  Limpiar
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-3 border border-gray-200 text-center">
                <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-1.5">
                  <Package className="w-3.5 h-3.5 text-green-600" />
                </div>
                <p className="text-xs font-semibold text-gray-700">Alta confianza</p>
                <p className="text-xs text-gray-400">Coincidencia exacta</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-200 text-center">
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <p className="text-xs font-semibold text-gray-700">Probable</p>
                <p className="text-xs text-gray-400">Muy similar</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-200 text-center">
                <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <p className="text-xs font-semibold text-gray-700">Posible</p>
                <p className="text-xs text-gray-400">Revisar antes de pedir</p>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            {loading && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-semibold text-gray-700">
                  {mode === 'text' ? 'Procesando texto...' : 'Analizando imagen...'}
                </p>
                <p className="text-sm text-gray-500 mt-1">Identificando artículos y buscando en histórico</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 rounded-2xl border border-red-200 p-6 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">Error en el análisis</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}

            {response && !loading && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      {totalCount} artículo{totalCount !== 1 ? 's' : ''} identificado{totalCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      {foundCount} con resultado · {totalCount - foundCount} sin coincidencia
                    </p>
                  </div>
                  <div className={clsx(
                    'text-2xl font-bold',
                    foundCount === totalCount ? 'text-green-600' : foundCount > 0 ? 'text-blue-600' : 'text-orange-500'
                  )}>
                    {totalCount > 0 ? Math.round((foundCount / totalCount) * 100) : 0}%
                  </div>
                </div>
                {response.results.map((result, i) => (
                  <ResultCard key={i} result={result} index={i} />
                ))}
              </>
            )}

            {!response && !loading && !error && (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Los resultados aparecerán aquí</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-16 border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between text-xs text-gray-400">
          <span>Vidal Golosinas · Molina de Segura</span>
          <span>COMPRAS AI — Powered by GPT-4</span>
        </div>
      </footer>
    </div>
  );
}
