import React, { useEffect, useRef, useState } from 'react';
import QrCode from './QrCode';
import { getGcashQrUrl, uploadGcashQr } from '../lib/storage';
import { supabase } from '../lib/supabaseClient';

function GcashQrSettings({ userId, initialPath }) {
  const [qrPath, setQrPath] = useState(initialPath || null);
  const [qrUrl, setQrUrl] = useState('');
  const [qrUrlLoading, setQrUrlLoading] = useState(false);
  const [qrUrlError, setQrUrlError] = useState('');
  const [qrUrlVersion, setQrUrlVersion] = useState(0);
  const [qrFile, setQrFile] = useState(null);
  const [qrSaving, setQrSaving] = useState(false);
  const [qrUploadError, setQrUploadError] = useState('');
  const [qrUploadSuccess, setQrUploadSuccess] = useState('');
  const qrInputRef = useRef(null);

  useEffect(() => {
    setQrPath(initialPath || null);
  }, [initialPath]);

  useEffect(() => {
    let cancelled = false;
    setQrUrl('');
    setQrUrlError('');

    if (!qrPath) {
      setQrUrlLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setQrUrlLoading(true);
    async function loadQrUrl() {
      try {
        const signedUrl = await getGcashQrUrl(qrPath);
        if (!cancelled) setQrUrl(signedUrl);
      } catch (error) {
        if (!cancelled) setQrUrlError(error.message || 'Could not load your GCash QR.');
      } finally {
        if (!cancelled) setQrUrlLoading(false);
      }
    }

    loadQrUrl();
    return () => {
      cancelled = true;
    };
  }, [qrPath, qrUrlVersion]);

  const handleUpload = async (event) => {
    event.preventDefault();
    setQrUploadError('');
    setQrUploadSuccess('');

    if (!qrFile) {
      setQrUploadError('Choose a PNG or JPEG image to upload.');
      return;
    }

    setQrSaving(true);
    try {
      const path = await uploadGcashQr(qrFile, userId);
      const { data, error } = await supabase
        .from('profiles')
        .update({ gcash_qr_path: path })
        .eq('id', userId)
        .select('gcash_qr_path')
        .single();
      if (error) throw error;

      setQrPath(data.gcash_qr_path);
      setQrUrlVersion((version) => version + 1);
      setQrFile(null);
      setQrUploadSuccess('Your GCash QR was saved securely.');
    } catch (error) {
      setQrUploadError(error.message || 'Could not save your GCash QR.');
    } finally {
      setQrSaving(false);
      if (qrInputRef.current) qrInputRef.current.value = '';
    }
  };

  return (
    <article className="dash-profile-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 0' }}>
      <div style={{ flex: 1 }}>
        <span className="dash-profile-label" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>GCash QR</span>
        {qrUrlLoading && <p role="status" style={{ color: '#64748b', fontSize: 13 }}>Loading your private QR…</p>}
        {qrUrlError && <p className="field-error" role="alert">{qrUrlError}</p>}
        {qrUrl && <QrCode src={qrUrl} label="Your GCash QR code" />}
        <form onSubmit={handleUpload} style={{ marginTop: 12 }}>
          <input
            ref={qrInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={(event) => {
              setQrFile(event.target.files?.[0] || null);
              setQrUploadError('');
              setQrUploadSuccess('');
            }}
            aria-label="Choose a GCash QR image"
          />
          <button type="submit" className="dash-outline-button" disabled={qrSaving} style={{ display: 'block', padding: '8px 16px', marginTop: 8, fontSize: 13, fontWeight: 500, borderRadius: 8 }}>
            {qrSaving ? 'Uploading…' : 'Upload GCash QR'}
          </button>
          <p style={{ color: '#64748b', fontSize: 12, margin: '6px 0 0' }}>PNG or JPEG, up to 1 MB. Stored privately.</p>
          {qrUploadError && <p className="field-error" role="alert">{qrUploadError}</p>}
          {qrUploadSuccess && <p role="status" style={{ color: '#166534', fontSize: 13 }}>{qrUploadSuccess}</p>}
        </form>
      </div>
    </article>
  );
}

export default GcashQrSettings;
