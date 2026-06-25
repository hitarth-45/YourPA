import React, { useState, useEffect, useRef } from 'react';
import { Priority, Task, Habit, HistoryLog, AIAnalysisResponse } from './types';
import TaskForm from './components/TaskForm';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Hourglass, 
  Play, 
  Pause,
  Trash2, 
  Sparkles, 
  Brain, 
  ListTodo, 
  Flame, 
  Volume2, 
  TrendingUp, 
  HelpCircle, 
  TrendingDown, 
  X,
  Plus,
  Compass,
  Zap,
  Check,
  VolumeX,
  Sliders,
  CalendarRange,
  Bell,
  BookOpen
} from 'lucide-react';

export default function App() {
  // Helper to generate dynamic deadlines relative to the loaded time
  const getRelativeDate = (hoursAhead: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hoursAhead);
    const tzoffset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
  };

  // State
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('ovrdue_tasks');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      {
        id: 't1',
        title: 'Draft annual performance review & projections',
        description: 'Need to review last quarter metrics and compile visual slides for the board meeting. Requires extreme concentration and accurate spreadsheets.',
        priority: Priority.CRITICAL,
        userPriority: Priority.HIGH,
        deadline: getRelativeDate(4.5), // 4.5 hours from now
        createdAt: new Date().toISOString(),
        completed: false,
        aiBenchmarkMinutes: 5,
        humanEstimatedMinutes: 180,
        proactiveBufferMinutes: 45,
        category: 'assignment',
        schedulingAdvice: 'You typically take 3h to draft metrics. The remaining time window is very tight! If you do not begin within the next hour, your buffer will fall to zero and cause low-quality hurried outputs.',
        subtasks: [
          { id: 's1', title: 'Review last quarter metrics spreadsheet', estimatedMinutes: 45, completed: false },
          { id: 's2', title: 'Compile AI suggestions & outline', estimatedMinutes: 60, completed: false },
          { id: 's3', title: 'Design visual slides & run spellcheck', estimatedMinutes: 75, completed: false }
        ]
      },
      {
        id: 't2',
        title: 'Renew building electric utility bill',
        description: 'Login to electricity dashboard. Avoid late fee surcharge of $15.',
        priority: Priority.HIGH,
        userPriority: Priority.MEDIUM,
        deadline: getRelativeDate(2.1), // 2.1 hours from now
        createdAt: new Date().toISOString(),
        completed: false,
        aiBenchmarkMinutes: 2,
        humanEstimatedMinutes: 10,
        proactiveBufferMinutes: 5,
        category: 'bill',
        schedulingAdvice: 'This can be solved instantly. Knocking this out during your next 2-minute water break prevents high mental overhead.',
        subtasks: [
          { id: 's4', title: 'Login to portal & process payment', estimatedMinutes: 10, completed: false }
        ]
      }
    ];
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('ovrdue_habits');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      { id: 'h1', title: 'Deep Work blocks', frequency: 'daily', streak: 14, category: 'study' },
      { id: 'h2', title: 'Review upcoming deadlines', frequency: 'daily', streak: 5, category: 'administrative' }
    ];
  });

  const [history, setHistory] = useState<HistoryLog[]>(() => {
    const saved = localStorage.getItem('ovrdue_history');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      { id: 'l1', taskId: 't-mock-1', taskTitle: 'Finalize server config', predictedMinutes: 60, actualMinutes: 45, completedAt: new Date().toISOString(), efficiencyIndex: 1.33 },
      { id: 'l2', taskId: 't-mock-2', taskTitle: 'Read security briefs', predictedMinutes: 30, actualMinutes: 40, completedAt: new Date().toISOString(), efficiencyIndex: 0.75 }
    ];
  });

  // Active Focus Timer
  const [activeFocusTask, setActiveFocusTask] = useState<Task | null>(() => {
    const saved = localStorage.getItem('ovrdue_focus_task');
    return saved ? JSON.parse(saved) : null;
  });
  const [focusTimerRunning, setFocusTimerRunning] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(0);

  // Feature 1, 2, and 4 States
  const [urgencyCoeff, setUrgencyCoeff] = useState<number>(() => {
    const saved = localStorage.getItem('yourpa_urgency_coeff');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [audioAlertsEnabled, setAudioAlertsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('yourpa_audio_alerts');
    return saved ? saved === 'true' : true;
  });
  const [reminderLeadMinutes, setReminderLeadMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('yourpa_lead_mins');
    return saved ? parseInt(saved) : 30;
  });
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [plannerTask, setPlannerTask] = useState<Task | null>(null);
  const [plannerBreakMinutes, setPlannerBreakMinutes] = useState(5);
  const spokenAlertIdsRef = useRef<Set<string>>(new Set());
  
  // Real-time toast and system notification states
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });
  const [activeToasts, setActiveToasts] = useState<{ id: string; taskId: string; taskTitle: string; message: string; type: 'warning' | 'critical' | 'overdue'; timestamp: Date }[]>([]);
  const notifiedAlertIdsRef = useRef<Set<string>>(new Set());

  // Layout UI states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<Task | null>(null);
  const [customCompleteMins, setCustomCompleteMins] = useState<string>('');
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitFreq, setNewHabitFreq] = useState<'daily' | 'weekly'>('daily');
  const [newHabitCat, setNewHabitCat] = useState('study');

  // Time ticker state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Refs for audio / alerts
  const lastSpokenRef = useRef<string>('');

  // Save states to local storage
  useEffect(() => {
    localStorage.setItem('ovrdue_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('ovrdue_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('ovrdue_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (activeFocusTask) {
      localStorage.setItem('ovrdue_focus_task', JSON.stringify(activeFocusTask));
    } else {
      localStorage.removeItem('ovrdue_focus_task');
    }
  }, [activeFocusTask]);

  useEffect(() => {
    localStorage.setItem('yourpa_urgency_coeff', urgencyCoeff.toString());
  }, [urgencyCoeff]);

  useEffect(() => {
    localStorage.setItem('yourpa_audio_alerts', audioAlertsEnabled.toString());
  }, [audioAlertsEnabled]);

  useEffect(() => {
    localStorage.setItem('yourpa_lead_mins', reminderLeadMinutes.toString());
  }, [reminderLeadMinutes]);

  // Global time ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Dynamic Alert Generation (Feature 4 - Context-aware reminders & comparisons)
  const getSmartAlerts = () => {
    const list: { id: string; taskId: string; taskTitle: string; type: 'warning' | 'critical' | 'overdue' | 'comparison'; message: string; spokenText: string }[] = [];
    
    tasks.filter(t => !t.completed).forEach(task => {
      const deadlineDate = new Date(task.deadline);
      const msLeft = deadlineDate.getTime() - currentTime.getTime();
      const minutesLeft = msLeft / (1000 * 60);

      const humanTime = task.humanEstimatedMinutes || 30;
      const buffer = task.proactiveBufferMinutes || 15;
      const totalTimeRequired = humanTime + buffer;
      
      const threatRatio = (totalTimeRequired / Math.max(1, minutesLeft)) * urgencyCoeff;

      // Start-by time
      const startByMs = deadlineDate.getTime() - (totalTimeRequired * 60 * 1000);
      const msUntilStartBy = startByMs - currentTime.getTime();
      const minsUntilStartBy = msUntilStartBy / (1000 * 60);

      const aiTime = task.aiBenchmarkMinutes || 5;

      if (msLeft <= 0) {
        list.push({
          id: `overdue-${task.id}`,
          taskId: task.id,
          taskTitle: task.title,
          type: 'overdue',
          message: `OVERDUE: Deadline for "${task.title}" has elapsed! Buffer safety is zero.`,
          spokenText: `Urgent assist notice. The deadline for ${task.title} has expired.`
        });
      } else if (threatRatio >= 1.0) {
        const bufferEroded = Math.round(Math.abs(minsUntilStartBy));
        list.push({
          id: `critical-${task.id}`,
          taskId: task.id,
          taskTitle: task.title,
          type: 'critical',
          message: `🚨 BUFFER DESTRUCTING: You are ${bufferEroded}m past the start-by hour for "${task.title}". Buffer is actively eroding!`,
          spokenText: `Attention! You are past the recommended start window for ${task.title}. Active safety buffer is eroding. Begin immediately!`
        });
      } else if (minsUntilStartBy > 0 && minsUntilStartBy <= reminderLeadMinutes) {
        list.push({
          id: `warn-${task.id}`,
          taskId: task.id,
          taskTitle: task.title,
          type: 'warning',
          message: `⏰ PRE-PANIC REMINDER: Start "${task.title}" in ${Math.round(minsUntilStartBy)}m to secure your ${buffer}m buffer.`,
          spokenText: `Reminder alert: You must start ${task.title} in ${Math.round(minsUntilStartBy)} minutes to keep your scheduling buffer.`
        });
      }

      // Comparison Alert
      if (aiTime > 0 && humanTime > 0) {
        list.push({
          id: `compare-${task.id}`,
          taskId: task.id,
          taskTitle: task.title,
          type: 'comparison',
          message: `📊 TIME AUDIT: AI executes in ${aiTime}m, but humans need ${humanTime}m. Safeguard limit activated.`,
          spokenText: `Time audit alert: AI can complete ${task.title} in ${aiTime} minutes, but humans average ${humanTime} minutes. Plan accordingly.`
        });
      }
    });

    return list;
  };

  // Web Audio API Synthesizer for high-fidelity technical sound effects
  const playNotificationSound = (type: 'warning' | 'critical' | 'overdue') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      if (type === 'critical' || type === 'overdue') {
        // Double-beep retro alarm synth note
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(220, now);
        osc1.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        
        osc1.start(now);
        osc1.stop(now + 0.35);

        // Second slightly higher pitch note
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(261.63, now + 0.2); // C4
        osc2.frequency.exponentialRampToValueAtTime(523.25, now + 0.35); // C5
        gain2.gain.setValueAtTime(0.12, now + 0.2);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
        
        osc2.start(now + 0.2);
        osc2.stop(now + 0.55);
      } else {
        // High-frequency C-major chord arpeggio note (futuristic digital arpeggio)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.45);
        
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch (e) {
      console.warn('Audio synthesis blocked by policy or un-initialized:', e);
    }
  };

  // Voice Speech Synthesizer Helper
  const triggerAudioVoiceAdvice = (text: string) => {
    if (!text || text === lastSpokenRef.current) return;
    lastSpokenRef.current = text;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Cancel any ongoing speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 0.95; // Technical futuristic robotic tone
        window.speechSynthesis.speak(utterance);
      } else {
        console.warn('Speech synthesis is not supported on this platform.');
      }
    } catch (err) {
      console.error('Audio error:', err);
    }
  };

  // Request browser desktop Notification permission
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setNotificationPermission(result);
        if (result === 'granted') {
          new Notification('YourPa Notifications Active', {
            body: 'You will receive real-time push alerts as deadlines approach.',
          });
          playNotificationSound('warning');
          triggerAudioVoiceAdvice("System alerts enabled. We will deliver push notifications directly to your desktop.");
        }
      } catch (e) {
        console.error('Notification permission request error:', e);
      }
    }
  };

  // Unified Alert Dispatcher (Voice, Audio Synth Chime, System Popups, In-App Toasts)
  useEffect(() => {
    const currentAlerts = getSmartAlerts();
    
    // Filter active warning, critical, or overdue alarms
    const targetAlarms = currentAlerts.filter(a => a.type === 'critical' || a.type === 'warning' || a.type === 'overdue');
    
    targetAlarms.forEach(alarm => {
      // 1. Dispatch Voice Advisory (if enabled & not spoken yet)
      if (audioAlertsEnabled) {
        if (!spokenAlertIdsRef.current.has(alarm.id)) {
          spokenAlertIdsRef.current.add(alarm.id);
          triggerAudioVoiceAdvice(alarm.spokenText);
        }
      }
      
      // 2. Dispatch Popups and Desktop Alerts (if not notified yet)
      if (!notifiedAlertIdsRef.current.has(alarm.id)) {
        notifiedAlertIdsRef.current.add(alarm.id);
        
        const alarmType = alarm.type as 'warning' | 'critical' | 'overdue';
        
        // A. Synth chime audio
        playNotificationSound(alarmType);
        
        // B. Browser System Push notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`YourPa: ${alarm.type.toUpperCase()}`, {
              body: alarm.message,
              tag: alarm.id,
              requireInteraction: alarm.type === 'critical' || alarm.type === 'overdue',
            });
          } catch (e) {
            console.error('Push notification error:', e);
          }
        }
        
        // C. In-App Floating Toast Alert
        setActiveToasts(prev => [
          ...prev,
          {
            id: alarm.id,
            taskId: alarm.taskId,
            taskTitle: alarm.taskTitle,
            message: alarm.message,
            type: alarmType,
            timestamp: new Date()
          }
        ]);
      }
    });
  }, [currentTime, audioAlertsEnabled]);

  // Automatic Toast Cleanup (Removes warning/minor alerts after 8s; keeps critical/overdue pinned until dismissed manually)
  useEffect(() => {
    if (activeToasts.length === 0) return;
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      setActiveToasts(prev => 
        prev.filter(toast => {
          if (toast.type === 'critical' || toast.type === 'overdue') return true;
          return now - new Date(toast.timestamp).getTime() < 8000;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [activeToasts]);

  const handleDismissToast = (id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  };

  // Stopwatch effect for focus task
  useEffect(() => {
    let interval: any = null;
    if (focusTimerRunning && activeFocusTask) {
      interval = setInterval(() => {
        setFocusSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [focusTimerRunning, activeFocusTask]);

  // 1. ADD TASK WITH OPTIONAL AI ANALYTICS
  const handleAddTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'completed'> & { runAIAnalysis: boolean }) => {
    setIsAnalyzing(true);
    const newId = 't_' + Math.random().toString(36).substring(2, 9);
    
    // Simple fast keyword-based duration estimator for local baselines
    const text = (taskData.title + ' ' + (taskData.description || '')).toLowerCase();
    let baselineHumanMin = 45;
    let baselineBuffer = 15;
    let baselineCategory = 'general';
    let baselineAdvice = 'Review deadlines periodically to optimize deep work focus blocks.';
    let baselineSubtasks = [
      { id: `${newId}_s1`, title: 'Preparation phase', estimatedMinutes: 15, completed: false },
      { id: `${newId}_s2`, title: 'Core implementation', estimatedMinutes: 20, completed: false },
      { id: `${newId}_s3`, title: 'Validation & Wrap-up', estimatedMinutes: 10, completed: false }
    ];

    if (
      text.includes('pay') || 
      text.includes('bill') || 
      text.includes('recharge') || 
      text.includes('jio') || 
      text.includes('fibre') || 
      text.includes('fiber') || 
      text.includes('broadband') || 
      text.includes('electricity') || 
      text.includes('netflix') || 
      text.includes('spotify') || 
      text.includes('subscription') || 
      text.includes('dth')
    ) {
      baselineHumanMin = 3;
      baselineBuffer = 2;
      baselineCategory = 'bill';
      baselineAdvice = 'Internet, Jio, and utility bills take only 2-3 minutes to process online. Complete it now!';
      baselineSubtasks = [
        { id: `${newId}_s1`, title: 'Open payment application or portal', estimatedMinutes: 1, completed: false },
        { id: `${newId}_s2`, title: 'Input details & confirm bill', estimatedMinutes: 1, completed: false },
        { id: `${newId}_s3`, title: 'Complete payment and confirm', estimatedMinutes: 1, completed: false }
      ];
    } else if (
      text.includes('milk') || 
      text.includes('trash') || 
      text.includes('garbage') || 
      text.includes('water plants') || 
      text.includes('feed')
    ) {
      baselineHumanMin = 5;
      baselineBuffer = 2;
      baselineCategory = 'chore';
      baselineAdvice = 'Micro-chore detected. Finish immediately to release mental capacity!';
      baselineSubtasks = [
        { id: `${newId}_s1`, title: 'Locate tools or move to area', estimatedMinutes: 2, completed: false },
        { id: `${newId}_s2`, title: 'Perform quick micro-chore', estimatedMinutes: 3, completed: false }
      ];
    } else if (
      text.includes('email') || 
      text.includes('mail') || 
      text.includes('whatsapp') || 
      text.includes('sms') || 
      text.includes('slack') || 
      text.includes('text ')
    ) {
      baselineHumanMin = 8;
      baselineBuffer = 4;
      baselineCategory = 'administrative';
      baselineAdvice = 'Quick communication check. Keep it concise to optimize scheduling flow.';
      baselineSubtasks = [
        { id: `${newId}_s1`, title: 'Draft key points or open chat', estimatedMinutes: 2, completed: false },
        { id: `${newId}_s2`, title: 'Compose & dispatch message/email', estimatedMinutes: 4, completed: false },
        { id: `${newId}_s3`, title: 'Confirm log entry or next action', estimatedMinutes: 2, completed: false }
      ];
    }

    let newTask: Task = {
      id: newId,
      title: taskData.title,
      description: taskData.description,
      priority: taskData.userPriority,
      userPriority: taskData.userPriority,
      deadline: taskData.deadline,
      createdAt: new Date().toISOString(),
      completed: false,
      aiBenchmarkMinutes: 5,
      humanEstimatedMinutes: baselineHumanMin,
      proactiveBufferMinutes: baselineBuffer,
      category: baselineCategory,
      schedulingAdvice: baselineAdvice,
      subtasks: baselineSubtasks
    };

    if (taskData.runAIAnalysis) {
      try {
        const res = await fetch('/api/analyze-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: taskData.title,
            description: taskData.description,
            userPriority: taskData.userPriority,
            deadline: taskData.deadline
          })
        });

        if (res.ok) {
          const aiData: AIAnalysisResponse = await res.json();
          newTask = {
            ...newTask,
            priority: aiData.priority || taskData.userPriority,
            aiBenchmarkMinutes: aiData.aiBenchmarkMinutes || 5,
            humanEstimatedMinutes: aiData.humanEstimatedMinutes || 60,
            proactiveBufferMinutes: aiData.proactiveBufferMinutes || 20,
            category: aiData.category || 'general',
            schedulingAdvice: aiData.schedulingAdvice || 'Maintain active pacing to secure buffer limits.',
            subtasks: (aiData.subtasks || []).map((st, idx) => ({
              id: `${newId}_s${idx}`,
              title: st.title,
              estimatedMinutes: st.estimatedMinutes,
              completed: false
            }))
          };

          // Automatically speak AI advice to prompt user focus!
          const briefAdvice = `AI analysis complete for task: ${newTask.title}. Estimated human duration is ${newTask.humanEstimatedMinutes} minutes. ${newTask.schedulingAdvice}`;
          triggerAudioVoiceAdvice(briefAdvice);
        }
      } catch (err) {
        console.error('Failed to contact AI endpoint, using standard timing heuristic:', err);
      }
    }

    setTasks((prev) => [newTask, ...prev]);
    setIsAnalyzing(false);
  };

  // 2. COMPLETE TASK
  const handleCompleteTask = (id: string, actualMinutes?: number) => {
    let completedTask: Task | null = null;
    
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          completedTask = { ...t, completed: true, actualDurationMinutes: actualMinutes };
          return completedTask;
        }
        return t;
      })
    );

    // If completed task is currently in focus, turn off stopwatch
    if (activeFocusTask?.id === id) {
      setFocusTimerRunning(false);
      setActiveFocusTask(null);
      setFocusSeconds(0);
    }

    // Log to historical metrics
    if (completedTask) {
      const task: Task = completedTask;
      const pred = task.humanEstimatedMinutes || 30;
      const act = actualMinutes || Math.round(focusSeconds / 60) || 15;
      const effIndex = parseFloat((pred / Math.max(1, act)).toFixed(2));

      const newLog: HistoryLog = {
        id: 'log_' + Math.random().toString(36).substring(2, 9),
        taskId: task.id,
        taskTitle: task.title,
        predictedMinutes: pred,
        actualMinutes: act,
        completedAt: new Date().toISOString(),
        efficiencyIndex: effIndex
      };

      setHistory((prev) => [newLog, ...prev]);

      // Voice congratulation
      const audioCongrat = `Mission completed: ${task.title}. You completed it in ${act} minutes compared to our prediction of ${pred} minutes. Efficiency index score is ${effIndex}. Excellent execution.`;
      triggerAudioVoiceAdvice(audioCongrat);
    }
  };

  // 3. DELETE TASK
  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (activeFocusTask?.id === id) {
      setFocusTimerRunning(false);
      setActiveFocusTask(null);
      setFocusSeconds(0);
    }
  };

  // 4. FOCUS ON TASK
  const handleSelectTaskForFocus = (task: Task) => {
    setActiveFocusTask(task);
    setFocusSeconds(0);
    setFocusTimerRunning(true);
    
    const text = `Focus block initiated for ${task.title}. We have scheduled ${task.humanEstimatedMinutes} minutes of absolute deep work. Turn off notifications and concentrate now.`;
    triggerAudioVoiceAdvice(text);
  };

  // 5. UPDATE FOCUS TASK SUBTASK CHECK
  const handleToggleFocusSubtask = (subtaskId: string) => {
    if (!activeFocusTask) return;

    const updatedSubtasks = (activeFocusTask.subtasks || []).map((st) => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    const updatedTask = {
      ...activeFocusTask,
      subtasks: updatedSubtasks
    };

    setActiveFocusTask(updatedTask);
    
    // Also update main tasks state so they are synchronized
    setTasks((prev) =>
      prev.map((t) => (t.id === activeFocusTask.id ? updatedTask : t))
    );
  };

  // 5b. UPDATE ANY TASK SUBTASK CHECK (FROM BLUEPRINT DEEP-DIVE PANEL)
  const handleToggleTaskSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedSubtasks = (t.subtasks || []).map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          );
          const updated = { ...t, subtasks: updatedSubtasks };
          
          // Synchronize active focus task details if matching
          if (activeFocusTask?.id === taskId) {
            setActiveFocusTask(updated);
          }
          // Synchronize selected task details if matching
          if (selectedTaskDetails?.id === taskId) {
            setSelectedTaskDetails(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  // 6. TOGGLE HABIT ROUTINE
  const handleToggleHabit = (id: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          const isAlreadyCompletedToday = h.lastCompleted === todayStr;
          return {
            ...h,
            streak: isAlreadyCompletedToday ? Math.max(0, h.streak - 1) : h.streak + 1,
            lastCompleted: isAlreadyCompletedToday ? undefined : todayStr
          };
        }
        return h;
      })
    );

    triggerAudioVoiceAdvice(`Habit routine checked. Solid consistency builds exceptional discipline.`);
  };

  // 7. REGISTER NEW HABIT
  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;

    const newH: Habit = {
      id: 'h_' + Math.random().toString(36).substring(2, 9),
      title: newHabitTitle.trim(),
      frequency: newHabitFreq,
      streak: 0,
      category: newHabitCat
    };

    setHabits((prev) => [...prev, newH]);
    setNewHabitTitle('');
    setShowHabitModal(false);
  };

  const handleDeleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  // DYNAMIC CALCULATIONS FOR ANALYTICS PANEL & TELEMETRY
  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  // Dynamic Overall Efficiency calculation based on user completed tasks
  const getAverageEfficiency = () => {
    if (history.length === 0) return 100;
    const totalPredicted = history.reduce((sum, h) => sum + h.predictedMinutes, 0);
    const totalActual = history.reduce((sum, h) => sum + h.actualMinutes, 0);
    return Math.round((totalPredicted / Math.max(1, totalActual)) * 100);
  };

  const getUrgencyAndTimer = (task: Task) => {
    const deadlineDate = new Date(task.deadline);
    const msLeft = deadlineDate.getTime() - currentTime.getTime();
    const minutesLeft = msLeft / (1000 * 60);

    const humanTime = task.humanEstimatedMinutes || 30;
    const buffer = task.proactiveBufferMinutes || 15;
    const totalTimeRequired = humanTime + buffer;

    let score = 0;
    let label = 'Stable';
    let color = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';

    if (task.completed) {
      return { score: 0, label: 'Completed', color: 'text-slate-500 border-slate-800 bg-slate-900/50', timerText: 'Finished' };
    }

    if (msLeft <= 0) {
      return { score: 100, label: 'MISSED DEADLINE', color: 'text-red-500 border-red-500/50 bg-red-950/20 animate-pulse', timerText: 'Overdue!' };
    }

    const threatRatio = (totalTimeRequired / Math.max(1, minutesLeft)) * urgencyCoeff;

    let priorityWeight = 10;
    if (task.priority === Priority.CRITICAL) priorityWeight = 45;
    else if (task.priority === Priority.HIGH) priorityWeight = 30;
    else if (task.priority === Priority.MEDIUM) priorityWeight = 15;

    if (threatRatio >= 1.0) {
      score = Math.min(100, Math.round(50 + priorityWeight + (threatRatio * 10)));
      label = 'CRITICAL PANIC';
      color = 'text-red-400 border-red-500/30 bg-red-950/20';
    } else if (threatRatio >= 0.7) {
      score = Math.min(90, Math.round(35 + priorityWeight + (threatRatio * 15)));
      label = 'ELEVATED RISK';
      color = 'text-amber-400 border-amber-500/30 bg-amber-950/10';
    } else if (threatRatio >= 0.4) {
      score = Math.min(70, Math.round(20 + priorityWeight + (threatRatio * 15)));
      label = 'HEALTHY HEADSTART';
      color = 'text-blue-400 border-blue-500/30 bg-blue-950/10';
    } else {
      score = Math.min(40, Math.round(5 + priorityWeight + (threatRatio * 10)));
      label = 'STABLE / ON TRACK';
      color = 'text-slate-400 border-slate-800 bg-slate-900/40';
    }

    // Countdown string
    let timerText = '';
    const hoursLeft = msLeft / (1000 * 60 * 60);
    const days = Math.floor(hoursLeft / 24);
    const remHours = Math.floor(hoursLeft % 24);
    const remMins = Math.floor(minutesLeft % 60);
    const remSecs = Math.floor((msLeft / 1000) % 60);

    if (days > 0) {
      timerText = `${days}d ${remHours}h`;
    } else if (remHours > 0) {
      timerText = `${remHours}h ${remMins}m`;
    } else {
      timerText = `${remMins}m ${remSecs}s`;
    }

    return { score, label, color, timerText };
  };

  // Find the highest urgency task as the current prime candidate
  const getPrimeCriticalTask = (): Task | null => {
    if (activeTasks.length === 0) return null;
    return [...activeTasks].sort((a, b) => {
      const uA = getUrgencyAndTimer(a).score;
      const uB = getUrgencyAndTimer(b).score;
      return uB - uA;
    })[0];
  };

  const primeTask = getPrimeCriticalTask();

  // Selected or prime task timings for dynamic Predictive Analytics bar chart representation
  const selectedOrPrimeTask = selectedTaskDetails || primeTask || tasks[0];

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-slate-200 p-4 md:p-8 flex flex-col font-sans overflow-x-hidden relative">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div className="flex flex-col">
          <span className="text-orange-500 font-mono text-xs tracking-widest uppercase mb-1 flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
            </span>
            <span>SYSTEM MONITORING ACTIVE</span>
          </span>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase flex items-center gap-1">
            YourPa<span className="text-orange-600">.</span>
          </h1>
          <p className="text-slate-500 text-xs font-mono mt-0.5">YOUR PERSONAL ADAPTIVE CO-PILOT</p>
        </div>

        <div className="flex gap-8 text-right font-mono">
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Your Efficiency Index</span>
            <span className="text-2xl font-bold text-white italic">{getAverageEfficiency()}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Deadlines Extinguished</span>
            <span className="text-2xl font-bold text-orange-500 italic">{completedTasks.length}</span>
          </div>
        </div>
      </header>

      {/* BENTO GRID BOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        
        {/* BLOCK 1: CURRENT ACTIVE FOCUS OR CURRENT PRIME CRITICAL TASK (Col span 8, Row span 3) */}
        <section className="lg:col-span-8 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-slate-700/80 transition-all shadow-xl">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-white pointer-events-none transition-transform group-hover:scale-105 duration-700">
            <svg width="220" height="220" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  {focusTimerRunning ? (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  ) : null}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${focusTimerRunning ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                </span>
                {activeFocusTask ? 'CRITICAL Focus BLOCK ACTIVE' : 'TOP RECOMMENDED PRIORITY MISSION'}
              </span>
              
              {activeFocusTask && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono font-bold px-3 py-1 rounded-full animate-pulse flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {Math.floor(focusSeconds / 3600).toString().padStart(2, '0')}:
                    {Math.floor((focusSeconds % 3600) / 60).toString().padStart(2, '0')}:
                    {(focusSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>

            {/* Display focus card or recommendation brief */}
            {activeFocusTask ? (
              <div className="space-y-4" id="active-focus-workspace">
                <div className="space-y-1">
                  <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                    {activeFocusTask.title}
                  </h2>
                  <p className="text-sm md:text-base text-slate-400 font-sans max-w-2xl">
                    {activeFocusTask.description || 'No additional specifications provided.'}
                  </p>
                </div>

                {/* Real-time Subtasks execution inside Focus Frame */}
                {activeFocusTask.subtasks && activeFocusTask.subtasks.length > 0 && (
                  <div className="bg-black/40 border border-slate-800/80 rounded-2xl p-4 max-w-xl">
                    <span className="text-[10px] text-slate-500 font-mono block uppercase mb-2 font-bold tracking-wider">
                      COGNITIVE ACTION STEPS ({activeFocusTask.subtasks.filter(s => s.completed).length}/{activeFocusTask.subtasks.length})
                    </span>
                    <div className="space-y-2.5">
                      {activeFocusTask.subtasks.map((st) => (
                        <label 
                          key={st.id} 
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/30 border border-slate-800/40 hover:bg-slate-900/60 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={st.completed}
                              onChange={() => handleToggleFocusSubtask(st.id)}
                              className="w-4 h-4 rounded border-slate-700 text-orange-500 bg-slate-950 focus:ring-0 cursor-pointer"
                            />
                            <span className={`text-xs md:text-sm font-medium ${st.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                              {st.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded">
                            {st.estimatedMinutes}m
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : primeTask ? (
              <div className="space-y-3" id="prime-task-brief">
                <h2 className="text-3xl md:text-5xl font-black text-white leading-none tracking-tighter">
                  {primeTask.title}
                </h2>
                <div className="text-slate-400 text-sm md:text-base max-w-xl font-sans mt-2">
                  <p className="line-clamp-3">
                    {primeTask.description || 'No descriptive brief. AI predicts high quality return if completed in reasonable time.'}
                  </p>
                  <div className="mt-3 text-xs md:text-sm font-mono flex flex-wrap items-center gap-2">
                    <span className="text-orange-500 font-semibold bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                      Human Est: {primeTask.humanEstimatedMinutes}m
                    </span>
                    <span className="text-sky-400 font-semibold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                      AI Speed: {primeTask.aiBenchmarkMinutes}m
                    </span>
                    <span className="text-slate-500">
                      Margin: {getUrgencyAndTimer(primeTask).timerText}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8" id="clean-schedule-banner">
                <h2 className="text-2xl md:text-3xl font-extrabold text-emerald-400 leading-tight">
                  No Pending Threats Detected
                </h2>
                <p className="text-slate-400 text-sm md:text-base max-w-md mt-1">
                  You are perfectly on schedule. Add a new deadline on the right or work on habits below to preserve this state.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-800/50">
            {activeFocusTask ? (
              <>
                <button 
                  onClick={() => handleCompleteTask(activeFocusTask.id, Math.max(1, Math.round(focusSeconds / 60)))}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black py-2.5 px-6 rounded-full transition-all text-xs uppercase tracking-wider cursor-pointer"
                  id="complete-focused-btn"
                >
                  Confirm Completion & Log Time
                </button>
                <button 
                  onClick={() => setFocusTimerRunning(!focusTimerRunning)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-6 rounded-full transition-all text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  id="pause-focused-btn"
                >
                  {focusTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                  <span>{focusTimerRunning ? 'Pause Session' : 'Resume Session'}</span>
                </button>
                <button 
                  onClick={() => {
                    setFocusTimerRunning(false);
                    setActiveFocusTask(null);
                    setFocusSeconds(0);
                  }}
                  className="bg-transparent hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 font-medium py-2.5 px-6 rounded-full transition-all text-xs uppercase tracking-wider cursor-pointer"
                  id="abort-focused-btn"
                >
                  Cancel Focus Block
                </button>
              </>
            ) : primeTask ? (
              <>
                <button 
                  onClick={() => handleSelectTaskForFocus(primeTask)}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-8 rounded-full transition-all uppercase tracking-wider text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-950/40"
                  id="commit-prime-btn"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Commit Now (Start focus tracking)</span>
                </button>
                <button 
                  onClick={() => {
                    const text = `Analyzing ${primeTask.title}. Real-time recommendation index is: ${primeTask.schedulingAdvice}`;
                    triggerAudioVoiceAdvice(text);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-8 rounded-full transition-all uppercase tracking-wider text-xs cursor-pointer border border-slate-700"
                  id="advise-prime-btn"
                >
                  Synthesize Voice Advice
                </button>
              </>
            ) : (
              <span className="text-slate-500 font-mono text-xs uppercase tracking-wider">
                System standing by.
              </span>
            )}
          </div>
        </section>

        {/* BLOCK 2: NEW MISSION BRIEFING / TASK INPUT (Col span 4, Row span 3) */}
        <section className="lg:col-span-4 bg-[#151518]/90 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <span className="text-orange-500 font-mono text-[10px] uppercase font-bold tracking-widest">TASK REGISTRY ENGINE</span>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">MISSION CONSOLE</h3>
              </div>
              <div className="bg-slate-800/60 p-2 rounded-full text-slate-400">
                <Sparkles className="w-4 h-4 text-orange-500 animate-spin-slow" />
              </div>
            </div>

            <TaskForm onAddTask={handleAddTask} isAnalyzing={isAnalyzing} />
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <span className="text-[10px] text-slate-500 font-mono block uppercase mb-1 font-bold">PRO-TIP FROM AI CO-PILOT:</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Use the **Dictate Task** button to describe deadlines naturally! The server extracts task name, priority, and date values in seconds.
            </p>
          </div>
        </section>

        {/* BLOCK 3: PREDICTIVE ANALYTICS CHART (Col span 4, Row span 3) */}
        <section className="lg:col-span-4 bg-slate-900/20 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700/80 transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest font-mono">PREDICTIVE DIAGNOSTICS</h3>
              <TrendingUp className="w-4 h-4 text-orange-500" />
            </div>

            <p className="text-xs text-slate-400 mb-5 leading-relaxed font-sans">
              Currently analyzing: <strong className="text-slate-200">{selectedOrPrimeTask?.title || 'No active tasks'}</strong>. AI compares human limits vs actual user completion metrics to recalculate risk thresholds.
            </p>

            {/* Dynamic Comparison Timing Bars */}
            <div className="space-y-5">
              
              {/* Bar 1: Standard Human Average */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>WORLDWIDE HUMAN AVERAGE</span>
                  <span className="text-slate-300 font-medium">
                    {selectedOrPrimeTask?.humanEstimatedMinutes || 60}m
                  </span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                  <div className="h-full bg-slate-700 rounded-full" style={{ width: '80%' }}></div>
                </div>
              </div>

              {/* Bar 2: Your Personal Speed */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-orange-500 font-bold uppercase tracking-wider">YOUR ESTIMATED SPEED</span>
                  <span className="text-orange-400 font-semibold font-mono">
                    {/* Heuristic calculations if user completed tasks in this category */}
                    {Math.round((selectedOrPrimeTask?.humanEstimatedMinutes || 60) * (100 / getAverageEfficiency()))}m
                  </span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                  <div 
                    className="h-full bg-orange-500 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(10, getAverageEfficiency() - 10))}%` }}
                  ></div>
                </div>
              </div>

              {/* Bar 3: AI Assisted (Automated/LLM benchmark) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono text-emerald-400">
                  <span>AI ASSISTED AUTOPILOT LIMIT</span>
                  <span className="font-bold">
                    {selectedOrPrimeTask?.aiBenchmarkMinutes || 5}m
                  </span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: '12%' }}></div>
                </div>
              </div>

            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-950/60 rounded-2xl border border-slate-800/60">
            <p className="text-[11px] text-slate-400 text-center leading-relaxed italic uppercase font-mono">
              "YourPa has helped you evade <span className="text-orange-500 font-bold">{completedTasks.length} deadlines</span> and optimize scheduling speed."
            </p>
          </div>
        </section>

        {/* BLOCK 4: SCHEDULE PULSE / UPCOMING DEADLINES (Col span 4, Row span 3) */}
        <section className="lg:col-span-4 bg-[#151518]/70 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700/80 transition-all">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest font-mono">DEADLINE MATRIX</h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {activeTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-mono">
                  No pending deadlines. Add some above.
                </div>
              ) : (
                [...activeTasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).map((task) => {
                  const { score, label, color, timerText } = getUrgencyAndTimer(task);
                  const isSelected = selectedTaskDetails?.id === task.id;
                  
                  return (
                    <div 
                      key={task.id}
                      onClick={() => setSelectedTaskDetails(task)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                        isSelected 
                          ? 'bg-slate-800/40 border-orange-500/50' 
                          : 'bg-slate-900/30 border-slate-800/40 hover:border-slate-800'
                      }`}
                      id={`pulse-task-row-${task.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${
                          task.priority === Priority.CRITICAL ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
                        }`} />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-200 truncate">{task.title}</div>
                          <div className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">{task.category || 'general'}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-orange-400 shrink-0 bg-slate-950/80 px-2 py-0.5 rounded ml-2">
                        {timerText}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="h-12 border-t border-slate-800/60 pt-4 flex items-center justify-between gap-2 mt-4 text-xs font-mono">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">Select any task row to display full AI advice</span>
            {selectedTaskDetails && (
              <button 
                onClick={() => setSelectedTaskDetails(null)}
                className="text-orange-500 hover:text-orange-400 text-[10px] font-bold uppercase"
              >
                Clear Select
              </button>
            )}
          </div>
        </section>

        {/* BLOCK 5: ROUTINES & HABIT TRACKING (Col span 4, Row span 3) */}
        <section className="lg:col-span-4 bg-slate-900/40 border border-emerald-950/30 rounded-3xl p-6 flex flex-col justify-between hover:border-emerald-900/20 transition-all">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-emerald-400 font-bold text-xs uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>ROUTINE MUSCLE MEMORY</span>
              </h3>
              <button 
                onClick={() => setShowHabitModal(true)}
                className="p-1 bg-slate-950 text-slate-400 hover:text-white rounded border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                title="Add routine habit"
                id="open-habit-creator-btn"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {habits.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-mono">
                  No habit routines registered. Click + above to build routine.
                </div>
              ) : (
                habits.map((h) => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const completedToday = h.lastCompleted === todayStr;
                  
                  return (
                    <div 
                      key={h.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-900/80"
                      id={`bento-habit-row-${h.id}`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate">{h.title}</div>
                        <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-slate-500">
                          <span className="capitalize">{h.frequency}</span>
                          <span>•</span>
                          <span className="text-amber-400 font-bold flex items-center gap-0.5">
                            <Flame className="w-3 h-3 fill-amber-500 text-amber-500 inline" />
                            {h.streak}d streak
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleToggleHabit(h.id)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            completedToday 
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                          title={completedToday ? "Mark Incomplete" : "Complete Habit"}
                          id={`bento-habit-check-${h.id}`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHabit(h.id)}
                          className="p-1.5 bg-transparent hover:bg-red-950/20 text-slate-600 hover:text-red-400 rounded transition-all"
                          title="Purge habit"
                          id={`bento-habit-delete-${h.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/40 text-center">
            <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Consistent repetition bypasses last-minute stress.</span>
          </div>
        </section>

        {/* BLOCK 7: AI INTELLIGENT PRIORITIZATION & PACING TIMER (Col span 6) */}
        <section className="lg:col-span-6 bg-[#111113] border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-750 transition-all shadow-xl">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <span className="text-orange-500 font-mono text-[10px] uppercase font-bold tracking-widest flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-orange-500" />
                  <span>INTELLIGENT TASK PRIORITIZATION</span>
                </span>
                <h3 className="text-base font-black text-white uppercase tracking-tight">AI Co-efficient Engine</h3>
              </div>
              <div className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] font-mono text-slate-400">
                Coeff: <span className="text-orange-400 font-bold">{urgencyCoeff.toFixed(1)}x</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Tweak the alert coefficient to change how aggressively the AI computes urgencies, upgrades priorities, and flashes alarm indicators.
            </p>

            {/* Slider control */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900 space-y-2">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-500">RELAXED (0.5x)</span>
                <span className="text-orange-400 font-bold">BALANCED (1.0x)</span>
                <span className="text-red-500">FRENZIED (2.0x)</span>
              </div>
              <input 
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={urgencyCoeff}
                onChange={(e) => setUrgencyCoeff(parseFloat(e.target.value))}
                className="w-full accent-orange-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                id="coeff-slider"
              />
            </div>

            {/* Priority Comparisons List */}
            <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
              <span className="text-[10px] text-slate-500 font-mono block uppercase font-bold tracking-wider">PRIORITY COMPARISON TREE</span>
              {activeTasks.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs font-mono">
                  No active tasks to prioritize.
                </div>
              ) : (
                activeTasks.map(task => {
                  const { score } = getUrgencyAndTimer(task);
                  
                  // Start-By time calculation for Feature 2
                  const deadlineDate = new Date(task.deadline);
                  const totalTimeRequired = (task.humanEstimatedMinutes || 30) + (task.proactiveBufferMinutes || 15);
                  const startByTime = new Date(deadlineDate.getTime() - (totalTimeRequired * 60 * 1000));
                  const isPastStartBy = new Date() > startByTime;

                  return (
                    <div 
                      key={`prior-${task.id}`}
                      className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-slate-200 truncate">{task.title}</h4>
                          <span className="text-[10px] text-slate-500 font-mono uppercase">Category: {task.category || 'general'}</span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <span className="bg-slate-900 text-slate-400 border border-slate-800 text-[9px] font-mono px-1.5 py-0.5 rounded" title="Your chosen priority">
                            👤 {task.userPriority}
                          </span>
                          <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold" title="AI calculated panic rating">
                            🤖 Urg: {score}
                          </span>
                        </div>
                      </div>

                      {/* Scheduling Assistant Advice mini bar */}
                      <div className="flex justify-between items-center text-[10px] font-mono pt-1 border-t border-slate-900/60">
                        <span className="text-slate-500 flex items-center gap-1">
                          <CalendarRange className="w-3 h-3 text-orange-500" />
                          <span>Start-By Limit:</span>
                        </span>
                        <span className={`${isPastStartBy ? 'text-red-400 animate-pulse font-bold' : 'text-slate-300'}`}>
                          {startByTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({isPastStartBy ? 'Eroding!' : 'On Schedule'})
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/40 flex justify-between items-center">
            <span className="text-[10px] text-slate-500 font-mono">INTELLIGENT WEIGHT COMPUTING ACTIVE</span>
            {activeTasks.length > 0 && (
              <button
                onClick={() => {
                  setPlannerTask(activeTasks[0]);
                  setShowPlannerModal(true);
                }}
                className="bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 border border-orange-500/30 text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
                id="trigger-planner-btn"
              >
                <Clock className="w-3 h-3" />
                <span>Interactive Pacing Planner</span>
              </button>
            )}
          </div>
        </section>

        {/* BLOCK 8: CONTEXT-AWARE REMINDERS & ALARMS CENTER (Col span 6) */}
        <section className="lg:col-span-6 bg-[#160E0E]/40 border border-red-950/20 rounded-3xl p-6 flex flex-col justify-between hover:border-red-900/30 transition-all shadow-xl">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <span className="text-red-400 font-mono text-[10px] uppercase font-bold tracking-widest flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5 text-red-400" />
                  <span>CONTEXT-AWARE ALARMS & TIMERS</span>
                </span>
                <h3 className="text-base font-black text-white uppercase tracking-tight">YourPa Security alerts</h3>
              </div>

              <div className="flex items-center gap-1.5">
                {notificationPermission !== 'granted' && (
                  <button
                    onClick={requestNotificationPermission}
                    className="px-2.5 py-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-mono font-bold hover:bg-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
                    title="Enable Desktop Push Popups"
                    id="enable-native-notifications"
                  >
                    <Bell className="w-3.5 h-3.5 text-orange-400" />
                    <span>Enable Desktop Popups</span>
                  </button>
                )}
                {notificationPermission === 'granted' && (
                  <span className="px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Push Active</span>
                  </span>
                )}
                
                <button 
                  onClick={() => setAudioAlertsEnabled(!audioAlertsEnabled)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    audioAlertsEnabled 
                      ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
                  }`}
                  title={audioAlertsEnabled ? 'Mute Voice Alerts' : 'Unmute Voice Alerts'}
                  id="toggle-audio-alerts"
                >
                  {audioAlertsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Live feedback alerts computed by analyzing your active tasks relative to world averages, remaining buffer margins, and deadlines.
            </p>

            {/* Smart Alarm Feed */}
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              <span className="text-[10px] text-slate-500 font-mono block uppercase font-bold tracking-wider">ACTIVE FEED ({getSmartAlerts().length})</span>
              {getSmartAlerts().length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-mono">
                  No active warnings detected. Schedule looks safe.
                </div>
              ) : (
                getSmartAlerts().map((alert, idx) => {
                  let alertColor = 'border-blue-950 bg-blue-950/5 text-blue-400';
                  if (alert.type === 'critical') alertColor = 'border-red-950/60 bg-red-950/10 text-red-400 animate-pulse';
                  else if (alert.type === 'overdue') alertColor = 'border-red-950/80 bg-red-950/20 text-red-500 font-bold';
                  else if (alert.type === 'warning') alertColor = 'border-amber-950/60 bg-amber-950/10 text-amber-400';

                  return (
                    <div 
                      key={`alert-${alert.id}-${idx}`}
                      className={`p-2.5 rounded-xl border text-[11px] font-mono flex items-start justify-between gap-2 ${alertColor}`}
                    >
                      <div className="leading-relaxed flex-1">
                        {alert.message}
                      </div>
                      <button
                        onClick={() => triggerAudioVoiceAdvice(alert.spokenText)}
                        className="p-1 hover:bg-white/10 rounded transition-all shrink-0 cursor-pointer"
                        title="Broadcast alert speech"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Test broadcaster control */}
          <div className="mt-4 pt-3 border-t border-slate-900/60 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-500">Lead Notice:</span>
              <select
                value={reminderLeadMinutes}
                onChange={(e) => setReminderLeadMinutes(parseInt(e.target.value))}
                className="bg-slate-950 border border-slate-900 text-slate-400 text-[10px] font-mono rounded px-1.5 py-0.5 focus:outline-none focus:border-red-500"
                id="lead-minutes-selector"
              >
                <option value="15">15 mins</option>
                <option value="30">30 mins</option>
                <option value="45">45 mins</option>
                <option value="60">60 mins</option>
              </select>
            </div>

            <button
              onClick={() => {
                const funnyTexts = [
                  "Attention! YourPa Co-Pilot checking in. If you do not initiate focused action within your buffer limit, target safety will dissolve.",
                  "Audio telemetry check completed. Speaker online. I am actively calculating deadline threat metrics.",
                  "Focus alert. Stop reading news feed. Committing to a habit routine expands cognitive velocity."
                ];
                const rand = funnyTexts[Math.floor(Math.random() * funnyTexts.length)];
                triggerAudioVoiceAdvice(rand);
              }}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded transition-all cursor-pointer"
              id="test-synthesis-btn"
            >
              Simulate Voice Test
            </button>
          </div>
        </section>

      </div>

      {/* BLOCK 6: AI ACTION BLUEPRINT PANEL (ONLY SHOWS IF A TASK IS SELECTED TO DEEP-DIVE IN AI SCHEDULING ADVICE) */}
      {selectedOrPrimeTask && (
        <section className="mt-6 bg-gradient-to-br from-[#121215] to-[#1a1a20] border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden transition-all shadow-xl" id="selected-diagnostics-vault">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-slate-800/60">
            <div>
              <span className="text-orange-500 font-mono text-[10px] uppercase font-bold tracking-widest flex items-center gap-1">
                <Brain className="w-3.5 h-3.5 text-orange-500" />
                <span>AI STRATEGY DIAGNOSIS & BREAKDOWN</span>
              </span>
              <h3 className="text-xl font-bold text-white tracking-tight mt-1">
                Strategy Blueprint: {selectedOrPrimeTask.title}
              </h3>
            </div>
            
            <div className="flex items-center gap-2 font-mono">
              <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-300 rounded text-xs">
                Category: <strong className="text-slate-100 uppercase">{selectedOrPrimeTask.category || 'general'}</strong>
              </span>
              {selectedTaskDetails && (
                <button 
                  onClick={() => setSelectedTaskDetails(null)}
                  className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
                  title="Close Strategizer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            
            {/* Column A: Empathetic warnings & advice */}
            <div className="space-y-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-900">
              <h4 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span>SCHEDULER ADVICE & DELAY RISK</span>
              </h4>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed italic">
                "{selectedOrPrimeTask.schedulingAdvice || 'The AI scheduler recommends taking immediate steps to outline key dependencies first. Waiting until the absolute deadline creates high cognitive strain.'}"
              </p>
              
              <div className="pt-2 flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">Proactive safety buffer calculated:</span>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  +{selectedOrPrimeTask.proactiveBufferMinutes || 15} minutes
                </span>
              </div>
            </div>

            {/* Column B: Sequential Subtasks checklist */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <ListTodo className="w-4 h-4 text-orange-500" />
                <span>RECOMMENDED TIMED STEPS</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedOrPrimeTask.subtasks && selectedOrPrimeTask.subtasks.length > 0 ? (
                  selectedOrPrimeTask.subtasks.map((sub, index) => {
                    return (
                      <label 
                        key={sub.id} 
                        className={`p-3 rounded-xl flex items-center justify-between border transition-all cursor-pointer hover:bg-slate-900/40 ${
                          sub.completed 
                            ? 'bg-slate-950/40 border-slate-900 opacity-60' 
                            : 'bg-slate-900/40 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={sub.completed}
                            onChange={() => handleToggleTaskSubtask(selectedOrPrimeTask.id, sub.id)}
                            className="w-4 h-4 rounded border-slate-700 text-orange-500 bg-slate-950 focus:ring-0 cursor-pointer shrink-0"
                          />
                          <span className={`text-xs font-medium truncate ${sub.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {sub.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded shrink-0">
                          {sub.estimatedMinutes}m
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500 font-mono col-span-full">
                    No custom subtask breakdown computed yet for this brief. Save with AI Diagnostics to activate.
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* DYNAMIC TASK CONTROL BAR (COMPLETE, FOCUS, DELETE ACTIONS) */}
          <div className="mt-8 pt-6 border-t border-slate-850/60 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-[#0d0d10]/60 p-4 rounded-2xl border border-slate-900">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <span>Completion Duration:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  placeholder={`${selectedOrPrimeTask.humanEstimatedMinutes || 30}`}
                  value={customCompleteMins}
                  onChange={(e) => setCustomCompleteMins(e.target.value)}
                  className="w-16 bg-slate-950 text-white border border-slate-800 rounded px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-orange-500 text-center"
                  title="Override actual minutes spent"
                />
                <span className="text-[10px] font-mono text-slate-500">mins</span>
              </div>
              <button
                onClick={() => {
                  const mins = customCompleteMins ? parseInt(customCompleteMins) : (selectedOrPrimeTask.humanEstimatedMinutes || 30);
                  handleCompleteTask(selectedOrPrimeTask.id, mins);
                  setCustomCompleteMins('');
                  setSelectedTaskDetails(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/20"
                id="complete-selected-blueprint-btn"
              >
                <Check className="w-4 h-4 text-slate-950" />
                <span>Mark Done & Log</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              {!activeFocusTask || activeFocusTask.id !== selectedOrPrimeTask.id ? (
                <button
                  onClick={() => handleSelectTaskForFocus(selectedOrPrimeTask)}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-mono font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-950/20"
                  id="focus-selected-blueprint-btn"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Commit (Focus Session)</span>
                </button>
              ) : (
                <span className="text-orange-400 font-mono text-xs border border-orange-500/20 bg-orange-500/5 px-3 py-2 rounded-lg animate-pulse font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  <span>Active Session running</span>
                </span>
              )}

              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to permanently delete "${selectedOrPrimeTask.title}"?`)) {
                    handleDeleteTask(selectedOrPrimeTask.id);
                    setSelectedTaskDetails(null);
                  }
                }}
                className="bg-red-950/30 hover:bg-red-900/30 text-red-400 border border-red-900/30 font-mono text-xs uppercase py-2 px-4 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                id="delete-selected-blueprint-btn"
                title="Delete this task completely"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Task</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* HABIT ROUTINE CREATION MODAL */}
      {showHabitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#151518] border border-slate-800 rounded-3xl p-6 max-w-md w-full relative space-y-4">
            <button 
              onClick={() => setShowHabitModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-orange-500 font-mono text-[10px] uppercase font-bold tracking-widest flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                <span>ROUTINE MUSCLE BUILDER</span>
              </span>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Register Habit Routine</h3>
            </div>

            <form onSubmit={handleAddHabit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                  Habit Title *
                </label>
                <input
                  type="text"
                  required
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  placeholder="e.g. Read tech docs, practice algorithm, write log"
                  className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-all font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                    Frequency
                  </label>
                  <select
                    value={newHabitFreq}
                    onChange={(e: any) => setNewHabitFreq(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-orange-500 transition-all font-mono"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newHabitCat}
                    onChange={(e) => setNewHabitCat(e.target.value)}
                    placeholder="e.g. study, health"
                    className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-orange-500 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all uppercase tracking-wider cursor-pointer"
              >
                Launch Routine Habit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* INTERACTIVE STUDY/WORK BLOCK PACING PLANNER MODAL */}
      {showPlannerModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#121215] border border-slate-800 rounded-3xl p-6 max-w-xl w-full relative space-y-5 shadow-2xl">
            <button 
              onClick={() => setShowPlannerModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-orange-500 font-mono text-[10px] uppercase font-bold tracking-widest flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <span>AI PACING SCHEDULER & EVENT DESIGNER</span>
              </span>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Interactive Study/Work Block Planner</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                  Select Mission to Schedule
                </label>
                <select
                  value={plannerTask?.id || ''}
                  onChange={(e) => {
                    const found = tasks.find(t => t.id === e.target.value);
                    if (found) setPlannerTask(found);
                  }}
                  className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono"
                  id="planner-task-selector"
                >
                  <option value="">-- Choose active task --</option>
                  {activeTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.category || 'general'})</option>
                  ))}
                </select>
              </div>

              {plannerTask ? (
                <div className="space-y-4">
                  
                  {/* Efficiency Multiplier Indicator (Feature 2 - factoring in actual human efficiency ratings) */}
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-900 space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-400">Personal Efficiency Index:</span>
                      <strong className="text-orange-400 font-bold">{getAverageEfficiency()}%</strong>
                    </div>
                    <div className="text-[11px] text-slate-500 leading-relaxed font-sans">
                      {getAverageEfficiency() < 100 ? (
                        <span className="text-amber-500/90">
                          ⚠️ Based on performance logs, you average slower than prediction. We have extended planned session segments by <strong className="text-amber-400">+{Math.round(100 - getAverageEfficiency())}%</strong> for safety.
                        </span>
                      ) : (
                        <span className="text-emerald-400/90">
                          ⚡ Stellar metrics! You are pacing ahead of typical predictions. Standard slots preserved for high buffer safety.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Planned Timeline Blocks preview */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-500 font-mono block uppercase font-bold tracking-wider">GENERATED PACING BLOCK TIMELINE</span>
                    
                    <div className="space-y-2.5">
                      {/* Deep Work Block 1 */}
                      <div className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-900/60">
                        <div className="w-6 h-6 rounded-full bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold font-mono">1</div>
                        <div className="flex-1 text-xs">
                          <div className="font-bold text-slate-200 uppercase">Phase 1: High-Intensity Focus Block</div>
                          <div className="text-slate-500 mt-0.5">Solve core difficult tasks without notification prompts.</div>
                        </div>
                        <span className="text-xs font-mono font-semibold text-orange-400">
                          {Math.round((plannerTask.humanEstimatedMinutes || 30) * 0.6 * (100 / Math.max(10, getAverageEfficiency())))} min
                        </span>
                      </div>

                      {/* Recalibration Break */}
                      <div className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-900/60">
                        <div className="w-6 h-6 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold font-mono">2</div>
                        <div className="flex-1 text-xs">
                          <div className="font-bold text-slate-200 uppercase">Phase 2: Hydration & Cognitive Recovery</div>
                          <div className="text-slate-500 mt-0.5">Stand up, step away from screens, let synapses rest.</div>
                        </div>
                        <span className="text-xs font-mono font-semibold text-blue-400">
                          {plannerBreakMinutes} min
                        </span>
                      </div>

                      {/* Deep Work Block 2 */}
                      <div className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-900/60">
                        <div className="w-6 h-6 rounded-full bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold font-mono">3</div>
                        <div className="flex-1 text-xs">
                          <div className="font-bold text-slate-200 uppercase">Phase 3: Deep Wrapping & Polish</div>
                          <div className="text-slate-500 mt-0.5">Check off subtasks, review details, draft reports.</div>
                        </div>
                        <span className="text-xs font-mono font-semibold text-orange-400">
                          {Math.round((plannerTask.humanEstimatedMinutes || 30) * 0.4 * (100 / Math.max(10, getAverageEfficiency())))} min
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 flex flex-col sm:flex-row gap-2.5">
                    <button
                      onClick={() => {
                        const totalRequired = (plannerTask.humanEstimatedMinutes || 30) + (plannerTask.proactiveBufferMinutes || 15);
                        const startBy = new Date(new Date(plannerTask.deadline).getTime() - (totalRequired * 60 * 1000));
                        
                        const text = `Perfect. Scheduled scheduling event for ${plannerTask.title} block. Start hour is set at ${startBy.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Audio alerts configured successfully!`;
                        triggerAudioVoiceAdvice(text);
                        
                        // Select task in main focus mode directly!
                        handleSelectTaskForFocus(plannerTask);
                        setShowPlannerModal(false);
                      }}
                      className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-950/40"
                    >
                      <Sparkles className="w-4 h-4 fill-slate-950" />
                      <span>Commit Blocks & Start Focus</span>
                    </button>

                    <button
                      onClick={() => {
                        // Simulated ICS calendar download
                        const totalRequired = (plannerTask.humanEstimatedMinutes || 30) + (plannerTask.proactiveBufferMinutes || 15);
                        const startBy = new Date(new Date(plannerTask.deadline).getTime() - (totalRequired * 60 * 1000));
                        
                        const startFormatted = startBy.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                        const endFormatted = new Date(plannerTask.deadline).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                        
                        const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${plannerTask.title}\nDESCRIPTION:${plannerTask.description}\nDTSTART:${startFormatted}\nDTEND:${endFormatted}\nEND:VEVENT\nEND:VCALENDAR`;
                        
                        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
                        const link = document.createElement('a');
                        link.href = window.URL.createObjectURL(blob);
                        link.setAttribute('download', 'yourpa_schedule_block.ics');
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        triggerAudioVoiceAdvice(`Exporting I C S calendar payload. Open this file to synchronize your google calendar instantly.`);
                      }}
                      className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Export .ics Calendar Event
                    </button>
                  </div>

                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs font-mono">
                  Select a task from the list to display session timings.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REAL-TIME DYNAMIC TOAST NOTIFICATION CORNER */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none" id="yourpa-toasts-container">
        {activeToasts.map((toast) => {
          let badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
          let borderTheme = 'border-blue-900/40 bg-[#0c1017]/95 shadow-blue-950/40';
          let titlePrefix = 'Notice';

          if (toast.type === 'critical') {
            badgeColor = 'bg-red-500/10 text-red-400 border-red-500/20';
            borderTheme = 'border-red-900/60 bg-[#170c0c]/95 shadow-red-950/40';
            titlePrefix = 'CRITICAL ALARM';
          } else if (toast.type === 'overdue') {
            badgeColor = 'bg-rose-600/20 text-rose-400 border-rose-500/30 animate-pulse';
            borderTheme = 'border-rose-900 bg-[#1c0a0d]/95 shadow-rose-950/50';
            titlePrefix = 'MISSED DEADLINE';
          } else if (toast.type === 'warning') {
            badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            borderTheme = 'border-amber-900/40 bg-[#16120b]/95 shadow-amber-950/40';
            titlePrefix = 'WARNING';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto border rounded-2xl p-4 shadow-2xl flex flex-col gap-2 backdrop-blur-md transition-all duration-300 ${borderTheme}`}
              style={{
                animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-mono uppercase font-black px-2 py-0.5 rounded border ${badgeColor}`}>
                    {titlePrefix}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(toast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <button
                  onClick={() => handleDismissToast(toast.id)}
                  className="text-slate-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded shrink-0 cursor-pointer"
                  title="Dismiss alert"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                <strong className="text-xs text-white font-bold block leading-snug">
                  {toast.taskTitle}
                </strong>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  {toast.message}
                </p>
              </div>

              {(toast.type === 'critical' || toast.type === 'overdue') && (
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => {
                      const found = tasks.find(t => t.id === toast.taskId);
                      if (found) handleSelectTaskForFocus(found);
                      handleDismissToast(toast.id);
                    }}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-mono font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-lg transition-all text-center cursor-pointer"
                  >
                    Commit & Solve
                  </button>
                  <button
                    onClick={() => handleDismissToast(toast.id)}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 hover:border-slate-700 font-mono text-[10px] uppercase py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                  >
                    Acknowledge
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <footer className="mt-12 py-6 border-t border-slate-900 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-slate-500">
        <div>
          YOURPA SYSTEM v2.5.0 — ADAPTIVE PANIC CO-PILOT
        </div>
        <div className="flex gap-4">
          <span>SECURE SECRETS AUTHENTICATED</span>
          <span>•</span>
          <span>DURABLE STATE CACHED</span>
        </div>
      </footer>

    </div>
  );
}
