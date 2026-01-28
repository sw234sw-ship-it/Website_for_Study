import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchArticlesByTopic } from '../firebase';

type Topic = 'macro' | 'ai' | 'battery';

type ArticleListItem = {
  id: string;
  title: string;
  lead: string;
  dateKey: string;
};

export default function List() {
  const [params] = useSearchParams();
  const topic = (params.get('topic') || 'macro') as Topic;
  const [items, setItems] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => {
    if (topic === 'ai') return 'AI';
    if (topic === 'battery') return '배터리';
    return '거시경제';
  }, [topic]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchArticlesByTopic(topic)
      .then((data) => {
        if (mounted) setItems(data as ArticleListItem[]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [topic]);

  return (
    <section className="list">
      <h1 className="page-title">{title} 브리핑</h1>
      {loading && <div className="muted">불러오는 중...</div>}
      <ul className="card-list">
        {items.map((item) => (
          <li key={item.id} className="card">
            <div className="card-meta">{item.dateKey}</div>
            <Link to={`/articles/${item.id}`} className="card-title">
              {item.title}
            </Link>
            <p className="card-summary">{item.lead}</p>
          </li>
        ))}
        {!loading && items.length === 0 && (
          <li className="card empty">표시할 브리핑이 없습니다.</li>
        )}
      </ul>
    </section>
  );
}
