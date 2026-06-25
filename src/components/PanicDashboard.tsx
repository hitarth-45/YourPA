import React, { useState, useEffect } from 'react';
import { Priority, Task, Habit } from '../types';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Hourglass, 
  Play, 
  Trash2, 
  Eye, 
  TrendingUp,
  Brain,
  ListTodo,
  Smile,
  Flame,
  Volume2
} from 'lucide-react';

interface PanicDashboardProps {
  tasks: Task[];
  habits: Habit[];
  onCompleteTask: (id: string, actualMinutes?: number) => void;
  onDeleteTask: (id: string) => void;
  onSelectTaskForFocus: (task: Task) => void;
  onViewTaskDetails: (task: Task) => void;
  onToggleHabit: (id: string) => void;
  onDeleteHabit: (id: string) => void;
  triggerAudioVoiceAdvice: (text: string) => void;
}

export default function PanicDashboard({
  tasks,
  habits,
  onCompleteTask,
  onDeleteTask,
  onSelectTaskForFocus,
  onViewTaskDetails,
  onToggleHabit,
  onDeleteHabit,
  triggerAudioVoiceAdvice,
}: PanicDashboardProps) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'active' | 'completed' | 'habits'>('active');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time for countdown timers
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute stats
  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  // Total Human backlog hours
  const backlogMinutes = activeTasks.reduce((sum, t) => sum + (t.humanEstimatedMinutes || 30), 0);
  const backlogHours = (backlogMinutes / 60).toFixed(1);

  // Total hours saved by AI automation comparison (for fun context)
  const humanMinutesTotal = completedTasks.reduce((sum, t) => sum + (t.humanEstimatedMinutes || 30), 0);
  const aiMinutesTotal = completedTasks.reduce((sum, t) => sum + (t.aiBenchmarkMinutes || 5), 0);
  const savedMinutes = Math.max(0, humanMinutesTotal - aiMinutesTotal);

  // Dynamic Urgency Calculation Heuristic
  const getUrgencyAndTimer = (task: Task) => {
    const deadlineDate = new Date(task.deadline);
    const msLeft = deadlineDate.getTime() - currentTime.getTime();
    const hoursLeft = msLeft / (1000 * 60 * 60);
    const minutesLeft = msLeft / (1000 * 60);

    const humanTime = task.humanEstimatedMinutes || 30; // default 30m
    const buffer = task.proactiveBufferMinutes || 15;
    const totalTimeRequired = humanTime + buffer;

    // Base priority weight
    let priorityWeight = 10;
    if (task.priority === Priority.CRITICAL) priorityWeight = 45;
    else if (task.priority === Priority.HIGH) priorityWeight = 30;
    else if (task.priority === Priority.MEDIUM) priorityWeight = 15;

    let score = 0;
    let label = 'Stable';
    let color = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';

    if (task.completed) {
      return { score: 0, label: 'Completed', color: 'text-slate-500 border-slate-800 bg-slate-900/50', timerText: 'Finished' };
    }

    if (msLeft <= 0) {
      return { score: 100, label: 'MISSED DEADLINE', color: 'text-red-500 border-red-500/50 bg-red-950/20 animate-pulse', timerText: 'Overdue!' };
    }

    // Time ratio calculation
    const minutesToDeadline = Math.max(1, minutesLeft);
    const threatRatio = totalTimeRequired / minutesToDeadline;

    if (threatRatio >= 1.0) {
      // PANIC ZONE: Human literally doesn't have enough hours left if they wait!
      score = Math.min(100, Math.round(50 + priorityWeight + (threatRatio * 10)));
      label = 'CRITICAL PANIC';
      color = 'text-red-400 border-red-500/30 bg-red-950/20 animate-pulse';
    } else if (threatRatio >= 0.7) {
      // ELEVATED PANIC: Better start right now to keep safety buffer
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
    const days = Math.floor(hoursLeft / 24);
    const remHours = Math.floor(hoursLeft % 24);
    const remMins = Math.floor((minutesLeft) % 60);
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

  // Compute general Panic Level of user
  const activeTaskWithUrgencies = activeTasks.map(t => ({
    task: t,
    urgency: getUrgencyAndTimer(t)
  }));

  const maxUrgency = activeTaskWithUrgencies.length > 0 
    ? Math.max(...activeTaskWithUrgencies.map(o => o.urgency.score)) 
    : 0;

  let overallPanicStatus = 'RELAXED';
  let overallPanicDesc = 'No immediate threats. AI recommends reviewing future commitments.';
  let overallPanicBg = 'from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-400';

  if (maxUrgency >= 90) {
    overallPanicStatus = 'CRITICAL RED ALERT';
    overallPanicDesc = 'Extreme risk of failure. Immediate execution of critical tasks required!';
    overallPanicBg = 'from-red-500/20 to-transparent border-red-500/30 text-red-400 animate-pulse-amber';
  } else if (maxUrgency >= 70) {
    overallPanicStatus = 'ELEVATED ANXIETY';
    overallPanicDesc = 'Time buffers are shrinking. Start highly recommended in the next hour.';
    overallPanicBg = 'from-amber-500/15 to-transparent border-amber-500/20 text-amber-400';
  } else if (maxUrgency >= 40) {
    overallPanicStatus = 'MODERATE';
    overallPanicDesc = 'Standard backlog level. Standard pacing works well.';
    overallPanicBg = 'from-blue-500/10 to-transparent border-blue-500/20 text-blue-400';
  }

  // Filtered lists
  const getFilteredTasks = () => {
    let list = [...tasks];
    
    // Sort tasks primarily by Urgency score (descending)
    list = list.sort((a, b) => {
      const uA = getUrgencyAndTimer(a).score;
      const uB = getUrgencyAndTimer(b).score;
      return uB - uA; // high urgency first
    });

    if (filter === 'critical') {
      return list.filter(t => !t.completed && (t.priority === Priority.CRITICAL || getUrgencyAndTimer(t).score >= 70));
    }
    if (filter === 'active') {
      return list.filter(t => !t.completed);
    }
    if (filter === 'completed') {
      return list.filter(t => t.completed);
    }
    return list;
  };

  const filteredTasks = getFilteredTasks();

  const handleNagAI = () => {
    // Collect active panic tasks and speak them
    const dangerTasks = activeTaskWithUrgencies.filter(o => o.urgency.score >= 70);
    if (dangerTasks.length === 0) {
      triggerAudioVoiceAdvice("Your schedule is healthy. Keep up the consistent focus!");
    } else {
      const titles = dangerTasks.slice(0, 2).map(o => o.task.title).join(" and ");
      const advice = `Alert! You are stalling on: ${titles}. Based on human benchmark limits, you need to begin immediately to secure a safety buffer. Procrastinating now will result in extreme rush. Press Play to start focus mode!`;
      triggerAudioVoiceAdvice(advice);
    }
  };

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* 1. Dynamic Panic Index & AI Telemetry */}
      <div className={`p-5 rounded-xl border bg-gradient-to-r ${overallPanicBg} transition-all duration-300`} id="panic-index-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
              </span>
              <span>AI System Status: {overallPanicStatus}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold font-sans tracking-tight">
              {maxUrgency >= 70 ? 'Mission At Risk!' : 'Awaiting Next Objective'}
            </h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl font-sans">
              {overallPanicDesc}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            <button
              onClick={handleNagAI}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-mono text-amber-400 transition-all cursor-pointer"
              title="Speak emergency advice"
              id="speak-nag-btn"
            >
              <Volume2 className="w-4 h-4 text-amber-500 animate-bounce" />
              <span>Voice Diagnosis</span>
            </button>
            <div className="bg-slate-950/60 border border-slate-800 px-4 py-2.5 rounded-lg text-center font-mono shrink-0">
              <div className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Overall Backlog</div>
              <div className="text-lg font-bold text-slate-100">{backlogHours}h</div>
            </div>
          </div>
        </div>

        {/* Diagnostic Telemetry Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/40">
          <div className="bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/30">
            <div className="text-[10px] text-slate-500 font-mono uppercase">Panic Level</div>
            <div className="text-base font-bold text-slate-200 font-mono mt-0.5">{maxUrgency}%</div>
          </div>
          <div className="bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/30">
            <div className="text-[10px] text-slate-500 font-mono uppercase">Completed Tasks</div>
            <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">{completedTasks.length}</div>
          </div>
          <div className="bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/30">
            <div className="text-[10px] text-slate-500 font-mono uppercase">Routine Streaks</div>
            <div className="text-base font-bold text-amber-400 font-mono mt-0.5 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{habits.reduce((max, h) => Math.max(max, h.streak), 0)} d</span>
            </div>
          </div>
          <div className="bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/30">
            <div className="text-[10px] text-slate-500 font-mono uppercase">AI vs. Human Gap</div>
            <div className="text-base font-bold text-sky-400 font-mono mt-0.5" title="Human takes longer to execute than simple automation benchmarked data">
              +{savedMinutes} mins
            </div>
          </div>
        </div>
      </div>

      {/* 2. Task View Filter Selector & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3" id="view-filters-row">
        <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${
              filter === 'active' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
            id="filter-active-btn"
          >
            Active Briefs ({activeTasks.length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${
              filter === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
            id="filter-critical-btn"
          >
            Critical Red Alert
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${
              filter === 'completed' ? 'bg-slate-800 text-slate-300' : 'text-slate-400 hover:text-slate-200'
            }`}
            id="filter-completed-btn"
          >
            Mission History ({completedTasks.length})
          </button>
          <button
            onClick={() => setFilter('habits')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${
              filter === 'habits' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
            id="filter-habits-btn"
          >
            Habit Routine Checks
          </button>
        </div>
        <div className="text-[11px] font-mono text-slate-500 self-end sm:self-center">
          Priceless seconds left. Focus immediately.
        </div>
      </div>

      {/* 3. Task List Rendering */}
      {filter !== 'habits' ? (
        <div className="grid grid-cols-1 gap-3" id="tasks-list">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/30 border border-slate-800/50 rounded-xl" id="empty-tasks-placeholder">
              <Smile className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-sans text-slate-400">No tasks in this category.</p>
              <p className="text-xs font-mono text-slate-600 mt-1">Excellent job preventing panic. Add new briefs above.</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const { score, label, color, timerText } = getUrgencyAndTimer(task);
              const urgencyColor = score >= 90 ? 'text-red-500' : score >= 70 ? 'text-amber-500' : 'text-slate-400';
              
              return (
                <div 
                  key={task.id}
                  className={`bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 md:p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden ${
                    task.completed ? 'opacity-65' : ''
                  }`}
                  id={`task-card-${task.id}`}
                >
                  {/* Left Side: Priority tag, Title, Metadata */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider ${
                        task.priority === Priority.CRITICAL 
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                          : task.priority === Priority.HIGH
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : task.priority === Priority.MEDIUM
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {task.priority}
                      </span>

                      {task.category && (
                        <span className="px-2 py-0.5 bg-slate-950 text-slate-400 border border-slate-800 rounded text-[10px] font-mono uppercase">
                          {task.category}
                        </span>
                      )}

                      {!task.completed && (
                        <span className={`px-2 py-0.5 border rounded text-[10px] font-mono uppercase ${color}`}>
                          {label} (Panic: {score}%)
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className={`text-base font-semibold text-slate-100 font-sans tracking-tight ${task.completed ? 'line-through text-slate-500' : ''}`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-slate-400 text-xs mt-1 max-w-2xl font-sans line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Timeline Metrics & Subtasks status */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                      <div className="flex items-center gap-1">
                        <Hourglass className="w-3.5 h-3.5 text-slate-600" />
                        <span>Deadline: {new Date(task.deadline).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-600" />
                        <span>Est: <strong className="text-slate-300 font-semibold">{task.humanEstimatedMinutes || 30} mins</strong></span>
                      </div>
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <ListTodo className="w-3.5 h-3.5 text-slate-600" />
                          <span>
                            Steps: {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Quick Timer & Action Controls */}
                  <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800/60 font-mono shrink-0">
                    <div className="text-left md:text-right space-y-0.5">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Priceless Time Left</div>
                      <div className={`text-sm md:text-base font-bold ${urgencyColor}`}>
                        {timerText}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewTaskDetails(task)}
                        className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg transition-all cursor-pointer"
                        title="AI Diagnostics & Advice"
                        id={`view-diagnostics-btn-${task.id}`}
                      >
                        <Brain className="w-4 h-4 text-amber-500" />
                      </button>

                      {!task.completed && (
                        <button
                          onClick={() => onSelectTaskForFocus(task)}
                          className="flex items-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-semibold text-xs rounded-lg transition-all cursor-pointer"
                          title="Launch focus tracking"
                          id={`focus-start-btn-${task.id}`}
                        >
                          <Play className="w-3.5 h-3.5 fill-slate-950" />
                          <span>Focus</span>
                        </button>
                      )}

                      {task.completed ? (
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="p-2 bg-slate-950 hover:bg-red-950/20 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-900/40 rounded-lg transition-all cursor-pointer"
                          title="Purge Task"
                          id={`delete-completed-btn-${task.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onCompleteTask(task.id)}
                          className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg transition-all cursor-pointer"
                          title="Mark Complete"
                          id={`complete-task-btn-${task.id}`}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Habits / Routines checklist */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="habits-list">
          {habits.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-slate-900/30 border border-slate-800/50 rounded-xl" id="empty-habits-placeholder">
              <Smile className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-sans text-slate-400">No habit routines registered yet.</p>
              <p className="text-xs font-mono text-slate-600 mt-1">Configure automated task alarms to build routine muscle memory.</p>
            </div>
          ) : (
            habits.map((habit) => (
              <div 
                key={habit.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4"
                id={`habit-card-${habit.id}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded text-[10px] font-mono uppercase">
                      {habit.frequency}
                    </span>
                    <span className="px-1.5 py-0.5 bg-slate-950 text-slate-500 rounded text-[10px] font-mono capitalize">
                      {habit.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100 font-sans tracking-tight">
                    {habit.title}
                  </h3>
                  <div className="flex items-center gap-1 font-mono text-xs text-slate-500">
                    <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>Streak: <strong className="text-amber-400">{habit.streak} days</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <button
                    onClick={() => onToggleHabit(habit.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg text-xs transition-all cursor-pointer"
                    id={`complete-habit-btn-${habit.id}`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Done</span>
                  </button>
                  <button
                    onClick={() => onDeleteHabit(habit.id)}
                    className="p-1.5 bg-slate-950 hover:bg-red-950/20 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-900/40 rounded-lg transition-all cursor-pointer"
                    id={`delete-habit-btn-${habit.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
