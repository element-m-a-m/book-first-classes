import { buildICS } from '../lib/messages.js';
import { Button, Icon } from './primitives.jsx';

function downloadICS(slots, label) {
  try {
    const blob = new Blob([buildICS(slots, label)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'element-classes.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { /* download blocked */ }
}

export function CalendarButton({ slots, label }) {
  if (!slots.length) return null;
  return (
    <div className="eb-center">
      <Button variant="secondary" onClick={() => downloadICS(slots, label)}><Icon name="calendar" size={16} /> הוספה ליומן</Button>
      <p className="eb-meta">* באנדרואיד: יש לפתוח את הקובץ לאחר ההורדה</p>
    </div>
  );
}
