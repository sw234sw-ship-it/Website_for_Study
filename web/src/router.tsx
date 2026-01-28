import { Route, Routes } from 'react-router-dom';
import List from './pages/List';
import Detail from './pages/Detail';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<List />} />
      <Route path="/articles/:id" element={<Detail />} />
    </Routes>
  );
}
