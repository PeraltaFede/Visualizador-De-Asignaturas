import React, { useState, useMemo, useRef } from 'react';
import {
  Search, BookOpen, Database, Globe,
  BarChart, List, Grid, GitGraph,
  Upload, Download, FileJson, X, Layout,
  Variable, Atom, FlaskConical, PenTool, CircuitBoard,
  SquareActivity, Factory, SquareTerminal,
  Pencil, PencilOff, Trash2, Plus
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

// --- MODO EDICIÓN: estilos y componentes auxiliares ---
const editFieldClass = 'border border-amber-300 bg-amber-50/60 rounded px-2 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400';

const EDIT_HINTS: Record<string, string> = {
  subjects: 'Modifica directamente los campos de cada asignatura, elimínalas o añade nuevas al final de la tabla.',
  dependencies: 'Selecciona una asignatura y pulsa otra de un semestre anterior (requisito) o posterior (desbloquea) para añadir o quitar la dependencia. Vuelve a pulsar la seleccionada para soltarla.',
  areas: 'Renombra áreas, mueve asignaturas entre áreas o crea un área nueva.',
  techs: 'Renombra o elimina tecnologías, quítalas de una asignatura o asígnalas a otras.',
};

// Posición temporal de una asignatura (0 = Año 1 Sem 1, 1 = Año 1 Sem 2, ...)
const getPeriodIndex = (subject: Subject) => (subject.year - 1) * 2 + (subject.semester - 1);

// Campo de texto que guarda al pulsar Enter o al salir del campo (Escape descarta)
const EditableText = ({ value, onCommit, className = '', placeholder, list }: {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  placeholder?: string;
  list?: string;
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  const discardRef = useRef(false);

  const commit = () => {
    const next = draft?.trim();
    if (!discardRef.current && next && next !== value) onCommit(next);
    discardRef.current = false;
    setDraft(null);
  };

  return (
    <input
      type="text"
      value={draft ?? value}
      placeholder={placeholder}
      list={list}
      onFocus={() => setDraft(value)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          discardRef.current = true;
          e.currentTarget.blur();
        }
      }}
      className={`${editFieldClass} ${className}`}
    />
  );
};

// Campo para añadir un elemento nuevo (Enter o botón "+")
const AddTextInput = ({ onAdd, placeholder, list, className = '' }: {
  onAdd: (value: string) => void;
  placeholder: string;
  list?: string;
  className?: string;
}) => {
  const [text, setText] = useState('');

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onAdd(value);
    setText('');
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <input
        type="text"
        value={text}
        placeholder={placeholder}
        list={list}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') setText('');
        }}
        className={`${editFieldClass} flex-1 min-w-0`}
      />
      <button
        type="button"
        onClick={submit}
        disabled={!text.trim()}
        title="Añadir"
        className="p-1.5 rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// Desplegable que ejecuta una acción al elegir una asignatura y vuelve a su estado inicial
const SubjectPicker = ({ subjects, placeholder, onPick }: {
  subjects: Subject[];
  placeholder: string;
  onPick: (id: number) => void;
}) => (
  <select
    value=""
    onChange={(e) => { if (e.target.value) onPick(Number(e.target.value)); }}
    disabled={subjects.length === 0}
    className={`${editFieldClass} w-full text-sm disabled:opacity-50`}
  >
    <option value="">{placeholder}</option>
    {subjects.map(s => (
      <option key={s.id} value={s.id}>{s.year}º · {s.name}</option>
    ))}
  </select>
);

// Tarjeta para crear un grupo nuevo (área o tecnología) a partir de una asignatura
const NewGroupCard = ({ title, namePlaceholder, hint, subjects, onCreate }: {
  title: string;
  namePlaceholder: string;
  hint: string;
  subjects: Subject[];
  onCreate: (name: string, subjectId: number) => void;
}) => {
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const canCreate = name.trim() !== '' && subjectId !== '';

  return (
    <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/40 p-5 flex flex-col gap-3">
      <h3 className="text-lg font-bold text-amber-700 flex items-center gap-2">
        <Plus className="w-5 h-5" /> {title}
      </h3>
      <input
        type="text"
        value={name}
        placeholder={namePlaceholder}
        onChange={(e) => setName(e.target.value)}
        className={editFieldClass}
      />
      <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={`${editFieldClass} text-sm`}>
        <option value="">Asignatura…</option>
        {subjects.map(s => (
          <option key={s.id} value={s.id}>{s.year}º · {s.name}</option>
        ))}
      </select>
      <button
        type="button"
        disabled={!canCreate}
        onClick={() => {
          onCreate(name.trim(), Number(subjectId));
          setName('');
          setSubjectId('');
        }}
        className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Crear
      </button>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  );
};

const App = () => {
  // DATOS POR DEFECTO
  const defaultSubjects: Subject[] = [{ "id": 1, "year": 1, "semester": 1, "name": "Expresión Gráfica y CAD", "category": "Diseño en ingeniería", "tech": ["Solidworks"], "prerequisites": [] }, { "id": 2, "year": 1, "semester": 1, "name": "Física I", "category": "Física", "tech": [], "prerequisites": [] }, { "id": 3, "year": 1, "semester": 1, "name": "Introducción a la Economía y la Empresa", "category": "Gestión industrial", "tech": [], "prerequisites": [] }, { "id": 4, "year": 1, "semester": 1, "name": "Matemáticas I", "category": "Matemáticas y análisis", "tech": [], "prerequisites": [] }, { "id": 5, "year": 1, "semester": 1, "name": "Química General", "category": "Química", "tech": [], "prerequisites": [] }, { "id": 6, "year": 1, "semester": 2, "name": "Estadística y Modelado de Datos", "category": "Matemáticas y análisis", "tech": [], "prerequisites": [4] }, { "id": 7, "year": 1, "semester": 2, "name": "Física II", "category": "Física", "tech": [], "prerequisites": [2] }, { "id": 8, "year": 1, "semester": 2, "name": "Informática", "category": "Informática", "tech": ["Matlab"], "prerequisites": [] }, { "id": 9, "year": 1, "semester": 2, "name": "Matemáticas II", "category": "Matemáticas y análisis", "tech": [], "prerequisites": [4] }, { "id": 10, "year": 1, "semester": 2, "name": "Tecnología del Medio Ambiente", "category": "Química", "tech": [], "prerequisites": [5] }, { "id": 11, "year": 2, "semester": 1, "name": "Ciencia de Materiales", "category": "Química", "tech": [], "prerequisites": [5] }, { "id": 12, "year": 2, "semester": 1, "name": "Ecuaciones Diferenciales", "category": "Matemáticas y análisis", "tech": [], "prerequisites": [9] }, { "id": 13, "year": 2, "semester": 1, "name": "Electrical Engineering", "category": "Sistemas eléctricos y electrónicos", "tech": [], "prerequisites": [7] }, { "id": 14, "year": 2, "semester": 1, "name": "Mecanismos y Elementos de Máquinas", "category": "Diseño en ingeniería", "tech": ["Simulink"], "prerequisites": [1] }, { "id": 15, "year": 2, "semester": 1, "name": "Termodinámica y Transferencia de Calor", "category": "Química", "tech": [], "prerequisites": [7] }, { "id": 16, "year": 2, "semester": 2, "name": "Automatic Control", "category": "Control y automatización", "tech": ["Simulink", "Matlab"], "prerequisites": [12] }, { "id": 17, "year": 2, "semester": 2, "name": "Mecánica y Máquinas de Fluidos", "category": "Física", "tech": [], "prerequisites": [7, 15] }, { "id": 18, "year": 2, "semester": 2, "name": "Modelado y Simulación de Sistemas", "category": "Control y automatización", "tech": ["Simulink"], "prerequisites": [12] }, { "id": 19, "year": 2, "semester": 2, "name": "Resistencia de Materiales", "category": "Diseño en ingeniería", "tech": [], "prerequisites": [2, 11] }, { "id": 20, "year": 2, "semester": 2, "name": "Tecnología Electrónica", "category": "Sistemas eléctricos y electrónicos", "tech": ["Falstad"], "prerequisites": [13] }, { "id": 21, "year": 3, "semester": 1, "name": "Automatización Industrial e Instrumentación", "category": "Control y automatización", "tech": ["CodeSys", "Factory IO"], "prerequisites": [16] }, { "id": 22, "year": 3, "semester": 1, "name": "Electrónica Digital y Microcontroladores", "category": "Sistemas eléctricos y electrónicos", "tech": ["Arduino IDE", "C/C++", "Solidworks", "Fritzing"], "prerequisites": [20, 8] }, { "id": 23, "year": 3, "semester": 1, "name": "Humanismo y Ética Básica", "category": "Gestión industrial", "tech": [], "prerequisites": [] }, { "id": 24, "year": 3, "semester": 1, "name": "Robotics", "category": "Control y automatización", "tech": ["RobotStudio", "Simulink", "ROS2"], "prerequisites": [16, 14] }, { "id": 25, "year": 3, "semester": 1, "name": "Tecnologías de Fabricación", "category": "Diseño en ingeniería", "tech": [], "prerequisites": [11] }, { "id": 26, "year": 3, "semester": 2, "name": "Control de Máquinas y Accionamientos Eléctricos", "category": "Sistemas eléctricos y electrónicos", "tech": ["CadeSimu", "Matlab", "Simulink"], "prerequisites": [13, 20] }, { "id": 27, "year": 3, "semester": 2, "name": "Electrónica de Potencia", "category": "Sistemas eléctricos y electrónicos", "tech": ["Simscape", "Falstad"], "prerequisites": [13, 20] }, { "id": 28, "year": 3, "semester": 2, "name": "Informática Industrial y Comunicaciones", "category": "Informática", "tech": ["Python", "Schneider", "AVEVA"], "prerequisites": [8, 22] }, { "id": 29, "year": 3, "semester": 2, "name": "Ingeniería de Control", "category": "Control y automatización", "tech": ["Matlab", "Simulink", "ROS2", "SSH"], "prerequisites": [16, 12] }, { "id": 30, "year": 3, "semester": 2, "name": "Sistemas Inteligentes", "category": "Informática", "tech": ["Python"], "prerequisites": [8, 24] }, { "id": 31, "year": 4, "semester": 1, "name": "Cálculo y Diseño de Máquinas", "category": "Diseño en ingeniería", "tech": ["Solidworks"], "prerequisites": [14, 19] }, { "id": 32, "year": 4, "semester": 1, "name": "Optativas", "category": "Global", "tech": [], "prerequisites": [] }, { "id": 33, "year": 4, "semester": 1, "name": "Real Time and Embedded Systems", "category": "Informática", "tech": ["C/C++", "SSH", "QNX"], "prerequisites": [28, 22] }, { "id": 34, "year": 4, "semester": 1, "name": "Robot Programming and Control", "category": "Control y automatización", "tech": ["Matlab", "Simulink", "RobotStudio"], "prerequisites": [24, 29] }, { "id": 35, "year": 4, "semester": 1, "name": "Visión y Percepción Automáticas", "category": "Informática", "tech": ["Python"], "prerequisites": [30, 8] }, { "id": 36, "year": 4, "semester": 2, "name": "Proyectos de Mecatrónica y Robótica", "category": "Global", "tech": [], "prerequisites": [34, 33] }, { "id": 37, "year": 4, "semester": 2, "name": "Prácticas", "category": "Global", "tech": [], "prerequisites": [] }, { "id": 38, "year": 4, "semester": 2, "name": "Trabajo Fin de Grado", "category": "Global", "tech": [], "prerequisites": [] }];

  const [subjects, setSubjects] = useState<Subject[]>(defaultSubjects);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string | number>('Todos');
  const [viewMode, setViewMode] = useState('subjects');
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [hoveredSubject, setHoveredSubject] = useState<number | null>(null);

  const [showDataModal, setShowDataModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editMode, setEditMode] = useState(false);

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

  // --- MODO EDICIÓN: opciones y modificaciones de datos ---
  const allCategories = useMemo(
    () => Array.from(new Set(subjects.map(s => s.category))).sort((a, b) => a.localeCompare(b)),
    [subjects]
  );
  const allTechs = useMemo(
    () => Array.from(new Set(subjects.flatMap(s => s.tech))).sort((a, b) => a.localeCompare(b)),
    [subjects]
  );

  const updateSubject = (id: number, changes: Partial<Subject>) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s));
  };

  const addSubject = (data: Partial<Subject> & { name: string }) => {
    setSubjects(prev => {
      const nextId = prev.reduce((max, s) => Math.max(max, s.id), 0) + 1;
      return [...prev, { id: nextId, year: 1, semester: 1, category: 'Sin área', tech: [], prerequisites: [], ...data }];
    });
  };

  const deleteSubject = (subject: Subject) => {
    if (!window.confirm(`¿Eliminar la asignatura "${subject.name}"?`)) return;
    setSubjects(prev => prev
      .filter(s => s.id !== subject.id)
      .map(s => ({ ...s, prerequisites: (s.prerequisites || []).filter(p => p !== subject.id) })));
    if (selectedSubject === subject.id) setSelectedSubject(null);
    setHoveredSubject(null);
  };

  const togglePrerequisite = (subjectId: number, prerequisiteId: number) => {
    setSubjects(prev => prev.map(s => {
      if (s.id !== subjectId) return s;
      const prereqs = s.prerequisites || [];
      return {
        ...s,
        prerequisites: prereqs.includes(prerequisiteId)
          ? prereqs.filter(p => p !== prerequisiteId)
          : [...prereqs, prerequisiteId]
      };
    }));
  };

  const renameCategory = (oldName: string, newName: string) => {
    setSubjects(prev => prev.map(s => s.category === oldName ? { ...s, category: newName } : s));
  };

  const addTech = (subjectId: number, techName: string) => {
    setSubjects(prev => prev.map(s =>
      s.id === subjectId && !s.tech.includes(techName) ? { ...s, tech: [...s.tech, techName] } : s
    ));
  };

  const removeTech = (subjectId: number, techName: string) => {
    setSubjects(prev => prev.map(s =>
      s.id === subjectId ? { ...s, tech: s.tech.filter(t => t !== techName) } : s
    ));
  };

  const renameTech = (oldName: string, newName: string) => {
    setSubjects(prev => prev.map(s =>
      s.tech.includes(oldName)
        ? { ...s, tech: Array.from(new Set(s.tech.map(t => t === oldName ? newName : t))) }
        : s
    ));
  };

  const deleteTech = (techName: string) => {
    if (!window.confirm(`¿Eliminar la tecnología "${techName}" de todas las asignaturas?`)) return;
    setSubjects(prev => prev.map(s => ({ ...s, tech: s.tech.filter(t => t !== techName) })));
  };

  // Asignatura fijada que sirve de referencia para editar dependencias
  const editAnchor = editMode ? subjects.find(s => s.id === selectedSubject) : undefined;

  const handleDependencyClick = (subject: Subject) => {
    if (!editAnchor || editAnchor.id === subject.id) {
      setSelectedSubject(selectedSubject === subject.id ? null : subject.id);
      return;
    }
    if ((editAnchor.prerequisites || []).includes(subject.id)) {
      togglePrerequisite(editAnchor.id, subject.id);
    } else if ((subject.prerequisites || []).includes(editAnchor.id)) {
      togglePrerequisite(subject.id, editAnchor.id);
    } else if (getPeriodIndex(subject) < getPeriodIndex(editAnchor)) {
      togglePrerequisite(editAnchor.id, subject.id);
    } else if (getPeriodIndex(subject) > getPeriodIndex(editAnchor)) {
      togglePrerequisite(subject.id, editAnchor.id);
    } else {
      // Mismo semestre: no puede haber dependencia, se cambia la selección
      setSelectedSubject(subject.id);
    }
  };

  const getDependencyEditHint = (subject: Subject, status: string) => {
    if (!editAnchor || hoveredSubject !== subject.id || subject.id === editAnchor.id) return null;
    if (status === 'prerequisite' || status === 'unlocked') return 'Quitar';
    if (getPeriodIndex(subject) < getPeriodIndex(editAnchor)) return '+ Requisito';
    if (getPeriodIndex(subject) > getPeriodIndex(editAnchor)) return '+ Desbloquea';
    return 'Seleccionar';
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              aria-pressed={editMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow transition-colors text-sm font-medium border ${editMode
                ? 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
            >
              {editMode ? <Pencil className="w-4 h-4" /> : <PencilOff className="w-4 h-4" />}
              {editMode ? 'Edición Activada' : 'Edición Desactivada'}
            </button>
            <button
              onClick={() => setShowDataModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <FileJson className="w-4 h-4" /> Configuración
            </button>
          </div>
        </div>

        {/* Sugerencias para los campos de edición */}
        {editMode && (
          <>
            <datalist id="category-options">
              {allCategories.map(c => <option key={c} value={c} />)}
            </datalist>
            <datalist id="tech-options">
              {allTechs.map(t => <option key={t} value={t} />)}
            </datalist>
          </>
        )}

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

          {editMode && (
            <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Pencil className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                <span className="font-semibold">Modo edición.</span> {EDIT_HINTS[viewMode]} Los cambios no se guardan automáticamente: expórtalos en JSON desde Configuración.
              </span>
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
                        const editHint = getDependencyEditHint(subject, status);

                        return (
                          <div
                            key={subject.id}
                            // *** MODIFICADO: Evento Click para fijar/desfijar (y editar dependencias en modo edición) ***
                            onClick={() => handleDependencyClick(subject)}
                            onMouseEnter={() => setHoveredSubject(subject.id)}
                            onMouseLeave={() => setHoveredSubject(null)}
                            className={`p-3 rounded-lg border text-sm transition-all cursor-pointer h-[100px] flex flex-col justify-between ${status === 'active' ?
                              (isSelected ? 'bg-indigo-100 border-indigo-600 ring-2 ring-indigo-400 shadow-xl scale-105 z-50 text-indigo-900' // Estilo fijado
                                : 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200 shadow-lg scale-105 z-50 text-indigo-900') // Estilo hover
                              :
                              status === 'prerequisite' ? 'bg-red-50 border-red-400 text-red-800' :
                                status === 'unlocked' ? 'bg-emerald-50 border-emerald-400 text-emerald-800' :
                                  status === 'dimmed' ? 'bg-slate-50 border-slate-100 text-slate-300 opacity-60' : 'bg-white border-slate-200 hover:border-indigo-300'
                              } ${editHint ? 'opacity-100! border-amber-400! border-dashed' : ''}`}
                          >
                            <div className="font-bold leading-tight flex justify-between gap-2">
                              {subject.name}
                              <div className="flex items-start gap-1.5 shrink-0">
                                {/* Indicador visual opcional de "fijado" */}
                                {isSelected && <div className="h-2 w-2 mt-1 rounded-full bg-indigo-600 animate-pulse"></div>}
                                {editMode && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteSubject(subject); }}
                                    title="Eliminar asignatura"
                                    className="p-0.5 rounded bg-transparent text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between items-end text-xs">
                              <span className="font-semibold">{subject.category}</span>
                              {editHint ? <span className="font-bold text-amber-600">{editHint}</span> : <>
                                {status === 'prerequisite' && <span className="font-bold text-red-500">Requisito</span>}
                                {status === 'unlocked' && <span className="font-bold text-emerald-600">Desbloquea</span>}
                              </>}
                            </div>
                          </div>
                        );
                      })}
                      {editMode && (
                        <AddTextInput
                          placeholder="Nueva asignatura…"
                          onAdd={(name) => addSubject({ name, year, semester: sem })}
                          className="text-sm"
                        />
                      )}
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
                    <div className={`flex items-center gap-3 min-w-0 ${editMode ? 'flex-1 mr-2' : ''}`}>
                      <div className="p-2 bg-slate-50 rounded-lg">
                        {getCategoryIcon(group.name)}
                      </div>
                      {editMode ? (
                        <EditableText
                          value={group.name}
                          onCommit={(name) => renameCategory(group.name, name)}
                          className="text-lg font-bold flex-1 min-w-0"
                        />
                      ) : (
                        <h3 className="text-lg font-bold text-slate-800">{group.name}</h3>
                      )}
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
                        <div className="flex items-center gap-1.5 shrink-0">
                          {editMode && (
                            <select
                              value={s.category}
                              onChange={(e) => updateSubject(s.id, { category: e.target.value })}
                              title="Mover a otra área"
                              className={`${editFieldClass} text-[11px] py-0.5 px-1 max-w-[130px]`}
                            >
                              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          )}
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold whitespace-nowrap">{s.year}º AÑO</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {editMode && (
                    <div className="mt-3">
                      <SubjectPicker
                        subjects={subjects.filter(s => s.category !== group.name)}
                        placeholder="+ Mover asignatura a esta área…"
                        onPick={(id) => updateSubject(id, { category: group.name })}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {editMode && (
              <NewGroupCard
                title="Nueva área"
                namePlaceholder="Nombre del área"
                hint="La asignatura elegida se moverá a la nueva área (un área existe mientras tenga asignaturas)."
                subjects={subjects}
                onCreate={(name, id) => updateSubject(id, { category: name })}
              />
            )}
          </div>
        )}

        {/* --- VISTA: TECNOLOGÍAS --- */}
        {viewMode === 'techs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedTechs.map((tech) => (
              <div key={tech.name} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3 gap-2">
                  {editMode ? (
                    <EditableText
                      value={tech.name}
                      onCommit={(name) => renameTech(tech.name, name)}
                      className="text-lg font-bold text-indigo-700! flex-1 min-w-0"
                    />
                  ) : (
                    <h3 className="text-lg font-bold text-indigo-700">{tech.name}</h3>
                  )}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs font-bold border border-slate-200">
                      {tech.subjects.length}
                    </span>
                    {editMode && (
                      <button
                        onClick={() => deleteTech(tech.name)}
                        title="Eliminar tecnología de todas las asignaturas"
                        className="p-1.5 rounded bg-transparent text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-slate-400">{s.year}º</span>
                        {editMode && (
                          <button
                            onClick={() => removeTech(s.id, tech.name)}
                            title={`Quitar ${tech.name} de esta asignatura`}
                            className="p-0.5 rounded bg-transparent text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {editMode && (
                  <div className="mt-3">
                    <SubjectPicker
                      subjects={subjects.filter(s => !s.tech.includes(tech.name))}
                      placeholder="+ Añadir a asignatura…"
                      onPick={(id) => addTech(id, tech.name)}
                    />
                  </div>
                )}
              </div>
            ))}
            {editMode && (
              <NewGroupCard
                title="Nueva tecnología"
                namePlaceholder="Nombre de la tecnología"
                hint="La tecnología se añadirá a la asignatura elegida."
                subjects={subjects}
                onCreate={(name, id) => addTech(id, name)}
              />
            )}
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
                    {editMode && <th className="p-4 font-semibold w-16 text-center">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubjects.length > 0 ? (
                    filteredSubjects.map((subject) => (
                      <tr key={subject.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-center">
                          {editMode ? (
                            <select
                              value={subject.year}
                              onChange={(e) => updateSubject(subject.id, { year: Number(e.target.value) })}
                              title="Curso"
                              className={`${editFieldClass} text-xs`}
                            >
                              {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y}º</option>)}
                            </select>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs border border-slate-200 font-medium">{subject.year}º</span>
                          )}
                        </td>
                        <td className="p-4">
                          {editMode ? (
                            <div className="flex flex-col gap-1.5">
                              <EditableText
                                value={subject.name}
                                onCommit={(name) => updateSubject(subject.id, { name })}
                                className="font-medium w-full min-w-[200px]"
                              />
                              <select
                                value={subject.semester}
                                onChange={(e) => updateSubject(subject.id, { semester: Number(e.target.value) })}
                                title="Semestre"
                                className={`${editFieldClass} text-[10px] uppercase tracking-wider font-bold text-slate-500! self-start`}
                              >
                                {[1, 2].map(sem => <option key={sem} value={sem}>Semestre {sem}</option>)}
                              </select>
                            </div>
                          ) : (
                            <>
                              <div className="font-medium text-slate-800">{subject.name}</div>
                              <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">Semestre {subject.semester}</div>
                            </>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            {getCategoryIcon(subject.category)}
                            {editMode ? (
                              <EditableText
                                value={subject.category}
                                onCommit={(category) => updateSubject(subject.id, { category })}
                                list="category-options"
                                className="flex-1 min-w-[160px]"
                              />
                            ) : subject.category}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {subject.tech.map((t, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {t}
                                {editMode && (
                                  <button
                                    onClick={() => removeTech(subject.id, t)}
                                    title={`Quitar ${t}`}
                                    className="p-0 rounded bg-transparent text-indigo-400 hover:text-red-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </span>
                            ))}
                            {editMode && (
                              <AddTextInput
                                placeholder="Tecnología…"
                                list="tech-options"
                                onAdd={(t) => addTech(subject.id, t)}
                                className="w-36 text-xs"
                              />
                            )}
                          </div>
                        </td>
                        {editMode && (
                          <td className="p-4 text-center">
                            <button
                              onClick={() => deleteSubject(subject)}
                              title="Eliminar asignatura"
                              className="p-2 rounded-lg bg-transparent text-slate-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={editMode ? 5 : 4} className="p-8 text-center text-slate-500">No se encontraron resultados.</td></tr>
                  )}
                </tbody>
                {editMode && (
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-amber-50/40">
                      <td colSpan={5} className="p-4">
                        <AddTextInput
                          placeholder="Nombre de la nueva asignatura (Enter para añadir)…"
                          onAdd={(name) => {
                            addSubject({ name, year: typeof selectedYear === 'number' ? selectedYear : 1 });
                            setSearchTerm('');
                          }}
                          className="max-w-xl"
                        />
                      </td>
                    </tr>
                  </tfoot>
                )}
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