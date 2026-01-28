import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { fetchArticleById } from '../firebase';

type ArticleDetail = {
  title: string;
  dateKey: string;
  bodyMarkdown: string;
  sourceUrls: string[];
};

export default function Detail() {
  const { id } = useParams();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    fetchArticleById(id)
      .then((data) => {
        if (mounted) setArticle(data as ArticleDetail);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="detail">
        <Link to="/" className="back">← 목록</Link>
        <div className="muted">불러오는 중...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="detail">
        <Link to="/" className="back">← 목록</Link>
        <div className="muted">기사 없음</div>
      </div>
    );
  }

  return (
    <article className="detail">
      <Link to="/" className="back">← 목록</Link>
      <h1 className="detail-title">{article.title}</h1>
      <div className="detail-meta">{article.dateKey}</div>

      <section className="detail-section markdown">
        <ReactMarkdown>{article.bodyMarkdown}</ReactMarkdown>
      </section>

      <section className="detail-section">
        <h2>출처</h2>
        <ul>
          {(article.sourceUrls || []).map((url) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
