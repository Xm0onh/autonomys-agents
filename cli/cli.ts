import { orchestratorRunner } from '../src/agent.js';
import { validateLocalHash } from '../src/agents/tools/utils/localHashStorage.js';
import { createUI } from './components/ui.js';
import { setupKeyBindings } from './handlers/keyBindings.js';
import { runWorkflow } from './handlers/workflow.js';
import { AppState } from './types/types.js';
import { Mutex } from 'async-mutex';

(async () => {
  try {
    await validateLocalHash();
    const runner = await orchestratorRunner();
    const ui = createUI();
    const state: AppState = {
      value: '',
      isProcessing: false,
      scheduledTasks: [],
      mutex: new Mutex(),
    };

    setupKeyBindings(ui, state);

    // Handle F6 for submission
    ui.inputBox.key(['f6'], async () => {
      const value = ui.inputBox.getValue();
      if (value.trim()) {
        const release = await state.mutex.acquire();
        try {
          if (state.isProcessing) {
            // If system is busy, add to scheduled tasks queue
            const nextRunTime = new Date(); // Schedule for immediate execution when possible
            state.scheduledTasks.push({
              time: nextRunTime,
              description: value,
            });
            // Update UI to show task was queued
            const formattedTime = nextRunTime.toLocaleTimeString();
            ui.scheduledTasksBox.addItem(`${formattedTime} - ${value}`);
            ui.scheduledTasksBox.scrollTo(Number((ui.scheduledTasksBox as any).ritems.length - 1));
            ui.statusBox.setContent('System busy - Task added to queue');
          } else {
            // Process immediately if system is free
            state.value = value;
            ui.statusBox.setContent('Current Message: ' + value);
            state.isProcessing = false;
          }
        } finally {
          release();
        }
      }
      ui.inputBox.clearValue();
      ui.inputBox.focus();
      ui.screen.render();
    });

    // Run the workflow loop in parallel
    (async () => {
      while (true) {
        const release = await state.mutex.acquire();
        try {
          if (state.value && !state.isProcessing) {
            state.isProcessing = true;
            try {
              await runWorkflow(state.value, runner, ui, state);
              state.value = '';
            } catch (error: any) {
              ui.outputLog.log('\n{red-fg}Error:{/red-fg} ' + error.message);
              ui.statusBox.setContent('Error occurred. Enter new message to retry.');
              ui.screen.render();
              ui.inputBox.focus();
              await new Promise(res => setTimeout(res, 5000));
              state.value = '';
            } finally {
              state.isProcessing = false;
            }
          }
        } finally {
          release();
        }
        await new Promise(res => setTimeout(res, 1000));
      }
    })();

    // Run the scheduler loop in parallel
    (async () => {
      while (true) {
        const now = new Date();
        const release = await state.mutex.acquire();
        try {
          const dueTasks = state.scheduledTasks.filter(task => task.time <= now);
          if (dueTasks.length > 0 && !state.isProcessing) {
            state.isProcessing = true;
            const task = dueTasks[0]; // Process one task at a time
            // Remove task from list
            state.scheduledTasks = state.scheduledTasks.filter(t => t !== task);
            try {
              await runWorkflow(task.description, runner, ui, state);
            } catch (error: any) {
              ui.outputLog.log('\n{red-fg}Scheduled task error:{/red-fg} ' + error.message);
            } finally {
              state.isProcessing = false;
            }
          }
        } finally {
          release();
        }

        // Update clock with colored time
        const timeStr = now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        ui.clockBox.setContent(timeStr);
        ui.screen.render();

        await new Promise(res => setTimeout(res, 1000));
      }
    })();

    ui.inputBox.focus();
    ui.screen.render();
  } catch (error: any) {
    console.error('Failed to initialize interactive CLI:', error);
    process.exit(1);
  }
})();
