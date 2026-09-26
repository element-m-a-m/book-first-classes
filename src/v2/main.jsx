import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { parseParams } from './lib/params.js';
import { WA_PHONE } from './config/site.js';
import './styles/app.css';

const params = parseParams(location.search);
const embedded = window.parent !== window || params.embed;
document.documentElement.toggleAttribute('data-embed', embedded);

/** If the app itself fails, show a working way forward instead of a blank frame. */
class Boundary extends Component {
  constructor(p) { super(p); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {
    if (window.parent !== window) {
      window.parent.postMessage({ ns: 'element:booking', v: 2, type: 'error', code: 'render' }, location.origin);
      window.parent.postMessage({ type: 'element:booking:error', version: 1 }, location.origin);
    }
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="eb eb-fallback" dir="rtl" lang="he">
        <p>ההרשמה לא נטענה כרגע.</p>
        <a className="eb-btn eb-btn--wa" href={`https://wa.me/${WA_PHONE}`} target="_blank" rel="noopener noreferrer">דברו איתנו בוואטסאפ</a>
      </div>
    );
  }
}

createRoot(document.getElementById('element-booking-widget-container')).render(
  <Boundary><App params={params} embedded={embedded} /></Boundary>,
);
