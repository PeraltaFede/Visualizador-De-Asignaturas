import React, { useState, useMemo, useRef } from 'react';
import {
  Search, BookOpen, Database, Globe,
  BarChart, List, Grid, GitGraph,
  Upload, Download, FileJson, X, Layout,
  Variable, Atom, FlaskConical, PenTool, CircuitBoard,
  SquareActivity, Factory, SquareTerminal
} from 'lucide-react';

interface Subject {
  id: number;
  year: number;
  semester: number;
  name: string;
  category: string;
  tech: string[];
  prerequisites: number[];
}

interface TechGroup {
  name: string;
  subjects: Subject[];
  categories: Set<string>;
}

interface CategoryGroup {
  name: string;
  subjects: Subject[];
  techs: Set<string>;
}

const App = () => {
  // DATOS POR DEFECTO
  const defaultSubjects: Subject[] = [
    { id: 1, year: 1, semester: 1, name: "Fundamentos de Programación", category: "Programación", tech: ["Python", "VS Code", "Git"], prerequisites: [] },
    { id: 2, year: 1, semester: 1, name: "Cálculo", category: "Matemáticas", tech: ["MATLAB", "LaTeX"], prerequisites: [] },
    { id: 3, year: 1, semester: 1, name: "Física para Informática", category: "Ciencias", tech: ["Python (NumPy)", "Simuladores"], prerequisites: [2] },
    { id: 4, year: 1, semester: 1, name: "Fundamentos de Computadores", category: "Hardware", tech: ["Logisim", "Verilog"], prerequisites: [] },
    { id: 5, year: 1, semester: 1, name: "Lógica y Discreta", category: "Matemáticas", tech: ["Prolog", "Haskell"], prerequisites: [] },
    { id: 6, year: 1, semester: 2, name: "Programación Orientada a Objetos", category: "Programación", tech: ["Java", "IntelliJ", "JUnit"], prerequisites: [1] },
    { id: 7, year: 1, semester: 2, name: "Estructura de Computadores", category: "Hardware", tech: ["MIPS/RISC-V", "Mars"], prerequisites: [4] },
    { id: 8, year: 1, semester: 2, name: "Estadística", category: "Matemáticas", tech: ["R Studio", "Excel"], prerequisites: [2] },
    { id: 9, year: 1, semester: 2, name: "Gestión de Empresas", category: "Gestión", tech: ["ERP (Odoo)", "Excel"], prerequisites: [] },
    { id: 10, year: 1, semester: 2, name: "Tecnología de Programación", category: "Programación", tech: ["C++", "Valgrind", "CMake"], prerequisites: [1] },
    { id: 11, year: 2, semester: 1, name: "Estructuras de Datos", category: "Programación", tech: ["Java/C++", "Grafos"], prerequisites: [6, 10] },
    { id: 12, year: 2, semester: 1, name: "Sistemas Operativos I", category: "Sistemas", tech: ["Linux", "Bash", "C"], prerequisites: [7] },
    { id: 13, year: 2, semester: 1, name: "Bases de Datos I", category: "Datos", tech: ["SQL", "MySQL", "E-R"], prerequisites: [1] },
    { id: 14, year: 2, semester: 1, name: "Arquitectura de Computadores", category: "Hardware", tech: ["C (Paralelismo)", "CUDA"], prerequisites: [7] },
    { id: 15, year: 2, semester: 1, name: "Interacción Persona-Computador", category: "Diseño", tech: ["Figma", "HTML/CSS", "JS"], prerequisites: [6] },
    { id: 16, year: 2, semester: 2, name: "Sistemas Operativos II", category: "Sistemas", tech: ["C (Threads)", "Docker"], prerequisites: [12] },
    { id: 17, year: 2, semester: 2, name: "Bases de Datos II", category: "Datos", tech: ["MongoDB", "PL/SQL"], prerequisites: [13] },
    { id: 18, year: 2, semester: 2, name: "Redes de Computadores I", category: "Redes", tech: ["Wireshark", "Packet Tracer"], prerequisites: [12] },
    { id: 19, year: 2, semester: 2, name: "Algoritmia", category: "Programación", tech: ["Python", "Complejidad"], prerequisites: [11, 5] },
    { id: 20, year: 2, semester: 2, name: "Ingeniería del Software I", category: "Gestión", tech: ["UML", "Jira", "Scrum"], prerequisites: [6, 13] },
  ];

  const [subjects, setSubjects] = useState<Subject[]>(defaultSubjects);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string | number>('Todos');
  const [viewMode, setViewMode] = useState('subjects');
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [hoveredSubject, setHoveredSubject] = useState<number | null>(null);

  const [showDataModal, setShowDataModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSubjectId = selectedSubject || hoveredSubject;

  // Helper: Iconos de Categoría
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Matemáticas y análisis':
        return <Variable className="w-4 h-4 text-cyan-600" />;
      case 'Física':
        return <Atom className="w-4 h-4 text-orange-500" />;
      case 'Química':
        return <FlaskConical className="w-4 h-4 text-emerald-500" />;
      case 'Diseño en ingeniería':
        return <PenTool className="w-4 h-4 text-blue-500" />;
      case 'Sistemas eléctricos y electrónicos':
        return <CircuitBoard className="w-4 h-4 text-red-500" />;
      case 'Control y automatización':
        return <SquareActivity className="w-4 h-4 text-indigo-500" />;
      case 'Gestión industrial':
        return <Factory className="w-4 h-4 text-slate-600" />;
      case 'Informática':
        return <SquareTerminal className="w-4 h-4 text-slate-700" />;
      case 'Global':
        return <Globe className="w-4 h-4 text-sky-500" />;
      default:
        return <BookOpen className="w-4 h-4 text-gray-400" />;
    }
  };

  // Filtrado de Asignaturas
  const filteredSubjects = useMemo(() => {
    return subjects.filter(subject => {
      const matchesSearch =
        subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.tech.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
        subject.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesYear = selectedYear === 'Todos' || subject.year === (typeof selectedYear === 'string' ? parseInt(selectedYear) : selectedYear);
      return matchesSearch && matchesYear;
    });
  }, [searchTerm, selectedYear, subjects]);

  // Agrupación por Tecnologías
  const groupedTechs = useMemo(() => {
    const map: Record<string, TechGroup> = {};
    filteredSubjects.forEach(subject => {
      subject.tech.forEach(techName => {
        if (!map[techName]) {
          map[techName] = { name: techName, subjects: [], categories: new Set() };
        }
        map[techName].subjects.push(subject);
        map[techName].categories.add(subject.category);
      });
    });
    return Object.values(map).sort((a, b) => b.subjects.length - a.subjects.length || a.name.localeCompare(b.name));
  }, [filteredSubjects]);

  // Agrupación por Áreas (Categorías)
  const groupedCategories = useMemo(() => {
    const map: Record<string, CategoryGroup> = {};
    filteredSubjects.forEach(subject => {
      const cat = subject.category;
      if (!map[cat]) {
        map[cat] = { name: cat, subjects: [], techs: new Set() };
      }
      map[cat].subjects.push(subject);
      subject.tech.forEach(t => map[cat].techs.add(t));
    });
    return Object.values(map).sort((a, b) => b.subjects.length - a.subjects.length || a.name.localeCompare(b.name));
  }, [filteredSubjects]);

  // Mapa de Dependencias
  const dependencyMap = useMemo(() => {
    const unlocks: Record<number, number[]> = {};
    const requires: Record<number, number[]> = {};

    subjects.forEach(sub => {
      requires[sub.id] = sub.prerequisites || [];
      (sub.prerequisites || []).forEach(reqId => {
        if (!unlocks[reqId]) unlocks[reqId] = [];
        unlocks[reqId].push(sub.id);
      });
    });
    return { unlocks, requires };
  }, [subjects]);

  const getConnectionStatus = (targetId: number) => {
    // *** MODIFICADO: Usar activeSubjectId en lugar de hoveredSubject ***
    if (!activeSubjectId) return 'normal';
    if (targetId === activeSubjectId) return 'active';

    const directPrereq = dependencyMap.requires[activeSubjectId]?.includes(targetId);
    if (directPrereq) return 'prerequisite';

    const directUnlock = dependencyMap.unlocks[activeSubjectId]?.includes(targetId);
    if (directUnlock) return 'unlocked';

    return 'dimmed';
  };

  const handleDownload = () => {
    const dataStr = JSON.stringify(subjects, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'plan_estudios_grado.json');
    linkElement.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!Array.isArray(json) || json.length === 0 || !json[0].name) {
          throw new Error("Formato inválido.");
        }
        setSubjects(json);
        setErrorMsg('');
        setShowDataModal(false);
      } catch (err: any) {
        setErrorMsg("Error: " + err.message);
      }
    };
    reader.readAsText(file);
  };
  const renderConnections = () => {
    // *** MODIFICADO: Usar activeSubjectId para renderizar flechas ***
    if (!activeSubjectId && viewMode === 'dependencies') return null;

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
        <defs>
          <marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
          </marker>
          <marker id="arrowhead-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
          </marker>
        </defs>
        {subjects.map(sub => {
          if (!activeSubjectId) return null;

          return (sub.prerequisites || []).map(preId => {
            const preSub = subjects.find(s => s.id === preId);

            // Si la conexión no involucra a la asignatura activa, no la pintamos
            if (!preSub || (sub.id !== activeSubjectId && preSub.id !== activeSubjectId)) return null;

            const color = (sub.id === activeSubjectId) ? '#ef4444' : '#10b981';
            const marker = (sub.id === activeSubjectId) ? 'url(#arrowhead-red)' : 'url(#arrowhead-green)';

            const getColX = (sem: number, yr: number) => ((yr - 1) * 2 + (sem - 1)) * 400 + 280;
            const getColXStart = (sem: number, yr: number) => ((yr - 1) * 2 + (sem - 1)) * 400;
            const getRowY = (s: Subject) => {
              const peers = subjects.filter(x => x.year === s.year && x.semester === s.semester);
              const index = peers.findIndex(x => x.id === s.id);
              return index * 116 + 92;
            };

            const x1 = getColX(preSub.semester, preSub.year) - 10;
            const y1 = getRowY(preSub);
            const x2 = getColXStart(sub.semester, sub.year) + 10;
            const y2 = getRowY(sub);

            return (
              <path
                key={`${preId}-${sub.id}`}
                d={`M ${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={color}
                strokeWidth="2"
                markerEnd={marker}
                className="opacity-80 transition-all duration-300"
              />
            );
          });
        })}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="w-full mx-auto">

        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <BarChart className="w-8 h-8 text-indigo-600" />
              Visualizador de Asignaturas
            </h1>
            <p className="text-slate-600">
              Gestión académica visual de asignaturas y competencias.
            </p>
          </div>
          <button
            onClick={() => setShowDataModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <FileJson className="w-4 h-4" /> Configuración
          </button>
        </div>

        {/* Modal Datos */}
        {showDataModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" /> Datos del Plan
                </h2>
                <button onClick={() => setShowDataModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <button onClick={handleDownload} className="w-full border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium py-3 px-4 rounded-lg flex justify-center items-center gap-2">
                  <Download className="w-4 h-4" /> Exportar JSON
                </button>
                <div className="border-t pt-4">
                  <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg flex justify-center items-center gap-2">
                    <Upload className="w-4 h-4" /> Importar JSON
                  </button>
                  {errorMsg && <div className="mt-2 text-red-500 text-sm text-center">{errorMsg}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controles Nav */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col gap-4 sticky top-4 z-40">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">

            <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
              {[
                { id: 'subjects', label: 'Asignaturas', icon: List },
                { id: 'dependencies', label: 'Dependencias', icon: GitGraph },
                { id: 'areas', label: 'Áreas', icon: Layout },
                { id: 'techs', label: 'Tecnologías', icon: Grid },
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setViewMode(mode.id);
                    setSelectedYear('Todos');
                    // *** MODIFICADO: Limpiar selección al cambiar vista ***
                    setSelectedSubject(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === mode.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <mode.icon className="w-4 h-4" /> {mode.label}
                </button>
              ))}
            </div>

            {viewMode !== 'dependencies' && (
              <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
                {['Todos', 1, 2, 3, 4].map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${selectedYear === year ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    {year === 'Todos' ? 'Todos' : `${year}º`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {viewMode !== 'dependencies' && (
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre, área o tecnología..."
                className="pl-10 w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* --- VISTA: DEPENDENCIAS --- */}
        {viewMode === 'dependencies' && (
          <div className="bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto relative min-h-[600px] shadow-inner p-4">
            <div className="flex min-w-max pb-8 relative">
              {renderConnections()}
              {[1, 2, 3, 4].map(year => (
                <div key={year} className="flex flex-none">
                  {[1, 2].map(sem => (
                    <div key={`${year}-${sem}`} className="w-[400px] px-4 flex flex-col gap-4 relative z-20">
                      <div className="text-center mb-2 sticky top-0 bg-slate-100 py-2 z-30 font-bold text-slate-400 uppercase tracking-wider text-xs border-b border-slate-200">
                        Año {year} - Sem {sem}
                      </div>
                      {subjects.filter(s => s.year === year && s.semester === sem).map(subject => {
                        const status = getConnectionStatus(subject.id);
                        const isSelected = selectedSubject === subject.id; // Check para estilo extra si es necesario

                        return (
                          <div
                            key={subject.id}
                            // *** MODIFICADO: Evento Click para fijar/desfijar ***
                            onClick={() => {
                              if (selectedSubject === subject.id) {
                                setSelectedSubject(null);
                              } else {
                                setSelectedSubject(subject.id);
                              }
                            }}
                            onMouseEnter={() => setHoveredSubject(subject.id)}
                            onMouseLeave={() => setHoveredSubject(null)}
                            className={`p-3 rounded-lg border text-sm transition-all cursor-pointer h-[100px] flex flex-col justify-between ${status === 'active' ?
                                (isSelected ? 'bg-indigo-100 border-indigo-600 ring-2 ring-indigo-400 shadow-xl scale-105 z-50 text-indigo-900' // Estilo fijado
                                  : 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200 shadow-lg scale-105 z-50 text-indigo-900') // Estilo hover
                                :
                                status === 'prerequisite' ? 'bg-red-50 border-red-400 text-red-800' :
                                  status === 'unlocked' ? 'bg-emerald-50 border-emerald-400 text-emerald-800' :
                                    status === 'dimmed' ? 'bg-slate-50 border-slate-100 text-slate-300 opacity-60' : 'bg-white border-slate-200 hover:border-indigo-300'
                              }`}
                          >
                            <div className="font-bold leading-tight flex justify-between">
                              {subject.name}
                              {/* Indicador visual opcional de "fijado" */}
                              {isSelected && <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></div>}
                            </div>
                            <div className="flex justify-between items-end text-xs">
                              <span className="font-semibold">{subject.category}</span>
                              {status === 'prerequisite' && <span className="font-bold text-red-500">Requisito</span>}
                              {status === 'unlocked' && <span className="font-bold text-emerald-600">Desbloquea</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- VISTA: ÁREAS --- */}
        {viewMode === 'areas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedCategories.map((group) => (
              <div key={group.name} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5 border-b border-slate-50">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 rounded-lg">
                        {getCategoryIcon(group.name)}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">{group.name}</h3>
                    </div>
                    <span className="bg-indigo-600 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
                      {group.subjects.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {Array.from(group.techs).slice(0, 6).map(t => (
                      <span key={t} className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        {t}
                      </span>
                    ))}
                    {group.techs.size > 6 && <span className="text-[10px] font-bold text-slate-300">+{group.techs.size - 6}</span>}
                  </div>
                </div>
                <div className="p-4 bg-slate-50/50">
                  <ul className="space-y-2">
                    {group.subjects.map(s => (
                      <li key={s.id} className="text-sm text-slate-600 flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                        <span className="font-medium truncate mr-2">{s.name}</span>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold whitespace-nowrap">{s.year}º AÑO</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- VISTA: TECNOLOGÍAS --- */}
        {viewMode === 'techs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedTechs.map((tech) => (
              <div key={tech.name} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-indigo-700">{tech.name}</h3>
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs font-bold border border-slate-200">
                    {tech.subjects.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {Array.from(tech.categories).map(cat => (
                    <span key={cat} className="text-xs text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      {cat}
                    </span>
                  ))}
                </div>
                <ul className="space-y-1">
                  {tech.subjects.map(s => (
                    <li key={s.id} className="text-sm text-slate-700 flex justify-between items-center">
                      <span className="truncate mr-2">{s.name}</span>
                      <span className="text-xs text-slate-400">{s.year}º</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* --- VISTA: TABLA --- */}
        {viewMode === 'subjects' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="p-4 font-semibold w-24 text-center">Curso</th>
                    <th className="p-4 font-semibold">Asignatura</th>
                    <th className="p-4 font-semibold">Área</th>
                    <th className="p-4 font-semibold">Tecnologías</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubjects.length > 0 ? (
                    filteredSubjects.map((subject) => (
                      <tr key={subject.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-center">
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs border border-slate-200 font-medium">{subject.year}º</span>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-800">{subject.name}</div>
                          <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">Semestre {subject.semester}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            {getCategoryIcon(subject.category)} {subject.category}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            {subject.tech.map((t, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">No se encontraron resultados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200 text-center text-slate-500 text-sm">
          <p>2026 Universidad Loyola</p>
          <p className="mt-1 font-medium text-slate-600">
            Desarrollado por: <span className="text-indigo-600 font-bold">Federico Peralta</span> |
            <a href="mailto:fdperalta@uloyola.es" className="ml-1 hover:text-indigo-800 underline transition-colors">fdperalta@uloyola.es</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;