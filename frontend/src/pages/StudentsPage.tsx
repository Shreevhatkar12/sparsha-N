import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentsApi } from '../api/studentsApi';
import type { Student } from '../types/api';

export function StudentsPage() {
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const result = await studentsApi.list({ page: 1, limit: 25, search });
        setStudents(result.data ?? result.students ?? []);
      } catch {
        setError('Could not load students list.');
      } finally {
        setLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        void run();
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [search]);

  return (
    <section className="card">
      <h2>Students</h2>
      <p className="hero-copy">Paginated list endpoint integrated with live search.</p>

      <label className="field field-inline">
        <span>Search</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name"
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="card-label">Loading students...</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Gender</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.id}</td>
                <td>
                  <Link to={`/students/${student.id}`} className="inline-link">
                    {String(student.fullName ?? student.name ?? '-')}
                  </Link>
                </td>
                <td>{String(student.gender ?? '-')}</td>
              </tr>
            ))}
            {!students.length && !loading ? (
              <tr>
                <td colSpan={3}>No students found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
