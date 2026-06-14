import { useEffect, useState } from 'react';

interface Anomaly {
  id: string;
  original_row_index: number;
  anomaly_type: string;
  raw_data: any;
}

export default function ImportManager({ session }: { session?: any }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnomalies = () => {
    setLoading(true);
    fetch('http://localhost:3000/api/anomalies')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAnomalies(data);
        } else {
          setAnomalies([]);
          console.error('API returned non-array:', data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch anomalies:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (session?.user?.id) {
      formData.append('userId', session.user.id);
    }

    try {
      const res = await fetch('http://localhost:3000/api/expenses/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        alert('File uploaded and processed successfully.');
        fetchAnomalies(); // Refresh anomalies list after processing
      } else {
        alert('Error processing file.');
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleResolve = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`http://localhost:3000/api/anomalies/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        // Remove the resolved anomaly from the UI immediately
        setAnomalies(anomalies.filter(a => a.id !== id));
      } else {
        alert('Failed to resolve anomaly.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Import & Anomalies</h1>
      
      {/* Upload Section */}
      <div className="bg-white shadow sm:rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Expenses CSV</h2>
        <div className="flex items-center space-x-4">
          <input 
            type="file" 
            accept=".csv"
            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button 
            onClick={handleUpload}
            disabled={!file || uploading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {uploading ? 'Processing...' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Anomalies Table */}
      <h2 className="text-lg font-medium text-gray-900 mb-4">Pending Anomalies ({anomalies.length})</h2>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading anomalies...</div>
        ) : anomalies.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No anomalies pending review.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row #</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anomaly Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raw Data Context</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Resolution</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {anomalies.map((anomaly) => (
                <tr key={anomaly.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {anomaly.original_row_index}
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600 font-medium">
                    {anomaly.anomaly_type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto max-w-xs">
                      {JSON.stringify(anomaly.raw_data, null, 2)}
                    </pre>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleResolve(anomaly.id, 'approve')}
                      className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded mr-2"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleResolve(anomaly.id, 'reject')}
                      className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
