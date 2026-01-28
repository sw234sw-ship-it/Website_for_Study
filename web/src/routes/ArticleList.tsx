import { Link, useSearchParams } from 'react-router-dom';

const sample = [
  {
    id: 'sample-1',
    title: '샘플 브리핑: 거시경제',
    summary: '이 영역에 최신 브리핑 요약이 표시됩니다.',
    publishedAt: '2026-01-28'
  }
];

export default function ArticleList() {
  const [params] = useSearchParams();
  const topic = params.get('topic') ?? 'macro';

  return (
    <section className="list">
      <h1 className="page-title">{topic.toUpperCase()} 브리핑</h1>
      <ul className="card-list">
        {sample.map((item) => (
          <li key={item.id} className="card">
            <div className="card-meta">{item.publishedAt}</div>
            <Link to={`/articles/${item.id}`} className="card-title">
              {item.title}
            </Link>
            <p className="card-summary">{item.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
