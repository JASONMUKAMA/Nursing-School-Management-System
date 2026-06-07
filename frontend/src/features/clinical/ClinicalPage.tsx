import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clinicalApi } from '../../api/endpoints';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { StudentSearchSelect } from '../../components/ui/StudentSearchSelect';
import { ServerDataTable } from '../../components/ui/ServerDataTable';
import { useAuth } from '../../hooks/useAuth';
import type { ClinicalFacility, ClinicalPlacement } from '../../types';
import { sectionFromPath } from '../../utils/routing';

type Tab = 'facilities' | 'placements';

export function ClinicalPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tab = useMemo(() => sectionFromPath(pathname, '/app/clinical', 'facilities') as Tab, [pathname]);
  const { hasRole } = useAuth();
  const canManage = hasRole('Admin', 'ClinicalCoordinator');
  const [facilities, setFacilities] = useState<ClinicalFacility[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [facilityForm, setFacilityForm] = useState({
    name: '', facilityType: 'Hospital', contactPerson: '', phone: '', address: '',
  });
  const [placementForm, setPlacementForm] = useState({
    studentId: '', facilityId: '', startDate: '', endDate: '', department: 'General Ward',
  });

  const fetchFacilities = useCallback(
    (page: number, pageSize: number, search: string) =>
      clinicalApi.getFacilities(page, pageSize, search || undefined),
    [],
  );
  const fetchPlacements = useCallback(
    (page: number, pageSize: number, search: string) =>
      clinicalApi.getPlacements(undefined, page, pageSize, search || undefined),
    [],
  );

  useEffect(() => {
    clinicalApi.getFacilities(1, 100).then((r) => setFacilities(r.items)).catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    if (pathname === '/app/clinical' || pathname === '/app/clinical/') {
      navigate('/app/clinical/facilities', { replace: true });
    }
  }, [pathname, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (tab === 'facilities') {
        await clinicalApi.createFacility(facilityForm);
        setSuccess('Facility created.');
      } else {
        await clinicalApi.createPlacement(placementForm);
        setSuccess('Placement created.');
      }
      setShowModal(false);
      setRefreshKey((k) => k + 1);
    } catch {
      setError('Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>{tab === 'facilities' ? 'Clinical Facilities' : 'Student Placements'}</h2>
        <p className="text-muted">Clinical facilities and student placements.</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <Card
        actions={canManage ? <Button size="sm" onClick={() => setShowModal(true)}>Add New</Button> : undefined}
      >
        {tab === 'facilities' ? (
          <ServerDataTable<ClinicalFacility>
            key="clinical-facilities"
            columns={[
              { key: 'name', header: 'Name', render: (f) => f.name },
              { key: 'type', header: 'Type', render: (f) => f.facilityType },
              { key: 'contact', header: 'Contact', render: (f) => f.contactPerson },
              { key: 'phone', header: 'Phone', render: (f) => f.phone },
              { key: 'active', header: 'Active', render: (f) => (f.isActive ? 'Yes' : 'No') },
            ]}
            keyField="id"
            fetchData={fetchFacilities}
            searchPlaceholder="Search facilities..."
            refreshKey={refreshKey}
          />
        ) : (
          <ServerDataTable<ClinicalPlacement>
            key="clinical-placements"
            columns={[
              { key: 'student', header: 'Student', render: (p) => p.studentName ?? '—' },
              { key: 'facility', header: 'Facility', render: (p) => p.facilityName ?? '—' },
              { key: 'dept', header: 'Department', render: (p) => p.department ?? '—' },
              {
                key: 'dates',
                header: 'Period',
                render: (p) => `${p.startDate ?? '—'} – ${p.endDate ?? '—'}`,
              },
              {
                key: 'status',
                header: 'Status',
                render: (p) => (
                  <span className={`badge badge-${(p.status ?? 'unknown').toLowerCase()}`}>
                    {p.status ?? 'Unknown'}
                  </span>
                ),
              },
            ]}
            keyField="id"
            fetchData={fetchPlacements}
            searchPlaceholder="Search placements..."
            refreshKey={refreshKey}
          />
        )}
      </Card>

      <Modal
        title={tab === 'facilities' ? 'Add Facility' : 'Add Placement'}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        footer={
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button>
          </div>
        }
      >
        {tab === 'facilities' ? (
          <form className="form-grid">
            <Input label="Name" value={facilityForm.name} onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })} required />
            <Select label="Type" value={facilityForm.facilityType} onChange={(e) => setFacilityForm({ ...facilityForm, facilityType: e.target.value })} options={[{ value: 'Hospital', label: 'Hospital' }, { value: 'Health Centre', label: 'Health Centre' }, { value: 'Clinic', label: 'Clinic' }]} />
            <Input label="Contact Person" value={facilityForm.contactPerson} onChange={(e) => setFacilityForm({ ...facilityForm, contactPerson: e.target.value })} />
            <Input label="Phone" value={facilityForm.phone} onChange={(e) => setFacilityForm({ ...facilityForm, phone: e.target.value })} />
            <Input label="Address" value={facilityForm.address} onChange={(e) => setFacilityForm({ ...facilityForm, address: e.target.value })} className="full-width" />
          </form>
        ) : (
          <form className="form-grid">
            <StudentSearchSelect
              className="full-width"
              label="Student"
              value={placementForm.studentId}
              onChange={(studentId) => setPlacementForm({ ...placementForm, studentId })}
              required
            />
            <Select label="Facility" value={placementForm.facilityId} onChange={(e) => setPlacementForm({ ...placementForm, facilityId: e.target.value })} options={[{ value: '', label: 'Select...' }, ...facilities.map((f) => ({ value: f.id, label: f.name }))]} />
            <Input label="Start Date" type="date" value={placementForm.startDate} onChange={(e) => setPlacementForm({ ...placementForm, startDate: e.target.value })} />
            <Input label="End Date" type="date" value={placementForm.endDate} onChange={(e) => setPlacementForm({ ...placementForm, endDate: e.target.value })} />
            <Input label="Department" value={placementForm.department} onChange={(e) => setPlacementForm({ ...placementForm, department: e.target.value })} />
          </form>
        )}
      </Modal>
    </div>
  );
}
