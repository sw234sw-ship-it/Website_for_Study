import { Link, useParams } from 'react-router-dom';

export default function ArticleDetail() {
  const { id } = useParams();

  return (
    <article className="detail">
      <Link to="/" className="back">← 목록</Link>
      <h1 className="detail-title">기사 상세</h1>
      <div className="detail-meta">ID: {id}</div>

      <section className="detail-section">
        <h2>요약</h2>
        <p>여기에 요약이 표시됩니다.</p>
      </section>

      <section className="detail-section">
        <h2>사실 (FACT)</h2>
        <ul>
          <li>사실 항목 1</li>
          <li>사실 항목 2</li>
        </ul>
      </section>

      <section className="detail-section">
        <h2>해석 (ANALYSIS)</h2>
        <ul>
          <li>해석 항목 1</li>
          <li>해석 항목 2</li>
        </ul>
      </section>

      <section className="detail-section">
        <h2>커뮤니티 신호</h2>
        <p>커뮤니티 반응 요약(참고용).</p>
      </section>

      <section className="detail-section">
        <h2>출처 링크</h2>
        <ul>
          <li>링크 1</li>
          <li>링크 2</li>
          <li>링크 3</li>
          <li>링크 4</li>
          <li>링크 5</li>
        </ul>
      </section>
    </article>
  );
}
