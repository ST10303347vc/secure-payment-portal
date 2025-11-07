import React, { useEffect, useState } from 'react';
import { Card, Button, Alert, Grid, LoadingSpinner, Input, FormGroup, Label } from '../../styles/GlobalStyles';
import { apiService } from '../../services/api';
import { SecureStorage } from '../../utils/security';

interface EmployeeUser {
  firstName: string;
  lastName: string;
  email: string;
  accountNumber: string;
  role: 'employee';
}

interface EmployeeDashboardProps {
  user: EmployeeUser;
  onLogout: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ user, onLogout }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string>('');
  const [editingReasonId, setEditingReasonId] = useState<string>('');
  const [editingReasonText, setEditingReasonText] = useState<string>('');
  const [editingReasonCode, setEditingReasonCode] = useState<string>('');
  const [reasonCodes, setReasonCodes] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showReasonDialog, setShowReasonDialog] = useState<boolean>(false);
  const [reasonDialogAction, setReasonDialogAction] = useState<'reject' | 'cancel' | ''>('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [keywordFilter, setKeywordFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [minAmountFilter, setMinAmountFilter] = useState<string>('');
  const [maxAmountFilter, setMaxAmountFilter] = useState<string>('');
  const [includeDeleted, setIncludeDeleted] = useState<boolean>(false);
  const [onlyMine, setOnlyMine] = useState<boolean>(false);
  const [escalatedOnly, setEscalatedOnly] = useState<boolean>(false);

  useEffect(() => {
    const fetchPayments = async () => {
      setIsLoading(true);
      setError('');
      try {
        const resp = await apiService.employeeGetAllPayments(1, 50, {
          status: statusFilter || '',
          keyword: keywordFilter || '',
          startDate: startDateFilter || '',
          endDate: endDateFilter || '',
          minAmount: minAmountFilter || '',
          maxAmount: maxAmountFilter || '',
          includeDeleted,
          assignedTo: onlyMine ? 'me' : '',
          escalated: escalatedOnly
        });
        setPayments(resp.data || resp);
        const reasonsResp = await apiService.getReasonCodes();
        setReasonCodes(reasonsResp.data || reasonsResp);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payments');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPayments();
  }, [statusFilter, keywordFilter, startDateFilter, endDateFilter, minAmountFilter, maxAmountFilter, includeDeleted, onlyMine, escalatedOnly]);

  const refreshPayments = async () => {
    try {
      const resp = await apiService.employeeGetAllPayments(1, 50, {
        status: statusFilter || '',
        keyword: keywordFilter || '',
        startDate: startDateFilter || '',
        endDate: endDateFilter || '',
        minAmount: minAmountFilter || '',
        maxAmount: maxAmountFilter || '',
        includeDeleted,
        assignedTo: onlyMine ? 'me' : '',
        escalated: escalatedOnly
      });
      setPayments(resp.data || resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh payments');
    }
  };

  const handleValidate = async (id: string) => {
    setError('');
    setActionLoadingId(id);
    try {
      await apiService.employeeValidatePayment(id);
      await refreshPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate payment');
    } finally {
      setActionLoadingId('');
    }
  };

  const openReasonDialog = (action: 'reject' | 'cancel', id?: string) => {
    setError('');
    setReasonDialogAction(action);
    if (id) setEditingReasonId(id);
    setEditingReasonText('');
    setEditingReasonCode(reasonCodes[0] || 'Insufficient docs');
    setShowReasonDialog(true);
  };

  const submitReasonDialog = async () => {
    if (!editingReasonCode || editingReasonCode.trim().length < 2) {
      setError('Please choose a valid reason code.');
      return;
    }
    if (editingReasonText.trim().length < 3) {
      setError('Reason must be at least 3 characters.');
      return;
    }
    const id = editingReasonId;
    setActionLoadingId(id);
    try {
      if (reasonDialogAction === 'reject') {
        await apiService.employeeRejectPayment(id, editingReasonText.trim(), editingReasonCode);
      } else {
        await apiService.employeeCancelPayment(id, editingReasonText.trim(), editingReasonCode);
      }
      setShowReasonDialog(false);
      setEditingReasonId('');
      setEditingReasonText('');
      setEditingReasonCode('');
      await refreshPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit reason');
    } finally {
      setActionLoadingId('');
    }
  };

  const handleCancel = async (id: string) => {
    openReasonDialog('cancel', id);
  };

  const startAddReason = (id: string, currentReason?: string) => {
    setError('');
    setEditingReasonId(id);
    setEditingReasonText((currentReason || '').trim());
  };

  const saveReason = async () => {
    if (!editingReasonId) return;
    const text = (editingReasonText || '').trim();
    if (text.length < 3) {
      setError('Reason must be at least 3 characters.');
      return;
    }
    setActionLoadingId(editingReasonId);
    try {
      await apiService.employeeUpdateReason(editingReasonId, text, editingReasonCode || undefined);
      setEditingReasonId('');
      setEditingReasonText('');
      setEditingReasonCode('');
      await refreshPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reason');
    } finally {
      setActionLoadingId('');
    }
  };

  const cancelEditReason = () => {
    setEditingReasonId('');
    setEditingReasonText('');
  };

  const handleDelete = async (id: string) => {
    setError('');
    const ok = window.confirm('Move to Trash? Step-up confirmation required.');
    if (!ok) return;
    setActionLoadingId(id);
    try {
      await apiService.employeeDeletePayment(id);
      await refreshPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment');
    } finally {
      setActionLoadingId('');
    }
  };

  const handleRestore = async (id: string) => {
    setError('');
    setActionLoadingId(id);
    try {
      await apiService.employeeRestorePayment(id);
      await refreshPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore payment');
    } finally {
      setActionLoadingId('');
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const doBulk = async (action: 'reject' | 'cancel' | 'trash') => {
    if (selectedIds.length === 0) { setError('No items selected.'); return; }
    if (action === 'reject' || action === 'cancel') {
      setEditingReasonId('');
      setReasonDialogAction(action);
      setEditingReasonText('');
      setEditingReasonCode(reasonCodes[0] || 'Insufficient docs');
      setShowReasonDialog(true);
      return;
    }
    setError('');
    try {
      await apiService.employeeBulkAction('trash', selectedIds);
      setSelectedIds([]);
      await refreshPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk action failed');
    }
  };

  const submitBulkReason = async () => {
    if (selectedIds.length === 0) return;
    if (!editingReasonCode || editingReasonText.trim().length < 3) {
      setError('Please provide valid reason and code.');
      return;
    }
    try {
      await apiService.employeeBulkAction(reasonDialogAction as any, selectedIds, editingReasonText.trim(), editingReasonCode);
      setSelectedIds([]);
      setShowReasonDialog(false);
      setEditingReasonText('');
      setEditingReasonCode('');
      await refreshPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk action failed');
    }
  };

  const handleLogout = () => {
    SecureStorage.removeItem('currentUser');
    SecureStorage.removeItem('authToken');
    onLogout();
  };

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: '#4f46e5', marginBottom: '0.5rem' }}>
              Employee Dashboard — {user.firstName} {user.lastName}
            </h1>
            <p style={{ color: '#6c757d' }}>
              {user.email}
            </p>
          </div>
          <Button variant="secondary" onClick={handleLogout}>Logout</Button>
        </div>
      </Card>

      {error && <Alert type="error">{error}</Alert>}

      <Card>
        <h3 style={{ color: '#495057', marginBottom: '1rem' }}>Filters</h3>
        <Grid columns={4}>
          <FormGroup>
            <Label>Status</Label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '6px' }}>
              <option value="">Any</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </FormGroup>
          <FormGroup>
            <Label>Keyword</Label>
            <Input value={keywordFilter} onChange={(e) => setKeywordFilter(e.target.value)} placeholder="Recipient or reference" />
          </FormGroup>
          <FormGroup>
            <Label>Start Date</Label>
            <Input type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} />
          </FormGroup>
          <FormGroup>
            <Label>End Date</Label>
            <Input type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} />
          </FormGroup>
        </Grid>
        <Grid columns={4}>
          <FormGroup>
            <Label>Min Amount</Label>
            <Input value={minAmountFilter} onChange={(e) => setMinAmountFilter(e.target.value)} placeholder="0" />
          </FormGroup>
          <FormGroup>
            <Label>Max Amount</Label>
            <Input value={maxAmountFilter} onChange={(e) => setMaxAmountFilter(e.target.value)} placeholder="100000" />
          </FormGroup>
          <FormGroup>
            <Label>Include Trash</Label>
            <input type="checkbox" checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} />
          </FormGroup>
          <FormGroup>
            <Label>My Queue / Escalated</Label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ fontSize: '12px' }}><input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> Only mine</label>
              <label style={{ fontSize: '12px' }}><input type="checkbox" checked={escalatedOnly} onChange={(e) => setEscalatedOnly(e.target.checked)} /> Escalated only</label>
            </div>
          </FormGroup>
        </Grid>
      </Card>

      <Card>
        <h3 style={{ color: '#495057', marginBottom: '1rem' }}>All Payments</h3>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Button variant="secondary" onClick={() => doBulk('reject')}>Bulk Reject</Button>
          <Button variant="secondary" onClick={() => doBulk('cancel')}>Bulk Cancel</Button>
          <Button variant="secondary" onClick={() => doBulk('trash')}>Move Selected to Trash</Button>
        </div>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LoadingSpinner /> Loading...
          </div>
        ) : payments.length === 0 ? (
          <p style={{ color: '#6c757d' }}>No payments found.</p>
        ) : (
          <div>
            {payments.map((p) => (
              <div key={p._id} style={{ padding: '0.75rem', borderBottom: '1px solid #e9ecef' }}>
                <Grid columns={3}>
                  <div>
                    <label style={{ marginRight: '0.5rem' }}><input type="checkbox" checked={selectedIds.includes(p._id)} onChange={() => toggleSelected(p._id)} /></label>
                    <strong>{p.recipientName}</strong>
                    <div style={{ color: '#6c757d', fontSize: '12px' }}>{p.reference}</div>
                    {(p.status === 'failed' || p.status === 'cancelled') && p.failureReason && (
                      <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '0.25rem' }}>
                        Reason: {p.failureReason}
                        {p.reasonCode && <span style={{ marginLeft: '0.5rem', color: '#6c757d' }}>(Code: {p.reasonCode})</span>}
                      </div>
                    )}
                    {/* Validation badges */}
                    <div style={{ marginTop: '0.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: 12, background: p.recipientIBAN && p.recipientIBAN.length > 14 ? '#e6ffed' : '#ffe6e6', color: p.recipientIBAN && p.recipientIBAN.length > 14 ? '#267a38' : '#a12626' }}>IBAN {p.recipientIBAN && p.recipientIBAN.length > 14 ? 'valid' : 'check'}</span>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: 12, background: (p.recipientSWIFT && (p.recipientSWIFT.length === 8 || p.recipientSWIFT.length === 11)) ? '#e6ffed' : '#ffe6e6', color: (p.recipientSWIFT && (p.recipientSWIFT.length === 8 || p.recipientSWIFT.length === 11)) ? '#267a38' : '#a12626' }}>SWIFT {(p.recipientSWIFT && (p.recipientSWIFT.length === 8 || p.recipientSWIFT.length === 11)) ? 'valid' : 'check'}</span>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: 12, background: (p.recipientName && p.recipientIBAN && p.recipientSWIFT && p.amount && p.currency) ? '#e6ffed' : '#ffe6e6', color: (p.recipientName && p.recipientIBAN && p.recipientSWIFT && p.amount && p.currency) ? '#267a38' : '#a12626' }}>Required {(p.recipientName && p.recipientIBAN && p.recipientSWIFT && p.amount && p.currency) ? 'complete' : 'missing'}</span>
                    </div>
                    {/* Notes */}
                    <div style={{ marginTop: '0.5rem' }}>
                      <h5 style={{ margin: 0, color: '#495057' }}>Notes</h5>
                      {(p.notes || []).length === 0 ? (
                        <div style={{ color: '#6c757d', fontSize: '12px' }}>No notes yet.</div>
                      ) : (
                        <div style={{ display: 'grid', gap: '0.25rem' }}>
                          {(p.notes || []).map((n: any, i: number) => (
                            <div key={i} style={{ fontSize: '12px', color: '#343a40' }}>
                              <span style={{ color: '#6c757d' }}>{new Date(n.createdAt).toLocaleString()}</span> — <strong>{n.authorName || 'Employee'}</strong>: {n.text}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <Input placeholder="Add note" value={editingReasonId === `note:${p._id}` ? editingReasonText : ''} onChange={(e) => { setEditingReasonId(`note:${p._id}`); setEditingReasonText(e.target.value); }} />
                        <Button variant="secondary" onClick={async () => {
                          const text = (editingReasonId === `note:${p._id}` ? editingReasonText : '').trim();
                          if (!text) return;
                          await apiService.employeeAddNote(p._id, text);
                          setEditingReasonId(''); setEditingReasonText(''); await refreshPayments();
                        }}>Add</Button>
                      </div>
                    </div>
                    {/* Audit log */}
                    <details style={{ marginTop: '0.5rem' }}>
                      <summary style={{ cursor: 'pointer', color: '#4f46e5' }}>Activity Log</summary>
                      {(p.auditLog || []).length === 0 ? (
                        <div style={{ color: '#6c757d', fontSize: '12px' }}>No activity yet.</div>
                      ) : (
                        <div style={{ display: 'grid', gap: '0.25rem', marginTop: '0.25rem' }}>
                          {(p.auditLog || []).map((a: any, i: number) => (
                            <div key={i} style={{ fontSize: '12px', color: '#343a40' }}>
                              <span style={{ color: '#6c757d' }}>{new Date(a.timestamp).toLocaleString()}</span> — <strong>{a.actorName || 'Employee'}</strong> {a.action} {a.details ? `(${a.details})` : ''}
                            </div>
                          ))}
                        </div>
                      )}
                    </details>
                  </div>
                  <div>
                    {p.amount} {p.currency}
                    <div style={{ color: '#6c757d', fontSize: '12px' }}>{new Date(p.createdAt).toLocaleString()}</div>
                    {p.deletedAt && (
                      <div style={{ color: '#6c757d', fontSize: '12px' }}>Deleted: {new Date(p.deletedAt).toLocaleString()} by {p.deletedByName || p.deletedByUserId}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: p.status === 'completed' ? '#28a745' : p.status === 'failed' ? '#dc3545' : p.status === 'cancelled' ? '#6c757d' : '#ffc107' }}>{p.status}</span>
                    {(p.status === 'pending' || p.status === 'processing') && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Button 
                          disabled={actionLoadingId === p._id}
                          onClick={() => handleValidate(p._id)}
                        >{actionLoadingId === p._id ? 'Validating...' : 'Validate'}</Button>
                        <Button 
                          variant="secondary"
                          disabled={actionLoadingId === p._id}
                          onClick={() => openReasonDialog('reject', p._id)}
                        >{actionLoadingId === p._id ? 'Rejecting...' : 'Reject'}</Button>
                        <Button 
                          variant="secondary"
                          disabled={actionLoadingId === p._id}
                          onClick={() => handleCancel(p._id)}
                        >{actionLoadingId === p._id ? 'Cancelling...' : 'Cancel'}</Button>
                      </div>
                    )}
                    {(p.status === 'cancelled' || p.status === 'failed') && (
                      <div style={{ marginTop: '0.5rem' }}>
                        {editingReasonId === p._id ? (
                          <div style={{ display: 'grid', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <select value={editingReasonCode} onChange={(e) => setEditingReasonCode(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '6px' }}>
                                {reasonCodes.map(rc => (<option key={rc} value={rc}>{rc}</option>))}
                              </select>
                            </div>
                            <textarea
                              value={editingReasonText}
                              onChange={(e) => setEditingReasonText(e.target.value)}
                              placeholder="Enter reason for cancellation/rejection"
                              rows={3}
                              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '6px', fontSize: '14px' }}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <Button
                                disabled={actionLoadingId === p._id}
                                onClick={saveReason}
                              >{actionLoadingId === p._id ? 'Saving...' : 'Save Reason'}</Button>
                              <Button
                                variant="secondary"
                                onClick={cancelEditReason}
                              >Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <Button 
                              variant="secondary"
                              disabled={actionLoadingId === p._id}
                              onClick={() => startAddReason(p._id, p.failureReason)}
                            >Add Reason</Button>
                            <Button 
                              variant="secondary"
                              disabled={actionLoadingId === p._id}
                              onClick={() => handleDelete(p._id)}
                            >{actionLoadingId === p._id ? 'Moving...' : 'Move to Trash'}</Button>
                          </div>
                        )}
                      </div>
                    )}
                    {p.status === 'completed' && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Button 
                          variant="secondary"
                          disabled={actionLoadingId === p._id}
                          onClick={() => handleDelete(p._id)}
                        >{actionLoadingId === p._id ? 'Moving...' : 'Move to Trash'}</Button>
                        {p.deletedAt && (
                          <Button 
                            variant="secondary"
                            disabled={actionLoadingId === p._id}
                            onClick={() => handleRestore(p._id)}
                          >{actionLoadingId === p._id ? 'Restoring...' : 'Restore'}</Button>
                        )}
                      </div>
                    )}
                    {(!p.deletedAt && includeDeleted) && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Button 
                          variant="secondary"
                          disabled={actionLoadingId === p._id}
                          onClick={() => handleRestore(p._id)}
                        >{actionLoadingId === p._id ? 'Restoring...' : 'Restore'}</Button>
                      </div>
                    )}
                  </div>
                </Grid>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showReasonDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '1rem', borderRadius: 8, width: 420 }}>
            <h4 style={{ marginTop: 0 }}>{reasonDialogAction === 'reject' ? 'Bulk/Inline Reject' : 'Bulk/Inline Cancel'}</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <label>Reason Code</label>
              <select value={editingReasonCode} onChange={(e) => setEditingReasonCode(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ced4da', borderRadius: 6 }}>
                {reasonCodes.map(rc => (<option key={rc} value={rc}>{rc}</option>))}
              </select>
              <label>Notes</label>
              <textarea rows={3} value={editingReasonText} onChange={e => setEditingReasonText(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: 6 }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                {selectedIds.length > 0 ? (
                  <Button onClick={submitBulkReason}>Apply to {selectedIds.length} items</Button>
                ) : (
                  <Button onClick={submitReasonDialog}>Apply</Button>
                )}
                <Button variant="secondary" onClick={() => setShowReasonDialog(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card>
        <h3 style={{ color: '#495057', marginBottom: '1rem' }}>Security Notice</h3>
        <ul style={{ color: '#6c757d', fontSize: '14px', paddingLeft: '1rem' }}>
          <li>All requests authenticated via JWT</li>
          <li>Role-based authorization enforced server-side</li>
          <li>Rate limiting active on state-changing operations</li>
          <li>Step-up confirmation required for destructive actions</li>
        </ul>
      </Card>
    </div>
  );
};