import { useState, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { Search, Building2, ExternalLink, Loader2, Info, ChevronRight, ChevronLeft } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for merging tailwind classes
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export default function App() {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [allResults, setAllResults] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 10;
  const [sources, setSources] = useState<GroundingChunk[]>([]);
  const [error, setError] = useState<string | null>(null);

  const quickKeywords = [
    'Electrónica', 'Calzado', 'Ropa', 'Perfumes', 'Logística', 'Repuestos', 'Licores'
  ];

  const handleSearch = async (e?: React.FormEvent, searchKeyword?: string) => {
    if (e) e.preventDefault();
    const activeKeyword = searchKeyword || keyword;
    if (!activeKeyword.trim()) return;

    setLoading(true);
    setError(null);
    setAllResults([]);
    setCurrentPage(1);
    setSources([]);

    // Create a new instance right before the call
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

    // Construct a specific prompt based on the keyword
    const prompt = `Busca y proporciona un listado de hasta 100 empresas en la Zona Libre de Colón, Panamá, relacionadas con: ${activeKeyword}. 
    Para cada empresa, DEBES intentar encontrar y mostrar EXCLUSIVAMENTE los siguientes campos en este formato exacto:
    
    - **Nombre**: [Nombre de la empresa]
    - **Teléfono**: [Número de teléfono o "No disponible"]
    - **Email**: [Correo electrónico o "No disponible"]
    - **Web**: [Sitio web o "No disponible"]
    
    Separa cada empresa con una línea horizontal (---). No incluyas descripciones largas, ni texto introductorio o de conclusión, solo estos datos específicos.`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "";
      const companies = text.split(/---+|\*\*\*+/).map(c => c.trim()).filter(c => c.length > 0);
      
      if (companies.length === 0) {
        setAllResults([text || "No se encontró información para este keyword."]);
      } else {
        setAllResults(companies);
      }
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        setSources(chunks as GroundingChunk[]);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Ocurrió un error al buscar la información. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearch = (k: string) => {
    setKeyword(k);
    handleSearch(undefined, k);
  };

  const totalPages = Math.ceil(allResults.length / resultsPerPage);
  const currentResults = allResults.slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage);
  const displayedResult = currentResults.join('\n\n---\n\n');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Directorio ZLC
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Search Section */}
        <section className="mb-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
              Buscador por Keyword
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Ingresa un producto, categoría o nombre para listar las empresas relacionadas en la Zona Libre de Colón.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="relative group mb-4">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Escribe un keyword (ej: Zapatillas, Apple, Logística)..."
                className="block w-full pl-11 pr-32 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-900 text-lg"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-2 bottom-2 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Sugerencias:</span>
              {quickKeywords.map((k) => (
                <button
                  key={k}
                  onClick={() => handleQuickSearch(k)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-sm font-medium rounded-full transition-colors border border-transparent hover:border-blue-200"
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Results Section */}
        <div className="max-w-4xl mx-auto">
          <div>
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center animate-pulse">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Consultando base de datos y fuentes en tiempo real...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-700 flex items-start gap-4">
                <Info className="w-6 h-6 flex-shrink-0" />
                <div>
                  <h3 className="font-bold mb-1">Error al cargar datos</h3>
                  <p>{error}</p>
                  <button 
                    onClick={() => handleSearch()}
                    className="mt-3 text-sm font-semibold underline hover:no-underline"
                  >
                    Intentar de nuevo
                  </button>
                </div>
              </div>
            ) : allResults.length > 0 ? (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 sm:p-8">
                    <div className="markdown-body">
                      <ReactMarkdown>{displayedResult}</ReactMarkdown>
                    </div>
                  </div>
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Anterior
                    </button>
                    <span className="text-sm font-medium text-slate-600">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-100 rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                <p className="text-slate-500">Ingresa una búsqueda para ver los resultados.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Directorio Zona Libre de Colón. Datos proporcionados por Google Search Grounding.
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-slate-600 transition-colors">Privacidad</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Términos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
