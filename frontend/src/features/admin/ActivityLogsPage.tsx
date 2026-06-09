import { useCallback } from 'react';
import { activityLogsApi } from '../../api/endpoints';
import { Card } from '../../components/ui/Card';
import { ServerDataTable } from '../../components/ui/ServerDataTable';
import type { LoginActivity } from '../../types';

function formatLoggedInAt(value: string) {
  return new Date(value).toLocaleString('en-UG', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

export function ActivityLogsPage() {
  const fetchLogs = useCallback(
    (page: number, pageSize: number, search: string) =>
      activityLogsApi.getAll(page, pageSize, search || undefined),
    [],
  );

  return (
    <div className="page">
      <div className="page-header">
        <h2>Activity Logs</h2>
        <p className="text-muted">
          Track who signed in, from which IP address, and when. New entries are recorded on each successful login.
        </p>
      </div>

      <Card title="Login activity">
        <ServerDataTable<LoginActivity>
          columns={[
            {
              key: 'loggedInAt',
              header: 'When',
              render: (row) => formatLoggedInAt(row.loggedInAt),
              print: (row) => formatLoggedInAt(row.loggedInAt),
            },
            {
              key: 'user',
              header: 'User',
              render: (row) => row.fullName || row.userName,
            },
            { key: 'userName', header: 'Username', render: (row) => row.userName },
            { key: 'email', header: 'Email', render: (row) => row.email },
            { key: 'roles', header: 'Roles', render: (row) => row.roles || '—' },
            {
              key: 'ipAddress',
              header: 'IP address',
              render: (row) => row.ipAddress || '—',
            },
          ]}
          keyField="id"
          fetchData={fetchLogs}
          searchPlaceholder="Search user, email, IP, or role..."
        />
      </Card>
    </div>
  );
}
