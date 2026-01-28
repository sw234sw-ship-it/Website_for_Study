import { Link, NavLink } from 'react-router-dom';
import AppRouter from './router';

const tabs = [
  { key: 'macro', label: '거시경제' },
  { key: 'ai', label: 'AI' },
  { key: 'battery', label: '배터리' }
];

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <Link className="brand" to="/">AI 기자 브리핑</Link>
        <nav className="tabs">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={`/?topic=${tab.key}`}
              className={({ isActive }) => (isActive ? 'tab active' : 'tab')}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="content">
        <AppRouter />
      </main>

      <footer className="footer">Daily AI Briefing</footer>
    </div>
  );
}
