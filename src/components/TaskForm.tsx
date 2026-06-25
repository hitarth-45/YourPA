import React, { useState, useEffect } from 'react';
import { Priority, Task } from '../types';
import { Mic, MicOff, Sparkles, Loader2, Calendar, AlertCircle, Clock } from 'lucide-react';

interface TaskFormProps {
  onAddTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'completed'> & { runAIAnalysis: boolean }) => void;
  isAnalyzing: boolean;
}

export default function TaskForm({ onAddTask, isAnalyzing }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [deadline, setDeadline] = useState('');
  
  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [voiceStatus, setVoiceStatus] = useState('');

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setVoiceStatus('Listening... Speak your task, e.g. "Draft biology report by tomorrow at 6 PM"');
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setVoiceStatus(`Voice Error: ${event.error}`);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceStatus(`Processing speech: "${transcript}"`);
        await handleVoiceExtraction(transcript);
      };

      setRecognition(rec);
    } else {
      setVoiceStatus('Speech recognition not supported in this browser.');
    }
  }, []);

  const handleVoiceExtraction = async (text: string) => {
    try {
      const res = await fetch('/api/voice-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speechText: text })
      });
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title || '');
        setDescription(data.description || '');
        setPriority(data.priority || Priority.MEDIUM);
        
        // Formulate a smart deadline from raw text
        if (data.rawDeadline) {
          const parsedDate = parseDeadlineText(data.rawDeadline);
          setDeadline(parsedDate);
        }
        setVoiceStatus('AI successfully extracted task details from voice!');
      } else {
        setVoiceStatus('Failed to process voice text. Setting title directly.');
        setTitle(text);
      }
    } catch (e) {
      console.error(e);
      setVoiceStatus('Network error processing voice. Setting title directly.');
      setTitle(text);
    }
  };

  const parseDeadlineText = (text: string): string => {
    // Basic heuristics to generate a date input value (YYYY-MM-DDThh:mm)
    const now = new Date();
    const clean = text.toLowerCase();
    
    if (clean.includes('today')) {
      now.setHours(21, 0, 0, 0); // 9 PM tonight
    } else if (clean.includes('tomorrow')) {
      now.setDate(now.getDate() + 1);
      now.setHours(17, 0, 0, 0); // 5 PM tomorrow
    } else if (clean.includes('next week') || clean.includes('week')) {
      now.setDate(now.getDate() + 7);
      now.setHours(12, 0, 0, 0);
    } else if (clean.includes('next monday')) {
      const day = now.getDay();
      const distance = (1 + 7 - day) % 7 || 7;
      now.setDate(now.getDate() + distance);
      now.setHours(9, 0, 0, 0);
    } else {
      // Default to 1 day from now
      now.setDate(now.getDate() + 1);
      now.setHours(23, 59, 0, 0);
    }

    // Format to YYYY-MM-DDTHH:mm
    const tzoffset = now.getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(now.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  const toggleListening = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
    } else {
      setVoiceStatus('Starting microphone...');
      try {
        recognition.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent, runAIAnalysis: boolean) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Default deadline to 24h if empty
    let finalDeadline = deadline;
    if (!finalDeadline) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(17, 0, 0, 0);
      const tzoffset = tomorrow.getTimezoneOffset() * 60000;
      finalDeadline = (new Date(tomorrow.getTime() - tzoffset)).toISOString().slice(0, 16);
    }

    onAddTask({
      title: title.trim(),
      description: description.trim(),
      userPriority: priority,
      priority, // Initial priority
      deadline: finalDeadline,
      runAIAnalysis
    });

    // Reset Form
    setTitle('');
    setDescription('');
    setPriority(Priority.MEDIUM);
    setDeadline('');
    setVoiceStatus('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 amber-glow" id="task-form-panel">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          <span>New Mission Briefing</span>
        </h2>
        {recognition && (
          <button
            type="button"
            onClick={toggleListening}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
              isListening
                ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600'
            }`}
            title="Dictate task"
            id="mic-dictation-btn"
          >
            {isListening ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-amber-500" />
                <span>Dictate Task</span>
              </>
            )}
          </button>
        )}
      </div>

      {voiceStatus && (
        <div className="mb-4 text-xs font-mono text-amber-400 bg-amber-950/20 border border-amber-900/30 p-2.5 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
          <span>{voiceStatus}</span>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
            Task Name *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Pay internet bill, complete coding assignment, prepare slides"
            className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-600 font-sans"
            id="task-title-input"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
            Task Context / Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional context like 'Takes 3 hours of writing, needs PDF resources' or 'Login portal password is in manager'"
            className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-600 min-h-[70px] resize-y font-sans"
            id="task-description-input"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 font-mono flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Deadline</span>
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-amber-500 transition-all font-mono"
              id="task-deadline-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Self-Assigned Priority</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(Object.keys(Priority) as Array<keyof typeof Priority>).map((pKey) => {
                const value = Priority[pKey];
                const active = priority === value;
                let colorClass = '';
                
                if (value === Priority.CRITICAL) {
                  colorClass = active ? 'bg-red-500/20 text-red-400 border-red-500/60' : 'hover:bg-slate-800 hover:text-red-400 border-slate-800';
                } else if (value === Priority.HIGH) {
                  colorClass = active ? 'bg-amber-500/20 text-amber-400 border-amber-500/60' : 'hover:bg-slate-800 hover:text-amber-400 border-slate-800';
                } else if (value === Priority.MEDIUM) {
                  colorClass = active ? 'bg-blue-500/20 text-blue-400 border-blue-500/60' : 'hover:bg-slate-800 hover:text-blue-400 border-slate-800';
                } else {
                  colorClass = active ? 'bg-slate-800 text-slate-300 border-slate-700' : 'hover:bg-slate-800 hover:text-slate-300 border-slate-800';
                }

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPriority(value)}
                    className={`border text-[11px] font-semibold py-2 rounded-lg text-center font-mono transition-all capitalize ${colorClass}`}
                    id={`priority-btn-${value.toLowerCase()}`}
                  >
                    {value.toLowerCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            disabled={isAnalyzing}
            className="flex-1 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-semibold py-2.5 px-4 rounded-lg text-sm font-sans flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            id="add-with-ai-btn"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>AI Diagnosing & Planning...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>Save with AI Diagnostics & Subtasks</span>
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            disabled={isAnalyzing}
            className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium py-2.5 px-4 rounded-lg text-sm font-sans transition-all border border-slate-700 hover:border-slate-600 disabled:opacity-50"
            id="add-basic-btn"
          >
            Save Basic Task Only
          </button>
        </div>
      </form>
    </div>
  );
}
